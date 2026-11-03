// Solo los errores con status 4xx muestran su mensaje; el resto se registra en el servidor
// y el cliente recibe un mensaje genérico, sin detalles de MongoDB ni stack traces.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'El cuerpo de la petición no es JSON válido' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ message: 'La petición es demasiado grande' });
  }

  const status = Number.isInteger(err.status) && err.status >= 400 && err.status < 500 ? err.status : 500;
  if (status === 500) console.error('❌ Error:', err);

  res.status(status).json({ message: status === 500 ? 'Error interno del servidor' : err.message });
}

export function notFound(req, res) {
  res.status(404).json({ message: 'Ruta no encontrada' });
}
