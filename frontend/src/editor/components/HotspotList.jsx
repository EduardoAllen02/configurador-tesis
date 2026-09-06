import { MapPinIcon, PencilIcon, TrashIcon } from "../../components/ui/Icon.jsx";

const badgeClass = { info: "badge-role-info", price: "badge-role-price", nav: "badge-role-nav" };

// Clicar la fila enfoca la cámara del lienzo de arriba hacia ese hotspot — útil sobre todo
// para los de tipo nav, que ya no se editan con un clic directo en el lienzo (ver
// useEditorViewer.js: un clic ahí navega en vez de abrir el popover). Editar cualquier
// hotspot pasa por el botón de lápiz, que abre el mismo popover que el lienzo.
export default function HotspotList({ hotspots, onRemove, onFocus, onEdit }) {
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
