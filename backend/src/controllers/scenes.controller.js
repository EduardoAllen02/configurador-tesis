const path = require("path");
const fs = require("fs/promises");
const sharp = require("sharp");
const prisma = require("../config/prisma");
const { asyncHandler } = require("../utils/asyncHandler");
const { uploadsDir } = require("../config/env");

const list = asyncHandler(async (req, res) => {
  const scenes = await prisma.scene.findMany({
    where: { tourId: req.params.tourId },
    orderBy: { orderIndex: "asc" },
  });
  res.json(scenes);
});

const create = asyncHandler(async (req, res) => {
  const { name, origen, initialYaw, initialPitch, orderIndex, webpPath } = req.body;
  if (!name || !origen || !webpPath) {
    return res.status(400).json({ error: "name, origen y webpPath son requeridos" });
  }

  const scene = await prisma.scene.create({
    data: {
      tourId: req.params.tourId,
      name,
      origen,
      webpPath,
      initialYaw: initialYaw ?? 0,
      initialPitch: initialPitch ?? 0,
      orderIndex: orderIndex ?? 0,
    },
  });
  res.status(201).json(scene);
});

// Recibe una panorámica subida directo (multipart, campo "panorama"), la optimiza a WebP
// y crea la Scene con origen=panorama_upload.
const uploadPanorama = asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Falta el archivo panorama" });

  const { name, initialYaw, initialPitch, orderIndex } = req.body;
  if (!name) return res.status(400).json({ error: "name es requerido" });

  const panoramasDir = path.join(uploadsDir, "panoramas");
  await fs.mkdir(panoramasDir, { recursive: true });

  const filename = `${Date.now()}-${Math.round(Math.random() * 1e6)}.webp`;
  const outputPath = path.join(panoramasDir, filename);
  await sharp(req.file.buffer).webp({ quality: 80 }).toFile(outputPath);

  const scene = await prisma.scene.create({
    data: {
      tourId: req.params.tourId,
      name,
      origen: "panorama_upload",
      webpPath: `/uploads/panoramas/${filename}`,
      initialYaw: initialYaw ? Number(initialYaw) : 0,
      initialPitch: initialPitch ? Number(initialPitch) : 0,
      orderIndex: orderIndex ? Number(orderIndex) : 0,
    },
  });
  res.status(201).json(scene);
});

const getOne = asyncHandler(async (req, res) => {
  const scene = await prisma.scene.findUnique({
    where: { id: req.params.sceneId },
    include: { hotspots: true },
  });
  if (!scene) return res.status(404).json({ error: "Escena no encontrada" });
  res.json(scene);
});

const update = asyncHandler(async (req, res) => {
  const { name, initialYaw, initialPitch, orderIndex } = req.body;
  const scene = await prisma.scene.update({
    where: { id: req.params.sceneId },
    data: { name, initialYaw, initialPitch, orderIndex },
  });
  res.json(scene);
});

const remove = asyncHandler(async (req, res) => {
  await prisma.scene.delete({ where: { id: req.params.sceneId } });
  res.status(204).end();
});

const reorder = asyncHandler(async (req, res) => {
  const items = req.body; // [{ sceneId, orderIndex }]
  if (!Array.isArray(items)) return res.status(400).json({ error: "Se esperaba un arreglo" });

  await prisma.$transaction(
    items.map(({ sceneId, orderIndex }) =>
      prisma.scene.update({ where: { id: sceneId }, data: { orderIndex } })
    )
  );
  res.status(204).end();
});

module.exports = { list, create, uploadPanorama, getOne, update, remove, reorder };
