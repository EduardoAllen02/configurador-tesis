import { FONT_LIST } from "../fonts/fontList.js";
// The collapsed marker card is separate from its optional detail.
// Capture its rendered geometry once, in local pixels, without changing reveal behavior.
export const CARD_HOSTS = ".hs-co-card,.hs-fc-card,.hs-label-chip,.hs-pl-text,.hs-pt-text";
const PIECES = ".hs-co-kicker,.hs-co-price,.hs-co-title,.hs-co-foot,.hs-fc-img,.hs-fc-title,.hs-fc-desc,.hs-fc-price";

export function editableHotspotCard(hotspot, snapshot = {}) {
  if (hotspot.content?.card?.version === 1) return structuredClone(hotspot.content.card);
  const uid = () => `card-${globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)}`;
  const width = snapshot.width || 210;
  const pieces = snapshot.pieces?.length ? snapshot.pieces : [
    { role: "kicker", text: hotspot.type === "price" ? "Precio" : hotspot.type === "nav" ? "Navegación" : "Información", x: 15, y: 13, w: width - 30, h: 16, size: 10.5 },
    { role: "title", bind: "title", text: hotspot.title, x: 15, y: 35, w: width - 30, h: 20, size: 14 },
  ];
  return { host: snapshot.host || ".hs-co-card", version: 1, enabled: true, placement: "inline", reveal: "always", inheritAppearance: true,
    elements: [{ id: uid(), name: "Tarjeta del hotspot", template: "group",
      frame: { anchor: "center", x: 0, y: 0, w: width, h: 0 },
      props: { autoFit: true, contentWidth: width, contentHeight: snapshot.height || 0, padding: 0, ...snapshot.finish, detailAutoLayout: false },
      children: pieces.map((p, z) => ({ id: uid(), name: ({ kicker: "Etiqueta", cta: "Acción", price: "Precio", image: "Imagen", description: "Descripción", title: "Título" })[p.role] || "Texto", role: p.role, template: p.role === "image" ? "image" : "text", ...(p.bind ? { bind: p.bind } : {}),
        frame: { anchor: "top-left", x: p.x, y: p.y, w: p.w, h: p.role === "image" ? p.h : 0 }, z,
        props: p.role === "image" ? { fit: p.fit || "cover", radius: p.radius || 0 } : { text: p.text || "", size: p.size, weight: p.weight || 400, color: p.color || "", font: FONT_LIST.find(f => p.font?.includes(f.family.split(",")[0].replaceAll('"', "")) || p.font?.includes(f.id))?.id || (p.role === "kicker" ? "JetBrains Mono" : ""), uppercase: p.uppercase || false, letterSpacing: p.letterSpacing || 0, lineHeight: p.lineHeight || 1.3, variant: "paragraph" } })) }] };
}

export function hotspotPieceRequest(target, wrapper, hotspot = {}) {
  const piece = target.closest?.("[data-el-id]");
  const card = target.closest?.(CARD_HOSTS);
  const surface = target.closest?.("[data-hotspot-surface]")?.dataset.hotspotSurface || (target.closest?.(".hs-detail-body") || card?.classList.contains("hs-detail-expanded") ? "detail" : "card");
  const role = target.closest?.(".hs-fc-img") ? "image" : target.closest?.(".hs-fc-desc") ? "description" : target.closest?.(".hs-co-kicker") ? "kicker" : target.closest?.(".hs-co-price,.hs-fc-price,.hs-pt-text") ? "price" : target.closest?.(".hs-co-foot") ? "cta" : "title";
  let snapshot;
  if (card && !piece) {
    const box = card.getBoundingClientRect();
    const outerScale = card.matches(".hs-co-card") ? 1 : parseFloat(wrapper.firstElementChild?.style.scale) || 1;
    const zoom = (wrapper.getBoundingClientRect().width / wrapper.offsetWidth || 1) * outerScale;
    const cardScale = parseFloat(card.style.scale) || 1;
    const finish = getComputedStyle(card);
    snapshot = { finish: card.matches(".hs-co-card,.hs-fc-card") ? { borderColor: finish.borderColor, borderWidth: parseFloat(finish.borderWidth) || 0, radius: parseFloat(finish.borderRadius) || 0 } : {}, host: CARD_HOSTS.split(",").find(selector => card.matches(selector)), width: box.width / zoom, height: box.height / zoom,
      pieces: [...(card.matches(".hs-label-chip,.hs-pl-text,.hs-pt-text") ? [card] : card.querySelectorAll(PIECES))].filter(n => n.getBoundingClientRect().height > 0 && !n.hidden).map(n => {
        let r = n.getBoundingClientRect(); const s = getComputedStyle(n);
        if (n === card) { const range = document.createRange(); range.selectNodeContents(n); r = range.getBoundingClientRect(); }
        const role = n.matches(".hs-fc-img") ? "image" : n.matches(".hs-fc-desc") ? "description" : n.matches(".hs-co-kicker") ? "kicker" : n.matches(".hs-co-price,.hs-fc-price,.hs-pt-text") ? "price" : n.matches(".hs-co-foot") ? "cta" : "title";
        return { role, ...(["title", "price", "description", "image"].includes(role) && (n !== card || n.textContent === hotspot[role]) ? { bind: role } : {}), text: n.textContent,
          x: (r.left - box.left) / zoom, y: (r.top - box.top) / zoom, w: r.width / zoom, h: r.height / zoom,
          fit: s.objectFit, radius: parseFloat(s.borderRadius), uppercase: s.textTransform === "uppercase", letterSpacing: (parseFloat(s.letterSpacing) || 0) * cardScale, size: parseFloat(s.fontSize) * cardScale, weight: parseFloat(s.fontWeight), color: s.color, font: s.fontFamily, lineHeight: parseFloat(s.lineHeight) / parseFloat(s.fontSize) };
      }) };
  }
  return { surface, id: piece?.dataset.elId, role, snapshot };
}

export function pieceAtPoint(content, x, y, fallback) {
  return [...content.querySelectorAll(`[data-el-id],${PIECES},${CARD_HOSTS}`)]
    .map(node => ({ node, box: node.getBoundingClientRect() }))
    .filter(({box}) => box.width > 0 && box.height > 0 && x >= box.left && x <= box.right && y >= box.top && y <= box.bottom)
    .sort((a,b) => a.box.width * a.box.height - b.box.width * b.box.height)[0]?.node || fallback;
}
