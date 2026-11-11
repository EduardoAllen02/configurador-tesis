// Soltar un elemento de la biblioteca (C2) en el lienzo: lo inserta con `insertElement` y, como
// `insertElement` centra una caja nominal (aún no mide el elemento), lo recentra con la caja real
// que el motor acaba de dar, para que quede justo bajo el cursor. Todo es UN paso de deshacer.
import { insertElement } from "../actions.js";
import { findElement, setFrame } from "../elementOps.js";
import { containerOf, dragItem, finalAnchor, hasMobileFrame, layoutScaleOf, moveFrame } from "./frames.js";

// `at` = { x, y } centro deseado en px de diseño; `getBoxes()` = cajas actuales del motor.
export function dropElement(store, item, at, getBoxes) {
  store.beginGesture();
  const before = store.getState();
  const parentId = before.activeGroupId || before.insertionGroupId;
  const parent = parentId ? getBoxes().find((b) => b.id === parentId) : null;
  const group = parent ? findElement(before.design, before.screen, parent.id) : null;
  const scale = parent ? parent.scale || parent.width / (group.props?.contentWidth || group.frame.w) : 1;
  const localAt = parent ? { x: (at.x - parent.left) / scale, y: (at.y - parent.top) / scale } : at;
  const id = insertElement(store, item, localAt);
  const st = store.getState();
  const el = id ? findElement(st.design, st.screen, id) : null;
  const box = id ? getBoxes().find((b) => b.id === id) : null;
  if (el && box) {
    const container = parent ? { W: parent.width, H: parent.height } : containerOf(st.device);
    const ctx = { container, s: parent ? scale : layoutScaleOf(st.device) };
    const key = st.device === "mobile" && !parent ? "mobile" : "desktop";
    const dx = at.x - (box.left + box.width / 2);
    const dy = at.y - (box.top + box.height / 2);
    if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
      const rect = { ...box, left: box.left + dx - (parent?.left ?? 0), top: box.top + dy - (parent?.top ?? 0) };
      const localBox = parent ? { ...box, left: box.left - parent.left, top: box.top - parent.top } : box;
      const it = dragItem(el, localBox, parent ? "desktop" : st.device, container);
      const frame = key === "mobile" && hasMobileFrame(el) ? el.mobile.frame : el.frame;
      const anchor = parent ? "top-left" : finalAnchor(it, frame, rect, container);
      store.preview((d) => setFrame(d, st.screen, id, moveFrame({ ...it, anchor }, rect, ctx), key));
    }
  }
  store.endGesture("Agregar elemento");
  return id;
}
