const path = require("path");
const crypto = require("crypto");
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
  if (!origen || !webpPath) {
    return res.status(400).json({ error: "origen y webpPath son requeridos" });
  }

  const scene = await prisma.scene.create({
    data: {
      tourId: req.params.tourId,
      name: name || null,
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
// y crea la Scene con origen=panorama_upload. `name` es opcional: una escena sin nombre
// sigue siendo navegable (por hotspot o scrubber), solo no aparece en el menú curado.
const uploadPanorama = asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Falta el archivo panorama" });

  const { name, initialYaw, initialPitch, orderIndex } = req.body;

  const panoramasDir = path.join(uploadsDir, "panoramas");
  await fs.mkdir(panoramasDir, { recursive: true });

  const filename = `${Date.now()}-${Math.round(Math.random() * 1e6)}.webp`;
  const outputPath = path.join(panoramasDir, filename);
  await sharp(req.file.buffer).webp({ quality: 80 }).toFile(outputPath);

  const scene = await prisma.scene.create({
    data: {
      tourId: req.params.tourId,
      name: name || null,
      origen: "panorama_upload",
      webpPath: `/uploads/panoramas/${filename}`,
      initialYaw: initialYaw ? Number(initialYaw) : 0,
      initialPitch: initialPitch ? Number(initialPitch) : 0,
      orderIndex: orderIndex ? Number(orderIndex) : 0,
    },
  });
  res.status(201).json(scene);
});

// Subida masiva: N panorámicas en un solo request, todas sin nombre (el editor les pone
// nombre después, solo a las que quiera hacer visibles/menú). Comparten un batchId nuevo
// para poder navegarse como secuencia con scrubber, igual que un video procesado.
// Procesa los archivos secuencialmente (no en paralelo) para no acumular todos los
// buffers de Sharp en memoria a la vez.
const bulkUploadPanoramas = asyncHandler(async (req, res) => {
  if (!req.files?.length) return res.status(400).json({ error: "Falta al menos un archivo" });

  const panoramasDir = path.join(uploadsDir, "panoramas");
  await fs.mkdir(panoramasDir, { recursive: true });

  const batchId = crypto.randomUUID();
  const lastScene = await prisma.scene.findFirst({
    where: { tourId: req.params.tourId },
    orderBy: { orderIndex: "desc" },
  });
  let nextOrderIndex = (lastScene?.orderIndex ?? -1) + 1;

  const scenes = [];
  for (const file of req.files) {
    const filename = `${Date.now()}-${Math.round(Math.random() * 1e6)}.webp`;
    const outputPath = path.join(panoramasDir, filename);
    await sharp(file.path).webp({ quality: 80 }).toFile(outputPath);
    await fs.unlink(file.path).catch(() => {});

    const scene = await prisma.scene.create({
      data: {
        tourId: req.params.tourId,
        name: null,
        origen: "panorama_upload",
        batchId,
        webpPath: `/uploads/panoramas/${filename}`,
        orderIndex: nextOrderIndex++,
      },
    });
    scenes.push(scene);
  }

  res.status(201).json({ scenes });
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
    data: { name: name !== undefined ? name || null : undefined, initialYaw, initialPitch, orderIndex },
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

module.exports = { list, create, uploadPanorama, bulkUploadPanoramas, getOne, update, remove, reorder };
