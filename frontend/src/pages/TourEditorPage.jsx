import ContentStudio from "../editor/design/ContentStudio.jsx";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useSceneEditor } from "../editor/hooks/useSceneEditor.js";
import { useHotspotEditor } from "../editor/hooks/useHotspotEditor.js";
import AppShell from "../components/ui/AppShell.jsx";
import Disclosure from "../components/ui/Disclosure.jsx";
import { UploadIcon, VideoIcon } from "../components/ui/Icon.jsx";
import SceneRail from "../editor/components/SceneRail.jsx";
import EditorViewer from "../editor/components/EditorViewer.jsx";
import VideoUploadForm from "../editor/components/VideoUploadForm.jsx";
import HotspotList from "../editor/components/HotspotList.jsx";
import EditorHeader from "../editor/components/EditorHeader.jsx";
import { previewHref } from "../editor/components/previewNavigation.js";
import TourSettingsPanel from "../editor/components/TourSettingsPanel.jsx";
import { TourDesignProvider } from "../editor/hooks/useTourDesign.jsx";
import { buildModel } from "../runtime/model/tourModel.js";
import { hotspotPositionAt } from "../runtime/model/segments.js";

export default function TourEditorPage() {
  const { tourId } = useParams();
  return (
    <TourDesignProvider tourId={tourId}>
      <TourEditorContent tourId={tourId} />
    </TourDesignProvider>
  );
}

