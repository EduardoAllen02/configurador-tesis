const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const { templateDesign, mapAssetReferences, assetFile } = require("./designTemplate");

test("shared snapshots omit tour content/settings and clear scene-specific bindings recursively", () => {
  const source = { version: 1, contextMenu: { enabled: true, credit: { name: "Owner" } }, nadir: { mode: "limit" }, panoramas: { mode: "tiles" }, screens: { tour: { elements: [{ id: "a", showIn: ["old-scene"], segments: [1, 2], children: [{ props: { action: { type: "goToScene", target: "old-scene" } } }] }] } }, panels: [{ id: "p", elements: [] }] };
  const copy = templateDesign(source);
  assert.equal(copy.nadir, undefined);
  assert.equal(copy.panoramas, undefined);
  assert.equal(copy.contextMenu, undefined);
  assert.equal(copy.screens.tour.elements[0].showIn, "all");
  assert.equal(copy.screens.tour.elements[0].segments, undefined);
  assert.deepEqual(copy.screens.tour.elements[0].children[0].props.action, { type: "none", target: null });
  assert.equal(source.screens.tour.elements[0].showIn[0], "old-scene");
  assert.equal(copy.panels[0].id, "p");
});

test("all nested asset references are rewritten without changing text or source data", () => {
  const source = { brand: { logo: "asset:a" }, children: [{ props: { asset: "asset:b", text: "Usa asset:a" } }] };
  const result = mapAssetReferences(source, (id) => `copy-${id}`);
  assert.equal(result.brand.logo, "asset:copy-a");
  assert.equal(result.children[0].props.asset, "asset:copy-b");
  assert.equal(result.children[0].props.text, "Usa asset:a");
  assert.equal(source.brand.logo, "asset:a");
});

test("template file copies cannot escape the configured uploads folder", () => {
  assert.equal(assetFile("uploads", "/uploads/templates/id/a.webp"), path.resolve("uploads/templates/id/a.webp"));
  for (const value of ["/uploads/../../private.txt", "/uploads/..\\private.txt", "https://example.com/file", "/exports/a"]) assert.throws(() => assetFile("uploads", value));
});
