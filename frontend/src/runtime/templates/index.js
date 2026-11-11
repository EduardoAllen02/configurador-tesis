import { hotspotTemplates } from "./hotspots/index.js";
import { panelTemplates } from "./panels/index.js";
import { elementTemplates } from "./elements/index.js";

// Registro de plantillas: una plantilla = un archivo con
//   { id, kind: "hotspot"|"panel"|"element", name, category, defaults, slots,
//     render(props, ctx) → HTMLElement, update(el, props, ctx), isVisible?(ctx) }
// (contrato en docs/CONTRATO_OLEADA2.md §2). Cada familia vive en su carpeta con su propio
// index.js; el motor y el editor no conocen más que este registro.
const registry = new Map();

export function registerTemplate(template) {
  registry.set(template.id, template);
}

export function getTemplate(id) {
  return registry.get(id) || null;
}

// Para las galerías del editor (Oleada 3): todas las plantillas de un tipo, en orden de registro.
export function listTemplates(kind) {
  return [...registry.values()].filter((t) => t.kind === kind);
}

[...hotspotTemplates, ...panelTemplates, ...elementTemplates].forEach(registerTemplate);
