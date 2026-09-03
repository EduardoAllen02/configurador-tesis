import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../auth/useAuth.js";
import { LogoMark } from "../components/ui/Icon.jsx";

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await register(email, password, fullName);
      navigate(location.state?.from?.pathname ?? "/tours", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: "var(--space-6)" }}>
      <div className="card card-pad stack" style={{ width: 380 }}>
        <div className="stack" style={{ alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-2)" }}>
          <LogoMark width={30} height={30} strokeWidth={1.5} />
          <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.01em" }}>Crea tu cuenta</h1>
          <p className="text-soft" style={{ fontSize: 13.5 }}>Empieza a construir tu primer tour</p>
        </div>

        <form onSubmit={handleSubmit} className="stack">
          <div className="field">
            <label className="field-label" htmlFor="reg-name">Nombre completo</label>
            <input id="reg-name" className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} required autoFocus />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="reg-email">Email</label>
            <input id="reg-email" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="reg-password">Contraseña</label>
            <input id="reg-password" className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          {error && <p className="error-text">{error}</p>}
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: "100%", padding: "10px 16px" }}>
            {loading ? "Creando cuenta…" : "Registrarme"}
          </button>
        </form>

        <p className="text-soft" style={{ fontSize: 13.5, textAlign: "center" }}>
          ¿Ya tienes cuenta? <Link to="/login" style={{ color: "var(--text)", fontWeight: 500 }}>Inicia sesión</Link>
        </p>
      </div>
    </div>
  );
}
