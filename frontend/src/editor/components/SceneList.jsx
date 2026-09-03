import { ImageIcon, TrashIcon, VideoIcon } from "../../components/ui/Icon.jsx";
import { sceneLabel } from "../utils/sceneLabel.js";

export default function SceneList({ scenes, activeSceneId, onSelect, onRemove }) {
  if (!scenes.length) {
    return <p className="text-faint" style={{ fontSize: 13.5 }}>Todavía no hay escenas — sube una panorámica o un video abajo.</p>;
  }

  return (
    <div className="stack" style={{ gap: "var(--space-2)" }}>
      {scenes.map((scene, index) => {
        const isActive = scene.id === activeSceneId;
        const isVideo = scene.origen === "video_frame";
        return (
          <div
            key={scene.id}
            className="card row"
            style={{
              padding: "10px 14px",
              cursor: "pointer",
              borderColor: isActive ? "var(--accent-solid)" : "var(--border)",
              boxShadow: isActive ? "0 0 0 1px var(--accent-solid)" : "var(--shadow-sm)",
            }}
            onClick={() => onSelect(scene.id)}
          >
            <span className="text-soft">{isVideo ? <VideoIcon width={16} height={16} /> : <ImageIcon width={16} height={16} />}</span>
            <span style={{ flex: 1, fontSize: 14, fontWeight: isActive ? 600 : 400 }}>
              {sceneLabel(scene, index)}
              {!scene.name && <span className="text-faint" style={{ fontWeight: 400 }}> · sin nombre</span>}
            </span>
            <span className={`badge ${isVideo ? "badge-origin-video" : "badge-origin-panorama"}`}>
              {isVideo ? "Video" : "Panorámica"}
            </span>
            <button
              className="btn btn-ghost btn-icon"
              style={{ width: 28, height: 28 }}
              onClick={(e) => {
                e.stopPropagation();
                onRemove(scene.id);
              }}
              title="Eliminar escena"
              aria-label="Eliminar escena"
            >
              <TrashIcon width={15} height={15} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
