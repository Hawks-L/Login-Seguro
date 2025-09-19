import express from 'express';
import mongoose from 'mongoose';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import authRouter from './src/routes/auth.routes.js';
import { errorHandler } from './src/middleware/error.middleware.js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

// Seguridad básica
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') || '*' }));
app.use(express.json({ limit: '10kb' }));

// Rate limit para frenar fuerza bruta básica en /auth/*
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

app.get('/health', (_req, res) => {
  res.status(200).json({ ok: true, uptime: process.uptime() });
});

app.use('/auth', authLimiter);

// DB
mongoose
  .connect(process.env.MONGO_URI, { dbName: 'login_seguro' })
  .then(() => console.log('✅ Conectado a MongoDB'))
  .catch((err) => {
    console.error('❌ Error MongoDB', err);
    process.exit(1);
  });


// Rutas
app.use('/auth', authRouter);

// Middleware de errores centralizado
app.use(errorHandler);

console.log('MONGO_URI:', process.env.MONGO_URI ? 'OK (oculto)' : 'NO DEFINIDO');

export default app;
