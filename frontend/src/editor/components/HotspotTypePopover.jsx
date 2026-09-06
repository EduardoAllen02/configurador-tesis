import { useEffect, useRef, useState } from "react";
import { api } from "../../api/client";
import { InfoIcon, PriceTagIcon, NavArrowIcon, TrashIcon, XIcon, ImageIcon } from "../../components/ui/Icon.jsx";
import { sceneLabel } from "../utils/sceneLabel.js";
import FileDropzone from "../../components/ui/FileDropzone.jsx";

const TYPES = [
  { value: "info", label: "Info", Icon: InfoIcon },
  { value: "price", label: "Precio", Icon: PriceTagIcon },
  { value: "nav", label: "Navegación", Icon: NavArrowIcon },
];

// Tarjeta flotante anclada al punto exacto donde se hizo clic derecho (crear) o a la
// posición del marcador (editar) — nunca muestra lon/lat: eso ya quedó resuelto por el
// raycasting que la abrió. `anchor` es un punto en coordenadas de viewport (clientX/clientY
// o el centro de un getBoundingClientRect()); el propio popover se encarga de no salirse
// de la pantalla.
export default function HotspotTypePopover({ hotspot, anchor, scenes, currentSceneId, onSave, onDelete, onClose }) {
  const isEditing = Boolean(hotspot);
  const [type, setType] = useState(hotspot?.type ?? "info");
  const [title, setTitle] = useState(hotspot?.title ?? "");
  const [description, setDescription] = useState(hotspot?.description ?? "");
  const [price, setPrice] = useState(hotspot?.price ?? "");
  const [targetSceneId, setTargetSceneId] = useState(hotspot?.targetSceneId ?? "");
  const [imageFile, setImageFile] = useState(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const cardRef = useRef(null);
  const [style, setStyle] = useState({ opacity: 0 });

  const otherScenes = scenes.filter((s) => s.id !== currentSceneId);

  // Autocompleta un título razonable para hotspots de navegación (el usuario casi nunca
  // necesita escribir uno a mano ahí: "ir a la Cocina" ya lo dice el destino elegido).
  useEffect(() => {
    if (type !== "nav" || !targetSceneId) return;
    const target = scenes.find((s) => s.id === targetSceneId);
    if (!target) return;
    const autoTitle = `Ir a ${sceneLabel(target, scenes.indexOf(target))}`;
    setTitle((current) => (current === "" || current.startsWith("Ir a ") ? autoTitle : current));
  }, [type, targetSceneId, scenes]);

  useEffect(() => {
    const card = cardRef.current;
    if (!card || !anchor) return;
    const margin = 12;
    const rect = card.getBoundingClientRect();
    let left = anchor.x + 14;
    let top = anchor.y - rect.height / 2;
    left = Math.min(Math.max(margin, left), window.innerWidth - rect.width - margin);
    top = Math.min(Math.max(margin, top), window.innerHeight - rect.height - margin);
    setStyle({ left, top, opacity: 1 });
  }, [anchor]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    if (type !== "nav" && !title.trim()) return setError("Ponle un título.");
    if (type === "price" && !price.trim()) return setError("Ponle un precio.");
    if (type === "nav" && !targetSceneId) return setError("Elige a qué escena salta.");

    setSaving(true);
    try {
      await onSave({
        type,
        title: title.trim(),
        description: type !== "nav" ? description.trim() || undefined : undefined,
        price: type === "price" ? price.trim() : undefined,
        targetSceneId: type === "nav" ? targetSceneId : undefined,
        imageFile: imageFile || undefined,
        removeImage: removeImage || undefined,
      });
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <>
      <div className="hotspot-popover-backdrop" onClick={onClose} onContextMenu={(e) => e.preventDefault()} />
      <form ref={cardRef} className="hotspot-popover card" style={style} onSubmit={handleSubmit}>
        <div className="hotspot-popover-header">
          <div className="hotspot-type-group">
            {TYPES.map(({ value, label, Icon }) => (
              <button
                key={value}
                type="button"
                className={`hotspot-type-btn${type === value ? " hotspot-type-btn-active" : ""}`}
                onClick={() => setType(value)}
                title={label}
                aria-label={label}
              >
                <Icon width={15} height={15} />
              </button>
            ))}
          </div>
          <button type="button" className="btn btn-ghost btn-icon" style={{ width: 26, height: 26 }} onClick={onClose} aria-label="Cancelar">
            <XIcon width={14} height={14} />
          </button>
        </div>

        {type !== "nav" && (
          <input
            className="input"
            placeholder="Título (ej. Cocina remodelada)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
        )}

        {type !== "nav" && (
          <input
            className="input"
            placeholder="Descripción (opcional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        )}

        {type === "price" && (
          <input
            className="input"
            placeholder="Ej. $2,500,000"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        )}

        {type === "nav" && (
          <select
            className="select"
            value={targetSceneId}
            onChange={(e) => setTargetSceneId(e.target.value)}
            autoFocus
          >
            <option value="">¿A dónde salta?</option>
            {otherScenes.map((s) => (
              <option key={s.id} value={s.id}>
                {sceneLabel(s, scenes.indexOf(s))}
              </option>
            ))}
          </select>
        )}

        {hotspot?.imagePath && !removeImage && !imageFile ? (
          <div className="row" style={{ gap: 8 }}>
            <img
              src={api.uploadUrl(hotspot.imagePath)}
              alt=""
              style={{ width: 44, height: 44, objectFit: "cover", borderRadius: "var(--radius-sm)" }}
            />
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              style={{ color: "var(--danger)" }}
              onClick={() => setRemoveImage(true)}
            >
              Quitar imagen
            </button>
          </div>
        ) : (
          <FileDropzone
            icon={<ImageIcon width={18} height={18} />}
            title="Imagen (opcional)"
            description="Se muestra junto al hotspot"
            accept="image/*"
            file={imageFile}
            onSelect={(file) => {
              setImageFile(file);
              setRemoveImage(false);
            }}
          />
        )}

        {error && <p className="error-text" style={{ fontSize: 12.5 }}>{error}</p>}

        <div className="spread">
          {isEditing ? (
            <button
              type="button"
              className="btn btn-ghost btn-icon"
              style={{ color: "var(--danger)" }}
              onClick={onDelete}
              title="Eliminar hotspot"
              aria-label="Eliminar hotspot"
            >
              <TrashIcon width={16} height={16} />
            </button>
          ) : (
            <span />
          )}
          <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
            {saving ? "Guardando…" : isEditing ? "Guardar cambios" : "Agregar hotspot"}
          </button>
        </div>
      </form>
    </>
  );
}
