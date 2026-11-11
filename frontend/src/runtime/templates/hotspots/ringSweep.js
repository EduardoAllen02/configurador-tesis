import { defineHotspotTemplate, iconNode, labelNode, makeRoot, slotIcon, slotLabel, slotOpacity, slotShowLabel, slotSize, svgEl, touchSize } from "./common.js";

// "Anillo con barrido": estilo del hotspot "info" del tour de Colombini. Un arco blanco gira
// alrededor de una placa translúcida con un disco blanco y un glifo; al pasar el mouse crece con
// resorte y aparece la etiqueta con su línea guía.
const DEFAULT_FILL = "#111f394d";
const HOVER_FILL = "#1729488c";

export const ringSweep = defineHotspotTemplate({
  id: "ring-sweep",
  name: "Anillo con barrido",
  category: "Hotspots",
  defaults: {
    size: 74,
    fill: DEFAULT_FILL,
    stroke: "#ffffff",
    strokeWidth: 3.6,
    iconColor: "#101a2b",
    icon: "info",
    glyph: "",
    label: "",
    showLabel: "hover",
    opacity: 1,
    animate: true,
  },
  slots: [
    { key: "fill", type: "color", label: "Placa", toolbar: true },
    { key: "stroke", type: "color", label: "Anillo y disco", toolbar: true },
    { key: "iconColor", type: "color", label: "Icono", toolbar: true },
    slotSize(36, 120),
    { key: "strokeWidth", type: "range", label: "Grosor del anillo", min: 1.5, max: 6, step: 0.1 },
    slotIcon,
    slotLabel,
    slotShowLabel,
    slotOpacity,
    { key: "animate", type: "toggle", label: "Anillo girando" },
  ],
  build(p, ctx) {
    const root = makeRoot("ring-sweep", p, ctx);
    root.style.setProperty("--hs-fill-hover", p.fill === DEFAULT_FILL ? HOVER_FILL : p.fill);
    const svg = svgEl("svg", { viewBox: "0 0 64 64", class: "hs-rs-svg", "aria-hidden": "true" });
    svg.append(
      svgEl("circle", { class: "hs-rs-arc", cx: 32, cy: 32, r: 26 }),
      svgEl("circle", { class: "hs-rs-plate", cx: 32, cy: 32, r: 21 }),
      svgEl("circle", { class: "hs-rs-disc", cx: 32, cy: 32, r: 14 })
    );
    root.appendChild(svg);
    const size = touchSize(p.size, ctx.mobile);
    const glyph = iconNode(p, ctx, { size: Math.round((size * 23) / 74), strokeWidth: 2.4, bare: true });
    glyph.classList.add("hs-rs-glyph");
    root.appendChild(glyph);
    const label = labelNode(p, ctx);
    if (label) root.appendChild(label);
    return root;
  },
});
