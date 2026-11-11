// Qué hotspots se ven en un cuadro y dónde (lógica pura, sin DOM ni three). Dueño en la
// Oleada 2: B1 (segmentos + keyframes, plan §3.6).
//
// Devuelve [{ hotspot, lon, lat }]: la posición va aparte del hotspot porque con keyframes
// cambia de cuadro en cuadro sin que cambie el hotspot.
//
// Reglas:
//   - Panorámicas (lote de 1, sin video): los hotspots de la propia escena, en su lon/lat.
//   - Lote de video: cualquier hotspot de CUALQUIER cuadro del lote cuyo segmento cubra el
//     cuadro, en la posición interpolada por sus keyframes. Un hotspot sin segmentos (datos
//     viejos) se ve solo en su propio cuadro, en su lon/lat.
// El orden es estable (cuadro de origen, luego orden del documento) para que el conjunto
// "idéntico" que compara markerLayer no cambie de orden al mover el scrubber.
import { normalizeSegments, positionInSegment, segmentAt } from "./segments.js";

export function hotspotsForFrame(model, batch, frameIndex) {
  const scene = batch?.scenes[frameIndex];
  if (!scene) return [];

  if (scene.origen !== "video_frame") {
    return (model.hotspotsByScene.get(scene.id) || []).map((hotspot) => ({
      hotspot,
      lon: hotspot.lon,
      lat: hotspot.lat,
    }));
  }

  const lastIndex = batch.scenes.length - 1;
  const placed = [];
  batch.scenes.forEach((own, ownIndex) => {
    (model.hotspotsByScene.get(own.id) || []).forEach((hotspot) => {
      const segments = normalizeSegments(hotspot.segments, lastIndex);
      if (!segments.length) {
        if (ownIndex === frameIndex) placed.push({ hotspot, lon: hotspot.lon, lat: hotspot.lat });
        return;
      }
      const segment = segmentAt(segments, frameIndex);
      if (!segment) return;
      const { lon, lat } = positionInSegment(segment, frameIndex, hotspot);
      placed.push({ hotspot, lon, lat });
    });
  });
  return placed;
}
