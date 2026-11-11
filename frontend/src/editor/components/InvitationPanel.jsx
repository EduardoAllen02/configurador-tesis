import { useState } from "react";
import { CopyIcon, LinkIcon, TrashIcon } from "../../components/ui/Icon.jsx";

export default function InvitationPanel({ invitations, error, onCreate, onRemove }) {
  const [role, setRole] = useState("cliente");
  const [email, setEmail] = useState("");
  const [copiedId, setCopiedId] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    await onCreate({ role, email });
    setEmail("");
  }

  function copyLink(inv) {
    const link = `${window.location.origin}/invitations/${inv.token}`;
    navigator.clipboard?.writeText(link);
    setCopiedId(inv.id);
    setTimeout(() => setCopiedId((id) => (id === inv.id ? null : id)), 1500);
  }

  return (
    <div className="card card-pad stack">
      <form onSubmit={handleSubmit} className="form-row">
        <div className="field" style={{ maxWidth: 140 }}>
          <label className="field-label">Rol</label>
          <select className="select" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="cliente">Cliente</option>
          </select>
        </div>
        <div className="field">
          <label className="field-label">Email (opcional)</label>
          <input
            className="input"
            placeholder="Restringir a un correo específico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="form-actions">
          <button type="submit" className="btn btn-primary">
            <LinkIcon width={16} height={16} />
            Crear enlace
          </button>
        </div>
      </form>

      {error && <p className="error-text">{error}</p>}

      {invitations.length > 0 && (
        <div className="stack" style={{ gap: "var(--space-2)", marginTop: "var(--space-2)" }}>
          {invitations.map((inv) => (
            <div key={inv.id} className="card row" style={{ padding: "10px 14px" }}>
              <span className="badge">{inv.role}</span>
              <span className={`badge ${inv.usedAt ? "badge-role-nav" : "badge-role-info"}`}>
                {inv.usedAt ? "Usado" : "Pendiente"}
              </span>
              <code className="text-soft" style={{ flex: 1, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                /invitations/{inv.token}
              </code>
              <button className="btn btn-secondary btn-sm" onClick={() => copyLink(inv)}>
                <CopyIcon width={14} height={14} />
                {copiedId === inv.id ? "Copiado" : "Copiar"}
              </button>
              <button
                className="btn btn-ghost btn-icon"
                style={{ width: 28, height: 28 }}
                onClick={() => onRemove(inv.id)}
                title="Revocar"
                aria-label="Revocar"
              >
                <TrashIcon width={15} height={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
