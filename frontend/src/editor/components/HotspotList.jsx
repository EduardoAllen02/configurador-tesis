import { CopyIcon, MapPinIcon, PencilIcon, TrashIcon } from "../../components/ui/Icon.jsx";
import { duplicatePayload } from "../../runtime/templates/hotspots/styleOps.js";
import { api } from "../../api/client";

// La copia lleva también la imagen: se descarga la del original y se vuelve a subir.
async function duplicateWithImage(hotspot) {
  const payload = duplicatePayload(hotspot);
  if (!hotspot.imagePath) return payload;
  try {
    const res = await fetch(api.uploadUrl(hotspot.imagePath));
    if (res.ok) payload.imageFile = new File([await res.blob()], "imagen.webp", { type: "image/webp" });
  } catch {
    // sin imagen si no se pudo descargar; el resto de la copia sigue igual
  }
  return payload;
}

// Candado abierto/cerrado (el set de Icon.jsx no lo trae).
function LockGlyph({ locked }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d={locked ? "M8 11V7a4 4 0 0 1 8 0v4" : "M8 11V7a4 4 0 0 1 7.5-1.9"} />
    </svg>
  );
}

const badgeClass = { info: "badge-role-info", price: "badge-role-price", nav: "badge-role-nav" };

// Clicar la fila enfoca la cámara del lienzo de arriba hacia ese hotspot — útil sobre todo
// para los de tipo nav, que ya no se editan con un clic directo en el lienzo (ver
// useEditorViewer.js: un clic ahí navega en vez de abrir el popover). Editar cualquier
// hotspot pasa por el botón de lápiz, que abre el mismo popover que el lienzo.
// Bloquear (`locked`): el marcador no se arrastra en el lienzo y "aplicar a todos" no lo toca.
// Duplicar: copia con lon +8°, mismo estilo y contenido, título "… (copia)".
export default function HotspotList({ hotspots, onRemove, onFocus, onEdit, onCreate, onUpdate }) {
  if (!hotspots.length) {
    return (
      <div className="empty-state" style={{ padding: "var(--space-6)" }}>
        <MapPinIcon width={28} height={28} />
        <p className="empty-state-body">Sin hotspots todavía. Haz clic derecho sobre la panorámica para agregar uno.</p>
      </div>
    );
  }

  return (
    <div className="stack" style={{ gap: "var(--space-2)" }}>
      {hotspots.map((hotspot) => (
        <div
          key={hotspot.id}
          className="card row"
          style={{ padding: "10px 14px", cursor: "pointer" }}
          onClick={() => onFocus(hotspot.lon, hotspot.lat)}
        >
          <span className={`badge ${badgeClass[hotspot.type]}`}>{hotspot.type}</span>
          <span style={{ flex: 1, fontSize: 14 }}>{hotspot.title}</span>
          {onUpdate && (
            <button
              className="btn btn-ghost btn-icon"
              style={{ width: 28, height: 28, color: hotspot.locked ? "var(--text)" : "var(--text-faint)" }}
              onClick={(e) => {
                e.stopPropagation();
                onUpdate(hotspot.id, { locked: !hotspot.locked });
              }}
              title={hotspot.locked ? "Desbloquear (se podrá mover)" : "Bloquear (no se mueve ni cambia con «aplicar a todos»)"}
              aria-label={hotspot.locked ? "Desbloquear hotspot" : "Bloquear hotspot"}
              aria-pressed={Boolean(hotspot.locked)}
            >
              <LockGlyph locked={hotspot.locked} />
            </button>
          )}
          {onCreate && (
            <button
              className="btn btn-ghost btn-icon"
              style={{ width: 28, height: 28 }}
              onClick={(e) => {
                e.stopPropagation();
                duplicateWithImage(hotspot).then(onCreate);
              }}
              title="Duplicar hotspot"
              aria-label="Duplicar hotspot"
            >
              <CopyIcon width={15} height={15} />
            </button>
          )}
          <button
            className="btn btn-ghost btn-icon"
            style={{ width: 28, height: 28 }}
            onClick={(e) => {
              e.stopPropagation();
              onEdit(hotspot, e.currentTarget.getBoundingClientRect());
            }}
            title="Editar hotspot"
            aria-label="Editar hotspot"
          >
            <PencilIcon width={15} height={15} />
          </button>
          <button
            className="btn btn-ghost btn-icon"
            style={{ width: 28, height: 28 }}
            onClick={(e) => {
              e.stopPropagation();
              onRemove(hotspot.id);
            }}
            title="Eliminar hotspot"
            aria-label="Eliminar hotspot"
          >
            <TrashIcon width={15} height={15} />
          </button>
        </div>
      ))}
    </div>
  );
}
