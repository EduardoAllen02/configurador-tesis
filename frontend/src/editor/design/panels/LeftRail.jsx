import { useEffect, useRef, useState } from "react";
import { useDesignEditor, useDesignState } from "../../hooks/useTourDesign.jsx";
import AnimatePanel from "./side/AnimatePanel.jsx";
import ColorPanel from "./side/ColorPanel.jsx";
import PositionPanel from "./side/PositionPanel.jsx";
import BrandTab from "./tabs/BrandTab.jsx";
import ElementsTab, { TextTab } from "./tabs/ElementsTab.jsx";
import HotspotsTab from "./tabs/HotspotsTab.jsx";
import TemplatesTab from "./tabs/TemplatesTab.jsx";
import UploadsTab from "./tabs/UploadsTab.jsx";
import { Ico } from "./ui.jsx";
import "./panels.css";

// Barra izquierda de 72 px + un solo cajón de 360 px (docs/CONTRATO_OLEADA3.md §4). El cajón
// muestra la pestaña elegida; cuando el almacén tiene un panel lateral abierto (state.panel:
// color, posición, animar), ese panel REEMPLAZA al cajón y se cierra con X o Escape.
const TABS = [
  { id: "plantillas", label: "Plantillas", icon: "layout", View: TemplatesTab, title: "Plantillas" },
  { id: "elementos", label: "Elementos", icon: "shapes", View: ElementsTab, title: "Elementos" },
  { id: "texto", label: "Texto", icon: "type", View: TextTab, title: "Texto" },
  { id: "hotspots", label: "Hotspots", icon: "pin", View: HotspotsTab, title: "Hotspots" },
  { id: "subidos", label: "Subidos", icon: "upload", View: UploadsTab, title: "Subidos" },
  { id: "marca", label: "Marca", icon: "palette", View: BrandTab, title: "Marca" },
];
const SIDE_PANELS = { color: ColorPanel, position: PositionPanel, animate: AnimatePanel };

export default function LeftRail({ allowedTabs, detailMode = false }) {
  const tabs = allowedTabs ? TABS.filter((tab) => allowedTabs.includes(tab.id)) : TABS;
  const store = useDesignEditor();
  const panel = useDesignState((s) => s.panel);
  const [tab, setTab] = useState("elementos");
  const [open, setOpen] = useState(true);
  const [width, setWidth] = useState(() => Number(sessionStorage.getItem("studio-library-width")) || (detailMode ? 280 : 360));
  const wrap = useRef(null), resizer = useRef(null);
  useEffect(() => { const scope = wrap.current?.closest('.hs-workspace-ui'); scope?.style.setProperty('--studio-library-width', `${open ? width : 0}px`); }, [width, open]);
  useEffect(() => {
    const node = resizer.current;
    if (!node) return;
    let cleanup;
    const down = event => {
      if (event.button !== 0) return;
      event.preventDefault(); event.stopPropagation();
      const startX = event.clientX, startWidth = node.parentElement.getBoundingClientRect().width;
      const move = e => {
        const next = Math.round(Math.max(170, Math.min(440, startWidth + e.clientX - startX)));
        setWidth(next); sessionStorage.setItem("studio-library-width", String(next));
      };
      cleanup?.();
      cleanup = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); };
      const up = () => cleanup?.();
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
    };
    node.addEventListener('pointerdown', down);
    return () => { node.removeEventListener('pointerdown', down); cleanup?.(); };
  }, [open, panel?.name]);

  // Otra parte del estudio puede pedir un cajón con openPanel("drawer:<id>").
  useEffect(() => {
    const m = /^drawer:(.+)$/.exec(panel?.name ?? "");
    if (!m) return;
    if (tabs.some((t) => t.id === m[1])) {
      setTab(m[1]);
      setOpen(true);
    }
    store.closePanel();
  }, [panel, store]);

  const Side = panel ? SIDE_PANELS[panel.name] : null;
  const current = tabs.find((t) => t.id === tab) ?? tabs[0];
  const View = current.View;

  const choose = (id) => {
    if (panel) store.closePanel();
    if (id === tab && open && !panel) setOpen(false);
    else {
      setTab(id);
      setOpen(true);
    }
  };

  return (
    <div ref={wrap} className="sp-rail-wrap" style={{ "--library-width": `${open || Side ? width : 0}px` }}>
      <nav className="sp-rail" aria-label="Biblioteca">
        {tabs.map((t) => {
          const active = t.id === tab && open && !Side;
          return (
            <button key={t.id} type="button" className={`sp-rail-item${active ? " is-active" : ""}`} aria-pressed={active} aria-label={t.label} onClick={() => choose(t.id)}>
              <span className="sp-rail-icon">
                <Ico name={t.icon} size={22} />
              </span>
              <span className="sp-rail-label">{t.label}</span>
            </button>
          );
        })}
      </nav>
      {(open || Side) && (
        <aside className="sp-drawer" style={{ width }} aria-label={Side ? "Panel" : current.title}>
          {Side ? (
            <Side panel={panel} />
          ) : (
            <>
              <div className="sp-head sp-head--drawer">
                <h2>{current.title}</h2>
              </div>
              <div className="sp-scroll sp-scroll--drawer">
                <View detailMode={detailMode} />
              </div>
            </>
          )}
          <div ref={resizer} data-ui className="sp-drawer-resizer" role="separator" aria-label="Ancho de biblioteca" aria-orientation="vertical" tabIndex={0} onKeyDown={e => { if (["ArrowLeft","ArrowRight"].includes(e.key)) { e.preventDefault(); const w = Math.max(170, Math.min(440, width + (e.key === "ArrowLeft" ? -10 : 10))); setWidth(w); sessionStorage.setItem("studio-library-width",String(w)); } }} />
          <button type="button" className="sp-collapse" aria-label="Cerrar el cajón" title="Cerrar el cajón" onClick={() => (Side ? store.closePanel() : setOpen(false))}>
            <Ico name="chevron-left" size={16} />
          </button>
        </aside>
      )}
    </div>
  );
}
