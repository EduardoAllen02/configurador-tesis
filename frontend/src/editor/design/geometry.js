// Geometría del editor de diseño: la inversa del motor de layout (runtime/layout/engine.js).
// El motor convierte un frame (ancla + offsets en px de diseño) en un rect en pantalla; el
// lienzo del editor necesita lo contrario: el usuario arrastra un rect y hay que guardar el
// frame que lo reproduce. Todo es matemática pura (sin DOM) y está probado en geometry.test.js.
//
//   rect      = { left, top, width, height } visual, en px del contenedor del motor
//   container = { W, H } tamaño del contenedor del motor
//   s         = escala --s vigente (rect visual = caja de diseño × s)
import { DESIGN_H, DESIGN_W, MOBILE_H, MOBILE_W, POINT_ANCHORS, isStretch, resolveFrame } from "../../runtime/layout/engine.js";

// Mesas de trabajo por dispositivo (el motor decide móvil por ancho < 720 px).
export const DEVICES = {
  desktop: { id: "desktop", label: "Escritorio", W: DESIGN_W, H: DESIGN_H },
  tablet: { id: "tablet", label: "Tablet", W: 1024, H: 768 },
  mobile: { id: "mobile", label: "Móvil", W: MOBILE_W, H: MOBILE_H },
};

const r2 = (n) => Math.round(n * 100) / 100;

// Frame que, resuelto en `container` con escala `s`, reproduce `rect`.
// `base` = frame anterior: si su w/h era automático (≤ 0) y `keepAutoSize`, se conserva así
// (mover un texto no debe congelar su tamaño).
function frameFromRectRaw(rect, { anchor, container, s = 1, base = {}, keepAutoSize = false }) {
  const { W, H } = container;
  const autoW = keepAutoSize && !(base.w > 0);
  const autoH = keepAutoSize && !(base.h > 0);
  const fw = rect.width / s;
  const fh = rect.height / s;
  const right = W - (rect.left + rect.width);
  const bottom = H - (rect.top + rect.height);
  const w = autoW ? base.w ?? 0 : r2(fw);
  const h = autoH ? base.h ?? 0 : r2(fh);

  switch (anchor) {
    case "stretch-top":
      return { anchor, x: r2(rect.left / s), y: r2(rect.top / s), w: 0, h };
    case "stretch-bottom":
      return { anchor, x: r2(rect.left / s), y: r2(bottom / s), w: 0, h };
    case "stretch-left":
      return { anchor, x: r2(rect.left / s), y: r2(rect.top / s), w, h: 0 };
    case "stretch-right":
      return { anchor, x: r2(right / s), y: r2(rect.top / s), w, h: 0 };
    case "stretch-fill":
      return { anchor, x: r2(rect.left / s), y: r2(rect.top / s), w: 0, h: 0 };
    default: {
      const name = POINT_ANCHORS[anchor] ? anchor : "top-left";
      const [ax, ay] = POINT_ANCHORS[name];
      const px = rect.left + ax * rect.width; // pivote = ancla
      const py = rect.top + ay * rect.height;
      return { anchor: name, x: r2((px - ax * W) / s), y: r2((py - ay * H) / s), w, h };
    }
  }
}

// Frame que, resuelto en `container` con escala `s`, reproduce `rect`. Conserva `pinned` (ancla
// fijada a mano con "Fijar a…") del frame anterior.
export function frameFromRect(rect, opts) {
  const frame = frameFromRectRaw(rect, opts);
  return opts.base?.pinned ? { ...frame, pinned: true } : frame;
}

// Anclaje automático: la zona de 3×3 donde cae el centro del rect. Así, quien nunca toca
// "Fijar a…" obtiene lo que espera: lo que está abajo a la derecha se queda abajo a la derecha.
export function autoAnchor(rect, container) {
  const cx = (rect.left + rect.width / 2) / container.W;
  const cy = (rect.top + rect.height / 2) / container.H;
  const col = cx < 1 / 3 ? "left" : cx > 2 / 3 ? "right" : "center";
  const row = cy < 1 / 3 ? "top" : cy > 2 / 3 ? "bottom" : "middle";
  if (row === "middle") return col === "center" ? "center" : col;
  return col === "center" ? row : `${row}-${col}`;
}

// Ancla que corresponde tras soltar un elemento: las barras estiradas siguen estiradas; el resto
// se re-ancla solo, salvo que el usuario haya fijado el ancla a mano (`pinned`).
export function anchorAfterMove(frame, rect, container, { pinned = false } = {}) {
  if (isStretch(frame?.anchor) || pinned) return frame?.anchor || "top-left";
  return autoAnchor(rect, container);
}

// Cambia el ancla sin mover el elemento (como Unity sin Alt). `measured` = tamaño natural para
// frames con w/h automáticos (lo da el rect actual del elemento / s).
export function reanchor(frame, anchor, { container, s = 1, measured = {} }) {
  const { rect } = resolveFrame(frame, container, s, measured);
  return frameFromRect(rect, { anchor, container, s, base: frame, keepAutoSize: true });
}

// Rect visual de un frame (atajo para el editor; misma regla que el motor).
export function rectOfFrame(frame, container, s = 1, measured = {}) {
  return resolveFrame(frame, container, s, measured).rect;
}

// Mueve un rect dentro del contenedor (sin salirse más allá de `margin` px).
export function clampRect(rect, container, margin = 0) {
  const left = Math.min(Math.max(rect.left, -rect.width + margin), container.W - margin);
  const top = Math.min(Math.max(rect.top, -rect.height + margin), container.H - margin);
  return { ...rect, left, top };
}
