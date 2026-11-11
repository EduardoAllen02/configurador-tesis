export function resetTokenFromFragment(hash = "") {
  if (!hash.startsWith("#")) return "";
  const token = new URLSearchParams(hash.replace(/^#/, "")).get("token") || "";
  return token.length <= 2048 && /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token) ? token : "";
}

export function removeResetFragment(location, history) {
  if (location.hash) history.replaceState(history.state, "", location.pathname + location.search);
}

export function resetPasswordError(password, confirmation) {
  if ([...password].length < 8) return "Usa al menos 8 caracteres.";
  if (new TextEncoder().encode(password).length > 72) return "La contraseña es demasiado larga. Prueba con una más corta.";
  if (password !== confirmation) return "Las contraseñas no coinciden.";
  return null;
}
