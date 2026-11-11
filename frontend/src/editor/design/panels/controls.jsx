import { useId, useMemo, useRef, useState } from "react";
import { ICONS, ICON_IDS, ICON_CATEGORIES } from "../../../runtime/icons/index.js";
import { listTemplates } from "../../../runtime/templates/index.js";
import { safeHttpUrl } from "../../../runtime/templates/elements/actions.js";
import { useDesignEditor } from "../../hooks/useTourDesign.jsx";
import { Glyph, Ico, PopButton, Segmented, Switch } from "./ui.jsx";
import { useAssets, useSceneEntries, useUpload } from "./hooks.js";
import { blankRow, borderWidthKey, isMultiline, moveItem, parseColor, removeAt, replaceAt, toHex6 } from "./logic.js";
import "./FloatingWindow.css";
import FontSelector from "./FontSelector.jsx";
import { FONT_LIST } from "../../../runtime/fonts/fontList.js";

// Controles por tipo de slot (docs/CONTRATO_OLEADA3.md §4.2). Cada uno sirve en dos formatos:
//   mode "toolbar": compacto, dentro de la píldora de la barra contextual
//   mode "form":    con etiqueta, dentro de «Más opciones» y de las listas
// Todos reciben { slot, value, onChange, ctx } y no conocen el almacén: quien los usa decide cómo
// escribir (ctx.id/ctx.template solo sirven para abrir el panel de color de ese elemento).

export function ColorChip({ value, size = 20 }) {
  const automatic = value == null || value === "";
  const color = parseColor(value);
  return (
    <span className={`sp-chip${automatic ? " is-auto" : !color ? " is-empty" : ""}`} style={{ width: size, height: size }} title={automatic ? "Automático (del estilo)" : color?.a === 0 ? "Transparente" : value}>
      {automatic ? <span className="sp-chip-auto">A</span> : color && <span style={{ background: value }} />}
    </span>
  );
}

function Label({ slot, children, inline }) {
  return (
    <label className={`sp-field${inline ? " is-inline" : ""}`}>
      <span className="sp-field-label">{slot.label}</span>
      {children}
    </label>
  );
}

// ── color y borde ──────────────────────────────────────────────────────

function InlineColor({ value, onChange, label }) {
  const hex = toHex6(value) ?? "#ffffff";
  return (
    <div className="sp-inline-color-wrap">
    <span className="sp-inline-color">
      <input type="color" value={hex} aria-label={label} onChange={(e) => onChange(e.target.value)} />
      <input className="sp-input sp-input--hex" value={value ?? ""} placeholder="Automático" aria-label={`${label} (hex)`} onChange={(e) => onChange(e.target.value)} />
    </span>
    <span className="sp-color-modes">
      <button type="button" className="sp-btn sp-btn--ghost" onClick={() => onChange(null)}><ColorChip value={null} size={16} />Automático (del estilo)</button>
      <button type="button" className="sp-btn sp-btn--ghost" onClick={() => onChange("rgba(0,0,0,0)")}><ColorChip value="rgba(0,0,0,0)" size={16} />Transparente</button>
    </span>
    </div>
  );
}

function ColorField({ slot, value, ctx, mode, onChange }) {
  const store = useDesignEditor();
  const open = () => store.openPanel("color", { id: ctx.id, key: slot.key });
  if (ctx.nested) {
    return mode === "toolbar" ? null : (
      <Label slot={slot}>
        <InlineColor value={value} onChange={onChange} label={slot.label} />
      </Label>
    );
  }
  if (mode === "toolbar") {
    return (
      <button type="button" className="sp-tb-btn sp-tb-color" title={slot.label} aria-label={`${slot.label}: cambiar color`} onClick={open}>
        {ctx.template?.id === "text" ? <span className="sp-text-color" style={{ "--text-color": value || "currentColor" }} aria-hidden="true">A</span> : <><ColorChip value={value} /><span className="sp-tb-text">{slot.label}</span></>}
      </button>
    );
  }
  return (
    <div className="sp-field is-inline">
      <span className="sp-field-label">{slot.label}</span>
      <button type="button" className="sp-color-row" onClick={open} aria-label={`${slot.label}: cambiar color`}>
        <ColorChip value={value} size={24} />
        <span>{!value ? "Automático (del estilo)" : parseColor(value)?.a === 0 ? "Transparente" : value}</span>
      </button>
    </div>
  );
}

