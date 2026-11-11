import { describe, it, expect } from "vitest";
import { editableHotspotCard, pieceAtPoint } from "./hotspotCard.js";
import { detailElements, createHotspotDetail } from "./hotspotDetail.js";
import { resizeHotspot } from "../hotspots/resizeHotspot.js";

describe("editable marker compositions", () => {
  it("captures local text geometry without enabling an optional detail", () => {
    const hotspot = { title: "Sala", content: { detail: { ...createHotspotDetail(), enabled: false } } };
    const card = editableHotspotCard(hotspot, { width: 168, height: 54, pieces: [
      { role: "kicker", text: "Información", x: 12, y: 10, w: 140, size: 8.4, uppercase: true },
      { role: "title", bind: "title", text: "Sala", x: 12, y: 27, w: 140, size: 11.2 },
    ] });
    expect(card.elements[0].frame.w).toBe(168);
    expect(card.elements[0].children[0].props).toMatchObject({ size: 8.4, uppercase: true });
    expect(hotspot.content.detail.enabled).toBe(false);
    const hydrated = detailElements(card, { title: "Nuevo título" });
    expect(hydrated[0].children[1].props.text).toBe("Nuevo título");
    expect(hydrated[0].children[1].frame).toMatchObject({ x: 12, y: 27 });
  });
  it("reopening preserves custom pieces and clones the saved card", () => {
    const card = editableHotspotCard({ title: "Sala" });
    card.elements[0].children[0].props.size = 19;
    const next = editableHotspotCard({ content: { card } });
    expect(next).toEqual(card);
    next.elements[0].children[0].props.size = 25;
    expect(card.elements[0].children[0].props.size).toBe(19);
  });
  it("keeps marker and expanded detail resizing independent", () => {
    const card = editableHotspotCard({ title: "Sala" });
    const detail = createHotspotDetail();
    const hotspot = { content: { card, detail } };
    const next = resizeHotspot(hotspot, { template: "callout" }, .5, true, "card");
    expect(next.content.card.elements[0].frame.w).toBe(105);
    expect(next.content.card.elements[0].children[1].props.size).toBe(7);
    expect(next.content.detail).toEqual(detail);
    const widened = resizeHotspot(hotspot, { template: "callout" }, 1.5, false, "card");
    expect(widened.content.card.elements[0].frame.w).toBe(315);
    expect(widened.content.card.elements[0].children[1].props.size).toBe(14);
    const expanded = resizeHotspot(hotspot, { template: "callout" }, .5, true, "detail");
    expect(expanded.content.card).toEqual(card);
    expect(expanded.content.detail.elements[0].frame.w).toBe(160);
  });
  it("resolves the smallest visible piece even when pointer capture retargets clicks", () => {
    const node = (box) => ({ getBoundingClientRect: () => box });
    const parent = node({ left: 0, top: 0, right: 100, bottom: 100, width: 100, height: 100 });
    const leaf = node({ left: 10, top: 10, right: 60, bottom: 30, width: 50, height: 20 });
    const hidden = node({ left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 });
    const content = { querySelectorAll: () => [parent, leaf, hidden] };
    expect(pieceAtPoint(content, 20, 20, parent)).toBe(leaf);
    expect(pieceAtPoint(content, 200, 20, parent)).toBe(parent);
  });
});
