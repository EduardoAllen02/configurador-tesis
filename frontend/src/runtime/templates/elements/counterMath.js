// Matemática del contador rotativo "en números" (pura).
export const COUNT_MS = 1100; // cuenta hacia arriba
export const ROTATE_MS = 4200; // cambia de cifra

export const easeOutCubic = (t) => 1 - Math.pow(1 - Math.max(0, Math.min(1, t)), 3);

// Valor mostrado tras `elapsed` ms de una cuenta de 0 a `target`.
export function countValueAt(target, elapsed, duration = COUNT_MS, direction = "up") {
  const end = direction === "down" ? 0 : target;
  if (!(duration > 0) || elapsed >= duration) return end;
  const progress = easeOutCubic(elapsed / duration);
  return Math.round(target * (direction === "down" ? 1 - progress : progress));
}

export function nextIndex(index, length) {
  return length > 0 ? (index + 1) % length : 0;
}

// Cifra a texto con separador de miles según el idioma ("en" → 1,100 · "es" → 1.100).
export function formatCount(value, locale = "en") {
  try {
    return new Intl.NumberFormat(locale).format(value);
  } catch {
    return String(value);
  }
}

// Un valor es "contable" si es un número finito (si es texto libre se muestra tal cual).
export const isCountable = (value) => typeof value === "number" && Number.isFinite(value);
