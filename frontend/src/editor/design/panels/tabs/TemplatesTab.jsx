import { applyDesignTheme, applyElementTheme } from "../../../../runtime/theme/index.js";
import { useEffect, useState } from "react";
import { api } from "../../../../api/client.js";
import { useAuth } from "../../../../auth/useAuth.js";
import { useStudio } from "../../StudioContext.jsx";
import { applySharedTemplate } from "../../sharedTemplates.js";
import { themeFor } from "../../../../runtime/theme/index.js";
import FloatingWindow from "../FloatingWindow.jsx";
import { useDesignEditor, useDesignState } from "../../../hooks/useTourDesign.jsx";
import { PACKS } from "../../packs/index.js";
import { applyPack } from "../logic.js";

// Miniatura simple de un paquete, hecha con CSS: fondo, un titular, un botón y una tarjeta.
function PackPreview({ preview }) {
  const { bg, fg, accent, card, dark } = preview;
  return (
    <span className="sp-pack-preview" style={{ background: bg, color: fg }} aria-hidden="true">
      <i className="sp-pack-kicker" style={{ background: accent }} />
      <i className="sp-pack-title" style={{ background: fg }} />
      <i className="sp-pack-title sp-pack-title--short" style={{ background: fg }} />
      <i className="sp-pack-btn" style={{ background: accent }} />
      <i className="sp-pack-card" style={{ background: card, borderColor: dark ? "rgba(255,255,255,.18)" : "rgba(0,0,0,.08)" }} />
    </span>
  );
}

