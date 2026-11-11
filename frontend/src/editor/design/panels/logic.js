// Lógica pura de los paneles (sin React ni DOM): colores, alineación, listas, ajustes de la
// pantalla de inicio y de la marca, y aplicación de paquetes. Se prueba en Node (logic.test.js).
import { frameFromRect, reanchor } from "../geometry.js";
import { isStretch } from "../../../runtime/layout/engine.js";

// ── Colores ────────────────────────────────────────────────────────────

const NAMES = {
  blanco: "#ffffff",
  negro: "#000000",
  gris: "#8a8f98",
  rojo: "#e5484d",
  naranja: "#f97316",
  amarillo: "#facc15",
  verde: "#30a46c",
  cian: "#06b6d4",
  celeste: "#38bdf8",
  azul: "#2f6fed",
  morado: "#8b3dff",
  violeta: "#8e4ec6",
  rosa: "#ec4899",
  cafe: "#8b5a2b",
  café: "#8b5a2b",
  dorado: "#c98a12",
};

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const hex2 = (n) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, "0");

// Texto de color de CSS → { r, g, b, a } (0-255, a 0-1) o null. Entiende #rgb, #rrggbb,
// #rrggbbaa, rgb()/rgba(), "transparent" y unos cuantos nombres en español.
export function parseColor(input) {
  if (typeof input !== "string") return null;
  const s = input.trim().toLowerCase();
  if (!s) return null;
  if (s === "transparent") return { r: 0, g: 0, b: 0, a: 0 };
  if (NAMES[s]) return parseColor(NAMES[s]);
  let m = /^#?([0-9a-f]{3})$/.exec(s);
  if (m) {
    const [r, g, b] = m[1].split("").map((c) => parseInt(c + c, 16));
    return { r, g, b, a: 1 };
  }
  m = /^#?([0-9a-f]{6})([0-9a-f]{2})?$/.exec(s);
  if (m) {
    const n = parseInt(m[1], 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: m[2] ? Math.round((parseInt(m[2], 16) / 255) * 100) / 100 : 1 };
  }
  m = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+%?))?\s*\)$/.exec(s);
  if (m) {
    let a = 1;
    if (m[4] != null) a = m[4].endsWith("%") ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
    return { r: clamp(+m[1], 0, 255), g: clamp(+m[2], 0, 255), b: clamp(+m[3], 0, 255), a: clamp(a, 0, 1) };
  }
  return null;
}

// { r, g, b, a } → "#rrggbb" si es opaco, "rgba(r,g,b,a)" si no.
export function formatColor({ r, g, b, a = 1 }) {
  if (a >= 1) return `#${hex2(r)}${hex2(g)}${hex2(b)}`;
  return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${Math.round(a * 100) / 100})`;
}

// "#rrggbb" para un <input type="color"> (sin alfa) o null.
export function toHex6(input) {
  const c = parseColor(input);
  return c ? `#${hex2(c.r)}${hex2(c.g)}${hex2(c.b)}` : null;
}

export function sameColor(a, b) {
  if (!a || !b) return !a && !b;
  const ca = parseColor(a);
  const cb = parseColor(b);
  if (!ca || !cb) return String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
  return ca.r === cb.r && ca.g === cb.g && ca.b === cb.b && Math.abs(ca.a - cb.a) < 0.005;
}

// Cambia el alfa conservando el tono.
export function withAlpha(color, alpha) {
  const c = parseColor(color) ?? { r: 255, g: 255, b: 255, a: 1 };
  return formatColor({ ...c, a: clamp(alpha, 0, 1) });
}

export function alphaOf(color) {
  return parseColor(color)?.a ?? 1;
}

// Rejilla de predeterminados: 5 filas × 7 columnas (grises, rojos, naranjas, verdes, azules y morados).
export const DEFAULT_SWATCHES = [
  "#ffffff", "#f1f3f5", "#ced4da", "#868e96", "#495057", "#212529", "#000000",
  "#ffe3e3", "#ffa8a8", "#ff6b6b", "#e5484d", "#c92a2a", "#8f1d1d", "#ec4899",
  "#ffe8cc", "#ffc078", "#f97316", "#facc15", "#c98a12", "#7a4b00", "#be185d",
  "#d3f9d8", "#8ce99a", "#30a46c", "#12b886", "#06b6d4", "#38bdf8", "#4c8dff",
  "#a5d8ff", "#2f6fed", "#1c3d7a", "#0e1728", "#8b3dff", "#8e4ec6", "#4a1d96",
];

