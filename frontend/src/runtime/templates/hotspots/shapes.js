import {
  defineHotspotTemplate, el, iconNode, labelNode, makeRoot, num, slotAnimate, slotIcon, slotLabel, slotOpacity, slotShowLabel, slotSize, svgEl, touchSize,
} from "./common.js";

// Plantillas de marcador sin texto propio: punto con pulso, cuadrado, esquinas, flecha, pin e icono.
const ACCENT = "var(--tour-accent, #4da3ff)";

// Punto con pulso: núcleo sólido y dos ondas que se expanden.
export const pulseDot = defineHotspotTemplate({
  id: "pulse-dot",
  name: "Punto con pulso",
  category: "Hotspots",
  defaults: { size: 22, fill: ACCENT, stroke: "#ffffff", strokeWidth: 2.5, iconColor: "#ffffff", icon: "", glyph: "", label: "", showLabel: "hover", opacity: 1, animate: true },
  slots: [
    { key: "fill", type: "color", label: "Punto y ondas", toolbar: true },
    { key: "stroke", type: "color", label: "Borde", toolbar: true },
    slotSize(14, 48),
    { key: "strokeWidth", type: "range", label: "Grosor del borde", min: 0, max: 6, step: 0.5 },
    slotIcon,
    slotLabel,
    slotShowLabel,
    slotOpacity,
    { key: "animate", type: "toggle", label: "Ondas" },
  ],
  build(p, ctx) {
    const root = makeRoot("pulse-dot", p, ctx);
    root.append(el("span", "hs-pd-wave"), el("span", "hs-pd-wave hs-pd-wave--2"));
    const core = el("span", "hs-pd-core");
    if (p.icon || p.glyph) core.appendChild(iconNode(p, ctx, { size: Math.round(touchSize(p.size, ctx.mobile) * 0.5), strokeWidth: 2.4 }));
    root.appendChild(core);
    const label = labelNode(p, ctx);
    if (label) root.appendChild(label);
    return root;
  },
});

// Cuadrado con borde: placa de cristal con esquinas redondeables.
export const squareBorder = defineHotspotTemplate({
  id: "square-border",
  name: "Cuadrado con borde",
  category: "Hotspots",
  defaults: { size: 38, fill: "rgba(15,23,42,.42)", stroke: "#ffffff", strokeWidth: 2, iconColor: "#ffffff", icon: "", glyph: "", radius: 9, label: "", showLabel: "hover", opacity: 1, animate: false },
  slots: [
    { key: "fill", type: "color", label: "Fondo", toolbar: true },
    { key: "stroke", type: "color", label: "Borde", toolbar: true },
    { key: "iconColor", type: "color", label: "Icono", toolbar: true },
    slotSize(24, 80),
    { key: "strokeWidth", type: "range", label: "Grosor del borde", min: 0, max: 6, step: 0.5 },
    { key: "radius", type: "range", label: "Redondeo", min: 0, max: 24, step: 1 },
    slotIcon,
    slotLabel,
    slotShowLabel,
    slotOpacity,
    { key: "animate", type: "toggle", label: "Respirar" },
  ],
  build(p, ctx) {
    const root = makeRoot("square-border", p, ctx);
    root.appendChild(iconNode(p, ctx, { size: Math.round(touchSize(p.size, ctx.mobile) * 0.5), strokeWidth: 2.2 }));
    const label = labelNode(p, ctx);
    if (label) root.appendChild(label);
    return root;
  },
});

// Esquinas: solo las cuatro orillas de un visor, con un punto al centro.
export const cornerBrackets = defineHotspotTemplate({
  id: "corner-brackets",
  name: "Esquinas",
  category: "Hotspots",
  defaults: { size: 46, fill: "#ffffff", stroke: "#ffffff", strokeWidth: 3, iconColor: "#ffffff", icon: "", glyph: "", label: "", showLabel: "hover", opacity: 1, animate: true },
  slots: [
    { key: "stroke", type: "color", label: "Esquinas", toolbar: true },
    { key: "fill", type: "color", label: "Punto central", toolbar: true },
    slotSize(26, 90),
    { key: "strokeWidth", type: "range", label: "Grosor", min: 1.5, max: 6, step: 0.5 },
    slotIcon,
    slotLabel,
    slotShowLabel,
    slotOpacity,
    { key: "animate", type: "toggle", label: "Latido" },
  ],
  build(p, ctx) {
    const root = makeRoot("corner-brackets", p, ctx);
    const svg = svgEl("svg", { viewBox: "0 0 48 48", class: "hs-cb-svg", "aria-hidden": "true" });
    const g = svgEl("g", { class: "hs-cb-corners" });
    ["M4 15V8a4 4 0 0 1 4-4h7", "M33 4h7a4 4 0 0 1 4 4v7", "M44 33v7a4 4 0 0 1-4 4h-7", "M15 44H8a4 4 0 0 1-4-4v-7"].forEach((d) => g.appendChild(svgEl("path", { d })));
    svg.appendChild(g);
    if (!p.icon && !p.glyph) svg.appendChild(svgEl("circle", { class: "hs-cb-dot", cx: 24, cy: 24, r: 3.4 }));
    root.appendChild(svg);
    if (p.icon || p.glyph) {
      const icon = iconNode(p, ctx, { size: Math.round(touchSize(p.size, ctx.mobile) * 0.4), strokeWidth: 2.2 });
      icon.classList.add("hs-center");
      root.appendChild(icon);
    }
    const label = labelNode(p, ctx);
    if (label) root.appendChild(label);
    return root;
  },
});

