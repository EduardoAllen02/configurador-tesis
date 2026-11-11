import { defineHotspotTemplate, el, iconNode, makeRoot, num, slotIcon, slotLabel, slotOpacity, slotSize, touchSize } from "./common.js";

// Plantillas con texto propio: pastilla, etiqueta de precio y tarjeta flotante.
const ACCENT = "var(--tour-accent, #4da3ff)";

// Pastilla con texto: burbuja de icono + título (o `label`), siempre visible.
export const pillLabel = defineHotspotTemplate({
  id: "pill-label",
  name: "Pastilla con texto",
  category: "Hotspots",
  defaults: { size: 36, fill: "rgba(17,31,57,.82)", stroke: "rgba(255,255,255,.22)", strokeWidth: 1, iconColor: "#ffffff", accent: ACCENT, icon: "", glyph: "", label: "", opacity: 1, animate: false },
  slots: [
    { key: "fill", type: "color", label: "Fondo", toolbar: true },
    { key: "accent", type: "color", label: "Burbuja", toolbar: true },
    { key: "iconColor", type: "color", label: "Texto", toolbar: true },
    slotSize(28, 56),
    { key: "stroke", type: "color", label: "Borde" },
    slotIcon,
    { ...slotLabel, label: "Texto (vacío = título)" },
    slotOpacity,
  ],
  build(p, ctx) {
    const root = makeRoot("pill-label", p, ctx);
    const bubble = el("span", "hs-pl-bubble");
    bubble.appendChild(iconNode(p, ctx, { size: Math.round(touchSize(p.size, ctx.mobile) * 0.5), strokeWidth: 2.4 }));
    root.append(bubble, el("span", "hs-pl-text", p.label || ctx.hotspot?.title || "Hotspot"));
    return root;
  },
});

// Etiqueta de precio: etiqueta con punta y el precio del hotspot.
export const priceTag = defineHotspotTemplate({
  id: "price-tag",
  name: "Etiqueta de precio",
  category: "Hotspots",
  defaults: { size: 34, fill: "#c98a12", iconColor: "#ffffff", icon: "tag", glyph: "", label: "", opacity: 1, animate: false },
  slots: [
    { key: "fill", type: "color", label: "Etiqueta", toolbar: true },
    { key: "iconColor", type: "color", label: "Texto", toolbar: true },
    slotSize(28, 56),
    slotIcon,
    { ...slotLabel, label: "Texto (vacío = precio)" },
    slotOpacity,
  ],
  build(p, ctx) {
    const hotspot = ctx.hotspot || {};
    const root = makeRoot("price-tag", p, ctx);
    const body = el("span", "hs-pt-body");
    body.append(
      iconNode(p, ctx, { size: Math.round(touchSize(p.size, ctx.mobile) * 0.46), strokeWidth: 2.2 }),
      el("span", "hs-pt-text", p.label || hotspot.price || hotspot.title || "Precio")
    );
    root.appendChild(body);
    return root;
  },
});

// Tarjeta flotante: imagen, título, descripción y precio visibles sin hacer clic. La cola apunta
// al punto del hotspot. Su id es "hotspot-card" (y no "floating-card") porque el panel de detalle
// ya se llama así y el registro de plantillas es único por id.
export const floatingCardHotspot = defineHotspotTemplate({
  id: "hotspot-card",
  name: "Tarjeta flotante",
  category: "Hotspots",
  defaults: { size: 200, fill: "rgba(17,31,57,.78)", stroke: "rgba(255,255,255,.16)", strokeWidth: 1, iconColor: "#ffffff", accent: ACCENT, radius: 10, showImage: true, showDescription: true, opacity: 1, animate: false },
  slots: [
    { key: "fill", type: "color", label: "Fondo", toolbar: true },
    { key: "iconColor", type: "color", label: "Texto", toolbar: true },
    { key: "accent", type: "color", label: "Precio", toolbar: true },
    slotSize(150, 300, 5),
    { key: "radius", type: "range", label: "Redondeo", min: 0, max: 24, step: 1 },
    { key: "showImage", type: "toggle", label: "Mostrar imagen" },
    { key: "showDescription", type: "toggle", label: "Mostrar descripción" },
    slotOpacity,
  ],
  build(p, ctx) {
    const hotspot = ctx.hotspot || {};
    const root = makeRoot("hotspot-card", p, ctx);
    root.style.setProperty("--hs-size", `${ctx.mobile ? Math.min(num(p.size, 200), 168) : num(p.size, 200)}px`);
    const card = el("span", "hs-fc-card");
    if (p.showImage !== false && hotspot.image) {
      const img = document.createElement("img");
      img.src = hotspot.image;
      img.alt = "";
      img.draggable = false;
      img.className = "hs-fc-img";
      card.appendChild(img);
    }
    const body = el("span", "hs-fc-body");
    body.appendChild(el("span", "hs-fc-title", hotspot.title || "Hotspot"));
    if (p.showDescription !== false && hotspot.description) body.appendChild(el("span", "hs-fc-desc", hotspot.description));
    if (hotspot.type === "price" && hotspot.price) body.appendChild(el("span", "hs-fc-price", hotspot.price));
    card.appendChild(body);
    root.append(card, el("span", "hs-fc-tail"), el("span", "hs-fc-dot"));
    return root;
  },
});
