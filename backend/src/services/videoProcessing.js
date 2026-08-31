// Procesamiento de video 360°: extracción de frames (FFmpeg) + optimización a WebP (Sharp).
// No conectado a un endpoint de subida todavía — eso es de una fase posterior.
const ffmpeg = require("fluent-ffmpeg");
const sharp = require("sharp");
const fs = require("fs/promises");
const path = require("path");

const MAX_KB = 300; // tamaño objetivo por frame optimizado
const QUALITY_INITIAL = 80;
const QUALITY_MIN = 30;
const QUALITY_STEP = 10;

// Extrae frames de `videoPath` a `outDir`, uno cada `frameInterval` frames (reducción configurable).
function extractFrames(videoPath, outDir, frameInterval = 2) {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .outputOptions([`-vf select='not(mod(n\\,${frameInterval}))'`, "-vsync vfr"])
      .output(path.join(outDir, "frame_%05d.png"))
      .on("end", async () => {
        const files = (await fs.readdir(outDir)).filter((f) => f.endsWith(".png"));
        resolve(files.sort());
      })
      .on("error", reject)
      .run();
  });
}

// Convierte un frame PNG a WebP, bajando la calidad hasta quedar bajo MAX_KB (o llegar a QUALITY_MIN).
async function optimizeFrameToWebp(inputPath, outputPath) {
  let quality = QUALITY_INITIAL;
  let buffer;
  do {
    buffer = await sharp(inputPath).webp({ quality }).toBuffer();
    if (buffer.length / 1024 <= MAX_KB || quality <= QUALITY_MIN) break;
    quality -= QUALITY_STEP;
  } while (true);

  await fs.writeFile(outputPath, buffer);
  return { path: outputPath, sizeKB: buffer.length / 1024, quality };
}

// Orquesta el flujo completo para un VideoUpload: extrae frames y los optimiza a WebP.
// Devuelve la lista de rutas WebP generadas, listas para convertirse en registros Scene.
async function processVideo({ videoPath, framesDir, webpDir, frameInterval = 2 }) {
  await fs.mkdir(framesDir, { recursive: true });
  await fs.mkdir(webpDir, { recursive: true });

  const frameFiles = await extractFrames(videoPath, framesDir, frameInterval);

  const results = [];
  for (const file of frameFiles) {
    const inputPath = path.join(framesDir, file);
    const outputPath = path.join(webpDir, file.replace(".png", ".webp"));
    results.push(await optimizeFrameToWebp(inputPath, outputPath));
  }
  return results;
}

module.exports = { extractFrames, optimizeFrameToWebp, processVideo };
