import { describe, expect, it } from "vitest";
import { createDesignStore } from "./designStore.js";
import { groupSelection, ungroupSelection, nudgeSelection, selectionGrouping } from "./actions.js";
import { findElement, parentOf, updateProps } from "./elementOps.js";
import { registerCanvas } from "./canvas/canvasRegistry.js";

const frame = (x, y, w = 100, h = 30) => ({ anchor: "top-left", x, y, w, h });
const elements = () => ["a", "b"].map((id, i) => ({ id, template: "text", props: { text: id, color: "#123456" }, frame: frame(100 + i * 140, 60 + i * 50), mobile: { mode: "custom", frame: frame(20, 100 + i * 60, 200) }, z: i + 1 }));
const boxes = [{ id: "a", left: 100, top: 60, width: 100, height: 30 }, { id: "b", left: 240, top: 110, width: 100, height: 30 }];
function setup() {
  const store = createDesignStore({ migrate: false });
  store.load({ screens: { tour: { elements: elements() } } });
  store.select(["a", "b"]);
  return store;
}

describe("shared toolbar/shortcut grouping actions", () => {
  it("uses live canvas geometry, moves the group, edits pieces, and undoes each operation", () => {
    const store = setup(), original = store.getState().design;
    const cleanup = registerCanvas(store, { getBoxes: () => boxes });
    const id = groupSelection(store);
    expect(store.getState().selection).toEqual([id]);
    expect(parentOf(store.getState().design, "tour", "a").id).toBe(id);
    nudgeSelection(store, 40, 20);
    expect(findElement(store.getState().design, "tour", id).frame).toMatchObject({ x: 140, y: 80 });
    expect(findElement(store.getState().design, "tour", "b").frame).toEqual(frame(140, 50));
    store.enterGroup(id); store.select("a");
    store.apply(doc => updateProps(doc, "tour", "a", { text: "Editado" }));
    expect(findElement(store.getState().design, "tour", "a").props.text).toBe("Editado");
    store.undo(); store.undo(); store.undo();
    expect(store.getState().design).toEqual(original);
    store.redo(); store.redo();
    expect(findElement(store.getState().design, "tour", id).frame.x).toBe(140);
    cleanup();
  });

  it("preserves independent mobile metadata and materializes hotspot layout in one undo step", () => {
    const store = setup(), original = store.getState().design;
    const cleanup = registerCanvas(store, { getBoxes: () => boxes, prepareGrouping: () => store.preview(doc => ({ ...doc, materialized: true })) });
    const id = groupSelection(store);
    expect(findElement(store.getState().design, "tour", "b").mobile).toEqual(elements()[1].mobile);
    store.undo(); expect(store.getState().design).toEqual(original);
    store.redo(); store.select(id);
    expect(ungroupSelection(store)).toEqual(["a", "b"]);
    expect(findElement(store.getState().design, "tour", "b").mobile).toEqual(elements()[1].mobile);
    expect(findElement(store.getState().design, "tour", "b").frame).toEqual(elements()[1].frame);
    store.undo(); expect(findElement(store.getState().design, "tour", id).template).toBe("group");
    cleanup();
  });

  it("protects a hotspot's canonical surface root from ungrouping", () => {
    const store = createDesignStore({ migrate: false });
    store.load({ hotspotLayouts: { detail: {} }, panels: [{ id: "hotspot-detail", elements: [{ id: "root", template: "group", frame: frame(0, 0), children: elements() }] }] });
    store.setScreen("panel:hotspot-detail"); store.select("root");
    expect(selectionGrouping(store).canUngroup).toBe(false);
    expect(ungroupSelection(store, boxes)).toEqual([]);
    expect(findElement(store.getState().design, "panel:hotspot-detail", "root")).toBeTruthy();
  });
});
