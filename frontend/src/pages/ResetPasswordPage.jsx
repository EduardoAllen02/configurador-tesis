import { useLayoutEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client.js";
import { useAuth } from "../auth/useAuth.js";
import RecoveryFrame from "../auth/RecoveryFrame.jsx";
import { removeResetFragment, resetPasswordError, resetTokenFromFragment } from "../auth/passwordRecovery.js";

export default function ResetPasswordPage() {
  const { logout } = useAuth();
  const [token, setToken] = useState(() => resetTokenFromFragment(window.location.hash));
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  useLayoutEffect(() => {
    const acceptNewLink = () => {
      if (!window.location.hash) return;
      setToken(resetTokenFromFragment(window.location.hash));
      setPassword(""); setConfirmation(""); setError(""); setDone(false);
      removeResetFragment(window.location, window.history);
    };
    removeResetFragment(window.location, window.history);
    window.addEventListener("hashchange", acceptNewLink);
    return () => window.removeEventListener("hashchange", acceptNewLink);
  }, []);
  async function submit(event) {
    event.preventDefault();
    const validation = resetPasswordError(password, confirmation);
    if (validation) { setError(validation); return; }
    setLoading(true); setError("");
    try {
      await api.post("/api/auth/reset-password", { token, password });
      setToken(""); setPassword(""); setConfirmation(""); setDone(true); logout();
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }
  return <RecoveryFrame title={done ? "Contraseña actualizada" : "Elige tu nueva contraseña"}
    description={done ? "Tu nueva contraseña ya está lista. Inicia sesión para continuar." : "Usa al menos 8 caracteres y una contraseña que no uses en otro sitio."}>
    {done ? <Link className="btn btn-primary" to="/login">Iniciar sesión</Link> : !token ? <div className="stack">
      <p className="error-text" role="alert">Este enlace no es válido. Abre de nuevo el enlace de tu correo o solicita uno nuevo.</p>
      <Link className="btn btn-primary" to="/forgot-password">Solicitar otro enlace</Link>
      <Link className="btn btn-ghost" to="/login">Volver a iniciar sesión</Link>
    </div> : <form className="stack" onSubmit={submit} aria-busy={loading}>
      <div className="field">
        <label className="field-label" htmlFor="new-password">Nueva contraseña</label>
        <input className="input" id="new-password" type="password" autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} autoFocus required disabled={loading} aria-describedby="password-hint" />
        <p id="password-hint" className="text-faint" style={{ fontSize: 12 }}>Mínimo 8 caracteres.</p>
      </div>
      <div className="field">
        <label className="field-label" htmlFor="confirm-password">Confirma la contraseña</label>
        <input className="input" id="confirm-password" type="password" autoComplete="new-password" value={confirmation} onChange={event => setConfirmation(event.target.value)} required disabled={loading} />
      </div>
      {error && <p className="error-text" role="alert">{error} <Link to="/forgot-password">Solicitar otro enlace</Link></p>}
      <button className="btn btn-primary" type="submit" disabled={loading}>{loading ? "Actualizando…" : "Cambiar contraseña"}</button>
    </form>}
  </RecoveryFrame>;
}
