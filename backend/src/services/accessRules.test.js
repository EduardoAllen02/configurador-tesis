const test = require("node:test");
const assert = require("node:assert/strict");
const { removesLastSuperAdmin, isValidTourRole } = require("./accessRules");

test("the last superadmin cannot lose the role", () => {
  assert.equal(removesLastSuperAdmin("super_admin", "admin", 1), true);
  assert.equal(removesLastSuperAdmin("super_admin", "member", 1), true);
});

test("role changes that keep a superadmin are allowed", () => {
  assert.equal(removesLastSuperAdmin("super_admin", "admin", 2), false);
  assert.equal(removesLastSuperAdmin("super_admin", "super_admin", 1), false);
  assert.equal(removesLastSuperAdmin("member", "admin", 1), false);
});

test("cliente is the only tour role", () => {
  assert.equal(isValidTourRole("cliente"), true);
  assert.equal(isValidTourRole("dev"), false);
  assert.equal(isValidTourRole(undefined), false);
});
