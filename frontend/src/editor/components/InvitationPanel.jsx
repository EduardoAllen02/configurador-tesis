import { useState } from "react";

export default function InvitationPanel({ invitations, error, onCreate, onRemove }) {
  const [role, setRole] = useState("viewer");
  const [email, setEmail] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    await onCreate({ role, email });
    setEmail("");
  }

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <select value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="viewer">viewer</option>
          <option value="editor">editor</option>
          <option value="admin_tour">admin_tour</option>
        </select>
        <input placeholder="Email (opcional)" value={email} onChange={(e) => setEmail(e.target.value)} />
        <button type="submit">Crear enlace</button>
      </form>
      {error && <p style={{ color: "salmon" }}>{error}</p>}
      <ul>
        {invitations.map((inv) => {
          const link = `${window.location.origin}/invitations/${inv.token}`;
          return (
            <li key={inv.id}>
              [{inv.role}] {inv.usedAt ? "usado" : "pendiente"} — <code>{link}</code>{" "}
              <button onClick={() => navigator.clipboard?.writeText(link)}>copiar</button>{" "}
              <button onClick={() => onRemove(inv.id)}>revocar</button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
