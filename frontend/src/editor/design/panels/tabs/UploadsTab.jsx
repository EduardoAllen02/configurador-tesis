import { useRef, useState } from "react";
import { api } from "../../../../api/client";
import { useDesignEditor, useDesignState } from "../../../hooks/useTourDesign.jsx";
import { useStudio } from "../../StudioContext.jsx";
import { DRAG_TYPE, dragPayload, imageItem, insertItem } from "../../library.js";
import { useAssets, useUpload } from "../hooks.js";
import { setIntro, setIntroBackground, stripAsset } from "../logic.js";
import { Ico, Tabs } from "../ui.jsx";

// Subidos: archivos del tour (imágenes, videos y audio). Subir con POST /api/tours/:id/assets;
// clic en una imagen = insertarla en el lienzo; un video puede ser el fondo de la pantalla de
// inicio. Eliminar pide confirmación y avisa si el diseño lo usa.
const KIND_TABS = [
  { value: "image", label: "Imágenes" },
  { value: "video", label: "Videos" },
  { value: "audio", label: "Audio" },
];
const ACCEPT = "image/png,image/jpeg,image/webp,image/avif,video/mp4,video/webm,audio/mpeg,audio/mp4,audio/ogg,audio/wav,.mp3,.m4a,.ogg,.wav";

export function UploadButton({ onUploaded, label = "Subir archivo", accept = ACCEPT }) {
  const { busy, progress, error, upload } = useUpload();
  const ref = useRef(null);
  return (
    <>
      <button type="button" className="sp-btn sp-btn--primary sp-btn--wide" disabled={busy} onClick={() => ref.current?.click()}>
        <Ico name="upload" size={18} /> {busy ? `Subiendo… ${Math.round(progress * 100)} %` : label}
      </button>
      {busy && <div className="sp-progress" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${progress * 100}%` }} /></div>}
      {error && <p className="sp-error" role="alert">{error}</p>}
      <input
        ref={ref}
        type="file"
        accept={accept}
        hidden
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          const asset = await upload(file);
          if (asset) onUploaded?.(asset);
        }}
      />
    </>
  );
}

export default function UploadsTab() {
  const store = useDesignEditor();
  const { tourId, reload } = useStudio();
  const design = useDesignState((s) => s.design);
  const [kind, setKind] = useState("image");
  const [confirmId, setConfirmId] = useState(null);
  const [error, setError] = useState(null);
  const list = useAssets(kind);
  const counts = { image: useAssets("image").length, video: useAssets("video").length, audio: useAssets("audio").length };

  const inUse = (id) => JSON.stringify(design).includes(`asset:${id}`);
  const remove = async (id) => {
    try {
      await api.delete(`/api/tours/${tourId}/assets/${id}`);
      store.apply((d) => stripAsset(d, id), { label: "Quitar archivo del diseño" }); // sin referencias rotas
      setConfirmId(null);
      setError(null);
      await reload();
    } catch (err) {
      setError(err.message || "No se pudo eliminar.");
    }
  };
  const useVideoAsBackground = (id) => {
    store.apply((d) => setIntroBackground(setIntro(d, { enabled: true }), { kind: "video", asset: `asset:${id}` }), { label: "Video de inicio" });
    store.setScreen("intro");
  };

  return (
    <div className="sp-tab">
      <UploadButton onUploaded={(a) => setKind(a.kind ?? "image")} />
      <Tabs value={kind} onChange={setKind} options={KIND_TABS.map((t) => ({ ...t, label: `${t.label} ${counts[t.value] || ""}`.trim() }))} />
      {error && <p className="sp-error">{error}</p>}
      {list.length === 0 && <p className="sp-hint">{kind === "image" ? "Sube logos, fotos o iconos. Con un clic los agregas al diseño." : kind === "video" ? "Sube un video (MP4 o WebM) para usarlo de fondo en la pantalla de inicio." : "Sube audio (MP3, M4A, OGG o WAV) para usarlo en el tour."}</p>}
      <div className={kind === "image" || kind === "video" ? "sp-grid" : "sp-list"}>
        {list.map((a) => (
          <div key={a.id} className="sp-asset">
            {kind === "image" && (
              <button
                type="button"
                className="sp-asset-main"
                draggable
                title="Agregar al diseño (clic) o arrastrar al lienzo"
                aria-label={`Agregar ${a.name || "imagen"}`}
                onClick={() => insertItem(store, imageItem(a.id, a))}
                onDragStart={(e) => {
                  e.dataTransfer.setData(DRAG_TYPE, JSON.stringify(dragPayload(imageItem(a.id, a))));
                  e.dataTransfer.effectAllowed = "copy";
                }}
              >
                <img src={a.url} alt="" draggable="false" />
              </button>
            )}
            {kind === "video" && (
              <button type="button" className="sp-asset-main" title="Usar como fondo de la pantalla de inicio" aria-label={`Usar ${a.name || "video"} como fondo de inicio`} onClick={() => useVideoAsBackground(a.id)}>
                <video src={a.url} muted preload="metadata" playsInline />
                <span className="sp-asset-badge">Usar de fondo</span>
              </button>
            )}
            {kind === "audio" && (
              <div className="sp-asset-audio">
                <Ico name="audio" size={18} />
                <span className="sp-clip">{a.name || "Audio"}</span>
                <audio src={a.url} controls preload="none" />
              </div>
            )}
            <button type="button" className="sp-asset-del" aria-label={`Eliminar ${a.name || "archivo"}`} title="Eliminar" onClick={() => setConfirmId(a.id)}>
              <Ico name="trash" size={14} />
            </button>
            {confirmId === a.id && (
              <div className="sp-asset-confirm" role="alertdialog">
                <p>{inUse(a.id) ? "Se usa en tu diseño. ¿Eliminar de todos modos?" : "¿Eliminar este archivo?"}</p>
                <div className="sp-row">
                  <button type="button" className="sp-btn sp-btn--danger" onClick={() => remove(a.id)}>
                    Eliminar
                  </button>
                  <button type="button" className="sp-btn" onClick={() => setConfirmId(null)}>
                    No
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
