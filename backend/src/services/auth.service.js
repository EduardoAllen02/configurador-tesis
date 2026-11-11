const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("node:crypto");
const { jwtSecret, jwtExpiresIn } = require("../config/env");

const SALT_ROUNDS = 10;

function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

function comparePassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash);
}

function passwordVersion(user) {
  return crypto.createHmac("sha256", jwtSecret).update(`session:v1:${user.id}:${user.passwordHash}`).digest("base64url");
}

function signToken(user) {
  return jwt.sign({ id: user.id, email: user.email, purpose: "session", pwdv: passwordVersion(user) }, jwtSecret, { algorithm: "HS256", expiresIn: jwtExpiresIn });
}

module.exports = { hashPassword, comparePassword, signToken, passwordVersion };
