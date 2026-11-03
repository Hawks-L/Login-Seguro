import { test, mock, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { fakeUser, query } from './helpers.js';

process.env.LOGIN_RATE_LIMIT = '100';
process.env.REGISTER_RATE_LIMIT = '100';

const { default: app } = await import('../app.js');
const { default: User } = await import('../src/models/User.js');
const { generateToken } = await import('../src/utils/generateToken.js');
const { validateEnv } = await import('../src/config/env.js');

afterEach(() => mock.restoreAll());

test('envía cabeceras de seguridad y oculta X-Powered-By', async () => {
  const res = await request(app).get('/auth/no-existe');
  assert.equal(res.status, 404);
  assert.equal(res.headers['x-content-type-options'], 'nosniff');
  assert.equal(res.headers['x-powered-by'], undefined);
});

test('CORS solo autoriza los orígenes configurados', async () => {
  const ok = await request(app).get('/health').set('Origin', 'http://localhost:5173');
  assert.equal(ok.headers['access-control-allow-origin'], 'http://localhost:5173');
  const externo = await request(app).get('/health').set('Origin', 'https://atacante.com');
  assert.equal(externo.headers['access-control-allow-origin'], undefined);
});

test('el registro exige una contraseña robusta y no la refleja en la respuesta', async () => {
  const res = await request(app)
    .post('/auth/register')
    .send({ name: 'Ana', email: 'ana@mail.com', password: 'solotexto' });
  assert.equal(res.status, 400);
  assert.doesNotMatch(JSON.stringify(res.body), /solotexto/);
});

test('el registro ignora un rol enviado en el body (escalada de privilegios)', async () => {
  mock.method(User, 'findOne', () => query(null));
  const create = mock.method(User, 'create', async (data) => fakeUser({ ...data, role: data.role ?? 'user' }));

  const res = await request(app)
    .post('/auth/register')
    .send({ name: 'Ana', email: 'ana@mail.com', password: 'SuperSegura123', role: 'admin' });

  assert.equal(res.status, 201);
  assert.equal(res.body.user.role, 'user');
  assert.equal(create.mock.calls[0].arguments[0].role, undefined);
});

test('un registro duplicado por concurrencia responde con el mensaje genérico', async () => {
  mock.method(User, 'findOne', () => query(null));
  mock.method(User, 'create', async () => {
    throw Object.assign(new Error('E11000 duplicate key error collection: users'), { code: 11000 });
  });

  const res = await request(app)
    .post('/auth/register')
    .send({ name: 'Ana', email: 'ana@mail.com', password: 'SuperSegura123' });

  assert.equal(res.status, 400);
  assert.equal(res.body.message, 'No se pudo registrar');
});

test('el login responde igual si el usuario no existe o si la contraseña es incorrecta', async () => {
  mock.method(User, 'findOne', () => query(null));
  const noExiste = await request(app).post('/auth/login').send({ email: 'nadie@mail.com', password: 'Cualquiera123' });

  mock.restoreAll();
  mock.method(User, 'findOne', () => query(fakeUser()));
  const malaClave = await request(app).post('/auth/login').send({ email: 'ana@mail.com', password: 'Incorrecta123' });

  assert.equal(noExiste.status, 401);
  assert.equal(malaClave.status, 401);
  assert.deepEqual(noExiste.body, malaClave.body);
});

test('un usuario desactivado no puede iniciar sesión', async () => {
  mock.method(User, 'findOne', () => query(fakeUser({ isActive: false })));
  const res = await request(app).post('/auth/login').send({ email: 'ana@mail.com', password: 'SuperSegura123' });
  assert.equal(res.status, 401);
});

test('rechaza inyección NoSQL en el login', async () => {
  const findOne = mock.method(User, 'findOne', () => query(fakeUser()));
  const res = await request(app).post('/auth/login').send({ email: { $ne: null }, password: { $ne: null } });
  assert.equal(res.status, 400);
  assert.equal(findOne.mock.callCount(), 0);
});

test('rechaza tokens con alg "none", firmados con otra clave o vencidos', async () => {
  mock.method(User, 'findById', async () => fakeUser({ role: 'admin' }));
  const sub = '64b7f0c2a1b2c3d4e5f60718';

  const sinFirma = jwt.sign({ sub, role: 'admin' }, null, { algorithm: 'none' });
  const otraClave = jwt.sign({ sub, role: 'admin' }, 'clave-del-atacante-con-mas-de-32-caracteres');
  const vencido = jwt.sign({ sub, exp: Math.floor(Date.now() / 1000) - 60 }, process.env.JWT_SECRET);

  for (const token of [sinFirma, otraClave, vencido]) {
    const res = await request(app).get('/auth/me').set('Authorization', `Bearer ${token}`);
    assert.equal(res.status, 401);
  }
});

test('un usuario normal no puede entrar a rutas de administrador', async () => {
  mock.method(User, 'findById', async () => fakeUser());
  const token = generateToken({ sub: '64b7f0c2a1b2c3d4e5f60718', role: 'user' });
  const res = await request(app).get('/auth/admin-only').set('Authorization', `Bearer ${token}`);
  assert.equal(res.status, 403);
});

test('los errores internos no filtran detalles al cliente', async () => {
  mock.method(User, 'findOne', () => query(Promise.reject(new Error('MongoServerError: conexión rechazada en 10.0.0.5'))));
  const res = await request(app).post('/auth/login').send({ email: 'ana@mail.com', password: 'SuperSegura123' });
  assert.equal(res.status, 500);
  assert.equal(res.body.message, 'Error interno del servidor');
});

test('no arranca con un JWT_SECRET ausente o débil', () => {
  assert.ok(validateEnv({ MONGO_URI: 'x' }).length > 0);
  assert.ok(validateEnv({ MONGO_URI: 'x', JWT_SECRET: 'corto' }).length > 0);
  assert.deepEqual(validateEnv({ MONGO_URI: 'x', JWT_SECRET: 'a'.repeat(32) }), []);
});
