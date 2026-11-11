import NadirSettings from "./settings/NadirSettings.jsx";
import PanoramaQualitySettings from "./settings/PanoramaQualitySettings.jsx";
import ContextMenuSettings from "./settings/ContextMenuSettings.jsx";

// "Ajustes del recorrido": opciones que afectan a todo el tour y no a un elemento puntual.
// Cada ajuste es su propio componente (y su propio dueño); este panel solo los ordena.
export default function TourSettingsPanel({ sceneRevision }) {
  return (
    <div className="card" style={{ padding: "var(--space-6)" }}>
      <div className="stack" style={{ gap: "var(--space-6)" }}>
        <ContextMenuSettings />
        <NadirSettings />
        <PanoramaQualitySettings sceneRevision={sceneRevision} />
      </div>
    </div>
  );
}
