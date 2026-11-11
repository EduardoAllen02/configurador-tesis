// Lista curada de fuentes (lógica pura, sin CSS: se prueba en Node). Los nombres que se guardan
// en design.brand.fonts son el `id`; cualquier otro valor cae en Inter, así un diseño nunca
// puede meter una cadena arbitraria en font-family.
const SANS_FALLBACK = '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif';
const MONO_SYSTEM = 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace';

export const FONT_LIST = [
  { id: "Inter", label: "Inter", kind: "sans", family: `"TourInter", "Inter", ${SANS_FALLBACK}` },
  { id: "Manrope", label: "Manrope", kind: "sans", family: `"TourManrope", ${SANS_FALLBACK}` },
  { id: "DM Sans", label: "DM Sans", kind: "sans", family: `"TourDMSans", ${SANS_FALLBACK}` },
  { id: "Playfair Display", label: "Playfair Display", kind: "serif", family: `"TourPlayfair", Georgia, "Times New Roman", serif` },
  { id: "JetBrains Mono", label: "JetBrains Mono", kind: "mono", family: `"TourJetBrainsMono", ${MONO_SYSTEM}` },
  { id: "Roboto", label: "Roboto", kind: "sans", family: `"TourRoboto", ${SANS_FALLBACK}` },
  { id: "Open Sans", label: "Open Sans", kind: "sans", family: `"TourOpenSans", ${SANS_FALLBACK}` },
  { id: "Montserrat", label: "Montserrat", kind: "sans", family: `"TourMontserrat", ${SANS_FALLBACK}` },
  { id: "Nunito Sans", label: "Nunito Sans", kind: "sans", family: `"TourNunitoSans", ${SANS_FALLBACK}` },
  { id: "Oswald", label: "Oswald", kind: "sans", family: `"TourOswald", ${SANS_FALLBACK}` },
  { id: "Raleway", label: "Raleway", kind: "sans", family: `"TourRaleway", ${SANS_FALLBACK}` },
  { id: "Space Grotesk", label: "Space Grotesk", kind: "sans", family: `"TourSpaceGrotesk", ${SANS_FALLBACK}` },
  { id: "Lora", label: "Lora", kind: "serif", family: '"TourLora", Georgia, "Times New Roman", serif' },
  { id: "Merriweather", label: "Merriweather", kind: "serif", family: '"TourMerriweather", Georgia, "Times New Roman", serif' },
  { id: "Source Serif 4", label: "Source Serif 4", kind: "serif", family: '"TourSourceSerif4", Georgia, "Times New Roman", serif' },
];

export const DEFAULT_FONT_ID = "Inter";
export const SYSTEM_MONO_STACK = MONO_SYSTEM;

const byId = new Map(FONT_LIST.map((f) => [f.id, f]));

// Pila CSS de una fuente de la lista; desconocida o vacía → `fallbackId`.
export function fontStack(id, fallbackId = DEFAULT_FONT_ID) {
  return (byId.get(id) || byId.get(fallbackId)).family;
}

// design.brand.fonts → { heading, body, mono } listos para custom properties. La mono por
// defecto es la del sistema (como los "kickers" de Colombini); solo cambia si se elige una.
export function resolveBrandFonts(fonts) {
  const f = fonts && typeof fonts === "object" ? fonts : {};
  return {
    heading: fontStack(f.heading),
    body: fontStack(f.body),
    mono: byId.get(f.mono)?.kind === "mono" ? byId.get(f.mono).family : MONO_SYSTEM,
  };
}
