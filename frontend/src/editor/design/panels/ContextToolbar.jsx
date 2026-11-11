import { useEffect, useState } from "react";
import { deleteSelection, duplicateSelection, groupSelection, ungroupSelection, selectionGrouping } from "../actions.js";
import { useDesignEditor, useDesignState } from "../../hooks/useTourDesign.jsx";
import { Field } from "./controls.jsx";
import IntroBar from "./IntroBar.jsx";
import FloatingWindow from "./FloatingWindow.jsx";
import { useElement, useWriteProps } from "./hooks.js";
import { editingSlots, hasAnimation, moreSlots, quickSlots } from "./logic.js";
import { Ico } from "./ui.jsx";
import { findElement } from "../elementOps.js";
import { numberConfiguration } from "../numberSections.js";
import NumberSectionsWindow from "./NumberSectionsWindow.jsx";
import "./panels.css";

// Barra contextual (docs/CONTRATO_OLEADA3.md §4.1): una píldora de 40 px, centrada sobre el
// lienzo, o en una fila fija externa cuando docked está activo. Sale de los `slots` de la plantilla del elemento seleccionado: los `toolbar`
// son controles rápidos; el resto va en «Más opciones». Al final, Animar y Posición.
export default function ContextToolbar({ docked = false }) {
  const store = useDesignEditor();
  const design = useDesignState((s) => s.design);
  const activeGroupId = useDesignState((s) => s.activeGroupId);
  const selection = useDesignState((s) => s.selection);
  const screen = useDesignState((s) => s.screen);
  const editing = useDesignState((s) => s.editing);
  const [hintVisible, setHintVisible] = useState(true);
  useEffect(() => { const timer = setTimeout(() => setHintVisible(false), 5000); return () => clearTimeout(timer); }, []);

  let body;
  if (editing) body = <EditingBar id={editing.id} slotKey={editing.key} />;
  else if (selection.length === 0) body = screen === "intro" ? <IntroBar /> : hintVisible ? <span className="sp-tb-hint" role="status">Selecciona un elemento o agrega uno desde la izquierda</span> : null;
  else if (selection.length === 1) body = <ElementBar key={selection[0]} id={selection[0]} />;
  else body = <MultiBar count={selection.length} />;

  // Mientras se edita un texto en el lienzo, los botones no le quitan el foco al editor.
  const keepFocus = (e) => {
    if (editing && !/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) e.preventDefault();
  };

  return (
    <div className={`sp-toolbar-row${docked ? " sp-toolbar-row--docked" : ""}`} role="toolbar" aria-label="Opciones del elemento">
      {activeGroupId && <div className="cv-group-bar"><span>Editando grupo: {findElement(design, screen, activeGroupId)?.name || "Grupo"}</span><button type="button" onClick={() => store.exitGroup()}>Salir del grupo (Esc)</button></div>}
      {body && <div className="sp-toolbar" onMouseDown={keepFocus}>
        {body}
      </div>}
      <NumberSectionsWindow />
    </div>
  );
}

function SlotControls({ slots, ctx, props, write }) {
  return slots.map((slot) => <Field key={slot.key} slot={slot} mode="toolbar" value={props[slot.key]} ctx={ctx} onChange={(v) => write({ [slot.key]: v }, `Editar ${slot.label.toLowerCase()}`)} />);
}

