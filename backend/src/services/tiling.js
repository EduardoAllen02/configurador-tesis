// Mosaicos AVIF de alta definición (plan §3.10, docs/CONTRATO_OLEADA2.md §6).
//
//   uploads/tiles/<sceneId>/base.avif            mitad del ancho de trabajo (ej. 3072×1536)
//   uploads/tiles/<sceneId>/tile_<c>_<r>.avif    cuadrícula cols×rows cortada del ancho de trabajo
//
// El ancho de trabajo es el del original (o de la WebP si no hay original) con tope en 6144 y
// NUNCA se agranda. Se genera en segundo plano, una escena a la vez (cola en memoria), y el
// resultado queda en `Scene.tiles = { status, width, cols, rows, error? }`.
const path = require("path");
const fs = require("fs/promises");
const sharp = require("sharp");
const prisma = require("../config/prisma");
const { uploadsDir } = require("../config/env");

const COLS = 8;
const ROWS = 4;
const MAX_WIDTH = 6144; // 8 × 768 px
const MIN_WIDTH = 512;
// Calidad/esfuerzo medidos con una panorámica 6144×3072: ver el reporte de la Oleada 2.
const AVIF_OPTIONS = { quality: 55, effort: 4, chromaSubsampling: "4:2:0" };

const tilesRoot = () => path.join(uploadsDir, "tiles");
const tilesDirFor = (sceneId) => path.join(tilesRoot(), sceneId);

