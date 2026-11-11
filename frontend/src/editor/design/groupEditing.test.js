import { describe, expect, it } from "vitest";
import { createDesignStore } from "./designStore.js";
import { addElement, duplicateElements, elementsOf, findElement, flattenElements, groupElements, parentOf, removeElements, setFrame, ungroupElements, updateProps } from "./elementOps.js";
import { copyElements, clipboardItems, pasteElements } from "./canvas/clipboard.js";
import { buildTargets, snapMove } from "./canvas/snapping.js";
import { moveFrame } from "./canvas/frames.js";

const frame = (x, y, w = 100, h = 30) => ({ anchor: "top-left", x, y, w, h });
const leaf = (id, x = 0, y = 0) => ({ id, template: "text", frame: frame(x, y), props: { text: id }, z: 1 });
const nested = () => ({ screens: { tour: { elements: [{ id: "g", template: "group", props: {}, frame: frame(100, 100, 400, 200), children: [leaf("a", 20, 30), { id: "inner", template: "group", frame: frame(10, 80, 120, 70), children: [leaf("b", 4, 5)] }] }] } } });

describe("editing a composite element", () => {
  it("resolves and edits nested leaves through stable ids and explicit paths without touching siblings", () => {
    const design = nested();
    expect(findElement(design, "tour", "g/inner/b")).toBe(findElement(design, "tour", "b"));
    expect(parentOf(design, "tour", "b").id).toBe("inner");
    const changed = updateProps(design, "tour", ["g", "inner", "b"], { text: "Nueva frase" });
    expect(findElement(changed, "tour", "b").props.text).toBe("Nueva frase");
    expect(findElement(changed, "tour", "g").props).toEqual({});
    expect(findElement(changed, "tour", "a")).toEqual(findElement(design, "tour", "a"));
    expect(findElement(design, "tour", "b").props.text).toBe("b");
  });

  it("keeps selection and inline editing inside a group across edits and exits one level at a time", () => {
    const store = createDesignStore();
    store.load(nested());
    store.enterGroup("g");
    store.enterGroup("inner");
    store.select("b");
    store.setEditing({ id: "b", key: "text" });
    store.apply((d) => updateProps(d, "tour", "b", { text: "Editado" }));
    expect(store.getState().selection).toEqual(["b"]);
    expect(store.getState().editing).toEqual({ id: "b", key: "text" });
    store.exitGroup();
    expect(store.getState()).toMatchObject({ activeGroupId: "g", selection: ["inner"], editing: null });
    store.exitGroup();
    expect(store.getState()).toMatchObject({ activeGroupId: null, selection: ["g"] });
    store.undo();
    expect(findElement(store.getState().design, "tour", "b").props.text).toBe("b");
  });

  it("prunes removed descendants and clears a removed active group", () => {
    const store = createDesignStore();
    store.load(nested());
    store.enterGroup("inner");
    store.select("b");
    store.apply((d) => removeElements(d, "tour", "inner"));
    expect(store.getState()).toMatchObject({ activeGroupId: null, selection: [] });
  });

  it("moves a child in local pixels while leaving the group's frame alone", () => {
    const design = nested();
    const changed = setFrame(design, "tour", "g/a", frame(85, 35));
    expect(findElement(changed, "tour", "a").frame.x).toBe(85);
    expect(findElement(changed, "tour", "g").frame).toEqual(findElement(design, "tour", "g").frame);
  });

  it("regenerates all descendant ids when duplicating, copying or inserting the same preset twice", () => {
    const design = nested();
    const copy = duplicateElements(design, "tour", ["g", "a"]);
    expect(copy.ids).toHaveLength(1);
    const ids = flattenElements(elementsOf(copy.design, "tour")).map((el) => el.id);
    expect(new Set(ids).size).toBe(ids.length);
    copyElements(design, "tour", ["inner"]);
    const pasted = pasteElements(design, "tour", clipboardItems(), 16, "g");
    expect(parentOf(pasted.design, "tour", pasted.ids[0]).id).toBe("g");
    expect(findElement(pasted.design, "tour", pasted.ids[0]).children[0].id).not.toBe("b");
    const first = addElement(design, "tour", { template: "group", children: [leaf("recipe")] });
    const second = addElement(first.design, "tour", { template: "group", children: [leaf("recipe")] });
    const recipeIds = flattenElements(elementsOf(second.design, "tour")).map((el) => el.id);
    expect(new Set(recipeIds).size).toBe(recipeIds.length);
  });

  it("groups measured elements, preserving frames and text through ungroup", () => {
    const design = { screens: { tour: { elements: [leaf("a", 100, 60), leaf("b", 240, 110)] } } };
    const boxes = [{ id: "a", left: 100, top: 60, width: 100, height: 30 }, { id: "b", left: 240, top: 110, width: 100, height: 30 }];
    const grouped = groupElements(design, "tour", ["a", "b"], boxes);
    const group = findElement(grouped.design, "tour", grouped.id);
    expect(group.frame).toEqual(frame(100, 60, 240, 80));
    expect(group.props).toMatchObject({ contentWidth: 240, contentHeight: 80, autoFit: false });
    expect(group.children[1].frame).toEqual(frame(140, 50));
    const undone = ungroupElements(grouped.design, "tour", [grouped.id], boxes);
    expect(undone.ids).toEqual(["a", "b"]);
    expect(findElement(undone.design, "tour", "a").frame).toEqual(design.screens.tour.elements[0].frame);
    expect(findElement(undone.design, "tour", "b").props.text).toBe("b");
  });

  it("rejects groups that span different parents or exceed one nested group", () => {
    const design = nested();
    expect(groupElements(design, "tour", ["a", "b"], []).id).toBe(null);
    const inner = findElement(design, "tour", "inner");
    inner.children.push(leaf("c", 30));
    expect(groupElements(design, "tour", ["b", "c"], []).id).toBe(null);
  });

  it("keeps nested grouping and ungrouping relative to a transformed content origin", () => {
    const design = { screens: { tour: { elements: [{ id: "host", template: "group", frame: frame(100, 100, 400, 200), children: [leaf("a", 20, 30), leaf("b", 160, 80)] }] } } };
    const boxes = [{ id: "host", left: 100, top: 100, contentLeft: 70, contentTop: 80, width: 600, height: 300, scale: 1.5 },
      { id: "a", left: 100, top: 125, width: 150, height: 45 }, { id: "b", left: 310, top: 200, width: 150, height: 45 }];
    const grouped = groupElements(design, "tour", ["a", "b"], boxes);
    expect(findElement(grouped.design, "tour", grouped.id).frame).toEqual(frame(20, 30, 240, 80));
    const ungrouped = ungroupElements(grouped.design, "tour", [grouped.id], boxes);
    expect(findElement(ungrouped.design, "tour", "a").frame).toEqual(frame(20, 30));
    expect(findElement(ungrouped.design, "tour", "b").frame).toEqual(frame(160, 80));
  });

  it("snaps in a scaled group's local box and saves relative child pixels", () => {
    const ctx = { container: { W: 600, H: 300 }, s: 1.5 };
    const item = { base: frame(10, 10), anchor: "top-left" };
    const snap = snapMove({ left: 198, top: 43, width: 150, height: 45 }, buildTargets(ctx.container, [{ left: 200, top: 150, width: 100, height: 50 }]), 5);
    const result = moveFrame(item, { left: 198 + snap.dx, top: 43 + snap.dy, width: 150, height: 45 }, ctx);
    expect(result.x).toBeCloseTo(133.33, 2);
    expect(snap.guides.some((guide) => guide.axis === "x" && guide.pos === 200)).toBe(true);
  });
});
