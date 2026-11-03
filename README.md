# Login Seguro

[![CI](https://github.com/Hawks-L/Login-Seguro/actions/workflows/ci.yml/badge.svg)](https://github.com/Hawks-L/Login-Seguro/actions/workflows/ci.yml)

API de autenticación con Node.js, Express, JWT y MongoDB construida siguiendo las recomendaciones de OWASP para el manejo de credenciales y sesiones. Cada control de seguridad tiene una prueba automatizada que demuestra que funciona.

## Endpoints

| Método | Ruta | Acceso | Descripción |
| --- | --- | --- | --- |
| GET | `/health` | Público | Estado de la API y de la base de datos |
| POST | `/auth/register` | Público | Crea un usuario con rol `user` y devuelve un token |
| POST | `/auth/login` | Público | Inicia sesión y devuelve un token |
| GET | `/auth/me` | Token | Datos del usuario autenticado |
| GET | `/auth/admin-only` | Token con rol `admin` | Ejemplo de ruta protegida por rol |

```bash
curl -X POST http://localhost:4000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Ana","email":"ana@mail.com","password":"SuperSegura123"}'

curl http://localhost:4000/auth/me -H "Authorization: Bearer <token>"
```

## Controles de seguridad

| Amenaza | Control | OWASP |
| --- | --- | --- |
| Robo de contraseñas si se filtra la base de datos | Hash con bcrypt de 12 rondas; el hash nunca se devuelve (`select: false`) | A02 Fallas criptográficas |
| Contraseñas débiles | Entre 8 y 72 caracteres con letras y números (72 es el máximo que bcrypt procesa) | A07 Fallas de autenticación |
| Fuerza bruta en el login | 5 intentos fallidos por IP cada 15 minutos; los exitosos no cuentan | A07 |
| Enumeración de usuarios | Mismo mensaje y mismo tiempo de respuesta exista o no el correo (se compara contra un hash ficticio) | A07 |
| Escalada de privilegios en el registro | El rol nunca se toma del body; todo registro público es `user` | A01 Control de acceso |
| Tokens falsificados | Algoritmo fijado en HS256 (bloquea `alg: none`), expiración de 1 hora y secreto de al menos 32 caracteres validado al arrancar | A07 |
| Inyección NoSQL | Validación de tipos con express-validator: `{"$ne": null}` se rechaza antes de llegar a MongoDB | A03 Inyección |
| Fuga de información | Errores internos con mensaje genérico, la contraseña nunca se refleja en errores de validación y `/health` no expone detalles | A05 Configuración |
| Cuentas desactivadas | Un usuario con `isActive: false` no puede iniciar sesión ni usar tokens previos | A01 |
| Registro duplicado por concurrencia | Índice único de MongoDB y respuesta genérica | A04 Diseño inseguro |
| Peticiones desde otros sitios | CORS con lista blanca; sin configuración no se permite ningún origen | A05 |
| Cabeceras inseguras | Helmet (CSP, `nosniff`, sin `X-Powered-By`) | A05 |
| Denegación de servicio | Cuerpo limitado a 10 KB y límite general de 100 peticiones cada 15 minutos | A04 |
| Dependencias vulnerables | `npm audit` en cada push con GitHub Actions | A06 Componentes vulnerables |

### Pendiente

- Revocación de tokens (lista negra o refresh tokens rotativos) para cerrar sesión antes de que venza el token.
- Bloqueo por cuenta además de por IP, para frenar ataques distribuidos.
- Verificación del correo al registrarse.

## Pruebas

Las 13 pruebas de `test/` simulan el modelo de MongoDB, así que corren sin base de datos. Verifican, entre otras cosas, que un token con `alg: none` es rechazado, que un usuario normal no entra a rutas de administrador, que `{"$ne": null}` no pasa la validación y que el login se bloquea tras varios intentos fallidos.

```bash
npm test
```

## Cómo ejecutarlo

Necesitas Node.js 18 o 20 y una base de datos de MongoDB (por ejemplo, un clúster gratuito de MongoDB Atlas).

```bash
cp .env.example .env    # completa MONGO_URI y JWT_SECRET
npm install
npm run dev             # http://localhost:4000
```

Para desplegar en Render, define las mismas variables en el panel del servicio y agrega `TRUST_PROXY=1` para que el límite de intentos use la IP real de cada cliente.

## Tecnologías

Node.js, Express 5, MongoDB con Mongoose, JSON Web Tokens, bcrypt, Helmet, express-rate-limit, express-validator, Node test runner, Supertest y GitHub Actions.

## Autor

**Leonardo Andrés Estepa Castro** · Ethical Hacker (Cisco Networking Academy) · [Portafolio](https://hawks-l.github.io) · [GitHub](https://github.com/Hawks-L)
