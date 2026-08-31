// Panel único reutilizado (reemplaza el #hotspot-panel global del prototipo original).
// Para hotspots type=nav, TourViewer nunca llega a abrir este panel: cambia de escena directo.
export default function HotspotDetailPanel({ hotspot, onClose }) {
  if (!hotspot) return null;

  return (
    <div
      style={{
        position: "absolute",
        right: 16,
        top: 16,
        width: 260,
        background: "rgba(20,20,20,0.92)",
        color: "#eee",
        borderRadius: 8,
        padding: "1rem",
      }}
    >
      <button onClick={onClose} style={{ float: "right" }} aria-label="Cerrar">
        ×
      </button>
      <h3 style={{ marginTop: 0 }}>{hotspot.title}</h3>
      {hotspot.type === "price" && hotspot.price && <p><strong>{hotspot.price}</strong></p>}
      {hotspot.description && <p>{hotspot.description}</p>}
    </div>
  );
}
