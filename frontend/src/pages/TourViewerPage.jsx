import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { previewEditorHref } from "../editor/components/previewNavigation.js";
import TourViewer from "../viewer/components/TourViewer.jsx";
import AppShell from "../components/ui/AppShell.jsx";
import { PencilIcon } from "../components/ui/Icon.jsx";
import { api } from "../api/client";

// Visor del tour a pantalla completa. El motor (runtime/) pinta el topbar, el selector de
// escenas, el contador, el scrubber y el panel de detalle; la página solo aporta el AppShell
// y el acceso a "Editar". El documento sale del mismo serializador que usa el export, así
// que lo que se ve aquí es lo que se exporta.
export default function TourViewerPage() {
  const { tourId } = useParams();
  const location = useLocation();
  const [doc, setDoc] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setDoc(null);
    setError(null);
    api
      .get(`/api/tours/${tourId}/document`)
      .then((loaded) => {
        if (!cancelled) setDoc(loaded);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [tourId]);

  return (
    <AppShell fullBleed className="app-shell--viewer" crumbs={[{ label: doc?.tour.title ?? "Cargando…" }]} headerAction={<Link to={previewEditorHref(tourId, location)} className="btn btn-secondary btn-sm"><PencilIcon width={15} height={15} />Volver a editar</Link>}>
      <div className="tour-viewer-page">
        {error && <p className="error-text" style={{ padding: "var(--space-4)" }}>{error}</p>}
        {doc && (
          <TourViewer doc={doc} />
        )}
      </div>
    </AppShell>
  );
}
