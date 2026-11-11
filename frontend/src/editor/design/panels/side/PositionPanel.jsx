import SceneVisibilityPanel from "./SceneVisibilityPanel.jsx";
import { useEffect, useMemo, useState } from "react";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { getTemplate } from "../../../../runtime/templates/index.js";
import { useDesignEditor, useDesignState } from "../../../hooks/useTourDesign.jsx";
import { arrangeSelection } from "../../actions.js";
import { setFrame, setLayerOrder, setMobileMode, updateElement, flattenElements, parentOf, editableElements, findElement } from "../../elementOps.js";
import { autoAnchor, frameFromRect } from "../../geometry.js";
import { useEscape } from "../escape.js";
import { useScreenElements } from "../hooks.js";
import { alignRect, canAlign, freeAxes, frameForRect, frameWithField, isAligned, pinFrame, stretchAnchor, unionRect } from "../logic.js";
import { measureElement, measureHost } from "../measure.js";
import { Ico, PanelHeader, Segmented, Tabs } from "../ui.jsx";

// Panel Posición (INVESTIGACION_CANVA §6): pestañas Organizar | Capas.
//  Organizar: orden (adelante/atrás), alinear a la página, «Fijar a…» (ancla 3×3 + estirar),
//             Ancho/Alto/X/Y en px de diseño y comportamiento «En móvil».
//  Capas: lista con asa de arrastre, ojo y candado; la selección va sincronizada con el lienzo.

const ALIGN_LABEL = {
  top: ["align-top", "Arriba"],
  left: ["align-left", "Izquierda"],
  middle: ["align-middle", "En medio"],
  center: ["align-center", "Centro"],
  bottom: ["align-bottom", "Abajo"],
  right: ["align-right", "Derecha"],
};
const ANCHOR_GRID = ["top-left", "top", "top-right", "left", "center", "right", "bottom-left", "bottom", "bottom-right"];
const ANCHOR_NAME = {
  "top-left": "arriba a la izquierda",
  top: "arriba al centro",
  "top-right": "arriba a la derecha",
  left: "a la izquierda",
  center: "al centro",
  right: "a la derecha",
  "bottom-left": "abajo a la izquierda",
  bottom: "abajo al centro",
  "bottom-right": "abajo a la derecha",
};

// Ancla de «Estirar a lo ancho / a lo alto»: si ya está estirado en el otro eje, pasa a ocupar todo.
function stretchTo(axis, current, m) {
  const other = axis === "x" ? /^stretch-(left|right)$/ : /^stretch-(top|bottom)$/;
  return other.test(current) ? "stretch-fill" : stretchAnchor(axis, m.rect, m.container);
}

// Medidas de los elementos seleccionados; se vuelven a leer tras cada cambio del diseño.
function useMeasures(ids) {
  const design = useDesignState((s) => s.design);
  const device = useDesignState((s) => s.device);
  const screen = useDesignState((s) => s.screen);
  const [m, setM] = useState({});
  const key = ids.join(",");
  useEffect(() => {
    const read = () => setM(Object.fromEntries(ids.map((id) => [id, measureElement(id)])));
    const t1 = setTimeout(read, 30);
    const t2 = setTimeout(read, 180); // tras el segundo layout (fuentes, imágenes)
    // El motor recoloca los elementos por su cuenta (cambio de dispositivo, redimensión de la
    // mesa): cada recolocación reescribe su `style`, y eso vuelve a medir.
    let timer = null;
    const mo = new MutationObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(read, 40);
    });
    const hosts = new Set(ids.map((id) => measureHost(id)).filter(Boolean));
    hosts.forEach((host) => mo.observe(host, { subtree: true, attributes: true, attributeFilter: ["style"] }));
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(timer);
      mo.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [design, device, screen, key]);
  return m;
}

