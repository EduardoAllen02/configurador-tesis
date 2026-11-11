import { createElementLayer } from "../layout/elementLayer.js";
import { bindPanelElements } from "../model/interfaceModel.js";
import { positionedPanelElements } from "../model/panelPosition.js";
import { isMobileWidth } from "../layout/engine.js";
import "./reusablePanel.css";

export function createReusablePanelLayer({ root, getTemplate, onClose, design = false, onLayout }) {
  const host = document.createElement("div");
  host.className = `tour-rt-reusable-panel${design ? " is-design" : ""}`;
  if (!design) { host.setAttribute("role", "dialog"); host.setAttribute("aria-label", "Información del hotspot"); }
  root.appendChild(host);
  const layer = createElementLayer({ host, getTemplate, animate: !design, onLayout });
  const close = document.createElement("button");
  close.type = "button";
  close.className = "tour-rt-reusable-close";
  close.textContent = "×";
  close.setAttribute("aria-label", "Cerrar información");
  close.setAttribute("data-ui", "");
  close.addEventListener("click", () => onClose?.());
  host.appendChild(close);
  let spec, context;
  function render() {
    if (!spec) return;
    const mobile = isMobileWidth(host.clientWidth);
    const elements = design ? spec.elements ?? [] : bindPanelElements(spec.elements, context.hotspot);
    layer.rebuild(positionedPanelElements(elements, spec.position?.[mobile ? "mobile" : "desktop"]), context);
    close.hidden = spec.closeButton === false;
    // El cierre queda junto al contenido, también cuando el panel es una hoja móvil.
    const boxes = layer.getBoxes(host);
    if (boxes.length) {
      const right = Math.max(...boxes.map((box) => box.left + box.width));
      const top = Math.min(...boxes.map((box) => box.top));
      close.style.right = "auto";
      close.style.left = `${Math.max(8, Math.min(host.clientWidth - 50, right - 50))}px`;
      close.style.top = `${Math.max(8, Math.min(host.clientHeight - 50, top + 8))}px`;
    }
  }
  const resize = typeof ResizeObserver === "function" ? new ResizeObserver(render) : null;
  resize?.observe(host);
  const escape = (event) => { if (!design && event.key === "Escape") onClose?.(); };
  window.addEventListener("keydown", escape);
  return {
    el: host,
    update(panel, ctx) { spec = panel; context = ctx; render(); },
    getBoxes: layer.getBoxes,
    dispose() { resize?.disconnect(); window.removeEventListener("keydown", escape); layer.dispose(); host.remove(); },
  };
}
