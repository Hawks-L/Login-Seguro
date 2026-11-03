// Configuración de prueba: no se conecta a MongoDB, el modelo User se simula en cada prueba.
process.env.JWT_SECRET ??= 'secreto-de-prueba-con-mas-de-32-caracteres-123';
process.env.CORS_ORIGIN ??= 'http://localhost:5173';

export const fakeUser = (overrides = {}) => ({
  _id: '64b7f0c2a1b2c3d4e5f60718',
  name: 'Ana',
  email: 'ana@mail.com',
  role: 'user',
  isActive: true,
  comparePassword: async (plain) => plain === 'SuperSegura123',
  ...overrides,
});

// Imita la consulta de Mongoose: se puede esperar directamente o encadenar .select().
export const query = (result) => ({
  select: async () => result,
  then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
});
