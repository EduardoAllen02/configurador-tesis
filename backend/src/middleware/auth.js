const jwt = require("jsonwebtoken");
const { jwtSecret } = require("../config/env");
const prisma = require("../config/prisma");
const { passwordVersion } = require("../services/auth.service");
const crypto = require("node:crypto");

// Verifica el JWT del header Authorization y adjunta { id, email } a req.user.
async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Falta token de autenticación" });

  try {
    const claims = jwt.verify(token, jwtSecret, { algorithms: ["HS256"] });
    // Legacy tokens cannot be safely revoked on password reset without stored state.
    // Require re-login once after deployment, then reject every stale password version.
    if (claims.purpose !== "session" || typeof claims.id !== "string" || typeof claims.pwdv !== "string") throw new Error("Invalid session");
    const user = await prisma.user.findUnique({ where: { id: claims.id }, select: { id: true, email: true, passwordHash: true } });
    if (!user) throw new Error("Invalid session");
    const actual = Buffer.from(passwordVersion(user));
    const expected = Buffer.from(claims.pwdv);
    if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) throw new Error("Stale session");
    req.user = { id: user.id, email: user.email };
    next();
  } catch {
    res.status(401).json({ error: "Token inválido o expirado" });
  }
}

module.exports = { requireAuth };
