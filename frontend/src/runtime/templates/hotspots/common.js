import "./hotspots.css";
import { createIcon, iconFor } from "../../icons/index.js";

// Piezas compartidas por las plantillas de hotspot. Lo puro (sin DOM) está arriba y tiene tests.

export const MOBILE_MAX_WIDTH = 720; // contenedor del motor más angosto que esto = móvil
export const MIN_TOUCH_PX = 36;
const MOBILE_SCALE = 0.9;

// Tamaño efectivo: en móvil se escala ×0.9, pero nunca baja del mínimo táctil.
export function touchSize(size, mobile) {
  const n = Number.isFinite(Number(size)) ? Number(size) : 0;
  if (!mobile) return n;
  return Math.max(MIN_TOUCH_PX, Math.round(n * MOBILE_SCALE * 10) / 10);
}

export const isMobileWidth = (width) => width > 0 && width < MOBILE_MAX_WIDTH;

export function mergeProps(defaults, props) {
  const out = { ...defaults };
  Object.entries(props || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null) out[k] = v;
  });
  return out;
}

// Conserva el alfa de un color #rrggbbaa al cambiarle el tono con un #rrggbb.
export function withAlphaOf(oldValue, newHex) {
  const m = /^#([0-9a-f]{6})([0-9a-f]{2})$/i.exec(String(oldValue || ""));
  return m && /^#[0-9a-f]{6}$/i.test(newHex) ? `${newHex}${m[2]}` : newHex;
}

const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
export const num = (v, fallback) => (Number.isFinite(Number(v)) && v !== "" && v !== null ? Number(v) : fallback);
export const clampNum = (v, min, max, fallback) => clamp(num(v, fallback), min, max);

const TYPE_LABEL = { info: "Información", price: "Precio", nav: "Ir a" };
export const typeLabel = (type) => TYPE_LABEL[type] || "Información";

// ── DOM ────────────────────────────────────────────────────────────────

export function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null && text !== "") node.textContent = text;
  return node;
}

export function svgEl(tag, attrs = {}) {
  const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
  Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, String(v)));
  return node;
}

// Raíz accesible de una plantilla: botón (role) con teclado, salvo en miniaturas de galería.
export function makeRoot(id, p, ctx) {
  const root = el("div", `hs-t hs-t-${id}`);
  const label = ctx.hotspot?.title || p.label || "Hotspot";
  if (ctx.thumb) {
    root.setAttribute("aria-hidden", "true");
  } else {
    root.setAttribute("role", "button");
    root.tabIndex = 0;
    root.setAttribute("aria-label", label);
    root.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        root.click();
      }
    });
  }
  setVars(root, p, ctx);
  return root;
}

// Variables CSS del vocabulario común: las plantillas pintan con var(--hs-*).
export function setVars(root, p, ctx) {
  const size = touchSize(p.size, ctx.mobile);
  const vars = {
    "--hs-size": `${size}px`,
    "--hs-fill": p.fill,
    "--hs-stroke": p.stroke,
    "--hs-sw": `${num(p.strokeWidth, 1)}px`,
    "--hs-icon": p.iconColor,
    "--hs-accent": p.accent,
    "--hs-radius": p.radius != null ? `${num(p.radius, 0)}px` : undefined,
  };
  Object.entries(vars).forEach(([k, v]) => v != null && v !== "" && root.style.setProperty(k, v));
  root.style.opacity = String(clampNum(p.opacity, 0, 1, 1));
  if (p.markerWidth > 0) root.style.width = `${p.markerWidth}px`;
  if (p.animate === false) root.classList.add("hs-still");
  return size;
}

export function iconNode(p, ctx, { size, strokeWidth = 2, bare = false } = {}) {
  const wrap = el("span", "hs-icon");
  if (p.glyph) {
    wrap.classList.add("hs-glyph");
    wrap.textContent = p.glyph;
    return wrap;
  }
  wrap.appendChild(createIcon(iconFor(ctx.hotspot?.type, p.icon), { size, strokeWidth, bare }));
  return wrap;
}

// Etiqueta con línea guía: aparece al pasar el mouse (o siempre).
export function labelNode(p, ctx) {
  const mode = p.showLabel || "hover";
  const text = p.label || ctx.hotspot?.title;
  if (mode === "never" || !text) return null;
  const wrap = el("span", `hs-label${mode === "always" ? " hs-label--always" : ""}`);
  wrap.append(el("i", "hs-label-line"), el("span", "hs-label-chip", text));
  return wrap;
}

// Convierte una plantilla `build(p, ctx) → root` en render/update.
export function defineHotspotTemplate(spec) {
  const { build, ...meta } = spec;
  const full = (props) => mergeProps(spec.defaults, props);
  return {
    kind: "hotspot",
    ...meta,
    render(props, ctx = {}) {
      return build(full(props), ctx);
    },
    update(node, props, ctx = {}) {
      const fresh = build(full(props), ctx);
      node.className = fresh.className;
      node.style.cssText = fresh.style.cssText;
      node.setAttribute("aria-label", fresh.getAttribute("aria-label") || "");
      node.replaceChildren(...fresh.childNodes);
    },
  };
}

// Slots repetidos.
export const slotSize = (min, max, step = 1) => ({ key: "size", type: "range", label: "Tamaño", min, max, step, toolbar: true });
export const slotOpacity = { key: "opacity", type: "range", label: "Opacidad", min: 0.3, max: 1, step: 0.05 };
export const slotIcon = { key: "icon", type: "icon", label: "Icono" };
export const slotLabel = { key: "label", type: "text", label: "Texto" };
export const slotShowLabel = {
  key: "showLabel",
  type: "select",
  label: "Etiqueta",
  options: [
    { value: "hover", label: "Al pasar el mouse" },
    { value: "always", label: "Siempre visible" },
    { value: "never", label: "Nunca" },
  ],
};
export const slotAnimate = { key: "animate", type: "toggle", label: "Animación" };
