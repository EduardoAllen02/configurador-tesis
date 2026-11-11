// Acciones de botón: { type: "enter" | "goToScene" | "openUrl", target }. Lógica pura aparte del
// DOM para poder probar la regla de seguridad: enlaces SOLO http: o https:.
export const ACTION_TYPES = ["enter", "goToScene", "openUrl"];

// Devuelve la URL normalizada si es http(s); si no, null (javascript:, data:, file:, vacío…).
export function safeHttpUrl(value) {
  if (typeof value !== "string") return null;
  const raw = value.trim();
  if (!raw || /[\u0000-\u001f]/.test(raw)) return null;
  try {
    const url = new URL(raw);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

export function normalizeAction(action) {
  if (!action || typeof action !== "object" || !ACTION_TYPES.includes(action.type)) return { type: null, target: null };
  return { type: action.type, target: action.target ?? null };
}

// Ejecuta una acción con el contexto del motor. Devuelve true si hizo algo.
//   enter → ctx.enter() · goToScene → ctx.goToScene(target) · openUrl → lo hace el <a> (aquí no)
export function runAction(action, ctx) {
  const { type, target } = normalizeAction(action);
  if (type === "enter" && typeof ctx?.enter === "function") {
    ctx.enter();
    return true;
  }
  if (type === "goToScene" && target && typeof ctx?.goToScene === "function") {
    ctx.goToScene(target);
    return true;
  }
  return false;
}
