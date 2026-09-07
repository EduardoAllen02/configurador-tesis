const prisma = require("../config/prisma");
const { asyncHandler } = require("../utils/asyncHandler");

const list = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  const isGlobalOperator = user?.globalRole === "admin" || user?.globalRole === "super_admin";

  const tours = await prisma.tour.findMany({
    where: isGlobalOperator ? {} : { permissions: { some: { userId: req.user.id } } },
    orderBy: { createdAt: "desc" },
  });
  res.json(tours);
});

// Solo Admin/Superadmin crean tours (ver tours.routes.js) — Cliente/Dev reciben acceso a
// un tour ya existente vía TourPermission (invitación o asignación directa), no lo crean
// ellos mismos. Por eso no se auto-otorga ningún TourPermission aquí: quien crea ya es
// global operator y tiene acceso sin necesitar esa fila.
const create = asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  if (!title) return res.status(400).json({ error: "title es requerido" });

  const tour = await prisma.tour.create({
    data: { title, description, createdById: req.user.id },
  });
  res.status(201).json(tour);
});

const getOne = asyncHandler(async (req, res) => {
  const tour = await prisma.tour.findUnique({
    where: { id: req.params.tourId },
    include: { scenes: { orderBy: { orderIndex: "asc" } } },
  });
  if (!tour) return res.status(404).json({ error: "Tour no encontrado" });
  res.json(tour);
});

const update = asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  const tour = await prisma.tour.update({
    where: { id: req.params.tourId },
    data: { title, description },
  });
  res.json(tour);
});

const remove = asyncHandler(async (req, res) => {
  await prisma.tour.delete({ where: { id: req.params.tourId } });
  res.status(204).end();
});

// Gate: requireDevAccess (ver rbac.js) — solo dev sobre este tour, o Admin/Superadmin.
const updateCustomCode = asyncHandler(async (req, res) => {
  const { customCss, customJs } = req.body;
  const tour = await prisma.tour.update({
    where: { id: req.params.tourId },
    data: { customCss, customJs },
  });
  res.json(tour);
});

module.exports = { list, create, getOne, update, remove, updateCustomCode };
