import { useDesignEditor, useDesignState } from "../hooks/useTourDesign.jsx";
import { newElementId, updateElement, findElement } from "./elementOps.js";
import { useSceneEntries } from "./panels/hooks.js";
import { panelIdOfScreen } from "../../runtime/model/interfaceModel.js";

const POSITIONS = [["custom", "En el lienzo"], ["center", "Centro"], ["left", "Izquierda"], ["right", "Derecha"], ["bottom", "Abajo"]];

export function createReusablePanel(id = newElementId()) {
  const text = (name, bind, value, y, size) => ({ id: newElementId(), template: "text", name, bind, props: { text: value, size, color: "#ffffff" }, frame: { anchor: "top-left", x: 40, y, w: 440, h: 70 }, mobile: { mode: "auto" } });
  return { id, name: "Panel de información", closeButton: true, position: { desktop: "custom", mobile: "bottom" }, elements: [{
    id: newElementId(), template: "group", name: "Contenido del panel", props: { contentWidth: 520, contentHeight: 440, autoFit: false }, frame: { anchor: "center", x: 0, y: 0, w: 520, h: 440 }, mobile: { mode: "auto" }, z: 1,
    children: [
      { id: newElementId(), template: "shape", name: "Fondo del panel", props: { fill: "#142544", radius: 24 }, frame: { anchor: "top-left", x: 0, y: 0, w: 520, h: 440 }, z: 0 },
      { ...text("Título", "title", "Título del hotspot", 60, 32), z: 1 },
      { ...text("Descripción", "description", "Descripción del hotspot", 150, 20), z: 2 },
      { ...text("Precio", "price", "$2,500", 270, 28), z: 3 },
    ],
  }] };
}

export default function InterfacePages() {
  const store = useDesignEditor();
  const entries = useSceneEntries();
  const sceneId = useDesignState((s) => s.previewSceneId);
  const design = useDesignState((s) => s.design);
  const screen = useDesignState((s) => s.screen);
  const panelId = panelIdOfScreen(screen);
  const panel = design?.panels?.find((p) => p.id === panelId);
  const patch = (value) => store.apply((d) => ({ ...d, panels: d.panels.map((p) => p.id === panelId ? { ...p, ...value } : p) }), { label: "Editar panel" });
  const addPanel = () => {
    const next = createReusablePanel();
    store.apply((d) => ({ ...d, panels: [...(d.panels ?? []), next] }), { label: "Crear panel" });
    store.setScreen(`panel:${next.id}`);
  };
  return <div className="interface-pages">
    <nav aria-label="Páginas de la interfaz">
      <div className="interface-screen-toggle" role="group" aria-label="Pantalla a editar">
        <button type="button" aria-pressed={screen === "intro"} onClick={() => store.setScreen("intro")}>Página de inicio</button>
        <button type="button" aria-pressed={screen === "tour"} onClick={() => store.setScreen("tour")}>Recorrido</button>
      </div>
      <select aria-label="Paneles reutilizables" value={panelId ?? ""} onChange={(e) => e.target.value === "new" ? addPanel() : e.target.value && store.setScreen(`panel:${e.target.value}`)}>
        <option value="">Paneles</option>{(design?.panels ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}<option value="new">+ Crear panel</option>
      </select>
    </nav>
    {screen === "tour" && entries.length > 0 && <label>Escena <select aria-label="Escena de vista previa" value={sceneId ?? entries[0]?.sceneId ?? ""} onChange={(e) => store.setPreviewScene(e.target.value)}>{entries.map((entry) => <option key={entry.key} value={entry.sceneId}>{entry.label}</option>)}</select></label>}
    <label><input type="checkbox" checked={!!design?.screens?.intro?.enabled} onChange={(e) => store.apply((d) => ({ ...d, screens: { ...d.screens, intro: { ...d.screens.intro, enabled: e.target.checked } } }), { label: "Usar página de inicio" })} /> Usar página de inicio</label>
    {panel && <div className="interface-panel-settings">
      <input aria-label="Nombre del panel" value={panel.name} onChange={(e) => patch({ name: e.target.value })} />
      <label><input type="checkbox" checked={panel.closeButton !== false} onChange={(e) => patch({ closeButton: e.target.checked })} /> Cierre visible</label>
      {["desktop", "mobile"].map((device) => <label key={device}>{device === "desktop" ? "Escritorio" : "Móvil"} <select aria-label={`Posición panel ${device}`} value={panel.position?.[device] ?? "custom"} onChange={(e) => patch({ position: { ...panel.position, [device]: e.target.value } })}>{POSITIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>)}
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => { store.apply((d) => ({ ...d, panels: d.panels.filter((p) => p.id !== panelId), panelDefaults: Object.fromEntries(Object.entries(d.panelDefaults ?? {}).filter(([, id]) => id !== panelId)) }), { label: "Eliminar panel" }); store.setScreen("tour"); }}>Eliminar panel</button>
    </div>}
  </div>;
}

export function PanelBinding() {
  const store = useDesignEditor();
  const { design, screen, selection } = useDesignState();
  const element = selection.length === 1 ? findElement(design, screen, selection[0]) : null;
  if (!panelIdOfScreen(screen) || !element || !["text", "image"].includes(element.template)) return null;
  return <label className="interface-binding">Datos del hotspot <select aria-label="Enlazar datos del hotspot" value={element.bind ?? ""} onChange={(e) => store.apply((d) => updateElement(d, screen, element.id, { bind: e.target.value || undefined }), { label: "Enlazar datos" })}><option value="">Sin enlace</option>{(element.template === "image" ? ["image"] : ["title", "description", "price"]).map((key) => <option key={key} value={key}>{{ title: "Título", description: "Descripción", price: "Precio", image: "Imagen" }[key]}</option>)}</select></label>;
}
