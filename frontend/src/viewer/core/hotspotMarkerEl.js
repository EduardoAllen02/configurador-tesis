// Construye el DOM de un marcador de hotspot (botón circular con ícono "i"). `onOpen`
// es un callback inyectado — el panel de detalle vive como componente React, no aquí.
export function buildHotspotMarkerEl(hotspot, onOpen) {
  const wrapper = document.createElement("div");
  wrapper.className = "hs-marker";
  // El contenedor del CSS2DRenderer tiene pointer-events:none (para que el arrastre de
  // órbita llegue al canvas 3D) — hay que reactivarlo aquí para que el botón sea clickeable.
  wrapper.style.pointerEvents = "auto";

  const btn = document.createElement("button");
  // hs-marker-${type} da el color semántico fijo de nav/price (ver index.css) — el mismo
  // par de clases que ya usa el editor (editableHotspotMarkerEl.js); antes solo tenía
  // hs-marker-btn, así que nav/price nunca se distinguían por color en el visor público,
  // solo en el editor. También faltaba el glifo "$" de price.
  btn.className = `hs-marker-btn hs-marker-${hotspot.type}`;
  btn.type = "button";
  btn.setAttribute("aria-label", hotspot.title);
  btn.textContent = hotspot.type === "nav" ? "→" : hotspot.type === "price" ? "$" : "i";

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    onOpen(hotspot);
  });

  wrapper.appendChild(btn);
  return wrapper;
}
