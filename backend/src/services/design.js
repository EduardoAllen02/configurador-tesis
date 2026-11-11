// Documento de diseño del tour (Design v1, ver docs/CONTRATO_OLEADA1.md §2).
const { z } = require("zod");

const MAX_DESIGN_BYTES = 512 * 1024;

// Si el tour aún no tiene Tour.design, se deriva de lo que existe hoy (theme/customTexts)
// para que el motor siempre reciba un diseño completo.
function deriveDesignFromLegacy(tour) {
  const theme = tour?.theme && typeof tour.theme === "object" ? tour.theme : {};
  const customTexts = tour?.customTexts && typeof tour.customTexts === "object" ? tour.customTexts : {};

  const accent = theme.accentColor || "#4da3ff";
  const radius = theme.borderRadius ?? 8;
  const tone = theme.tooltipStyle || "dark";
  const subtitle = customTexts.welcomeMessage || "";

  const circle = (fill, glyph) => ({
    template: "circle-icon",
    props: { size: 30, fill, stroke: "rgba(255,255,255,.85)", strokeWidth: 1.5, glyph, iconColor: "#ffffff" },
  });

  return {
    version: 1,
    brand: {
      colors: [accent, "#ffffff", "#111111"],
      radius,
      fonts: { heading: "Inter", body: "Inter" },
    },
    screens: {
      intro: { enabled: false, background: null, elements: [] },
      tour: {
        elements: [
          {
            id: "topbar",
            template: "basic-topbar",
            props: { subtitle, showScenePicker: true },
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
      info: circle(accent, "i"),
      price: circle("rgba(165,104,14,.88)", "$"),
      nav: circle("rgba(47,111,237,.88)", "→"),
    },
    detailPanel: { template: "floating-card", props: { tone } },
    nadir: { mode: "none" },
    panoramas: { mode: "webp" },
    contextMenu: { enabled: false },
    languages: { list: ["es"], default: "es" },
  };
}

// Forma mínima: versión 1 y solo claves conocidas en el primer nivel. El detalle de cada
// sección lo interpreta el motor, así que aquí se deja abierto (objetos libres).
const looseObject = z.record(z.string(), z.any());
const menuUrl = z.string().max(2048).refine(value => {
  if (!value) return true;
  try { return /^https?:\/\//i.test(value.trim()) && ["https:", "http:"].includes(new URL(value.trim()).protocol); }
  catch { return false; }
}, "Usa una dirección http:// o https:// válida");
const contextMenuSchema = z.object({
  enabled: z.boolean(),
  items: z.array(z.object({
    id: z.string().min(1).max(64),
    type: z.enum(["fullscreen", "reset-view", "link"]),
    label: z.string().max(100).optional(),
    url: menuUrl.optional(),
  }).strict()).max(8).refine(items => new Set(items.map(item => item.id)).size === items.length, "Las opciones deben tener identificadores únicos").optional(),
  credit: z.object({ enabled: z.boolean(), name: z.string().max(100), url: menuUrl.optional() }).strict().optional(),
}).strict();

const designSchema = z
  .object({
    version: z.literal(1, { error: "design.version debe ser 1" }),
    brand: looseObject.optional(),
    screens: looseObject.optional(),
    hotspotPresets: looseObject.optional(),
    detailPanel: looseObject.optional(),
    nadir: looseObject.optional(),
    panoramas: looseObject.optional(),
    contextMenu: contextMenuSchema.optional(),
    languages: looseObject.optional(),
    theme: looseObject.optional(),
    panels: z.array(looseObject).max(100).optional(),
    panelDefaults: looseObject.optional(),
  })
  .strict();

// Devuelve { ok: true, design } o { ok: false, error } con mensaje en español.
function validateDesign(body) {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "El diseño debe ser un objeto JSON" };
  }
  let size;
  try {
    size = Buffer.byteLength(JSON.stringify(body), "utf8");
  } catch {
    return { ok: false, error: "El diseño no es JSON válido" };
  }
  if (size > MAX_DESIGN_BYTES) {
    return { ok: false, error: "El diseño supera el tamaño máximo de 512 KB" };
  }
  const parsed = designSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    if (issue.code === "unrecognized_keys") {
      return { ok: false, error: `Claves no permitidas en el diseño: ${issue.keys.join(", ")}` };
    }
    const where = issue.path.length ? ` (${issue.path.join(".")})` : "";
    return { ok: false, error: `Diseño inválido${where}: ${issue.message}` };
  }
  return { ok: true, design: parsed.data };
}

module.exports = { deriveDesignFromLegacy, validateDesign, MAX_DESIGN_BYTES };