function BorderField({ slot, value, ctx, mode, onChange }) {
  const widthKey = borderWidthKey(ctx.template, slot);
  const width = widthKey ? ctx.props[widthKey] : null;
  const store = useDesignEditor();
  if (mode === "toolbar") return <ColorField slot={slot} value={value} ctx={ctx} mode="toolbar" onChange={onChange} />;
  return (
    <div className="sp-field">
      <span className="sp-field-label">{slot.label}</span>
      <div className="sp-border-row">
        {ctx.nested ? <InlineColor value={value} onChange={onChange} label={slot.label} /> : (
          <button type="button" className="sp-color-row" onClick={() => store.openPanel("color", { id: ctx.id, key: slot.key })} aria-label={`${slot.label}: cambiar color`}>
            <ColorChip value={value} size={24} />
            <span>{!value ? "Automático (del estilo)" : parseColor(value)?.a === 0 ? "Transparente" : value}</span>
          </button>
        )}
        {widthKey && <div className="sp-auto-control"><AutoMode enabled={ctx.template.slots?.some((s) => s.key === widthKey && s.auto)} value={width} onChange={(v) => ctx.write({ [widthKey]: v })} /><RangeEditor automatic={ctx.template.slots?.some((s) => s.key === widthKey && s.auto)} value={width} min={0} max={12} step={0.5} unit="px" onChange={(v) => ctx.write({ [widthKey]: v })} label="Grosor" /></div>}
      </div>
    </div>
  );
}

// ── texto, números, listas desplegables, interruptores ─────────────────

function TextField({ slot, value, mode, onChange }) {
  const text = value ?? "";
  if (mode === "toolbar") {
    if (isMultiline(slot, text)) {
      return (
        <PopButton buttonClass="sp-tb-btn sp-tb-text-btn" label={slot.label} title={slot.label} width={300} content={<textarea className="sp-input sp-textarea" rows={4} value={text} aria-label={slot.label} autoFocus onChange={(e) => onChange(e.target.value)} />}>
          <Ico name="type" size={18} />
          <span className="sp-tb-text">{slot.label}</span>
        </PopButton>
      );
    }
    return <input className="sp-input sp-tb-input" type="text" value={text} placeholder={slot.label} aria-label={slot.label} title={slot.label} onChange={(e) => onChange(e.target.value)} />;
  }
  return (
    <Label slot={slot}>
      {isMultiline(slot, text) ? <textarea className={`sp-input sp-textarea${slot.compact ? " sp-textarea--compact" : ""}`} rows={slot.rows ?? 3} value={text} onChange={(e) => onChange(e.target.value)} /> : <input className="sp-input" type="text" value={text} onChange={(e) => onChange(e.target.value)} />}
    </Label>
  );
}

const fmt = (n) => (Number.isFinite(Number(n)) ? String(Math.round(Number(n) * 100) / 100) : "0");

export function RangeEditor({ value, min = 0, max = 100, step = 1, unit = "", onChange, label, automatic = false }) {
  const n = Number.isFinite(Number(value)) ? Number(value) : min;
  return (
    <div className="sp-range" aria-label={label}>
      <input type="range" min={min} max={max} step={step} value={n} aria-label={label} aria-valuetext={automatic && value == null ? "Automático (del estilo)" : undefined} onChange={(e) => onChange(Number(e.target.value))} />
      <span className="sp-range-num">
        <input type="number" min={min} max={max} step={step} value={automatic && value == null ? "" : fmt(n)} placeholder={automatic ? "Auto" : undefined} aria-label={`${label} (número)`} onChange={(e) => e.target.value !== "" && onChange(Number(e.target.value))} />
        {unit && <em>{unit}</em>}
      </span>
    </div>
  );
}

