import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../../../api/client";
import { normalizeNadir } from "../../../runtime/core/nadir.js";
import { useTourDesign } from "../../hooks/useTourDesign.jsx";
import "./NadirSettings.css";

// Ajuste del nadir (plan §3.7): qué pasa con el suelo, justo debajo de la cámara, donde suele
// verse el tripié. Tres opciones simples; lee y guarda design.nadir con useTourDesign().
//   design.nadir = { mode, limitDeg, cover: { kind, color, image: "asset:<id>", sizePct } }
const MODES = [
  { id: "none", title: "Sin límite", hint: "Se puede mirar hasta el suelo." },
  { id: "limit", title: "Limitar hacia abajo", hint: "La cámara no baja más de cierto ángulo." },
  { id: "cover", title: "Tapar con color o logo", hint: "Un círculo en el suelo oculta el tripié." },
];
const SAVE_DELAY_MS = 350;

export default function NadirSettings() {
  const { tourId } = useParams();
  const { design, saveDesign } = useTourDesign();
  const [draft, setDraft] = useState(null);
  const [assets, setAssets] = useState({});
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const draftRef = useRef(null);
  const timerRef = useRef(null);
  const dirtyRef = useRef(false);
  const fileRef = useRef(null);

  // Toma el nadir guardado cuando llega (o cambia desde fuera) y no hay una edición a medias.
  useEffect(() => {
    if (!design || dirtyRef.current) return;
    const next = normalizeNadir(design.nadir);
    draftRef.current = next;
    setDraft(next);
  }, [design]);

  useEffect(() => {
    let cancelled = false;
    api
      .get(`/api/tours/${tourId}/assets`)
      .then((rows) => !cancelled && setAssets(Object.fromEntries(rows.map((a) => [a.id, a]))))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [tourId]);

  const persist = useCallback(
    async (nadir) => {
      try {
        await saveDesign((prev) => ({ ...prev, nadir }));
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        if (draftRef.current === nadir) dirtyRef.current = false;
      }
    },
    [saveDesign]
  );

  // `delay` > 0 junta los cambios de un slider o del selector de color en un solo guardado.
  function update(patch, { delay = 0 } = {}) {
    const current = draftRef.current;
    const next = { ...current, ...patch, cover: { ...current.cover, ...(patch.cover || {}) } };
    draftRef.current = next;
    dirtyRef.current = true;
    setDraft(next);
    clearTimeout(timerRef.current);
    timerRef.current = null;
    if (delay > 0) {
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        persist(next);
      }, delay);
    } else {
      persist(next);
    }
  }

  // Si el panel se cierra con un cambio pendiente, se guarda igual.
  useEffect(
    () => () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        persist(draftRef.current);
      }
    },
    [persist]
  );

  async function handleLogo(file) {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("kind", "image");
      const asset = await api.post(`/api/tours/${tourId}/assets`, form, { isFormData: true });
      setAssets((prev) => ({ ...prev, [asset.id]: asset }));
      update({ mode: "cover", cover: { kind: "image", image: `asset:${asset.id}` } });
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  if (!draft) return <p className="text-faint" style={{ fontSize: 14 }}>Cargando…</p>;

  const logoAsset = draft.cover.image ? assets[draft.cover.image.replace(/^asset:/, "")] : null;
  const isImage = draft.cover.kind === "image";

  return (
    <div className="nadir-settings stack">
      <div>
        <h3 className="nadir-title">Suelo del recorrido</h3>
        <p className="text-soft nadir-lead">
          Justo debajo de la cámara suele verse el tripié. Elige qué hacer con esa zona; para ver el resultado,
          mira hacia abajo en el lienzo.
        </p>
      </div>

      <div className="nadir-modes" role="radiogroup" aria-label="Qué hacer con el suelo">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            role="radio"
            aria-checked={draft.mode === m.id}
            className={`nadir-mode${draft.mode === m.id ? " nadir-mode-active" : ""}`}
            onClick={() => update({ mode: m.id })}
          >
            <span className="nadir-mode-title">{m.title}</span>
            <span className="nadir-mode-hint">{m.hint}</span>
          </button>
        ))}
      </div>

      {draft.mode === "limit" && (
        <div className="field nadir-field">
          <label className="field-label" htmlFor="nadir-angle">
            Hasta dónde se puede mirar hacia abajo ({Math.round(-draft.limitDeg)}°)
          </label>
          <input
            id="nadir-angle"
            type="range"
            min="10"
            max="85"
            step="1"
            value={-draft.limitDeg}
            onChange={(e) => update({ limitDeg: -Number(e.target.value) }, { delay: SAVE_DELAY_MS })}
          />
          <span className="nadir-help">
            Un número menor cierra más el paso hacia el suelo. Al alejar el zoom la cámara sube sola para no
            mostrarlo.
          </span>
        </div>
      )}

      {draft.mode === "cover" && (
        <div className="nadir-cover">
          <div className="nadir-kind" role="radiogroup" aria-label="Con qué tapar">
            {[
              { id: "color", label: "Color liso" },
              { id: "image", label: "Logo o imagen" },
            ].map((k) => (
              <button
                key={k.id}
                type="button"
                role="radio"
                aria-checked={draft.cover.kind === k.id}
                className={`nadir-kind-btn${draft.cover.kind === k.id ? " nadir-kind-btn-active" : ""}`}
                onClick={() => update({ cover: { kind: k.id } })}
              >
                {k.label}
              </button>
            ))}
          </div>

          <div className="nadir-grid">
            <div className="field nadir-field">
              <label className="field-label" htmlFor="nadir-color">
                {isImage ? "Color de fondo detrás del logo" : "Color"}
              </label>
              <div className="row" style={{ gap: 8 }}>
                <input
                  id="nadir-color"
                  type="color"
                  className="nadir-color"
                  value={draft.cover.color}
                  onChange={(e) => update({ cover: { color: e.target.value } }, { delay: SAVE_DELAY_MS })}
                />
                <span className="text-soft nadir-code">{draft.cover.color}</span>
              </div>
            </div>

            <div className="field nadir-field">
              <label className="field-label" htmlFor="nadir-size">
                Tamaño del círculo ({Math.round(draft.cover.sizePct)}%)
              </label>
              <input
                id="nadir-size"
                type="range"
                min="5"
                max="50"
                step="1"
                value={draft.cover.sizePct}
                onChange={(e) => update({ cover: { sizePct: Number(e.target.value) } }, { delay: SAVE_DELAY_MS })}
              />
            </div>
          </div>

          {isImage && (
            <div className="field nadir-field">
              <span className="field-label">Logo o imagen</span>
              <div className="row" style={{ gap: 12 }}>
                <span className="nadir-logo" style={{ background: draft.cover.color }}>
                  {logoAsset ? (
                    <img src={api.uploadUrl(logoAsset.path)} alt="Logo del suelo" />
                  ) : (
                    <span className="text-faint">Sin logo</span>
                  )}
                </span>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                >
                  {uploading ? "Subiendo…" : logoAsset ? "Cambiar logo" : "Subir logo"}
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/avif"
                  hidden
                  onChange={(e) => {
                    handleLogo(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
              </div>
              <span className="nadir-help">
                PNG con fondo transparente funciona mejor. Una imagen cuadrada llena el círculo; una alargada se
                ajusta dentro.
              </span>
            </div>
          )}
        </div>
      )}

      {error && <p className="error-text">{error}</p>}
    </div>
  );
}
