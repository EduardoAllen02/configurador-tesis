import { MapPinIcon, TrashIcon } from "../../components/ui/Icon.jsx";

const badgeClass = { info: "badge-role-info", price: "badge-role-price", nav: "badge-role-nav" };

export default function HotspotList({ hotspots, onRemove }) {
  if (!hotspots.length) {
    return (
      <div className="empty-state" style={{ padding: "var(--space-6)" }}>
        <MapPinIcon width={28} height={28} />
        <p className="empty-state-body">Sin hotspots todavía. Agrega uno con el formulario de abajo.</p>
      </div>
    );
  }

  return (
    <div className="stack" style={{ gap: "var(--space-2)" }}>
      {hotspots.map((hotspot) => (
        <div key={hotspot.id} className="card row" style={{ padding: "10px 14px" }}>
          <span className={`badge ${badgeClass[hotspot.type]}`}>{hotspot.type}</span>
          <span style={{ flex: 1, fontSize: 14 }}>{hotspot.title}</span>
          <span className="text-faint" style={{ fontSize: 12 }}>
            lon {hotspot.lon}, lat {hotspot.lat}
          </span>
          <button
            className="btn btn-ghost btn-icon"
            style={{ width: 28, height: 28 }}
            onClick={() => onRemove(hotspot.id)}
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
