import { TRANSPARENT } from "../../../../runtime/theme/index.js";
import { useEffect, useMemo, useState } from "react";
import { getTemplate } from "../../../../runtime/templates/index.js";
import { useDesignEditor, useDesignState } from "../../../hooks/useTourDesign.jsx";
import { findElement, updateProps } from "../../elementOps.js";
import { ColorChip } from "../controls.jsx";
import { DEFAULT_SWATCHES, alphaOf, formatColor, parseColor, sameColor, setBrandColor, setIntroBackground, toHex6, usedColors, withAlpha } from "../logic.js";
import { Ico, PanelHeader } from "../ui.jsx";
import { useEscape } from "../escape.js";

// Panel de color (INVESTIGACION_CANVA §5): reemplaza al cajón. Buscador hex/nombre, colores del
// tour, marca, predeterminados (7 columnas, círculos de 40 px con separación de 8), «+» con
// selector y hex, cuentagotas, transparencia. Se aplica en vivo; Deshacer revierte.
//
// Destino (state.panel):  { id, key }                  prop de color de un elemento
//                         { target: "brand", index }   color de la marca
//                         { target: "intro-bg" }       color de fondo de la pantalla de inicio
function useTarget(panel) {
  const store = useDesignEditor();
  const design = useDesignState((s) => s.design);
  const screen = useDesignState((s) => s.screen);
  return useMemo(() => {
    if (panel.target === "brand") {
      const index = panel.index ?? 0;
      return {
        title: index === 0 ? "Color de acento" : `Color de marca ${index + 1}`,
        value: design.brand?.colors?.[index] ?? "",
        canReset: false,
        set: (v) => store.apply((d) => setBrandColor(d, index, v ?? "#ffffff"), { label: "Color de marca", mergeKey: `brand.color.${index}` }),
      };
    }
    if (panel.target === "intro-bg") {
      return {
        title: "Color de fondo",
        value: design.screens?.intro?.background?.color ?? "",
        canReset: true,
        set: (v) => store.apply((d) => setIntroBackground(d, { color: v }), { label: "Color de fondo", mergeKey: "intro.color" }),
      };
    }
    const element = findElement(design, screen, panel.id);
    const template = element ? getTemplate(element.template) : null;
    const slot = template?.slots.find((s) => s.key === panel.key);
    return {
      title: slot ? `Color · ${slot.label}` : "Color",
      value: element ? (element.props?.[panel.key] ?? template?.defaults?.[panel.key] ?? "") : "",
      canReset: true,
      missing: !element,
      set: (v) => store.apply((d) => updateProps(d, screen, [panel.id], { [panel.key]: v }), { label: "Cambiar color", mergeKey: `${panel.id}.${panel.key}` }),
    };
  }, [panel, design, screen, store]);
}

function Swatch({ color, active, onPick, label }) {
  return (
    <button type="button" className={`sp-swatch${active ? " is-active" : ""}`} aria-label={label ?? color} aria-pressed={active} title={color} onClick={() => onPick(color)}>
      <ColorChip value={color} size={40} />
    </button>
  );
}

