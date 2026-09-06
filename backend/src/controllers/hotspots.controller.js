const path = require("path");
const fs = require("fs/promises");
const sharp = require("sharp");
const prisma = require("../config/prisma");
const { asyncHandler } = require("../utils/asyncHandler");
const { uploadsDir } = require("../config/env");

function validateByType({ type, price, targetSceneId }) {
  if (type === "price" && !price) return "price es requerido cuando type = price";
  if (type === "nav" && !targetSceneId) return "targetSceneId es requerido cuando type = nav";
  return null;
}

// Convierte el archivo subido (buffer en memoria) a WebP y lo guarda en uploads/hotspots —
// mismo patrón que scenes.controller.js para panoramas. Devuelve la ruta pública a guardar
// en `imagePath`.
async function saveHotspotImage(buffer) {
  const hotspotsDir = path.join(uploadsDir, "hotspots");
  await fs.mkdir(hotspotsDir, { recursive: true });
  const filename = `${Date.now()}-${Math.round(Math.random() * 1e6)}.webp`;
  await sharp(buffer).webp({ quality: 80 }).toFile(path.join(hotspotsDir, filename));
  return `/uploads/hotspots/${filename}`;
}

const list = asyncHandler(async (req, res) => {
  const hotspots = await prisma.hotspot.findMany({ where: { sceneId: req.params.sceneId } });
  res.json(hotspots);
});

// Puede llegar como JSON (sin imagen) o multipart (con imagen) — en multipart, lon/lat
// llegan como string, por eso el Number(...) incondicional (inofensivo si ya son número).
const create = asyncHandler(async (req, res) => {
  const { type, lon, lat, title, description, price, targetSceneId } = req.body;
  if (!type || lon === undefined || lat === undefined || !title) {
    return res.status(400).json({ error: "type, lon, lat y title son requeridos" });
  }
  const validationError = validateByType({ type, price, targetSceneId });
  if (validationError) return res.status(400).json({ error: validationError });

  const imagePath = req.file ? await saveHotspotImage(req.file.buffer) : undefined;

  const hotspot = await prisma.hotspot.create({
    data: {
      sceneId: req.params.sceneId,
      type,
      lon: Number(lon),
      lat: Number(lat),
      title,
      description,
      price,
      targetSceneId,
      imagePath,
    },
  });
  res.status(201).json(hotspot);
});

const update = asyncHandler(async (req, res) => {
  const { type, lon, lat, title, description, price, targetSceneId, removeImage } = req.body;
  if (type) {
    const validationError = validateByType({ type, price, targetSceneId });
    if (validationError) return res.status(400).json({ error: validationError });
  }

  let imagePath;
  if (req.file) imagePath = await saveHotspotImage(req.file.buffer);
  else if (removeImage === "true") imagePath = null;

  if (imagePath === null) {
    const existing = await prisma.hotspot.findUnique({ where: { id: req.params.hotspotId } });
    if (existing?.imagePath) {
      await fs.unlink(path.join(uploadsDir, existing.imagePath.replace(/^\/uploads\//, ""))).catch(() => {});
    }
  }

  const hotspot = await prisma.hotspot.update({
    where: { id: req.params.hotspotId },
    data: {
      type,
      lon: lon !== undefined ? Number(lon) : undefined,
      lat: lat !== undefined ? Number(lat) : undefined,
      title,
      description,
      price,
      targetSceneId,
      imagePath,
    },
  });
  res.json(hotspot);
});

const remove = asyncHandler(async (req, res) => {
  await prisma.hotspot.delete({ where: { id: req.params.hotspotId } });
  res.status(204).end();
});

module.exports = { list, create, update, remove };
