// Compare visual data, not server metadata, JSONB property order or subpixel
// float round-trip noise. Quantization affects only this key, never saved values.
const canonical = value => typeof value === "number" && Number.isFinite(value) ? Number(value.toFixed(6)) : Array.isArray(value) ? value.map(canonical) : value && typeof value === "object"
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
export function markerContextKey(context = {}) {
  return JSON.stringify(canonical({ design: context.doc?.design, assets: context.doc?.assets }));
}
export function markerVisualKey(hotspot, style, mobile, context = {}) {
  const { type, title, description, price, image, targetSceneId, locked, content } = hotspot;
  return JSON.stringify(canonical({ type, title, description, price, image, targetSceneId, locked, content,
    style, mobile, appearance: typeof context === "string" ? context : markerContextKey(context) }));
}
