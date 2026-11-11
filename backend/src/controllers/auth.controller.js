const prisma = require("../config/prisma");
const { hashPassword, comparePassword, signToken } = require("../services/auth.service");
const { asyncHandler } = require("../utils/asyncHandler");
const { createPasswordRecovery } = require("../services/passwordReset");
const { sendResetMail } = require("../services/passwordResetMail");
const { jwtSecret } = require("../config/env");

const { forgotPassword, resetPassword } = createPasswordRecovery({
  prisma, hashPassword, sendMail: sendResetMail,
  secret: process.env.PASSWORD_RESET_SECRET, authSecret: jwtSecret,
});

const register = asyncHandler(async (req, res) => {
  const { email, password, fullName } = req.body;
  if (!email || !password || !fullName) {
    return res.status(400).json({ error: "email, password y fullName son requeridos" });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ error: "Ya existe un usuario con ese email" });

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { email, fullName, passwordHash },
  });

  const token = signToken(user);
  res.status(201).json({
    token,
    user: { id: user.id, email: user.email, fullName: user.fullName, globalRole: user.globalRole },
  });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await comparePassword(password, user.passwordHash))) {
    return res.status(401).json({ error: "Credenciales inválidas" });
  }

  const token = signToken(user);
  res.json({
    token,
    user: { id: user.id, email: user.email, fullName: user.fullName, globalRole: user.globalRole },
  });
});

const me = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) return res.status(404).json({ error: "Usuario no encontrado" });
  res.json({ id: user.id, email: user.email, fullName: user.fullName, globalRole: user.globalRole });
});

module.exports = { register, login, me, forgotPassword, resetPassword };
