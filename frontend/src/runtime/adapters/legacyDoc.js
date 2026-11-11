// Arma un TourDocument en el cliente a partir del estado vivo del editor (escenas + hotspots
// ya cargados), siguiendo el contrato de la Oleada 1. El visor NO lo usa: pide
// `GET /api/tours/:id/document` al backend. El editor sí, para no volver a pedir el documento
// en cada cambio. deriveDesign replica backend/src/services/design.js hasta que el editor de
// diseño (Oleada 3) trabaje directo sobre Tour.design.
//
// Es puro (sin red ni DOM): `resolveUrl(relPath)` lo inyecta quien llama (en la app,
// api.uploadUrl), así el motor nunca arma URLs por su cuenta.
import { sceneLabel } from "../../editor/utils/sceneLabel.js";

const DEFAULT_ACCENT = "#4da3ff";
const DEFAULT_RADIUS = 8;

// Design v1 por defecto, derivado de lo que el tour ya tiene hoy (theme + customTexts).
export function deriveDesign(theme, customTexts) {
  const accent = theme?.accentColor || DEFAULT_ACCENT;
  const radius = theme?.borderRadius ?? DEFAULT_RADIUS;
  const glyphCircle = (fill, glyph) => ({
    template: "circle-icon",
    props: { size: 30, fill, stroke: "rgba(255,255,255,.85)", strokeWidth: 1.5, glyph, iconColor: "#ffffff" },
  });
  return {
    version: 1,
    brand: { colors: [accent, "#ffffff", "#111111"], radius, fonts: { heading: "Inter", body: "Inter" } },
    screens: {
      intro: { enabled: false, background: null, elements: [] },
      tour: {
        elements: [
          {
            id: "topbar",
            template: "basic-topbar",
            props: { subtitle: customTexts?.welcomeMessage || "", showScenePicker: true },
            frame: { anchor: "stretch-top", x: 0, y: 0, w: 0, h: 56 },
            mobile: { mode: "auto" },
            locked: false,
            hidden: false,
            z: 10,
          },
          {
            id: "scrubber",
            template: "frame-scrubber",
            props: {},
            frame: { anchor: "stretch-bottom", x: 16, y: 16, w: 0, h: 32 },
            mobile: { mode: "auto" },
            locked: false,
            hidden: false,
            z: 10,
          },
        ],
      },
    },
    hotspotPresets: {
      info: glyphCircle(accent, "i"),
      price: glyphCircle("rgba(165,104,14,.88)", "$"),
      nav: glyphCircle("rgba(47,111,237,.88)", "→"),
    },
    detailPanel: { template: "floating-card", props: { tone: theme?.tooltipStyle === "light" ? "light" : "dark" } },
    nadir: { mode: "none" },
    panoramas: { mode: "webp" },
    contextMenu: { enabled: false },
    languages: { list: ["es"], default: "es" },
  };
}

// tour: fila de /api/tours/:id (con theme/customTexts). scenes: filas de escenas. hotspots:
// lista plana de hotspots (cada uno con su sceneId). `tour.design`, si ya existe, manda.
export function buildDocFromLegacy({ tour, scenes = [], hotspots = [], resolveUrl }) {
  const sorted = scenes
    .map((scene, i) => ({ scene, i }))
    .sort((a, b) => (a.scene.orderIndex ?? 0) - (b.scene.orderIndex ?? 0) || a.i - b.i)
    .map(({ scene }) => scene);

  return {
    schema: 1,
    tour: { id: tour.id, title: tour.title, description: tour.description ?? null },
    design: tour.design ?? deriveDesign(tour.theme, tour.customTexts),
    scenes: sorted.map((scene, index) => ({
      id: scene.id,
      name: scene.name ?? null,
      label: sceneLabel(scene, index),
      origen: scene.origen,
      batchId: scene.batchId ?? null,
      videoUploadId: scene.videoUploadId ?? null,
      orderIndex: scene.orderIndex ?? 0,
      initialYaw: scene.initialYaw ?? 0,
      initialPitch: scene.initialPitch ?? 0,
      image: { webp: resolveUrl(scene.webpPath), tiles: null },
      groupId: null,
      plan: null,
    })),
    hotspots: hotspots.map((hotspot) => ({
      id: hotspot.id,
      sceneId: hotspot.sceneId,
      type: hotspot.type,
      lon: hotspot.lon,
      lat: hotspot.lat,
      title: hotspot.title,
      description: hotspot.description ?? null,
      price: hotspot.price ?? null,
      targetSceneId: hotspot.targetSceneId ?? null,
      image: hotspot.imagePath ? resolveUrl(hotspot.imagePath) : null,
      style: hotspot.style ?? null,
      locked: hotspot.locked ?? false,
      segments: hotspot.segments ?? null,
      content: hotspot.content ?? null,
    })),
    groups: [],
    assets: {},
  };
}
