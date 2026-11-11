const path = require("path");
const crypto = require("crypto");
const fs = require("fs/promises");
const sharp = require("sharp");
const prisma = require("../config/prisma");
const { asyncHandler } = require("../utils/asyncHandler");
const { uploadsDir } = require("../config/env");
const { enqueueTiles, removeSceneFiles } = require("../services/tiling");

const IMAGE_MODES = ["webp", "tiles"];
const ORIGINAL_EXTS = { jpeg: ".jpg", png: ".png", webp: ".webp", tiff: ".tiff", heif: ".heic", avif: ".avif", gif: ".gif" };

// Guarda el original subido (para regenerar mosaicos desde él) en uploads/panoramas/originals/.
// `input` es el buffer en memoria o la ruta del archivo temporal (en ese caso se mueve, no se copia).
// Devuelve la ruta pública "/uploads/panoramas/originals/<archivo>".
async function keepOriginal(input, baseName) {
  const meta = await sharp(input).metadata();
  const ext = ORIGINAL_EXTS[meta.format] || ".img";
  const dir = path.join(uploadsDir, "panoramas", "originals");
  await fs.mkdir(dir, { recursive: true });
  const filename = `${baseName}${ext}`;
  const dest = path.join(dir, filename);
  if (Buffer.isBuffer(input)) {
    await fs.writeFile(dest, input);
  } else {
    try {
      await fs.rename(input, dest);
    } catch {
      await fs.copyFile(input, dest);
      await fs.unlink(input).catch(() => {});
    }
  }
  return `/uploads/panoramas/originals/${filename}`;
}

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

  const { name, initialYaw, initialPitch, orderIndex, batchId } = req.body;

  const panoramasDir = path.join(uploadsDir, "panoramas");
  await fs.mkdir(panoramasDir, { recursive: true });

  const baseName = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
  const filename = `${baseName}.webp`;
  const outputPath = path.join(panoramasDir, filename);
  await sharp(req.file.buffer).webp({ quality: 80 }).toFile(outputPath);
  const sourcePath = await keepOriginal(req.file.buffer, baseName);

  let resolvedOrderIndex = orderIndex ? Number(orderIndex) : undefined;
  if (resolvedOrderIndex === undefined) {
    const lastScene = await prisma.scene.findFirst({
      where: { tourId: req.params.tourId },
      orderBy: { orderIndex: "desc" },
    });
    resolvedOrderIndex = (lastScene?.orderIndex ?? -1) + 1;
  }

  const scene = await prisma.scene.create({
    data: {
      tourId: req.params.tourId,
      name: name || null,
      origen: "panorama_upload",
      // batchId opcional: lo manda el cliente cuando esta subida forma parte de un lote
      // arrastrado junto (varios requests individuales, uno por archivo, para poder
      // mostrar progreso y miniatura por archivo) — ver useSceneEditor.uploadPanoramasBulk.
      batchId: batchId || null,
      webpPath: `/uploads/panoramas/${filename}`,
      sourcePath,
      initialYaw: initialYaw ? Number(initialYaw) : 0,
      initialPitch: initialPitch ? Number(initialPitch) : 0,
      orderIndex: resolvedOrderIndex,
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
    const baseName = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    const filename = `${baseName}.webp`;
    const outputPath = path.join(panoramasDir, filename);
    await sharp(file.path).webp({ quality: 80 }).toFile(outputPath);
    const sourcePath = await keepOriginal(file.path, baseName); // mueve el temporal a originals/

    const scene = await prisma.scene.create({
      data: {
        tourId: req.params.tourId,
        name: null,
        origen: "panorama_upload",
        batchId,
        webpPath: `/uploads/panoramas/${filename}`,
        sourcePath,
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

// La escena debe pertenecer al tour de la URL (requireTourAccess solo valida el tour).
async function findSceneOfTour(req) {
  return prisma.scene.findFirst({ where: { id: req.params.sceneId, tourId: req.params.tourId } });
}

const update = asyncHandler(async (req, res) => {
  const { name, initialYaw, initialPitch, orderIndex, imageMode } = req.body;
  const current = await findSceneOfTour(req);
  if (!current) return res.status(404).json({ error: "Escena no encontrada" });

  if (imageMode !== undefined && imageMode !== null && !IMAGE_MODES.includes(imageMode)) {
    return res.status(400).json({ error: "imageMode debe ser \"webp\", \"tiles\" o null" });
  }
  if (imageMode === "tiles" && current.origen !== "panorama_upload") {
    return res.status(400).json({ error: "Los cuadros de video siempre usan WebP" });
  }

  let scene = await prisma.scene.update({
    where: { id: current.id },
    data: { name: name !== undefined ? name || null : undefined, initialYaw, initialPitch, orderIndex, imageMode },
  });
  // Pasar a mosaicos sin tenerlos listos (o con error) dispara la generación.
  if (imageMode === "tiles" && !["ready", "processing"].includes(scene.tiles?.status)) {
    scene = await enqueueTiles(scene.id);
  }
  res.json(scene);
});

// Regenera los mosaicos de una panorámica (desde el original, o desde la WebP si no hay).
const regenerateTiles = asyncHandler(async (req, res) => {
  const scene = await findSceneOfTour(req);
  if (!scene) return res.status(404).json({ error: "Escena no encontrada" });
  if (scene.origen !== "panorama_upload") {
    return res.status(400).json({ error: "Los cuadros de video siempre usan WebP" });
  }
  res.status(202).json(await enqueueTiles(scene.id));
});

const remove = asyncHandler(async (req, res) => {
  const scene = await findSceneOfTour(req);
  if (!scene) return res.status(404).json({ error: "Escena no encontrada" });
  await prisma.scene.delete({ where: { id: scene.id } });
  await removeSceneFiles(scene); // mosaicos y original (la WebP se conserva como hasta ahora)
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

module.exports = { list, create, uploadPanorama, bulkUploadPanoramas, getOne, update, regenerateTiles, remove, reorder };
