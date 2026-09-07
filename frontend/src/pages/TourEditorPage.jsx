import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../auth/useAuth.js";
import { useSceneEditor } from "../editor/hooks/useSceneEditor.js";
import { useHotspotEditor } from "../editor/hooks/useHotspotEditor.js";
import { useInvitations } from "../editor/hooks/useInvitations.js";
import { useExports } from "../editor/hooks/useExports.js";
import AppShell from "../components/ui/AppShell.jsx";
import Disclosure from "../components/ui/Disclosure.jsx";
import { UploadIcon, VideoIcon, EyeIcon } from "../components/ui/Icon.jsx";
import SceneRail from "../editor/components/SceneRail.jsx";
import EditorViewer from "../editor/components/EditorViewer.jsx";
import VideoUploadForm from "../editor/components/VideoUploadForm.jsx";
import HotspotList from "../editor/components/HotspotList.jsx";
import InvitationPanel from "../editor/components/InvitationPanel.jsx";
import AppearancePanel from "../editor/components/AppearancePanel.jsx";
import ExportPanel from "../editor/components/ExportPanel.jsx";

export default function TourEditorPage() {
  const { tourId } = useParams();
  const { user } = useAuth();
  const canManageAccess = user?.globalRole === "admin" || user?.globalRole === "super_admin";
  const [tour, setTour] = useState(null);
  const {
    scenes,
    error: scenesError,
    uploadPanoramasBulk,
    reorderScenes,
    uploadVideo,
    removeScene,
  } = useSceneEditor(tourId);
  const [activeSceneId, setActiveSceneId] = useState(null);
  const [showVideoUpload, setShowVideoUpload] = useState(false);
  const editorViewerRef = useRef(null);
  const {
    hotspots,
    error: hotspotsError,
    createHotspot,
    updateHotspot,
    removeHotspot,
  } = useHotspotEditor(tourId, activeSceneId);
  const { invitations, error: invitationsError, createInvitation, removeInvitation } = useInvitations(
    tourId,
    canManageAccess
  );
  const { exports, error: exportsError, exporting, createExport } = useExports(tourId);

  useEffect(() => {
    api.get(`/api/tours/${tourId}`).then(setTour).catch(() => {});
  }, [tourId]);

  // El lienzo siempre muestra una escena — en cuanto hay al menos una, se selecciona la
  // primera automáticamente (nunca queda vacío por default, ni si se borra la activa).
  useEffect(() => {
    if (!scenes.length) {
      if (activeSceneId) setActiveSceneId(null);
      return;
    }
    if (!scenes.some((s) => s.id === activeSceneId)) setActiveSceneId(scenes[0].id);
  }, [scenes, activeSceneId]);

  const activeScene = scenes.find((s) => s.id === activeSceneId);

  async function handleRemoveScene(sceneId) {
    if (!confirm("¿Eliminar esta escena? Sus hotspots también se borran.")) return;
    await removeScene(sceneId);
  }

  async function handleSaveAppearance(data) {
    const updated = await api.patch(`/api/tours/${tourId}`, data);
    setTour(updated);
  }

  return (
    <AppShell crumbs={[{ label: tour?.title ?? "Cargando…" }]}>
      <div className="page-header">
        <div>
          <h1 className="page-title">{tour?.title ?? "Editar tour"}</h1>
          <p className="page-subtitle">
            {scenes.length
              ? "Administra las escenas, hotspots y el acceso de tu tour."
              : "Arrastra tus panorámicas para empezar a armar el recorrido."}
          </p>
        </div>
        <Link to={`/tours/${tourId}/view`} className="btn btn-secondary btn-sm">
          <EyeIcon width={15} height={15} />
          Vista previa
        </Link>
      </div>

      <section className="section">
        {scenes.length === 0 ? (
          <EmptyScenesState
            uploading={false}
            onAddFiles={(files, onProgress) => uploadPanoramasBulk(files, onProgress)}
            showVideoUpload={showVideoUpload}
            onToggleVideoUpload={() => setShowVideoUpload((v) => !v)}
            onUploadVideo={uploadVideo}
          />
        ) : (
          <>
            <div className="editor-layout">
              <SceneRail
                scenes={scenes}
                activeSceneId={activeSceneId}
                onSelect={setActiveSceneId}
                onRemove={handleRemoveScene}
                onReorder={reorderScenes}
                onAddFiles={uploadPanoramasBulk}
              />
              <EditorViewer
                ref={editorViewerRef}
                scene={activeScene}
                hotspots={hotspots}
                scenes={scenes}
                onCreateHotspot={createHotspot}
                onUpdateHotspot={updateHotspot}
                onDeleteHotspot={removeHotspot}
                onNavigateScene={setActiveSceneId}
                theme={tour?.theme}
              />
            </div>
            {scenesError && <p className="error-text" style={{ marginTop: "var(--space-3)" }}>{scenesError}</p>}
            {hotspotsError && <p className="error-text" style={{ marginTop: "var(--space-3)" }}>{hotspotsError}</p>}

            <div className="stack" style={{ marginTop: "var(--space-4)" }}>
              {hotspots.length > 0 && (
                <Disclosure title={`Hotspots de esta escena (${hotspots.length})`}>
                  <HotspotList
                    hotspots={hotspots}
                    onRemove={removeHotspot}
                    onFocus={(lon, lat) => editorViewerRef.current?.focusHotspot(lon, lat)}
                    onEdit={(hotspot, rect) =>
                      editorViewerRef.current?.openEditPopover(hotspot, {
                        x: rect.right,
                        y: rect.top + rect.height / 2,
                      })
                    }
                  />
                </Disclosure>
              )}
              <Disclosure title="Video 360°">
                <VideoUploadForm onUpload={uploadVideo} />
              </Disclosure>
            </div>
          </>
        )}
      </section>

      {tour && (
        <section className="section">
          <div className="section-header">
            <span className="section-title">Apariencia</span>
          </div>
          <AppearancePanel tour={tour} onSave={handleSaveAppearance} />
        </section>
      )}

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

      <section className="section">
        <div className="section-header">
          <span className="section-title">Exportar</span>
        </div>
        <ExportPanel exports={exports} error={exportsError} exporting={exporting} onExport={createExport} />
      </section>
    </AppShell>
  );
}

