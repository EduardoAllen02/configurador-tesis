import { Link } from "react-router-dom";
import HotspotStyleEditor, { FALLBACK_STYLE, resolveStyle } from "../../../components/HotspotStyleEditor.jsx";
import { useDesignEditor, useDesignState } from "../../../hooks/useTourDesign.jsx";
import { withPreset } from "../../../../runtime/templates/hotspots/styleOps.js";
import { useStudio } from "../../StudioContext.jsx";

const TYPES = [["info", "Info"], ["price", "Precio"], ["nav", "Navegación"]];

export default function HotspotsTab() {
  const store = useDesignEditor();
  const { tourId } = useStudio();
  const presets = useDesignState((s) => s.design?.hotspotPresets);
  return <div className="sp-tab sp-tab--hotspots">
    <p className="sp-hint">El estilo vale para todos los hotspots de cada tipo. Los detalles se configuran desde cada hotspot en Contenido y comparten su apariencia.</p>
    <Link className="sp-btn" to={`/tours/${tourId}/edit`}>Configurar hotspots y sus detalles</Link>
    {TYPES.map(([type, name]) => <section key={type} className="sp-section"><h3>{name}</h3>
      <HotspotStyleEditor type={type} value={resolveStyle(presets?.[type] ?? FALLBACK_STYLE)}
        onChange={(style) => store.apply((d) => withPreset(d, type, style), { label: `Estilo de hotspot ${name}`, mergeKey: `preset.${type}` })}
        onReset={() => {}} hasOwnStyle={false} applyTo="all" onApplyToChange={() => {}} allDisabled={false} locked={false} />
    </section>)}
  </div>;
}
