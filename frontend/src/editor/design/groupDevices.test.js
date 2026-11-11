import { describe, expect, it } from "vitest";
import { findElement, groupElements, ungroupElements, setFrame } from "./elementOps.js";
import { groupChildFrame, groupDeviceProps } from "../../runtime/model/groupDevice.js";
import { createDesignStore } from "./designStore.js";
import { nudgeSelection } from "./actions.js";

const frame = (x, y, w = 100, h = 30) => ({ anchor: "top-left", x, y, w, h });
const design = () => ({ screens: { tour: { elements: [
  { id: "a", template: "text", props: { text: "A" }, frame: frame(100, 60), mobile: { mode: "custom", frame: frame(20, 100, 200) } },
  { id: "b", template: "text", props: { text: "B" }, frame: frame(240, 110), mobile: { mode: "custom", frame: frame(40, 220, 160) } },
] } } });
const deviceBoxes = {
  desktop: [{ id: "a", left: 100, top: 60, width: 100, height: 30 }, { id: "b", left: 240, top: 110, width: 100, height: 30 }],
  mobile: [{ id: "a", left: 20, top: 100, width: 200, height: 30 }, { id: "b", left: 40, top: 220, width: 160, height: 30 }],
};

describe("group geometry across devices", () => {
  for (const device of ["desktop", "mobile"]) it(`groups from ${device} without changing the other layout, and round trips original frames`, () => {
    const original = design(), snapshot = structuredClone(original);
    const result = groupElements(original, "tour", ["a", "b"], deviceBoxes[device], { device, deviceBoxes });
    const group = findElement(result.design, "tour", result.id);
    expect(group.frame).toEqual(frame(100, 60, 240, 80));
    expect(group.mobile.frame).toEqual(frame(20, 100, 200, 150));
    expect(group.children[1].frame).toEqual(frame(140, 50));
    expect(group.children[1].mobile.groupFrame).toEqual(frame(20, 120, 160));
    const ungrouped = ungroupElements(result.design, "tour", [result.id], deviceBoxes[device], { device, deviceBoxes });
    for (const id of ["a", "b"]) {
      expect(findElement(ungrouped.design, "tour", id).frame).toEqual(findElement(original, "tour", id).frame);
      expect(findElement(ungrouped.design, "tour", id).mobile).toEqual(findElement(original, "tour", id).mobile);
    }
    expect(original).toEqual(snapshot);
  });

  it("ungroups edited positions independently in both devices", () => {
    const grouped = groupElements(design(), "tour", ["a", "b"], deviceBoxes.desktop, { deviceBoxes });
    const movedBoxes = Object.fromEntries(Object.entries(deviceBoxes).map(([device, rows]) => [device, rows.map(row => ({ ...row, left: row.left + (device === "mobile" ? 15 : 40), top: row.top + (device === "mobile" ? 25 : 20) }))]));
    const result = ungroupElements(grouped.design, "tour", [grouped.id], movedBoxes.mobile, { device: "mobile", deviceBoxes: movedBoxes });
    expect(findElement(result.design, "tour", "a").frame).toEqual(frame(140, 80));
    expect(findElement(result.design, "tour", "a").mobile.frame).toEqual(frame(35, 125, 200));
  });

  it("nudges and resizes only a relative mobile frame, with undo", () => {
    const grouped = groupElements(design(), "tour", ["a", "b"], deviceBoxes.desktop, { deviceBoxes });
    const store = createDesignStore({ migrate: false }); store.load(grouped.design); store.setDevice("mobile"); store.enterGroup(grouped.id); store.select("b");
    nudgeSelection(store, 10, 5);
    const child = findElement(store.getState().design, "tour", "b");
    expect(child.frame).toEqual(frame(140, 50));
    expect(child.mobile.frame).toEqual(frame(40, 220, 160));
    expect(child.mobile.groupFrame).toEqual(frame(30, 125, 160));
    const resized = setFrame(store.getState().design, "tour", "b", frame(30, 125, 180), "mobile-group");
    expect(findElement(resized, "tour", "b").frame).toEqual(frame(140, 50));
    store.undo(); expect(findElement(store.getState().design, "tour", "b").mobile.groupFrame).toEqual(frame(20, 120, 160));
  });

  it("resolves mobile group content without mutating saved geometry", () => {
    const grouped = groupElements(design(), "tour", ["a", "b"], deviceBoxes.desktop, { deviceBoxes });
    const group = findElement(grouped.design, "tour", grouped.id), snapshot = structuredClone(group);
    expect(groupDeviceProps(group, true)).toEqual({ contentWidth: 200, contentHeight: 150, width: 200, height: 150 });
    expect(groupChildFrame(group.children[1], true)).toEqual(frame(20, 120, 160));
    expect(groupChildFrame(group.children[1], false)).toEqual(frame(140, 50));
    expect(group).toEqual(snapshot);
  });
});
