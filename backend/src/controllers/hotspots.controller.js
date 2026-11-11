const path = require("path");
const fs = require("fs/promises");
const sharp = require("sharp");
const { Prisma } = require("@prisma/client");
const prisma = require("../config/prisma");
const { asyncHandler } = require("../utils/asyncHandler");
const { uploadsDir } = require("../config/env");
const { validateHotspotDetail, copiedDetail } = require("../services/hotspotDetail");

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

// Campos JSON nuevos (style, segments, content). En multipart llegan como string, en JSON
// como valor. Devuelve { value } (undefined = no se envió, Prisma.DbNull = borrar) o { error }.
function parseJsonField(raw, name, { allowArray }) {
  if (raw === undefined) return { value: undefined };
  if (raw === null || raw === "" || raw === "null") return { value: Prisma.DbNull };
  let parsed = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { error: `${name} no es JSON válido` };
    }
    if (parsed === null) return { value: Prisma.DbNull };
  }
  const isArray = Array.isArray(parsed);
  const isObject = typeof parsed === "object" && !isArray;
  if (!(isObject || (allowArray && isArray))) {
    return { error: `${name} debe ser ${allowArray ? "un objeto o arreglo" : "un objeto"} JSON, o null` };
  }
  return { value: parsed };
}

function parseLocked(raw) {
  if (raw === undefined) return { value: undefined };
  if (raw === true || raw === "true" || raw === "1" || raw === 1) return { value: true };
  if (raw === false || raw === "false" || raw === "0" || raw === 0) return { value: false };
  return { error: "locked debe ser booleano" };
}

function parseExtras(body) {
  const style = parseJsonField(body.style, "style", { allowArray: false });
  const segments = parseJsonField(body.segments, "segments", { allowArray: true });
  const content = parseJsonField(body.content, "content", { allowArray: false });
  const locked = parseLocked(body.locked);
  const error = style.error || segments.error || content.error || locked.error || validateHotspotDetail(content.value?.detail) || validateHotspotDetail(content.value?.card);
  if (error) return { error };
  if (content.value?.detail?.placement === "screen") content.value.detail.reveal = "click";
  return {
    data: { style: style.value, segments: segments.value, content: content.value, locked: locked.value },
  };
}

// La escena debe pertenecer al tour de la URL (cierra el hueco de acceso entre tours).
async function findSceneInTour(req) {
  return prisma.scene.findFirst({
    where: { id: req.params.sceneId, tourId: req.params.tourId },
    select: { id: true },
  });
}

async function findHotspotInTour(req) {
  return prisma.hotspot.findFirst({
    where: { id: req.params.hotspotId, sceneId: req.params.sceneId, scene: { tourId: req.params.tourId } },
  });
}

// Un nav solo puede apuntar a una escena del mismo tour.
async function targetOutsideTour(tourId, targetSceneId) {
  if (!targetSceneId) return false;
  const target = await prisma.scene.findFirst({ where: { id: targetSceneId, tourId }, select: { id: true } });
  return !target;
}

const list = asyncHandler(async (req, res) => {
  if (!(await findSceneInTour(req))) return res.status(404).json({ error: "Escena no encontrada" });
  const hotspots = await prisma.hotspot.findMany({ where: { sceneId: req.params.sceneId } });
  res.json(hotspots);
});

// Todos los hotspots del tour en una consulta: el editor los necesita juntos porque un
// hotspot de video con segmentos se ve en cuadros que no son su propia escena.
const listByTour = asyncHandler(async (req, res) => {
  const hotspots = await prisma.hotspot.findMany({
    where: { scene: { tourId: req.params.tourId } },
    orderBy: { createdAt: "asc" },
  });
  res.json(hotspots);
});

