const prisma = require("../config/prisma");
const { asyncHandler } = require("../utils/asyncHandler");

const list = asyncHandler(async (req, res) => {
  const invitations = await prisma.invitation.findMany({
    where: { tourId: req.params.tourId },
    orderBy: { createdAt: "desc" },
  });
  res.json(invitations);
});

const create = asyncHandler(async (req, res) => {
  const { role, email, expiresAt } = req.body;
  if (!role) return res.status(400).json({ error: "role es requerido" });

  const invitation = await prisma.invitation.create({
    data: {
      tourId: req.params.tourId,
      role,
      email: email || undefined,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      createdById: req.user.id,
    },
  });
  res.status(201).json(invitation);
});

const remove = asyncHandler(async (req, res) => {
  await prisma.invitation.delete({ where: { id: req.params.invitationId } });
  res.status(204).end();
});

// Canje de un enlace de invitación por el usuario autenticado: crea (o actualiza) su
// TourPermission con el rol predefinido del enlace. No requiere admin_tour previo —
// el token en sí es la autorización (modelo tipo Canva/Figma).
const redeem = asyncHandler(async (req, res) => {
  const invitation = await prisma.invitation.findUnique({ where: { token: req.params.token } });
  if (!invitation) return res.status(404).json({ error: "Invitación no encontrada" });
  if (invitation.expiresAt && invitation.expiresAt < new Date()) {
    return res.status(410).json({ error: "La invitación expiró" });
  }
  if (invitation.email && invitation.email !== req.user.email) {
    return res.status(403).json({ error: "Esta invitación es para otro correo" });
  }

  const permission = await prisma.tourPermission.upsert({
    where: { tourId_userId: { tourId: invitation.tourId, userId: req.user.id } },
    update: { role: invitation.role },
    create: { tourId: invitation.tourId, userId: req.user.id, role: invitation.role },
  });

  await prisma.invitation.update({
    where: { id: invitation.id },
    data: { usedByUserId: req.user.id, usedAt: new Date() },
  });

  res.json({ tourId: invitation.tourId, role: permission.role });
});

module.exports = { list, create, remove, redeem };
