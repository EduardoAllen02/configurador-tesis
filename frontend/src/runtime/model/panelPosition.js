import { DESIGN_W, DESIGN_H, resolveFrame } from "../layout/engine.js";

// Reancla el conjunto sin cambiar la distancia entre sus piezas. Se resuelven antes
// todas las anclas originales; una pieza top-left y otra center comparten coordenadas.
export function positionedPanelElements(elements, position) {
  if (!elements.length || !position || position === "custom") return elements;
  const rects = elements.map((element) => resolveFrame(element.frame, { W: DESIGN_W, H: DESIGN_H }, 1).rect);
  const left = Math.min(...rects.map((r) => r.left));
  const top = Math.min(...rects.map((r) => r.top));
  const right = Math.max(...rects.map((r) => r.left + r.width));
  const bottom = Math.max(...rects.map((r) => r.top + r.height));
  const cx = (left + right) / 2;
  const cy = (top + bottom) / 2;
  return elements.map((element, i) => {
    const rect = rects[i];
    return { ...element, frame: { ...element.frame, anchor: position,
      x: position === "left" ? rect.left - left + 24 : position === "right" ? rect.left + rect.width - right - 24 : rect.left + rect.width / 2 - cx,
      y: position === "bottom" ? rect.top + rect.height - bottom - 24 : rect.top + rect.height / 2 - cy,
    } };
  });
}