// Puede llegar como JSON (sin imagen) o multipart (con imagen) — en multipart, lon/lat
// llegan como string, por eso el Number(...) incondicional (inofensivo si ya son número).
const create = asyncHandler(async (req, res) => {
  const scope = req.body.detailApplyTo ?? "this";
  if (!["this", "type", "all"].includes(scope)) return res.status(400).json({ error: "Alcance de detalle inválido" });
  const { type, lon, lat, title, description, price, targetSceneId } = req.body;
  if (!type || lon === undefined || lat === undefined || !title) {
    return res.status(400).json({ error: "type, lon, lat y title son requeridos" });
  }
  const validationError = validateByType({ type, price, targetSceneId });
  if (validationError) return res.status(400).json({ error: validationError });
  const extras = parseExtras(req.body);
  if (extras.error) return res.status(400).json({ error: extras.error });
  if (scope !== "this" && !extras.data.content?.detail) return res.status(400).json({ error: "Falta el detalle para aplicar al resto" });

  if (!(await findSceneInTour(req))) return res.status(404).json({ error: "Escena no encontrada" });
  if (await targetOutsideTour(req.params.tourId, targetSceneId)) {
    return res.status(400).json({ error: "targetSceneId no pertenece a este tour" });
  }

  const imagePath = req.file ? await saveHotspotImage(req.file.buffer) : undefined;

  const mutation = {
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
      ...extras.data,
    },
  };
  const hotspot = scope === "this" ? await prisma.hotspot.create(mutation) : await prisma.$transaction(async (tx) => {
    const saved = await tx.hotspot.create(mutation);
    const others = await tx.hotspot.findMany({ where: { scene: { tourId: req.params.tourId }, id: { not: saved.id }, locked: false, ...(scope === "type" ? { type } : {}) } });
    for (const other of others) await tx.hotspot.update({ where: { id: other.id }, data: { content: { ...(other.content ?? {}), detail: copiedDetail(extras.data.content.detail) } } });
    return saved;
  }, { timeout: 30000 });
  res.status(201).json(hotspot);
});

const update = asyncHandler(async (req, res) => {
  const scope = req.body.detailApplyTo ?? "this";
  if (!["this", "type", "all"].includes(scope)) return res.status(400).json({ error: "Alcance de detalle inválido" });
  const { type, lon, lat, title, description, price, targetSceneId, removeImage } = req.body;
  if (type) {
    const validationError = validateByType({ type, price, targetSceneId });
    if (validationError) return res.status(400).json({ error: validationError });
  }
  const extras = parseExtras(req.body);
  if (extras.error) return res.status(400).json({ error: extras.error });
  if (scope !== "this" && !extras.data.content?.detail) return res.status(400).json({ error: "Falta el detalle para aplicar al resto" });

  const existing = await findHotspotInTour(req);
  if (!existing) return res.status(404).json({ error: "Hotspot no encontrado" });
  if (await targetOutsideTour(req.params.tourId, targetSceneId)) {
    return res.status(400).json({ error: "targetSceneId no pertenece a este tour" });
  }

  let imagePath;
  if (req.file) imagePath = await saveHotspotImage(req.file.buffer);
  else if (removeImage === "true") imagePath = null;

  const mutation = {
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
      ...extras.data,
    },
  };
  let hotspot;
  if (scope === "this") hotspot = await prisma.hotspot.update(mutation);
  else {
    hotspot = await prisma.$transaction(async (tx) => {
      const saved = await tx.hotspot.update(mutation);
      const others = await tx.hotspot.findMany({ where: { scene: { tourId: req.params.tourId }, id: { not: existing.id }, locked: false, ...(scope === "type" ? { type: type || existing.type } : {}) } });
      for (const other of others) await tx.hotspot.update({ where: { id: other.id }, data: { content: { ...(other.content ?? {}), detail: copiedDetail(extras.data.content.detail) } } });
      return saved;
    }, { timeout: 30000 });
  }
  if (imagePath === null && existing.imagePath) await fs.unlink(path.join(uploadsDir, existing.imagePath.replace(/^\/uploads\//, ""))).catch(() => {});
  res.json(hotspot);
});

const remove = asyncHandler(async (req, res) => {
  if (!(await findHotspotInTour(req))) return res.status(404).json({ error: "Hotspot no encontrado" });
  await prisma.hotspot.delete({ where: { id: req.params.hotspotId } });
  res.status(204).end();
});

module.exports = { list, listByTour, create, update, remove };
