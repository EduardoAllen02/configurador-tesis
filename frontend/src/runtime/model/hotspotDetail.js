import { bindPanelElements, reusablePanel } from "./interfaceModel.js";

export const DETAIL_TEMPLATES = [
  { id: "image-text", name: "Imagen y texto" },
  { id: "product", name: "Ficha de producto" },
  { id: "text", name: "Texto sencillo" },
];
const clone = (value) => JSON.parse(JSON.stringify(value));
const id = () => `detail-${globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)}`;

export function createHotspotDetail(template = "image-text", type = "info") {
  const width = 320, children = [];
  let y = 16;
  const piece = (bind, height, size) => {
    children.push({ id: id(), name: { image: "Imagen", title: "Título", description: "Descripción", price: "Precio" }[bind],
      template: bind === "image" ? "image" : "text", bind,
      props: bind === "image" ? { fit: "cover", radius: 8 } : { text: "", size, color: "", variant: bind === "title" ? "title" : "paragraph" },
      frame: { anchor: "top-left", x: 16, y, w: width - 32, h: bind === "description" ? 0 : height }, z: children.length });
    y += height + 12;
  };
  const product = template === "product";
  if (template !== "text") piece("image", product ? 192 : 160, 0);
  piece("title", product ? 52 : 44, product ? 24 : 22);
  piece("price", product ? 38 : 30, product ? 26 : 20);
  piece("description", 64, 16);
  return { version: 1, enabled: type !== "nav", placement: "inline", reveal: "click", template,
    inheritAppearance: true, fields: { title: true, image: true, description: true, price: true },
    position: { desktop: "right", mobile: "bottom" }, elements: [{ id: id(), template: "group", name: "Detalle del hotspot",
      props: { autoFit: true, detailAutoLayout: true, padding: 16, contentWidth: width, contentHeight: 0 },
      frame: { anchor: "center", x: 0, y: 0, w: width, h: 0 }, mobile: { mode: "auto" }, children }] };
}

export function isIntegratedDetail(hotspot) { return hotspot?.content?.detail?.version === 1; }
// Older tours may have screen/always saved. Screen details now open on demand;
// retain the saved layout and content without requiring a destructive migration.
export function normalizeHotspotDetail(detail) {
  return detail?.placement === "screen" && detail.reveal !== "click" ? { ...detail, reveal: "click" } : detail;
}
export function detailOf(hotspot) { return isIntegratedDetail(hotspot) ? normalizeHotspotDetail(hotspot.content.detail) : null; }
export function detailFrame(element, mobile = false) { return mobile && element?.mobile?.mode === "custom" && element.mobile.frame ? element.mobile.frame : element?.frame ?? {}; }

// Conversion is lazy and non-destructive: opening a form never writes to the tour.
export function editableHotspotDetail(hotspot, design) {
  if (isIntegratedDetail(hotspot)) {
    const saved = clone(detailOf(hotspot));
    if (saved.elements?.length) return saved;
    // Older disabled details can legitimately have no composition yet. Supply
    // an editable recipe without changing that saved visibility or writing it.
    const { geometry, ...configuration } = saved;
    return { ...configuration, elements: createHotspotDetail(saved.template, hotspot.type).elements };
  }
  const next = createHotspotDetail(hotspot?.type === "price" ? "product" : "image-text", hotspot?.type);
  if (!hotspot) return next;
  const panel = reusablePanel(design, hotspot);
  next.placement = "screen";
  next.inheritAppearance = false;
  if (panel) {
    next.legacyPanel = clone(panel);
    next.elements = clone(panel.elements ?? []);
    next.position = clone(panel.position ?? next.position);
  } else {
    next.legacy = clone(design?.detailPanel ?? { template: "floating-card", props: { tone: "dark" } });
    const light = next.legacy.props?.tone === "light";
    Object.assign(next.elements[0].props, { fill: light ? "#ffffffee" : "#111111cc", color: light ? "#171717" : "#ffffff", radius: 12 });
  }
  return next;
}

export function detailElements(detail, hotspot, markerProps = {}) {
  const inherited = { fill: markerProps.fill || "var(--tour-theme-surface,rgba(20,37,68,.75))",
    color: markerProps.iconColor || "var(--txt,#fff)", borderColor: markerProps.stroke || "rgba(255,255,255,.2)",
    borderWidth: markerProps.strokeWidth ?? 1, radius: markerProps.radius ?? 8,
    glass: markerProps.glass ?? true, blur: markerProps.blur ?? 24, tint: markerProps.tint,
    shadow: markerProps.shadow, shadowIntensity: markerProps.shadowIntensity,
    secondaryColor: markerProps.secondaryColor, font: markerProps.font, headingFont: markerProps.headingFont };
  const decorate = (elements, root = true) => elements.map((element) => {
    const next = { ...element, props: { ...element.props } };
    if (next.bind) {
      next.hidden = !!next.hidden || detail.fields?.[next.bind] === false || !hotspot[next.bind];
      if (next.template === "text" && !next.props.color && detail.inheritAppearance !== false) next.props.color = inherited.color;
    }
    if (root && detail.inheritAppearance !== false) next.props = { ...inherited, ...Object.fromEntries(Object.entries(next.props).filter(([, value]) => value !== "" && value != null)) };
    if (element.children) {
      next.children = decorate(element.children, false);
      if (next.props.detailAutoLayout) {
        let top = next.props.padding ?? 16;
        next.children = next.children.map((child) => {
          if (child.hidden) return child;
          const font = child.props?.size || 16, width = child.frame?.w || 288;
          const lines = String(child.props?.text || "").split("\n").reduce((n, line) => n + Math.max(1, Math.ceil(line.length * font * .65 / width)), 0);
          const height = child.template === "text" ? Math.max(child.frame?.h || 0, Math.ceil(lines * font * 1.5)) : child.frame?.h || 160;
          const frame = { ...child.frame, y: top };
          top += height + (next.props.detailGap ?? 12);
          return { ...child, frame };
        });
      }
    }
    return next;
  });
  return decorate(bindPanelElements(detail.elements, hotspot));
}

export function replaceDetailTemplate(detail, template, type, keepAppearance = true) {
  const next = createHotspotDetail(template, type);
  if (keepAppearance) {
    next.inheritAppearance = detail.inheritAppearance;
    for (const key of ["fill", "color", "secondaryColor", "glass", "blur", "tint", "borderColor", "borderWidth", "shadow", "shadowIntensity", "radius", "font", "headingFont"]) {
      if (detail.elements?.[0]?.props?.[key] !== undefined) next.elements[0].props[key] = detail.elements[0].props[key];
    }
  }
  return normalizeHotspotDetail({ ...next, enabled: detail.enabled, placement: detail.placement, reveal: detail.reveal,
    position: detail.position, fields: detail.fields });
}
