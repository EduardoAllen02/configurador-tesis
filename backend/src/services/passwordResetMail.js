// No user-controlled origin/Host header is used to construct recovery links.
function recoveryConfig(env = process.env) {
  const origin = new URL(env.PUBLIC_APP_URL || "");
  if (origin.username || origin.password || origin.search || origin.hash || origin.pathname !== "/" ||
      (origin.protocol !== "https:" && !(env.NODE_ENV !== "production" && origin.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname)))) {
    throw new Error("PUBLIC_APP_URL must be an HTTPS application origin (localhost HTTP allowed outside production)");
  }
  if (!env.RESEND_API_KEY || !env.PASSWORD_RESET_FROM || /[\r\n]/.test(env.PASSWORD_RESET_FROM)) {
    throw new Error("Password recovery mail is not configured");
  }
  const replyTo = env.PASSWORD_RESET_REPLY_TO?.trim();
  if (replyTo && !/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(replyTo)) throw new Error("Invalid recovery reply address");
  return { origin: origin.origin, apiKey: env.RESEND_API_KEY, from: env.PASSWORD_RESET_FROM, replyTo };
}

async function sendResetMail({ email, token, kind }, { env = process.env, fetchImpl = fetch } = {}) {
  const config = recoveryConfig(env);
  // Fragment keeps the bearer secret out of normal web-server access logs and referrers.
  const notice = kind === "password-changed";
  const link = notice ? null : `${config.origin}/reset-password#token=${encodeURIComponent(token)}`;
  const subject = notice ? "Tu contraseña de Tour Studio fue actualizada" : "Restablece tu contraseña de Tour Studio";
  const text = notice
    ? "La contraseña de tu cuenta de Tour Studio acaba de actualizarse. Las sesiones anteriores se cerraron por seguridad.\n\nSi realizaste este cambio, puedes iniciar sesión con tu nueva contraseña. Si no reconoces el cambio, solicita recuperar tu cuenta desde Tour Studio y contacta al administrador.\n\nTour Studio nunca te pedirá que envíes tu contraseña por correo."
    : `Recibimos una solicitud para restablecer tu contraseña de Tour Studio.\n\nAbre este enlace durante los próximos 15 minutos:\n${link}\n\nSi no solicitaste el cambio, ignora este mensaje. Tu contraseña sigue siendo la misma.`;
  const response = await fetchImpl("https://api.resend.com/emails", {
    method: "POST", signal: AbortSignal.timeout(10000),
    headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: config.from, to: [email], subject, text, ...(config.replyTo ? { reply_to: config.replyTo } : {}) }),
  });
  // Do not propagate provider bodies/headers: they may contain addresses or secrets.
  if (!response.ok) throw new Error("Password recovery email delivery failed");
}

module.exports = { recoveryConfig, sendResetMail };
