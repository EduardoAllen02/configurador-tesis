// Segmentos y keyframes de un hotspot de video (lógica pura, sin DOM ni three). Dueño: B1,
// plan §3.6 / contrato Oleada 2 §3.
//
//   hotspot.segments = [{ from: 10, to: 20, keys: { "10": { lon: 30, lat: -5 }, "18": { lon: 42, lat: -3 } } }]
//
// Todos los índices son cuadros DENTRO del lote (0 = primer cuadro por orderIndex) e
// inclusivos. Lo que esté mal formado se ignora sin romper el tour.

const cache = new WeakMap(); // segments (array crudo) -> { last, result }

const isNum = (v) => typeof v === "number" && Number.isFinite(v);

// Diferencia de longitud por el arco corto, en [-180, 180) (fórmula del contrato).
export function shortestLonDelta(a, b) {
  return ((((b - a + 540) % 360) + 360) % 360) - 180;
}

function wrapLon(lon) {
  return ((((lon + 180) % 360) + 360) % 360) - 180;
}

function normalizeKeys(rawKeys, from, to) {
  const keys = {};
  if (!rawKeys || typeof rawKeys !== "object") return keys;
  Object.keys(rawKeys)
    .map((k) => [Number(k), rawKeys[k]])
    .filter(([f, p]) => Number.isInteger(f) && f >= from && f <= to && p && isNum(p.lon) && isNum(p.lat))
    .sort((a, b) => a[0] - b[0])
    .forEach(([f, p]) => {
      keys[String(f)] = { lon: p.lon, lat: p.lat };
    });
  return keys;
}

// Devuelve segmentos válidos, ordenados por `from`, sin enciman, con las keys recortadas al
// segmento. Con `lastIndex` también recorta `to` al último cuadro del lote (y descarta los
// que empiezan después). Si `raw` no es un arreglo, devuelve [].
export function normalizeSegments(raw, lastIndex = Infinity) {
  if (!Array.isArray(raw)) return [];
  const hit = cache.get(raw);
  if (hit && hit.last === lastIndex) return hit.result;

  const candidates = [];
  raw.forEach((seg) => {
    if (!seg || !isNum(seg.from) || !isNum(seg.to)) return;
    const from = Math.round(seg.from);
    const to = Math.min(Math.round(seg.to), lastIndex);
    if (from < 0 || from > to) return;
    candidates.push({ from, to, keys: normalizeKeys(seg.keys, from, to) });
  });
  candidates.sort((a, b) => a.from - b.from || a.to - b.to);

  const result = [];
  candidates.forEach((seg) => {
    const prev = result[result.length - 1];
    if (prev && seg.from <= prev.to) return; // enciman: se queda el primero
    result.push(seg);
  });
  cache.set(raw, { last: lastIndex, result });
  return result;
}

// Segmento (ya normalizado) que cubre el cuadro, o null.
export function segmentAt(segments, frame) {
  return segments.find((seg) => frame >= seg.from && frame <= seg.to) ?? null;
}

// Keys del segmento como [[frame, {lon, lat}]] ordenadas.
export function sortedKeys(segment) {
  return Object.keys(segment.keys || {})
    .map((k) => [Number(k), segment.keys[k]])
    .sort((a, b) => a[0] - b[0]);
}

// Posición en el cuadro `frame` dentro de `segment`: antes de la primera key se usa la primera,
// después de la última la última, en medio interpolación lineal por el arco corto en lon. Sin
// keys, `fallback` ({lon, lat} del hotspot).
export function positionInSegment(segment, frame, fallback) {
  const keys = sortedKeys(segment);
  if (!keys.length) return { lon: fallback.lon, lat: fallback.lat };
  if (frame <= keys[0][0]) return { ...keys[0][1] };
  const last = keys[keys.length - 1];
  if (frame >= last[0]) return { ...last[1] };
  for (let i = 0; i < keys.length - 1; i++) {
    const [fa, a] = keys[i];
    const [fb, b] = keys[i + 1];
    if (frame === fa) return { ...a };
    if (frame > fa && frame < fb) {
      const t = (frame - fa) / (fb - fa);
      return { lon: wrapLon(a.lon + shortestLonDelta(a.lon, b.lon) * t), lat: a.lat + (b.lat - a.lat) * t };
    }
  }
  return { ...last[1] };
}

