const prisma = require("../config/prisma");
const { asyncHandler } = require("../utils/asyncHandler");
const { removesLastSuperAdmin } = require("../services/accessRules");

const selectSafe = { id: true, email: true, fullName: true, globalRole: true, createdAt: true };

function isGlobalOperator(user) {
  return user?.globalRole === "admin" || user?.globalRole === "super_admin";
}

const list = asyncHandler(async (req, res) => {
  const users = await prisma.user.findMany({
    select: { ...selectSafe, tourPermissions: { select: { id: true, tour: { select: { id: true, title: true } } } } },
    orderBy: { createdAt: "asc" },
  });
  res.json(users.map(({ tourPermissions, ...user }) => ({
    ...user,
    tours: tourPermissions.map(({ id, tour }) => ({ ...tour, permissionId: id })),
  })));
});

const getOne = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (id !== req.user.id) {
    const requester = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!isGlobalOperator(requester)) return res.status(403).json({ error: "No autorizado" });
  }
  const user = await prisma.user.findUnique({ where: { id }, select: selectSafe });
  if (!user) return res.status(404).json({ error: "Usuario no encontrado" });
  res.json(user);
});

const update = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (id !== req.user.id) {
    const requester = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!isGlobalOperator(requester)) return res.status(403).json({ error: "No autorizado" });
  }
  const { fullName } = req.body;
  const user = await prisma.user.update({ where: { id }, data: { fullName }, select: selectSafe });
  res.json(user);
});

// Borrado de cuenta es irreversible — gate: requireGlobalRole(["super_admin"]) en la ruta.
const remove = asyncHandler(async (req, res) => {
  await prisma.user.delete({ where: { id: req.params.id } });
  res.status(204).end();
});

// Promover/degradar el rol global de otro usuario. Gate: requireGlobalRole(["super_admin"])
// en la ruta — solo Superadmin escala privilegios, ni siquiera Admin puede.
const updateRole = asyncHandler(async (req, res) => {
  const { globalRole } = req.body;
  if (!["super_admin", "admin", "member"].includes(globalRole)) {
    return res.status(400).json({ error: "globalRole inválido" });
  }
  const target = await prisma.user.findUnique({ where: { id: req.params.id }, select: { globalRole: true } });
  if (!target) return res.status(404).json({ error: "Usuario no encontrado" });
  const superAdmins = await prisma.user.count({ where: { globalRole: "super_admin" } });
  if (removesLastSuperAdmin(target.globalRole, globalRole, superAdmins)) {
    return res.status(409).json({ error: "El sistema necesita al menos un superadministrador" });
  }
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: { globalRole },
    select: selectSafe,
  });
  res.json(user);
});

module.exports = { list, getOne, update, remove, updateRole };
