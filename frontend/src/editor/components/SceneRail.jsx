import { useEffect, useId, useMemo, useRef, useState } from "react";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { api } from "../../api/client";
import { ImageIcon, TrashIcon, DragHandleIcon, UploadIcon, XIcon, PencilIcon, CheckIcon } from "../../components/ui/Icon.jsx";
import { batchKeyOf } from "../../runtime/model/tourModel.js";
import { sceneLabel } from "../utils/sceneLabel.js";
import "./SceneRail.css";

// El rail muestra UNA tarjeta por video (aunque tenga 60 cuadros) y una por panorámica. Cada
// elemento es { id, scene } (panorámica) o { id, batch: scenes[] } (video); la tarjeta de video
// se ordena y se elimina como un todo.
function groupScenes(scenes) {
  const items = [];
  const batches = new Map();
  scenes.forEach((scene) => {
    if (scene.origen !== "video_frame") {
      items.push({ id: scene.id, scene });
      return;
    }
    const key = batchKeyOf(scene);
    if (!batches.has(key)) {
      const item = { id: `batch:${key}`, batch: [] };
      batches.set(key, item);
      items.push(item);
    }
    batches.get(key).batch.push(scene);
  });
  items.forEach((item) => item.batch?.sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0)));
  return items;
}

function SceneName({ scene, label, video = false, onRename }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const input = useRef(null), active = useRef(false);
  const errorId = useId();
  useEffect(() => { if (editing) { input.current?.focus(); input.current?.select(); } }, [editing]);
  const start = (event) => {
    event.stopPropagation();
    setName(scene.name ?? ""); setError(null); active.current = true; setEditing(true);
  };
  const cancel = () => { active.current = false; setEditing(false); setError(null); };
  const save = async () => {
    if (!active.current || saving) return;
    active.current = false;
    if (name.trim() === (scene.name ?? "")) { setEditing(false); return; }
    setSaving(true); setError(null);
    try { await onRename(scene.id, name); setEditing(false); }
    catch (err) { active.current = true; setError(err.message); input.current?.focus(); }
    finally { setSaving(false); }
  };
  return editing ? <div className="scene-name-editor" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}
    onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) save(); }}>
    <input ref={input} className="input" aria-label={video ? "Nombre del video" : "Nombre de la escena"} value={name} disabled={saving}
      aria-invalid={!!error} aria-describedby={error ? errorId : undefined} placeholder={video ? "Nombre del video" : "Nombre de la escena"}
      onChange={(e) => setName(e.target.value)} onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === "Enter") { event.preventDefault(); save(); }
        if (event.key === "Escape") { event.preventDefault(); cancel(); }
      }} />
    <div className="scene-name-actions"><span>{saving ? "Guardando…" : "Enter guarda · Esc cancela"}</span>
      <button type="button" className="btn btn-ghost btn-icon" disabled={saving} onClick={save} aria-label="Guardar nombre" title="Guardar nombre"><CheckIcon width={16} height={16} /></button>
      <button type="button" className="btn btn-ghost btn-icon" disabled={saving} onClick={cancel} aria-label="Cancelar nombre" title="Cancelar"><XIcon width={16} height={16} /></button>
    </div>
    {error && <p id={errorId} role="alert" className="error-text scene-name-error">{error}</p>}
  </div> : <div className="scene-name-row">
    <span className="scene-tile-label" onDoubleClick={start} title={`${label} · Doble clic para cambiar el nombre`}>{label}</span>
    <button type="button" className="btn btn-ghost btn-icon scene-tile-rename" onClick={start} title={video ? "Cambiar nombre del video" : "Cambiar nombre de la escena"} aria-label={`${video ? "Cambiar nombre del video" : "Cambiar nombre de la escena"}: ${label}`}><PencilIcon width={15} height={15} /></button>
  </div>;
}

function SceneTile({ scene, index, isActive, onSelect, onRemove, onRename }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: scene.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  const isVideo = scene.origen === "video_frame";
  const [thumbBroken, setThumbBroken] = useState(false);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`scene-tile${isActive ? " scene-tile-active" : ""}`}
      onClick={() => onSelect(scene.id)}
    >
      <span className="scene-tile-drag" {...attributes} {...listeners} onClick={(e) => e.stopPropagation()}>
        <DragHandleIcon width={14} height={14} />
      </span>
      {thumbBroken ? (
        <span className="scene-tile-thumb scene-tile-thumb-fallback">
          <ImageIcon width={16} height={16} />
        </span>
      ) : (
        <img
          className="scene-tile-thumb"
          src={api.uploadUrl(scene.webpPath)}
          alt=""
          onError={() => setThumbBroken(true)}
        />
      )}
      <div className="scene-tile-body">
        <SceneName scene={scene} label={sceneLabel(scene, index)} onRename={onRename} />
        <div className="scene-tile-meta">
          {isVideo ? "Video" : "Panorámica"}
          {!scene.name && " · sin nombre"}
        </div>
      </div>
      <button
        className="btn btn-ghost btn-icon scene-tile-remove"
        style={{ width: 26, height: 26 }}
        onClick={(e) => {
          e.stopPropagation();
          onRemove(scene.id);
        }}
        title="Eliminar escena"
        aria-label="Eliminar escena"
      >
        <TrashIcon width={14} height={14} />
      </button>
    </div>
  );
}

