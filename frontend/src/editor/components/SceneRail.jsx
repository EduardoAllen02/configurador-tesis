import { useRef, useState } from "react";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { api } from "../../api/client";
import { ImageIcon, TrashIcon, DragHandleIcon, UploadIcon, XIcon } from "../../components/ui/Icon.jsx";
import { sceneLabel } from "../utils/sceneLabel.js";

function SceneTile({ scene, index, isActive, onSelect, onRemove }) {
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
        <div className="scene-tile-label">{sceneLabel(scene, index)}</div>
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
export default function SceneRail({ scenes, activeSceneId, onSelect, onRemove, onReorder, onAddFiles }) {
  const inputRef = useRef(null);
  const [uploads, setUploads] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  function handleFiles(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    const ids = files.map(() => Symbol("upload"));
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
    const oldIndex = scenes.findIndex((s) => s.id === active.id);
    const newIndex = scenes.findIndex((s) => s.id === over.id);
    onReorder(arrayMove(scenes.map((s) => s.id), oldIndex, newIndex));
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
        <SortableContext items={scenes.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          {scenes.map((scene, index) => (
            <SceneTile
              key={scene.id}
              scene={scene}
              index={index}
              isActive={scene.id === activeSceneId}
              onSelect={onSelect}
              onRemove={onRemove}
            />
          ))}
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
