import { it, expect } from "vitest";
import { applySharedTemplate } from "./sharedTemplates.js";

it("replaces reusable interface sections while retaining tour-specific settings", () => {
  const target = { version: 1, contextMenu: { enabled: true, credit: { name: "Tour owner" } }, nadir: { mode: "limit" }, languages: { list: ["es"] }, panoramas: { mode: "tiles" }, panels: [{ id: "old" }], panelDefaults: { info: "old" }, screens: { tour: { elements: [] } } };
  const snapshot = { contextMenu: { enabled: false }, screens: { tour: { elements: [{ id: "new" }] } }, brand: { colors: ["#fff"] } };
  const result = applySharedTemplate(target, snapshot);
  expect(result.nadir).toEqual(target.nadir);
  expect(result.languages).toEqual(target.languages);
  expect(result.panoramas).toEqual(target.panoramas);
  expect(result.contextMenu).toEqual(target.contextMenu);
  expect(result.panels).toBeUndefined();
  expect(result.panelDefaults).toBeUndefined();
  result.screens.tour.elements[0].id = "edited";
  expect(snapshot.screens.tour.elements[0].id).toBe("new");
});
