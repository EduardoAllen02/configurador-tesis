import { useRef, useState } from "react";
import { api } from "../../api/client";
import { useEditorViewer } from "../hooks/useEditorViewer.js";
import HotspotTypePopover from "./HotspotTypePopover.jsx";

// Lienzo de edición: la panorámica activa en vivo, con clic derecho para colocar un
// hotspot y arrastre para reposicionar uno existente — reemplaza el viejo flujo de
// "escribe longitud/latitud a ciegas". "popover" trae su propio modo (creando vs.
// editando uno existente) y su posición de anclaje en pantalla.
export default function EditorViewer({ scene, hotspots, scenes, onCreateHotspot, onUpdateHotspot, onDeleteHotspot }) {
  const containerRef = useRef(null);
  const [popover, setPopover] = useState(null); // { hotspot?, initial?, anchor }

  const { ready, loadError } = useEditorViewer({
    containerRef,
    webpPath: scene ? api.uploadUrl(scene.webpPath) : null,
    hotspots,
    initialYaw: scene?.initialYaw,
    initialPitch: scene?.initialPitch,
    onRequestCreateHotspot: ({ lon, lat, clientX, clientY }) => {
      setPopover({ initial: { lon, lat }, anchor: { x: clientX, y: clientY } });
    },
    onHotspotMoved: (hotspotId, { lon, lat }) => {
      onUpdateHotspot(hotspotId, { lon, lat });
    },
    onOpenHotspot: (hotspot, rect) => {
      setPopover({ hotspot, anchor: { x: rect.right, y: rect.top + rect.height / 2 } });
    },
  });

  async function handleSave(data) {
    if (popover.hotspot) {
      await onUpdateHotspot(popover.hotspot.id, data);
    } else {
      await onCreateHotspot({ ...data, lon: popover.initial.lon, lat: popover.initial.lat });
    }
    setPopover(null);
  }

  async function handleDelete() {
    await onDeleteHotspot(popover.hotspot.id);
    setPopover(null);
  }

  return (
    <div className="editor-viewer">
      <div ref={containerRef} className="editor-viewer-canvas" />
      {loadError && (
        <div className="editor-viewer-loading">No pudimos cargar esta panorámica. Prueba subiéndola de nuevo.</div>
      )}
      {!ready && !loadError && (
        <div className="editor-viewer-loading">
          <span className="spinner" />
          Cargando panorámica…
        </div>
      )}
      {ready && (
        <p className="editor-viewer-hint">Clic derecho para agregar un hotspot · arrastra uno para moverlo</p>
      )}
      {popover && (
        <HotspotTypePopover
          hotspot={popover.hotspot}
          anchor={popover.anchor}
          scenes={scenes}
          currentSceneId={scene?.id}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => setPopover(null)}
        />
      )}
    </div>
  );
}
