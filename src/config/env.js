// Valida la configuración al arrancar para no levantar la API con secretos débiles o ausentes.
export function validateEnv(env = process.env) {
  const problems = [];

  if (!env.MONGO_URI) problems.push('MONGO_URI no está definida');
  if (!env.JWT_SECRET) problems.push('JWT_SECRET no está definida');
  else if (env.JWT_SECRET.length < 32) problems.push('JWT_SECRET debe tener al menos 32 caracteres');

  return problems;
}
