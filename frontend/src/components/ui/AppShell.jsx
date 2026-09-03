import { Link } from "react-router-dom";
import { useAuth } from "../../auth/useAuth.js";
import { markLoggingOut } from "../../auth/logoutIntent.js";
import { LogoMark, LogOutIcon, ArrowLeftIcon } from "./Icon.jsx";

// Barra superior fija + contenedor de página, compartida por toda la app
// autenticada — le da continuidad visual a algo que antes eran páginas sueltas
// sin ningún elemento en común.
export default function AppShell({ crumbs = [], children, fullBleed = false }) {
  const { user, logout } = useAuth();
  const initial = user?.fullName?.[0]?.toUpperCase() ?? "?";

  function handleLogout() {
    // RequireAuth es quien realmente redirige a /login en cuanto user se vuelve null
    // (no esta función) — así que en vez de navegar nosotros mismos y competir con ese
    // redirect, marcamos que es un logout explícito para que RequireAuth no adjunte
    // el "volver a donde estabas" (ver auth/logoutIntent.js).
    markLoggingOut();
    logout();
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="row" style={{ minWidth: 0 }}>
          <Link to="/tours" className="topbar-brand">
            <LogoMark width={22} height={22} strokeWidth={1.6} />
            Tour Studio
          </Link>
          {crumbs.length > 0 && (
            <nav className="topbar-crumbs" aria-label="Ruta">
              {crumbs.map((c, i) => {
                const isLast = i === crumbs.length - 1;
                return (
                  <span key={i} className="row" style={{ gap: 6, minWidth: 0 }}>
                    <span aria-hidden="true">/</span>
                    {isLast || !c.to ? (
                      <span className="crumb-current">{c.label}</span>
                    ) : (
                      <Link to={c.to} className="text-soft">
                        {c.label}
                      </Link>
                    )}
                  </span>
                );
              })}
            </nav>
          )}
        </div>
        <div className="topbar-right">
          {crumbs.length > 0 && (
            <Link to="/tours" className="btn btn-ghost btn-sm">
              <ArrowLeftIcon width={15} height={15} />
              Tours
            </Link>
          )}
          <div className="topbar-user">
            <div className="avatar">{initial}</div>
            {user?.fullName}
          </div>
          <button className="btn btn-ghost btn-icon" onClick={handleLogout} title="Cerrar sesión" aria-label="Cerrar sesión">
            <LogOutIcon width={17} height={17} />
          </button>
        </div>
      </header>
      <main className="app-main">{fullBleed ? children : <div className="page">{children}</div>}</main>
    </div>
  );
}
