import rateLimit from 'express-rate-limit';

const FIFTEEN_MINUTES = 15 * 60 * 1000;

export const authLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES,
  limit: 100,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Demasiadas peticiones, intenta de nuevo más tarde' },
});

// Fuerza bruta de contraseñas: solo cuentan los intentos fallidos.
export const loginLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES,
  limit: Number(process.env.LOGIN_RATE_LIMIT) || 5,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Demasiados intentos fallidos, intenta de nuevo en 15 minutos' },
});

export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: Number(process.env.REGISTER_RATE_LIMIT) || 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Demasiados registros desde esta IP, intenta más tarde' },
});
