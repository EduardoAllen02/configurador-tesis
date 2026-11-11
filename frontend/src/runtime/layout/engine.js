// Motor de layout tipo Unity (RectTransform): matemática pura, sin DOM, para poder probarla en
// Node. Plan §3.3 y contrato Oleada 2 §5.
//
// Lienzo de diseño: 1440×900. El motor calcula la escala --s a partir del tamaño del CONTENEDOR
// (no de la ventana) y cada elemento se escala desde su pivote; en 1440×900 --s = 1.
//
// Frame { anchor, x, y, w, h } (px del lienzo de diseño):
//   Ancla puntual (9): `x`,`y` = distancia del PIVOTE del elemento al punto de anclaje, con signo
//     de Unity: positivo hacia la derecha y hacia abajo. El pivote es automático e igual al ancla.
//       pos = ancla·contenedor + offset·s − pivote·tamaño·s
//   Ancla estirada: `x` es el margen izquierdo y derecho (o `y` arriba y abajo según el eje) y el
//     otro valor su distancia al borde. stretch-top/bottom conservan el comportamiento de la
//     Oleada 1 (margen x a cada lado, y desde el borde, alto h).
//
// Todas las funciones devuelven un `rect` VISUAL (tras escalar) y la `box` sin escalar con su
// `origin` (pivote en fracciones), que es lo que el DOM necesita:
//   left/top/width/height = box;  transform-origin = origin;  transform: scale(scale).

export const DESIGN_W = 1440;
export const DESIGN_H = 900;
export const MOBILE_W = 390;
export const MOBILE_H = 844;
export const MOBILE_BREAKPOINT = 720;
export const SCALE_MIN = 0.8;
export const SCALE_MAX = 1.25;
export const MOBILE_MARGIN = 16;
export const MOBILE_GAP = 12;

// Ancla → [fracción X, fracción Y] del punto de anclaje (= pivote).
export const POINT_ANCHORS = {
  "top-left": [0, 0],
  top: [0.5, 0],
  "top-right": [1, 0],
  left: [0, 0.5],
  center: [0.5, 0.5],
  right: [1, 0.5],
  "bottom-left": [0, 1],
  bottom: [0.5, 1],
  "bottom-right": [1, 1],
};
export const STRETCH_ANCHORS = ["stretch-top", "stretch-bottom", "stretch-left", "stretch-right", "stretch-fill"];

export const isStretch = (anchor) => STRETCH_ANCHORS.includes(anchor);

const num = (n) => (Number.isFinite(n) ? n : 0);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// --s = clamp(0.8, sqrt((W/refW)·(H/refH)), 1.25). Con tamaño inválido (0, NaN) devuelve 1.
export function computeScale(W, H, ref = { w: DESIGN_W, h: DESIGN_H }) {
  if (!(W > 0) || !(H > 0)) return 1;
  return clamp(Math.sqrt((W / ref.w) * (H / ref.h)), SCALE_MIN, SCALE_MAX);
}

export const isMobileWidth = (W) => W > 0 && W < MOBILE_BREAKPOINT;

// Rect visual → caja sin escalar + origen, dado el origen de la escala en fracciones (ox, oy).
// Escalar `s` desde el punto O = left + ox·bw deja el rect visual: left_v = left + ox·bw·(1−s).
function boxFromRect(rect, s, ox, oy) {
  const bw = rect.width / s;
  const bh = rect.height / s;
  return {
    box: {
      left: rect.left - ox * bw * (1 - s),
      top: rect.top - oy * bh * (1 - s),
      width: bw,
      height: bh,
    },
    origin: { x: ox, y: oy },
    scale: s,
    rect,
  };
}

