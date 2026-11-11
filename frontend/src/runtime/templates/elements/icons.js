// Iconos de los elementos de pantalla: es el mismo set que los hotspots (runtime/icons/, estilo
// Lucide, ISC). Este módulo solo adapta la firma que usan las plantillas de elementos y acepta
// "home" como alias de "house" (diseños guardados con el set mínimo anterior).
import { ICON_IDS, createIcon as createSetIcon } from "../../icons/index.js";

const ALIASES = { home: "house" };

export const ICON_NAMES = ICON_IDS;

export function createIcon(name, { size = 16, stroke = 1.9 } = {}) {
  const id = ALIASES[name] || name;
  return createSetIcon(ICON_IDS.includes(id) ? id : "check", { size, strokeWidth: stroke });
}
