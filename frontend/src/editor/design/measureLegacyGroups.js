import { convertLegacyElement, applyGroupMeasurements, LEGACY_COMPOSITES } from "../../runtime/model/groupMigration.js";
import { getTemplate } from "../../runtime/templates/index.js";
import { mergeProps } from "../../runtime/layout/util.js";
import { applyFonts } from "../../runtime/fonts/fonts.js";
import { applyTheme } from "../../runtime/theme/index.js";

const legacy = el => LEGACY_COMPOSITES.includes(el.template) && !el.props?.compositeLeaf;
const round = n => Math.round(n * 100) / 100;

// Medición temporal, sin WebGL ni escritura en el tour. El modelo recibe solo números;
// los estilos automáticos continúan respondiendo al tema después de la conversión.
export async function measureLegacyGroups(doc) {
  const design = doc.design;
  const roots = [...Object.values(design?.screens ?? {}), ...(design?.panels ?? [])].flatMap(screen => screen.elements ?? []);
  if (!roots.some(legacy) || typeof document === "undefined") return design;
  const host = document.createElement("div");
  host.className = "tour-rt-root";
  host.style.cssText = "position:fixed;left:-20000px;top:0;width:1440px;visibility:hidden;pointer-events:none";
  applyFonts(host, design.brand?.fonts);
  applyTheme(host, design.theme);
  document.body.append(host);
  const rendered = [];
  const ctx = { mode: "design", doc, getTemplate, state: { sceneId: doc.scenes?.[0]?.id }, entries: [] };
  try {
    roots.filter(legacy).forEach(element => {
      const template = getTemplate(element.template);
      if (!template) return;
      const wrapper = document.createElement("div");
      wrapper.className = "tour-rt-el";
      wrapper.style.cssText = `position:relative;width:${element.frame?.w > 0 ? `${element.frame.w}px` : "max-content"}`;
      const node = template.render(mergeProps(template, element.props), ctx);
      wrapper.append(node); host.append(wrapper);
      rendered.push({ element, template, node });
    });
    await document.fonts?.ready;
    const converted = new Map(rendered.map(({ element, node }) => {
      const group = convertLegacyElement(element), metrics = {};
      measureGroup(group, node, metrics);
      return [element.id, applyGroupMeasurements(group, metrics)];
    }));
    const mapScreen = screen => ({ ...screen, elements: (screen.elements ?? []).map(el => converted.get(el.id) ?? el) });
    return { ...design, screens: Object.fromEntries(Object.entries(design.screens ?? {}).map(([key, screen]) => [key, mapScreen(screen)])),
      ...(design.panels ? { panels: design.panels.map(mapScreen) } : {}) };
  } finally {
    rendered.forEach(({ template, node }) => template.dispose?.(node));
    host.remove();
  }
}

function measureGroup(group, node, metrics) {
  const rect = node.getBoundingClientRect(), style = getComputedStyle(node);
  const borderX = parseFloat(style.borderLeftWidth) || 0, borderY = parseFloat(style.borderTopWidth) || 0;
  const button = group.props.legacyTemplate === "button";
  metrics[group.id] = { props: { contentWidth: round(rect.width - (button ? borderX*2 : 0)), contentHeight: round(rect.height - (button ? borderY*2 : 0)) } };
  const frameOf = el => {
    const r = el.getBoundingClientRect();
    return { anchor: "top-left", x: round(r.left - rect.left - borderX), y: round(r.top - rect.top - borderY), w: round(r.width), h: round(r.height) };
  };
  const assign = (child, el) => {
    if (!child || !el) return;
    const frame = frameOf(el);
    if (group.props.legacyTemplate === "button" && child.role === "button-label") frame.h = 0;
    if (child.template === "group") measureGroup(child, el, metrics);
    metrics[child.id] = { ...metrics[child.id], frame, props: { ...metrics[child.id]?.props } };
    if (child.template === "text") {
      const css = getComputedStyle(el), size = parseFloat(css.fontSize);
      Object.assign(metrics[child.id].props, { size,
        lineHeight: parseFloat(css.lineHeight) > 0 ? parseFloat(css.lineHeight) / size : 1.4,
        letterSpacing: parseFloat(css.letterSpacing) || 0,
        font: child.props.variant === "kicker" ? "mono" : child.props.variant === "title" ? "heading" : "body",
      });
    }
  };
  const kind = group.props.legacyTemplate;
  if (kind === "button") {
    assign(group.children.find(child => child.role === "button-label"), node.querySelector(".tour-rt-btn-label"));
    assign(group.children.find(child => child.role === "button-icon"), node.querySelector(".tour-rt-btn-icon"));
  } else if (kind === "glass-card") {
    const texts = [...node.children].filter(el => el.hasAttribute("data-slot") && !el.hidden);
    const pieces = [...(node.querySelector(":scope > .tour-rt-gcard-children")?.children ?? [])];
    let ti = 0, pi = 0;
    group.children.forEach(child => assign(child, child.template === "text" && ti < texts.length ? texts[ti++] : pieces[pi++]));
  } else if (kind === "feature-list") {
    const nodes = [];
    const heading = node.querySelector(":scope > [data-slot=heading]");
    if (heading && !heading.hidden) nodes.push(heading);
    node.querySelectorAll(":scope > ul > li").forEach(li => {
      const icon = li.querySelector(".tour-rt-features-icon");
      if (icon?.firstChild) nodes.push(icon);
      nodes.push(li.querySelector(".tour-rt-features-text"));
    });
    group.children.forEach((child, i) => assign(child, nodes[i]));
  } else if (kind === "stats-row") {
    let index = 0;
    [...node.children].forEach((item, i) => {
      assign(group.children[index++], item.querySelector(".tour-rt-statsrow-value"));
      assign(group.children[index++], item.querySelector(".tour-rt-statsrow-label"));
      if (i) {
        const child = group.children[index++], r = item.getBoundingClientRect();
        metrics[child.id] = { frame: { anchor: "top-left", x: round(r.left - rect.left), y: 0, w: 1, h: round(r.height) } };
      }
    });
  } else if (kind === "stats-counter") {
    const heading = node.querySelector(":scope > [data-slot=heading]");
    const text = group.children.find(child => child.template === "text");
    if (text) assign(text, heading);
    const leaf = group.children.find(child => child.template === "stats-counter");
    const body = node.querySelector(".tour-rt-counter-body");
    if (leaf && body) {
      const r = frameOf(body);
      metrics[leaf.id] = { frame: { ...r, w: round(rect.width), h: round(rect.height - r.y) } };
    }
  }
}
