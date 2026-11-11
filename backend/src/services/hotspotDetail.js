const { randomUUID } = require("crypto");

function validateHotspotDetail(detail) {
  if (detail === undefined) return null;
  if (!detail || typeof detail !== "object" || Array.isArray(detail) || detail.version !== 1) return "Detalle de hotspot inválido";
  if (typeof detail.enabled !== "boolean" || !["inline", "screen"].includes(detail.placement) || !["click", "always"].includes(detail.reveal)) return "Comportamiento de detalle inválido";
  if (!Array.isArray(detail.elements) || detail.elements.length > 50 || Buffer.byteLength(JSON.stringify(detail)) > 256 * 1024) return "El detalle supera el tamaño permitido";
  let count = 0;
  function valid(elements, depth = 0) {
    return depth <= 2 && elements.every((element) => {
      count++;
      if (count > 150 || !element || typeof element.id !== "string" || typeof element.template !== "string") return false;
      if (element.bind && !["title", "description", "price", "image"].includes(element.bind)) return false;
      if (element.frame && Object.values(element.frame).some((value) => typeof value === "number" && (!Number.isFinite(value) || Math.abs(value) > 10000))) return false;
      return !element.children || (Array.isArray(element.children) && valid(element.children, depth + 1));
    });
  }
  return valid(detail.elements) ? null : "Elementos del detalle inválidos";
}

function copiedDetail(detail) {
  const next = JSON.parse(JSON.stringify(detail));
  if (next.placement === "screen") next.reveal = "click";
  const renew = (elements) => elements.forEach((element) => { element.id = `detail-${randomUUID()}`; if (element.children) renew(element.children); });
  renew(next.elements);
  return next;
}

module.exports = { validateHotspotDetail, copiedDetail };
