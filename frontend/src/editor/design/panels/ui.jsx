import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createIcon } from "../../../runtime/icons/index.js";
import { useEscape } from "./escape.js";

// Piezas de interfaz compartidas por los paneles del estudio (iconos propios, popover, interruptor…).

const PATHS = {
  "chevron-left": ["m15 18-6-6 6-6"],
  "chevron-right": ["m9 18 6-6-6-6"],
  "chevron-down": ["m6 9 6 6 6-6"],
  "chevron-up": ["m18 15-6-6-6 6"],
  close: ["M18 6 6 18", "m6 6 12 12"],
  plus: ["M5 12h14", "M12 5v14"],
  minus: ["M5 12h14"],
  trash: ["M3 6h18", "M8 6V4h8v2", "M19 6l-1 14H6L5 6", "M10 11v6", "M14 11v6"],
  eye: ["M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z", "M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"],
  "eye-off": ["M3 3l18 18", "M10.6 6.1A9.8 9.8 0 0 1 12 6c6.4 0 10 6 10 6a17 17 0 0 1-3.2 3.9", "M6.5 7.6A17 17 0 0 0 2 12s3.6 6 10 6a9.6 9.6 0 0 0 4-.9", "M9.9 9.9a3 3 0 0 0 4.2 4.2"],
  lock: ["M5 11h14v10H5z", "M8 11V7a4 4 0 0 1 8 0v4"],
  unlock: ["M5 11h14v10H5z", "M8 11V7a4 4 0 0 1 7.5-2"],
  grip: ["M9 6h.01", "M15 6h.01", "M9 12h.01", "M15 12h.01", "M9 18h.01", "M15 18h.01"],
  upload: ["M12 15V4", "m7 9 5-5 5 5", "M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4"],
  copy: ["M9 9h11v11H9z", "M5 15V5a1 1 0 0 1 1-1h10"],
  more: ["M5 12h.01", "M12 12h.01", "M19 12h.01"],
  image: ["M3 5h18v14H3z", "M8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z", "m21 16-5-5-8 8"],
  video: ["M3 6h13v12H3z", "m16 10 5-3v10l-5-3"],
  audio: ["M9 18V5l12-2v13", "M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0z", "M21 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"],
  layout: ["M3 4h18v16H3z", "M3 10h18", "M10 10v10"],
  shapes: ["M4 14h7v7H4z", "M17.5 3a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9z", "M7.5 3 11 9H4z"],
  bold: ["M6 4h7a4 4 0 0 1 0 8H6z", "M6 12h8a4 4 0 0 1 0 8H6z"],
  italic: ["M10 4h9", "M5 20h9", "M15 4 9 20"],
  underline: ["M6 3v7a6 6 0 0 0 12 0V3", "M4 21h16"],
  "text-left": ["M4 5h16", "M4 10h10", "M4 15h16", "M4 20h10"],
  "text-center": ["M4 5h16", "M7 10h10", "M4 15h16", "M7 20h10"],
  "text-right": ["M4 5h16", "M10 10h10", "M4 15h16", "M10 20h10"],
  type: ["M4 7V5h16v2", "M12 5v14", "M9 19h6"],
  pin: ["M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 0 1 16 0z", "M12 7.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z"],
  palette: ["M12 3a9 9 0 1 0 0 18c1.2 0 2-.8 2-1.8 0-.5-.2-.9-.5-1.3-.3-.4-.5-.8-.5-1.3 0-1 .8-1.8 1.8-1.8H17a4 4 0 0 0 4-4C21 6.5 17 3 12 3z", "M7.5 11h.01", "M10 7.5h.01", "M14.5 7.5h.01"],
  "arrow-up": ["m5 12 7-7 7 7", "M12 19V5"],
  "arrow-down": ["M12 5v14", "m19 12-7 7-7-7"],
  front: ["M8 8h13v13H8z", "M3 16V3h13"],
  back: ["M3 3h13v13H3z", "M13 21h8V13"],
  forward: ["M12 3v12", "m7 10 5 5 5-5", "M5 21h14"],
  backward: ["M12 21V9", "m7 14 5-5 5 5", "M5 3h14"],
  "align-left": ["M4 3v18", "M8 7h12v4H8z", "M8 14h7v4H8z"],
  "align-center": ["M12 3v18", "M5 7h14v4H5z", "M8 14h8v4H8z"],
  "align-right": ["M20 3v18", "M4 7h12v4H4z", "M9 14h7v4H9z"],
  "align-top": ["M3 4h18", "M7 8v12h4V8z", "M14 8v7h4V8z"],
  "align-middle": ["M3 12h18", "M7 5v14h4V5z", "M14 8v8h4V8z"],
  "align-bottom": ["M3 20h18", "M7 4v12h4V4z", "M14 9v7h4V9z"],
  stretch: ["M3 12h18", "m7 8-4 4 4 4", "m17 8 4 4-4 4"],
  stretchv: ["M12 3v18", "m8 7 4-4 4 4", "m8 17 4 4 4-4"],
  check: ["M20 6 9 17l-5-5"],
  dropper: ["m2 22 1-1h3l9-9", "M3 21v-3l9-9", "m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8a2.1 2.1 0 1 1 3-3l.4.4z"],
  sparkle: ["m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"],
  rect: ["M4 6h16v12H4z"],
  link: ["M10 14a4.2 4.2 0 0 0 6 0l3-3a4.24 4.24 0 0 0-6-6l-1.5 1.5", "M14 10a4.2 4.2 0 0 0-6 0l-3 3a4.24 4.24 0 0 0 6 6l1.5-1.5"],
  edit: ["M12 20h9", "M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"],
};

