// Genera un bundle web estático de un tour (docs/CONTRATO_OLEADA1.md §5):
//
//   exports/<tourId>/v<N>/
//     index.html                       cáscara mínima
//     runtime/tour-runtime.iife.js     motor compilado (copia de RUNTIME_DIST_DIR completo)
//     runtime/tour-runtime.css
//     tour-data.js                     window.__TOUR__ = <TourDocument con URLs relativas>
//     assets/scenes/<sceneId>.webp
//     assets/hotspots/<hotspotId>.webp
//     assets/media/<assetId>.<ext>     TourAsset (logo, video de fondo, audio…)
//     assets/tiles/<sceneId>/          mosaicos AVIF (base.avif + tile_<c>_<r>.avif) de las escenas en alta definición
//
// Es autocontenido: se publica en cualquier hosting estático, sin backend ni CDN.
const fs = require("fs/promises");
const path = require("path");
const { uploadsDir, runtimeDistDir } = require("../config/env");
const { buildTourDocument } = require("./tourDocument");

const RUNTIME_FILES = ["tour-runtime.iife.js", "tour-runtime.css"];
const RUNTIME_MISSING_MESSAGE = "Falta compilar el motor del tour: corre npm run build:runtime en frontend/";

function httpError(status, publicMessage) {
  const err = new Error(publicMessage);
  err.status = status;
  err.publicMessage = publicMessage;
  return err;
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

function buildIndexHtml(title) {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${escapeHtml(title)}</title><link rel="stylesheet" href="runtime/tour-runtime.css">
<style>html,body,#tour{margin:0;height:100%;background:#000}</style></head>
<body><div id="tour"></div>
<script src="runtime/tour-runtime.iife.js"></script><script src="tour-data.js"></script>
<script>TourRuntime.createTourRuntime(document.getElementById("tour"), window.__TOUR__, { mode: "export" });</script>
</body></html>
`;
}

// JSON seguro dentro de <script>: `<` escapado evita cerrar la etiqueta con "</script>", y
// U+2028/U+2029 no rompen el literal en motores JS antiguos.
function buildTourDataJs(doc) {
  const json = JSON.stringify(doc)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
  return `window.__TOUR__ = ${json};\n`;
}

// Ruta en disco de un /uploads/...; null si intenta salir de uploadsDir.
function uploadsFileFor(publicPath) {
  const root = path.resolve(uploadsDir);
  const full = path.resolve(root, String(publicPath).replace(/^\/uploads\//, ""));
  return full.startsWith(root + path.sep) ? full : null;
}

// Ruta relativa dentro del bundle según qué es el archivo (ctx viene de buildTourDocument).
function destFor(relPath, ctx) {
  if (ctx.kind === "scene") return `assets/scenes/${ctx.id}.webp`;
  if (ctx.kind === "hotspot") return `assets/hotspots/${ctx.id}.webp`;
  if (ctx.kind === "tiles") return `assets/tiles/${ctx.id}/${ctx.file}`;
  if (ctx.kind === "asset") return `assets/media/${ctx.id}${path.extname(String(relPath)).toLowerCase()}`;
  throw new Error(`exportBundle: tipo de archivo desconocido "${ctx.kind}"`);
}

async function generateBundle({ tourId, outDir }) {
  // Se verifica el motor antes de tocar disco, para no dejar carpetas a medias.
  for (const file of RUNTIME_FILES) {
    try {
      await fs.access(path.join(runtimeDistDir, file));
    } catch {
      throw httpError(500, RUNTIME_MISSING_MESSAGE);
    }
  }

  // Cada URL que resuelve el documento queda registrada para copiar su archivo después.
  const copies = [];
  const tileScenes = new Set(); // los mosaicos se copian por carpeta, no archivo por archivo
  const resolveUrl = (relPath, ctx) => {
    const dest = destFor(relPath, ctx);
    if (ctx.kind === "tiles") tileScenes.add(ctx.id);
    else copies.push({ src: relPath, dest });
    return dest;
  };
  const doc = await buildTourDocument(tourId, { resolveUrl });
  if (!doc) throw httpError(404, "Tour no encontrado");

  try {
    await fs.mkdir(path.join(outDir, "runtime"), { recursive: true });

    // Se copia la carpeta completa del motor (JS, CSS y lo que el build deje junto a ellos,
    // ej. fuentes): todo lo que el motor necesita en tiempo de ejecución vive en dist-runtime/.
    await fs.cp(runtimeDistDir, path.join(outDir, "runtime"), { recursive: true });
    for (const { src, dest } of copies) {
      const from = uploadsFileFor(src);
      if (!from) continue;
      const to = path.join(outDir, dest);
      await fs.mkdir(path.dirname(to), { recursive: true });
      // El asset de prueba/seed puede no existir en disco; el bundle igual se genera.
      await fs.copyFile(from, to).catch(() => {});
    }

    for (const sceneId of tileScenes) {
      await fs.cp(path.join(uploadsDir, "tiles", sceneId), path.join(outDir, "assets", "tiles", sceneId), { recursive: true }).catch(() => {}); // si faltara, el motor cae a la WebP
    }

    await fs.writeFile(path.join(outDir, "tour-data.js"), buildTourDataJs(doc), "utf-8");
    await fs.writeFile(path.join(outDir, "index.html"), buildIndexHtml(doc.tour.title), "utf-8");
  } catch (err) {
    await fs.rm(outDir, { recursive: true, force: true }).catch(() => {});
    throw err;
  }
}

module.exports = { generateBundle };
