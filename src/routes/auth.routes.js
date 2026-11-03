import { Router } from 'express';
import User, { compareWithDummy } from '../models/User.js';
import { generateToken } from '../utils/generateToken.js';
import { body, validationResult } from 'express-validator';
import { requireAuth, requireRole } from '../middleware/auth.middleware.js';
import { loginLimiter, registerLimiter } from '../middleware/rateLimit.middleware.js';

const router = Router();

// bcrypt solo usa los primeros 72 bytes de la contraseña; más allá se ignorarían en silencio.
const MAX_PASSWORD = 72;
const DUPLICATE_KEY = 11000;

// Devuelve los errores sin el campo "value", para no reflejar la contraseña enviada.
function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();
  return res.status(400).json({
    message: 'Datos inválidos',
    errors: errors.array().map((e) => ({ campo: e.path, mensaje: e.msg })),
  });
}

const publicUser = (user) => ({ id: user._id, name: user.name, email: user.email, role: user.role });

/**
 * POST /auth/register
 * Crea usuario (hash automático en el modelo)
 */
router.post(
  '/register',
  registerLimiter,
  [
    body('name').isString().trim().isLength({ min: 2, max: 80 }).withMessage('El nombre debe tener entre 2 y 80 caracteres'),
    body('email').isString().trim().toLowerCase().isEmail().withMessage('Correo inválido'),
    body('password')
      .isString()
      .isLength({ min: 8, max: MAX_PASSWORD }).withMessage(`La contraseña debe tener entre 8 y ${MAX_PASSWORD} caracteres`)
      .matches(/[A-Za-z]/).withMessage('La contraseña debe incluir al menos una letra')
      .matches(/\d/).withMessage('La contraseña debe incluir al menos un número'),
  ],
  handleValidation,
  async (req, res, next) => {
    try {
      const { name, email, password } = req.body;

      // Evitar enumeración de usuarios: mismo mensaje
      const exists = await User.findOne({ email });
      if (exists) return res.status(400).json({ message: 'No se pudo registrar' });

      // El rol nunca se toma del body: todo registro público es "user".
      const user = await User.create({ name, email, password });
      const token = generateToken({ sub: user._id, role: user.role });

      res.status(201).json({ token, user: publicUser(user) });
    } catch (err) {
      // Dos registros simultáneos con el mismo correo: el índice único de MongoDB frena el segundo.
      if (err?.code === DUPLICATE_KEY) return res.status(400).json({ message: 'No se pudo registrar' });
      next(err);
    }
  }
);

/**
 * POST /auth/login
 */
router.post(
  '/login',
  loginLimiter,
  [
    body('email').isString().trim().toLowerCase().isEmail().withMessage('Correo inválido'),
    body('password').isString().isLength({ min: 1, max: MAX_PASSWORD }).withMessage('Contraseña inválida'),
  ],
  handleValidation,
  async (req, res, next) => {
    try {
      const { email, password } = req.body;

      // select('+password') para traer el hash
      const user = await User.findOne({ email }).select('+password');

      // Mismo mensaje y mismo tiempo de respuesta exista o no el usuario.
      const ok = user ? await user.comparePassword(password) : await compareWithDummy(password);
      if (!user || !ok || !user.isActive) return res.status(401).json({ message: 'Credenciales inválidas' });

      const token = generateToken({ sub: user._id, role: user.role });

      res.json({ token, user: publicUser(user) });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /auth/me
 * Requiere token
 */
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({ user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /auth/admin-only
 * Ruta protegida por rol
 */
router.get('/admin-only', requireAuth, requireRole('admin'), (req, res) => {
  res.json({ message: 'Bienvenido, admin' });
});

export default router;
