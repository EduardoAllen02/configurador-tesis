import "./fonts.css";
import { resolveBrandFonts } from "./fontList.js";

export { FONT_LIST, fontStack, resolveBrandFonts } from "./fontList.js";

// Aplica design.brand.fonts a la raíz del motor: variables --tour-font-heading/body/mono (las
// usan las plantillas de texto) y la fuente base del cuerpo para todo lo demás.
export function applyFonts(root, fonts) {
  const stacks = resolveBrandFonts(fonts);
  root.style.setProperty("--tour-font-heading", stacks.heading);
  root.style.setProperty("--tour-font-body", stacks.body);
  root.style.setProperty("--tour-font-mono", stacks.mono);
  root.style.fontFamily = stacks.body;
}
