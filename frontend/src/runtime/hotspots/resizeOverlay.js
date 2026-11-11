import { hotspotResizeBox } from "./resizeHotspot.js";

// Local DOM overlay follows the panorama and camera; never emitted in view/export.
export function attachHotspotResize({ wrapper, target, start, preview, commit, cancel }) {
  const overlay = document.createElement("div"); overlay.className = "hs-resize-outline"; overlay.setAttribute("data-ui", ""); wrapper.appendChild(overlay);
  let gesture;
  const sync = () => {
    if (!target.isConnected) return;
    const base = wrapper.getBoundingClientRect(), box = target.getBoundingClientRect();
    const scale = base.width / wrapper.offsetWidth || 1;
    Object.assign(overlay.style, { left: `${(box.left - base.left) / scale}px`, top: `${(box.top - base.top) / scale}px`, width: `${box.width / scale}px`, height: `${box.height / scale}px` });
  };
  for (const handle of ["nw", "ne", "se", "sw", "e", "w"]) {
    const button = document.createElement("button"); button.type = "button";
    button.className = `hs-resize-handle hs-resize-handle--${handle}`; button.dataset.resizeHandle = handle;
    button.setAttribute("aria-label", handle.length === 2 ? `Escalar hotspot ${handle}` : `Cambiar ancho del hotspot ${handle}`);
    button.title = handle.length === 2 ? "Arrastra para escalar todo" : "Arrastra para cambiar el ancho";
    button.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      event.preventDefault(); event.stopPropagation();
      const box = target.getBoundingClientRect();
      gesture = { handle, box, x: event.clientX, y: event.clientY, moved: false };
      start?.(); overlay.setPointerCapture(event.pointerId);
    });
    button.addEventListener("click", (event) => { event.preventDefault(); event.stopPropagation(); });
    overlay.appendChild(button);
  }
  overlay.addEventListener("pointermove", (event) => {
    if (!gesture) return;
    event.preventDefault(); event.stopPropagation();
    gesture.moved = true;
    preview(hotspotResizeBox(gesture.box, gesture.handle, event.clientX - gesture.x, event.clientY - gesture.y)); sync();
  });
  const finish = (event) => {
    if (!gesture) return; event.stopPropagation();
    const moved = gesture.moved; gesture = null;
    if (event.type === "pointerup" && moved) commit(); else cancel(); sync();
  };
  for (const name of ["pointerup", "pointercancel", "lostpointercapture"]) overlay.addEventListener(name, finish);
  const escape = (event) => { if (event.key === "Escape" && gesture) { event.preventDefault(); event.stopImmediatePropagation(); gesture = null; cancel(); sync(); } };
  const cancelActive = (event) => { if (gesture) { gesture = null; cancel(); sync(); event.preventDefault(); } };
  window.addEventListener("tour-studio:cancel-active-gesture", cancelActive);
  window.addEventListener("keydown", escape, true);
  return { sync, dispose() { window.removeEventListener("keydown", escape, true); window.removeEventListener("tour-studio:cancel-active-gesture", cancelActive); overlay.remove(); } };
}
