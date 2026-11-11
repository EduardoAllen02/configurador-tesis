import { numberOr, safeCssValue } from "../layout/util.js";
import { fontStack } from "../fonts/fontList.js";

const darkTokens = { surface: "rgba(20,37,68,.5)", tint: "rgba(20,37,68,.5)", blur: 24, border: "rgba(255,255,255,.15)", borderWidth: 1, shadow: true, shadowIntensity: .6, text: "#f6f8fb", secondaryText: "rgba(246,248,251,.72)", accent: "#4c8dff", onAccent: "#ffffff", radius: 5, headingFont: "Inter", bodyFont: "Inter", glass: true };
const makeTheme = (id, tokens) => {
  const t = { ...darkTokens, ...tokens };
  return { id, tokens: t, styles: {
    card: { color: t.text, secondaryColor: t.secondaryText, font: t.bodyFont, headingFont: t.headingFont, fill: t.surface, glass: t.glass, blur: t.blur, tint: t.tint, borderColor: t.border, borderWidth: t.borderWidth, shadow: t.shadow, shadowIntensity: t.shadowIntensity, radius: t.radius },
    button: { fill: t.accent, color: t.onAccent, radius: t.radius },
    title: { color: t.text, weight: id === "bold" ? 800 : 600, font: t.headingFont },
    text: { color: t.secondaryText, font: t.bodyFont },
    label: { color: t.secondaryText, font: "mono" },
    icon: { color: t.accent },
    shape: { fill: t.accent, glass: false, blur: t.blur, tint: t.tint, borderColor: t.border, borderWidth: 0, shadow: false, shadowIntensity: t.shadowIntensity, radius: t.radius },
  } };
};
export const THEMES = [
  makeTheme("glass-dark", { accent: "#ffffff", onAccent: "#101a2b" }),
  makeTheme("minimal-light", { surface: "#ffffff", tint: "rgba(255,255,255,.6)", glass: false, blur: 0, border: "rgba(26,26,24,.12)", shadowIntensity: .12, text: "#1a1a18", secondaryText: "#55534e", accent: "#1a1a18", onAccent: "#ffffff", radius: 8, headingFont: "DM Sans", bodyFont: "DM Sans" }),
  makeTheme("bold", { surface: "#171717", tint: "rgba(17,17,17,.8)", glass: false, blur: 0, border: "#ffd400", shadow: false, text: "#ffffff", secondaryText: "#d4d4d4", accent: "#ffd400", onAccent: "#111111", radius: 0, headingFont: "Manrope", bodyFont: "Manrope" }),
];
export const DEFAULT_THEME = THEMES[0];
export const isAutomatic = (v) => v == null || v === "" || v === "auto";
export const TRANSPARENT = "rgba(0,0,0,0)";
export function themeFor(theme) {
  const base = THEMES.find((t) => t.id === theme?.id) ?? DEFAULT_THEME;
  return { ...base, ...theme, tokens: { ...base.tokens, ...theme?.tokens }, styles: Object.fromEntries(Object.keys(base.styles).map((role) => [role, { ...base.styles[role], ...theme?.styles?.[role] }])) };
}
export function roleFor(template, props = {}) {
  if (props.role && ["card", "button", "title", "text", "label", "icon", "shape"].includes(props.role)) return props.role;
  if (["glass-card", "group"].includes(template)) return "card";
  if (template === "text") return props.variant === "title" ? "title" : props.variant === "kicker" ? "label" : "text";
  if (["button", "shape", "icon"].includes(template)) return template;
  return null;
}
export const STYLE_KEYS = ["themeOverride", "fill", "color", "secondaryColor", "headingFont", "valueColor", "labelColor", "iconColor", "borderColor", "borderWidth", "stroke", "strokeWidth", "glass", "blur", "tint", "shadow", "shadowIntensity", "radius", "font", "weight", "size"];
// Only missing/automatic props inherit a role: manual colors (including transparent), 0 and false survive.
export function resolveThemeProps(template, props = {}, theme) {
  if (!theme) return props;
  const t = themeFor(theme), role = roleFor(template, props), style = { ...(t.styles[role] ?? {}) };
  if (template === "button" && props.variant === "glass") Object.assign(style, { fill: t.tokens.surface, color: t.tokens.text });
  if (template === "button" && props.variant === "ghost") Object.assign(style, { fill: TRANSPARENT, color: t.tokens.text });
  if (role === "card" && isAutomatic(props.fill) && (props.glass ?? style.glass)) style.fill = isAutomatic(props.tint) ? style.tint : props.tint;
  if (props.glass === false && /^(transparent|rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\s*\))$/.test(props.fill ?? "")) {
    style.borderWidth = 0;
    style.shadow = false;
  }
  const out = { ...props };
  Object.entries(style).forEach(([k, v]) => { if (isAutomatic(out[k]) || (["size", "weight"].includes(k) && out[k] === 0)) out[k] = v; });
  return out;
}
export function themeVariables(theme) {
  const t = themeFor(theme).tokens;
  const css = (value, fallback) => safeCssValue(value, fallback);
  return {
    "--tour-theme-surface": css(t.surface, darkTokens.surface), "--tour-theme-tint": css(t.tint, darkTokens.tint),
    "--tour-theme-border": css(t.border, darkTokens.border), "--tour-theme-text": css(t.text, darkTokens.text),
    "--tour-theme-secondary": css(t.secondaryText, darkTokens.secondaryText), "--tour-theme-accent": css(t.accent, darkTokens.accent),
    "--tour-theme-radius": `${numberOr(t.radius, 5, 0, 400)}px`, "--tour-theme-blur": `${numberOr(t.blur, 24, 0, 80)}px`,
    "--tour-theme-on-accent": css(t.onAccent, "#101a2b"),
    "--tour-font-heading": fontStack(t.headingFont), "--tour-font-body": fontStack(t.bodyFont),
  };
}
// Call after applyFonts. An absent theme preserves the legacy brand's fonts and accent.
export function applyTheme(root, theme) {
  const variables = themeVariables(theme);
  Object.entries(variables).forEach(([key, value]) => {
    if (!theme && key.startsWith("--tour-font-")) return;
    else if (!theme && key === "--tour-theme-accent") root.style.removeProperty(key);
    else root.style.setProperty(key, value);
  });
  if (theme) { root.style.fontFamily = "var(--tour-font-body)"; root.style.setProperty("--tour-accent", variables["--tour-theme-accent"]); }
}
function mapElements(design, mapper) {
  const walk = (element, parent = "") => {
    const path = parent ? `${parent}/${element.id}` : element.id;
    let next = mapper(element, path);
    if (next.children) next = { ...next, children: next.children.map((e) => walk(e, path)) };
    if (next.props?.children) next = { ...next, props: { ...next.props, children: next.props.children.map((e) => walk(e, path)) } };
    return next;
  };
  const screens = Object.fromEntries(Object.entries(design.screens ?? {}).map(([key, screen]) => [key, { ...screen, elements: (screen.elements ?? []).map((e) => walk(e)) }]));
  const panels = design.panels?.map((panel) => panel.elements ? { ...panel, elements: panel.elements.map((e) => walk(e)) } : walk(panel));
  return { ...design, screens, ...(panels ? { panels } : {}) };
}
export function applyDesignTheme(design, theme, { clearOverrides = false } = {}) {
  const next = { ...design, theme: structuredClone(themeFor(theme)) };
  if (!clearOverrides) return next;
  return mapElements(next, (el) => ({ ...el, props: Object.fromEntries(Object.entries(el.props ?? {}).filter(([k]) => !STYLE_KEYS.includes(k))) }));
}
export function applyElementTheme(design, screen, id, theme) {
  const t = themeFor(theme);
  if (screen?.startsWith("panel:")) {
    const panelId = screen.slice(6);
    return { ...design, panels: (design.panels ?? []).map((panel) => {
      if (panel.id !== panelId) return panel;
      return { ...panel, elements: applyElementTheme({ screens: { panel: { elements: panel.elements ?? [] } } }, "panel", id, theme).screens.panel.elements };
    }) };
  }
  const source = design.screens?.[screen];
  if (!source) return design;
  const next = mapElements({ screens: { [screen]: source } }, (el, path) => {
    if (path !== id && el.id !== id) return el;
    const role = roleFor(el.template, el.props);
    if (!role) return el;
    return { ...el, props: { ...el.props, ...structuredClone(t.styles[role]), ...(el.template === "group" ? { themeOverride: structuredClone(t) } : {}) } };
  });
  return { ...design, screens: { ...design.screens, [screen]: next.screens[screen] } };
}
export function validateTheme(theme) {
  const errors = [];
  if (!theme?.id || typeof theme.id !== "string") errors.push("Falta id");
  for (const key of Object.keys(darkTokens)) if (!(key in (theme?.tokens ?? {}))) errors.push(`Falta token ${key}`);
  for (const role of ["card", "button", "title", "text", "label", "icon", "shape"]) if (!theme?.styles?.[role]) errors.push(`Falta rol ${role}`);
  for (const [key, value] of Object.entries(theme?.tokens ?? {})) if (typeof value === "string" && !safeCssValue(value)) errors.push(`Token inválido ${key}`);
  return errors;
}
