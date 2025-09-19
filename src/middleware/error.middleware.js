export function errorHandler(err, req, res, next) {
  console.error('❌ Error:', err);
  const status = err.status || 500;
  const message = err.message || 'Error interno del servidor';
  res.status(status).json({ message });
}
