const path = require("node:path");
const fs = require("node:fs/promises");
const { randomUUID } = require("node:crypto");
const sharp = require("sharp");
const { uploadsDir } = require("../config/env");

const PREVIEW_SUFFIX = ".preview.webp";
const THUMB_SUFFIX = ".thumb.webp";
// Versiones ligeras derivadas de cada WebP de escena. La miniatura es la que pinta la barra de
// escenas del editor: decodificar la panorámica completa (6144 px, ~72 MB en memoria) por cada
// tarjeta de 52x40 px hacía que el scroll se trabara al crecer el tour.
const VARIANTS = {
  [PREVIEW_SUFFIX]: { width: 1024, height: 512, quality: 45 },
  [THUMB_SUFFIX]: { width: 320, height: 160, quality: 60 },
};
const SCENE_WEBP_PATH = /^\/uploads\/(?:panoramas|frames|packages)(?:\/[a-z\d_.-]+)*\/[a-z\d_.-]+\.webp$/i;
const generations = new Map();

function panoramaPreviewPath(source, suffix = PREVIEW_SUFFIX) {
  if (!VARIANTS[suffix] || typeof source !== "string" || !SCENE_WEBP_PATH.test(source)) return null;
  if (Object.keys(VARIANTS).some(variant => source.endsWith(variant)) || source.split("/").some(part => part === "." || part === "..")) return null;
  return source.slice(0, -5) + suffix;
}

function ensurePanoramaPreview(source, suffix = PREVIEW_SUFFIX) {
  const preview = panoramaPreviewPath(source, suffix);
  const { width, height, quality } = VARIANTS[suffix] ?? {};
  if (!preview) return Promise.reject(new Error("Ruta de panorámica no válida"));
  if (generations.has(preview)) return generations.get(preview);
  const input = path.resolve(uploadsDir, source.slice("/uploads/".length));
  const output = path.resolve(uploadsDir, preview.slice("/uploads/".length));
  const generation = (async () => {
    try {
      await fs.access(output);
      return output;
    } catch {
      // Cada reemplazo apunta a una WebP distinta. Se puede generar y reutilizar su vista ligera
      // sin tocar las filas existentes, y un archivo incompleto nunca se sirve.
      const temp = `${output}.${randomUUID()}.tmp`;
      try {
        await sharp(input)
          .resize({ width, height, fit: "inside", withoutEnlargement: true })
          .webp({ quality })
          .toFile(temp);
        await fs.rename(temp, output);
        return output;
      } finally {
        await fs.unlink(temp).catch(() => {});
      }
    }
  })().finally(() => generations.delete(preview));
  generations.set(preview, generation);
  return generation;
}

function servePanoramaPreview(req, res, next) {
  const suffix = Object.keys(VARIANTS).find(variant => req.path.endsWith(variant));
  if (!["GET", "HEAD"].includes(req.method) || !suffix) return next();
  const source = `/uploads${req.path.slice(0, -suffix.length)}.webp`;
  if (panoramaPreviewPath(source, suffix) !== `/uploads${req.path}`) return next();
  ensurePanoramaPreview(source, suffix).then(
    filename => res.sendFile(filename, { maxAge: "1d", immutable: true }, err => { if (err) next(err); }),
    () => res.sendStatus(404)
  );
}

module.exports = { PREVIEW_SUFFIX, THUMB_SUFFIX, panoramaPreviewPath, ensurePanoramaPreview, servePanoramaPreview };
