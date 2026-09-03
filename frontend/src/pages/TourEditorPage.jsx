import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api/client";
import { useSceneEditor } from "../editor/hooks/useSceneEditor.js";
import { useHotspotEditor } from "../editor/hooks/useHotspotEditor.js";
import { useInvitations } from "../editor/hooks/useInvitations.js";
import { useExports } from "../editor/hooks/useExports.js";
import AppShell from "../components/ui/AppShell.jsx";
import SceneList from "../editor/components/SceneList.jsx";
import SceneForm from "../editor/components/SceneForm.jsx";
import VideoUploadForm from "../editor/components/VideoUploadForm.jsx";
import HotspotList from "../editor/components/HotspotList.jsx";
import HotspotForm from "../editor/components/HotspotForm.jsx";
import InvitationPanel from "../editor/components/InvitationPanel.jsx";
import ExportPanel from "../editor/components/ExportPanel.jsx";
import { sceneLabel } from "../editor/utils/sceneLabel.js";

export default function TourEditorPage() {
  const { tourId } = useParams();
  const [tour, setTour] = useState(null);
  const {
    scenes,
    error: scenesError,
    uploadPanorama,
    uploadVideo,
    removeScene,
  } = useSceneEditor(tourId);
  const [activeSceneId, setActiveSceneId] = useState(null);
  const { hotspots, error: hotspotsError, createHotspot, removeHotspot } = useHotspotEditor(
    tourId,
    activeSceneId
  );
  const { invitations, error: invitationsError, createInvitation, removeInvitation } = useInvitations(tourId);
  const { exports, error: exportsError, exporting, createExport } = useExports(tourId);

  useEffect(() => {
    api.get(`/api/tours/${tourId}`).then(setTour).catch(() => {});
  }, [tourId]);

  const activeSceneIndex = scenes.findIndex((s) => s.id === activeSceneId);
  const activeScene = scenes[activeSceneIndex];

  return (
    <AppShell crumbs={[{ label: tour?.title ?? "Cargando…" }]}>
      <div className="page-header">
        <div>
          <h1 className="page-title">{tour?.title ?? "Editar tour"}</h1>
          <p className="page-subtitle">Sube escenas, agrega hotspots, personaliza el acceso y publica tu tour.</p>
        </div>
      </div>

      <section className="section">
        <div className="section-header">
          <span className="section-title">Escenas</span>
          <span className="section-hint">{scenes.length} en total</span>
        </div>
        <div className="card card-pad" style={{ marginBottom: "var(--space-4)" }}>
          <SceneList scenes={scenes} activeSceneId={activeSceneId} onSelect={setActiveSceneId} onRemove={removeScene} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "var(--space-4)" }}>
          <SceneForm onUpload={uploadPanorama} />
          <VideoUploadForm onUpload={uploadVideo} />
        </div>
        {scenesError && <p className="error-text" style={{ marginTop: "var(--space-3)" }}>{scenesError}</p>}
      </section>

      {activeScene && (
        <section className="section">
          <div className="section-header">
            <span className="section-title">Hotspots — {sceneLabel(activeScene, activeSceneIndex)}</span>
            <span className="section-hint">{hotspots.length} en esta escena</span>
          </div>
          <div className="stack">
            <HotspotList hotspots={hotspots} onRemove={removeHotspot} />
            <HotspotForm scenes={scenes} currentSceneId={activeSceneId} onCreate={createHotspot} />
          </div>
          {hotspotsError && <p className="error-text" style={{ marginTop: "var(--space-3)" }}>{hotspotsError}</p>}
        </section>
      )}

      <section className="section">
        <div className="section-header">
          <span className="section-title">Compartir por enlace</span>
        </div>
        <InvitationPanel
          invitations={invitations}
          error={invitationsError}
          onCreate={createInvitation}
          onRemove={removeInvitation}
        />
      </section>

      <section className="section">
        <div className="section-header">
          <span className="section-title">Exportar</span>
        </div>
        <ExportPanel exports={exports} error={exportsError} exporting={exporting} onExport={createExport} />
      </section>
    </AppShell>
  );
}
