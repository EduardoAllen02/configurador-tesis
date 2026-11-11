import { FONT_LIST, fontStack } from "../../fonts/fontList.js";
import { numberOr, safeCssValue } from "../../layout/util.js";

// Piezas comunes de las plantillas de elementos.

// Slot "Animar" que llevan todas (ninguna / subir / aparecer / desenfoque + retraso).
export const animationSlot = { key: "animation", type: "animation", label: "Animar", toolbar: true };
export const animationDefault = { kind: "none", delayMs: 0 };

// Asigna estilos desde el diseño (datos del usuario): cada valor pasa por safeCssValue y los
// vacíos limpian la propiedad, así update() puede revertir un color.
export function applyStyle(el, styles) {
  Object.entries(styles).forEach(([key, value]) => {
    el.style[key] = typeof value === "string" ? safeCssValue(value, "") : value == null ? "" : String(value);
  });
}

// Propiedad personalizada con valor saneado; vacío la quita.
export function setVar(el, name, value) {
  const v = safeCssValue(value, "");
  if (v) el.style.setProperty(name, v);
  else el.style.removeProperty(name);
}

export const px = (value, fallback, min = 0, max = 4000) => `${numberOr(value, fallback, min, max)}px`;

// Textos de lista que llegan del diseño: array de objetos, tope de 12 por seguridad de layout.
export function listOf(value, max = 12) {
  return Array.isArray(value) ? value.filter((item) => item && typeof item === "object").slice(0, max) : [];
}

export function languageOf(ctx) {
  const lang = ctx?.doc?.design?.languages?.default;
  return typeof lang === "string" && /^[a-z]{2,3}(-[A-Za-z0-9]+)?$/.test(lang) ? lang : "es";
}

// Acabado compartido por tarjetas, grupos y formas. null = automático; false/0 son manuales.
export const finishDefaults = { fill: "", glass: null, blur: null, tint: "", borderColor: "", borderWidth: null, shadow: null, shadowIntensity: null, radius: null };
export const finishSlots = [
  { key: "glass", type: "toggle", label: "Cristal", auto: true, group: "Acabado" },
  { key: "blur", type: "range", label: "Desenfoque", min: 0, max: 60, step: 1, auto: true, group: "Acabado" },
  { key: "tint", type: "color", label: "Tinte del cristal", group: "Acabado" },
  { key: "borderColor", type: "border", label: "Borde", group: "Acabado" },
  { key: "borderWidth", type: "range", label: "Grosor de borde", min: 0, max: 12, step: 1, auto: true, group: "Acabado" },
  { key: "shadow", type: "toggle", label: "Sombra", auto: true, group: "Acabado" },
  { key: "shadowIntensity", type: "range", label: "Intensidad de sombra", min: 0, max: 1, step: .05, auto: true, group: "Acabado" },
  { key: "radius", type: "range", label: "Redondeo", min: 0, max: 80, step: 1, auto: true, group: "Acabado" },
];
export function finishStyle(props, { bare = false } = {}) {
  const glass = props.glass ?? !bare;
  const clear = props.glass === false && /^(transparent|rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\s*\))$/.test(props.fill ?? "");
  const shadow = props.shadow ?? !(bare || clear);
  const borderWidth = numberOr(props.borderWidth ?? props.strokeWidth, bare || clear ? 0 : 1, 0, 20);
  const fill = props.fill || (bare && !glass ? "rgba(0,0,0,0)" : glass ? props.tint || "var(--tour-theme-tint,rgba(20,37,68,.5))" : "var(--tour-theme-surface,rgba(20,37,68,.5))");
  const blur = px(props.blur, 24, 0, 80);
  const intensity = numberOr(props.shadowIntensity, .6, 0, 1);
  return { background: fill, backdropFilter: glass ? `blur(${blur}) saturate(1.7)` : "none", webkitBackdropFilter: glass ? `blur(${blur}) saturate(1.7)` : "none",
    border: borderWidth ? `${borderWidth}px solid ${props.borderColor || props.stroke || "var(--tour-theme-border,rgba(255,255,255,.15))"}` : "none",
    borderRadius: props.shape === "circle" ? "50%" : px(props.radius, 5, 0, 400),
    boxShadow: shadow && intensity > 0 ? `0 16px 44px -14px rgba(6,12,24,${intensity}),0 2px 8px rgba(6,12,24,${intensity / 2})` : "none" };
}
export function applyFinish(root, props, options) {
  applyStyle(root, finishStyle(props, options));
  if ("color" in props) { applyStyle(root, { color: props.color }); setVar(root, "--txt", props.color); }
  if ("secondaryColor" in props) { setVar(root, "--txt-2", props.secondaryColor); setVar(root, "--txt-3", props.secondaryColor); }
  for (const [key, css] of [["font", "--tour-font-body"], ["headingFont", "--tour-font-heading"]]) {
    if (key in props) setVar(root, css, FONT_LIST.some((f) => f.id === props[key]) ? fontStack(props[key]) : "");
  }
}
