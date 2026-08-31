const jwt = require("jsonwebtoken");
const { jwtSecret } = require("../config/env");

// Verifica el JWT del header Authorization y adjunta { id, email } a req.user.
function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Falta token de autenticación" });

  try {
    req.user = jwt.verify(token, jwtSecret);
    next();
  } catch {
    res.status(401).json({ error: "Token inválido o expirado" });
  }
}

module.exports = { requireAuth };
