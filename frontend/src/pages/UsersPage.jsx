import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../auth/useAuth.js";
import AppShell from "../components/ui/AppShell.jsx";
import { PlusIcon, XIcon } from "../components/ui/Icon.jsx";

const ROLES = [
  ["super_admin", "Superadministrador"],
  ["admin", "Administrador"],
  ["member", "Miembro"],
];

// Cuentas del sistema, su rol global y los tours a los que tienen acceso. Solo el
// superadministrador entra aquí; el servidor repite la verificación en cada petición.
export default function UsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState(null);
  const [tours, setTours] = useState([]);
  const [error, setError] = useState(null);
  const isSuper = user?.globalRole === "super_admin";

  async function load() {
    try {
      const [nextUsers, nextTours] = await Promise.all([api.get("/api/users"), api.get("/api/tours")]);
      setUsers(nextUsers);
      setTours(nextTours);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    if (isSuper) load();
  }, [isSuper]);

  async function run(action) {
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(err.message);
    }
    await load();
  }

  if (!isSuper) return <Navigate to="/tours" replace />;

  return (
    <AppShell crumbs={[{ label: "Usuarios" }]}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Usuarios</h1>
          <p className="page-subtitle">Cuentas del sistema, su rol global y los tours a los que tienen acceso.</p>
        </div>
      </div>

      {error && <p className="error-text">{error}</p>}
      {!users && !error && <p className="text-soft">Cargando…</p>}

      {users && (
        <div className="stack" style={{ gap: "var(--space-2)" }}>
          {users.map((u) => (
            <UserRow
              key={u.id}
              item={u}
              tours={tours}
              isSelf={u.id === user.id}
              onRole={(globalRole) => run(() => api.patch(`/api/users/${u.id}/role`, { globalRole }))}
              onAssign={(tourId) => run(() => api.post(`/api/tours/${tourId}/permissions`, { userId: u.id, role: "cliente" }))}
              onRevoke={(tour) => run(() => api.delete(`/api/tours/${tour.id}/permissions/${tour.permissionId}`))}
            />
          ))}
        </div>
      )}
    </AppShell>
  );
}

function UserRow({ item, tours, isSelf, onRole, onAssign, onRevoke }) {
  const [tourId, setTourId] = useState("");
  const hasGlobalAccess = item.globalRole !== "member";
  const assigned = new Set(item.tours.map((t) => t.id));
  const available = tours.filter((t) => !assigned.has(t.id));

  return (
    <div className="card card-pad stack" style={{ gap: "var(--space-2)" }}>
      <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
        <div className="row" style={{ minWidth: 0 }}>
          <div className="avatar">{item.fullName?.[0]?.toUpperCase() ?? "?"}</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 600 }}>
              {item.fullName}
              {isSelf ? " (tú)" : ""}
            </div>
            <div className="text-soft" style={{ fontSize: 14 }}>{item.email}</div>
          </div>
        </div>
        <select
          className="select"
          style={{ maxWidth: 210 }}
          aria-label={`Rol de ${item.fullName}`}
          value={item.globalRole}
          disabled={isSelf}
          title={isSelf ? "No puedes cambiar tu propio rol" : undefined}
          onChange={(e) => onRole(e.target.value)}
        >
          {ROLES.map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {hasGlobalAccess ? (
        <p className="text-soft" style={{ fontSize: 14 }}>Acceso a todos los tours por su rol.</p>
      ) : (
        <div className="row" style={{ flexWrap: "wrap", gap: "var(--space-2)" }}>
          {item.tours.length === 0 && <span className="text-soft" style={{ fontSize: 14 }}>Sin tours asignados.</span>}
          {item.tours.map((t) => (
            <span key={t.id} className="badge" style={{ gap: 6 }}>
              {t.title}
              <button
                type="button"
                className="btn btn-ghost btn-icon"
                style={{ width: 18, height: 18 }}
                title={`Quitar acceso a ${t.title}`}
                aria-label={`Quitar acceso a ${t.title}`}
                onClick={() => onRevoke(t)}
              >
                <XIcon width={12} height={12} />
              </button>
            </span>
          ))}
          {available.length > 0 && (
            <form
              className="row"
              style={{ gap: 6, marginLeft: "auto" }}
              onSubmit={(e) => {
                e.preventDefault();
                if (!tourId) return;
                onAssign(tourId);
                setTourId("");
              }}
            >
              <select
                className="select"
                style={{ maxWidth: 240 }}
                aria-label={`Tour para ${item.fullName}`}
                value={tourId}
                onChange={(e) => setTourId(e.target.value)}
              >
                <option value="">Elegir tour…</option>
                {available.map((t) => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
              <button type="submit" className="btn btn-secondary btn-sm" disabled={!tourId}>
                <PlusIcon width={14} height={14} />
                Asignar
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
