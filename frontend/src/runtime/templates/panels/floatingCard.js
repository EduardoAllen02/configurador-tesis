import { h } from "../dom.js";
import "./panels.css";
import { watchMobile } from "./sheet.js";

// Panel de detalle "floating-card": el HotspotDetailPanel de siempre. `tone` claro/oscuro, borde
// izquierdo y precio en el acento del tour, imagen opcional. Los hotspots `nav` no lo abren.
//   ctx: { hotspot, onClose }
function fill(card, props = {}, ctx) {
  const { hotspot, onClose } = ctx;
  const mobile = card.classList.contains("is-mobile") ? " is-mobile" : ""; // en móvil se ve como hoja inferior
  card.className = `tour-rt-card tour-rt-card--${props.tone === "light" ? "light" : "dark"}${mobile}`;
  // replaceChildren convertiría un null en el texto "null": se filtran los bloques ausentes.
  const blocks = [
    h("button", { type: "button", className: "tour-rt-card-close", "aria-label": "Cerrar", text: "×", onClick: onClose }),
    h("h3", { text: hotspot.title }),
    hotspot.image ? h("img", { src: hotspot.image, alt: "" }) : null,
    hotspot.type === "price" && hotspot.price ? h("p", {}, h("strong", { className: "tour-rt-card-price", text: hotspot.price })) : null,
    hotspot.description ? h("p", { text: hotspot.description }) : null,
  ];
  card.replaceChildren(...blocks.filter(Boolean));
}

export const floatingCard = {
  id: "floating-card",
  kind: "panel",
  name: "Tarjeta flotante",
  category: "Paneles",
  defaults: { tone: "dark" },
  slots: [{ key: "tone", type: "select", label: "Tono", options: [{ value: "dark", label: "Oscuro" }, { value: "light", label: "Claro" }] }],
  render(props, ctx) {
    const card = h("div", { "data-ui": "" });
    fill(card, props, ctx);
    watchMobile(card);
    return card;
  },
  update(card, props, ctx) {
    fill(card, props, ctx);
  },
};
