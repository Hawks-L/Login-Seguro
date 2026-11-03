import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { JWT_ALGORITHM } from '../utils/generateToken.js';

export async function requireAuth(req, res, next) {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.split(' ')[1] : null;
    if (!token) return res.status(401).json({ message: 'No autorizado: falta token' });

    // Fijar el algoritmo evita ataques de confusión de algoritmo (por ejemplo alg: none).
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: [JWT_ALGORITHM] });
    const user = await User.findById(decoded.sub);
    if (!user || !user.isActive) return res.status(401).json({ message: 'Usuario inválido o inactivo' });

    req.user = { id: user._id, role: user.role, email: user.email };
    next();
  } catch {
    return res.status(401).json({ message: 'Token inválido o expirado' });
  }
}

export function requireRole(role) {
  return (req, res, next) => {
    if (req.user?.role !== role) return res.status(403).json({ message: 'Acceso denegado' });
    next();
  };
}
