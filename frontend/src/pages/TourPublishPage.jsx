import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../auth/useAuth.js";
import { useInvitations } from "../editor/hooks/useInvitations.js";
import { useExports } from "../editor/hooks/useExports.js";
import AppShell from "../components/ui/AppShell.jsx";
import EditorHeader from "../editor/components/EditorHeader.jsx";
import InvitationPanel from "../editor/components/InvitationPanel.jsx";
import TourAccessPanel from "../editor/components/TourAccessPanel.jsx";
import ExportPanel from "../editor/components/ExportPanel.jsx";

// Pestaña "Publicar" del editor (plan §3.9): exportar el tour y compartirlo por enlace.
export default function TourPublishPage() {
  const { tourId } = useParams();
  const { user } = useAuth();
  const canManageAccess = user?.globalRole === "admin" || user?.globalRole === "super_admin";
  const [tour, setTour] = useState(null);
  const { invitations, error: invitationsError, createInvitation, removeInvitation } = useInvitations(
    tourId,
    canManageAccess
  );
  const { exports, error: exportsError, exporting, createExport } = useExports(tourId);

  useEffect(() => {
    api.get(`/api/tours/${tourId}`).then(setTour).catch(() => {});
  }, [tourId]);

  return (
    <AppShell className="publish-editor-page" header={<EditorHeader tourId={tourId} title={tour?.title ?? "Cargando…"} />}>
      <div className="page-header">
        <div>
          <h1 className="page-title">{tour?.title ?? "Publicar"}</h1>
          <p className="page-subtitle">Exporta el recorrido para publicarlo en cualquier hosting, o compártelo por enlace.</p>
        </div>
      </div>

      <section className="section">
        <div className="section-header">
          <span className="section-title">Exportar</span>
        </div>
        <ExportPanel exports={exports} error={exportsError} exporting={exporting} onExport={createExport} />
      </section>

      {canManageAccess && (
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
      )}

      {canManageAccess && (
        <section className="section">
          <div className="section-header">
            <span className="section-title">Quién tiene acceso</span>
          </div>
          <TourAccessPanel tourId={tourId} />
        </section>
      )}
    </AppShell>
  );
}
