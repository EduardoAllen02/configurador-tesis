// Del rect que el usuario arrastra al frame que se guarda (anclas, tamaño automático, móvil).
// Capa fina sobre geometry.js (arquitecto); sin DOM, probada en frames.test.js.
import { MOBILE_H, MOBILE_W, computeScale, isMobileWidth, isStretch } from "../../../runtime/layout/engine.js";
import { findElement, setFrame } from "../elementOps.js";
import { DEVICES, anchorAfterMove, autoAnchor, frameFromRect } from "../geometry.js";

export const containerOf = (device) => {
  const d = DEVICES[device] ?? DEVICES.desktop;
  return { W: d.W, H: d.H };
};

// Misma escala --s que calcula el motor para esa mesa.
export function layoutScaleOf(device) {
  const { W, H } = containerOf(device);
  return isMobileWidth(W) ? computeScale(W, H, { w: MOBILE_W, h: MOBILE_H }) : computeScale(W, H);
}

// ¿El elemento tiene su propio ajuste móvil (a mano) aplicado?
export const hasMobileFrame = (el) => el?.mobile?.mode === "custom" && !!el.mobile.frame;

// Un elemento listo para arrastrar: su frame de partida (según el dispositivo), el ancla con la
// que se arrastra y su rect actual (de getElementBoxes).
//   · Escritorio y tablet usan `frame`; móvil usa `mobile.frame`, y si el elemento está en
//     automático parte de su caja actual: se ancla a su zona (las barras estiradas siguen estiradas).
export function dragItem(el, rect, device, container) {
  if (device === "mobile-group") return { id: el.id, base: el.mobile?.groupFrame || el.frame || {}, anchor: "top-left", rect, template: el.template, locked: !!el.locked };
  const mobile = device === "mobile";
  const own = mobile && hasMobileFrame(el);
  const prior = own ? el.mobile.frame : el.frame ?? {};
  // El apilado automático fija el ancho de la pieza (el de su caja): al pasarla "a mano" se
  // conserva, o el elemento daría un salto al encogerse a su tamaño natural.
  const base =
    mobile && !own && !isStretch(prior.anchor) ? { ...prior, w: Math.round((rect.width / layoutScaleOf(device)) * 100) / 100 } : prior;
  const anchor = mobile && !own && !isStretch(base.anchor) ? autoAnchor(rect, container) : base.anchor || "top-left";
  return { id: el.id, base, anchor, rect, template: el.template, locked: !!el.locked };
}

const frameOpts = (item, { container, s }, extra) => ({ anchor: item.anchor, container, s, base: item.base, ...extra });

// Frame que reproduce `rect` al MOVER: conserva el tamaño automático.
export function moveFrame(item, rect, ctx) {
  const frame = frameFromRect(rect, frameOpts(item, ctx, { keepAutoSize: true }));
  // Moving owns position only. A browser's rounded/scaled measurement must not
  // silently author a new width or height after a resize (or on every drag).
  return { ...frame, w: item.base.w ?? 0, h: item.base.h ?? 0 };
}

// Frame al REDIMENSIONAR con la manija `handle`: fija el tamaño que se tocó y deja automático
// el eje que no (una manija lateral no congela el alto de un botón o un texto).
export function resizeFrame(item, rect, handle, ctx) {
  const frame = frameFromRect(rect, frameOpts(item, ctx, {}));
  const horizontalOnly = !handle.includes("n") && !handle.includes("s");
  const verticalOnly = !handle.includes("e") && !handle.includes("w");
  if (horizontalOnly) frame.h = item.base.h ?? 0;
  if (verticalOnly) frame.w = item.base.w ?? 0;
  return frame;
}

// Al soltar: re-anclaje automático (salvo ancla fijada a mano o barra estirada). Devuelve el ancla.
export function finalAnchor(item, frame, rect, container) {
  return anchorAfterMove(frame, rect, container, { pinned: !!item.base?.pinned });
}

// Pasa a "a mano" (móvil) los elementos `ids` que aún están en automático, partiendo de su caja
// actual (`boxes` = getElementBoxes). Los que ya tienen ajuste móvil, bloqueados o sin caja
// (ocultos) no se tocan. Pura: devuelve el diseño nuevo (o el mismo si no había nada que pasar).
export function convertToMobileCustom(design, screen, ids, boxes) {
  const container = containerOf("mobile");
  const s = layoutScaleOf("mobile");
  let next = design;
  ids.forEach((id) => {
    const el = findElement(next, screen, id);
    const box = boxes.find((b) => b.id === id);
    if (!el || !box || el.locked || hasMobileFrame(el)) return;
    const item = dragItem(el, box, "mobile", container);
    next = setFrame(next, screen, id, moveFrame(item, box, { container, s }), "mobile");
  });
  return next;
}
