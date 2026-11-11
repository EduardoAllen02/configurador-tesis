// Guías inteligentes del lienzo (matemática pura, sin DOM; probada en snapping.test.js).
//
// Los rects son { left, top, width, height } en px de DISEÑO de la mesa. El imán se mide en px de
// PANTALLA (5 px), así que quien llama pasa `threshold` = 5 / zoom.
//
// Objetivos (líneas a las que se pega): bordes y centro de la mesa, un margen seguro de 24 px y
// bordes y centros de los demás elementos. Una guía es una línea { axis, pos, from, to }:
//   axis "x" = línea vertical en x = pos (de y = from a to); axis "y" = línea horizontal.
export const SNAP_PX = 5;
export const SAFE_MARGIN = 24;
const EPS = 0.5; // dos líneas "coinciden" si distan menos de medio píxel de diseño

export function buildTargets(container, others = [], { margin = SAFE_MARGIN } = {}) {
  const { W, H } = container;
  const x = [
    { v: 0, kind: "page", from: 0, to: H },
    { v: W / 2, kind: "page", from: 0, to: H },
    { v: W, kind: "page", from: 0, to: H },
  ];
  const y = [
    { v: 0, kind: "page", from: 0, to: W },
    { v: H / 2, kind: "page", from: 0, to: W },
    { v: H, kind: "page", from: 0, to: W },
  ];
  if (W > margin * 4 && H > margin * 4) {
    x.push({ v: margin, kind: "margin", from: 0, to: H }, { v: W - margin, kind: "margin", from: 0, to: H });
    y.push({ v: margin, kind: "margin", from: 0, to: W }, { v: H - margin, kind: "margin", from: 0, to: W });
  }
  others.forEach((r) => {
    if (!(r.width > 0) || !(r.height > 0)) return;
    const span = { kind: "element" };
    [r.left, r.left + r.width / 2, r.left + r.width].forEach((v) => x.push({ v, ...span, from: r.top, to: r.top + r.height }));
    [r.top, r.top + r.height / 2, r.top + r.height].forEach((v) => y.push({ v, ...span, from: r.left, to: r.left + r.width }));
  });
  return { x, y };
}

// Menor corrección que pega alguno de los `cands` a algún objetivo dentro de `threshold`.
function nearest(cands, targets, threshold) {
  let best = null;
  cands.forEach((c) => {
    targets.forEach((t) => {
      const d = t.v - c;
      if (Math.abs(d) <= threshold && (best === null || Math.abs(d) < Math.abs(best))) best = d;
    });
  });
  return best;
}

// Líneas a dibujar: cada objetivo que coincide con alguno de los `cands` (ya corregidos). Los
// tramos de elementos van del uno al otro; los de la mesa, de lado a lado.
function guidesFor(axis, cands, targets, rectSpan) {
  const merged = new Map();
  cands.forEach((c) => {
    targets.forEach((t) => {
      if (Math.abs(t.v - c) > EPS) return;
      const key = String(Math.round(t.v * 100));
      const from = t.kind === "element" ? Math.min(t.from, rectSpan[0]) : t.from;
      const to = t.kind === "element" ? Math.max(t.to, rectSpan[1]) : t.to;
      const prev = merged.get(key);
      if (prev) {
        prev.from = Math.min(prev.from, from);
        prev.to = Math.max(prev.to, to);
        if (t.kind === "page" || t.kind === "margin") prev.kind = t.kind;
      } else merged.set(key, { axis, pos: t.v, from, to, kind: t.kind });
    });
  });
  return [...merged.values()];
}

const xs = (r) => [r.left, r.left + r.width / 2, r.left + r.width];
const ys = (r) => [r.top, r.top + r.height / 2, r.top + r.height];

// Mover: devuelve la corrección { dx, dy } que hay que sumar al desplazamiento y las guías.
export function snapMove(rect, targets, threshold) {
  const dx = nearest(xs(rect), targets.x, threshold) ?? 0;
  const dy = nearest(ys(rect), targets.y, threshold) ?? 0;
  const moved = { ...rect, left: rect.left + dx, top: rect.top + dy };
  const guides = [
    ...guidesFor("x", xs(moved), targets.x, [moved.top, moved.top + moved.height]),
    ...guidesFor("y", ys(moved), targets.y, [moved.left, moved.left + moved.width]),
  ];
  return { dx, dy, guides };
}

// Redimensionar: solo se pegan los bordes que se están arrastrando (`handle` = n, ne, e, se, s, sw, w, nw).
// Devuelve el rect corregido (nunca más chico que 1 px) y las guías.
export function snapResize(rect, handle, targets, threshold) {
  let { left, top } = rect;
  let right = rect.left + rect.width;
  let bottom = rect.top + rect.height;
  const moving = { x: [], y: [] };
  if (handle.includes("w")) {
    const d = nearest([left], targets.x, threshold);
    if (d !== null && right - (left + d) >= 1) left += d;
    moving.x.push(left);
  }
  if (handle.includes("e")) {
    const d = nearest([right], targets.x, threshold);
    if (d !== null && right + d - left >= 1) right += d;
    moving.x.push(right);
  }
  if (handle.includes("n")) {
    const d = nearest([top], targets.y, threshold);
    if (d !== null && bottom - (top + d) >= 1) top += d;
    moving.y.push(top);
  }
  if (handle.includes("s")) {
    const d = nearest([bottom], targets.y, threshold);
    if (d !== null && bottom + d - top >= 1) bottom += d;
    moving.y.push(bottom);
  }
  const next = { left, top, width: right - left, height: bottom - top };
  const guides = [
    ...guidesFor("x", moving.x, targets.x, [next.top, next.top + next.height]),
    ...guidesFor("y", moving.y, targets.y, [next.left, next.left + next.width]),
  ];
  return { rect: next, guides };
}
