import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client.js";
import RecoveryFrame from "../auth/RecoveryFrame.jsx";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  async function submit(event) {
    event.preventDefault(); setLoading(true); setError("");
    try { await api.post("/api/auth/forgot-password", { email: email.trim() }); setSent(true); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }
  return <RecoveryFrame title={sent ? "Revisa tu correo" : "¿Olvidaste tu contraseña?"}
    description={sent ? "Si existe una cuenta con ese correo, recibirás un enlace para restablecer tu contraseña." : "Te enviaremos un enlace para elegir una nueva contraseña."}>
    {sent ? <div className="stack" role="status">
      <p className="text-soft" style={{ fontSize: 14 }}>El enlace dura 15 minutos. Si no lo encuentras, revisa la carpeta de spam.</p>
      <button className="btn btn-secondary" type="button" onClick={() => setSent(false)}>Usar otro correo</button>
    </div> : <form onSubmit={submit} className="stack" aria-busy={loading}>
      <div className="field">
        <label className="field-label" htmlFor="recovery-email">Correo electrónico</label>
        <input id="recovery-email" className="input" type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" maxLength={254} autoFocus required disabled={loading} />
      </div>
      {error && <p className="error-text" role="alert">{error}</p>}
      <button className="btn btn-primary" type="submit" disabled={loading}>{loading ? "Enviando…" : "Enviar enlace"}</button>
    </form>}
    <Link className="btn btn-ghost" to="/login">Volver a iniciar sesión</Link>
  </RecoveryFrame>;
}
