import FontSelector from "../FontSelector.jsx";
import { useDesignEditor, useDesignState } from "../../../hooks/useTourDesign.jsx";
import { insertItem, imageItem } from "../../library.js";
import { ColorChip, ImageGrid, RangeEditor } from "../controls.jsx";
import { useAssets } from "../hooks.js";
import { MAX_BRAND_COLORS, addBrandColor, removeBrandColor, setBrand, setBrandFont } from "../logic.js";
import { Ico, PopButton } from "../ui.jsx";

// Marca: hasta 5 colores (el primero es el acento y lo usan hotspots y botones), fuentes de
// títulos y de texto (lista curada, cada nombre en su tipografía), logo y redondeo de esquinas.
// Todo se guarda en design.brand y se ve al instante en el lienzo.
function FontPicker({ which, label }) {
  const store = useDesignEditor();
  const current = useDesignState((s) => s.design?.brand?.fonts?.[which]);
  return (
    <div className="sp-field">
      <span className="sp-field-label">{label}</span>
      <FontSelector value={current || "Inter"} label={`Fuente de ${which === "heading" ? "títulos" : "texto"}`} onChange={(id) => store.apply((d) => setBrandFont(d, which, id), { label: `Fuente de ${which === "heading" ? "títulos" : "texto"}` })} />
    </div>
  );
}

export default function BrandTab() {
  const store = useDesignEditor();
  const brand = useDesignState((s) => s.design?.brand) ?? {};
  const colors = brand.colors ?? [];
  const images = useAssets("image");
  const logo = images.find((a) => brand.logo === `asset:${a.id}`);

  return (
    <div className="sp-tab">
      <section className="sp-section">
        <h3>Colores de la marca</h3>
        <p className="sp-hint">El primero es el acento: lo usan los hotspots y el color de los botones. Hasta {MAX_BRAND_COLORS} colores.</p>
        <div className="sp-brand-colors">
          {colors.map((c, i) => (
            <span key={i} className="sp-brand-color">
              <button type="button" onClick={() => store.openPanel("color", { target: "brand", index: i })} aria-label={`${i === 0 ? "Color de acento" : `Color ${i + 1}`}: cambiar`} title={i === 0 ? "Acento" : `Color ${i + 1}`}>
                <ColorChip value={c} size={40} />
              </button>
              {colors.length > 1 && (
                <button type="button" className="sp-brand-del" aria-label={`Quitar color ${i + 1}`} title="Quitar" onClick={() => store.apply((d) => removeBrandColor(d, i), { label: "Quitar color de marca" })}>
                  <Ico name="close" size={12} />
                </button>
              )}
              {i === 0 && <small>Acento</small>}
            </span>
          ))}
          {colors.length < MAX_BRAND_COLORS && (
            <button type="button" className="sp-brand-add" aria-label="Agregar color de marca" title="Agregar color" onClick={() => { store.apply((d) => addBrandColor(d, "#ffffff"), { label: "Agregar color de marca" }); store.openPanel("color", { target: "brand", index: colors.length }); }}>
              <Ico name="plus" size={18} />
            </button>
          )}
        </div>
      </section>

      <section className="sp-section">
        <h3>Fuentes</h3>
        <FontPicker which="heading" label="Títulos" />
        <FontPicker which="body" label="Texto" />
      </section>

      <section className="sp-section">
        <h3>Logo</h3>
        <div className="sp-logo">
          {logo ? <img src={logo.url} alt="Logo de la marca" /> : <span className="sp-logo-empty"><Ico name="image" size={24} /></span>}
          <div className="sp-stack">
            <PopButton buttonClass="sp-btn" label={logo ? "Cambiar logo" : "Elegir o subir logo"} width={300} content={({ close }) => <ImageGrid value={brand.logo} onChange={(ref) => store.apply((d) => setBrand(d, { logo: ref ?? undefined }), { label: "Logo de la marca" })} close={close} />} />
            {logo && (
              <button type="button" className="sp-btn" onClick={() => insertItem(store, imageItem(logo.id, logo))}>
                Insertar en el diseño
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="sp-section">
        <h3>Esquinas</h3>
        <RangeEditor value={brand.radius ?? 8} min={0} max={40} step={1} unit="px" label="Redondeo de esquinas" onChange={(v) => store.apply((d) => setBrand(d, { radius: v }), { label: "Redondeo de la marca", mergeKey: "brand.radius" })} />
      </section>
    </div>
  );
}
