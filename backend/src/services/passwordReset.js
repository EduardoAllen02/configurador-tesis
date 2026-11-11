const crypto = require("node:crypto");
const { issueResetToken, readResetToken, matchesResetUser, validNewPassword } = require("./passwordResetToken");

const GENERIC_MESSAGE = "Si existe una cuenta con ese correo, recibirás un enlace para restablecer tu contraseña.";
const INVALID_MESSAGE = "El enlace no es válido o ha expirado. Solicita uno nuevo.";

// Bounded, process-local limits. Hash keys so raw email/IP addresses are not retained.
function createLimiter({ now = Date.now, capacity = 10000, windowMs = 15 * 60 * 1000 } = {}) {
  const entries = new Map();
  const keySecret = crypto.randomBytes(32);
  return (kind, value, limit) => {
    const time = now();
    for (const [key, entry] of entries) if (entry.until <= time) entries.delete(key);
    const key = crypto.createHmac("sha256", keySecret).update(`${kind}:${value}`).digest("hex");
    let entry = entries.get(key);
    if (!entry) {
      if (entries.size >= capacity) return false;
      entry = { count: 0, until: time + windowMs }; entries.set(key, entry);
    }
    return ++entry.count <= limit;
  };
}

function normalizeEmail(value) {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

function createPasswordRecovery({ prisma, hashPassword, sendMail, secret, authSecret,
  limiter = createLimiter(), delay = ms => new Promise(resolve => setTimeout(resolve, ms)),
  reportFailure = () => console.warn("Password recovery delivery unavailable"),
} = {}) {
  const queue = [];
  let active = 0;
  const idleWaiters = [];
  async function deliver({ email, kind }) {
    if (kind === "password-changed") return sendMail({ email, kind });
    const user = await prisma.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } } });
    if (user) await sendMail({ email: user.email, token: issueResetToken(user, secret, authSecret) });
  }
  function drain() {
    while (active < 2 && queue.length) {
      const job = queue.shift(); active++;
      // Response timing is independent of account existence and provider latency.
      Promise.resolve().then(() => deliver(job)).catch(() => reportFailure()).finally(() => {
        active--; drain();
        if (!active && !queue.length) idleWaiters.splice(0).forEach(resolve => resolve());
      });
    }
  }
  async function forgotPassword(req, res) {
    res.set("Cache-Control", "no-store");
    const email = normalizeEmail(req.body?.email);
    const ipAllowed = limiter("forgot-ip", req.ip || req.socket?.remoteAddress || "unknown", 10);
    const emailAllowed = ipAllowed && email && limiter("forgot-email", email, 3);
    if (email && ipAllowed && emailAllowed && queue.length < 100) { queue.push({ email, kind: "reset" }); drain(); }
    await delay(300 + crypto.randomInt(151));
    return res.json({ message: GENERIC_MESSAGE });
  }
  async function resetPassword(req, res, next) {
    res.set("Cache-Control", "no-store");
    if (!limiter("reset-ip", req.ip || req.socket?.remoteAddress || "unknown", 20)) {
      return res.status(429).json({ error: "Demasiados intentos. Inténtalo de nuevo más tarde." });
    }
    const { token, password } = req.body || {};
    if (!validNewPassword(password)) return res.status(400).json({ error: "Usa al menos 8 caracteres y un máximo de 72 bytes para la contraseña." });
    let payload;
    try { payload = readResetToken(token, secret, authSecret); }
    catch { return res.status(400).json({ error: INVALID_MESSAGE }); }
    try {
      const user = await prisma.user.findUnique({ where: { id: payload.sub } });
      if (!matchesResetUser(payload, user, secret)) return res.status(400).json({ error: INVALID_MESSAGE });
      const passwordHash = await hashPassword(password);
      // Compare-and-swap makes concurrent submissions single-use without a schema change.
      const changed = await prisma.$transaction(tx => tx.user.updateMany({
        where: { id: user.id, passwordHash: user.passwordHash }, data: { passwordHash },
      }));
      if (changed.count !== 1) return res.status(400).json({ error: INVALID_MESSAGE });
      // Only the successful compare-and-swap sends a notice. Delivery is best effort:
      // provider failure or a full queue must never undo the new password or fail HTTP.
      if (queue.length < 100) { queue.push({ email: user.email, kind: "password-changed" }); drain(); }
      else reportFailure();
      return res.json({ message: "Contraseña actualizada. Inicia sesión con tu nueva contraseña." });
    } catch (error) { return next(error); }
  }
  return { forgotPassword, resetPassword, whenIdle: () => !active && !queue.length ? Promise.resolve() : new Promise(resolve => idleWaiters.push(resolve)) };
}

module.exports = { createPasswordRecovery, createLimiter, normalizeEmail, GENERIC_MESSAGE, INVALID_MESSAGE };
