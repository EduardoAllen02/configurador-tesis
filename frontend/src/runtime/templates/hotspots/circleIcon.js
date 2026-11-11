import { createIcon, iconFor } from "../../icons/index.js";
import {
  clampNum, el, labelNode, mergeProps, num, slotAnimate, slotIcon, slotLabel, slotOpacity, slotShowLabel, slotSize, touchSize,
} from "./common.js";

// Plantilla de hotspot "circle-icon": el marcador circular de siempre (.hs-marker-btn), pintado
// desde `props` en vez de clases por tipo. Los colores por tipo (acento/ámbar/azul) y los glifos
// i/$/→ salen del preset del diseño, no del código. Con `icon` dibuja un icono del set interno.
//   ctx: { hotspot, mobile, thumb }
const DEFAULT_GLYPH = { nav: "→", price: "$", info: "i" };

function apply(btn, props, ctx) {
  const { hotspot } = ctx;
  const size = touchSize(props.size ?? 30, ctx.mobile);
  btn.className = `hs-marker-btn hs-marker-${hotspot.type}`;
  btn.setAttribute("aria-label", hotspot.title || "Hotspot");
  btn.replaceChildren();
  if (props.icon) {
    btn.appendChild(createIcon(iconFor(hotspot.type, props.icon), { size: Math.round(size * 0.55), strokeWidth: 2.2 }));
  } else {
    btn.textContent = props.glyph || DEFAULT_GLYPH[hotspot.type] || "i";
  }
  Object.assign(btn.style, {
    width: `${size}px`,
    height: `${size}px`,
    fontSize: `${Math.round(((size * 13) / 30) * 10) / 10}px`,
    background: props.fill ?? "var(--tour-accent, #4da3ff)",
    border: `${props.strokeWidth ?? 1.5}px solid ${props.stroke ?? "rgba(255, 255, 255, 0.85)"}`,
    color: props.iconColor ?? "#fff",
    opacity: String(clampNum(props.opacity, 0.3, 1, 1)),
  });
  if (props.radius != null && props.radius !== "") btn.style.borderRadius = `${num(props.radius, 50)}${props.radius === 50 ? "%" : "px"}`;
  if (props.animate) {
    btn.classList.add("hs-pulsing");
    btn.appendChild(el("span", "hs-pulse-ring"));
  }
  const label = labelNode({ ...props, showLabel: props.showLabel ?? "never" }, ctx);
  if (label) btn.appendChild(label);
}

const defaults = {
  size: 30,
  fill: "var(--tour-accent, #4da3ff)",
  stroke: "rgba(255, 255, 255, 0.85)",
  strokeWidth: 1.5,
  iconColor: "#ffffff",
  icon: "",
  glyph: "",
  label: "",
  showLabel: "never",
  opacity: 1,
  radius: 50,
  animate: false,
};

export const circleIcon = {
  id: "circle-icon",
  kind: "hotspot",
  name: "Círculo con icono",
  category: "Hotspots",
  defaults,
  slots: [
    { key: "fill", type: "color", label: "Fondo", toolbar: true },
    { key: "stroke", type: "color", label: "Borde", toolbar: true },
    { key: "iconColor", type: "color", label: "Icono", toolbar: true },
    slotSize(24, 72),
    { key: "strokeWidth", type: "range", label: "Grosor del borde", min: 0, max: 6, step: 0.5 },
    { key: "radius", type: "range", label: "Redondeo (50 = círculo)", min: 4, max: 50, step: 1 },
    slotIcon,
    slotLabel,
    slotShowLabel,
    slotOpacity,
    slotAnimate,
  ],
  render(props, ctx = {}) {
    const btn = document.createElement("button");
    btn.type = "button";
    if (ctx.thumb) btn.tabIndex = -1;
    apply(btn, mergeProps(defaults, props), ctx);
    return btn;
  },
  update(btn, props, ctx = {}) {
    apply(btn, mergeProps(defaults, props), ctx);
  },
};
