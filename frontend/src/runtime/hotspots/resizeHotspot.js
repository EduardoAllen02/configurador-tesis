import { scaleElement, reflowElement, proportionalScale } from "../model/elementResize.js";

export function resizeHotspot(hotspot, style, factor, corner, surface) {
  const nextStyle = structuredClone(style || { template: "circle-icon", props: {} });
  nextStyle.props = { ...nextStyle.props };
  const detail = hotspot.content?.detail;
  const card = hotspot.content?.card;
  if (card?.version === 1 && (!card.host || [".hs-co-card", ".hs-fc-card"].includes(card.host)) && (surface === "card" || !detail?.enabled || detail.placement !== "inline")) {
    const next = structuredClone(card), root = next.elements[0];
    next.elements[0] = corner ? scaleElement(root, factor) : reflowElement(root, Math.max(60, root.frame.w * factor));
    if (!corner) next.elements[0].frame.w = Math.max(60, root.frame.w * factor);
    if (card.host === ".hs-fc-card") {
      nextStyle.props.size = next.elements[0].frame.w * (nextStyle.props.markerScale || 1);
      nextStyle.props.markerWidth = nextStyle.props.size;
    }
    return { style: nextStyle, content: { ...hotspot.content, card: next } };
  }
  if (detail?.enabled && detail.placement === "inline" && detail.elements?.[0]?.template === "group") {
    const next = structuredClone(detail), root = next.elements[0], width = root.frame?.w || 320;
    if (corner) {
      next.elements[0] = scaleElement(root, factor);
      next.elements[0].props.detailScale = (root.props?.detailScale || 1) * factor;
      next.elements[0].props.detailGap = (root.props?.detailGap ?? 12) * factor;
    } else {
      const padding = 30 * (root.props?.detailScale || 1);
      const newWidth = Math.max(60, (width + padding) * factor - padding);
      next.elements[0] = reflowElement(root, newWidth);
      next.elements[0].frame.w = newWidth;
    }
    delete next.legacy; delete next.legacyPanel;
    return { style: nextStyle, content: { ...hotspot.content, detail: next } };
  }
  if (nextStyle.template === "callout") {
    if (corner) nextStyle.props.cardScale = (nextStyle.props.cardScale || 1) * factor;
    else nextStyle.props.cardWidth = Math.max(60, (nextStyle.props.cardWidth || 240) * factor);
  } else {
    if (corner) {
      nextStyle.props.size = Math.max(8, (nextStyle.props.size || 30) * factor);
      nextStyle.props.markerScale = (nextStyle.props.markerScale || 1) * factor;
      if (nextStyle.props.markerWidth) nextStyle.props.markerWidth *= factor;
    }
    else nextStyle.props.markerWidth = Math.max(8, (nextStyle.props.markerWidth || nextStyle.props.size || 30) * factor);
  }
  return { style: nextStyle };
}

export function hotspotResizeBox(rect, handle, dx, dy) {
  const west = handle.includes("w"), north = handle.includes("n"), corner = handle.length === 2;
  const sx = 1 + (west ? -dx : dx) / rect.width;
  const factor = Math.max(.25, Math.min(4, corner ? proportionalScale(rect.width, rect.height, west ? -dx : dx, north ? -dy : dy) : sx));
  const width = rect.width * factor, height = corner ? rect.height * factor : rect.height;
  return { left: west ? rect.left + rect.width - width : rect.left, top: north ? rect.top + rect.height - height : rect.top,
    width, height, factor, corner };
}