export default function ColorPanel({ panel }) {
  const store = useDesignEditor();
  const design = useDesignState((s) => s.design);
  const selection = useDesignState((s) => s.selection);
  const target = useTarget(panel);
  const [query, setQuery] = useState("");
  const [custom, setCustom] = useState(false);
  const [draft, setDraft] = useState(null);
  const close = () => store.closePanel();
  useEscape(true, close);

  // Si el elemento al que apunta ya no está seleccionado o existe, el panel se cierra solo.
  useEffect(() => {
    if (panel.id && (target.missing || !selection.includes(panel.id))) store.closePanel();
  }, [panel.id, selection, target.missing, store]);

  const value = target.value;
  const brandList = design.brand?.colors ?? [];
  const used = useMemo(() => usedColors(design, getTemplate, 30).filter((c) => !brandList.some((b) => sameColor(b, c))).slice(0, 14), [design]); // eslint-disable-line react-hooks/exhaustive-deps
  const brand = design.brand?.colors ?? [];
  const parsed = parseColor(query);
  const hasDropper = typeof window !== "undefined" && "EyeDropper" in window;

  const pick = (c) => target.set(c);
  const onQuery = (text) => {
    setQuery(text);
    const c = parseColor(text);
    if (c) pick(formatColor(c));
  };
  const dropper = async () => {
    try {
      const res = await new window.EyeDropper().open();
      if (res?.sRGBHex) pick(res.sRGBHex);
    } catch {
      /* cancelado */
    }
  };
  const alpha = Math.round(alphaOf(value) * 100);
  const hex = toHex6(value) ?? "#ffffff";
  const isActive = (c) => !!value && sameColor(value, c);

  return (
    <div className="sp-panel sp-panel--color" role="dialog" aria-label={target.title}>
      <PanelHeader title={target.title} onClose={close} />
      <div className="sp-scroll">
        <label className="sp-search">
          <input type="text" placeholder="Prueba con «azul» o «#00c4cc»" value={query} aria-label="Buscar color" onChange={(e) => onQuery(e.target.value)} />
        </label>
        {query && !parsed && <p className="sp-hint">Escribe un color en hex (#00c4cc) o un nombre como azul, rojo o negro.</p>}

        <div className="sp-swatches">
          <button type="button" className={`sp-swatch sp-swatch--custom${custom ? " is-active" : ""}`} aria-label="Color personalizado" title="Color personalizado" aria-expanded={custom} onClick={() => setCustom((c) => !c)}>
            <Ico name="plus" size={18} />
          </button>
          {hasDropper && (
            <button type="button" className="sp-swatch sp-swatch--tool" aria-label="Cuentagotas" title="Tomar un color de la pantalla" onClick={dropper}>
              <Ico name="dropper" size={18} />
            </button>
          )}
          {target.canReset && (
            <button type="button" className={`sp-swatch sp-swatch--tool${!value ? " is-active" : ""}`} aria-label="Automático (del estilo)" aria-pressed={!value} title="Automático (del estilo)" onClick={() => target.set(undefined)}>
              <ColorChip value="" size={40} />
            </button>
          )}
          {target.canReset && <Swatch color={TRANSPARENT} active={sameColor(value, TRANSPARENT)} label="Transparente" onPick={pick} />}
          {value && (
            <Swatch color={value} active label={`Color actual ${value}`} onPick={pick} />
          )}
        </div>

        {custom && (
          <div className="sp-custom">
            <input type="color" value={hex} aria-label="Selector de color" onChange={(e) => pick(parseColor(value)?.a < 1 ? withAlpha(e.target.value, alphaOf(value)) : e.target.value)} />
            <input
              className="sp-input"
              value={draft ?? value ?? ""}
              aria-label="Valor del color"
              placeholder="#rrggbb"
              onFocus={() => setDraft(value ?? "")}
              onBlur={() => setDraft(null)}
              onChange={(e) => {
                setDraft(e.target.value);
                const c = parseColor(e.target.value);
                if (c) pick(formatColor(c));
              }}
            />
          </div>
        )}

        {value && parseColor(value) && (
          <label className="sp-field">
            <span className="sp-field-label">Transparencia</span>
            <div className="sp-range">
              <input type="range" min={0} max={100} step={1} value={alpha} aria-label="Transparencia" onChange={(e) => pick(withAlpha(value, Number(e.target.value) / 100))} />
              <span className="sp-range-num">
                <input type="number" min={0} max={100} value={alpha} aria-label="Transparencia (número)" onChange={(e) => e.target.value !== "" && pick(withAlpha(value, Math.min(100, Math.max(0, Number(e.target.value))) / 100))} />
                <em>%</em>
              </span>
            </div>
          </label>
        )}

        {used.length > 0 && (
          <section className="sp-section">
            <h3>Colores del tour</h3>
            <div className="sp-swatches">
              {used.map((c) => (
                <Swatch key={c} color={c} active={isActive(c)} onPick={pick} />
              ))}
            </div>
          </section>
        )}

        {brand.length > 0 && (
          <section className="sp-section">
            <h3>Marca</h3>
            <div className="sp-swatches">
              {brand.map((c, i) => (
                <Swatch key={`${c}-${i}`} color={c} active={isActive(c)} onPick={pick} label={`Marca ${i + 1}: ${c}`} />
              ))}
            </div>
          </section>
        )}

        <section className="sp-section">
          <h3>Colores predeterminados</h3>
          <div className="sp-swatches">
            {DEFAULT_SWATCHES.map((c) => (
              <Swatch key={c} color={c} active={isActive(c)} onPick={pick} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
