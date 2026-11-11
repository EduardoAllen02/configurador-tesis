const path = require("path");
const crypto = require("crypto");
const fs = require("fs/promises");
const sharp = require("sharp");
const prisma = require("../config/prisma");
const { asyncHandler } = require("../utils/asyncHandler");
const { uploadsDir } = require("../config/env");

const MB = 1024 * 1024;

// Lista cerrada por tipo: mime aceptado → extensión con la que se guarda en disco. La
// extensión sale de aquí, nunca del nombre original (evita servir un .html o .svg subido).
const KINDS = {
  image: {
    maxBytes: 25 * MB,
    mimes: { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/avif": ".avif" },
    formats: ["jpeg", "png", "webp", "heif"], // sharp reporta AVIF como "heif"
  },
  video: {
    maxBytes: 200 * MB,
    mimes: { "video/mp4": ".mp4", "video/webm": ".webm" },
  },
  audio: {
    maxBytes: 30 * MB,
    mimes: {
      "audio/mpeg": ".mp3",
      "audio/mp3": ".mp3",
      "audio/mp4": ".m4a",
      "audio/x-m4a": ".m4a",
      "audio/m4a": ".m4a",
      "audio/ogg": ".ogg",
      "audio/wav": ".wav",
      "audio/x-wav": ".wav",
      "audio/wave": ".wav",
    },
  },
};

function bad(res, message) {
  return res.status(400).json({ error: message });
}

const list = asyncHandler(async (req, res) => {
  const assets = await prisma.tourAsset.findMany({
    where: { tourId: req.params.tourId },
    orderBy: { createdAt: "asc" },
  });
  res.json(assets);
});

const create = asyncHandler(async (req, res) => {
  const file = req.file;
  if (!file) return bad(res, "Falta el archivo (campo file)");

  const cleanupTmp = () => fs.unlink(file.path).catch(() => {});
  try {
    const { tourId } = req.params;
    const kind = req.body.kind;
    const rules = KINDS[kind];
    if (!rules) return bad(res, "kind debe ser image, video o audio");

    const mime = String(file.mimetype || "").toLowerCase();
    const ext = rules.mimes[mime];
    if (!ext) {
      return bad(res, `Tipo de archivo no permitido para ${kind} (SVG y otros formatos no se aceptan)`);
    }
    if (file.size > rules.maxBytes) {
      return bad(res, `El archivo supera el máximo de ${Math.round(rules.maxBytes / MB)} MB para ${kind}`);
    }

    const dir = path.join(uploadsDir, "assets", tourId);
    await fs.mkdir(dir, { recursive: true });
    const id = crypto.randomUUID();
    let filename;
    let storedMime = mime;
    let storedSize = file.size;
    let width = null;
    let height = null;

    if (kind === "image") {
      // Se valida el contenido real (no solo el mime declarado) y se reencoda a WebP.
      let meta;
      try {
        meta = await sharp(file.path).metadata();
      } catch {
        return bad(res, "La imagen está dañada o no es un formato permitido");
      }
      if (!rules.formats.includes(meta.format)) {
        return bad(res, "La imagen no es un formato permitido (jpeg, png, webp o avif)");
      }
      filename = `${id}.webp`;
      const out = path.join(dir, filename);
      const info = await sharp(file.path).rotate().webp({ quality: 85 }).toFile(out);
      storedMime = "image/webp";
      storedSize = info.size;
      width = info.width;
      height = info.height;
    } else {
      filename = `${id}${ext}`;
      await fs.copyFile(file.path, path.join(dir, filename));
    }

    const asset = await prisma.tourAsset.create({
      data: {
        id,
        tourId,
        kind,
        path: `/uploads/assets/${tourId}/${filename}`,
        mime: storedMime,
        size: storedSize,
        width,
        height,
        originalName: path.basename(file.originalname || filename).slice(0, 200),
      },
    });
    res.status(201).json(asset);
  } finally {
    await cleanupTmp();
  }
});

const remove = asyncHandler(async (req, res) => {
  const { tourId, assetId } = req.params;
  const asset = await prisma.tourAsset.findFirst({ where: { id: assetId, tourId } });
  if (!asset) return res.status(404).json({ error: "Asset no encontrado" });

  await prisma.tourAsset.delete({ where: { id: asset.id } });
  await fs.unlink(path.join(uploadsDir, asset.path.replace(/^\/uploads\//, ""))).catch(() => {});
  res.status(204).end();
});

module.exports = { list, create, remove };