export default function TemplatesTab() {
  const store = useDesignEditor();
  const { user } = useAuth();
  const { tourId, reload } = useStudio();
  const canCreate = ["admin", "super_admin"].includes(user?.globalRole);
  const [shared, setShared] = useState([]);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const loadShared = async () => {
    setLoading(true); setError("");
    try { setShared(await api.get("/api/templates")); } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { loadShared(); }, []);
  const selection = useDesignState((s) => s.selection);
  const screen = useDesignState((s) => s.screen);
  const themeId = useDesignState((s) => s.design.theme?.id);
  const [pending, setPending] = useState(null);
  const [clearOverrides, setClearOverrides] = useState(false);
  const selected = selection.length === 1 ? selection[0] : null;
  const apply = (pack, onlySelection = false) => {
    store.apply((d) => onlySelection
      ? applyElementTheme(d, screen, selected, pack.theme)
      : applyDesignTheme(d, pack.theme, { clearOverrides }), { label: onlySelection ? "Aplicar estilo al elemento" : "Cambiar estilo del diseño" });
  };
  const example = (pack) => {
    store.apply((d) => applyPack(d, pack), { label: "Empezar desde ejemplo" });
    store.select([]);
    setPending(null);
  };
  const saveTemplate = async (event) => {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      await store.flush();
      const saved = await api.post(`/api/tours/${tourId}/templates`, { name });
      setShared((list) => [saved, ...list]); setCreating(false); setName("");
      setNotice("Plantilla guardada. Ya está disponible en todos los tours.");
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  const useShared = async (template) => {
    setBusy(true); setError(""); setNotice("");
    try {
      const { design } = await api.post(`/api/tours/${tourId}/templates/${template.id}/import`);
      await reload();
      store.apply((current) => applySharedTemplate(current, design), { label: `Aplicar plantilla ${template.name}` });
      store.select([]); store.setScreen("tour"); setPending(null);
      setNotice("Plantilla aplicada. Puedes deshacer este cambio.");
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  return (
    <div className="sp-tab">
      <section className="sp-section" aria-label="Plantillas compartidas">
        <b>Plantillas compartidas</b>
        <p className="sp-hint">Disponibles en todos los tours de la organización.</p>
        {canCreate && <button type="button" className="sp-btn sp-btn--primary" onClick={() => { setError(""); setCreating(true); }}>+ Crear nueva plantilla</button>}
        {loading && <p className="sp-hint" role="status">Cargando plantillas…</p>}
        {!loading && !shared.length && <p className="sp-hint">Aún no hay plantillas guardadas.</p>}
        {notice && <p className="sp-hint" role="status">{notice}</p>}
        {error && !creating && <div role="alert"><p>{error}</p><button className="sp-btn" type="button" onClick={loadShared}>Reintentar</button></div>}
        {shared.map((template) => {
          const tokens = themeFor(template.design.theme).tokens;
          return <section key={template.id} className="sp-section" aria-label={template.name}>
            <PackPreview preview={{ bg: tokens.surface, fg: tokens.text, accent: template.design.brand?.colors?.[0] || tokens.accent, card: tokens.tint, dark: tokens.glass }} />
            <b>{template.name}</b>
            <button type="button" className="sp-btn" disabled={busy} onClick={() => setPending({ ...template, shared: true })}>Usar esta plantilla</button>
          </section>;
        })}
      </section>
      <p className="sp-hint">Cambia colores, fuentes y acabados conservando tus elementos, textos y posiciones. Puedes deshacerlo.</p>
      <label className="sp-hint" style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input type="checkbox" checked={clearOverrides} onChange={(e) => setClearOverrides(e.target.checked)} />
        También quitar mis colores y estilos manuales al aplicar a todo
      </label>
      <div className="sp-stack">
        {PACKS.map((pack) => (
          <section key={pack.id} className="sp-section" aria-label={pack.name}>
            <PackPreview preview={pack.preview} />
            <b>{pack.name}{themeId === pack.id ? " · Activo" : ""}</b>
            <p className="sp-hint">{pack.description}</p>
            <div className="sp-row">
              {selected && <button type="button" className="sp-btn sp-btn--primary" onClick={() => apply(pack, true)}>Aplicar a este</button>}
              <button type="button" className={`sp-btn${selected ? "" : " sp-btn--primary"}`} onClick={() => apply(pack)}>Aplicar a todo</button>
            </div>
            <button type="button" className="sp-btn sp-btn--ghost" onClick={() => setPending(pack)}>Empezar desde este ejemplo</button>
          </section>
        ))}
      </div>
      {pending && (
        <div className="sp-confirm" role="alertdialog" aria-label="Reemplazar con ejemplo">
          <p><b>{pending.shared ? "Usar" : "Empezar desde"} «{pending.name}»</b><br />Reemplaza los elementos y estilos de Inicio y Recorrido{pending.shared ? ", y los paneles reutilizables" : ""}. Se puede deshacer. Tus escenas, hotspots, nadir e idiomas se conservan.{pending.shared && " Los botones que enlazaban escenas deben configurarse de nuevo en este tour."}</p>
          <div className="sp-row">
            <button type="button" className="sp-btn sp-btn--primary" disabled={busy} onClick={() => pending.shared ? useShared(pending) : example(pending)}>{busy ? "Aplicando…" : "Aplicar plantilla"}</button>
            <button type="button" className="sp-btn" disabled={busy} onClick={() => setPending(null)}>Cancelar</button>
          </div>
        </div>
      )}
      {creating && <FloatingWindow title="Crear nueva plantilla" windowKey="create-template" onClose={() => { if (!busy) setCreating(false); }}>
        <form className="sp-stack" onSubmit={saveTemplate}>
          <p className="sp-hint">Guarda el diseño actual de Inicio y Recorrido, sus paneles, colores, fuentes y archivos. Se compartirá con todos los tours. No incluye escenas ni hotspots.</p>
          <label className="sp-field"><span className="sp-field-label">Nombre de la plantilla</span><input className="sp-input" data-initial-focus aria-label="Nombre de la plantilla" value={name} maxLength={100} required onChange={(e) => setName(e.target.value)} disabled={busy} /></label>
          {error && <p role="alert">{error}</p>}
          <button type="submit" className="sp-btn sp-btn--primary" disabled={busy || !name.trim()}>{busy ? "Guardando…" : "Guardar para todos los tours"}</button>
        </form>
      </FloatingWindow>}
    </div>
  );
}
