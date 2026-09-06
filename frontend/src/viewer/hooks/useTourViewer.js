import { useEffect, useRef, useState } from "react";
import { createViewerScene } from "../core/sceneSetup.js";
import { attachCameraControls } from "../core/cameraControls.js";
import { createTextureCache } from "../core/textureCache.js";
import { lonLatToVec3 } from "../core/lonLatToVec3.js";
import { buildHotspotMarkerEl } from "../core/hotspotMarkerEl.js";
import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";

// Hook orquestador del visor. `frames` es la secuencia de URLs WebP a navegar (longitud 1
// para una panorámica estática, longitud N para una secuencia continua tipo video). El
// guard `seekTargetRef` evita que una textura vieja sobrescriba el frame activo si el
// usuario hizo varios seeks rápidos seguidos.
export function useTourViewer({
  containerRef,
  frames,
  hotspots,
  initialYaw = 0,
  initialPitch = 0,
  onHotspotOpen,
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const sceneApiRef = useRef(null);
  const goToFrameRef = useRef(() => {});

  useEffect(() => {
    if (!containerRef.current || !frames?.length) return undefined;

    const container = containerRef.current;
    const sceneApi = createViewerScene(container);
    sceneApiRef.current = sceneApi;

    const textureCache = createTextureCache({ frames });
    const markers = [];
    let animationId;
    let disposed = false;
    const seekTargetRef = { current: 0 };

    function renderHotspots() {
      markers.forEach((m) => sceneApi.scene.remove(m));
      markers.length = 0;
      (hotspots || []).forEach((hotspot) => {
        const el = buildHotspotMarkerEl(hotspot, onHotspotOpen);
        const obj = new CSS2DObject(el);
        obj.position.copy(lonLatToVec3(hotspot.lon, hotspot.lat));
        sceneApi.scene.add(obj);
        markers.push(obj);
      });
    }
    renderHotspots();

    function goToFrame(idx) {
      const clamped = Math.max(0, Math.min(frames.length - 1, idx));
      seekTargetRef.current = clamped;
      setCurrentIndex(clamped);

      textureCache.loadTexture(clamped).then((texture) => {
        if (disposed || seekTargetRef.current !== clamped) return;
        sceneApi.sphere.material.map = texture;
        sceneApi.sphere.material.color.set(0xffffff);
        sceneApi.sphere.material.needsUpdate = true;
        textureCache.preloadGPU(clamped);
      });
    }
    goToFrameRef.current = goToFrame;

    const controls = attachCameraControls({
      containerEl: container,
      camera: sceneApi.camera,
      getNadirLat: () => 85,
      onArrowKey: (dir) => goToFrame(seekTargetRef.current + dir),
    });
    controls.animateCameraTo(initialYaw, initialPitch, 0);

    goToFrame(0);

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
      cancelAnimationFrame(animationId);
      resizeObserver.disconnect();
      controls.dispose();
      textureCache.dispose();
      markers.forEach((m) => sceneApi.scene.remove(m));
      sceneApi.dispose();
      sceneApiRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerRef, frames]);

  return {
    currentIndex,
    totalFrames: frames?.length ?? 0,
    goToFrame: (idx) => goToFrameRef.current(idx),
  };
}
