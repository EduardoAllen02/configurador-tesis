const { test } = require("node:test");
const assert = require("node:assert/strict");
const { validateDesign, deriveDesignFromLegacy } = require("./design");

test("guarda temas, paneles y enlaces sin perder campos de los elementos", () => {
  const design = { version: 1, theme: { id: "minimal-light", tokens: { surface: "#fff" }, styles: {} },
    panels: [{ id: "product", elements: [{ id: "title", template: "text", bind: "title", showIn: ["scene"] }] }],
    panelDefaults: { info: "product" }, screens: { tour: { elements: [] } } };
  assert.deepEqual(validateDesign(design), { ok: true, design });
});

test("el menú es opcional por tour y conserva acciones, orden y crédito", () => {
  assert.deepEqual(deriveDesignFromLegacy({}).contextMenu, { enabled: false });
  const design = { version: 1, contextMenu: { enabled: true, items: [
    { id: "site", type: "link", label: "Nuestro sitio", url: "https://example.com/" },
    { id: "fs", type: "fullscreen" }, { id: "reset", type: "reset-view", label: "Volver" },
  ], credit: { enabled: true, name: "Organización", url: "https://example.com/" } } };
  assert.deepEqual(validateDesign(design), { ok: true, design });
  assert.equal(validateDesign({ version: 1, contextMenu: { enabled: false } }).ok, true);
});
test("rechaza menús excesivos, acciones desconocidas, ids duplicados y enlaces ejecutables", () => {
  const check = contextMenu => validateDesign({ version: 1, contextMenu }).ok;
  const item = { id: "a", type: "link", url: "https://example.com" };
  assert.equal(check({ enabled: true, items: Array.from({ length: 9 }, (_, id) => ({ ...item, id: String(id) })) }), false);
  assert.equal(check({ enabled: true, items: [item, item] }), false);
  assert.equal(check({ enabled: true, items: [{ ...item, type: "execute" }] }), false);
  assert.equal(check({ enabled: true, items: [{ ...item, url: "javascript:alert(1)" }] }), false);
  assert.equal(check({ enabled: true, credit: { enabled: true, name: "Org", url: "data:text/html,x" } }), false);
  assert.equal(check({ enabled: true, items: [{ ...item, url: "" }] }), true);
});
test("los diseños anteriores siguen guardándose", () => {
  assert.equal(validateDesign({ version: 1, brand: {}, detailPanel: {} }).ok, true);
});
test("rechaza paneles con forma incorrecta y limita el documento", () => {
  assert.equal(validateDesign({ version: 1, panels: {} }).ok, false);
  assert.equal(validateDesign({ version: 1, panels: Array.from({ length: 101 }, () => ({})) }).ok, false);
  assert.equal(validateDesign({ version: 1, theme: { oversized: "x".repeat(512 * 1024) } }).ok, false);
});
