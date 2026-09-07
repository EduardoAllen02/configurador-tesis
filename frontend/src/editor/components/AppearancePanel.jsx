import { useState } from "react";

const DEFAULT_ACCENT = "#4da3ff";
const DEFAULT_RADIUS = 8;

// Theming del tour visto por el visitante final (Tour.theme/customTexts — Track A). No
// tocar código personalizado acá: eso vive en una sección aparte, gateada a rol dev
// (Tour.customCss/customJs, ver PLAN_DESARROLLO_FASE2.md sección 5.3).
export default function AppearancePanel({ tour, onSave }) {
  const [accentColor, setAccentColor] = useState(tour.theme?.accentColor || DEFAULT_ACCENT);
  const [borderRadius, setBorderRadius] = useState(tour.theme?.borderRadius ?? DEFAULT_RADIUS);
  const [tooltipStyle, setTooltipStyle] = useState(tour.theme?.tooltipStyle || "dark");
  const [welcomeMessage, setWelcomeMessage] = useState(tour.customTexts?.welcomeMessage || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSave({
        theme: { accentColor, borderRadius: Number(borderRadius), tooltipStyle },
        customTexts: { welcomeMessage: welcomeMessage.trim() || undefined },
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card card-pad stack">
      <p className="text-soft" style={{ fontSize: 13, marginTop: 0 }}>
        Así se ve tu tour para quien lo visita — el color de acento, las esquinas y el
        panel de información se ajustan a tu marca.
      </p>

      <div className="form-row">
        <div className="field" style={{ maxWidth: 160 }}>
          <label className="field-label" htmlFor="theme-accent">
            Color de acento
          </label>
          <div className="row" style={{ gap: 8 }}>
            <input
              id="theme-accent"
              type="color"
              value={accentColor}
              onChange={(e) => setAccentColor(e.target.value)}
              style={{ width: 40, height: 36, padding: 2, border: "1px solid var(--border-strong)", borderRadius: "var(--radius-sm)" }}
            />
            <input
              className="input"
              value={accentColor}
              onChange={(e) => setAccentColor(e.target.value)}
              style={{ flex: 1 }}
            />
          </div>
        </div>

        <div className="field" style={{ maxWidth: 160 }}>
          <label className="field-label" htmlFor="theme-radius">
            Redondeo de esquinas ({borderRadius}px)
          </label>
          <input
            id="theme-radius"
            type="range"
            min="0"
            max="20"
            value={borderRadius}
            onChange={(e) => setBorderRadius(e.target.value)}
            style={{ width: "100%", marginTop: 8 }}
          />
        </div>

        <div className="field" style={{ maxWidth: 160 }}>
          <label className="field-label" htmlFor="theme-tooltip">
            Panel de info
          </label>
          <select
            id="theme-tooltip"
            className="select"
            value={tooltipStyle}
            onChange={(e) => setTooltipStyle(e.target.value)}
          >
            <option value="dark">Oscuro</option>
            <option value="light">Claro</option>
          </select>
        </div>
      </div>

      <div className="field">
        <label className="field-label" htmlFor="theme-welcome">
          Mensaje de bienvenida (opcional)
        </label>
        <input
          id="theme-welcome"
          className="input"
          placeholder="Ej. Bienvenido al recorrido virtual de Casa Roble"
          value={welcomeMessage}
          onChange={(e) => setWelcomeMessage(e.target.value)}
        />
      </div>

      {error && <p className="error-text">{error}</p>}

      <button type="submit" className="btn btn-primary" style={{ alignSelf: "flex-start" }} disabled={saving}>
        {saving ? "Guardando…" : saved ? "Guardado ✓" : "Guardar apariencia"}
      </button>
    </form>
  );
}
