import { useState } from "react";
import { FONT_LIST, fontStack } from "../../../runtime/fonts/fontList.js";
import { useDesignState } from "../../hooks/useTourDesign.jsx";
import FloatingWindow from "./FloatingWindow.jsx";
import { Ico } from "./ui.jsx";
import "./FontSelector.css";

const CATEGORIES = [["all", "Todas"], ["sans", "Sans serif"], ["serif", "Serif"], ["mono", "Monoespaciadas"]];
const normalized = (text) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, "");
function recentFonts() {
  try { const saved = JSON.parse(sessionStorage.getItem("tour-studio.recent-fonts")); return Array.isArray(saved) ? saved.filter((id) => FONT_LIST.some((f) => f.id === id)).slice(0, 6) : []; } catch { return []; }
}
function fontsInDesign(design) {
  const used = new Set(Object.values(design?.brand?.fonts ?? {}));
  const visit = (elements) => (elements ?? []).forEach((el) => { used.add(el.props?.font); used.add(el.props?.headingFont); visit(el.children); });
  Object.values(design?.screens ?? {}).forEach((screen) => visit(screen.elements));
  (design?.panels ?? []).forEach((panel) => visit(panel.elements));
  return used;
}

// One bounded catalogue, reused by brand and individual text controls.
export default function FontSelector({ value = "Inter", label = "Fuente", onChange, specialOptions = [], toolbar = false }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [recent, setRecent] = useState(recentFonts);
  const design = useDesignState((s) => s.design);
  const current = FONT_LIST.find((f) => f.id === value);
  const currentLabel = current?.label || specialOptions.find((o) => o.value === value)?.label || "Inter";
  const used = fontsInDesign(design);
  const filtered = FONT_LIST.filter((f) => (category === "all" || f.kind === category) && normalized(f.label).includes(normalized(query)));
  const choose = (id) => {
    if (FONT_LIST.some((f) => f.id === id)) {
      const next = [id, ...recent.filter((old) => old !== id)].slice(0, 6);
      setRecent(next);
      try { sessionStorage.setItem("tour-studio.recent-fonts", JSON.stringify(next)); } catch { /* Optional session preference. */ }
    }
    onChange(id); setOpen(false);
  };
  const renderFonts = (fonts) => fonts.map((font) => <button type="button" key={font.id} className={`sp-font-option${value === font.id ? " is-active" : ""}`} aria-pressed={value === font.id} onClick={() => choose(font.id)}>
    <span style={{ fontFamily: font.family }}>{font.label}</span><span className="sp-font-sample" style={{ fontFamily: font.family }}>Aa Bb Cc</span>{value === font.id && <Ico name="check" size={16} />}
  </button>);
  return <>
    <button type="button" className={`sp-font-trigger ${toolbar ? "sp-tb-btn" : "sp-btn sp-btn--field"}`} title={`${label}: ${currentLabel}`} aria-label={`${label}: ${currentLabel}`} aria-haspopup="dialog" aria-expanded={open} onClick={() => { setQuery(""); setCategory("all"); setRecent(recentFonts()); setOpen(true); }}>
      {toolbar && <span className="sp-font-symbol" aria-hidden="true">Aa</span>}<span className={toolbar ? "sp-font-current" : undefined} style={{ fontFamily: current ? fontStack(value) : undefined }}>{currentLabel}</span><Ico name="chevron-down" size={12} />
    </button>
    {open && <FloatingWindow title={label} windowKey="fonts" onClose={() => setOpen(false)}>
      <div className="sp-font-catalog">
        <div className="sp-font-catalog-controls">
        <label className="sp-field"><span className="sp-field-label">Buscar fuente</span><input type="search" className="sp-input" data-initial-focus aria-label="Buscar fuente" placeholder="Nombre de la fuente…" value={query} autoFocus onChange={(e) => setQuery(e.target.value)} /></label>
        <div className="sp-font-categories" role="group" aria-label="Categoría de fuentes">{CATEGORIES.map(([id, name]) => <button type="button" className={`sp-btn${category === id ? " is-active" : ""}`} key={id} aria-pressed={category === id} onClick={() => setCategory(id)}>{name}</button>)}</div>
        </div>
        {!query && category === "all" && <>
          {specialOptions.length > 0 && <div className="sp-font-options">{specialOptions.map((option) => <button type="button" key={option.value} className="sp-font-option" aria-pressed={value === option.value} onClick={() => choose(option.value)}><span>{option.label}</span>{value === option.value && <Ico name="check" size={16} />}</button>)}</div>}
          {FONT_LIST.some((f) => used.has(f.id)) && <section className="sp-font-options"><h3>En este diseño</h3>{renderFonts(FONT_LIST.filter((f) => used.has(f.id)))}</section>}
          {recent.length > 0 && <section className="sp-font-options"><h3>Usadas recientemente</h3>{renderFonts(recent.map((id) => FONT_LIST.find((f) => f.id === id)))}</section>}
        </>}
        <section className="sp-font-options" aria-label="Catálogo de fuentes"><h3>{query ? "Resultados" : "Todas las fuentes"} · {filtered.length}</h3>{renderFonts(filtered)}{!filtered.length && <p className="sp-hint" role="status">No hay fuentes con ese nombre. Prueba otra búsqueda o categoría.</p>}</section>
      </div>
    </FloatingWindow>}
  </>;
}
