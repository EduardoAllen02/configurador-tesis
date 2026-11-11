const { test } = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const express = require("express");
const bcrypt = require("bcryptjs");
const { issueResetToken, readResetToken, matchesResetUser, validNewPassword } = require("./passwordResetToken");
const { createLimiter, createPasswordRecovery, GENERIC_MESSAGE } = require("./passwordReset");
const { sendResetMail, recoveryConfig } = require("./passwordResetMail");

const secret = "reset-test-only-distinct-secret-32-bytes";
const authSecret = "auth-test-only-distinct-secret-32-bytes";
const sample = () => ({ id: "fixture-user", email: "Mixed@example.test", passwordHash: "$2a$10$oldhash" });

test("reset tokens are random, expire in 15 minutes, and are scoped to the password version", () => {
  const user = sample();
  const token = issueResetToken(user, secret, authSecret);
  const payload = readResetToken(token, secret, authSecret);
  assert.notEqual(token, issueResetToken(user, secret, authSecret));
  assert.equal(payload.exp - payload.iat, 900);
  assert.equal(matchesResetUser(payload, user, secret), true);
  assert.equal(matchesResetUser(payload, { ...user, passwordHash: "changed" }, secret), false);
  assert.equal(matchesResetUser(payload, null, secret), false);
  assert.throws(() => readResetToken(`${token.slice(0, -1)}!`, secret, authSecret));
  assert.throws(() => issueResetToken(user, authSecret, authSecret));
  assert.throws(() => issueResetToken(user, "short", authSecret));
  for (const changes of [{ purpose: "session" }, { aud: "elsewhere" }, { iat: 1, exp: 901 }]) {
    const bad = jwt.sign({ ...payload, ...changes }, secret, { algorithm: "HS256" });
    assert.throws(() => readResetToken(bad, secret, authSecret));
  }
  const auth = jwt.sign({ id: user.id, purpose: "session" }, authSecret);
  assert.throws(() => readResetToken(auth, secret, authSecret));
});

test("password validation enforces bcrypt's byte boundary without truncation", () => {
  for (const value of [undefined, {}, "short", "a".repeat(73), "😀".repeat(19)]) assert.equal(validNewPassword(value), false);
  for (const value of ["12345678", "a".repeat(72), "😀".repeat(18)]) assert.equal(validNewPassword(value), true);
});

test("limiter enforces independent budgets, expires entries and fails closed at capacity", () => {
  let time = 0;
  const allow = createLimiter({ now: () => time, capacity: 2, windowMs: 100 });
  assert.equal(allow("email", "x", 2), true); assert.equal(allow("email", "x", 2), true);
  assert.equal(allow("email", "x", 2), false); assert.equal(allow("ip", "x", 2), true);
  assert.equal(allow("email", "third", 2), false);
  time = 101; assert.equal(allow("email", "third", 2), true);
});

