const path = require("path");
const fs = require("fs/promises");
const prisma = require("../config/prisma");
const { asyncHandler } = require("../utils/asyncHandler");
const { exportsDir, uploadsDir } = require("../config/env");
const { buildTourDocument } = require("../services/tourDocument");
const { validateDesign } = require("../services/design");
const { removeSceneFiles } = require("../services/tiling");

const list = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  const isGlobalOperator = user?.globalRole === "admin" || user?.globalRole === "super_admin";

  const tours = await prisma.tour.findMany({
    where: isGlobalOperator ? {} : { permissions: { some: { userId: req.user.id } } },
    orderBy: { createdAt: "desc" },
  });
  res.json(tours);
});

// Solo Admin/Superadmin crean tours (ver tours.routes.js) — Cliente recibe acceso a
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
  // theme/customTexts son parte de "apariencia" (Track A) — cualquiera con acceso al
  // tour (cliente/admin/superadmin) puede tocarlos.
  const { title, description, theme, customTexts } = req.body;
  const tour = await prisma.tour.update({
    where: { id: req.params.tourId },
    data: { title, description, theme, customTexts },
  });
  res.json(tour);
});

const remove = asyncHandler(async (req, res) => {
  const scenes = await prisma.scene.findMany({
    where: { tourId: req.params.tourId },
    select: { id: true, sourcePath: true },
  });
  await prisma.tour.delete({ where: { id: req.params.tourId } });
  // Mosaicos AVIF y originales de sus panorámicas (best-effort, como lo demás en disco).
  await Promise.all(scenes.map((scene) => removeSceneFiles(scene)));
  // Los bundles exportados y los assets del tour viven en disco; se borran best-effort (la BD ya quedó limpia).
  await fs.rm(path.join(exportsDir, req.params.tourId), { recursive: true, force: true }).catch(() => {});
  await fs.rm(path.join(uploadsDir, "assets", req.params.tourId), { recursive: true, force: true }).catch(() => {});
  res.status(204).end();
});

// TourDocument completo con URLs absolutas a /uploads de este servidor.
const getDocument = asyncHandler(async (req, res) => {
  const origin = `${req.protocol}://${req.get("host")}`;
  const doc = await buildTourDocument(req.params.tourId, {
    resolveUrl: (relPath) => (/^https?:\/\//.test(relPath) ? relPath : `${origin}${relPath}`),
  });
  if (!doc) return res.status(404).json({ error: "Tour no encontrado" });
  res.json(doc);
});

const updateDesign = asyncHandler(async (req, res) => {
  const result = validateDesign(req.body);
  if (!result.ok) return res.status(400).json({ error: result.error });

  const exists = await prisma.tour.findUnique({ where: { id: req.params.tourId }, select: { id: true } });
  if (!exists) return res.status(404).json({ error: "Tour no encontrado" });

  const tour = await prisma.tour.update({
    where: { id: req.params.tourId },
    data: { design: result.design },
    select: { design: true },
  });
  res.json(tour.design);
});

module.exports = { list, create, getOne, update, remove, getDocument, updateDesign };