// Ruta en disco de un "/uploads/..."; null si intenta salir de uploadsDir.
function uploadsFileFor(publicPath) {
  if (!publicPath) return null;
  const root = path.resolve(uploadsDir);
  const full = path.resolve(root, String(publicPath).replace(/^\/uploads\//, ""));
  return full.startsWith(root + path.sep) ? full : null;
}

async function exists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

// Ancho de trabajo: el del origen, con tope y múltiplo de `cols` (para que los mosaicos sean
// exactos y el alto, la mitad, sea múltiplo de `rows`). Nunca mayor que el origen.
function workingWidth(sourceWidth, cols = COLS) {
  const capped = Math.min(Math.floor(sourceWidth), MAX_WIDTH);
  return capped - (capped % cols);
}

// Origen de los mosaicos: el original subido si sigue en disco; si no, la WebP.
async function resolveSourceFile(scene) {
  for (const candidate of [scene.sourcePath, scene.webpPath]) {
    const file = uploadsFileFor(candidate);
    if (file && (await exists(file))) return file;
  }
  return null;
}

async function dirSize(dir) {
  let total = 0;
  for (const name of await fs.readdir(dir)) total += (await fs.stat(path.join(dir, name))).size;
  return total;
}

// Corta y codifica. Devuelve { width, cols, rows, bytes, encodeMs }.
async function buildTiles(sourceFile, outDir) {
  const meta = await sharp(sourceFile).metadata();
  if (!meta.width || !meta.height) throw new Error("No se pudo leer la imagen");
  const width = workingWidth(meta.width);
  if (width < MIN_WIDTH) throw new Error(`La imagen es demasiado pequeña para mosaicos (${meta.width}px de ancho)`);
  const height = width / 2;
  const tileW = width / COLS;
  const tileH = height / ROWS;

  const started = Date.now();
  await fs.mkdir(outDir, { recursive: true });

  // Base: se remuestrea directo del origen (no del tamaño de trabajo) para no perder nitidez.
  await sharp(sourceFile)
    .resize(width / 2, height / 2, { fit: "fill" })
    .avif(AVIF_OPTIONS)
    .toFile(path.join(outDir, "base.avif"));

  // Una sola decodificación + reescalado al tamaño de trabajo; cada mosaico es un recorte crudo.
  const { data, info } = await sharp(sourceFile)
    .resize(width, height, { fit: "fill" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const raw = { raw: { width: info.width, height: info.height, channels: info.channels } };

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      await sharp(data, raw)
        .extract({ left: c * tileW, top: r * tileH, width: tileW, height: tileH })
        .avif(AVIF_OPTIONS)
        .toFile(path.join(outDir, `tile_${c}_${r}.avif`));
    }
  }
  return { width, cols: COLS, rows: ROWS, bytes: await dirSize(outDir), encodeMs: Date.now() - started };
}

async function runJob(sceneId) {
  const scene = await prisma.scene.findUnique({ where: { id: sceneId } });
  if (!scene) return; // la borraron mientras esperaba en la cola
  const finalDir = tilesDirFor(sceneId);
  const tmpDir = `${finalDir}.tmp`;
  try {
    const source = await resolveSourceFile(scene);
    if (!source) throw new Error("No se encontró la imagen original de la escena");
    await fs.rm(tmpDir, { recursive: true, force: true });
    const result = await buildTiles(source, tmpDir);
    // Intercambio atómico: el visor nunca ve una carpeta a medias.
    await fs.rm(finalDir, { recursive: true, force: true });
    await fs.rename(tmpDir, finalDir);
    await prisma.scene.update({ where: { id: sceneId }, data: { tiles: { status: "ready", ...result } } });
    console.log(`[mosaicos] ${sceneId}: ${result.width}px, ${(result.bytes / 1048576).toFixed(1)} MB, ${result.encodeMs} ms`);
  } catch (err) {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    const tiles = { status: "error", width: 0, cols: COLS, rows: ROWS, error: String(err.message || err).slice(0, 300) };
    try {
      await prisma.scene.update({ where: { id: sceneId }, data: { tiles } });
      console.error(`[mosaicos] ${sceneId}: error`, err);
    } catch {
      // La escena se borró mientras se generaba: no hay dónde anotar el error, y sus archivos sobran.
      await removeSceneFiles(scene).catch(() => {});
    }
  }
}

// ── Cola en memoria: un trabajo a la vez ─────────────────────────────────
const queue = [];
let running = null; // sceneId en curso
let rerun = false; // piden regenerar la escena que ya se está procesando
let draining = false;

async function drain() {
  if (draining) return;
  draining = true;
  try {
    while (queue.length) {
      running = queue.shift();
      rerun = false;
      await runJob(running);
      if (rerun) queue.push(running);
    }
  } finally {
    running = null;
    draining = false;
  }
}

// Marca la escena como "processing" y la pone en la cola. Devuelve la escena actualizada.
// La respuesta HTTP no espera a la generación.
async function enqueueTiles(sceneId) {
  const scene = await prisma.scene.update({
    where: { id: sceneId },
    data: { tiles: { status: "processing", width: 0, cols: COLS, rows: ROWS } },
  });
  if (running === sceneId) rerun = true;
  else if (!queue.includes(sceneId)) queue.push(sceneId);
  setImmediate(() => drain().catch((err) => console.error("[mosaicos] cola", err)));
  return scene;
}

// Al arrancar: lo que quedó en "processing" (el servidor se cerró a medias) se reintenta.
async function resumePending() {
  const scenes = await prisma.scene.findMany({
    where: { tiles: { path: ["status"], equals: "processing" } },
    select: { id: true },
  });
  for (const { id } of scenes) await enqueueTiles(id);
  return scenes.length;
}

// Borra mosaicos y original de una escena (best-effort).
async function removeSceneFiles(scene) {
  await fs.rm(tilesDirFor(scene.id), { recursive: true, force: true }).catch(() => {});
  const original = uploadsFileFor(scene.sourcePath);
  if (original) await fs.rm(original, { force: true }).catch(() => {});
}

module.exports = {
  COLS,
  ROWS,
  MAX_WIDTH,
  AVIF_OPTIONS,
  workingWidth,
  buildTiles,
  enqueueTiles,
  resumePending,
  removeSceneFiles,
  tilesDirFor,
  uploadsFileFor,
};
