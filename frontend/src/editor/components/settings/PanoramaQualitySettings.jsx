import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../../../api/client";
import { useTourDesign } from "../../hooks/useTourDesign.jsx";
import { sceneLabel } from "../../utils/sceneLabel.js";

// Calidad de panorámicas (plan §3.10): Estándar (WebP) / Alta definición (mosaicos AVIF), por
// tour (design.panoramas.mode) y por escena (Scene.imageMode). Dueño en la Oleada 2: B4.
// Los mosaicos se generan en el servidor en segundo plano: mientras tanto se sigue viendo la WebP.
const POLL_MS = 2000;

const MODE_OPTIONS = [
  { value: "webp", label: "Estándar", hint: "Carga rápido en cualquier dispositivo." },
  { value: "tiles", label: "Alta definición", hint: "Más nitidez al acercar; pesa más." },
];

const SCENE_OPTIONS = [
  { value: "", label: "Usar la del tour" },
  { value: "webp", label: "Siempre WebP" },
  { value: "tiles", label: "Siempre mosaicos" },
];

const isPanorama = (scene) => scene.origen === "panorama_upload";
const tourModeOf = (design) => (design?.panoramas?.mode === "tiles" ? "tiles" : "webp");
const effectiveMode = (scene, tourMode) => scene.imageMode ?? tourMode;
// ¿Hay que (re)generar? Sin mosaicos, o con error. En proceso o listos no.
const needsTiles = (scene) => !["ready", "processing"].includes(scene.tiles?.status);

function StatusBadge({ scene }) {
  const status = scene.tiles?.status;
  if (status === "processing") {
    return <span className="badge" role="status">Generando alta definición…</span>;
  }
  if (status === "ready") {
    return (
      <span className="badge badge-role-nav" title={scene.tiles.width ? `${scene.tiles.width} px de ancho` : undefined}>
        Lista
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="badge badge-role-price" title={scene.tiles.error || undefined}>
        Error
      </span>
    );
  }
  return null;
}

export default function PanoramaQualitySettings({ sceneRevision }) {
  const { tourId } = useParams();
  const { design, saveDesign } = useTourDesign();
  const [scenes, setScenes] = useState([]);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const reload = useCallback(async () => {
    try {
      const list = await api.get(`/api/tours/${tourId}/scenes`);
      if (alive.current) setScenes(list);
    } catch (err) {
      if (alive.current) setError(err.message);
    }
  }, [tourId]);

  useEffect(() => {
    reload();
  }, [reload, sceneRevision]);

  // Mientras alguna escena se esté procesando, se revisa cada par de segundos.
  const processing = scenes.some((s) => s.tiles?.status === "processing");
  useEffect(() => {
    if (!processing) return undefined;
    const timer = setInterval(reload, POLL_MS);
    return () => clearInterval(timer);
  }, [processing, reload]);

  const tourMode = tourModeOf(design);
  const panoramas = scenes.filter(isPanorama);
  const videoFrames = scenes.length - panoramas.length;

  async function guard(task) {
    setBusy(true);
    setError(null);
    try {
      await task();
    } catch (err) {
      setError(err.message);
    } finally {
      if (alive.current) setBusy(false);
      await reload();
    }
  }

  function changeTourMode(mode) {
    if (mode === tourMode) return;
    return guard(async () => {
      await saveDesign((prev) => ({ ...prev, panoramas: { ...(prev?.panoramas || {}), mode } }));
      if (mode !== "tiles") return;
      // Las escenas que siguen al tour y aún no tienen mosaicos los empiezan a generar.
      const pending = panoramas.filter((s) => s.imageMode == null && needsTiles(s));
      await Promise.all(pending.map((s) => api.post(`/api/tours/${tourId}/scenes/${s.id}/tiles`)));
    });
  }

  function changeSceneMode(scene, value) {
    return guard(async () => {
      // El servidor empieza a generar los mosaicos al pasar a "tiles" si no los tiene.
      await api.patch(`/api/tours/${tourId}/scenes/${scene.id}`, { imageMode: value || null });
      // Si la escena sigue al tour y el tour es de alta definición, también hacen falta.
      if (!value && tourMode === "tiles" && needsTiles(scene)) {
        await api.post(`/api/tours/${tourId}/scenes/${scene.id}/tiles`);
      }
    });
  }

  function retry(scene) {
    return guard(() => api.post(`/api/tours/${tourId}/scenes/${scene.id}/tiles`));
  }

  return (
    <div className="stack" style={{ gap: "var(--space-3)" }}>
      <div>
        <h3 style={{ fontSize: 15, fontWeight: 600 }}>Calidad de panorámicas</h3>
        <p className="text-soft" style={{ fontSize: 14, maxWidth: "60ch", marginTop: 4 }}>
          En alta definición el visor muestra primero una versión ligera y luego carga solo los
          pedazos que se están mirando. Se necesita un navegador reciente; si no, se usa la
          versión estándar.
        </p>
      </div>

      <div className="row" role="radiogroup" aria-label="Calidad de panorámicas del recorrido" style={{ flexWrap: "wrap" }}>
        {MODE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={tourMode === opt.value}
            className={`btn ${tourMode === opt.value ? "btn-primary" : "btn-secondary"}`}
            disabled={busy || !design}
            onClick={() => changeTourMode(opt.value)}
            title={opt.hint}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {error && <p className="error-text">{error}</p>}

      {panoramas.length > 0 && (
        <div className="stack" style={{ gap: "var(--space-2)" }}>
          <span className="field-label">Por escena</span>
          {panoramas.map((scene) => {
            const label = sceneLabel(scene, scenes.indexOf(scene));
            const wantsTiles = effectiveMode(scene, tourMode) === "tiles";
            const showStatus = wantsTiles || scene.tiles?.status === "processing";
            return (
              <div key={scene.id} className="card row" style={{ padding: "8px 12px", flexWrap: "wrap" }}>
                <span style={{ flex: 1, minWidth: 120, fontSize: 14 }}>{label}</span>
                {showStatus && <StatusBadge scene={scene} />}
                {showStatus && scene.tiles?.status === "error" && (
                  <button className="btn btn-ghost btn-sm" type="button" disabled={busy} onClick={() => retry(scene)}>
                    Reintentar
                  </button>
                )}
                <select
                  className="select"
                  style={{ width: "auto", minWidth: 200 }}
                  aria-label={`Calidad de ${label}`}
                  value={scene.imageMode ?? ""}
                  disabled={busy}
                  onChange={(e) => changeSceneMode(scene, e.target.value)}
                >
                  {SCENE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      )}

      {videoFrames > 0 && (
        <p className="text-faint" style={{ fontSize: 14 }}>
          Los cuadros de video siempre se muestran en versión estándar.
        </p>
      )}
    </div>
  );
}
