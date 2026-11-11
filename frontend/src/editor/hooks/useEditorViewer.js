import { useEffect, useRef, useState } from "react";
import { createTourRuntime } from "../../runtime/index.js";

// Monta el motor del tour en modo `edit` sobre el contenedor y traduce sus eventos a los
// callbacks del editor: clic derecho para crear (contextmenu), arrastre para reposicionar
// (hotspotmove) y clic en un marcador (hotspotclick: el editor decide si abre el popover o
// navega). El motor es el mismo del visor; aquí solo vive lo propio de editar.
//
// El motor se crea UNA vez (mientras haya escena). Cambiar de escena es `goToScene` y crear,
// mover o borrar un hotspot es `setDocument`: ninguno recrea el contexto WebGL ni mueve la
// cámara (solo al cambiar de escena se orienta a su yaw/pitch inicial, como antes).
//
// Video: los cuadros de un lote se recorren con `goToFrame` (el motor emite `framechange` y
// `onFrameChange(sceneId)` deja que la página siga el cuadro actual). `hotspotmove` llega con
// el cuadro donde se soltó ({ lon, lat, sceneId, frameIndex }).
export function useEditorViewer({
  containerRef,
  doc,
  selectedHotspotId,
  sceneId,
  onRequestCreateHotspot,
  onHotspotMoved,
  onHotspotStyleMoved,
  onHotspotResized,
  onEditHotspotPiece,
  onOpenHotspot,
  onNavigateHotspot,
  onFrameChange,
}) {
  const runtimeRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(false);

  // Los callbacks y el estado vigente viven en refs para no reconstruir el motor por un render.
  const callbacksRef = useRef({});
  callbacksRef.current = { onRequestCreateHotspot, onHotspotMoved, onHotspotStyleMoved, onHotspotResized, onEditHotspotPiece, onOpenHotspot, onNavigateHotspot, onFrameChange };
  const latestRef = useRef({});
  latestRef.current = { doc, sceneId };

  const hasScene = Boolean(sceneId);

  useEffect(() => {
    if (!containerRef.current || !hasScene) return undefined;
    const { doc: initialDoc, sceneId: initialSceneId } = latestRef.current;
    const runtime = createTourRuntime(containerRef.current, initialDoc, { mode: "edit", initialSceneId });
    runtimeRef.current = runtime;
    setReady(false);
    setLoadError(false);

    runtime.on("sceneready", (e) => {
      if (e.sceneId === latestRef.current.sceneId) setReady(true);
    });
    runtime.on("loaderror", (e) => {
      if (e.sceneId === latestRef.current.sceneId) setLoadError(true);
    });
    runtime.on("contextmenu", (e) => callbacksRef.current.onRequestCreateHotspot?.(e));
    runtime.on("hotspotmove", ({ id, lon, lat, sceneId: movedSceneId, frameIndex }) =>
      callbacksRef.current.onHotspotMoved?.(id, { lon, lat, sceneId: movedSceneId, frameIndex })
    );
    runtime.on("framechange", (e) => callbacksRef.current.onFrameChange?.(e.sceneId));
    runtime.on("hotspotstylechange", ({ id, style }) => callbacksRef.current.onHotspotStyleMoved?.(id, style));
    runtime.on("hotspoteditpiece", ({ hotspot, piece, rect }) => callbacksRef.current.onEditHotspotPiece?.(hotspot, piece, rect));
    runtime.on("hotspotresize", ({ id, patch }) => callbacksRef.current.onHotspotResized?.(id, patch));
    runtime.on("hotspotclick", ({ hotspot, rect }) => {
      callbacksRef.current.onOpenHotspot?.(hotspot, rect);
    });

    return () => {
      runtime.destroy();
      runtimeRef.current = null;
      setReady(false);
    };
  }, [containerRef, hasScene]);

  useEffect(() => {
    runtimeRef.current?.setDocument(doc);
  }, [doc]);
  useEffect(() => { runtimeRef.current?.selectHotspot(selectedHotspotId); }, [doc, selectedHotspotId]);

  useEffect(() => {
    if (!sceneId) return;
    const runtime = runtimeRef.current;
    if (!runtime || runtime.getState().sceneId === sceneId) return;
    setReady(false);
    setLoadError(false);
    runtime.goToScene(sceneId);
  }, [sceneId]);

  function focusHotspot(lon, lat) {
    runtimeRef.current?.focus(lon, lat, 600);
  }

  function goToFrame(index) {
    runtimeRef.current?.goToFrame(index);
  }

  return { ready, loadError, focusHotspot, goToFrame, setHotspotTesting: value => runtimeRef.current?.setHotspotTesting(value), previewHotspotDetail: (id, show) => runtimeRef.current?.previewHotspotDetail(id, show) };
}
