const fs = require("fs/promises");
const path = require("path");
const { randomUUID } = require("crypto");
const prisma = require("../config/prisma");
const { uploadsDir } = require("../config/env");
const { asyncHandler } = require("../utils/asyncHandler");
const { deriveDesignFromLegacy, validateDesign } = require("../services/design");
const { templateDesign, mapAssetReferences, assetFile } = require("../services/designTemplate");

const list = asyncHandler(async (_req, res) => {
  // File metadata stays server-side; users see only the published shared design.
  const templates = await prisma.designTemplate.findMany({ orderBy: { createdAt: "desc" }, select: { id: true, name: true, design: true, createdAt: true } });
  res.json(templates);
});

const create = asyncHandler(async (req, res) => {
  const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
  if (!name || name.length > 100) return res.status(400).json({ error: "Escribe un nombre de entre 1 y 100 caracteres" });
  const tour = await prisma.tour.findUnique({ where: { id: req.params.tourId } });
  if (!tour) return res.status(404).json({ error: "Tour no encontrado" });
  const design = templateDesign(tour.design ?? deriveDesignFromLegacy(tour));
  const valid = validateDesign(design);
  if (!valid.ok) return res.status(400).json({ error: valid.error });
  const assetIds = new Set();
  mapAssetReferences(design, (id) => { assetIds.add(id); return id; });
  const assets = await prisma.tourAsset.findMany({ where: { tourId: tour.id, id: { in: [...assetIds] } } });
  if (assets.length !== assetIds.size) return res.status(400).json({ error: "El diseño usa un archivo que ya no existe. Revisa sus imágenes antes de guardarlo." });
  const id = randomUUID();
  const folder = path.join(uploadsDir, "templates", id);
  try {
    await fs.mkdir(folder, { recursive: true });
    const copies = [];
    for (const asset of assets) {
      const filename = `${asset.id}${path.extname(asset.path)}`;
      await fs.copyFile(assetFile(uploadsDir, asset.path), path.join(folder, filename));
      const { tourId, createdAt, ...metadata } = asset;
      copies.push({ ...metadata, path: `/uploads/templates/${id}/${filename}` });
    }
    const saved = await prisma.designTemplate.create({ data: { id, name, design: valid.design, assets: copies }, select: { id: true, name: true, design: true, createdAt: true } });
    res.status(201).json(saved);
  } catch (err) {
    await fs.rm(folder, { recursive: true, force: true }).catch(() => {});
    throw err;
  }
});

// Import files into the destination, then let the editor apply/undo the snapshot.
// The destination design is saved by its usual autosave; importing never edits it.
const importTemplate = asyncHandler(async (req, res) => {
  const template = await prisma.designTemplate.findUnique({ where: { id: req.params.templateId } });
  if (!template) return res.status(404).json({ error: "Plantilla no encontrada" });
  const tour = await prisma.tour.findUnique({ where: { id: req.params.tourId }, select: { id: true } });
  if (!tour) return res.status(404).json({ error: "Tour no encontrado" });
  const copies = [], idMap = new Map();
  const folder = path.join(uploadsDir, "assets", tour.id);
  await fs.mkdir(folder, { recursive: true });
  try {
    for (const asset of template.assets) {
      const id = randomUUID(), filename = `${id}${path.extname(asset.path)}`;
      const publicPath = `/uploads/assets/${tour.id}/${filename}`;
      await fs.copyFile(assetFile(uploadsDir, asset.path), assetFile(uploadsDir, publicPath));
      copies.push({ ...asset, id, tourId: tour.id, path: publicPath });
      idMap.set(asset.id, id);
    }
    const design = mapAssetReferences(template.design, (id) => {
      if (!idMap.has(id)) throw new Error("La plantilla contiene un archivo no disponible");
      return idMap.get(id);
    });
    await prisma.$transaction(copies.map((data) => prisma.tourAsset.create({ data })));
    res.json({ design });
  } catch (err) {
    await Promise.all(copies.map((asset) => fs.unlink(assetFile(uploadsDir, asset.path)).catch(() => {})));
    throw err;
  }
});

module.exports = { list, create, importTemplate };
