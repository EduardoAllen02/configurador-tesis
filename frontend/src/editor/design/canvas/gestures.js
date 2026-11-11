// Matemática de los gestos del lienzo (mover y redimensionar), pura y probada en gestures.test.js.
// Los rects son { left, top, width, height } en px de diseño; dx/dy ya vienen divididos por el zoom.
import { proportionalScale } from "../../../runtime/model/elementResize.js";

export const HANDLES = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];
export const MIN_SIZE = 12;
export const HANDLE_CURSORS = { nw: "nwse-resize", se: "nwse-resize", ne: "nesw-resize", sw: "nesw-resize", n: "ns-resize", s: "ns-resize", e: "ew-resize", w: "ew-resize" };

// Ejes libres según el ancla: las barras estiradas solo se mueven (y estiran) en su eje libre.
//   stretch-top/bottom: libre el vertical · stretch-left/right: libre el horizontal · fill: ninguno
export function axesForAnchor(anchor) {
  switch (anchor) {
    case "stretch-top":
    case "stretch-bottom":
      return { moveX: false, moveY: true, resizeX: false, resizeY: true };
    case "stretch-left":
    case "stretch-right":
      return { moveX: true, moveY: false, resizeX: true, resizeY: false };
    case "stretch-fill":
      return { moveX: false, moveY: false, resizeX: false, resizeY: false };
    default:
      return { moveX: true, moveY: true, resizeX: true, resizeY: true };
  }
}

// Manijas que se muestran: las plantillas "ajustadas al contenido" (texto, tarjetas) solo
// cambian el ancho; las barras estiradas, solo su eje libre; un elemento bloqueado, ninguna.
export function handlesFor({ anchor, fit, locked }) {
  if (locked) return [];
  const axes = axesForAnchor(anchor);
  let list = HANDLES;
  if (!axes.resizeX) list = list.filter((h) => !h.includes("e") && !h.includes("w"));
  if (!axes.resizeY) list = list.filter((h) => !h.includes("n") && !h.includes("s"));
  if (fit === "content") list = list.filter((h) => h.length === 2 || h === "e" || h === "w");
  return list;
}

export function unionRect(rects) {
  if (!rects.length) return null;
  const left = Math.min(...rects.map((r) => r.left));
  const top = Math.min(...rects.map((r) => r.top));
  const right = Math.max(...rects.map((r) => r.left + r.width));
  const bottom = Math.max(...rects.map((r) => r.top + r.height));
  return { left, top, width: right - left, height: bottom - top };
}

export const rectsIntersect = (a, b) =>
  a.left < b.left + b.width && a.left + a.width > b.left && a.top < b.top + b.height && a.top + a.height > b.top;

export const pointInRect = (x, y, r) => x >= r.left && x <= r.left + r.width && y >= r.top && y <= r.top + r.height;

// Redimensionar el rect arrastrando la manija `handle`.
//   shift → conserva la proporción (solo manijas de esquina)
//   alt   → crece desde el centro
//   min   → tamaño mínimo
export function resizeRect(rect, handle, dx, dy, { shift = false, alt = false, min = MIN_SIZE } = {}) {
  const hx = handle.includes("w") ? -1 : handle.includes("e") ? 1 : 0;
  const hy = handle.includes("n") ? -1 : handle.includes("s") ? 1 : 0;
  const k = alt ? 2 : 1;
  let width = hx ? rect.width + hx * dx * k : rect.width;
  let height = hy ? rect.height + hy * dy * k : rect.height;

  const keepRatio = shift && hx && hy && rect.width > 0 && rect.height > 0;
  if (keepRatio) {
    const ratio = rect.width / rect.height;
    const s = Math.max(1e-6, proportionalScale(rect.width, rect.height, hx * dx * k, hy * dy * k));
    width = rect.width * s;
    height = width / ratio;
    // Mínimo con proporción: el lado más chico manda para no deformar.
    const f = Math.max(min / width, min / height, 1);
    width *= f;
    height *= f;
  } else {
    if (hx) width = Math.max(min, width);
    if (hy) height = Math.max(min, height);
  }

  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const left = alt && hx ? cx - width / 2 : hx < 0 ? rect.left + rect.width - width : rect.left;
  const top = alt && hy ? cy - height / 2 : hy < 0 ? rect.top + rect.height - height : rect.top;
  return { left, top, width, height };
}