// Resuelve un frame en un contenedor {W,H} con escala s. `measured` = { w, h } con el tamaño
// natural (sin escalar) de elementos con w/h ≤ 0 ("auto"); si no se da, valen 0.
export function resolveFrame(frame, container, s = 1, measured = {}) {
  const { anchor = "top-left", x = 0, y = 0, w = 0, h = 0 } = frame || {};
  const { W, H } = container;
  const ox = num(x) * s;
  const oy = num(y) * s;
  const fw = (w > 0 ? w : num(measured.w)) * s;
  const fh = (h > 0 ? h : num(measured.h)) * s;

  switch (anchor) {
    case "stretch-top":
      return boxFromRect({ left: ox, top: oy, width: Math.max(0, W - 2 * ox), height: fh }, s, 0, 0);
    case "stretch-bottom":
      return boxFromRect({ left: ox, top: H - oy - fh, width: Math.max(0, W - 2 * ox), height: fh }, s, 0, 1);
    case "stretch-left":
      return boxFromRect({ left: ox, top: oy, width: fw, height: Math.max(0, H - 2 * oy) }, s, 0, 0);
    case "stretch-right":
      return boxFromRect({ left: W - ox - fw, top: oy, width: fw, height: Math.max(0, H - 2 * oy) }, s, 1, 0);
    case "stretch-fill":
      return boxFromRect(
        { left: ox, top: oy, width: Math.max(0, W - 2 * ox), height: Math.max(0, H - 2 * oy) },
        s,
        0,
        0
      );
    default: {
      const [ax, ay] = POINT_ANCHORS[anchor] || POINT_ANCHORS["top-left"];
      const px = ax * W + ox; // posición del pivote en el contenedor
      const py = ay * H + oy;
      return boxFromRect({ left: px - ax * fw, top: py - ay * fh, width: fw, height: fh }, s, ax, ay);
    }
  }
}

// Zona (fila) de un ancla para apilar en móvil.
export function rowOfAnchor(anchor) {
  if (anchor === "stretch-top" || anchor === "top" || anchor === "top-left" || anchor === "top-right") return "top";
  if (anchor === "stretch-bottom" || anchor === "bottom" || anchor === "bottom-left" || anchor === "bottom-right")
    return "bottom";
  return "center";
}

// Columna de un ancla para alinear dentro de la pila: izquierda / centro / derecha.
export function columnOfAnchor(anchor) {
  if (anchor === "top-left" || anchor === "left" || anchor === "bottom-left" || anchor === "stretch-left") return "left";
  if (anchor === "top-right" || anchor === "right" || anchor === "bottom-right" || anchor === "stretch-right")
    return "right";
  return "center";
}

