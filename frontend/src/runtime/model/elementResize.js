// Corners scale all geometry; horizontal sides reflow widths without touching fonts.
// Project the pointer delta onto the box diagonal. Choosing the largest relative
// axis makes a tiny vertical wobble massively scale a wide, single-line text box.
export function proportionalScale(width, height, dx, dy) {
  const lengthSquared = width * width + height * height;
  return lengthSquared > 0 ? 1 + (width * dx + height * dy) / lengthSquared : 1;
}
const PIXELS = new Set(["size", "titleSize", "headingSize", "valueSize", "labelSize", "fontSize", "padding", "gap", "radius", "contentWidth", "contentHeight", "detailGap"]);
export function scaleElement(element, factor, fontSize) {
  const next = structuredClone(element);
  const visit = (row, root = false) => {
    if (row.frame) for (const key of root ? ["w", "h"] : ["x", "y", "w", "h"]) if (typeof row.frame[key] === "number") row.frame[key] *= factor;
    row.props = { ...row.props };
    for (const [key, value] of Object.entries(row.props)) if (PIXELS.has(key) && typeof value === "number" && value > 0) row.props[key] = value * factor;
    if (row.template === "text" && !(element.props?.size > 0) && root && fontSize > 0) row.props.size = fontSize * factor;
    row.children?.forEach((child) => visit(child));
  };
  visit(next, true);
  return next;
}
export function reflowElement(element, width) {
  const next = structuredClone(element), old = next.props?.contentWidth || next.frame?.w || width;
  next.props = { ...next.props, contentWidth: width };
  const padding = next.props.padding || 0, ratio = Math.max(1, width - padding * 2) / Math.max(1, old - padding * 2);
  next.children = next.children?.map((child) => ({ ...child, frame: { ...child.frame,
    x: padding + ((child.frame?.x || 0) - padding) * ratio,
    w: (child.frame?.w || old) * ratio } }));
  return next;
}
// A vertical container handle changes only its viewport, leaving its pieces intact.
export function resizeGroupHeight(element, height) {
  return { ...element, frame: { ...element.frame, h: height },
    props: { ...element.props, autoFit: false, contentHeight: 0, detailFixedHeight: true } };
}
