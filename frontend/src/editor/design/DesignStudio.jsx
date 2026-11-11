import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useDesignEditor, useDesignState } from "../hooks/useTourDesign.jsx";
import { useStudio } from "./StudioContext.jsx";
import StudioHeader from "./StudioHeader.jsx";
import DesignCanvas from "./canvas/DesignCanvas.jsx";
import LeftRail from "./panels/LeftRail.jsx";
import ContextToolbar from "./panels/ContextToolbar.jsx";
import "./DesignStudio.css";
import InterfacePages, { PanelBinding } from "./InterfacePages.jsx";

// Esqueleto del estudio (dueño: arquitecto). Las piezas son de cada agente (docs/CONTRATO_OLEADA3.md):
//   ┌───────────────────────── StudioHeader (arquitecto) ─────────────────────────┐
//   ├──────────┬──────────────────── ContextToolbar (C2) ─────────────────────────┤
//   │ LeftRail │                                                                   │
//   │  (C2)    │                     DesignCanvas (C1)                             │
//   │ + cajón  │            mesa de trabajo + selección + barra inferior           │
//   └──────────┴───────────────────────────────────────────────────────────────────┘
export default function DesignStudio() {
  const store = useDesignEditor();
  const [params] = useSearchParams();
  const ready = useDesignState((s) => s.design !== null);
  const { baseDoc, error } = useStudio();
  useEffect(() => {
    if (!ready || !baseDoc) return;
    const panelId = params.get("panel");
    if (panelId && store.getState().design.panels?.some((p) => p.id === panelId)) store.setScreen(`panel:${panelId}`);
    else if (params.get("tab") === "hotspots") store.openPanel("drawer:hotspots");
  }, [ready, baseDoc, params, store]);

  return (
    <div className="studio">
      <StudioHeader />
      {error && <div className="studio-error">{error}</div>}
      {!ready || !baseDoc ? (
        <div className="studio-loading">
          <span className="spinner" />
          Cargando el diseño…
        </div>
      ) : (
        <div className="studio-body">
          <LeftRail />
          <div className="studio-main">
            <InterfacePages />
            <div className="studio-workspace">
              <div className="studio-canvas-controls"><ContextToolbar /><PanelBinding /></div>
              <DesignCanvas />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