export function Ico({ name, size = 20, className, strokeWidth = 1.75 }) {
  const d = PATHS[name] || [];
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {d.map((p, i) => (
        <path key={i} d={p} />
      ))}
    </svg>
  );
}

// Icono del set del motor (el mismo que ven los visitantes).
export function Glyph({ id, size = 18, strokeWidth = 2 }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    ref.current?.replaceChildren(createIcon(id, { size, strokeWidth }));
  }, [id, size, strokeWidth]);
  return <span ref={ref} className="sp-glyph" style={{ width: size, height: size }} />;
}

export function Switch({ checked, onChange, label, disabled }) {
  return (
    <button type="button" role="switch" aria-checked={!!checked} aria-label={label} disabled={disabled} className={`sp-switch${checked ? " is-on" : ""}`} onClick={() => onChange(!checked)}>
      <span />
    </button>
  );
}

export function Segmented({ value, options, onChange, label }) {
  return (
    <div className="sp-seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" className={value === o.value ? "is-active" : ""} aria-pressed={value === o.value} disabled={o.disabled} onClick={() => onChange(o.value)} title={o.title}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

// Ventana flotante bajo un botón. El contenedor `.sp-pop-wrap` es el ancla (position: relative).
// Se cierra con clic fuera y con Escape (que no llega al lienzo). `render({ close })`.
export function PopButton({ label, title, className = "", buttonClass = "", children, content, open: controlled, onOpenChange, align = "start", width, disabled, ariaLabel }) {
  const [inner, setInner] = useState(false);
  const open = controlled ?? inner;
  const setOpen = (v) => {
    if (controlled === undefined) setInner(v);
    onOpenChange?.(v);
  };
  const wrap = useRef(null);
  const popRef = useRef(null);
  useEscape(open, () => setOpen(false));
  // Si la ventana se sale de la pantalla por la derecha o la izquierda, se corre lo justo.
  useLayoutEffect(() => {
    const pop = popRef.current;
    if (!open || !pop) return;
    pop.style.transform = "";
    const r = pop.getBoundingClientRect();
    const over = r.right - (window.innerWidth - 8);
    if (over > 0) pop.style.transform = `translateX(${-over}px)`;
    else if (r.left < 8) pop.style.transform = `translateX(${8 - r.left}px)`;
  });
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (wrap.current && !wrap.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown, true);
    return () => document.removeEventListener("pointerdown", onDown, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  return (
    <span className={`sp-pop-wrap ${className}`} ref={wrap}>
      <button type="button" className={`${buttonClass}${open ? " is-open" : ""}`} aria-haspopup="dialog" aria-expanded={open} aria-label={ariaLabel ?? (typeof label === "string" ? label : undefined)} title={title} disabled={disabled} onClick={() => setOpen(!open)}>
        {children ?? label}
      </button>
      {open && (
        <div ref={popRef} className={`sp-pop sp-pop--${align}`} role="dialog" style={width ? { width } : undefined}>
          {typeof content === "function" ? content({ close: () => setOpen(false) }) : content}
        </div>
      )}
    </span>
  );
}

export function PanelHeader({ title, onClose, children }) {
  return (
    <div className="sp-head">
      <h2>{title}</h2>
      {children}
      <button type="button" className="sp-icon-btn" onClick={onClose} aria-label="Cerrar panel" title="Cerrar (Esc)">
        <Ico name="close" />
      </button>
    </div>
  );
}

export function Tabs({ value, options, onChange }) {
  return (
    <div className="sp-tabs" role="tablist">
      {options.map((o) => (
        <button key={o.value} type="button" role="tab" aria-selected={value === o.value} className={value === o.value ? "is-active" : ""} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
