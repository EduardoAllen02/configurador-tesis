import { api } from "../../api/client";
import { ExportIcon } from "../../components/ui/Icon.jsx";

export default function ExportPanel({ exports, error, exporting, onExport }) {
  return (
    <div className="card card-pad stack">
      <div className="spread">
        <p className="text-soft" style={{ fontSize: 13.5, maxWidth: "48ch" }}>
          Genera un sitio autocontenido (HTML + imágenes) que puedes publicar en cualquier
          hosting estático, sin depender de este panel.
        </p>
        <button className="btn btn-primary" onClick={onExport} disabled={exporting}>
          <ExportIcon width={16} height={16} />
          {exporting ? "Generando…" : "Exportar tour"}
        </button>
      </div>

      {error && <p className="error-text">{error}</p>}

      {exports.length > 0 && (
        <div className="stack" style={{ gap: "var(--space-2)" }}>
          {exports.map((exp) => (
            <div key={exp.id} className="card row" style={{ padding: "10px 14px" }}>
              <span className="badge">v{exp.version}</span>
              <span className="text-soft" style={{ flex: 1, fontSize: 13 }}>
                {new Date(exp.createdAt).toLocaleString("es-MX")}
              </span>
              <a
                className="btn btn-secondary btn-sm"
                href={api.uploadUrl(`${exp.bundlePath}/index.html`)}
                target="_blank"
                rel="noreferrer"
              >
                Abrir bundle
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
