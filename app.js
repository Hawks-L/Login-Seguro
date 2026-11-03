import express from 'express';
import mongoose from 'mongoose';
import helmet from 'helmet';
import cors from 'cors';
import authRouter from './src/routes/auth.routes.js';
import { errorHandler, notFound } from './src/middleware/error.middleware.js';
import { authLimiter } from './src/middleware/rateLimit.middleware.js';
import { validateEnv } from './src/config/env.js';

const app = express();

// Detrás de Render u otro proxy, para que el rate limiting vea la IP real del cliente.
if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY));

// CORS (soporta múltiples orígenes separados por coma). Sin CORS_ORIGIN no se permite ningún origen de navegador.
const allowedOrigins = (process.env.CORS_ORIGIN || '').split(',').map((o) => o.trim()).filter(Boolean);

app.use(helmet());
app.use(cors({ origin: allowedOrigins, methods: ['GET', 'POST'] }));
app.use(express.json({ limit: '10kb' }));

export async function connectDB() {
  const problems = validateEnv();
  if (problems.length) {
    problems.forEach((p) => console.error(`❌ ${p}`));
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000, family: 4 });
    console.log('✅ Conectado a MongoDB');
  } catch (err) {
    console.error('❌ Error conectando a MongoDB:', err?.message || err);
    process.exit(1);
  }
}

// Health primero, para evitar 502 si Mongo no arranca. No expone detalles internos.
app.get('/health', (_req, res) => {
  const dbUp = mongoose.connection.readyState === 1;
  res.status(dbUp ? 200 : 503).json({ ok: dbUp });
});

// Rutas
app.use('/auth', authLimiter, authRouter);

// Errores
app.use(notFound);
app.use(errorHandler);

export default app;
