// Construye el DOM de un marcador de hotspot (botón circular con ícono "i"). `onOpen`
// es un callback inyectado — el panel de detalle vive como componente React, no aquí.
export function buildHotspotMarkerEl(hotspot, onOpen) {
  const wrapper = document.createElement("div");
  wrapper.className = "hs-marker";

  const btn = document.createElement("button");
  btn.className = "hs-marker-btn";
  btn.type = "button";
  btn.setAttribute("aria-label", hotspot.title);
  btn.textContent = hotspot.type === "nav" ? "→" : "i";

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    onOpen(hotspot);
  });

  wrapper.appendChild(btn);
  return wrapper;
}
