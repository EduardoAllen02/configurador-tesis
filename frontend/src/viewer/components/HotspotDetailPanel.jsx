import { api } from "../../api/client";

// Panel único reutilizado (reemplaza el #hotspot-panel global del prototipo original).
// Para hotspots type=nav, TourViewer nunca llega a abrir este panel: cambia de escena directo.
// `tooltipStyle` (Tour.theme.tooltipStyle — Track A) elige entre fondo oscuro (default,
// como siempre fue) o claro; el acento de marca (--tour-accent, ya en el contenedor
// heredado de TourViewer) tiñe el borde y el precio.
export default function HotspotDetailPanel({ hotspot, onClose, tooltipStyle }) {
  if (!hotspot) return null;

  const isLight = tooltipStyle === "light";

  return (
    <div
      style={{
        position: "absolute",
        right: 16,
        top: 16,
        width: 260,
        background: isLight ? "rgba(255,255,255,0.96)" : "rgba(20,20,20,0.92)",
        color: isLight ? "#1a1a18" : "#eee",
        borderRadius: "var(--tour-radius, 8px)",
        borderLeft: "4px solid var(--tour-accent, #4da3ff)",
        padding: "1rem",
      }}
    >
      <button
        onClick={onClose}
        style={{ float: "right", color: "inherit", background: "none", border: "none", cursor: "pointer" }}
        aria-label="Cerrar"
      >
        ×
      </button>
      <h3 style={{ marginTop: 0 }}>{hotspot.title}</h3>
      {hotspot.imagePath && (
        <img
          src={api.uploadUrl(hotspot.imagePath)}
          alt=""
          style={{ width: "100%", borderRadius: 6, marginBottom: "0.5rem" }}
        />
      )}
      {hotspot.type === "price" && hotspot.price && (
        <p>
          <strong style={{ color: "var(--tour-accent, #4da3ff)" }}>{hotspot.price}</strong>
        </p>
      )}
      {hotspot.description && <p>{hotspot.description}</p>}
    </div>
  );
}
