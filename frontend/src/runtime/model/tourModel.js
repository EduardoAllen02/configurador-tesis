// Lógica pura del documento (sin DOM ni three): lotes, visibilidad de hotspots, entradas del
// selector. Vive aparte para poder probarla en Node y para que app y export compartan el
// mismo criterio.

// Un lote agrupa los cuadros de un video, que se recorren con el scrubber. Se identifica por
// batchId o, si no hay, por videoUploadId (datos viejos). Las panorámicas son siempre un lote
// de 1 aunque compartan batchId: ese batchId solo recuerda que se subieron juntas, y se
// navegan por hotspots, no con la barra.
export function batchKeyOf(scene) {
  if (scene.origen !== "video_frame") return `scene:${scene.id}`;
  return scene.batchId || scene.videoUploadId || `scene:${scene.id}`;
}

function byOrderIndex(a, b) {
  return (a.orderIndex ?? 0) - (b.orderIndex ?? 0);
}

export function buildModel(doc) {
  const scenes = [...(doc?.scenes || [])].sort(byOrderIndex); // sort estable: empates conservan el orden del documento
  const batchMap = new Map(); // key -> { key, scenes: [] }
  scenes.forEach((scene) => {
    const key = batchKeyOf(scene);
    if (!batchMap.has(key)) batchMap.set(key, { key, scenes: [] });
    batchMap.get(key).scenes.push(scene);
  });
  const batches = [...batchMap.values()]; // en orden de primera aparición

  const sceneById = new Map();
  const batchByScene = new Map(); // sceneId -> { batch, index }
  batches.forEach((batch) => {
    batch.scenes.forEach((scene, index) => {
      sceneById.set(scene.id, scene);
      batchByScene.set(scene.id, { batch, index });
    });
  });

  const hotspotsByScene = new Map();
  (doc?.hotspots || []).forEach((hotspot) => {
    if (!hotspotsByScene.has(hotspot.sceneId)) hotspotsByScene.set(hotspot.sceneId, []);
    hotspotsByScene.get(hotspot.sceneId).push(hotspot);
  });

  return { scenes, batches, sceneById, batchByScene, hotspotsByScene };
}

// Regla de la Oleada 1: un hotspot se ve SOLO en el cuadro de su propia escena.
export function visibleHotspots(model, sceneId) {
  return model.hotspotsByScene.get(sceneId) || [];
}

// Estilo efectivo: el propio del hotspot, y si no, el preset de su tipo en el diseño.
export function effectiveHotspotStyle(hotspot, design) {
  return hotspot.style ?? design?.hotspotPresets?.[hotspot.type] ?? null;
}

function sceneFallbackLabel(scene, position) {
  return scene.label || scene.name || `Escena ${position + 1}`;
}

// Entradas del selector de escenas: una por panorámica suelta y UNA por lote (aunque tenga
// 60 cuadros). Nunca con la etiqueta en blanco.
export function buildPickerEntries(model) {
  return model.batches.map((batch, i) => {
    const first = batch.scenes[0];
    const count = batch.scenes.length;
    let label;
    if (count === 1) {
      label = sceneFallbackLabel(first, model.scenes.indexOf(first));
    } else {
      const named = first.name?.trim();
      label = named || `Recorrido ${i + 1} (${count} cuadros)`;
    }
    return { key: batch.key, sceneId: first.id, label, count };
  });
}

// Escena y cuadro de arranque: `initialSceneId` abre el lote EN ese cuadro; `initialFrame`
// (si viene) manda sobre la posición de la escena dentro del lote.
export function resolveInitial(model, { initialSceneId, initialFrame } = {}) {
  const first = model.scenes[0];
  if (!first) return null;
  const scene = (initialSceneId && model.sceneById.get(initialSceneId)) || first;
  const { batch, index } = model.batchByScene.get(scene.id);
  const frame = Number.isInteger(initialFrame)
    ? Math.max(0, Math.min(batch.scenes.length - 1, initialFrame))
    : index;
  return { batch, frameIndex: frame };
}
