const crypto = require("node:crypto");
const jwt = require("jsonwebtoken");

const PURPOSE = "password-reset";
const AUDIENCE = "tour-studio:password-reset";
const LIFETIME_SECONDS = 15 * 60;

function assertSecret(secret, authSecret) {
  if (typeof secret !== "string" || Buffer.byteLength(secret) < 32 || secret === authSecret) {
    throw new Error("PASSWORD_RESET_SECRET must be at least 32 bytes and different from JWT_SECRET");
  }
}

function fingerprint(user, secret) {
  return crypto.createHmac("sha256", secret).update(`password-reset:v1:${user.id}:${user.passwordHash}`).digest("base64url");
}

function issueResetToken(user, secret, authSecret) {
  assertSecret(secret, authSecret);
  return jwt.sign({ purpose: PURPOSE, version: fingerprint(user, secret) }, secret, {
    algorithm: "HS256", audience: AUDIENCE, subject: user.id,
    jwtid: crypto.randomBytes(32).toString("base64url"), expiresIn: LIFETIME_SECONDS,
  });
}

function readResetToken(token, secret, authSecret) {
  assertSecret(secret, authSecret);
  if (typeof token !== "string" || token.length > 2048) throw new Error("Invalid reset token");
  const payload = jwt.verify(token, secret, { algorithms: ["HS256"], audience: AUDIENCE });
  if (payload.purpose !== PURPOSE || typeof payload.sub !== "string" || !payload.sub ||
      typeof payload.version !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(payload.version) ||
      typeof payload.jti !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(payload.jti) ||
      !Number.isInteger(payload.iat) || !Number.isInteger(payload.exp) ||
      payload.exp - payload.iat !== LIFETIME_SECONDS) throw new Error("Invalid reset token");
  return payload;
}

function matchesResetUser(payload, user, secret) {
  if (!user || payload.sub !== user.id) return false;
  const actual = Buffer.from(fingerprint(user, secret));
  const expected = Buffer.from(payload.version);
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

function validNewPassword(password) {
  return typeof password === "string" && [...password].length >= 8 && Buffer.byteLength(password, "utf8") <= 72;
}

module.exports = { issueResetToken, readResetToken, matchesResetUser, validNewPassword, LIFETIME_SECONDS };