test("Resend transport uses configured origin and sender, fragment token, timeout and safe provider errors", async () => {
  const env = { NODE_ENV: "production", PUBLIC_APP_URL: "https://tour.example.test", RESEND_API_KEY: "fixture-key", PASSWORD_RESET_FROM: "Tour Studio <accounts@example.test>", PASSWORD_RESET_REPLY_TO: "owner@example.test" };
  let request;
  await sendResetMail({ email: "fixture@example.test", token: "sensitive-token" }, { env, fetchImpl: async (url, options) => { request = { url, options }; return { ok: true }; } });
  assert.equal(request.url, "https://api.resend.com/emails");
  assert.equal(request.options.headers.Authorization, "Bearer fixture-key");
  const body = JSON.parse(request.options.body);
  assert.deepEqual(body.to, ["fixture@example.test"]);
  assert.equal(body.reply_to, "owner@example.test");
  assert.throws(() => recoveryConfig({ ...env, PASSWORD_RESET_REPLY_TO: "owner@example.test\r\nBcc:other@example.test" }));
  assert.equal(body.from, env.PASSWORD_RESET_FROM);
  assert.match(body.text, /https:\/\/tour\.example\.test\/reset-password#token=sensitive-token/);
  assert.ok(request.options.signal);
  await sendResetMail({ email: "fixture@example.test", kind: "password-changed" }, { env, fetchImpl: async (url, options) => { request = { url, options }; return { ok: true }; } });
  const notice = JSON.parse(request.options.body);
  assert.match(notice.subject, /Tour Studio/); assert.match(notice.text, /acaba de actualizarse/);
  assert.equal(notice.text.includes("#token="), false); assert.equal(notice.text.includes("undefined"), false);
  assert.equal(notice.text.includes("http"), false);
  await assert.rejects(sendResetMail({ email: "fixture@example.test", token: "secret" }, { env, fetchImpl: async () => ({ ok: false }) }), /delivery failed/);
  for (const PUBLIC_APP_URL of ["http://tour.example.test", "https://user:password@tour.example.test", "https://tour.example.test/path", "https://tour.example.test/?x=1"]) {
    assert.throws(() => recoveryConfig({ ...env, PUBLIC_APP_URL }));
  }
  assert.equal(recoveryConfig({ ...env, NODE_ENV: "test", PUBLIC_APP_URL: "http://localhost:5173" }).origin, "http://localhost:5173");
});

test("HTTP recovery hides existence/provider failures, changes the password once and rejects concurrent replay", async () => {
  let user = sample(); const sent = []; const notices = []; let failures = 0;
  const db = { user: {
    async findFirst({ where }) { return user && where.email.equals === user.email.toLowerCase() ? { ...user } : null; },
    async findUnique() { return user && { ...user }; },
    async updateMany({ where, data }) {
      if (!user || user.id !== where.id || user.passwordHash !== where.passwordHash) return { count: 0 };
      user.passwordHash = data.passwordHash; return { count: 1 };
    },
  }, async $transaction(callback) { return callback(db); } };
  const recovery = createPasswordRecovery({ prisma: db, secret, authSecret, hashPassword: password => bcrypt.hash(password, 4),
    sendMail: async message => { if (message.kind === "password-changed") notices.push(message); else sent.push(message); }, delay: async () => {}, reportFailure: () => failures++,
  });
  const app = express(); app.use(express.json());
  app.post("/forgot", recovery.forgotPassword); app.post("/reset", recovery.resetPassword);
  const server = app.listen(0, "127.0.0.1");
  await new Promise(resolve => server.once("listening", resolve));
  const url = `http://127.0.0.1:${server.address().port}`;
  const post = async (route, body) => { const response = await fetch(url + route, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); return { status: response.status, body: await response.json(), cache: response.headers.get("cache-control") }; };
  try {
    const known = await post("/forgot", { email: " MIXED@example.test " });
    const absent = await post("/forgot", { email: "absent@example.test" });
    const malformed = await post("/forgot", { email: {} });
    assert.deepEqual(known, absent); assert.deepEqual(known, malformed);
    assert.deepEqual(known, { status: 200, body: { message: GENERIC_MESSAGE }, cache: "no-store" });
    await recovery.whenIdle(); assert.equal(sent.length, 1);
    const token = sent[0].token;
    assert.equal((await post("/reset", { token, password: "weak" })).status, 400);
    const race = await Promise.all([post("/reset", { token, password: "New-password-1" }), post("/reset", { token, password: "New-password-1" })]);
    assert.deepEqual(race.map(result => result.status).sort(), [200, 400]);
    await recovery.whenIdle();
    assert.deepEqual(notices, [{ email: user.email, kind: "password-changed" }]);
    assert.ok(await bcrypt.compare("New-password-1", user.passwordHash));
    assert.equal((await post("/reset", { token, password: "New-password-2" })).status, 400);
    await recovery.whenIdle(); assert.equal(notices.length, 1);
    assert.equal((await post("/reset", { token: "broken", password: "New-password-2" })).status, 400);
    assert.equal("token" in race.find(result => result.status === 200).body, false);
    for (let i = 0; i < 4; i++) await post("/forgot", { email: user.email });
    await recovery.whenIdle(); assert.equal(sent.length, 3);
    assert.equal(failures, 0);
  } finally { await new Promise(resolve => server.close(resolve)); }
});

test("notification transport failure leaves a successful password change and never starts a session", async () => {
  let user = sample(); let notifications = 0; let failures = 0;
  const db = { user: {
    findUnique: async () => ({ ...user }),
    updateMany: async ({ where, data }) => {
      if (user.passwordHash !== where.passwordHash) return { count: 0 };
      user.passwordHash = data.passwordHash; return { count: 1 };
    },
  }, async $transaction(callback) { return callback(db); } };
  const recovery = createPasswordRecovery({ prisma: db, secret, authSecret, hashPassword: async () => "changed-hash",
    sendMail: async message => { assert.deepEqual(message, { email: user.email, kind: "password-changed" }); notifications++; throw new Error("provider private detail"); },
    reportFailure: () => failures++,
  });
  const token = issueResetToken(user, secret, authSecret);
  let status = 200; let body; let unexpectedError;
  const res = { set() {}, status(value) { status = value; return this; }, json(value) { body = value; } };
  await recovery.resetPassword({ body: { token, password: "New-password-1" }, ip: "test" }, res, error => { unexpectedError = error; });
  await recovery.whenIdle();
  assert.equal(status, 200); assert.equal(user.passwordHash, "changed-hash");
  assert.equal(unexpectedError, undefined); assert.equal("token" in body, false);
  assert.equal(notifications, 1); assert.equal(failures, 1);
  await recovery.resetPassword({ body: { token, password: "New-password-2" }, ip: "test" }, res, error => { unexpectedError = error; });
  await recovery.whenIdle(); assert.equal(status, 400); assert.equal(notifications, 1);
});

test("provider and database errors stay private on forgot-password", async () => {
  let failures = 0;
  for (const databaseFails of [true, false]) {
    const recovery = createPasswordRecovery({ prisma: { user: { findFirst: async () => {
      if (databaseFails) throw new Error("private database detail"); return sample();
    } } }, secret, authSecret, sendMail: async () => { throw new Error("private provider detail"); },
    delay: async () => {}, reportFailure: () => failures++,
    });
    let body;
    const res = { set() {}, json(value) { body = value; } };
    await recovery.forgotPassword({ body: { email: "fixture@example.test" }, ip: "test" }, res);
    await recovery.whenIdle();
    assert.deepEqual(body, { message: GENERIC_MESSAGE });
  }
  assert.equal(failures, 2);
});

test("sessions require a password version and reject reset tokens, legacy tokens, changed hashes and deleted users", async () => {
  let user = sample();
  const envPath = require.resolve("../config/env");
  const dbPath = require.resolve("../config/prisma");
  const oldEnv = require.cache[envPath]; const oldDb = require.cache[dbPath];
  require.cache[envPath] = { id: envPath, filename: envPath, loaded: true, exports: { jwtSecret: authSecret, jwtExpiresIn: "7d" } };
  require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: { user: { findUnique: async () => user } } };
  try {
    const { signToken } = require("./auth.service");
    const { requireAuth } = require("../middleware/auth");
    const check = async token => {
      let status = 200; let nextCalled = false;
      const res = { status(value) { status = value; return this; }, json() {} };
      await requireAuth({ headers: { authorization: `Bearer ${token}` } }, res, () => { nextCalled = true; });
      return { status, nextCalled };
    };
    const token = signToken(user);
    assert.deepEqual(await check(token), { status: 200, nextCalled: true });
    assert.equal((await check(jwt.sign({ id: user.id, email: user.email }, authSecret))).status, 401);
    assert.equal((await check(issueResetToken(user, secret, authSecret))).status, 401);
    user = { ...user, passwordHash: "new-password-hash" };
    assert.equal((await check(token)).status, 401);
    assert.equal((await check(signToken(user))).status, 200);
    user = null; assert.equal((await check(token)).status, 401);
  } finally {
    if (oldEnv) require.cache[envPath] = oldEnv; else delete require.cache[envPath];
    if (oldDb) require.cache[dbPath] = oldDb; else delete require.cache[dbPath];
  }
});
