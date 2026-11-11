import { useLayoutEffect, useRef, useState } from "react";
import { getTemplate, listTemplates } from "../../runtime/templates/index.js";
import { ICONS, ICON_IDS, createIcon } from "../../runtime/icons/index.js";
import { mergeProps, withAlphaOf } from "../../runtime/templates/hotspots/common.js";
import { setStyleProp, styleFromTemplate } from "../../runtime/templates/hotspots/styleOps.js";
import "./HotspotStyleEditor.css";

// Sección "Estilo" del popover de un hotspot: galería de plantillas (miniaturas reales, render
// de la propia plantilla), un muestrario por cada slot de color, el tamaño y, en "Más opciones",
// el resto de slots. "Aplicar a" decide si el cambio es solo de este hotspot o de todos los de
// su tipo. Todo sale de `template.slots`: una plantilla nueva no requiere tocar este archivo.

export const FALLBACK_STYLE = { template: "circle-icon", props: {} };
const TYPE_NAME = { info: "Info", price: "Precio", nav: "Navegación" };
const BRAND = "var(--tour-accent, #4da3ff)";
const SWATCHES = ["#ffffff", "#101a2b", "#111f39", "#c98a12", "#e5484d", "#30a46c", "#2f6fed", "#8e4ec6"];
const CELL = 58; // lado de la miniatura en px
// La tarjeta del callout es enorme para una miniatura: se acerca y se angosta solo ahí.
const THUMB_PROPS = { callout: { dx: 64, dy: -44 } };

export function resolveStyle(style) {
  const template = getTemplate(style?.template);
  return template && template.kind === "hotspot" ? style : FALLBACK_STYLE;
}

// Render real de la plantilla, encogido para caber en la celda (incluye lo que se sale de la
// raíz, como la tarjeta del callout) y centrado en el punto de anclaje.
function Thumb({ style, type }) {
  const holder = useRef(null);
  const template = getTemplate(style.template);
  const propsKey = JSON.stringify(style.props);

  useLayoutEffect(() => {
    const host = holder.current;
    if (!host || !template) return;
    const fake = { id: "thumb", type, title: "Cocina", description: "Vista", price: "$2,500,000", image: null };
    const node = template.render(mergeProps(template.defaults, { ...style.props, ...THUMB_PROPS[template.id] }), { hotspot: fake, mode: "view", mobile: false, thumb: true });
    const wrap = document.createElement("span");
    wrap.className = "hse-thumb-wrap";
    wrap.appendChild(node);
    host.replaceChildren(wrap);
    host.style.transform = "none";
    const r0 = node.getBoundingClientRect();
    let [x0, y0, x1, y1] = [r0.left, r0.top, r0.right, r0.bottom];
    node.querySelectorAll("*").forEach((child) => {
      const r = child.getBoundingClientRect();
      if (!r.width && !r.height) return;
      x0 = Math.min(x0, r.left);
      y0 = Math.min(y0, r.top);
      x1 = Math.max(x1, r.right);
      y1 = Math.max(y1, r.bottom);
    });
    const w = Math.max(1, x1 - x0);
    const h = Math.max(1, y1 - y0);
    const k = Math.min(1.8, (CELL * 0.72) / Math.max(w, h));
    // El centro del cuadro delimitador respecto al origen del host (su esquina superior izquierda).
    const hostRect = host.getBoundingClientRect();
    const dx = (x0 + x1) / 2 - hostRect.left;
    const dy = (y0 + y1) / 2 - hostRect.top;
    host.style.transform = `scale(${k}) translate(${-dx}px, ${-dy}px)`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template, type, propsKey]);

  return <span className="hse-thumb-host" ref={holder} />;
}

function IconGlyph({ id, size = 18 }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    ref.current?.replaceChildren(createIcon(id, { size, strokeWidth: 2 }));
  }, [id, size]);
  return <span ref={ref} className="hse-glyph" />;
}

function ColorSlot({ slot, value, onChange }) {
  const hex = /^#[0-9a-f]{6}/i.test(value || "") ? String(value).slice(0, 7) : "#ffffff";
  const swatches = [BRAND, ...SWATCHES];
  return (
    <div className="hse-row">
      <span className="hse-label">{slot.label}</span>
      <div className="hse-swatches">
        {swatches.map((c) => {
          const active = value === c || (c !== BRAND && String(value || "").toLowerCase().slice(0, 7) === c.toLowerCase());
          return (
            <button
              key={c}
              type="button"
              className={`hse-swatch${active ? " hse-swatch-active" : ""}`}
              style={{ background: c }}
              title={c === BRAND ? "Color de la marca" : c}
              aria-label={`${slot.label}: ${c === BRAND ? "color de la marca" : c}`}
              onClick={() => onChange(c === BRAND ? c : withAlphaOf(value, c))}
            />
          );
        })}
        <label className="hse-swatch hse-swatch-custom" title="Otro color">
          <input
            type="color"
            value={hex}
            aria-label={`${slot.label}: otro color`}
            onChange={(e) => onChange(withAlphaOf(value, e.target.value))}
          />
        </label>
      </div>
    </div>
  );
}

