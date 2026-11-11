const { test } = require("node:test");
const assert = require("node:assert/strict");
const { validateHotspotDetail, copiedDetail } = require("./hotspotDetail");
const detail = () => ({ version: 1, enabled: true, placement: "inline", reveal: "always", elements: [{ id: "g", template: "group", children: [{ id: "t", template: "text", bind: "title" }] }] });

test("acepta detalle integrado y conserva documentos anteriores sin detalle", () => {
  assert.equal(validateHotspotDetail(undefined), null);
  assert.equal(validateHotspotDetail(detail()), null);
  const disabled = { ...detail(), enabled: false, placement: "screen", reveal: "click" };
  assert.equal(validateHotspotDetail(disabled), null);
});
test("rechaza comportamiento, enlaces, profundidad y tamaño inválidos", () => {
  assert.ok(validateHotspotDetail({ ...detail(), reveal: "sometimes" }));
  assert.ok(validateHotspotDetail({ ...detail(), enabled: "yes" }));
  const bad = detail(); bad.elements[0].children[0].bind = "password";
  assert.ok(validateHotspotDetail(bad));
  const huge = detail(); huge.padding = "x".repeat(300000);
  assert.ok(validateHotspotDetail(huge));
  const deep = detail(); deep.elements[0].children[0].children = [{ id: "x", template: "group", children: [{ id: "y", template: "text" }] }];
  assert.ok(validateHotspotDetail(deep));
});
test("copiar al resto renueva ids y no comparte estructuras mutables", () => {
  const source = detail(), a = copiedDetail(source), b = copiedDetail(source);
  assert.notEqual(a.elements[0].id, source.elements[0].id);
  assert.notEqual(a.elements[0].children[0].id, b.elements[0].children[0].id);
  a.elements[0].children[0].bind = "description";
  assert.equal(source.elements[0].children[0].bind, "title");
});

test("copiar un detalle esquinado antiguo lo convierte a apertura bajo demanda", () => {
  const source = { ...detail(), placement: "screen", reveal: "always" };
  assert.equal(copiedDetail(source).reveal, "click");
  assert.equal(source.reveal, "always");
});
