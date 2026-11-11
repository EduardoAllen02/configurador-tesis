import { useCallback, useEffect, useState } from "react";
import { api } from "../../api/client";
import { PlusIcon, TrashIcon } from "../../components/ui/Icon.jsx";

// Quién entra a este tour con permiso propio. Los administradores no aparecen: su rol
// global ya les da acceso a todos los tours.
export default function TourAccessPanel({ tourId }) {
  const [permissions, setPermissions] = useState(null);
  const [users, setUsers] = useState([]);
  const [userId, setUserId] = useState("");
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      const [nextPermissions, nextUsers] = await Promise.all([
        api.get(`/api/tours/${tourId}/permissions`),
        api.get("/api/users"),
      ]);
      setPermissions(nextPermissions);
      setUsers(nextUsers);
    } catch (err) {
      setError(err.message);
    }
  }, [tourId]);

  useEffect(() => {
    load();
  }, [load]);

  async function run(action) {
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(err.message);
    }
    await load();
  }

  const withAccess = new Set((permissions ?? []).map((p) => p.user.id));
  const candidates = users.filter((u) => u.globalRole === "member" && !withAccess.has(u.id));

  return (
    <div className="card card-pad stack">
      <form
        className="form-row"
        onSubmit={(e) => {
          e.preventDefault();
          if (!userId) return;
          const id = userId;
          setUserId("");
          run(() => api.post(`/api/tours/${tourId}/permissions`, { userId: id, role: "cliente" }));
        }}
      >
        <div className="field">
          <label className="field-label">Usuario</label>
          <select className="select" value={userId} onChange={(e) => setUserId(e.target.value)}>
            <option value="">Elegir usuario…</option>
            {candidates.map((u) => (
              <option key={u.id} value={u.id}>{u.fullName} ({u.email})</option>
            ))}
          </select>
        </div>
        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={!userId}>
            <PlusIcon width={16} height={16} />
            Dar acceso
          </button>
        </div>
      </form>

      {error && <p className="error-text">{error}</p>}

      {permissions?.length === 0 && (
        <p className="text-soft" style={{ fontSize: 14 }}>Ningún cliente asignado todavía.</p>
      )}

      {permissions?.length > 0 && (
        <div className="stack" style={{ gap: "var(--space-2)", marginTop: "var(--space-2)" }}>
          {permissions.map((p) => (
            <div key={p.id} className="card row" style={{ padding: "10px 14px" }}>
              <div className="avatar">{p.user.fullName?.[0]?.toUpperCase() ?? "?"}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600 }}>{p.user.fullName}</div>
                <div className="text-soft" style={{ fontSize: 14 }}>{p.user.email}</div>
              </div>
              <span className="badge">Cliente</span>
              <button
                type="button"
                className="btn btn-ghost btn-icon"
                style={{ width: 28, height: 28 }}
                title="Quitar acceso"
                aria-label={`Quitar acceso a ${p.user.fullName}`}
                onClick={() => run(() => api.delete(`/api/tours/${tourId}/permissions/${p.id}`))}
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
