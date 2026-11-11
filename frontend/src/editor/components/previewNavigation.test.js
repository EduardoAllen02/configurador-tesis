import { describe, expect, it } from "vitest";
import { previewHref, previewEditorHref } from "./previewNavigation.js";

describe("preview return navigation", () => {
  it("preserves each editor for normal and new-tab preview links", () => {
    for (const editor of ["edit", "design"]) {
      const path = `/tours/current/${editor}`;
      const href = previewHref("current", path);
      expect(href).toBe(`/tours/current/view?editor=${editor}`);
      expect(previewEditorHref("current", { search: href.slice(href.indexOf("?")) })).toBe(path);
      expect(previewEditorHref("current", { state: { editorOrigin: path } })).toBe(path);
    }
  });
  it("ignores external, cross-tour and unsupported state/query destinations", () => {
    for (const value of ["https://example.com", "//example.com", "/tours/other/design", "/tours/current/publish", "/tours/current/design?next=https://example.com"]) {
      expect(previewEditorHref("current", { state: { editorOrigin: value }, search: `?editor=${encodeURIComponent(value)}` })).toBe("/tours/current/edit");
    }
    expect(previewEditorHref("current")).toBe("/tours/current/edit");
  });
});