// Colores que ya usa el diseño: marca, fondo de inicio y los de cada slot de color o borde de
// los elementos (ambas pantallas). Únicos, en orden de aparición.
export function usedColors(design, getTemplate, limit = 14) {
  const out = [];
  const seen = [];
  const add = (value) => {
    if (typeof value !== "string" || !parseColor(value)) return;
    if (seen.some((s) => sameColor(s, value))) return;
    seen.push(value);
    out.push(value);
  };
  (design?.brand?.colors ?? []).forEach(add);
  add(design?.screens?.intro?.background?.color);
  ["intro", "tour"].forEach((screen) => {
    (design?.screens?.[screen]?.elements ?? []).forEach((el) => {
      const template = getTemplate?.(el.template);
      if (!template) return;
      template.slots
        .filter((s) => s.type === "color" || s.type === "border")
        .forEach((slot) => add(el.props?.[slot.key] ?? template.defaults?.[slot.key]));
    });
  });
  return out.slice(0, limit);
}

// ── Slots ──────────────────────────────────────────────────────────────

export const quickSlots = (template) => (template?.slots ?? []).filter((s) => s.type !== "animation" && (template?.id === "text" ? (s.toolbar && !["text", "variant"].includes(s.key)) || s.key === "align" : s.toolbar));
export const moreSlots = (template) => (template?.slots ?? []).filter((s) => s.type !== "animation" && (template?.id === "text" ? ["text", "variant"].includes(s.key) || (!s.toolbar && s.key !== "align") : !s.toolbar));
export const hasAnimation = (template) => (template?.slots ?? []).some((s) => s.type === "animation");

// Slots que se muestran en la barra mientras se edita un texto en el lienzo: el propio texto, los
// de color, el tamaño y la alineación.
const TEXT_STYLE_KEYS = ["size", "weight", "align", "font", "italic", "underline", "uppercase", "letterSpacing", "lineHeight"];
export function editingSlots(template, key) {
  const slots = template?.slots ?? [];
  const own = slots.find((s) => s.key === key);
  const rest = slots.filter((s) => s.key !== key && s.type !== "animation" && (s.type === "color" || (["select", "range", "number", "toggle"].includes(s.type) && TEXT_STYLE_KEYS.includes(s.key))));
  return [own, ...rest].filter(Boolean);
}

export function isMultiline(slot, value) {
  if (slot.multiline != null) return !!slot.multiline;
  return !!slot.multiline || (typeof value === "string" && (value.includes("\n") || value.length > 48));
}

// Clave del grosor de un borde: `${key}Width` si la plantilla la tiene (stroke → strokeWidth).
export function borderWidthKey(template, slot) {
  const k = slot.key === "stroke" ? "strokeWidth" : `${slot.key}Width`;
  return template && k in (template.defaults ?? {}) ? k : null;
}

// ── Listas ─────────────────────────────────────────────────────────────

