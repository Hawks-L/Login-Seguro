import { Router } from 'express';
import User from '../models/User.js';
import { generateToken } from '../utils/generateToken.js';
import { body, validationResult } from 'express-validator';
import { requireAuth, requireRole } from '../middleware/auth.middleware.js';

const router = Router();

/**
 * POST /auth/register
 * Crea usuario (hash automático en el modelo)
 */
router.post(
  '/register',
  [
    body('name').isString().isLength({ min: 2 }),
    body('email').isEmail(),
    body('password').isString().isLength({ min: 8 }),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ message: 'Datos inválidos', errors: errors.array() });

      const { name, email, password } = req.body;

      // Evitar enumeración de usuarios: mismo mensaje
      const exists = await User.findOne({ email });
      if (exists) return res.status(400).json({ message: 'No se pudo registrar' });

      const user = await User.create({ name, email, password });
      const token = generateToken({ sub: user._id, role: user.role });

      res.status(201).json({
        token,
        user: { id: user._id, name: user.name, email: user.email, role: user.role },
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /auth/login
 */
router.post(
  '/login',
  [body('email').isEmail(), body('password').isString().isLength({ min: 8 })],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ message: 'Datos inválidos', errors: errors.array() });

      const { email, password } = req.body;

      // select('+password') para traer el hash
      const user = await User.findOne({ email }).select('+password');
      // Mensaje genérico para evitar revelar si existe/no
      if (!user) return res.status(401).json({ message: 'Credenciales inválidas' });

      const ok = await user.comparePassword(password);
      if (!ok) return res.status(401).json({ message: 'Credenciales inválidas' });

      const token = generateToken({ sub: user._id, role: user.role });

      res.json({
        token,
        user: { id: user._id, name: user.name, email: user.email, role: user.role },
      });
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
    res.json({ user: { id: user._id, name: user.name, email: user.email, role: user.role } });
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
