import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useSceneEditor } from "../editor/hooks/useSceneEditor.js";
import { useHotspotEditor } from "../editor/hooks/useHotspotEditor.js";
import { useInvitations } from "../editor/hooks/useInvitations.js";
import { useExports } from "../editor/hooks/useExports.js";
import SceneList from "../editor/components/SceneList.jsx";
import SceneForm from "../editor/components/SceneForm.jsx";
import VideoUploadForm from "../editor/components/VideoUploadForm.jsx";
import HotspotList from "../editor/components/HotspotList.jsx";
import HotspotForm from "../editor/components/HotspotForm.jsx";
import InvitationPanel from "../editor/components/InvitationPanel.jsx";
import ExportPanel from "../editor/components/ExportPanel.jsx";

export default function TourEditorPage() {
  const { tourId } = useParams();
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

  return (
    <div style={{ maxWidth: 720, margin: "2rem auto" }}>
      <Link to="/tours">← Tours</Link>
      <h1>Editar tour</h1>

      <section>
        <h2>Escenas</h2>
        <SceneList scenes={scenes} activeSceneId={activeSceneId} onSelect={setActiveSceneId} onRemove={removeScene} />
        <SceneForm onUpload={uploadPanorama} />
        <VideoUploadForm onUpload={uploadVideo} />
        {scenesError && <p style={{ color: "salmon" }}>{scenesError}</p>}
      </section>

      {activeSceneId && (
        <section>
          <h2>Hotspots de la escena seleccionada</h2>
          <HotspotList hotspots={hotspots} onRemove={removeHotspot} />
          <HotspotForm scenes={scenes} currentSceneId={activeSceneId} onCreate={createHotspot} />
          {hotspotsError && <p style={{ color: "salmon" }}>{hotspotsError}</p>}
        </section>
      )}

      <section>
        <h2>Compartir por enlace</h2>
        <InvitationPanel
          invitations={invitations}
          error={invitationsError}
          onCreate={createInvitation}
          onRemove={removeInvitation}
        />
      </section>

      <section>
        <h2>Exportar</h2>
        <ExportPanel exports={exports} error={exportsError} exporting={exporting} onExport={createExport} />
      </section>
    </div>
  );
}
