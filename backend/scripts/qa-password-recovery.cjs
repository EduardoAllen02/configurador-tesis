// Isolated real-PostgreSQL/HTTP smoke. No migrations, seeds, existing users or real mail.
const fs = require("node:fs");
const crypto = require("node:crypto");
const assert = require("node:assert/strict");

async function main() {
  const configPath = process.argv[2];
  if (!configPath) throw new Error("Pass the private dev-env JSON path (clone database only)");
  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  const database = new URL(config.DATABASE_URL);
  if (database.pathname !== "/tour_studio_wave4_20261026" || !["localhost", "127.0.0.1"].includes(database.hostname)) {
    throw new Error("QA refuses any database except the local tour_studio_wave4_20261026 clone");
  }
  Object.assign(process.env, config, { NODE_ENV: "test", PASSWORD_RESET_SECRET: crypto.randomBytes(48).toString("base64url") });
  const sent = [];
  // Replace only the mail transport before the real controller is loaded.
  require("../src/services/passwordResetMail").sendResetMail = async message => { sent.push(message); };
  const prisma = require("../src/config/prisma");
  const { hashPassword } = require("../src/services/auth.service");
  const app = require("../src/app");
  const email = `qa-password-${crypto.randomUUID()}@example.invalid`;
  const oldPassword = `Old-${crypto.randomBytes(12).toString("hex")}`;
  const newPassword = `New-${crypto.randomBytes(12).toString("hex")}`;
  let fixture; let server;
  try {
    fixture = await prisma.user.create({ data: { email, fullName: "Disposable password recovery QA", passwordHash: await hashPassword(oldPassword) } });
    server = app.listen(0, "127.0.0.1");
    await new Promise(resolve => server.once("listening", resolve));
    const base = `http://127.0.0.1:${server.address().port}/api/auth`;
    const request = async (route, body, token) => {
      const response = await fetch(base + route, { method: body ? "POST" : "GET", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
      return { status: response.status, body: await response.json() };
    };
    const originalLogin = await request("/login", { email, password: oldPassword }); assert.equal(originalLogin.status, 200);
    assert.equal((await request("/me", null, originalLogin.body.token)).status, 200);
    const known = await request("/forgot-password", { email });
    const missing = await request("/forgot-password", { email: `absent-${crypto.randomUUID()}@example.invalid` });
    assert.deepEqual(known, missing);
    for (let i = 0; !sent.length && i < 80; i++) await new Promise(resolve => setTimeout(resolve, 25));
    assert.equal(sent.length, 1);
    assert.equal((await request("/reset-password", { token: sent[0].token, password: "tiny" })).status, 400);
    const results = await Promise.all([request("/reset-password", { token: sent[0].token, password: newPassword }), request("/reset-password", { token: sent[0].token, password: newPassword })]);
    assert.deepEqual(results.map(result => result.status).sort(), [200, 400]);
    assert.equal("token" in results.find(result => result.status === 200).body, false);
    assert.equal((await request("/reset-password", { token: sent[0].token, password: newPassword })).status, 400);
    assert.equal((await request("/login", { email, password: oldPassword })).status, 401);
    assert.equal((await request("/me", null, originalLogin.body.token)).status, 401);
    const freshLogin = await request("/login", { email, password: newPassword }); assert.equal(freshLogin.status, 200);
    assert.equal((await request("/me", null, freshLogin.body.token)).status, 200);
    assert.equal((await request("/me", null, sent[0].token)).status, 401);
    console.log("PASS recovery HTTP + PostgreSQL clone: generic responses, concurrent single use, password change, old sessions revoked, no automatic login; fake mail only");
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    try { if (fixture) await prisma.user.delete({ where: { id: fixture.id } }); }
    finally { await prisma.$disconnect(); }
  }
}

main().catch(() => { console.error("FAIL password recovery QA (private details suppressed)"); process.exitCode = 1; });