// Frame que se edita según el dispositivo: el de escritorio/tablet, o el propio de móvil en "a mano".
function editableFrame(el, device) {
    if (el.parentId) return device === "mobile" ? el.mobile?.groupFrame || el.frame : el.frame;
  if (device === "mobile") return el.mobile?.mode === "custom" && el.mobile.frame ? el.mobile.frame : null;
  return el.frame;
}

export default function PositionPanel() {
  const store = useDesignEditor();
  const { design, screen, elements } = useScreenElements();
  const selection = useDesignState((s) => s.selection);
  const [tab, setTab] = useState("arrange");
  useEscape(true, () => store.closePanel());
  return (
    <div className="sp-panel" role="dialog" aria-label="Posición">
      <PanelHeader title="Posición" onClose={() => store.closePanel()} />
      <Tabs
        value={tab}
        onChange={setTab}
        options={[
          { value: "arrange", label: "Organizar" },
          { value: "layers", label: "Capas" },
        ]}
      />
      <div className="sp-scroll">{tab === "arrange" ? <Arrange design={design} screen={screen} elements={elements} selection={selection} /> : <Layers screen={screen} elements={elements} selection={selection} />}</div>
    </div>
  );
}

// ── Organizar ──────────────────────────────────────────────────────────

function Arrange({ screen, elements, selection }) {
  const store = useDesignEditor();
  const device = useDesignState((s) => s.device);
  const picked = useMemo(() => flattenElements(elements).filter((el) => selection.includes(el.id)), [elements, selection]);
  const measures = useMeasures(picked.map((e) => e.id));
  const single = picked.length === 1 ? picked[0] : null;
  const m = single ? measures[single.id] : null;
  const frame = single ? editableFrame(single, device) : null;
  const isChild = !!single?.parentId;
  const mobileAuto = device === "mobile" && single && !frame;

  if (picked.length === 0) return <p className="sp-hint">Selecciona un elemento en el lienzo para organizarlo.</p>;

  const writeFrame = (id, next, label, mergeKey) => store.apply((d) => setFrame(d, screen, id, next, device === "mobile" ? parentOf(store.getState().design, screen, id) ? "mobile-group" : "mobile" : "desktop"), { label, mergeKey });

  // Alinear: un elemento a la página; varios, entre sí (contra la caja que los envuelve).
  const align = (where) => {
    const ready = picked.map((el) => ({ el, m: measures[el.id], frame: editableFrame(el, device) })).filter((x) => x.m && x.frame && !x.el.locked);
    if (!ready.length) return;
    const page = { left: 0, top: 0, width: ready[0].m.container.W, height: ready[0].m.container.H };
    const bounds = ready.length > 1 ? unionRect(ready.map((x) => x.m.rect)) : page;
    store.apply(
      (d) => {
        let next = d;
        ready.forEach(({ el, m: mm, frame: fr }) => {
          if (!canAlign(fr.anchor, where)) return;
          const moved = alignRect(mm.rect, bounds, where);
          next = setFrame(next, screen, el.id, frameForRect(fr, moved, { container: mm.container, s: mm.s }), device === "mobile" ? el.parentId ? "mobile-group" : "mobile" : "desktop");
        });
        return next;
      },
      { label: "Alinear" }
    );
  };
  const alignState = (where) => {
    const ready = picked.map((el) => ({ el, m: measures[el.id], frame: editableFrame(el, device) })).filter((x) => x.m && x.frame && !x.el.locked);
    if (!ready.length) return { disabled: true };
    const bounds = ready.length > 1 ? unionRect(ready.map((x) => x.m.rect)) : { left: 0, top: 0, width: ready[0].m.container.W, height: ready[0].m.container.H };
    const movable = ready.filter((x) => canAlign(x.frame.anchor, where));
    return { disabled: !movable.length || movable.every((x) => isAligned(x.m.rect, bounds, where)) };
  };

  const pin = (anchor) => {
    if (!single || !m || !frame) return;
    writeFrame(single.id, pinFrame(frame, anchor, { container: m.container, s: m.s, measured: m.natural }), "Fijar ancla");
  };

  const setMode = (mode) => {
    if (!single) return;
    store.apply(
      (d) => {
        let next = setMobileMode(d, screen, single.id, mode);
        // «A mano» estando en la vista móvil: el frame nace de donde está ahora.
        if (mode === "custom" && device === "mobile" && !single.mobile?.frame && m) {
          const anchor = autoAnchor(m.rect, m.container);
          next = setFrame(next, screen, single.id, frameFromRect(m.rect, { anchor, container: m.container, s: m.s, keepAutoSize: true, base: { w: 0, h: 0 } }), "mobile");
        }
        return next;
      },
      { label: "Comportamiento en móvil" }
    );
  };

  return (
    <>
      <SceneVisibilityPanel screen={screen} elements={elements} selection={selection} />
      <section className="sp-section">
        <h3>Orden</h3>
        <div className="sp-btn-grid">
          {[
            ["forward", "Delante", "forward"],
            ["backward", "Detrás", "backward"],
            ["front", "Al frente", "front"],
            ["back", "Al fondo", "back"],
          ].map(([where, label, icon]) => (
            <button key={where} type="button" className="sp-btn sp-btn--tile" disabled={!single} onClick={() => arrangeSelection(store, where)}>
              <Ico name={icon} size={18} /> {label}
            </button>
          ))}
        </div>
      </section>

      <section className="sp-section">
        <h3>{picked.length > 1 ? "Alinear entre sí" : isChild ? "Alinear al grupo" : "Alinear a la página"}</h3>
        <div className="sp-btn-grid">
          {["top", "left", "middle", "center", "bottom", "right"].map((where) => (
            <button key={where} type="button" className="sp-btn sp-btn--tile" disabled={alignState(where).disabled || mobileAuto} onClick={() => align(where)}>
              <Ico name={ALIGN_LABEL[where][0]} size={18} /> {ALIGN_LABEL[where][1]}
            </button>
          ))}
        </div>
      </section>

      {single && (
        <>
          {!isChild && <section className="sp-section">
            <h3>Fijar a…</h3>
            <p className="sp-hint">Elige a qué parte de la pantalla se pega. No mueve el elemento; así sigue en su lugar si cambia el tamaño de la pantalla.</p>
            {mobileAuto || !frame ? (
              <p className="sp-hint">En el móvil automático el elemento se acomoda solo. Cámbialo a «A mano» para fijarlo.</p>
            ) : (
              <div className="sp-anchors-wrap">
                <div className="sp-anchors" role="radiogroup" aria-label="Fijar a">
                  {ANCHOR_GRID.map((a) => (
                    <button key={a} type="button" role="radio" aria-checked={frame.anchor === a} className={frame.anchor === a ? "is-active" : ""} title={`Fijar ${ANCHOR_NAME[a]}`} aria-label={`Fijar ${ANCHOR_NAME[a]}`} disabled={!m} onClick={() => pin(a)}>
                      <span />
                    </button>
                  ))}
                </div>
                <div className="sp-stack">
                  <button type="button" className={`sp-btn sp-btn--tile${/^stretch-(top|bottom)$/.test(frame.anchor) ? " is-active" : ""}`} disabled={!m} title="Ocupa todo el ancho de la pantalla, con el margen que tiene ahora" onClick={() => m && pin(stretchTo("x", frame.anchor, m))}>
                    <Ico name="stretch" size={18} /> Estirar a lo ancho
                  </button>
                  <button type="button" className={`sp-btn sp-btn--tile${/^stretch-(left|right)$/.test(frame.anchor) ? " is-active" : ""}`} disabled={!m} title="Ocupa todo el alto de la pantalla, con el margen que tiene ahora" onClick={() => m && pin(stretchTo("y", frame.anchor, m))}>
                    <Ico name="stretchv" size={18} /> Estirar a lo alto
                  </button>
                </div>
              </div>
            )}
          </section>}

          <section className="sp-section">
            <h3>Tamaño y posición</h3>
            {frame && m ? <Metrics id={single.id} frame={frame} m={m} onWrite={writeFrame} /> : <p className="sp-hint">{mobileAuto ? "En móvil automático no hay medidas que editar." : "Midiendo…"}</p>}
          </section>

          {!isChild && <section className="sp-section">
            <h3>En móvil</h3>
            <Segmented
              label="En móvil"
              value={single.mobile?.mode ?? "auto"}
              onChange={setMode}
              options={[
                { value: "auto", label: "Automático", title: "Se apila solo en la pantalla del celular" },
                { value: "custom", label: "A mano", title: "Lo colocas tú en la vista Móvil" },
                { value: "hidden", label: "Oculto", title: "No se muestra en el celular" },
              ]}
            />
            {(single.mobile?.mode ?? "auto") === "custom" && device !== "mobile" && <p className="sp-hint">Cambia a la vista Móvil (abajo) para colocarlo.</p>}
          </section>}
          {isChild && <p className="sp-hint">Esta pieza se escala junto con su grupo en el celular.</p>}
        </>
      )}
    </>
  );
}

