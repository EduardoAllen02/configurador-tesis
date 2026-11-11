import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../auth/useAuth.js";
import { LogoMark } from "../components/ui/Icon.jsx";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
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
          <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.01em" }}>Bienvenido de vuelta</h1>
          <p className="text-soft" style={{ fontSize: 14 }}>Entra a tu cuenta de Tour Studio</p>
        </div>

        <form onSubmit={handleSubmit} className="stack">
          <div className="field">
            <label className="field-label" htmlFor="login-email">Email</label>
            <input id="login-email" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="login-password">Contraseña</label>
            <input id="login-password" className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <Link to="/forgot-password" style={{ fontSize: 13, alignSelf: "flex-end" }}>¿Olvidaste tu contraseña?</Link>
          </div>
          {error && <p className="error-text">{error}</p>}
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: "100%", padding: "10px 16px" }}>
            {loading ? "Entrando…" : "Entrar"}
          </button>
        </form>

        <p className="text-soft" style={{ fontSize: 14, textAlign: "center" }}>
          ¿No tienes cuenta? <Link to="/register" style={{ color: "var(--text)", fontWeight: 500 }}>Regístrate</Link>
        </p>
      </div>
    </div>
  );
}
