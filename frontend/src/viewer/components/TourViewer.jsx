import { useMemo, useRef, useState } from "react";
import { api } from "../../api/client";
import { useTourViewer } from "../hooks/useTourViewer.js";
import TimelineScrubber from "./TimelineScrubber.jsx";
import HotspotDetailPanel from "./HotspotDetailPanel.jsx";

// Decide el modo de navegación según el origen de la escena activa:
//   - panorama_upload: una sola textura fija, sin scrubber, hotspots tipo nav saltan de escena.
//   - video_frame: secuencia continua de frames hermanos (mismo videoUploadId), con scrubber.
//
// `theme` (Tour.theme — Track A) se aplica como variables CSS en el contenedor raíz, así
// cascadea a los marcadores CSS2D (hijos del mismo contenedor) y al scrubber sin necesidad
// de pasarlo como prop a cada uno — solo HotspotDetailPanel lo recibe directo, porque
// tooltipStyle cambia colores base (fondo/texto), no solo un acento.
export default function TourViewer({ scenes, activeSceneId, onSceneChange, theme }) {
  const containerRef = useRef(null);
  const [openHotspot, setOpenHotspot] = useState(null);

  const activeScene = scenes.find((s) => s.id === activeSceneId);

  const siblingScenes = useMemo(() => {
    if (!activeScene) return [];
    if (activeScene.origen !== "video_frame") return [activeScene];
    if (!activeScene.videoUploadId) return [activeScene];
    return scenes
      .filter((s) => s.origen === "video_frame" && s.videoUploadId === activeScene.videoUploadId)
      .sort((a, b) => a.orderIndex - b.orderIndex);
  }, [scenes, activeScene]);

  const frames = useMemo(() => siblingScenes.map((s) => api.uploadUrl(s.webpPath)), [siblingScenes]);
  const hotspots = useMemo(() => siblingScenes.flatMap((s) => s.hotspots || []), [siblingScenes]);

  function handleHotspotOpen(hotspot) {
    if (hotspot.type === "nav") {
      onSceneChange(hotspot.targetSceneId);
      return;
    }
    setOpenHotspot(hotspot);
  }

  const { currentIndex, totalFrames, goToFrame } = useTourViewer({
    containerRef,
    frames,
    hotspots,
    initialYaw: activeScene?.initialYaw,
    initialPitch: activeScene?.initialPitch,
    onHotspotOpen: handleHotspotOpen,
  });

  if (!activeScene) return <p>Escena no encontrada.</p>;

  const style = {
    position: "relative",
    width: "100%",
    height: "100%",
    "--tour-accent": theme?.accentColor || "#4da3ff",
    "--tour-radius": `${theme?.borderRadius ?? 8}px`,
  };

  return (
    <div style={style} ref={containerRef}>
      {totalFrames > 1 && (
        <TimelineScrubber totalFrames={totalFrames} currentIndex={currentIndex} onSeek={goToFrame} />
      )}
      <HotspotDetailPanel
        hotspot={openHotspot}
        onClose={() => setOpenHotspot(null)}
        tooltipStyle={theme?.tooltipStyle}
      />
    </div>
  );
}
