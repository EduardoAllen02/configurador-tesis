import { useEffect, useRef, useState } from "react";
import { createViewerScene } from "../../viewer/core/sceneSetup.js";
import { attachCameraControls } from "../../viewer/core/cameraControls.js";
import { createTextureCache } from "../../viewer/core/textureCache.js";
import { lonLatToVec3 } from "../../viewer/core/lonLatToVec3.js";
import { createHotspotRaycaster } from "../../viewer/core/hotspotEditingRaycaster.js";
import { buildEditableHotspotMarkerEl } from "../core/editableHotspotMarkerEl.js";
import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";

// Hook orquestador del visor de edición: monta una sola panorámica estática (a diferencia
// de useTourViewer, no navega una secuencia de frames) y agrega lo que hace falta para
// editar hotspots directamente sobre la esfera: clic derecho para crear uno nuevo (vía
// raycasting) y arrastre para reposicionar uno existente.
//
// Los marcadores se reconstruyen en un efecto SEPARADO del que monta la escena (dependiente
// solo de `hotspots`), para poder crear/mover/borrar un hotspot sin reiniciar la cámara ni
// recargar la textura — si compartiera el mismo efecto que useTourViewer, cada hotspot nuevo
// remontaría todo el visor y la cámara volvería a su ángulo inicial.
export function useEditorViewer({
  containerRef,
  webpPath,
  hotspots,
  initialYaw = 0,
  initialPitch = 0,
  onRequestCreateHotspot,
  onHotspotMoved,
  onOpenHotspot,
}) {
  const sceneApiRef = useRef(null);
  const raycasterRef = useRef(null);
  const markersRef = useRef([]);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(false);

  // Los callbacks viven en un ref para que la escena (efecto de abajo) no se reconstruya
  // solo porque TourEditorPage pasó una función nueva en el render.
  const callbacksRef = useRef({});
  callbacksRef.current = { onRequestCreateHotspot, onHotspotMoved, onOpenHotspot };

  useEffect(() => {
    if (!containerRef.current || !webpPath) return undefined;

    const container = containerRef.current;
    const sceneApi = createViewerScene(container);
    sceneApiRef.current = sceneApi;
    raycasterRef.current = createHotspotRaycaster({ camera: sceneApi.camera, sphere: sceneApi.sphere });

    const textureCache = createTextureCache({ frames: [webpPath] });
    let animationId;
    let disposed = false;
    setReady(false);
    setLoadError(false);

    textureCache
      .loadTexture(0)
      .then((texture) => {
        if (disposed) return;
        sceneApi.sphere.material.map = texture;
        sceneApi.sphere.material.needsUpdate = true;
        setReady(true);
      })
      .catch(() => {
        if (!disposed) setLoadError(true);
      });

    const controls = attachCameraControls({
      containerEl: container,
      camera: sceneApi.camera,
      getNadirLat: () => 85,
    });
    controls.animateCameraTo(initialYaw, initialPitch, 0);

    function handleContextMenu(e) {
      e.preventDefault();
      const rect = container.getBoundingClientRect();
      const lonLat = raycasterRef.current?.pointToLonLat(e.clientX, e.clientY, rect);
      if (!lonLat) return;
      callbacksRef.current.onRequestCreateHotspot?.({ ...lonLat, clientX: e.clientX, clientY: e.clientY });
    }
    container.addEventListener("contextmenu", handleContextMenu);

    function animate() {
      sceneApi.render();
      animationId = requestAnimationFrame(animate);
    }
    animate();

    const resizeObserver = new ResizeObserver(() => {
      sceneApi.setSize(container.clientWidth, container.clientHeight);
    });
    resizeObserver.observe(container);

    return () => {
      disposed = true;
      setReady(false);
      cancelAnimationFrame(animationId);
      resizeObserver.disconnect();
      container.removeEventListener("contextmenu", handleContextMenu);
      controls.dispose();
      textureCache.dispose();
      markersRef.current.forEach((m) => sceneApi.scene.remove(m));
      markersRef.current = [];
      sceneApi.dispose();
      sceneApiRef.current = null;
      raycasterRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerRef, webpPath]);

  useEffect(() => {
    const sceneApi = sceneApiRef.current;
    if (!sceneApi) return undefined;

    markersRef.current.forEach((m) => sceneApi.scene.remove(m));
    markersRef.current = [];

    (hotspots || []).forEach((hotspot) => {
      let obj;
      const el = buildEditableHotspotMarkerEl(hotspot, {
        onOpen: (hs, btnEl) => callbacksRef.current.onOpenHotspot?.(hs, btnEl.getBoundingClientRect()),
        onDragMove: (clientX, clientY) => {
          const rect = containerRef.current?.getBoundingClientRect();
          const lonLat = rect && raycasterRef.current?.pointToLonLat(clientX, clientY, rect);
          if (lonLat) obj.position.copy(lonLatToVec3(lonLat.lon, lonLat.lat));
        },
        onDragEnd: (clientX, clientY) => {
          const rect = containerRef.current?.getBoundingClientRect();
          const lonLat = rect && raycasterRef.current?.pointToLonLat(clientX, clientY, rect);
          if (lonLat) callbacksRef.current.onHotspotMoved?.(hotspot.id, lonLat);
        },
      });
      obj = new CSS2DObject(el);
      obj.position.copy(lonLatToVec3(hotspot.lon, hotspot.lat));
      sceneApi.scene.add(obj);
      markersRef.current.push(obj);
    });
  }, [hotspots, ready, containerRef]);

  return { ready, loadError };
}