function VideoTile({ item, activeSceneId, onSelect, onRemove, onRename }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  const [thumbBroken, setThumbBroken] = useState(false);
  const first = item.batch[0];
  const activePos = item.batch.findIndex((s) => s.id === activeSceneId);
  const isActive = activePos >= 0;
  const count = item.batch.length;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`scene-tile scene-tile-video${isActive ? " scene-tile-active" : ""}`}
      onClick={() => !isActive && onSelect(first.id)}
    >
      <span className="scene-tile-drag" {...attributes} {...listeners} onClick={(e) => e.stopPropagation()}>
        <DragHandleIcon width={14} height={14} />
      </span>
      {thumbBroken ? (
        <span className="scene-tile-thumb scene-tile-thumb-fallback">
          <ImageIcon width={16} height={16} />
        </span>
      ) : (
        <img
          className="scene-tile-thumb"
          src={api.uploadUrl(first.webpPath)}
          alt=""
          onError={() => setThumbBroken(true)}
        />
      )}
      <div className="scene-tile-body">
        <SceneName scene={first} label={first.name || "Video 360°"} video onRename={onRename} />
        <div className="scene-tile-meta">{isActive ? `Cuadro ${activePos + 1} de ${count}` : `Video · ${count} ${count === 1 ? "cuadro" : "cuadros"}`}</div>
      </div>
      <button
        className="btn btn-ghost btn-icon scene-tile-remove"
        style={{ width: 26, height: 26 }}
        onClick={(e) => {
          e.stopPropagation();
          onRemove(item.batch.map((s) => s.id));
        }}
        title="Eliminar video"
        aria-label="Eliminar video"
      >
        <TrashIcon width={14} height={14} />
      </button>
    </div>
  );
}

function UploadTile({ upload, onDismiss }) {
  const isError = upload.status === "error";
  return (
    <div className="scene-tile scene-tile-uploading">
      <span style={{ width: 14 }} />
      <div className="scene-tile-progress-ring">
        {!isError && <span className="scene-tile-progress-bar" style={{ width: `${Math.round((upload.pct ?? 0) * 100)}%` }} />}
      </div>
      <div className="scene-tile-body">
        <div className="scene-tile-label">{upload.file.name}</div>
        <div className="scene-tile-meta" style={isError ? { color: "var(--danger)" } : undefined}>
          {isError ? upload.error : "Subiendo…"}
        </div>
      </div>
      {isError && (
        <button
          className="btn btn-ghost btn-icon"
          style={{ width: 26, height: 26 }}
          onClick={onDismiss}
          title="Descartar"
          aria-label="Descartar"
        >
          <XIcon width={13} height={13} />
        </button>
      )}
    </div>
  );
}

// Rail de escenas del editor: miniaturas reales (no filas de texto), reordenables por
// drag&drop, con un tile de subida-en-progreso por archivo mientras se suelta un lote de
// panorámicas — reemplaza la lista plana + formulario separado de abajo.
export default function SceneRail({ scenes, activeSceneId, onSelect, onRemove, onRemoveVideo, onReorder, onAddFiles, onRename }) {
  const items = useMemo(() => groupScenes(scenes), [scenes]);
  const inputRef = useRef(null);
  const [uploads, setUploads] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  function handleFiles(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    const ids = files.map((_, i) => `upload-${Date.now()}-${i}-${Math.random()}`); // React keys must be strings.
    setUploads((prev) => [...prev, ...files.map((file, i) => ({ id: ids[i], file, status: "queued", pct: 0 }))]);

    onAddFiles(files, (i, patch) => {
      setUploads((prev) => {
        if (patch.status === "done") return prev.filter((u) => u.id !== ids[i]);
        return prev.map((u) => (u.id === ids[i] ? { ...u, ...patch } : u));
      });
    });
  }

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((it) => it.id === active.id);
    const newIndex = items.findIndex((it) => it.id === over.id);
    // Un video se mueve entero: sus cuadros conservan el orden entre sí.
    const moved = arrayMove(items, oldIndex, newIndex);
    onReorder(moved.flatMap((it) => (it.batch ? it.batch.map((s) => s.id) : [it.id])));
  }

  return (
    <div
      className={`scene-rail${dragOver ? " scene-rail-dropping" : ""}`}
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
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map((it) => it.id)} strategy={verticalListSortingStrategy}>
          {items.map((item) =>
            item.batch ? (
              <VideoTile
                key={item.id}
                item={item}
                activeSceneId={activeSceneId}
                onSelect={onSelect}
                onRemove={onRemoveVideo}
                onRename={onRename}
              />
            ) : (
              <SceneTile
                key={item.id}
                scene={item.scene}
                index={scenes.indexOf(item.scene)}
                isActive={item.scene.id === activeSceneId}
                onSelect={onSelect}
                onRemove={onRemove}
                onRename={onRename}
              />
            )
          )}
        </SortableContext>
      </DndContext>

      {uploads.map((u) => (
        <UploadTile key={u.id} upload={u} onDismiss={() => setUploads((prev) => prev.filter((x) => x.id !== u.id))} />
      ))}

      <button type="button" className="scene-tile-add" onClick={() => inputRef.current?.click()}>
        <UploadIcon width={15} height={15} />
        Agregar panorámicas
      </button>
      <input
        ref={inputRef}
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
  );
}
