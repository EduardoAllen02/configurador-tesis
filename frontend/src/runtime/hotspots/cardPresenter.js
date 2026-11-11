import { CARD_HOSTS } from "../model/hotspotCard.js";
import { detailOf, detailFrame } from "../model/hotspotDetail.js";
import { exteriorLayout } from "../model/hotspotSurface.js";
import { applyFinish } from "../templates/elements/common.js";
import { mountDetailContent } from "./detailView.js";

// Sole owner of the marker's card host. The two compositions only paint their
// own group; they never compete for host width, finish, visibility or actions.
export function createCardPresenter(content, initialHotspot, initialProps, initialCtx, visibility) {
  let hotspot, props, ctx, card, foot, enter, createdCard = false, managed = false, hostSelector;
  let origin, detail, summary;
  const surfaces = new Map();
  const canonical = (layout, surface) => layout ? exteriorLayout(layout, surface) : null;
  function reconcile(surface, layout) {
    let item = surfaces.get(surface);
    if (!layout) { item?.dispose(); item?.body.remove(); surfaces.delete(surface); return; }
    if (item?.dispose.update(layout, hotspot, props, ctx)) return;
    item?.dispose(); item?.body.remove();
    const body = document.createElement("div");
    body.className = surface === "detail" ? "hs-detail-body" : "hs-marker-card-body";
    body.dataset.hotspotId = hotspot.id; body.dataset.hotspotSurface = surface;
    surface === "card" ? card.prepend(body) : card.insertBefore(body, foot);
    const dispose = mountDetailContent(body, layout, hotspot, props, ctx);
    surfaces.set(surface, { body, dispose });
  }
  function paint() {
    if (!card) return;
    const open = visibility.open && !!detail?.elements?.length;
    const layout = open ? detail : summary;
    const outer = layout?.geometry === "outer";
    card.classList.toggle("hs-detail-expanded", open);
    card.classList.toggle("hs-marker-composed", !!summary);
    card.dataset.hotspotSurface = open ? "detail" : "card";
    card.dataset.hotspotId = hotspot.id;
    if (outer) card.dataset.hsGeometry = "outer"; else delete card.dataset.hsGeometry;
    for (const [surface, item] of surfaces) item.body.hidden = surface === "detail" ? !open : open;
    if (layout) {
      card.style.width = `${detailFrame(layout.elements[0], ctx.mobile).w || 320}px`;
      card.style.padding = "0"; card.style.gap = "0"; card.style.minWidth = "0";
      card.style.height = ""; card.style.scale = "";
      applyFinish(card, { fill: "transparent", glass: false, borderWidth: 0, shadow: false, radius: 0 });
    } else {
      card.style.width = props.cardWidth ? `${props.cardWidth}px` : "";
      card.style.padding = ""; card.style.gap = ""; card.style.minWidth = "";
      applyFinish(card, { ...props, color: props.iconColor });
    }
    if (foot) {
      foot.hidden = !detail?.enabled || detail.placement !== "inline" || detail.reveal === "always" || (!open && !!summary);
      foot.textContent = open ? "Ver menos" : "Ver detalle";
      foot.setAttribute("aria-expanded", String(open));
    }
    if (enter) enter.hidden = !open;
    content.classList.toggle("hs-with-inline-detail", !!detail?.enabled && detail.placement === "inline");
    // Settle only after the host has its new width and the selected body is
    // visible. Gestures must not observe a hidden/previous-width measurement.
    surfaces.get(open ? "detail" : "card")?.dispose.measure?.();
  }
  function update(nextHotspot, nextProps, nextCtx) {
    const nextSelector = CARD_HOSTS.split(",").includes(nextHotspot.content?.card?.host) ? nextHotspot.content.card.host : ".hs-co-card";
    if (card && hostSelector !== nextSelector) return false;
    hotspot = nextHotspot; props = nextProps; ctx = nextCtx; hostSelector = nextSelector;
    const configured = detailOf(hotspot);
    detail = configured?.enabled && configured.placement === "inline" ? canonical(configured, "detail") : null;
    summary = hotspot.content?.card?.version === 1 ? canonical(hotspot.content.card, "card") : null;
    card ||= content.querySelector(hostSelector);
    if (!card && detail) {
      card = document.createElement("div"); card.className = "hs-co-card hs-detail-inline-card";
      card.style.left = `${props.dx ?? 48}px`; card.style.top = `${props.dy ?? -40}px`;
      content.append(card); createdCard = true;
    }
    if (!card) return true;
    foot ||= card.querySelector(".hs-co-foot");
    if (configured && !configured.enabled && foot && hotspot.type !== "nav") foot.hidden = true;
    if (!detail && !summary && !managed) return true;
    managed = true;
    if (!foot && detail) { foot = document.createElement("span"); foot.className = "hs-co-foot"; card.append(foot); }
    // Non-callout templates can own a composed text/image host as well.
    if (summary && !card.matches(".hs-co-card") && !surfaces.has("card")) {
      card.replaceChildren(); foot = null;
      card.classList.add("hs-marker-piece-host"); card.style.display = "block";
    }
    reconcile("card", summary); reconcile("detail", detail);
    if (hotspot.type === "nav" && detail && !enter) {
      enter = document.createElement("button"); enter.className = "hs-detail-enter"; enter.textContent = "Entrar";
      enter.onclick = event => { event.stopPropagation(); if (ctx.mode !== "edit") ctx.goToScene?.(hotspot.targetSceneId); };
      card.insertBefore(enter, foot);
    } else if (enter && (hotspot.type !== "nav" || !detail)) { enter.remove(); enter = null; }
    origin = { x: props.dx ?? (parseFloat(card.style.left) || 48), y: props.dy ?? (parseFloat(card.style.top) || -40) };
    card.style.left = `${origin.x}px`; card.style.top = `${origin.y}px`;
    paint(); return true;
  }
  update(initialHotspot, initialProps, initialCtx);
  return {
    update, paint,
    setOffset(x, y) { if (card) origin = { x, y }; },
    click(event) {
      if (!detail) return false;
      if (event.target.closest("button,a,input,select,textarea") || surfaces.get("detail")?.body.contains(event.target)) return true;
      if (detail.reveal !== "always") { visibility.toggle(); paint(); }
      return true;
    },
    constrain(rect) {
      if (!card || !detail) return;
      const before = card.getBoundingClientRect();
      const zoom = before.width / card.offsetWidth || 1;
      card.style.maxWidth = `${Math.max(120, (rect.width - 24) / zoom)}px`;
      card.style.left = `${origin.x}px`; card.style.top = `${origin.y}px`;
      const box = card.getBoundingClientRect();
      const sx = box.width / card.offsetWidth || 1, sy = box.height / card.offsetHeight || 1;
      const dx = (box.right > rect.right - 12 ? rect.right - 12 - box.right : box.left < rect.left + 12 ? rect.left + 12 - box.left : 0) / sx;
      const dy = (box.top < rect.top + 12 ? rect.top + 12 - box.top : box.bottom > rect.bottom - 12 ? rect.bottom - 12 - box.bottom : 0) / sy;
      card.style.left = `${origin.x + dx}px`; card.style.top = `${origin.y + dy}px`;
      const line = content.querySelector(".hs-co-line line");
      if (line) { line.setAttribute("x2", origin.x + dx); line.setAttribute("y2", origin.y + dy); line.style.setProperty("--len", Math.hypot(origin.x + dx, origin.y + dy)); }
    },
    dispose() {
      for (const item of surfaces.values()) { item.dispose(); item.body.remove(); }
      surfaces.clear(); enter?.remove(); if (createdCard) card.remove();
    },
  };
}