function IconSlot({ slot, value, onChange, type }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="hse-row">
      <span className="hse-label">{slot.label}</span>
      <button type="button" className="btn btn-sm hse-icon-btn" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        {value && ICONS[value] ? <IconGlyph id={value} /> : "Automático"}
        <span className="hse-icon-name">{value && ICONS[value] ? ICONS[value].name : ""}</span>
      </button>
      {open && (
        <div className="hse-icons">
          <button type="button" className={`hse-icon${!value ? " hse-icon-active" : ""}`} title={`Automático (según el tipo: ${TYPE_NAME[type] || type})`} onClick={() => onChange("")}>
            Auto
          </button>
          {ICON_IDS.map((id) => (
            <button key={id} type="button" className={`hse-icon${value === id ? " hse-icon-active" : ""}`} title={ICONS[id].name} aria-label={ICONS[id].name} onClick={() => onChange(id)}>
              <IconGlyph id={id} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Slot({ slot, props, onChange, type }) {
  const value = props[slot.key];
  const set = (v) => onChange(slot.key, v);
  switch (slot.type) {
    case "color":
      return <ColorSlot slot={slot} value={value} onChange={set} />;
    case "range":
      return (
        <label className="hse-row">
          <span className="hse-label">
            {slot.label} <em>{Math.round(Number(value) * 100) / 100}</em>
          </span>
          <input type="range" min={slot.min} max={slot.max} step={slot.step} value={Number(value) || 0} onChange={(e) => set(Number(e.target.value))} />
        </label>
      );
    case "number":
      return (
        <label className="hse-row">
          <span className="hse-label">{slot.label}</span>
          <input className="input" type="number" value={value ?? ""} onChange={(e) => set(Number(e.target.value))} />
        </label>
      );
    case "text":
      return (
        <label className="hse-row">
          <span className="hse-label">{slot.label}</span>
          <input className="input" value={value ?? ""} onChange={(e) => set(e.target.value)} />
        </label>
      );
    case "select":
      return (
        <label className="hse-row">
          <span className="hse-label">{slot.label}</span>
          <select className="select" value={value ?? ""} onChange={(e) => set(e.target.value)}>
            {slot.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      );
    case "toggle":
      return (
        <label className="hse-row hse-toggle">
          <input type="checkbox" checked={value !== false && Boolean(value)} onChange={(e) => set(e.target.checked)} />
          <span>{slot.label}</span>
        </label>
      );
    case "icon":
      return <IconSlot slot={slot} value={value} onChange={set} type={type} />;
    default:
      return null;
  }
}

// value: estilo que se está viendo ({template, props}); onChange(estilo); onReset(): vuelve al
// estilo del tipo; hasOwnStyle: el hotspot tiene estilo propio guardado.
export default function HotspotStyleEditor({ type, value, onChange, onReset, hasOwnStyle, applyTo, onApplyToChange, allDisabled, locked }) {
  const [open, setOpen] = useState(false);
  const [more, setMore] = useState(false);
  const style = resolveStyle(value);
  const template = getTemplate(style.template);
  const props = mergeProps(template.defaults, style.props);
  const templates = listTemplates("hotspot");
  const main = template.slots.filter((s) => s.toolbar);
  const rest = template.slots.filter((s) => !s.toolbar);
  const typeName = TYPE_NAME[type] || type;

  return (
    <div className="hse">
      <button type="button" className="hse-summary" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="hse-cell hse-cell-sm">
          <Thumb style={{ template: template.id, props }} type={type} />
        </span>
        <span className="hse-summary-text">
          <strong>Estilo</strong>
          <small>{template.name}</small>
        </span>
        <span className="hse-chevron">{open ? "Cerrar" : "Cambiar"}</span>
      </button>

      {open && (
        <div className="hse-body">
          <div className="hse-gallery" role="listbox" aria-label="Plantillas de hotspot">
            {templates.map((t) => (
              <button
                key={t.id}
                type="button"
                role="option"
                aria-selected={t.id === template.id}
                className={`hse-cell${t.id === template.id ? " hse-cell-active" : ""}`}
                title={t.name}
                onClick={() => t.id !== template.id && onChange(styleFromTemplate(t))}
              >
                <Thumb style={{ template: t.id, props: t.defaults }} type={type} />
              </button>
            ))}
          </div>

          <div className="hse-controls">{main.map((slot) => (
            <Slot key={slot.key} slot={slot} props={props} type={type} onChange={(k, v) => onChange(setStyleProp({ template: template.id, props }, k, v))} />
          ))}</div>

          {rest.length > 0 && (
            <>
              <button type="button" className="hse-more" onClick={() => setMore((m) => !m)} aria-expanded={more}>
                {more ? "Menos opciones" : "Más opciones"}
              </button>
              {more && <div className="hse-controls">{rest.map((slot) => (
                  <Slot key={slot.key} slot={slot} props={props} type={type} onChange={(k, v) => onChange(setStyleProp({ template: template.id, props }, k, v))} />
                ))}</div>}
            </>
          )}

          <div className="hse-apply">
            <span className="hse-label">Aplicar a</span>
            <div className="hse-seg" role="group" aria-label="Aplicar a">
              <button type="button" className={applyTo === "this" ? "hse-seg-active" : ""} onClick={() => onApplyToChange("this")}>
                Solo este
              </button>
              <button
                type="button"
                className={applyTo === "all" ? "hse-seg-active" : ""}
                disabled={allDisabled}
                title={locked ? "Este hotspot está bloqueado: el estilo del tipo no lo cambia" : undefined}
                onClick={() => onApplyToChange("all")}
              >
                Todos los de tipo {typeName}
              </button>
            </div>
            {applyTo === "all" && <small className="hse-hint">Los hotspots bloqueados no cambian.</small>}
          </div>
          {hasOwnStyle && (
            <button type="button" className="hse-reset" onClick={onReset}>
              Volver al estilo del tipo
            </button>
          )}
        </div>
      )}
    </div>
  );
}