function Metrics({ id, frame, m, onWrite }) {
  const axes = freeAxes(frame.anchor);
  const values = { x: m.rect.left, y: m.rect.top, w: m.rect.width / m.s, h: m.rect.height / m.s };
  const [draft, setDraft] = useState({});
  useEffect(() => setDraft({}), [id]);
  const fields = [
    ["w", "Ancho", axes.w],
    ["h", "Alto", axes.h],
    ["x", "X", axes.x],
    ["y", "Y", axes.y],
  ];
  const commit = (field, text) => {
    setDraft((d) => ({ ...d, [field]: text }));
    const n = Number(text);
    if (text === "" || !Number.isFinite(n)) return;
    onWrite(id, frameWithField(frame, m.rect, field, n, { container: m.container, s: m.s }), "Cambiar medidas", `pos.${id}.${field}`);
  };
  return (
    <div className="sp-metrics">
      {fields.map(([field, label, enabled]) => (
        <label key={field} className="sp-metric">
          <span>{label}</span>
          <span className="sp-metric-input">
            <input
              type={field === "w" || field === "h" ? "range" : "number"}
              min={field === "w" || field === "h" ? 1 : undefined}
              max={field === "w" || field === "h" ? Math.max(values[field] * 2, (field === "w" ? m.container.W : m.container.H) / m.s, 100) : undefined}
              disabled={!enabled}
              value={draft[field] ?? String(Math.round(values[field] * 10) / 10)}
              aria-label={field === "w" || field === "h" ? label : `${label} (px de diseño)`}
              onFocus={(e) => setDraft((d) => ({ ...d, [field]: String(Math.round(values[field] * 10) / 10) }))}
              onBlur={() => setDraft((d) => ({ ...d, [field]: undefined }))}
              onChange={(e) => commit(field, e.target.value)}
            />
            {field !== "w" && field !== "h" && <em>px</em>}
          </span>
        </label>
      ))}
    </div>
  );
}

