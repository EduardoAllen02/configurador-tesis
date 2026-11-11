import { useEffect, useRef } from "react";
import { createTourRuntime } from "../../runtime/index.js";

// Envoltorio delgado del motor del tour (modo view): lo crea al montar, le pasa el documento
// cuando cambia y lo destruye al desmontar. Toda la lógica (lotes, hotspots por cuadro,
// topbar, scrubber, panel) vive en runtime/; esto solo traduce eventos a props.
export default function TourViewer({
  doc,
  initialSceneId,
  onSceneChange,
  onFrameChange,
  onHotspotOpen,
  className,
  style,
}) {
  const containerRef = useRef(null);
  const runtimeRef = useRef(null);
  const docRef = useRef(doc);
  const initialSceneIdRef = useRef(initialSceneId);
  // Los callbacks viven en un ref: cambiarlos no debe recrear el motor.
  const callbacksRef = useRef({});
  callbacksRef.current = { onSceneChange, onFrameChange, onHotspotOpen };

  useEffect(() => {
    const runtime = createTourRuntime(containerRef.current, docRef.current, {
      mode: "view",
      initialSceneId: initialSceneIdRef.current,
    });
    runtimeRef.current = runtime;
    runtime.on("scenechange", (e) => callbacksRef.current.onSceneChange?.(e.sceneId));
    runtime.on("framechange", (e) => callbacksRef.current.onFrameChange?.(e));
    runtime.on("hotspotopen", (e) => callbacksRef.current.onHotspotOpen?.(e.hotspot));
    return () => {
      runtime.destroy();
      runtimeRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (doc !== docRef.current) {
      docRef.current = doc;
      runtimeRef.current?.setDocument(doc);
    }
  }, [doc]);

  return <div ref={containerRef} className={className} style={{ position: "relative", width: "100%", height: "100%", ...style }} />;
}
