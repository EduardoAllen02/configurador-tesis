// Utilidades puras de la capa de elementos (sin DOM): se prueban en Node.

export const ANIM_KINDS = ["none", "rise", "fade", "blur"];
export const INTRO_STAGGER_BASE_MS = 180;
export const INTRO_STAGGER_STEP_MS = 85;

// props efectivas de un elemento = defaults de la plantilla + lo guardado (contrato §2).
export function mergeProps(template, saved) {
  return { ...(template?.defaults || {}), ...(saved && typeof saved === "object" ? saved : {}) };
}

// Animación de entrada de un elemento. En la pantalla de inicio (stagger) los elementos sin
// animación guardada entran "subiendo", escalonados: 180 + 85 ms · i. Un `kind: "none"`
// explícito la apaga. Devuelve { kind, delayMs } o null si no hay animación.
export function entranceFor(savedProps, template, { stagger = false, index = 0, reduced = false } = {}) {
  if (reduced) return null;
  const saved = savedProps?.animation;
  const base = saved && typeof saved === "object" ? saved : stagger ? { kind: "rise" } : template?.defaults?.animation;
  const kind = ANIM_KINDS.includes(base?.kind) ? base.kind : "none";
  if (kind === "none") return null;
  const own = Number.isFinite(base?.delayMs) ? Math.max(0, base.delayMs) : 0;
  const staggerMs = stagger ? INTRO_STAGGER_BASE_MS + INTRO_STAGGER_STEP_MS * index : 0;
  return { kind, delayMs: own + staggerMs };
}

// Color/valor CSS seguro para meter en estilos desde el diseño (que viene del usuario): sin
// cierres de bloque, url(), expresiones ni caracteres de control. Devuelve `fallback` si no pasa.
export function safeCssValue(value, fallback = "") {
  if (typeof value !== "string") return fallback;
  const v = value.trim();
  if (!v || v.length > 200) return fallback;
  if (/[;{}<>\\]|url\s*\(|expression\s*\(|@import|[\u0000-\u001f]/i.test(v)) return fallback;
  return v;
}

// Número acotado desde un valor del diseño.
export function numberOr(value, fallback, min = -Infinity, max = Infinity) {
  const n = typeof value === "number" ? value : Number.parseFloat(value);
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
}

// Degradado del scrim de la pantalla de inicio.
//   scrim = { from, to, angle, opacity } · en móvil el ángulo es `mobileAngle` (por defecto 180°)
export function scrimGradient(scrim, mobile = false) {
  const s = scrim && typeof scrim === "object" ? scrim : {};
  const from = safeCssValue(s.from, "rgba(8,14,26,.86)");
  const to = safeCssValue(s.to, "rgba(8,14,26,.3)");
  const angle = numberOr(mobile ? (s.mobileAngle ?? 180) : (s.angle ?? 90), 90, -360, 360);
  return { background: `linear-gradient(${angle}deg, ${from} 0%, ${to} 100%)`, opacity: numberOr(s.opacity, 1, 0, 1) };
}

// Cuadrícula de la pantalla de inicio: líneas de 1 px cada `size` px con máscara radial.
export function gridStyle(grid) {
  const g = grid && typeof grid === "object" ? grid : {};
  if (g.on === false) return null;
  const size = numberOr(g.size, 68, 8, 400);
  const line = `rgba(255,255,255,${numberOr(g.opacity, 0.055, 0, 1)})`;
  const mask = "radial-gradient(ellipse 80% 70% at 50% 45%, #000 20%, transparent 78%)";
  return {
    backgroundImage: `linear-gradient(${line} 1px, transparent 1px), linear-gradient(90deg, ${line} 1px, transparent 1px)`,
    backgroundSize: `${size}px ${size}px`,
    maskImage: mask,
    webkitMaskImage: mask,
  };
}

// "asset:<id>" → doc.assets[id].url (o null). Acepta también el id sin prefijo.
export function resolveAssetUrl(doc, ref) {
  if (typeof ref !== "string" || !ref) return null;
  const id = ref.startsWith("asset:") ? ref.slice(6) : ref;
  const url = doc?.assets?.[id]?.url;
  if (typeof url === "string" && url) return url;
  // Bound hotspot images are document URLs; exported bundles use assets/hotspots/.
  if (!/[\u0000-\u0020]/.test(ref) && /^(https?:\/\/|blob:|\/uploads\/|(?:\.\/)?assets\/hotspots\/)/i.test(ref)) return ref;
  return null;
}