// Flecha de navegación: disco de cristal con una flecha que avanza; `rotate` la orienta.
export const navArrow = defineHotspotTemplate({
  id: "nav-arrow",
  name: "Flecha de navegación",
  category: "Hotspots",
  defaults: { size: 48, fill: "rgba(15,23,42,.55)", stroke: "#ffffff", strokeWidth: 2, iconColor: "#ffffff", icon: "arrow-up", glyph: "", rotate: 0, label: "", showLabel: "hover", opacity: 1, animate: true },
  slots: [
    { key: "fill", type: "color", label: "Fondo", toolbar: true },
    { key: "stroke", type: "color", label: "Borde", toolbar: true },
    { key: "iconColor", type: "color", label: "Flecha", toolbar: true },
    slotSize(32, 90),
    { key: "strokeWidth", type: "range", label: "Grosor del borde", min: 0, max: 5, step: 0.5 },
    { key: "rotate", type: "range", label: "Dirección (grados)", min: 0, max: 359, step: 5 },
    slotIcon,
    slotLabel,
    slotShowLabel,
    slotOpacity,
    { key: "animate", type: "toggle", label: "Flecha avanzando" },
  ],
  build(p, ctx) {
    const root = makeRoot("nav-arrow", p, ctx);
    root.style.setProperty("--hs-rot", `${num(p.rotate, 0)}deg`);
    const dir = el("span", "hs-na-dir");
    const arrow = iconNode(p, ctx, { size: Math.round(touchSize(p.size, ctx.mobile) * 0.5), strokeWidth: 2.6 });
    arrow.classList.add("hs-na-arrow");
    dir.appendChild(arrow);
    root.appendChild(dir);
    const label = labelNode(p, ctx);
    if (label) root.appendChild(label);
    return root;
  },
});

// Pin de mapa: la punta queda sobre el punto exacto del hotspot.
export const mapPin = defineHotspotTemplate({
  id: "map-pin",
  name: "Pin de mapa",
  category: "Hotspots",
  defaults: { size: 36, fill: ACCENT, stroke: "#ffffff", strokeWidth: 2, iconColor: "#ffffff", icon: "", glyph: "", label: "", showLabel: "hover", opacity: 1, animate: false },
  slots: [
    { key: "fill", type: "color", label: "Pin", toolbar: true },
    { key: "stroke", type: "color", label: "Borde", toolbar: true },
    { key: "iconColor", type: "color", label: "Icono", toolbar: true },
    slotSize(26, 72),
    { key: "strokeWidth", type: "range", label: "Grosor del borde", min: 0, max: 5, step: 0.5 },
    slotIcon,
    slotLabel,
    slotShowLabel,
    slotOpacity,
    { key: "animate", type: "toggle", label: "Rebotar" },
  ],
  build(p, ctx) {
    const root = makeRoot("map-pin", p, ctx);
    const svg = svgEl("svg", { viewBox: "0 0 32 44", class: "hs-mp-svg", "aria-hidden": "true" });
    svg.append(
      svgEl("ellipse", { class: "hs-mp-shadow", cx: 16, cy: 41.5, rx: 6, ry: 2 }),
      svgEl("path", { class: "hs-mp-body", d: "M16 2C8.8 2 3 7.7 3 14.8c0 9.4 10.2 20 12.2 22.1a1.1 1.1 0 0 0 1.6 0C18.8 34.8 29 24.2 29 14.8 29 7.7 23.2 2 16 2z" })
    );
    root.appendChild(svg);
    const icon = iconNode(p, ctx, { size: Math.round(touchSize(p.size, ctx.mobile) * 0.42), strokeWidth: 2.4 });
    icon.classList.add("hs-mp-icon");
    root.appendChild(icon);
    const label = labelNode(p, ctx);
    if (label) root.appendChild(label);
    return root;
  },
});

// Solo icono: sin fondo, con sombra para leerse sobre cualquier panorámica.
export const iconOnly = defineHotspotTemplate({
  id: "icon-only",
  name: "Solo icono",
  category: "Hotspots",
  defaults: { size: 34, fill: "transparent", stroke: "#ffffff", strokeWidth: 2.2, iconColor: "#ffffff", icon: "", glyph: "", label: "", showLabel: "hover", opacity: 1, animate: false },
  slots: [
    { key: "iconColor", type: "color", label: "Icono", toolbar: true },
    slotSize(20, 80),
    { key: "strokeWidth", type: "range", label: "Grosor del trazo", min: 1, max: 4, step: 0.2 },
    slotIcon,
    slotLabel,
    slotShowLabel,
    slotOpacity,
    { key: "animate", type: "toggle", label: "Latido" },
  ],
  build(p, ctx) {
    const root = makeRoot("icon-only", p, ctx);
    root.appendChild(iconNode(p, ctx, { size: touchSize(p.size, ctx.mobile), strokeWidth: num(p.strokeWidth, 2.2) }));
    const label = labelNode(p, ctx);
    if (label) root.appendChild(label);
    return root;
  },
});
