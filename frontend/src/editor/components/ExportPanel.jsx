import { api } from "../../api/client";

export default function ExportPanel({ exports, error, exporting, onExport }) {
  return (
    <div>
      <button onClick={onExport} disabled={exporting}>
        {exporting ? "Generando bundle…" : "Exportar tour"}
      </button>
      {error && <p style={{ color: "salmon" }}>{error}</p>}
      <ul>
        {exports.map((exp) => (
          <li key={exp.id}>
            v{exp.version} —{" "}
            <a href={api.uploadUrl(`${exp.bundlePath}/index.html`)} target="_blank" rel="noreferrer">
              abrir bundle
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
