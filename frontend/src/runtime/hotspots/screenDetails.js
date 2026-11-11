import { hotspotPieceRequest } from "../model/hotspotCard.js";
import { detailFrame, detailOf } from "../model/hotspotDetail.js";
import { exteriorLayout } from "../model/hotspotSurface.js";
import { mountDetailContent } from "./detailView.js";
import { createReusablePanelLayer } from "../screens/reusablePanel.js";
import { resolveFrame, computeScale } from "../layout/engine.js";

export function createScreenDetails(root, getContext) {
  const host = document.createElement("div"); host.className = "hs-screen-details"; root.append(host);
  const entries = new Map(), stacks = new Map();
  let opened = null, preview = null, latest = [];
  const remove = (id) => { const item = entries.get(id); item?.dispose?.(); item?.node.remove(); entries.delete(id); };
  const close = (id) => { if (opened === id) opened = null; if (preview === id) preview = null; remove(id); sync(latest); };
  function sync(rows) {
    latest = rows;
    const ctx = getContext();
    const desired = new Set();
    rows.forEach(({ hotspot, style }) => {
      const source = detailOf(hotspot);
      const detail = source ? exteriorLayout(source, "detail") : null;
      if (!detail?.enabled || detail.placement !== "screen" || ctx.mode === "design") return;
      if ((preview || opened) !== hotspot.id) return;
      desired.add(hotspot.id);
      const mobile = root.clientWidth < 720;
      const key = JSON.stringify([detail, hotspot.title, hotspot.description, hotspot.price, hotspot.image, style, mobile]);
      if (entries.get(hotspot.id)?.key === key) return;
      const previous = entries.get(hotspot.id);
      const props = { ...ctx.getTemplate(style?.template)?.defaults, ...style?.props };
      const placementKey = JSON.stringify([detail.position, mobile]);
      if (previous?.update && previous.placementKey === placementKey && previous.update(detail, hotspot, props, { ...ctx, mobile })) {
        previous.key = key; previous.layout(detail); return;
      }
      remove(hotspot.id);
      if (detail.legacy || detail.legacyPanel) {
        if (detail.legacyPanel) {
          const layer = createReusablePanelLayer({ root: host, getTemplate: ctx.getTemplate, onClose: () => close(hotspot.id) });
          layer.update(detail.legacyPanel, { ...ctx, hotspot });
          entries.set(hotspot.id, { key, node: layer.el, dispose: layer.dispose });
        } else {
          const template = ctx.getTemplate(detail.legacy.template) || ctx.getTemplate("floating-card");
          const node = template.render(detail.legacy.props, { ...ctx, hotspot, onClose: () => close(hotspot.id) });
          host.append(node); entries.set(hotspot.id, { key, node, dispose: () => template.dispose?.(node) });
        }
        return;
      }
      const position = detail.position?.[mobile ? "mobile" : "desktop"] || "right";
      let parent = host;
      if (position !== "custom") {
        if (!stacks.has(position)) { const stack = document.createElement("div"); stack.className = `hs-screen-stack hs-screen-stack--${position}`; host.append(stack); stacks.set(position, stack); }
        parent = stacks.get(position);
      }
      const node = document.createElement("section"); node.className = "hs-screen-detail"; node.dataset.hotspotId = hotspot.id; node.dataset.hotspotSurface = "detail";
      node.style.setProperty("--detail-width", `${detailFrame(detail.elements?.[0], mobile).w || 320}px`);
      node.ondblclick = event => { if (!ctx.onEditPiece) return; event.preventDefault(); event.stopPropagation(); ctx.onEditPiece(hotspot, hotspotPieceRequest(event.target, node, hotspot), node.getBoundingClientRect()); };
      node.setAttribute("data-ui", ""); node.setAttribute("aria-label", hotspot.title || "Detalle del hotspot");
      if (detail.inheritAppearance !== false) {
        node.style.setProperty("--detail-fill", props.fill || "rgba(20,37,68,.75)");
        node.style.setProperty("--detail-color", props.iconColor || "#ffffff");
      }
      parent.append(node);
      const scroll = document.createElement("div"); scroll.className = "hs-screen-detail-scroll"; node.append(scroll);
      scroll.tabIndex = 0; scroll.setAttribute("aria-label", "Contenido del detalle");
      const body = document.createElement("div"); body.className = "hs-screen-detail-content"; scroll.append(body);
      const dispose = mountDetailContent(body, detail, hotspot, props, { ...ctx, mobile });
      {
        const button = document.createElement("button"); button.className = "hs-screen-detail-close"; button.textContent = "×";
        button.setAttribute("aria-label", "Cerrar detalle"); button.onclick = () => close(hotspot.id); node.append(button);
      }
      if (hotspot.type === "nav") {
        const button = document.createElement("button"); button.className = "hs-detail-enter"; button.textContent = "Entrar";
        button.onclick = () => { if (ctx.mode !== "edit") ctx.goToScene(hotspot.targetSceneId); }; scroll.append(button);
      }
      let currentDetail = detail;
      const layout = (nextDetail = currentDetail) => {
        currentDetail = nextDetail;
        const frame = detailFrame(currentDetail.elements?.[0], mobile);
        node.style.setProperty("--detail-width", `${frame.w || 320}px`);
        node.style.transform = `translate(${currentDetail.offset?.x || 0}px,${currentDetail.offset?.y || 0}px)`;
        const fixedHeight = currentDetail.elements?.[0]?.props?.detailFixedHeight ? frame.h : 0;
        const availableHeight = Math.max(80, position === "custom" ? root.clientHeight - 16 : parent.clientHeight - 4);
        const maxHeight = fixedHeight > 0 ? Math.min(availableHeight, fixedHeight) : availableHeight;
        node.style.height = fixedHeight > 0 ? `${maxHeight}px` : "";
        node.style.setProperty("--detail-max-height", `${maxHeight}px`);
        if (position !== "custom") return;
        const result = resolveFrame({ ...frame, h: frame.h || body.offsetHeight || 200 }, { W: root.clientWidth, H: root.clientHeight }, computeScale(root.clientWidth, root.clientHeight));
        const width = Math.min(root.clientWidth - 16, result.rect.width || 320);
        const height = Math.min(maxHeight, body.offsetHeight || 200);
        Object.assign(node.style, { position: "absolute", left: `${Math.max(8, Math.min(root.clientWidth - width - 8, result.rect.left))}px`, top: `${Math.max(8, Math.min(root.clientHeight - height - 8, result.rect.top))}px`, width: `${width}px`, maxHeight: `${root.clientHeight - 16}px` });
      };
      const observer = typeof ResizeObserver === "function" ? new ResizeObserver(() => layout()) : null;
      observer?.observe(root); observer?.observe(body); layout();
      entries.set(hotspot.id, { key, node, placementKey, layout, update: detail.geometry === "outer" ? dispose.update : null, dispose: () => { observer?.disconnect(); dispose(); } });
    });
    for (const id of entries.keys()) if (!desired.has(id)) remove(id);
    for (const [position, stack] of stacks) if (!stack.childElementCount) { stack.remove(); stacks.delete(position); }
    if (!rows.some(({ hotspot }) => hotspot.id === opened)) opened = null;
    if (!rows.some(({ hotspot }) => hotspot.id === preview)) preview = null;
  }
  const escape = (event) => { if (event.key === "Escape" && opened) { close(opened); } };
  const resize = typeof ResizeObserver === "function" ? new ResizeObserver(() => sync(latest)) : null;
  resize?.observe(root);
  window.addEventListener("keydown", escape);
  return {
    sync,
    open(hotspot) { preview = null; opened = opened === hotspot.id ? null : hotspot.id; sync(latest); },
    close() { opened = null; preview = null; sync(latest); },
    preview(id, show) { if (show) { opened = null; preview = id; } else if (preview === id) preview = null; sync(latest); },
    dispose() { resize?.disconnect(); window.removeEventListener("keydown", escape); [...entries.keys()].forEach(remove); host.remove(); },
  };
}
