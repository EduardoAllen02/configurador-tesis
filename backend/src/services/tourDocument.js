// Serializador del TourDocument (docs/CONTRATO_OLEADA1.md §1): un único JSON que describe
// el tour completo y que consumen el visor, el editor y el bundle exportado.
const prisma = require("../config/prisma");
const { deriveDesignFromLegacy } = require("./design");

// Mismo criterio que frontend/src/editor/utils/sceneLabel.js.
function sceneLabel(scene, index) {
  if (scene?.name) return scene.name;
  return `Escena ${typeof index === "number" ? index + 1 : "?"}`;
}

// Modo efectivo de una escena: la suya, si no la del tour, si no WebP. Los cuadros de video
// (video_frame) siempre son WebP. Devuelve el bloque `image.tiles` o null (docs/CONTRATO_OLEADA2.md §6).
function tilesFor(scene, design, resolveUrl) {
  if (scene.origen !== "panorama_upload") return null;
  const mode = scene.imageMode ?? design?.panoramas?.mode ?? "webp";
  const tiles = scene.tiles;
  if (mode !== "tiles" || tiles?.status !== "ready") return null;
  const dir = `/uploads/tiles/${scene.id}`;
  const file = (name) => resolveUrl(`${dir}/${name}`, { kind: "tiles", id: scene.id, file: name });
  return {
    width: tiles.width,
    cols: tiles.cols,
    rows: tiles.rows,
    base: file("base.avif"),
    tileUrl: file("tile_{c}_{r}.avif"),
  };
}

// `resolveUrl(relPath, ctx)` convierte la ruta guardada en BD (ej. /uploads/panoramas/x.webp)
// en la URL que irá en el documento. `ctx` = { kind: "scene" | "hotspot" | "asset" | "tiles", id, file? } permite a la
// estrategia de export mapear a assets/scenes/<id>.webp sin que este módulo sepa de carpetas.
async function buildTourDocument(tourId, { resolveUrl }) {
  // Tres consultas en total, sin N+1: tour + escenas, hotspots de todas las escenas y assets.
  const tour = await prisma.tour.findUnique({
    where: { id: tourId },
    include: { scenes: { orderBy: [{ orderIndex: "asc" }, { createdAt: "asc" }] } },
  });
  if (!tour) return null;

  const hotspots = await prisma.hotspot.findMany({
    where: { scene: { tourId } },
    orderBy: { createdAt: "asc" },
  });
  // Assets del tour (logo, video de fondo, audio…): el diseño los referencia como "asset:<id>".
  const assets = await prisma.tourAsset.findMany({ where: { tourId }, orderBy: { createdAt: "asc" } });

  const design = tour.design ?? deriveDesignFromLegacy(tour);

  return {
    schema: 1,
    tour: { id: tour.id, title: tour.title, description: tour.description ?? null },
    design,
    scenes: tour.scenes.map((scene, index) => ({
      id: scene.id,
      name: scene.name ?? null,
      label: sceneLabel(scene, index),
      origen: scene.origen,
      batchId: scene.batchId ?? null,
      videoUploadId: scene.videoUploadId ?? null,
      orderIndex: scene.orderIndex,
      initialYaw: scene.initialYaw,
      initialPitch: scene.initialPitch,
      image: { webp: resolveUrl(scene.webpPath, { kind: "scene", id: scene.id }), tiles: tilesFor(scene, design, resolveUrl) },
      groupId: null,
      plan: null,
    })),
    hotspots: hotspots.map((h) => ({
      id: h.id,
      sceneId: h.sceneId,
      type: h.type,
      lon: h.lon,
      lat: h.lat,
      title: h.title,
      description: h.description ?? null,
      price: h.price ?? null,
      targetSceneId: h.targetSceneId ?? null,
      image: h.imagePath ? resolveUrl(h.imagePath, { kind: "hotspot", id: h.id }) : null,
      style: h.style ?? null,
      locked: h.locked,
      segments: h.segments ?? null,
      content: h.content ?? null,
    })),
    groups: [],
    assets: Object.fromEntries(
      assets.map((a) => [
        a.id,
        {
          kind: a.kind,
          url: resolveUrl(a.path, { kind: "asset", id: a.id }),
          mime: a.mime,
          width: a.width ?? null,
          height: a.height ?? null,
          name: a.originalName,
        },
      ])
    ),
  };
}

module.exports = { buildTourDocument, sceneLabel };