// ── Capas ──────────────────────────────────────────────────────────────

function nameOf(el) {
  const t = getTemplate(el.template);
  if (el.name) return el.name;
  const text = el.props?.text ?? el.props?.label ?? el.props?.title;
  return typeof text === "string" && text.trim() ? text.trim().slice(0, 40) : t?.name ?? el.template;
}

function LayerRow({ el, selected, onSelect, onToggle, depth = 0, expanded, onExpand }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: el.id });
  const t = getTemplate(el.template);
  return (
    <li ref={setNodeRef} role="treeitem" aria-level={depth + 1} aria-expanded={el.children ? expanded : undefined} style={{ paddingLeft: 4 + depth * 14, transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 2 : undefined }} className={`sp-layer${selected ? " is-selected" : ""}${isDragging ? " is-dragging" : ""}${el.hidden ? " is-hidden" : ""}`}>
      {el.children && <button type="button" className="sp-icon-btn" aria-label={expanded ? "Contraer grupo" : "Expandir grupo"} onClick={() => onExpand(el.id)}><Ico name={expanded ? "chevron-down" : "chevron-right"} size={14} /></button>}
      <button type="button" className="sp-layer-grip" aria-label={`Arrastrar capa ${nameOf(el)}`} {...attributes} {...listeners}>
        <Ico name="grip" size={18} />
      </button>
      <button type="button" className="sp-layer-main" aria-pressed={selected} onClick={(e) => onSelect(el.id, e.shiftKey || e.metaKey || e.ctrlKey)}>
        <span className="sp-layer-name">{nameOf(el)}</span>
        <small>{t?.name ?? el.template}</small>
      </button>
      <button type="button" className="sp-icon-btn" aria-label={el.hidden ? "Mostrar" : "Ocultar"} aria-pressed={!!el.hidden} title={el.hidden ? "Mostrar" : "Ocultar"} onClick={() => onToggle(el.id, "hidden")}>
        <Ico name={el.hidden ? "eye-off" : "eye"} size={16} />
      </button>
      <button type="button" className="sp-icon-btn" aria-label={el.locked ? "Desbloquear" : "Bloquear"} aria-pressed={!!el.locked} title={el.locked ? "Desbloquear" : "Bloquear"} onClick={() => onToggle(el.id, "locked")}>
        <Ico name={el.locked ? "lock" : "unlock"} size={16} />
      </button>
    </li>
  );
}