function ElementBar({ id }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const store = useDesignEditor();
  const { element, template, props } = useElement(id);
  const write = useWriteProps(id);
  const config = numberConfiguration(store.getState().design, store.getState().screen, id);
  if (!element || !template) return <span className="sp-tb-hint">Este elemento usa una plantilla que ya no existe</span>;
  const ctx = { id, template, props, write };
  const quick = quickSlots(template);
  const more = moreSlots(template);
  return (
    <>
      <span className="sp-tb-name" title={template.name}>
        {element.name || template.name}
      </span>
      {quick.length > 0 && <span className="sp-tb-sep" />}
      {config && <button type="button" className="sp-tb-btn sp-tb-btn--text" onClick={() => store.openPanel("element-config", { id: config.id })}>Configurar {config.kind === "stats-counter" ? "contador" : "cifras"}</button>}
      {element.template === "group" && <>
        {element.props?.legacyTemplate === "button" && <button type="button" className="sp-tb-btn sp-tb-btn--text" disabled={element.locked} onClick={() => { store.enterGroup(id); store.select(element.children.find(child => child.role === "button-label")?.id); }}>Editar texto</button>}
        <button type="button" className="sp-tb-btn sp-tb-btn--text" disabled={element.locked} onClick={() => store.enterGroup(id)}>Editar grupo</button>
        <GroupingButtons />
      </>}
      <SlotControls slots={quick} ctx={ctx} props={props} write={write} />
      {more.length > 0 && (
        <button type="button" className={`sp-tb-btn${moreOpen ? " is-open" : ""}`} title="Más opciones" aria-label="Más opciones" aria-haspopup="dialog" aria-expanded={moreOpen} onClick={() => setMoreOpen(!moreOpen)}>
          <Ico name="more" size={18} />
          <span className="sp-tb-text">Más opciones</span>
        </button>
      )}
      {moreOpen && <FloatingWindow title={`Más opciones · ${element.name || template.name}`} onClose={() => setMoreOpen(false)}><MoreForm slots={more} ctx={ctx} props={props} write={write} />{template.id === "text" && <div className="sp-toolbar-overflow-actions">
        <button type="button" className="sp-btn" onClick={() => { setMoreOpen(false); store.openPanel("animate", { id }); }}><Ico name="sparkle" size={18} />Animar</button>
        <button type="button" className="sp-btn" onClick={() => { setMoreOpen(false); store.openPanel("position"); }}><Ico name="layout" size={18} />Posición</button>
      </div>}</FloatingWindow>}
      <span className="sp-tb-sep" />
      {hasAnimation(template) && (
        <button type="button" className={`sp-tb-btn${template.id === "text" ? " sp-text-secondary" : ""}`} title="Animar" aria-label="Animar" onClick={() => store.openPanel("animate", { id })}>
          <Ico name="sparkle" size={18} /><span className="sp-tb-text">Animar</span>
        </button>
      )}
      <button type="button" className="sp-tb-btn sp-text-secondary" title="Posición" aria-label="Posición" onClick={() => store.openPanel("position")}>
        <Ico name="layout" size={18} /><span className="sp-tb-text">Posición</span>
      </button>
    </>
  );
}

export function MoreForm({ slots, ctx, props, write }) {
  const groups = new Map();
  for (const slot of slots) {
    const name = slot.group || "";
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name).push(slot);
  }
  return (
    <div className="sp-form">
      {[...groups].map(([name, fields]) => <section key={name} className="sp-form">
        {name && <h3 className="sp-options-group-title">{name}</h3>}
        {fields.map((slot) => <Field key={slot.key} slot={slot} mode="form" value={props[slot.key]} ctx={ctx} onChange={(v) => write({ [slot.key]: v }, `Editar ${slot.label.toLowerCase()}`)} />)}
      </section>)}
    </div>
  );
}

function EditingBar({ id, slotKey }) {
  const { element, template, props } = useElement(id);
  const write = useWriteProps(id);
  if (!element || !template) return null;
  const ctx = { id, template, props, write };
  if (template.id === "text") return <ElementBar id={id} />;
  const slots = editingSlots(template, slotKey);
  return (
    <>
      <span className="sp-tb-name">Editando texto</span>
      <span className="sp-tb-sep" />
      <SlotControls slots={slots} ctx={ctx} props={props} write={write} />
    </>
  );
}

function MultiBar({ count }) {
  const store = useDesignEditor();
  return (
    <>
      <span className="sp-tb-name">{count} elementos</span>
      <span className="sp-tb-sep" />
      <GroupingButtons multiple />
      <button type="button" className="sp-tb-btn sp-text-secondary" title="Posición" aria-label="Posición" onClick={() => store.openPanel("position")}>
        <Ico name="layout" size={18} /><span className="sp-tb-text">Posición</span>
      </button>
      <button type="button" className="sp-tb-btn" title="Duplicar" aria-label="Duplicar" onClick={() => duplicateSelection(store)}>
        <Ico name="copy" size={18} />
        <span className="sp-tb-text">Duplicar</span>
      </button>
      <button type="button" className="sp-tb-btn" title="Eliminar" aria-label="Eliminar" onClick={() => deleteSelection(store)}>
        <Ico name="trash" size={18} />
        <span className="sp-tb-text">Eliminar</span>
      </button>
    </>
  );
}

function GroupingButtons({ multiple = false }) {
  const store = useDesignEditor();
  const { groupReason, canUngroup, protectedGroups } = selectionGrouping(store);
  const selection = store.getState().selection;
  return <>
    {multiple && <button type="button" className="sp-tb-btn sp-tb-btn--text" disabled={!!groupReason} title={groupReason || "Agrupar (Ctrl+G)"} onClick={() => groupSelection(store)}>Agrupar</button>}
    {(canUngroup || (!multiple && !selection.some(id => protectedGroups.includes(id)))) && <button type="button" className="sp-tb-btn sp-tb-btn--text" disabled={!canUngroup} title="Desagrupar (Ctrl+Shift+G)" onClick={() => ungroupSelection(store)}>Desagrupar</button>}
  </>;
}
