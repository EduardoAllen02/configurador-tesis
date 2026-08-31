const prisma = require("../config/prisma");
const { asyncHandler } = require("../utils/asyncHandler");

const selectSafe = { id: true, email: true, fullName: true, isSuperAdmin: true, createdAt: true };

const list = asyncHandler(async (req, res) => {
  const users = await prisma.user.findMany({ select: selectSafe, orderBy: { createdAt: "asc" } });
  res.json(users);
});

const getOne = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (id !== req.user.id) {
    const requester = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!requester?.isSuperAdmin) return res.status(403).json({ error: "No autorizado" });
  }
  const user = await prisma.user.findUnique({ where: { id }, select: selectSafe });
  if (!user) return res.status(404).json({ error: "Usuario no encontrado" });
  res.json(user);
});

const update = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (id !== req.user.id) {
    const requester = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!requester?.isSuperAdmin) return res.status(403).json({ error: "No autorizado" });
  }
  const { fullName } = req.body;
  const user = await prisma.user.update({ where: { id }, data: { fullName }, select: selectSafe });
  res.json(user);
});

const remove = asyncHandler(async (req, res) => {
  await prisma.user.delete({ where: { id: req.params.id } });
  res.status(204).end();
});

module.exports = { list, getOne, update, remove };
