import express from 'express';
import mongoose from 'mongoose';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import authRouter from './src/routes/auth.routes.js';
import { errorHandler } from './src/middleware/error.middleware.js';

const app = express();

// CORS (soporta múltiples orígenes separados por coma)
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') || '*' }));
app.use(express.json({ limit: '10kb' }));

export async function connectDB() {
  const uri = process.env.MONGO_URI;

  console.log('URI ok? Empieza con mongodb+srv://', typeof uri === 'string' && uri.startsWith('mongodb+srv://'));
  
  if (!uri) {
    console.error('❌ MONGO_URI no está definida');
    process.exit(1);
  }
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000, family: 4 });
    console.log('✅ Conectado a MongoDB');
  } catch (err) {
    console.error('❌ Error conectando a MongoDB:', err?.message || err);
    process.exit(1);
  }
}


// Health primero, para evitar 502 si Mongo no arranca
app.get('/health', (_req, res) => {
  res.status(200).json({
    ok: true,
    uptime: process.uptime(),
    dbState: mongoose.connection.readyState, // 0,1,2,3
  });
});

// Rate limiting para /auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/auth', authLimiter);

// // Conexión DB SIN process.exit
// async function connectDB() {
//   try {
//   const uri = process.env.MONGO_URI;
//   console.log('URI ok? Empieza con mongodb+srv://', uri?.startsWith('mongodb+srv://'));
//   await mongoose.connect(uri, { dbName: 'login_seguro', serverSelectionTimeoutMS: 8000 });
//   console.log('✅ Conectado a MongoDB');
// } catch (err) {
//   console.error('❌ Error conectando a MongoDB:', err?.message || err);
// }
// }
// connectDB();

// // Rutas
app.use('/auth', authRouter);

// // Errores
// app.use(errorHandler);




export default app;