// ¿Se ve el hotspot en el cuadro `frame`? `ownIndex` = posición en el lote del cuadro donde se
// creó (regla vieja cuando no tiene segmentos válidos: solo ahí).
export function hotspotCoversFrame(hotspot, frame, ownIndex, lastIndex = Infinity) {
  const segs = normalizeSegments(hotspot.segments, lastIndex);
  if (segs.length) return Boolean(segmentAt(segs, frame));
  return frame === ownIndex;
}

// Posición del hotspot en `frame` ({lon, lat}) o null si no se ve ahí.
export function hotspotPositionAt(hotspot, frame, ownIndex, lastIndex = Infinity) {
  const segs = normalizeSegments(hotspot.segments, lastIndex);
  if (segs.length) {
    const seg = segmentAt(segs, frame);
    return seg ? positionInSegment(seg, frame, hotspot) : null;
  }
  return frame === ownIndex ? { lon: hotspot.lon, lat: hotspot.lat } : null;
}

// Segmentos "efectivos" para el editor: los válidos, o (hotspot viejo, sin segmentos) un
// segmento virtual de un solo cuadro en el que fue creado.
export function effectiveSegments(hotspot, ownIndex, lastIndex = Infinity) {
  const segs = normalizeSegments(hotspot.segments, lastIndex);
  if (segs.length) return segs;
  if (!Number.isInteger(ownIndex) || ownIndex < 0) return [];
  return [{ from: ownIndex, to: ownIndex, keys: { [String(ownIndex)]: { lon: hotspot.lon, lat: hotspot.lat } } }];
}

// ── Edición (devuelven segmentos nuevos; nunca mutan) ───────────────────────────────

// Segmento por defecto de un hotspot nuevo creado en el cuadro `frame`: 30 cuadros hacia
// delante (o hasta el último).
export function defaultSegment(frame, lastIndex, pos, span = 30) {
  return { from: frame, to: Math.min(frame + span, lastIndex), keys: { [String(frame)]: { lon: pos.lon, lat: pos.lat } } };
}

// Escribe (o actualiza) la key de `frame` en el segmento que lo cubre. Si ningún segmento lo
// cubre no hace nada.
export function withKey(segments, frame, pos, lastIndex = Infinity) {
  const segs = normalizeSegments(segments, lastIndex);
  return segs.map((seg) =>
    frame >= seg.from && frame <= seg.to
      ? { ...seg, keys: { ...seg.keys, [String(frame)]: { lon: pos.lon, lat: pos.lat } } }
      : seg
  );
}

export function withoutKey(segments, frame, lastIndex = Infinity) {
  return normalizeSegments(segments, lastIndex).map((seg) => {
    if (!(String(frame) in seg.keys)) return seg;
    const keys = { ...seg.keys };
    delete keys[String(frame)];
    return { ...seg, keys };
  });
}

// Cambia el rango del segmento `index`: lo recorta a [0, lastIndex], a `from ≤ to` y a que no
// pise a los vecinos. Las keys que queden fuera se descartan al normalizar.
export function withRange(segments, index, from, to, lastIndex) {
  const segs = normalizeSegments(segments, lastIndex);
  const seg = segs[index];
  if (!seg) return segs;
  const minFrom = index > 0 ? segs[index - 1].to + 1 : 0;
  const maxTo = index < segs.length - 1 ? segs[index + 1].from - 1 : lastIndex;
  const nextFrom = Math.max(minFrom, Math.min(Math.round(from), seg.to));
  const nextTo = Math.min(maxTo, Math.max(Math.round(to), nextFrom));
  const clipped = { ...seg, from: nextFrom, to: nextTo };
  return segs.map((s, i) => (i === index ? { ...clipped, keys: normalizeKeys(seg.keys, nextFrom, nextTo) } : s));
}
