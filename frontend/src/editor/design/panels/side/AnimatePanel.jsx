import { useEffect } from "react";
import { ANIM_KINDS } from "../../../../runtime/layout/util.js";
import { useDesignEditor, useDesignState } from "../../../hooks/useTourDesign.jsx";
import { RangeEditor } from "../controls.jsx";
import { useEscape } from "../escape.js";
import { useElement, useWriteProps } from "../hooks.js";
import { PanelHeader } from "../ui.jsx";

// Panel Animar: la animación de ENTRADA del elemento (las que sabe hacer el motor:
// ninguna, subir, aparecer y desenfoque) y su retraso. Cada tarjeta se anima al pasar el cursor.
const LABELS = { none: "Ninguna", rise: "Subir", fade: "Aparecer", blur: "Desenfoque" };

export default function AnimatePanel({ panel }) {
  const store = useDesignEditor();
  const selection = useDesignState((s) => s.selection);
  const { element, template } = useElement(panel.id);
  const write = useWriteProps(panel.id);
  useEscape(true, () => store.closePanel());
  useEffect(() => {
    if (!element || !selection.includes(panel.id)) store.closePanel();
  }, [element, selection, panel.id, store]);
  if (!element) return null;

  // `animation` guardada (no la mezclada con el default): sin ella, la pantalla de inicio escalona sola.
  const saved = element.props?.animation;
  const intro = store.getState().screen === "intro";
  const kind = saved?.kind ?? (intro && !saved ? null : "none");
  const delayMs = Number.isFinite(saved?.delayMs) ? saved.delayMs : 0;
  const set = (patch) => write({ animation: { kind: saved?.kind ?? "none", delayMs, ...patch } }, "Animar");

  return (
    <div className="sp-panel" role="dialog" aria-label="Animar">
      <PanelHeader title="Animar" onClose={() => store.closePanel()} />
      <div className="sp-scroll">
        <p className="sp-hint">Cómo aparece «{element.name || template?.name}» cuando se abre la pantalla. Pasa el cursor para verlas.</p>
        <div className="sp-anim-grid" role="radiogroup" aria-label="Animación de entrada">
          {ANIM_KINDS.map((k) => (
            <button key={k} type="button" role="radio" aria-checked={kind === k} className={`sp-anim${kind === k ? " is-active" : ""}`} onClick={() => set({ kind: k })}>
              <span className="sp-anim-stage">
                <i className={`sp-anim-demo sp-anim-demo--${k}`} />
              </span>
              <span>{LABELS[k] ?? k}</span>
            </button>
          ))}
        </div>
        {kind === null && <p className="sp-hint">Ahora usa la entrada automática de la pantalla de inicio: sube escalonado. Elige «Ninguna» para quitarla.</p>}
        <label className="sp-field">
          <span className="sp-field-label">Retraso</span>
          <RangeEditor value={delayMs} min={0} max={3000} step={50} unit="ms" label="Retraso" onChange={(v) => set({ delayMs: v })} />
        </label>
      </div>
    </div>
  );
}
