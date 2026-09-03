import { useState } from "react";
import { NavArrowIcon } from "./Icon.jsx";

// Sección secundaria colapsada por defecto — para funciones que siguen existiendo pero
// ya no deben competir visualmente con el flujo principal (ej. el ajuste manual de
// lon/lat de un hotspot, o la subida de video 360°).
export default function Disclosure({ title, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="disclosure">
      <button type="button" className="disclosure-trigger" onClick={() => setOpen((v) => !v)}>
        {title}
        <NavArrowIcon width={14} height={14} style={{ transform: open ? "rotate(90deg)" : "none", transition: "transform 0.15s ease" }} />
      </button>
      {open && <div className="disclosure-body">{children}</div>}
    </div>
  );
}
