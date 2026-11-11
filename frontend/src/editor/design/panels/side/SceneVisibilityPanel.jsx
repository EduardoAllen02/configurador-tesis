import { useMemo } from "react";
import { buildModel, buildPickerEntries } from "../../../../runtime/model/tourModel.js";
import { isGlobalInterface, sceneIdsForEntry, toggleSceneEntry } from "../../../../runtime/model/interfaceModel.js";
import { useDesignEditor } from "../../../hooks/useTourDesign.jsx";
import { useStudio } from "../../StudioContext.jsx";
import { updateElement } from "../../elementOps.js";

export default function SceneVisibilityPanel({ elements, selection, screen }) {
  const store = useDesignEditor();
  const { baseDoc } = useStudio();
  const model = useMemo(() => buildModel(baseDoc), [baseDoc]);
  const entries = useMemo(() => buildPickerEntries(model), [model]);
  const picked = elements.filter((element) => selection.includes(element.id));
  if (screen !== "tour" || !picked.length) return null;
  if (picked.some(isGlobalInterface)) return <p className="sp-hint">Las barras son globales para todo el recorrido. La barra de cuadros aparece al reproducir un video 360°.</p>;
  const all = picked.every((element) => element.showIn == null || element.showIn === "all");
  const write = (updater) => store.apply((d) => picked.reduce((next, element) => updateElement(next, screen, element.id, { showIn: updater(element.showIn) }), d), { label: "Mostrar en escenas" });
  return <section className="sp-section"><h3>Mostrar en</h3>
    <label className="sp-hint"><input type="checkbox" checked={all} onChange={(e) => write(() => e.target.checked ? "all" : [])} /> Todas las escenas</label>
    {entries.map((entry) => {
      const ids = sceneIdsForEntry(model, entry);
      const checked = picked.every((element) => element.showIn == null || element.showIn === "all" || ids.every((id) => element.showIn.includes(id)));
      return <label key={entry.key} className="interface-scene-option"><input type="checkbox" checked={checked} onChange={(e) => write((showIn) => toggleSceneEntry(showIn, ids, e.target.checked, model.scenes.map((s) => s.id)))} /> {entry.label}{entry.count > 1 ? " · video" : ""}</label>;
    })}
  </section>;
}
