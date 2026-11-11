// Operaciones puras sobre estilos de hotspot (las usan el editor y los tests; sin DOM).

// Estilo nuevo al elegir una plantilla en la galería: sus defaults completos.
export function styleFromTemplate(template) {
  return { template: template.id, props: { ...template.defaults } };
}

export function setStyleProp(style, key, value) {
  return { ...style, props: { ...style.props, [key]: value } };
}

// Diseño con el preset de un tipo reemplazado ("Todos los de tipo X").
export function withPreset(design, type, style) {
  return { ...design, hotspotPresets: { ...(design?.hotspotPresets || {}), [type]: style } };
}

// Hotspots del tour a los que "aplicar a todos" les borra el estilo propio: mismo tipo, sin
// bloquear, con estilo propio y que no sea el que se está guardando.
export function hotspotsToClear(allHotspots, type, exceptId) {
  return allHotspots.filter((h) => h.type === type && !h.locked && h.style != null && h.id !== exceptId);
}

export function wrapLon(lon) {
  return ((((lon + 180) % 360) + 360) % 360) - 180;
}

// Datos para crear la copia de un hotspot: lon +8°, mismo estilo y contenido, título "… (copia)".
// Los keyframes de video (segments) se desplazan igual; la copia nace desbloqueada.
export function duplicatePayload(hotspot, offsetDeg = 8) {
  const shift = (lon) => Math.round(wrapLon(lon + offsetDeg) * 1000) / 1000;
  const payload = {
    type: hotspot.type,
    title: `${hotspot.title} (copia)`,
    lon: shift(hotspot.lon),
    lat: hotspot.lat,
  };
  if (hotspot.description) payload.description = hotspot.description;
  if (hotspot.price) payload.price = hotspot.price;
  if (hotspot.targetSceneId) payload.targetSceneId = hotspot.targetSceneId;
  if (hotspot.style) payload.style = hotspot.style;
  if (hotspot.content) payload.content = hotspot.content;
  if (Array.isArray(hotspot.segments)) {
    payload.segments = hotspot.segments.map((seg) => ({
      ...seg,
      keys: Object.fromEntries(Object.entries(seg.keys || {}).map(([f, k]) => [f, { ...k, lon: shift(k.lon) }])),
    }));
  }
  return payload;
}