function Layers({ screen, elements, selection }) {
  const store = useDesignEditor();
  const [collapsed, setCollapsed] = useState(new Set());
  const top = useMemo(() => {
    const visit = (items, depth = 0) => [...items].sort((a, b) => (b.z ?? 0) - (a.z ?? 0)).flatMap((el) => [{ el, depth }, ...(el.children && !collapsed.has(el.id) ? visit(el.children, depth + 1) : [])]);
    return visit(elements);
  }, [elements, collapsed]);
  const all = flattenElements(elements);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  if (!elements.length) return <p className="sp-hint">Esta pantalla aún no tiene elementos.</p>;

  const onDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const design = store.getState().design;
    const parent = parentOf(design, screen, active.id);
    if (parent?.id !== parentOf(design, screen, over.id)?.id) return;
    const ids = [...editableElements(design, screen, parent?.id)].sort((a, b) => (b.z ?? 0) - (a.z ?? 0)).map((el) => el.id);
    const from = ids.indexOf(active.id);
    const to = ids.indexOf(over.id);
    if (from < 0 || to < 0) return;
    ids.splice(to, 0, ids.splice(from, 1)[0]);
    store.apply((d) => setLayerOrder(d, screen, [...ids].reverse(), parent?.id), { label: "Reordenar capas" });
  };
  const select = (id, additive) => {
    const st = store.getState();
    const parent = parentOf(st.design, screen, id);
    const sameScope = (parent?.id ?? null) === st.activeGroupId;
    if (!sameScope) store.enterGroup(parent?.id ?? null);
    store.select(additive && sameScope ? (selection.includes(id) ? selection.filter((x) => x !== id) : [...selection, id]) : [id]);
  };
  const expand = (id) => setCollapsed((before) => { const next = new Set(before); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const toggle = (id, field) => {
    const el = all.find((e) => e.id === id);
    store.apply((d) => updateElement(d, screen, [id], { [field]: !el[field] }), { label: field === "hidden" ? (el.hidden ? "Mostrar" : "Ocultar") : el.locked ? "Desbloquear" : "Bloquear" });
  };
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={top.map(({ el }) => el.id)} strategy={verticalListSortingStrategy}>
        <ul className="sp-layers" role="tree" aria-label="Capas">
          {top.map(({ el, depth }) => (
            <LayerRow key={el.id} el={el} depth={depth} expanded={!collapsed.has(el.id)} onExpand={expand} selected={selection.includes(el.id)} onSelect={select} onToggle={toggle} />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}