function EmptyScenesState({ onAddFiles, showVideoUpload, onToggleVideoUpload, onUploadVideo }) {
  const [dragOver, setDragOver] = useState(false);
  const [uploads, setUploads] = useState([]);

  function handleFiles(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    const ids = files.map(() => Symbol("upload"));
    setUploads((prev) => [...prev, ...files.map((file, i) => ({ id: ids[i], file, pct: 0 }))]);
    onAddFiles(files, (i, patch) => {
      if (patch.status === "done") {
        setUploads((prev) => prev.filter((u) => u.id !== ids[i]));
        return;
      }
      setUploads((prev) => prev.map((u) => (u.id === ids[i] ? { ...u, ...patch } : u)));
    });
  }

  return (
    <div className="card">
      <div
        className="empty-state"
        style={{
          cursor: "pointer",
          borderRadius: "var(--radius-lg)",
          outline: dragOver ? "2px dashed var(--accent-solid)" : "2px dashed transparent",
          transition: "outline-color 0.15s ease",
        }}
        onClick={() => document.getElementById("empty-state-file-input")?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
      >
        <UploadIcon width={36} height={36} />
        <p className="empty-state-title">Todavía no hay escenas</p>
        <p className="empty-state-body">
          Arrastra aquí una o varias fotos panorámicas (360°) para empezar — puedes soltar
          10 o 20 de una vez. Después, en el lienzo, harás clic derecho para conectar unas
          con otras.
        </p>
        <button type="button" className="btn btn-primary">
          <UploadIcon width={16} height={16} />
          Elegir panorámicas
        </button>
        <input
          id="empty-state-file-input"
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {uploads.length > 0 && (
        <div className="stack" style={{ padding: "0 var(--space-6) var(--space-6)", gap: "var(--space-2)" }}>
          {uploads.map((u) => (
            <div key={u.id} className="row" style={{ fontSize: 13 }}>
              <span className="text-soft" style={{ flex: 1 }}>{u.file.name}</span>
              <span className="text-faint">{u.status === "error" ? u.error : `${Math.round((u.pct ?? 0) * 100)}%`}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ borderTop: "1px solid var(--border)", padding: "var(--space-4) var(--space-6)" }}>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onToggleVideoUpload}>
          <VideoIcon width={15} height={15} />
          ¿Tienes un video 360° en vez de fotos?
        </button>
        {showVideoUpload && (
          <div style={{ marginTop: "var(--space-4)", maxWidth: 420 }}>
            <VideoUploadForm onUpload={onUploadVideo} />
          </div>
        )}
      </div>
    </div>
  );
}
