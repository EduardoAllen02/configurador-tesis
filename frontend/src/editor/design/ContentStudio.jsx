import { useEffect } from "react";
import { StudioProvider, useStudio } from "./StudioContext.jsx";
import { useDesignEditor, useDesignState } from "../hooks/useTourDesign.jsx";
import DesignCanvas from "./canvas/DesignCanvas.jsx";
import LeftRail from "./panels/LeftRail.jsx";
import ContextToolbar from "./panels/ContextToolbar.jsx";
import "./DesignStudio.css";

export default function ContentStudio({ tourId, sceneId, sceneRevision }) {
  return <StudioProvider tourId={tourId} sceneRevision={sceneRevision}><ContentLayer sceneId={sceneId} /></StudioProvider>;
}

function ContentLayer({ sceneId }) {
  const store = useDesignEditor();
  const ready = useDesignState((s) => !!s.design);
  const { baseDoc, error } = useStudio();
  useEffect(() => {
    store.setScreen("tour");
    store.setInsertionScene?.(sceneId);
    return () => store.setInsertionScene?.(null);
  }, [sceneId, store]);
  if (error) return <p className="error-text">{error}</p>;
  if (!ready || !baseDoc) return <p>Cargando la interfaz…</p>;
  return <div className="content-studio" role="region" aria-label="Elementos 2D de la escena">
    <div className="studio-body"><LeftRail /><div className="studio-main"><div className="studio-workspace"><div className="studio-canvas-controls"><ContextToolbar /></div><DesignCanvas contentMode contentSceneId={sceneId} /></div></div></div>
  </div>;
}
