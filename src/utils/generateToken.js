import jwt from 'jsonwebtoken';

export const JWT_ALGORITHM = 'HS256';

export function generateToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    algorithm: JWT_ALGORITHM,
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
  });
}