function NumberField({ slot, value, mode, onChange, ctx }) {
  if (mode === "toolbar" && ctx.template?.id === "text" && slot.key === "size") return <input className="sp-input sp-text-size" type="number" min="0" max="120" step="1" value={Number(value) > 0 ? fmt(value) : ""} placeholder="Auto" title="Tamaño de texto (0 = automático)" aria-label="Tamaño de texto" onChange={e => e.target.value !== "" && onChange(Math.max(0, Math.min(120, Number(e.target.value))))} />;
  const isRange = slot.type === "range";
  const numeric = isRange ? (
    <RangeEditor value={value} automatic={slot.auto} min={slot.min} max={slot.max} step={slot.step} onChange={onChange} label={slot.label} />
  ) : (
    <input className="sp-input" type="number" value={value ?? ""} aria-label={slot.label} onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))} />
  );
  const editor = <><AutoMode enabled={slot.auto} value={value} onChange={onChange} />{numeric}</>;
  if (mode === "toolbar") {
    return (
      <PopButton buttonClass={`sp-tb-btn${ctx.template?.id === "text" && slot.key === "weight" ? ` sp-text-weight${Number(value) >= 600 ? " is-active" : ""}` : ""}`} ariaLabel={slot.label} title={slot.label} width={260} content={<div className="sp-pop-body"><div className="sp-field-label">{slot.label}</div>{editor}</div>}>
        {ctx.template?.id === "text" && slot.key === "weight" ? <Ico name="bold" size={18} strokeWidth={2.2} /> : <><span className="sp-tb-text">{slot.label.replace(/\s*\(.*\)\s*$/, "")}</span><b className="sp-tb-value">{slot.auto && value == null ? "Auto" : fmt(value)}</b></>}
      </PopButton>
    );
  }
  return (
    <div className="sp-field">
      <span className="sp-field-label">{slot.label}</span>
      {editor}
    </div>
  );
}

function AutoMode({ enabled, value, onChange }) {
  if (!enabled) return null;
  return <button type="button" className={`sp-btn sp-auto-mode${value == null ? " is-active" : ""}`} aria-pressed={value == null} onClick={() => onChange(null)}>Automático (del estilo)</button>;
}

