// Variante de viewer/core/hotspotMarkerEl.js para el modo edición: el mismo pin visual,
// pero arrastrable. La diferencia clave frente al marcador de solo-lectura es que hay que
// llamar stopPropagation() también en pointerdown (no solo en click) — si no, arrastrar el
// pin también orbita la cámara al mismo tiempo, porque ambos gestos usan pointer events
// sobre el mismo contenedor.
export function buildEditableHotspotMarkerEl(hotspot, { onOpen, onDragStart, onDragMove, onDragEnd }) {
  const wrapper = document.createElement("div");
  wrapper.className = "hs-marker";
  wrapper.style.pointerEvents = "auto";

  const btn = document.createElement("button");
  btn.className = `hs-marker-btn hs-marker-${hotspot.type}`;
  btn.type = "button";
  btn.setAttribute("aria-label", hotspot.title || "Hotspot");
  btn.textContent = hotspot.type === "nav" ? "→" : hotspot.type === "price" ? "$" : "i";

  let dragging = false;
  let moved = false;

  btn.addEventListener("pointerdown", (e) => {
    e.stopPropagation();
    e.preventDefault();
    dragging = true;
    moved = false;
    btn.setPointerCapture(e.pointerId);
    onDragStart?.();
  });

  btn.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    e.stopPropagation();
    moved = true;
    onDragMove?.(e.clientX, e.clientY);
  });

  function endDrag(e) {
    if (!dragging) return;
    e.stopPropagation();
    dragging = false;
    if (moved) onDragEnd?.(e.clientX, e.clientY);
    else onOpen?.(hotspot, btn);
  }

  btn.addEventListener("pointerup", endDrag);
  btn.addEventListener("pointercancel", endDrag);

  wrapper.appendChild(btn);
  return wrapper;
}
