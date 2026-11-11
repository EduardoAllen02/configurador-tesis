import { defineHotspotTemplate, el, makeRoot, num, slotAnimate, slotOpacity, slotSize, svgEl, typeLabel } from "./common.js";

// "Callout": ancla pulsante + línea guía que se dibuja sola + tarjeta de cristal con kicker,
// título y "Entrar →" (el aéreo de Colombini). La tarjeta cuelga de (dx, dy) respecto al ancla.
function arrow() {
  const svg = svgEl("svg", {
    viewBox: "0 0 24 24", width: 14, height: 14, fill: "none", stroke: "currentColor",
    "stroke-width": 2, "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true", class: "hs-co-arrow",
  });
  svg.append(svgEl("path", { d: "M5 12h14" }), svgEl("path", { d: "m12 5 7 7-7 7" }));
  return svg;
}

export const callout = defineHotspotTemplate({
  id: "callout",
  name: "Línea guía y tarjeta",
  category: "Hotspots",
  defaults: {
    size: 30,
    fill: "rgba(20,37,68,.5)",
    stroke: "#ffffff",
    strokeWidth: 1.2,
    iconColor: "#ffffff",
    kicker: "",
    cta: "",
    dx: 150,
    dy: -196,
    opacity: 1,
    animate: true,
  },
  slots: [
    { key: "fill", type: "color", label: "Tarjeta", toolbar: true },
    { key: "stroke", type: "color", label: "Línea y ancla", toolbar: true },
    { key: "iconColor", type: "color", label: "Texto", toolbar: true },
    slotSize(16, 100),
    { key: "kicker", type: "text", label: "Etiqueta superior" },
    { key: "cta", type: "text", label: "Botón" },
    { key: "dx", type: "range", label: "Distancia horizontal", min: -800, max: 800, step: 1 },
    { key: "dy", type: "range", label: "Distancia vertical", min: -800, max: 800, step: 1 },
    slotOpacity,
    slotAnimate,
  ],
  build(p, ctx) {
    const hotspot = ctx.hotspot || {};
    const root = makeRoot("callout", p, ctx);
    // En móvil la tarjeta se acerca al ancla para no salirse de la pantalla.
    const compact = ctx.mobile && ctx.mode !== "edit";
    const dx = compact ? Math.min(num(p.dx, 150), 56) : num(p.dx, 150);
    const dy = compact ? Math.max(num(p.dy, -196), -120) : num(p.dy, -196);
    root.classList.toggle("hs-co-mobile", Boolean(ctx.mobile));
    root.classList.toggle("hs-co-edit", ctx.mode === "edit");

    const anchor = el("span", "hs-co-anchor");
    if (ctx.mode === "edit") anchor.title = "Arrastra el punto para mover todo el hotspot";
    anchor.append(el("span", "hs-co-ring"), el("span", "hs-co-core"));
    const origin = el("span", "hs-co-origin");
    const len = Math.hypot(dx, dy);
    const svg = svgEl("svg", { class: "hs-co-line", width: 1, height: 1, "aria-hidden": "true" });
    svg.appendChild(svgEl("line", { x1: 0, y1: 0, x2: dx, y2: dy, style: `--len:${len.toFixed(1)}` }));

    const card = el("span", "hs-co-card");
    if (p.cardWidth) card.style.width = `${p.cardWidth}px`;
    if (p.cardScale) { card.style.scale = String(p.cardScale); card.style.transformOrigin = "bottom left"; }
    if (ctx.mode === "edit") card.title = "Arrastra para mover solo la tarjeta";
    card.style.left = `${dx}px`;
    card.style.top = `${dy}px`;
    const head = el("span", "hs-co-head");
    head.appendChild(el("span", "hs-co-kicker", p.kicker || typeLabel(hotspot.type)));
    if (hotspot.type === "price" && hotspot.price) head.appendChild(el("span", "hs-co-price", hotspot.price));
    const foot = el("span", "hs-co-foot");
    foot.append(el("span", "", p.cta || (hotspot.type === "nav" ? "Entrar" : "Ver detalle")), arrow());
    card.append(head, el("span", "hs-co-title", hotspot.title || "Hotspot"), foot);

    origin.append(svg, card);
    root.append(anchor, origin);
    return root;
  },
});
