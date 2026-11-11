import { describe, it, expect } from "vitest";
import { buildModel, buildPickerEntries } from "./tourModel.js";
import { bindPanelElements, reusablePanel, sceneIdsForEntry, toggleSceneEntry, visibleInScene, screenElements, withScreenElements } from "./interfaceModel.js";

describe("visibilidad por escena", () => {
  it("conserva diseños anteriores y permite selección vacía explícita", () => {
    expect(visibleInScene({}, "a")).toBe(true);
    expect(visibleInScene({ showIn: "all" }, "a")).toBe(true);
    expect(visibleInScene({ showIn: [] }, "a")).toBe(false);
    expect(visibleInScene({ showIn: ["a"] }, "a")).toBe(true);
    expect(visibleInScene({ showIn: ["a"] }, "b")).toBe(false);
  });
  it("las barras son globales incluso con filtros guardados anteriores", () => {
    expect(visibleInScene({ template: "basic-topbar", showIn: [] }, "a")).toBe(true);
    expect(visibleInScene({ template: "frame-scrubber", showIn: ["b"] }, "a")).toBe(true);
    expect(visibleInScene({ template: "text", showIn: ["b"] }, "a")).toBe(false);
  });
  it("un video es una entrada, pero guarda todos sus cuadros", () => {
    const model = buildModel({ scenes: [{ id: "a" }, { id: "b", origen: "video_frame", batchId: "v" }, { id: "c", origen: "video_frame", batchId: "v" }] });
    const entries = buildPickerEntries(model);
    expect(entries).toHaveLength(2);
    expect(sceneIdsForEntry(model, entries[1])).toEqual(["b", "c"]);
    expect(toggleSceneEntry("all", ["b", "c"], false, ["a", "b", "c"])).toEqual(["a"]);
    expect(toggleSceneEntry([], ["b", "c"], true)).toEqual(["b", "c"]);
  });
});

describe("paneles reutilizables", () => {
  it("resuelve selección del hotspot antes que predeterminado y tolera un id borrado", () => {
    const design = { panels: [{ id: "a" }, { id: "b" }], panelDefaults: { info: "a" } };
    expect(reusablePanel(design, { type: "info" })?.id).toBe("a");
    expect(reusablePanel(design, { type: "info", content: { panelId: "b" } })?.id).toBe("b");
    expect(reusablePanel(design, { type: "info", content: { panelId: "deleted" } })).toBe(null);
  });
  it("enlaza texto e imagen recursivamente sin mutar estilos o datos", () => {
    const elements = [{ id: "group", template: "group", props: { fill: "red" }, children: [{ id: "title", template: "text", bind: "title", props: { text: "Ejemplo", size: 30 } }, { id: "image", template: "image", bind: "image", props: { fit: "cover" } }, { id: "price", template: "text", bind: "price" }] }];
    const bound = bindPanelElements(elements, { title: "Cocina", image: "/photo.webp" });
    expect(bound[0].children[0].props).toEqual({ text: "Cocina", size: 30 });
    expect(bound[0].children[1].props).toEqual({ asset: "/photo.webp", fit: "cover" });
    expect(bound[0].children[2].props.text).toBe("");
    expect(elements[0].children[0].props.text).toBe("Ejemplo");
  });
  it("edita elementos de panel sin duplicarlos en screens", () => {
    const design = { screens: { tour: { elements: [{ id: "hud" }] } }, panels: [{ id: "p", elements: [{ id: "text" }] }] };
    expect(screenElements(design, "panel:p")).toEqual([{ id: "text" }]);
    const next = withScreenElements(design, "panel:p", [{ id: "image" }]);
    expect(next.panels[0].elements).toEqual([{ id: "image" }]);
    expect(next.screens).toBe(design.screens);
    expect(design.panels[0].elements[0].id).toBe("text");
  });
});
