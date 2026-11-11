import { useEffect, useRef, useState } from "react";
import { useDesignEditor, useDesignState } from "../../hooks/useTourDesign.jsx";
import { CheckIcon, DesktopIcon, HomeIcon, PhoneIcon, TabletIcon, TourIcon } from "./canvasIcons.jsx";
import { SLIDER_MAX, SLIDER_MIN, ZOOM_PRESETS, sliderToZoom, zoomToSlider } from "./zoom.js";

const PAGES = [
  { id: "intro", label: "Inicio", Icon: HomeIcon, hint: "Pantalla de inicio" },
  { id: "tour", label: "Recorrido", Icon: TourIcon, hint: "El tour en 360°" },
];
const DEVICE_LIST = [
  { id: "desktop", label: "Escritorio", Icon: DesktopIcon },
  { id: "tablet", label: "Tablet", Icon: TabletIcon },
  { id: "mobile", label: "Móvil", Icon: PhoneIcon },
];

// Barra inferior del lienzo (40 px): páginas · dispositivo · zoom.
//   zoom = nivel actual (1 = 100 %) · fitted = ¿está en "Ajustar"? · onZoom(z) · onFit()
export default function BottomBar({ zoom, fitted, onZoom, onFit, hidePages = false }) {
  const store = useDesignEditor();
  const screen = useDesignState((s) => s.screen);
  const device = useDesignState((s) => s.device);
  const [menu, setMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menu) return undefined;
    const close = (e) => {
      if (!menuRef.current?.contains(e.target)) setMenu(false);
    };
    const esc = (e) => {
      if (e.key !== "Escape") return;
      e.preventDefault(); // los atajos del lienzo respetan lo ya atendido: este Escape no deselecciona
      e.stopPropagation();
      setMenu(false);
    };
    window.addEventListener("pointerdown", close, true);
    window.addEventListener("keydown", esc, true);
    return () => {
      window.removeEventListener("pointerdown", close, true);
      window.removeEventListener("keydown", esc, true);
    };
  }, [menu]);

  const pick = (fn) => () => {
    fn();
    setMenu(false);
  };

  return (
    <div className="cv-bar" role="toolbar" aria-label="Pantalla, dispositivo y zoom">
      {!hidePages && <div className="cv-bar-group" role="group" aria-label="Pantalla">
        {PAGES.map(({ id, label, Icon, hint }) => (
          <button
            key={id}
            type="button"
            className={`cv-bar-btn${screen === id ? " is-active" : ""}`}
            aria-pressed={screen === id}
            title={hint}
            onClick={() => store.setScreen(id)}
          >
            <Icon />
            {label}
          </button>
        ))}
      </div>}

      <div className="cv-bar-group" role="group" aria-label="Dispositivo">
        {DEVICE_LIST.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            className={`cv-bar-btn${device === id ? " is-active" : ""}`}
            aria-pressed={device === id}
            onClick={() => store.setDevice(id)}
          >
            <Icon />
            {label}
          </button>
        ))}
        {device === "tablet" && <span className="cv-bar-note" title="Tablet usa el diseño de escritorio, escalado">Tablet usa el diseño de escritorio, escalado</span>}
        {device === "mobile" && <span className="cv-bar-note" title="Móvil: lo que muevas queda “a mano”">Móvil: lo que muevas queda “a mano”</span>}
      </div>

      <div className="cv-bar-zoom">
        <input
          type="range"
          className="cv-zoom-slider"
          min={SLIDER_MIN}
          max={SLIDER_MAX}
          step="any"
          value={zoomToSlider(zoom)}
          onChange={(e) => onZoom(sliderToZoom(Number(e.target.value)))}
          aria-label="Zoom"
        />
        <div className="cv-zoom-menu-wrap" ref={menuRef}>
          <button type="button" className="cv-bar-btn cv-zoom-pct" onClick={() => setMenu((v) => !v)} aria-haspopup="menu" aria-expanded={menu} title="Opciones de zoom">
            {Math.round(zoom * 100)} %
          </button>
          {menu && (
            <div className="cv-menu" role="menu">
              {[...ZOOM_PRESETS].reverse().map((z) => (
                <button key={z} type="button" role="menuitem" className="cv-menu-item" onClick={pick(() => onZoom(z))}>
                  {Math.round(z * 100)} %
                  {!fitted && Math.abs(zoom - z) < 0.005 && <CheckIcon />}
                </button>
              ))}
              <div className="cv-menu-sep" />
              <button type="button" role="menuitem" className="cv-menu-item" onClick={pick(onFit)}>
                Ajustar
                {fitted ? <CheckIcon /> : <kbd>Ctrl+Alt+0</kbd>}
              </button>
            </div>
          )}
        </div>
        <button type="button" className="cv-bar-btn" onClick={onFit} title="Ajustar a la pantalla (Ctrl+Alt+0)">
          Ajustar
        </button>
      </div>
    </div>
  );
}