// Diseño móvil (contenedor < 720 px). Cada item:
//   { id, frame, mode: "auto"|"custom", mobileFrame?, behavior: "stack"|"keep"|"dock-bottom",
//     h?: alto natural en px de diseño (medido por quien llama) para los apilados }
// `hide`/`hidden` los filtra quien llama (no ocupan lugar). Devuelve:
//   { scale, items: Map<id, resultado de resolveFrame>, topInset }
// Reglas del modo auto:
//   · barras estiradas arriba/abajo (y behavior "keep"): se quedan donde las pone su frame;
//   · el resto se apila por zona (arriba / centro / abajo) con ancho min(w, 100% − 32px),
//     márgenes de 16 px y 12 px entre piezas, en el orden vertical del diseño de escritorio;
//   · las de "dock-bottom" van siempre a la zona de abajo, centradas.
// El modo custom usa mobileFrame sobre el lienzo de 390×844 (la escala sale de ese lienzo).
export function layoutMobile(items, container) {
  const { W, H } = container;
  const s = computeScale(W, H, { w: MOBILE_W, h: MOBILE_H });
  const result = new Map();

  const docked = [];
  const stack = { top: [], center: [], bottom: [] };
  const desktopRect = (frame) => resolveFrame(frame, { W: DESIGN_W, H: DESIGN_H }, 1).rect;

  items.forEach((item) => {
    const frame = item.frame || {};
    if (item.mode === "custom" && item.mobileFrame) {
      result.set(item.id, resolveFrame(item.mobileFrame, container, s, { w: item.w, h: item.h }));
      return;
    }
    if (isStretch(frame.anchor) || item.behavior === "keep") {
      docked.push(item);
      return;
    }
    const row = item.behavior === "dock-bottom" ? "bottom" : rowOfAnchor(frame.anchor);
    const dr = desktopRect(frame);
    stack[row].push({ item, sortTop: dr.top, sortLeft: dr.left });
  });

  // Barras: mantienen su frame, a escala móvil.
  let topDockEnd = 0;
  let bottomDockStart = H;
  docked.forEach((item) => {
    const res = resolveFrame(item.frame, container, s, { w: item.w, h: item.h });
    result.set(item.id, res);
    if (item.frame?.anchor === "stretch-top") topDockEnd = Math.max(topDockEnd, res.rect.top + res.rect.height);
    if (item.frame?.anchor === "stretch-bottom") bottomDockStart = Math.min(bottomDockStart, res.rect.top);
  });

  const byDesign = (a, b) => a.sortTop - b.sortTop || a.sortLeft - b.sortLeft;
  Object.values(stack).forEach((list) => list.sort(byDesign));

  const avail = Math.max(0, W - 2 * MOBILE_MARGIN);
  function place(entry, top) {
    const { item } = entry;
    const frame = item.frame || {};
    const wantW = frame.w > 0 ? frame.w * s : avail;
    const vw = Math.min(wantW, avail);
    const itemScale = item.scaleGroup && frame.w > 0 ? Math.min(s, avail / frame.w) : s;
    const vh = (item.h > 0 ? item.h : frame.h > 0 ? frame.h : 0) * itemScale;
    const col = item.behavior === "dock-bottom" ? "center" : columnOfAnchor(frame.anchor);
    const left = col === "left" ? MOBILE_MARGIN : col === "right" ? W - MOBILE_MARGIN - vw : (W - vw) / 2;
    result.set(item.id, boxFromRect({ left, top, width: vw, height: vh }, itemScale, 0, 0));
    return vh;
  }

  // Arriba: de arriba hacia abajo, bajo las barras fijas.
  let topCursor = topDockEnd > 0 ? topDockEnd + MOBILE_GAP : MOBILE_MARGIN;
  let topEnd = topDockEnd;
  stack.top.forEach((entry) => {
    const vh = place(entry, topCursor);
    topEnd = topCursor + vh;
    topCursor = topEnd + MOBILE_GAP;
  });

  // Abajo: de abajo hacia arriba, sobre las barras fijas; el primero del diseño queda más arriba.
  let bottomCursor = bottomDockStart < H ? bottomDockStart - MOBILE_GAP : H - MOBILE_MARGIN;
  let bottomStart = bottomDockStart;
  [...stack.bottom].reverse().forEach((entry) => {
    const item = entry.item;
    const vh = (item.h > 0 ? item.h : item.frame?.h > 0 ? item.frame.h : 0) * (item.scaleGroup && item.frame?.w > 0 ? Math.min(s, avail / item.frame.w) : s);
    const top = bottomCursor - vh;
    place(entry, top);
    bottomStart = top;
    bottomCursor = top - MOBILE_GAP;
  });

  // Centro: grupo centrado verticalmente en el espacio libre entre las dos pilas.
  if (stack.center.length) {
    const heights = stack.center.map(({ item }) => (item.h > 0 ? item.h : item.frame?.h > 0 ? item.frame.h : 0) * (item.scaleGroup && item.frame?.w > 0 ? Math.min(s, avail / item.frame.w) : s));
    const total = heights.reduce((a, b) => a + b, 0) + MOBILE_GAP * (heights.length - 1);
    const freeTop = stack.top.length ? topEnd + MOBILE_GAP : topDockEnd > 0 ? topDockEnd + MOBILE_GAP : MOBILE_MARGIN;
    const freeBottom = stack.bottom.length || bottomDockStart < H ? bottomStart - MOBILE_GAP : H - MOBILE_MARGIN;
    let cursor = clamp(H / 2 - total / 2, freeTop, Math.max(freeTop, freeBottom - total));
    stack.center.forEach((entry, i) => {
      place(entry, cursor);
      cursor += heights[i] + MOBILE_GAP;
    });
  }

  let topInset = 0;
  items.forEach((item) => {
    if (item.frame?.anchor !== "stretch-top") return;
    const res = result.get(item.id);
    if (res) topInset = Math.max(topInset, res.rect.top + res.rect.height);
  });
  return { scale: s, items: result, topInset };
}

// Diseño de escritorio (contenedor ≥ 720 px): cada frame se resuelve con la escala del lienzo.
// items: { id, frame, w?, h? (naturales para "auto") }
export function layoutDesktop(items, container) {
  const s = computeScale(container.W, container.H);
  const result = new Map();
  let topInset = 0;
  items.forEach((item) => {
    const res = resolveFrame(item.frame, container, s, { w: item.w, h: item.h });
    result.set(item.id, res);
    if (item.frame?.anchor === "stretch-top") topInset = Math.max(topInset, res.rect.top + res.rect.height);
  });
  return { scale: s, items: result, topInset };
}

export function layoutAll(items, container) {
  return isMobileWidth(container.W) ? layoutMobile(items, container) : layoutDesktop(items, container);
}