export function moveItem(list, index, delta) {
  const to = index + delta;
  if (index < 0 || index >= list.length || to < 0 || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(index, 1);
  next.splice(to, 0, item);
  return next;
}

export const removeAt = (list, index) => list.filter((_, i) => i !== index);
export const replaceAt = (list, index, item) => list.map((x, i) => (i === index ? item : x));

// Fila nueva: vacía según el tipo de cada sub-slot; copia la última fila si hay una.
export function blankRow(of = [], last = null) {
  if (last && typeof last === "object") return structuredClone(last);
  const row = {};
  of.forEach((slot) => {
    row[slot.key] = slot.type === "number" || slot.type === "range" ? 0 : slot.type === "toggle" ? false : "";
  });
  return row;
}

// ── Geometría de la posición ───────────────────────────────────────────

// Qué ejes se pueden mover o medir a mano según el ancla (las estiradas ocupan todo un eje).
export function freeAxes(anchor) {
  return {
    x: !/^stretch-(top|bottom|fill)$/.test(anchor),
    y: !/^stretch-(left|right|fill)$/.test(anchor),
    w: !/^stretch-(top|bottom|fill)$/.test(anchor),
    h: !/^stretch-(left|right|fill)$/.test(anchor),
  };
}

export const ALIGN_WHERE = ["top", "middle", "bottom", "left", "center", "right"];

export function unionRect(rects) {
  if (!rects.length) return null;
  const left = Math.min(...rects.map((r) => r.left));
  const top = Math.min(...rects.map((r) => r.top));
  const right = Math.max(...rects.map((r) => r.left + r.width));
  const bottom = Math.max(...rects.map((r) => r.top + r.height));
  return { left, top, width: right - left, height: bottom - top };
}

// Rect movido para quedar alineado con `bounds` (la página o la unión de la selección).
export function alignRect(rect, bounds, where) {
  switch (where) {
    case "left":
      return { ...rect, left: bounds.left };
    case "center":
      return { ...rect, left: bounds.left + (bounds.width - rect.width) / 2 };
    case "right":
      return { ...rect, left: bounds.left + bounds.width - rect.width };
    case "top":
      return { ...rect, top: bounds.top };
    case "middle":
      return { ...rect, top: bounds.top + (bounds.height - rect.height) / 2 };
    case "bottom":
      return { ...rect, top: bounds.top + bounds.height - rect.height };
    default:
      return rect;
  }
}

export function isAligned(rect, bounds, where) {
  const moved = alignRect(rect, bounds, where);
  return Math.abs(moved.left - rect.left) < 0.5 && Math.abs(moved.top - rect.top) < 0.5;
}

// ¿El eje de `where` es libre para este ancla? (una barra estirada a lo ancho no se alinea a izquierda).
export function canAlign(anchor, where) {
  const axes = freeAxes(anchor);
  return ["left", "center", "right"].includes(where) ? axes.x : axes.y;
}

// Frame que deja el elemento en `rect` (mismo ancla, tamaño automático conservado).
export function frameForRect(frame, rect, { container, s }) {
  return frameFromRect(rect, { anchor: frame.anchor, container, s, base: frame, keepAutoSize: true });
}

// Edita un campo numérico del panel Posición:
//   x, y = esquina superior izquierda en px del contenedor; w, h = tamaño en px de diseño.
// El tamaño se congela solo en el eje editado (el otro sigue automático si lo era).
export function frameWithField(frame, rect, field, value, { container, s }) {
  const next = { ...rect };
  if (field === "x") next.left = value;
  if (field === "y") next.top = value;
  if (field === "w") next.width = Math.max(1, value * s);
  if (field === "h") next.height = Math.max(1, value * s);
  const out = frameFromRect(next, { anchor: frame.anchor, container, s, base: frame, keepAutoSize: true });
  if (field === "w") out.w = Math.max(1, value);
  if (field === "h") out.h = Math.max(1, value);
  return out;
}

// "Fijar a…": cambia el ancla sin mover el elemento y la marca como fijada a mano.
export function pinFrame(frame, anchor, { container, s, measured }) {
  return { ...reanchor(frame, anchor, { container, s, measured }), pinned: true };
}

// Ancla de "Estirar a lo ancho / a lo alto" según la mitad donde está el elemento.
export function stretchAnchor(axis, rect, container) {
  if (axis === "x") return rect.top + rect.height / 2 < container.H / 2 ? "stretch-top" : "stretch-bottom";
  return rect.left + rect.width / 2 < container.W / 2 ? "stretch-left" : "stretch-right";
}

export const isStretchAnchor = isStretch;

// ── Pantalla de inicio y marca ─────────────────────────────────────────

const EMPTY_INTRO = { enabled: false, background: null, elements: [] };

export function setIntro(design, patch) {
  const intro = design.screens?.intro ?? EMPTY_INTRO;
  return { ...design, screens: { ...design.screens, intro: { ...intro, ...patch } } };
}

export function setIntroBackground(design, patch) {
  const intro = design.screens?.intro ?? EMPTY_INTRO;
  const background = { kind: "color", ...(intro.background ?? {}), ...patch };
  Object.keys(patch).forEach((k) => patch[k] === undefined && delete background[k]);
  return setIntro(design, { background });
}

export const MAX_BRAND_COLORS = 5;

export function setBrand(design, patch) {
  return { ...design, brand: { ...(design.brand ?? {}), ...patch } };
}

export function setBrandColor(design, index, color) {
  const colors = [...(design.brand?.colors ?? [])];
  if (index < 0 || index >= MAX_BRAND_COLORS) return design;
  colors[index] = color;
  return setBrand(design, { colors });
}

export function addBrandColor(design, color = "#ffffff") {
  const colors = design.brand?.colors ?? [];
  if (colors.length >= MAX_BRAND_COLORS) return design;
  return setBrand(design, { colors: [...colors, color] });
}

export function removeBrandColor(design, index) {
  const colors = design.brand?.colors ?? [];
  if (colors.length <= 1) return design;
  return setBrand(design, { colors: colors.filter((_, i) => i !== index) });
}

export function setBrandFont(design, which, id) {
  return setBrand(design, { fonts: { ...(design.brand?.fonts ?? {}), [which]: id } });
}

// Quita del diseño toda referencia a un asset que se borró (logo, imágenes, fondo de inicio…).
export function stripAsset(design, assetId) {
  const ref = `asset:${assetId}`;
  const walk = (node) => {
    if (Array.isArray(node)) return node.map(walk);
    if (node && typeof node === "object") {
      const out = {};
      Object.entries(node).forEach(([k, v]) => {
        if (v !== ref) out[k] = walk(v);
      });
      return out;
    }
    return node;
  };
  return JSON.stringify(design).includes(ref) ? walk(design) : design;
}

// ── Paquetes ───────────────────────────────────────────────────────────

// Aplica un paquete: reemplaza marca, pantallas, estilos de hotspot y panel de detalle; conserva
// nadir, panoramas, idiomas y el logo de la marca si el paquete no trae uno.
export function applyPack(design, pack) {
  const src = structuredClone(pack.design);
  return {
    ...design,
    theme: src.theme,
    brand: { ...src.brand, ...(src.brand.logo || !design.brand?.logo ? {} : { logo: design.brand.logo }) },
    screens: src.screens,
    hotspotPresets: src.hotspotPresets,
    detailPanel: src.detailPanel,
  };
}

export function hasElements(design) {
  return ["tour", "intro"].some((s) => (design?.screens?.[s]?.elements ?? []).length > 0);
}

// Errores de un paquete (lista vacía = válido). `getTemplate` y `fontIds` los inyecta quien llama.
export function validatePack(pack, { getTemplate, fontIds }) {
  const errors = [];
  const err = (msg) => errors.push(`${pack.id}: ${msg}`);
  const d = pack.design;
  if (!pack.id || !pack.name) err("falta id o nombre");
  if (!d || typeof d !== "object") return [...errors, `${pack.id}: falta design`];
  const colors = d.brand?.colors;
  if (!Array.isArray(colors) || colors.length < 1 || colors.length > MAX_BRAND_COLORS) err("brand.colors debe tener de 1 a 5 colores");
  else colors.forEach((c) => parseColor(c) || err(`color de marca inválido: ${c}`));
  ["heading", "body"].forEach((k) => fontIds.includes(d.brand?.fonts?.[k]) || err(`fuente ${k} fuera de la lista curada`));

  const ids = new Set();
  const checkProps = (template, props, where) => {
    const known = new Set([...Object.keys(template.defaults ?? {}), ...(template.slots ?? []).map((s) => s.key)]);
    Object.keys(props ?? {}).forEach((k) => known.has(k) || err(`${where}: prop desconocida "${k}"`));
  };
  const checkElement = (el, screen) => {
    const where = `${screen}/${el.id ?? "?"}`;
    if (!el.id || typeof el.id !== "string") err(`${where}: falta id`);
    else if (ids.has(el.id)) err(`${where}: id repetido`);
    else ids.add(el.id);
    const template = getTemplate(el.template);
    if (!template || template.kind !== "element") return err(`${where}: plantilla de elemento desconocida "${el.template}"`);
    if (!el.frame || typeof el.frame.anchor !== "string") err(`${where}: falta frame.anchor`);
    else ["x", "y", "w", "h"].forEach((k) => typeof el.frame[k] === "number" || err(`${where}: frame.${k} debe ser número`));
    if (!el.mobile || !["auto", "custom", "hidden"].includes(el.mobile.mode)) err(`${where}: mobile.mode inválido`);
    if (typeof el.z !== "number") err(`${where}: falta z`);
    checkProps(template, el.props, where);
    (el.children ?? []).forEach((child) => checkElement(child, `${where}/hijo`));
    (el.props?.children ?? []).forEach((c, i) => {
      const ct = getTemplate(c.template);
      if (!ct || ct.kind !== "element") err(`${where}: hijo ${i} con plantilla desconocida`);
      else checkProps(ct, c.props, `${where}/hijo${i}`);
    });
  };
  ["tour", "intro"].forEach((screen) => {
    const s = d.screens?.[screen];
    if (!s) return err(`falta screens.${screen}`);
    if (!Array.isArray(s.elements)) return err(`screens.${screen}.elements debe ser lista`);
    s.elements.forEach((el) => checkElement(el, screen));
  });
  if (typeof d.screens?.intro?.enabled !== "boolean") err("intro.enabled debe ser booleano");
  ["info", "price", "nav"].forEach((type) => {
    const style = d.hotspotPresets?.[type];
    const t = style && getTemplate(style.template);
    if (!t || t.kind !== "hotspot") err(`hotspotPresets.${type}: plantilla de hotspot desconocida`);
    else checkProps(t, style.props, `hotspotPresets.${type}`);
  });
  const panel = getTemplate(d.detailPanel?.template);
  if (!panel || panel.kind !== "panel") err("detailPanel: plantilla de panel desconocida");
  else checkProps(panel, d.detailPanel.props, "detailPanel");
  return errors;
}