function TourEditorContent({ tourId }) {
  const [tour, setTour] = useState(null);
  const navigate = useNavigate();
  const {
    scenes,
    error: scenesError,
    uploadPanoramasBulk,
    reorderScenes,
    uploadVideo,
    removeScene,
    renameScene,
    reload: reloadScenes,
  } = useSceneEditor(tourId);
  const [activeSceneId, setActiveSceneId] = useState(null);
  const [editInterface, setEditInterface] = useState(false);
  const [showVideoUpload, setShowVideoUpload] = useState(false);
  const editorViewerRef = useRef(null);
  const {
    hotspots,
    allHotspots,
    error: hotspotsError,
    createHotspot,
    updateHotspot,
    removeHotspot,
  } = useHotspotEditor(tourId, activeSceneId);

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
  const sceneRevision = useMemo(() => JSON.stringify(scenes.map(({ id, name }) => [id, name])), [scenes]);

  // En un video, la lista muestra lo que se ve en el cuadro actual (incluidos los hotspots de
  // otros cuadros cuyo segmento lo cubre), con la posición interpolada de ese cuadro.
  const sceneModel = useMemo(() => buildModel({ scenes }), [scenes]);
  const listHotspots = useMemo(() => {
    const located = activeScene && sceneModel.batchByScene.get(activeScene.id);
    if (!located || activeScene.origen !== "video_frame") return hotspots;
    const last = located.batch.scenes.length - 1;
    const visible = [];
    located.batch.scenes.forEach((s, ownIndex) => {
      allHotspots
        .filter((h) => h.sceneId === s.id)
        .forEach((h) => {
          const pos = hotspotPositionAt(h, located.index, ownIndex, last);
          if (pos) visible.push({ ...h, lon: pos.lon, lat: pos.lat });
        });
    });
    return visible;
  }, [activeScene, sceneModel, allHotspots, hotspots]);

  async function handleRemoveScene(sceneId) {
    if (!confirm("¿Eliminar esta escena? Sus hotspots también se borran.")) return;
    await removeScene(sceneId);
  }

  // Un video entero: se borran todos sus cuadros (el backend no tiene un borrado por lote).
  async function handleRemoveVideo(sceneIds) {
    if (!confirm(`¿Eliminar este video completo (${sceneIds.length} cuadros)? Sus hotspots también se borran.`)) return;
    for (let i = 0; i < sceneIds.length; i += 6) {
      await Promise.all(sceneIds.slice(i, i + 6).map((id) => api.delete(`/api/tours/${tourId}/scenes/${id}`)));
    }
    await reloadScenes();
  }

  return (
    <AppShell fullBleed header={<EditorHeader tourId={tourId} title={tour?.title ?? "Cargando…"} onPreview={async event => { event.preventDefault(); try { await editorViewerRef.current?.flush(); navigate(previewHref(tourId, `/tours/${tourId}/edit`), { state: { editorOrigin: `/tours/${tourId}/edit` } }); } catch {} }} />}>
      <div className="content-editor-page">


      <section className="section">
        {scenes.length === 0 ? (
          <><div className="page-header"><h1 className="page-title">{tour?.title}</h1></div><EmptyScenesState
            uploading={false}
            onAddFiles={(files, onProgress) => uploadPanoramasBulk(files, onProgress)}
            showVideoUpload={showVideoUpload}
            onToggleVideoUpload={() => setShowVideoUpload((v) => !v)}
            onUploadVideo={uploadVideo}
          /></>
        ) : (
          <>
            <div className="editor-layout">
              <aside className="content-scene-sidebar">
      <div className="content-scene-heading">
        <div>
          <h1 className="page-title">{tour?.title ?? "Editar tour"}</h1>
          <p className="page-subtitle">
            {scenes.length
              ? "Administra las escenas, hotspots y el acceso de tu tour."
              : "Arrastra tus panorámicas para empezar a armar el recorrido."}
          </p>
        </div>
      </div>
            <div className="content-mode-buttons" role="group" aria-label="Edición del contenido">
              <button type="button" className={`btn btn-sm ${!editInterface ? "btn-primary" : "btn-secondary"}`} onClick={() => setEditInterface(false)}>Hotspots y panorama</button>
              <button type="button" className={`btn btn-sm ${editInterface ? "btn-primary" : "btn-secondary"}`} onClick={() => setEditInterface(true)}>Elementos 2D</button>
            </div>

              <SceneRail
                scenes={scenes}
                activeSceneId={activeSceneId}
                onSelect={async id => { try { await editorViewerRef.current?.flush(); setActiveSceneId(id); } catch {} }}
                onRemove={handleRemoveScene}
                onRemoveVideo={handleRemoveVideo}
                onReorder={reorderScenes}
                onRename={renameScene}
                onAddFiles={uploadPanoramasBulk}
              />
              </aside>
              {editInterface ? <ContentStudio tourId={tourId} sceneId={activeSceneId} sceneRevision={sceneRevision} /> : <EditorViewer
                ref={editorViewerRef}
                scene={activeScene}
                hotspots={allHotspots}
                scenes={scenes}
                onCreateHotspot={createHotspot}
                onUpdateHotspot={updateHotspot}
                onDeleteHotspot={removeHotspot}
                onNavigateScene={setActiveSceneId}
                onFrameChange={setActiveSceneId}
                theme={tour?.theme}
              />}
            </div>
            {scenesError && <p className="error-text" style={{ marginTop: "var(--space-3)" }}>{scenesError}</p>}
            {hotspotsError && <p className="error-text" style={{ marginTop: "var(--space-3)" }}>{hotspotsError}</p>}

            <div className="stack" style={{ marginTop: "var(--space-4)" }}>
              {listHotspots.length > 0 && (
                <Disclosure
                  title={`Hotspots ${activeScene?.origen === "video_frame" ? "en este cuadro" : "de esta escena"} (${listHotspots.length})`}
                >
                  <HotspotList
                    hotspots={listHotspots}
                    onCreate={createHotspot}
                    onUpdate={updateHotspot}
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

      <section className="section">
        <div className="section-header">
          <span className="section-title">Apariencia</span>
        </div>
        <div className="card row appearance-link-card">
          <p style={{ margin: 0, color: "var(--text-soft)" }}>
            Colores, textos, botones, pantalla de inicio y estilo de los hotspots se editan en el estudio de Interfaz.
          </p>
          <Link to={`/tours/${tourId}/design`} className="btn btn-primary btn-sm">
            Abrir Interfaz
          </Link>
        </div>
      </section>

      {scenes.length > 0 && (
        <section className="section">
          <div className="section-header">
            <span className="section-title">Ajustes del recorrido</span>
          </div>
          <TourSettingsPanel sceneRevision={sceneRevision} />
        </section>
      )}

      </div>
    </AppShell>
  );
}

function EmptyScenesState({ onAddFiles, showVideoUpload, onToggleVideoUpload, onUploadVideo }) {
  const [dragOver, setDragOver] = useState(false);
  const [uploads, setUploads] = useState([]);

  function handleFiles(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    const ids = files.map((_, i) => `upload-${Date.now()}-${i}-${Math.random()}`); // React keys must be strings.
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
            <div key={u.id} className="row" style={{ fontSize: 14 }}>
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
