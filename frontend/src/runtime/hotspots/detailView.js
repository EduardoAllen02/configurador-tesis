import { detailElements, detailFrame } from "../model/hotspotDetail.js";
import "./detailView.css";

// The same group/piece templates used by the design canvas, in a local detail surface.
const propsOf = (template, element, mobile) => {
  const frame = detailFrame(element, mobile);
  return { ...template.defaults, ...element.props, children: element.children, width: frame.w, height: frame.h };
};
const settle = (template, node, ctx) => {
  const group = ctx.getTemplate("group");
  [...node.querySelectorAll(".tour-rt-group")].reverse().forEach(child => group?.measure?.(child));
  template.measure?.(node);
};
export function mountDetailContent(host, detail, hotspot, markerProps, ctx) {
  const elements = detailElements(detail, hotspot, markerProps);
  let width = Math.max(1, detailFrame(elements[0], ctx.mobile).w || 320);
  const stage = document.createElement("div");
  stage.className = "hs-detail-stage";
  stage.style.width = `${width}px`;
  stage.style.setProperty("--s", "1");
  host.append(stage);
  const items = elements.map((element) => {
    const template = ctx.getTemplate(element.template);
    if (!template) return null;
    const props = propsOf(template, element, ctx.mobile);
    const node = template.render(props, { ...ctx, elementId: element.id, elementPath: element.id, groupDepth: 0 });
    node.dataset.elId = element.id; node.dataset.template = element.template;
    stage.append(node);
    // Rendering a detached group cannot measure natural text heights. Settle the
    // connected children before the card is positioned or its resize outline read.
    settle(template, node, ctx);
    return { template, node };
  }).filter(Boolean);
  const measure = () => {
    const scale = Math.min(1, host.clientWidth / width || 1);
    stage.style.transform = `scale(${scale})`;
    const height = `${Math.max(1, stage.offsetHeight) * scale}px`;
    if (host.style.height !== height) host.style.height = height;
  };
  let pending;
  const resize = typeof ResizeObserver === "function" ? new ResizeObserver(() => {
    if (!pending) pending = requestAnimationFrame(() => { pending = null; measure(); });
  }) : null;
  resize?.observe(stage);
  resize?.observe(host);
  measure();
  const dispose = () => { resize?.disconnect(); if (pending) cancelAnimationFrame(pending); items.forEach(({ template, node }) => template.dispose?.(node)); stage.remove(); };
  dispose.measure = () => { items.forEach(({template,node}) => settle(template,node,ctx)); measure(); };
  dispose.update = (nextDetail, nextHotspot, nextProps, nextCtx = ctx) => {
    const rows = detailElements(nextDetail, nextHotspot, nextProps);
    if (rows.length !== items.length || rows.some((row, i) => row.id !== items[i].node.dataset.elId || row.template !== items[i].template.id)) return false;
    ctx = nextCtx;
    width = Math.max(1, detailFrame(rows[0], nextCtx.mobile).w || 320); stage.style.width = `${width}px`;
    rows.forEach((row, i) => {
      const { template, node } = items[i];
      const props = propsOf(template, row, nextCtx.mobile);
      template.update(node, props, { ...nextCtx, elementId: row.id, elementPath: row.id, groupDepth: 0 });
      settle(template, node, nextCtx);
    });
    measure(); return true;
  };
  return dispose;
}

