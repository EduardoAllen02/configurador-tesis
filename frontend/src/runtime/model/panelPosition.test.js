import { describe, expect, it } from "vitest";
import { positionedPanelElements } from "./panelPosition.js";
import { resolveFrame } from "../layout/engine.js";

const desktop = { W: 1440, H: 900 };
const source = [
  { id: "group", template: "group", frame: { anchor: "center", x: 90, y: -20, w: 520, h: 440 }, children: [{ id: "text" }] },
  { id: "label", template: "text", frame: { anchor: "top-left", x: 620, y: 340, w: 80, h: 40 } },
];
const rects = (elements, size = desktop, scale = 1) => elements.map((element) => resolveFrame(element.frame, size, scale).rect);

describe("posición del conjunto del panel", () => {
  it.each(["left", "right", "center", "bottom"])("preserva distancias al colocar %s con anclas originales diferentes", (position) => {
    const original = rects(source);
    const elements = positionedPanelElements(source, position);
    const moved = rects(elements);
    expect(moved[1].left - moved[0].left).toBe(original[1].left - original[0].left);
    expect(moved[1].top - moved[0].top).toBe(original[1].top - original[0].top);
    expect(elements[0].children).toBe(source[0].children);
    expect(elements[0].frame.w).toBe(520);
    expect(source[0].frame.anchor).toBe("center");
    const left = Math.min(...moved.map((r) => r.left));
    const right = Math.max(...moved.map((r) => r.left + r.width));
    const top = Math.min(...moved.map((r) => r.top));
    const bottom = Math.max(...moved.map((r) => r.top + r.height));
    if (position === "left") expect(left).toBe(24);
    if (position === "right") expect(right).toBe(desktop.W - 24);
    if (position === "center") { expect((left + right) / 2).toBe(desktop.W / 2); expect((top + bottom) / 2).toBe(desktop.H / 2); }
    if (position === "bottom") expect(bottom).toBe(desktop.H - 24);
  });
  it("móvil ancla el grupo completo a la base y conserva su proporción", () => {
    const mobile = { W: 390, H: 844 };
    const positioned = positionedPanelElements(source.slice(0, 1), "bottom");
    const [box] = rects(positioned, mobile, 0.68);
    expect(box.left + box.width / 2).toBe(mobile.W / 2);
    expect(box.top + box.height).toBeCloseTo(mobile.H - 24 * 0.68);
    expect(box.width / box.height).toBeCloseTo(520 / 440);
  });
  it("la posición del lienzo y la lista vacía permanecen intactas", () => {
    expect(positionedPanelElements(source, "custom")).toBe(source);
    expect(positionedPanelElements([], "bottom")).toEqual([]);
  });
});
