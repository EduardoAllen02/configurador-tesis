import { createElementLayer } from "../../../runtime/layout/elementLayer.js";
import { getTemplate } from "../../../runtime/templates/index.js";
import { applyFonts } from "../../../runtime/fonts/fonts.js";
import { applyTheme } from "../../../runtime/theme/index.js";
import { elementsOf } from "../elementOps.js";
import { containerOf } from "./frames.js";

// Use the shared renderer for automatic sizes and mobile stacking, without a
// second panorama, camera or persistent runtime. Reads never author geometry.
export function measureDevice(design, screen, baseDoc, device, sceneId) {
  const { W, H } = containerOf(device), host = document.createElement("div");
  host.className = "tour-rt-root";
  host.style.cssText = `position:fixed;left:-20000px;top:0;width:${W}px;height:${H}px;visibility:hidden;pointer-events:none`;
  applyFonts(host, design.brand?.fonts); applyTheme(host, design.theme);
  document.body.append(host);
  const layer = createElementLayer({ host, getTemplate, animate: false });
  try {
    layer.rebuild(elementsOf(design, screen), { mode: "design", ready: true, doc: { ...baseDoc, design }, state: { sceneId }, entries: [] });
    layer.relayout();
    return layer.getBoxes();
  } finally { layer.dispose(); host.remove(); }
}