function SelectField({ slot, value, mode, onChange, ctx }) {
  const options = slot.options;
  if (!Array.isArray(options)) return <TextField slot={slot} value={value} mode={mode} onChange={onChange} />;
  const norm = options.map((o) => (typeof o === "object" ? o : { value: o, label: o }));
  if (mode === "toolbar" && slot.key === "align" && ctx.template?.id === "text") return <PopButton buttonClass="sp-tb-btn sp-text-align" title="Alineación del texto" ariaLabel="Alineación del texto" width={180} content={({ close }) => <div className="sp-text-align-options">{norm.map(option => <button type="button" className={`sp-btn${value === option.value ? " is-active" : ""}`} aria-pressed={value === option.value} key={option.value} onClick={() => { onChange(option.value); close(); }}><Ico name={`text-${option.value}`} size={18} />{option.label}</button>)}</div>}><Ico name={`text-${value || "left"}`} size={18} /><Ico name="chevron-down" size={12} /></PopButton>;
  if (["font", "headingFont"].includes(slot.key)) {
    const picker = <FontSelector value={value ?? ""} label={slot.label} toolbar={mode === "toolbar"} onChange={onChange} specialOptions={norm.filter((o) => !FONT_LIST.some((f) => f.id === o.value))} />;
    return mode === "toolbar" ? picker : <Label slot={slot}>{picker}</Label>;
  }
  const select = (
    <select className={mode === "toolbar" ? "sp-select sp-tb-select" : "sp-select"} value={value ?? ""} aria-label={slot.label} title={slot.label} onChange={(e) => onChange(e.target.value)}>
      {!norm.some((o) => o.value === (value ?? "")) && <option value={value ?? ""}>{String(value ?? "")}</option>}
      {norm.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
  return mode === "toolbar" ? select : <Label slot={slot}>{select}</Label>;
}

function ToggleField({ slot, value, mode, onChange }) {
  if (slot.auto) {
    const select = <select className="sp-select" aria-label={slot.label} value={value == null ? "auto" : value ? "yes" : "no"} onChange={(e) => onChange(e.target.value === "auto" ? null : e.target.value === "yes")}>
      <option value="auto">Automático (del estilo)</option><option value="yes">Sí</option><option value="no">No</option>
    </select>;
    return mode === "toolbar" ? select : <Label slot={slot}>{select}</Label>;
  }
  const on = value !== false && !!value;
  if (mode === "toolbar") {
    return (
      <button type="button" className={`sp-tb-btn${on ? " is-active" : ""}`} aria-pressed={on} title={slot.label} aria-label={slot.label} onClick={() => onChange(!on)}>
        {["italic", "underline"].includes(slot.key) ? <Ico name={slot.key} size={18} /> : <><span className="sp-tb-text">{slot.label}</span><Ico name={on ? "check" : "plus"} size={14} /></>}
      </button>
    );
  }
  return (
    <div className="sp-field is-inline">
      <span className="sp-field-label">{slot.label}</span>
      <Switch checked={on} onChange={onChange} label={slot.label} />
    </div>
  );
}

// ── icono ──────────────────────────────────────────────────────────────

export function IconPicker({ value, onChange, allowNone = true, close }) {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const normalize = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const ids = useMemo(() => ICON_IDS.filter((id) => (!category || ICONS[id].cat === category) && (!q || normalize(`${ICONS[id].name} ${id}`).includes(normalize(q)))), [q, category]);
  return (
    <div className="sp-pop-body sp-icon-picker">
      <input className="sp-input" placeholder="Buscar icono…" value={q} aria-label="Buscar icono" onChange={(e) => setQ(e.target.value)} />
      <select className="sp-select sp-icon-categories" aria-label="Categoría de iconos" value={category} onChange={(e) => setCategory(e.target.value)}>
        <option value="">Todas las categorías</option>
        {ICON_CATEGORIES.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
      </select>
      <div className="sp-icon-grid">
        {allowNone && (
          <button type="button" className={!value ? "is-active" : ""} aria-pressed={!value} title="Sin icono" aria-label="Sin icono" onClick={() => { onChange(""); close?.(); }}>
            <Ico name="close" size={16} />
          </button>
        )}
        {ids.map((id) => (
          <button key={id} type="button" className={value === id ? "is-active" : ""} aria-pressed={value === id} title={ICONS[id].name} aria-label={ICONS[id].name} onClick={() => { onChange(id); close?.(); }}>
            <Glyph id={id} size={18} />
          </button>
        ))}
      </div>
      {ids.length === 0 && <p className="sp-hint" role="status">No hay iconos para esta búsqueda.</p>}
    </div>
  );
}

function IconField({ slot, value, mode, onChange }) {
  const [open, setOpen] = useState(false);
  const button = (
    <>
      {value && ICONS[value] ? <Glyph id={value} size={18} /> : <Ico name="shapes" size={18} />}
      {mode === "form" && <span>{value && ICONS[value] ? ICONS[value].name : "Sin icono"}</span>}
    </>
  );
  const pop = (
    <PopButton buttonClass="sp-tb-btn" title={slot.label} ariaLabel={`${slot.label}: elegir`} width={340} content={({ close }) => <IconPicker value={value} onChange={onChange} close={close} />}>
      {button}
    </PopButton>
  );
  return mode === "toolbar" ? pop : (
    <div className="sp-field">
      <span className="sp-field-label">{slot.label}</span>
      <button type="button" className="sp-btn sp-btn--field" title={slot.label} aria-label={`${slot.label}: elegir`} aria-expanded={open} onClick={() => setOpen(!open)}>{button}</button>
      {open && <IconPicker value={value} onChange={onChange} close={() => setOpen(false)} />}
    </div>
  );
}

// ── imagen ─────────────────────────────────────────────────────────────

export function ImageGrid({ value, onChange, close, allowNone = true }) {
  const images = useAssets("image");
  const { busy, progress, error, upload } = useUpload();
  const fileRef = useRef(null);
  const pick = (id) => {
    onChange(`asset:${id}`);
    close?.();
  };
  return (
    <div className="sp-pop-body">
      <div className="sp-row">
        <button type="button" className="sp-btn" disabled={busy} onClick={() => fileRef.current?.click()}>
          <Ico name="upload" size={16} /> {busy ? `Subiendo ${Math.round(progress * 100)} %` : "Subir imagen"}
        </button>
        {allowNone && value && (
          <button type="button" className="sp-btn sp-btn--ghost" onClick={() => { onChange(null); close?.(); }}>
            Quitar
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/avif" hidden onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) { const a = await upload(f); if (a?.id) pick(a.id); } }} />
      </div>
      {error && <p className="sp-error">{error}</p>}
      {images.length === 0 ? (
        <p className="sp-hint">Aún no hay imágenes subidas.</p>
      ) : (
        <div className="sp-thumbs">
          {images.map((a) => (
            <button key={a.id} type="button" className={value === `asset:${a.id}` ? "is-active" : ""} title={a.name} aria-label={a.name || "Imagen"} onClick={() => pick(a.id)}>
              <img src={a.url} alt="" draggable="false" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ImageField({ slot, value, mode, onChange }) {
  const images = useAssets("image");
  const current = images.find((a) => value === `asset:${a.id}`);
  const label = value ? "Reemplazar" : "Elegir imagen";
  const pop = (
    <PopButton buttonClass={mode === "toolbar" ? "sp-tb-btn" : "sp-btn sp-btn--field"} title={slot.label} ariaLabel={`${slot.label}: ${label.toLowerCase()}`} width={300} content={({ close }) => <ImageGrid value={value} onChange={onChange} close={close} />}>
      {current ? <img className="sp-mini-img" src={current.url} alt="" /> : <Ico name="image" size={18} />}
      <span className={mode === "toolbar" ? "sp-tb-text" : undefined}>{label}</span>
    </PopButton>
  );
  return mode === "toolbar" ? pop : (
    <div className="sp-field">
      <span className="sp-field-label">{slot.label}</span>
      {pop}
    </div>
  );
}

// ── acción de botón ────────────────────────────────────────────────────

export function ActionEditor({ value, onChange, options }) {
  const entries = useSceneEntries();
  const action = value && typeof value === "object" ? value : { type: "enter", target: null };
  const types = options ?? [
    { value: "enter", label: "Entrar al tour" },
    { value: "goToScene", label: "Ir a una escena" },
    { value: "openUrl", label: "Abrir un enlace" },
  ];
  const urlBad = action.type === "openUrl" && action.target && !safeHttpUrl(action.target);
  return (
    <div className="sp-stack">
      <select className="sp-select" value={action.type ?? "enter"} aria-label="Al hacer clic" onChange={(e) => onChange({ type: e.target.value, target: e.target.value === "goToScene" ? entries[0]?.sceneId ?? null : null })}>
        {types.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {action.type === "goToScene" &&
        (entries.length ? (
          <select className="sp-select" value={action.target ?? ""} aria-label="Escena de destino" onChange={(e) => onChange({ ...action, target: e.target.value })}>
            {!entries.some((e) => e.sceneId === action.target) && <option value="">Elige una escena…</option>}
            {entries.map((e) => (
              <option key={e.key} value={e.sceneId}>
                {e.label}
                {e.count > 1 ? " (video)" : ""}
              </option>
            ))}
          </select>
        ) : (
          <p className="sp-hint">Este tour aún no tiene escenas.</p>
        ))}
      {action.type === "openUrl" && (
        <>
          <input className="sp-input" type="url" inputMode="url" placeholder="https://…" value={action.target ?? ""} aria-label="Enlace" aria-invalid={!!urlBad} onChange={(e) => onChange({ ...action, target: e.target.value })} />
          {urlBad && <p className="sp-error">Solo se aceptan enlaces que empiecen con http:// o https://.</p>}
        </>
      )}
    </div>
  );
}

function ActionField({ slot, value, mode, onChange }) {
  const action = value && typeof value === "object" ? value : {};
  const summary = { enter: "Entrar al tour", goToScene: "Ir a escena", openUrl: "Abrir enlace" }[action.type] ?? "Sin acción";
  if (mode === "toolbar") {
    return (
      <PopButton buttonClass="sp-tb-btn" title={slot.label} width={280} content={<div className="sp-pop-body"><div className="sp-field-label">{slot.label}</div><ActionEditor value={value} options={slot.options} onChange={onChange} /></div>}>
        <Ico name="link" size={16} />
        <span className="sp-tb-text">{summary}</span>
      </PopButton>
    );
  }
  return (
    <div className="sp-field">
      <span className="sp-field-label">{slot.label}</span>
      <ActionEditor value={value} options={slot.options} onChange={onChange} />
    </div>
  );
}

// ── animación ──────────────────────────────────────────────────────────

const ANIM_LABEL = { none: "Ninguna", rise: "Subir", fade: "Aparecer", blur: "Desenfoque" };

function AnimationField({ slot, value, ctx }) {
  const store = useDesignEditor();
  return (
    <div className="sp-field is-inline">
      <span className="sp-field-label">{slot.label}</span>
      <button type="button" className="sp-btn sp-btn--field" onClick={() => store.openPanel("animate", { id: ctx.id })}>
        {ANIM_LABEL[value?.kind] ?? "Ninguna"}
        <Ico name="chevron-right" size={16} />
      </button>
    </div>
  );
}

// ── lista editable ─────────────────────────────────────────────────────

const PIECE_TEMPLATES = () => listTemplates("element").filter((t) => !["glass-card", "basic-topbar", "frame-scrubber", "loader"].includes(t.id));

function NestedForm({ template, props, onChange, ctx }) {
  return (
    <div className="sp-nested">
      {template.slots
        .filter((s) => s.type !== "animation")
        .map((slot) => (
          <Field key={slot.key} slot={slot} value={props[slot.key] ?? template.defaults[slot.key]} mode="form" ctx={{ ...ctx, nested: true, template, props, write: (p) => onChange({ ...props, ...p }) }} onChange={(v) => onChange({ ...props, [slot.key]: v })} />
        ))}
    </div>
  );
}

// Piezas dentro de una tarjeta de cristal: cada fila es otra plantilla con sus propias opciones.
function PiecesList({ slot, value, onChange, ctx }) {
  const rows = Array.isArray(value) ? value : [];
  const [open, setOpen] = useState(null);
  const templates = PIECE_TEMPLATES();
  return (
    <div className="sp-field">
      <div className="sp-list">
        {rows.map((row, i) => {
          const t = templates.find((x) => x.id === row.template);
          return (
            <div key={i} className="sp-list-row sp-list-row--piece">
              <div className="sp-list-head">
                <button type="button" className="sp-list-title" aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)}>
                  <Ico name={open === i ? "chevron-down" : "chevron-right"} size={16} /> {t?.name ?? row.template}
                </button>
                <RowActions i={i} n={rows.length} rows={rows} onChange={onChange} />
              </div>
              {open === i && t && <NestedForm template={t} props={{ ...t.defaults, ...(row.props ?? {}) }} ctx={ctx} onChange={(props) => onChange(replaceAt(rows, i, { ...row, props }))} />}
            </div>
          );
        })}
        {rows.length < 6 && (
          <select className="sp-select" value="" aria-label="Agregar pieza" onChange={(e) => e.target.value && (onChange([...rows, { template: e.target.value, props: {} }]), setOpen(rows.length))}>
            <option value="">+ Agregar pieza…</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}

function RowActions({ i, n, rows, onChange, onMove, onRemove }) {
  return (
    <span className="sp-list-actions">
      <button type="button" className="sp-icon-btn" disabled={i === 0} aria-label="Subir fila" title="Subir" onClick={() => onMove ? onMove(-1) : onChange(moveItem(rows, i, -1))}>
        <Ico name="arrow-up" size={14} />
      </button>
      <button type="button" className="sp-icon-btn" disabled={i === n - 1} aria-label="Bajar fila" title="Bajar" onClick={() => onMove ? onMove(1) : onChange(moveItem(rows, i, 1))}>
        <Ico name="arrow-down" size={14} />
      </button>
      <button type="button" className="sp-icon-btn" aria-label="Quitar fila" title="Quitar" onClick={() => onRemove ? onRemove() : onChange(removeAt(rows, i))}>
        <Ico name="trash" size={14} />
      </button>
    </span>
  );
}

export function ListEditor({ slot, value, onChange, ctx, max = 12 }) {
  const [collapsed, setCollapsed] = useState([]);
  const listId = useId();
  max = slot.max ?? max;
  const rows = Array.isArray(value) ? value : [];
  if (!slot.of?.some((s) => s.key !== "template" && s.key !== "props") || slot.key === "children") return <PiecesList slot={slot} value={value} onChange={onChange} ctx={ctx} />;
  return (
    <div className="sp-list">
      {rows.map((row, i) => {
        const open = !collapsed.includes(i);
        const summary = row?.label || row?.title || row?.name || row?.text || `${row?.value ?? ""}${row?.suffix ?? ""}`;
        return <div key={i} className="sp-list-row sp-list-row--item">
          <button type="button" className="sp-list-toggle" aria-expanded={open} aria-controls={`${listId}-${i}`} onClick={() => setCollapsed((old) => open ? [...old, i] : old.filter((n) => n !== i))}>
            <span className="sp-list-summary"><strong>Ítem {i + 1}</strong>{summary && <span>{summary}</span>}</span>
            <Ico name={open ? "chevron-up" : "chevron-down"} size={16} />
          </button>
          <div id={`${listId}-${i}`} className="sp-list-item-body" hidden={!open}>
            <div className="sp-list-fields">
              {slot.of.map((sub) => (
                <Field key={sub.key} slot={sub.type === "text" ? { ...sub, multiline: sub.multiline ?? /^(label|description|body|text)$/.test(sub.key), rows: sub.rows ?? 1, compact: true } : sub} value={row?.[sub.key] ?? sub.default} mode="form" ctx={{ ...ctx, nested: true }} onChange={(v) => onChange(replaceAt(rows, i, { ...row, [sub.key]: v }))} />
              ))}
            </div>
            <RowActions i={i} n={rows.length} rows={rows} onChange={onChange}
              onMove={(delta) => {
                setCollapsed((old) => old.map((n) => n === i ? i + delta : n === i + delta ? i : n));
                onChange(moveItem(rows, i, delta));
              }}
              onRemove={() => {
                setCollapsed((old) => old.filter((n) => n !== i).map((n) => n > i ? n - 1 : n));
                onChange(removeAt(rows, i));
              }} />
          </div>
        </div>
      })}
      {rows.length < max && (
        <button type="button" className="sp-btn sp-btn--dashed" onClick={() => onChange([...rows, blankRow(slot.of, rows[rows.length - 1])])}>
          <Ico name="plus" size={16} /> Agregar
        </button>
      )}
    </div>
  );
}

function ListField({ slot, value, mode, onChange, ctx }) {
  if (mode === "toolbar") {
    const n = Array.isArray(value) ? value.length : 0;
    return (
      <PopButton buttonClass="sp-tb-btn" title={slot.label} width={340} content={<div className="sp-pop-body sp-pop-scroll"><div className="sp-field-label">{slot.label}</div><ListEditor slot={slot} value={value} onChange={onChange} ctx={ctx} /></div>}>
        <Ico name="edit" size={16} />
        <span className="sp-tb-text">{slot.label}</span>
        <b className="sp-tb-value">{n}</b>
      </PopButton>
    );
  }
  return (
    <div className="sp-field">
      <span className="sp-field-label">{slot.label}</span>
      <ListEditor slot={slot} value={value} onChange={onChange} ctx={ctx} />
    </div>
  );
}

// ── despachador ────────────────────────────────────────────────────────

// ctx = { id, template, props, nested?, write(patch) }
export function Field({ slot, value, onChange, ctx, mode = "form" }) {
  const common = { slot, value, onChange, ctx, mode };
  switch (slot.type) {
    case "color":
      return <ColorField {...common} />;
    case "border":
      return <BorderField {...common} />;
    case "text":
      return <TextField {...common} />;
    case "number":
    case "range":
      return <NumberField {...common} />;
    case "select":
      return <SelectField {...common} />;
    case "toggle":
      return <ToggleField {...common} />;
    case "icon":
      return <IconField {...common} />;
    case "image":
      return <ImageField {...common} />;
    case "list":
      return <ListField {...common} />;
    case "action":
      return <ActionField {...common} />;
    case "animation":
      return <AnimationField {...common} />;
    default:
      return null;
  }
}

export { Segmented };
