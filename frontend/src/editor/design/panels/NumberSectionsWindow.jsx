import { useEffect, useState } from "react";
import { useDesignEditor, useDesignState } from "../../hooks/useTourDesign.jsx";
import { MAX_SECTIONS, numberConfiguration, resizeSections, sectionValues, writeNumberSections } from "../numberSections.js";
import FloatingWindow from "./FloatingWindow.jsx";

export default function NumberSectionsWindow() {
  const state = useDesignState();
  if (state.panel?.name !== "element-config") return null;
  const config = numberConfiguration(state.design, state.screen, state.panel.id);
  return config ? <SectionSettings key={config.id} config={config} initialIndex={state.panel.section || 0} /> : null;
}

function SectionSettings({ config, initialIndex }) {
  const store = useDesignEditor();
  const screen = useDesignState((state) => state.screen);
  const savedRows = sectionValues(config), rows = savedRows.length ? savedRows : resizeSections([], 1, config.kind), counter = config.kind === "stats-counter";
  const [active, setActive] = useState(initialIndex), [playing, setPlaying] = useState(false);
  const index = Math.max(0, Math.min(active, rows.length - 1));
  const item = rows[index] || { value: 0, label: "" };
  const props = config.leaf.props ?? {};
  useEffect(() => {
    if (counter) store.setElementPreview({ id: config.leaf.id, index, playing });
    return () => { if (counter) store.setElementPreview(null); };
  }, [store, counter, config.leaf.id, index, playing]);
  const close = () => store.closePanel();
  const write = (next, options = {}, label = "Editar secciones") => store.apply((design) => writeNumberSections(design, screen, config.id, next, options), { label, mergeKey: `${config.id}.sections.${label}` });
  const patchItem = (patch) => write(rows.map((row, n) => n === index ? { ...row, ...patch } : row), {}, "Editar cifra");
  const move = (delta) => {
    const next = [...rows], target = index + delta;
    [next[index], next[target]] = [next[target], next[index]];
    write(next, {}, "Ordenar secciones"); setActive(target); setPlaying(false);
  };
  return <FloatingWindow title={counter ? "Configurar contador" : "Configurar fila de cifras"} windowKey="number-sections" onClose={close}>
    <div className="sp-form">
      {config.locked && <p className="sp-hint">Desbloquea el elemento y sus piezas para cambiar su configuración.</p>}
      <fieldset className="sp-number-settings" disabled={config.locked}>
        <label className="sp-field"><span className="sp-field-label">Cantidad de secciones</span><select className="sp-select" aria-label="Cantidad de secciones" value={rows.length} onChange={(event) => { write(resizeSections(rows, event.target.value, config.kind), {}, "Cambiar cantidad"); setPlaying(false); }}>{Array.from({ length: MAX_SECTIONS }, (_, n) => <option key={n} value={n + 1}>{n + 1}</option>)}</select></label>
        <div className="sp-number-tabs" role="group" aria-label="Sección a editar">{rows.map((row, n) => <button key={row.key} type="button" className={`sp-btn${index === n ? " is-active" : ""}`} aria-pressed={index === n} onClick={() => { setActive(n); setPlaying(false); }}>Sección {n + 1}</button>)}</div>
        <label className="sp-field"><span className="sp-field-label">{counter ? "Valor del contador" : "Valor"}</span><input className="sp-input" aria-label="Valor de la sección" type={counter ? "number" : "text"} value={item.value ?? ""} onChange={(event) => patchItem({ value: counter ? Number(event.target.value) : event.target.value })} /></label>
        {counter && <><label className="sp-field"><span className="sp-field-label">Sufijo (opcional)</span><input className="sp-input" aria-label="Sufijo de la sección" value={item.suffix || ""} placeholder="+, m², %…" onChange={(event) => patchItem({ suffix: event.target.value })} /></label>
          <label className="sp-field"><span className="sp-field-label">Sentido de la cuenta</span><select className="sp-select" aria-label="Sentido de la cuenta" value={item.direction || "up"} onChange={(event) => patchItem({ direction: event.target.value })}><option value="up">De cero al valor</option><option value="down">Del valor a cero</option></select></label></>}
        <label className="sp-field"><span className="sp-field-label">Descripción</span><textarea className="sp-input sp-textarea sp-textarea--compact" rows={1} aria-label="Descripción de la sección" value={item.label || ""} onChange={(event) => patchItem({ label: event.target.value })} /></label>
        <div className="sp-row"><button type="button" className="sp-btn" disabled={index === 0} onClick={() => move(-1)}>Mover antes</button><button type="button" className="sp-btn" disabled={index >= rows.length - 1} onClick={() => move(1)}>Mover después</button><button type="button" className="sp-btn" disabled={rows.length < 2} onClick={() => { write(rows.filter((_, n) => n !== index), {}, "Quitar sección"); setPlaying(false); }}>Quitar sección</button></div>
        {counter ? <>
          <label className="sp-field"><span className="sp-field-label">Duración de la cuenta (segundos)</span><input className="sp-input" type="number" min="0" max="30" step="0.1" aria-label="Duración de la cuenta en segundos" value={(props.countMs ?? 1100) / 1000} onChange={(event) => write(rows, { countMs: Math.max(0, Math.min(30, Number(event.target.value))) * 1000 }, "Duración de la cuenta")} /></label>
          <label className="sp-field"><span className="sp-field-label">Tiempo por sección (segundos)</span><input className="sp-input" type="number" min="0.8" max="60" step="0.1" aria-label="Tiempo por sección en segundos" value={(props.rotateMs ?? 4200) / 1000} onChange={(event) => write(rows, { rotateMs: Math.max(.8, Math.min(60, Number(event.target.value))) * 1000 }, "Tiempo por sección")} /></label>
          <label className="sp-row"><input type="checkbox" checked={props.showTicks !== false} onChange={(event) => write(rows, { showTicks: event.target.checked }, "Mostrar progreso")} /> Mostrar indicadores de sección</label>
          <button type="button" className="sp-btn" onClick={() => setPlaying(!playing)}>{playing ? "Pausar prueba" : "Reproducir prueba"}</button>
          <p className="sp-hint">Al seleccionar el contador se pausa en la sección visible. Los cambios se guardan automáticamente; la reproducción de prueba no se guarda.</p>
        </> : <p className="sp-hint">Puedes editar los textos con doble clic en el lienzo. Cambiar la cantidad o el orden redistribuye cifras y separadores; los estilos de las piezas se conservan.</p>}
      </fieldset>
      <button type="button" className="sp-btn" onClick={close}>Listo</button>
    </div>
  </FloatingWindow>;
}
