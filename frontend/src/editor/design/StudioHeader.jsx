import EditorHeader from "../components/EditorHeader.jsx";
import { useDesignEditor, useDesignState } from "../hooks/useTourDesign.jsx";
import { useStudio } from "./StudioContext.jsx";
import { useLocation } from "react-router-dom";
import { previewHref } from "../components/previewNavigation.js";

const STATUS_TEXT = {
  loading: "Cargando…",
  saved: "Guardado",
  dirty: "Cambios sin guardar",
  saving: "Guardando…",
  error: "No se pudo guardar",
};

// Cabecera del estudio: volver, título, pestañas, deshacer/rehacer y estado del guardado.
export default function StudioHeader() {
  const store = useDesignEditor();
  const { tourId, tour } = useStudio();
  const status = useDesignState((s) => s.status);
  const canUndo = useDesignState((s) => s.canUndo);
  const canRedo = useDesignState((s) => s.canRedo);
  const location = useLocation();
  const previewUrl = previewHref(tourId, location.pathname);
  const openPreview = async (event) => {
    if (!store.hasUnsavedChanges()) return;
    event.preventDefault();
    // Abrir durante el gesto evita bloqueos de ventanas; navegar espera al guardado.
    const preview = window.open("about:blank", "_blank");
    if (preview) preview.opener = null;
    try {
      await store.flush();
      if (preview) preview.location.replace(previewUrl);
      else window.location.assign(previewUrl);
    } catch {
      preview?.close(); // el estado del almacén muestra el error y permite reintentar
    }
  };

  return (
    <EditorHeader tourId={tourId} title={tour?.title ?? "Interfaz"} onPreview={openPreview} previewTarget="_blank">
        <button type="button" className="btn btn-ghost btn-sm editor-history" onClick={() => store.undo()} disabled={!canUndo} title="Deshacer (Ctrl+Z)" aria-label="Deshacer">
          <span className="editor-history-icon" aria-hidden="true">↶</span><span className="editor-history-label">Deshacer</span>
        </button>
        <button type="button" className="btn btn-ghost btn-sm editor-history" onClick={() => store.redo()} disabled={!canRedo} title="Rehacer (Ctrl+Y)" aria-label="Rehacer">
          <span className="editor-history-icon" aria-hidden="true">↷</span><span className="editor-history-label">Rehacer</span>
        </button>
        <span className={`studio-status studio-status--${status}`} role="status">
          {STATUS_TEXT[status] ?? ""}
        </span>
        {status === "error" && (
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => store.flush().catch(() => {})}>
            Reintentar
          </button>
        )}
    </EditorHeader>
  );
}
