import { useEffect, useState } from "react";
import { useDesignEditor, useDesignState } from "../../hooks/useTourDesign.jsx";
import { CONTEXT_ACTIONS, CONTEXT_MENU_LIMIT, contextMenuOf, safeContextUrl } from "../../../runtime/model/contextMenu.js";
import "./ContextMenuSettings.css";

// Keep an incomplete address local; never autosave a broken URL over the last valid one.
function UrlField({ label, value, onCommit, id }) {
  const [draft, setDraft] = useState(value);
  const [invalid, setInvalid] = useState(false);
  useEffect(() => { setDraft(value); setInvalid(false); }, [value]);
  function commit() {
    const valid = !draft.trim() || !!safeContextUrl(draft);
    setInvalid(!valid);
    if (valid) onCommit(safeContextUrl(draft));
  }
  return <label className="context-menu-field" htmlFor={id}>
    <span>{label}</span>
    <input id={id} type="url" className="input" placeholder="https://…" maxLength={2048} value={draft} aria-invalid={invalid}
      onChange={event => { setDraft(event.target.value); setInvalid(false); }} onBlur={commit}
      onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); event.currentTarget.blur(); } }} />
    {invalid && <span className="error-text" role="alert">Usa una dirección http:// o https:// válida. Este enlace aún no se ha guardado.</span>}
  </label>;
}

export default function ContextMenuSettings() {
  const store = useDesignEditor();
  const design = useDesignState(state => state.design);
  const status = useDesignState(state => state.status);
  const error = useDesignState(state => state.error);
  const config = contextMenuOf(design?.contextMenu);
  function update(updater, key = "config") {
    store.apply(prev => ({ ...prev, contextMenu: updater(contextMenuOf(prev.contextMenu)) }), {
      label: "Menú de clic derecho", mergeKey: `context-menu:${key}`,
    });
  }
  function changeItem(id, patch) { update(prev => ({ ...prev, items: prev.items.map(item => item.id === id ? { ...item, ...patch } : item) }), id); }
  function moveItem(index, delta) {
    update(prev => { const items = [...prev.items]; [items[index], items[index + delta]] = [items[index + delta], items[index]]; return { ...prev, items }; }, "order");
  }
  return <section className="context-menu-settings stack" aria-label="Menú de clic derecho">
    <div>
      <h3>Menú de clic derecho</h3>
      <p className="text-soft">Muestra opciones y el crédito de tu organización al hacer clic derecho sobre la panorámica. Se guarda solo para este tour.</p>
    </div>
    <label className="context-menu-check">
      <input id="context-menu-enabled" type="checkbox" checked={config.enabled} disabled={!design}
        onChange={event => update(prev => ({ ...prev, enabled: event.target.checked }))} />
      Activar menú en este tour
    </label>
    {config.enabled && <>
      <div className="stack context-menu-options">
        <strong>Opciones del menú ({config.items.length}/{CONTEXT_MENU_LIMIT})</strong>
        {config.items.map((item, index) => <details className="context-menu-option" key={item.id}>
          <summary>{item.label.trim() || CONTEXT_ACTIONS[item.type]}</summary>
          <div className="stack">
            <label className="context-menu-field">Acción
              <select className="select" aria-label={`Acción de opción ${index + 1}`} value={item.type} onChange={event => changeItem(item.id, { type: event.target.value })}>
                {Object.entries(CONTEXT_ACTIONS).map(([type, label]) => <option key={type} value={type}>{label}</option>)}
              </select>
            </label>
            <label className="context-menu-field">Texto del menú
              <input className="input" aria-label={`Texto de opción ${index + 1}`} value={item.label} placeholder={CONTEXT_ACTIONS[item.type]} maxLength={100}
                onChange={event => changeItem(item.id, { label: event.target.value })} />
            </label>
            {item.type === "link" && <UrlField id={`context-url-${item.id}`} label="Enlace" value={item.url} onCommit={url => changeItem(item.id, { url })} />}
            <div className="row context-menu-option-actions">
              <button className="btn btn-secondary btn-sm" type="button" aria-label={`Subir opción ${index + 1}`} disabled={index === 0} onClick={() => moveItem(index, -1)}>↑</button>
              <button className="btn btn-secondary btn-sm" type="button" aria-label={`Bajar opción ${index + 1}`} disabled={index === config.items.length - 1} onClick={() => moveItem(index, 1)}>↓</button>
              <button className="btn btn-ghost btn-sm" type="button" onClick={() => update(prev => ({ ...prev, items: prev.items.filter(row => row.id !== item.id) }), "remove")}>Quitar opción</button>
            </div>
          </div>
        </details>)}
        <button className="btn btn-secondary btn-sm" type="button" disabled={config.items.length >= CONTEXT_MENU_LIMIT}
          onClick={() => update(prev => ({ ...prev, items: [...prev.items, { id: crypto.randomUUID(), type: "link", label: "", url: "" }] }), "add")}>+ Agregar opción</button>
        <span className="text-faint">Los enlaces se abren en otra pestaña. Pantalla completa aparece cuando el navegador la permite.</span>
      </div>
      <div className="stack context-menu-credit-settings">
        <label className="context-menu-check"><input id="context-credit-enabled" type="checkbox" checked={config.credit.enabled}
          onChange={event => update(prev => ({ ...prev, credit: { ...prev.credit, enabled: event.target.checked } }), "credit")} />Mostrar «Created by»</label>
        {config.credit.enabled && <>
          <label className="context-menu-field">Nombre de la organización o autor
            <input id="context-credit-name" className="input" placeholder="Tu organización" maxLength={100} value={config.credit.name}
              onChange={event => update(prev => ({ ...prev, credit: { ...prev.credit, name: event.target.value } }), "credit-name")} />
          </label>
          <UrlField id="context-credit-url" label="Enlace del crédito (opcional)" value={config.credit.url}
            onCommit={url => update(prev => ({ ...prev, credit: { ...prev.credit, url } }), "credit-url")} />
          {config.credit.name.trim() && <span className="text-soft">Created by {config.credit.name.trim()}</span>}
        </>}
      </div>
      <p className="text-faint">Los cambios se guardan automáticamente. Abre «Vista previa» para probar el clic derecho.</p>
    </>}
    {design?.contextMenu && <span role="status" className="text-soft">{status === "saved" ? "Guardado" : status === "error" ? "No se pudo guardar" : "Guardando…"}</span>}
    {error && <div role="alert" className="error-text">{error} <button className="btn btn-secondary btn-sm" type="button" onClick={() => store.flush().catch(() => {})}>Reintentar</button></div>}
  </section>;
}
