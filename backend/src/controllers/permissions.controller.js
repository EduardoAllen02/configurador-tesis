const prisma = require("../config/prisma");
const { asyncHandler } = require("../utils/asyncHandler");
const { isValidTourRole } = require("../services/accessRules");

const list = asyncHandler(async (req, res) => {
  const permissions = await prisma.tourPermission.findMany({
    where: { tourId: req.params.tourId },
    include: { user: { select: { id: true, email: true, fullName: true } } },
  });
  res.json(permissions);
});

const create = asyncHandler(async (req, res) => {
  const { userId, role } = req.body;
  if (!userId || !role) return res.status(400).json({ error: "userId y role son requeridos" });
  if (!isValidTourRole(role)) return res.status(400).json({ error: "role inválido" });

  try {
    const permission = await prisma.tourPermission.create({
      data: { tourId: req.params.tourId, userId, role },
    });
    res.status(201).json(permission);
  } catch (err) {
    if (err.code === "P2002") return res.status(409).json({ error: "Ese usuario ya tiene acceso al tour" });
    throw err;
  }
});

const update = asyncHandler(async (req, res) => {
  const { role } = req.body;
  const permission = await prisma.tourPermission.update({
    where: { id: req.params.permissionId },
    data: { role },
  });
  res.json(permission);
});

const remove = asyncHandler(async (req, res) => {
  await prisma.tourPermission.delete({ where: { id: req.params.permissionId } });
  res.status(204).end();
});

module.exports = { list, create, update, remove };
