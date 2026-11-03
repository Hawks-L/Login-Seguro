import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { fakeUser, query } from './helpers.js';

process.env.LOGIN_RATE_LIMIT = '3';

const { default: app } = await import('../app.js');
const { default: User } = await import('../src/models/User.js');

test('bloquea el login tras varios intentos fallidos desde la misma IP', async () => {
  mock.method(User, 'findOne', () => query(fakeUser()));

  const estados = [];
  for (let i = 0; i < 4; i++) {
    const res = await request(app).post('/auth/login').send({ email: 'ana@mail.com', password: `Intento${i}` });
    estados.push(res.status);
  }

  assert.deepEqual(estados, [401, 401, 401, 429]);
});
