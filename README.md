# 🔐 Login Seguro – Node.js + Express + JWT + MongoDB

API de autenticación segura con **hash de contraseñas (bcrypt)**, **JWT**, **validación de inputs**, **rate limiting**, **Helmet** y **roles** (user/admin). Proyecto pensado para portafolio con enfoque en **buenas prácticas OWASP**.

## ✨ Features
- Registro y login con **bcrypt** y **JWT**
- Rutas protegidas con `Bearer token`
- Roles (user/admin) y middlewares de autorización
- Seguridad: Helmet, Rate Limiting, CORS, validación con `express-validator`
- Manejo centralizado de errores
- Healthcheck `/health`

## 🧱 Stack
- Node.js, Express
- MongoDB (Atlas)
- Mongoose
- JWT, bcrypt
- Helmet, CORS, Rate Limit, express-validator

## 🚀 Demo
- **API**: `https://<tu-servicio>.onrender.com`

## 🗂️ Endpoints principales
- `POST /auth/register` → Crea usuario  
  Body:
  ```json
  { "name": "Ana", "email": "ana@mail.com", "password": "SuperSegura123" }
