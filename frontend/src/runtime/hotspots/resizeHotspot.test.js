import { it, expect } from "vitest";
import { createHotspotDetail } from "../model/hotspotDetail.js";
import { resizeHotspot, hotspotResizeBox } from "./resizeHotspot.js";

it("corner scales text/image/spacing while the opposite corner stays fixed", () => {
  const detail = createHotspotDetail();
  const hotspot = { content: { detail }, lon: 10, lat: 20 };
  const resized = resizeHotspot(hotspot, { template: "callout", props: { size: 30, dx: 80 } }, .5, true);
  expect(resized.content.detail.elements[0].frame.w).toBe(160);
  expect(resized.content.detail.elements[0].children[0].frame.h).toBe(80);
  expect(resized.content.detail.elements[0].children[1].props.size).toBe(11);
  expect(resized.content.detail.elements[0].props).toMatchObject({ padding: 8, detailScale: .5, detailGap: 6 });
  expect(resized.style.props).toMatchObject({ size: 30, dx: 80 });
  expect(hotspot.content.detail.elements[0].frame.w).toBe(320);
  const box = hotspotResizeBox({ left: 100, top: 100, width: 200, height: 100 }, "nw", -100, 0);
  expect(box).toMatchObject({ left: 20, top: 60, width: 280, height: 140 });
});

it("side handle reflows the card width without scaling its type or image height", () => {
  const hotspot = { content: { detail: createHotspotDetail() } };
  const { content } = resizeHotspot(hotspot, { template: "callout" }, .8, false);
  expect(content.detail.elements[0].frame.w).toBe(250);
  expect(content.detail.elements[0].children[1].props.size).toBe(22);
  expect(content.detail.elements[0].children[0].frame.h).toBe(160);
});

it("plain markers and cards also have persistent resize properties", () => {
  expect(resizeHotspot({}, { template: "circle-icon", props: { size: 40 } }, 1.5, true).style.props.size).toBe(60);
  expect(resizeHotspot({}, { template: "callout", props: {} }, 1.5, true).style.props.cardScale).toBe(1.5);
  expect(resizeHotspot({}, { template: "callout", props: {} }, 1.5, false).style.props.cardWidth).toBe(360);
});

it("wide hotspot cards scale continuously without using the short axis as gain", () => {
  const box = { left: 10, top: 20, width: 400, height: 25 };
  const first = hotspotResizeBox(box, "se", 3, 3);
  const next = hotspotResizeBox(box, "se", 4, 3);
  expect(first.factor).toBeLessThan(1.01);
  expect(next.width - first.width).toBeLessThan(1.01);
  expect(hotspotResizeBox(box, "nw", -3, -3).factor).toBe(first.factor);
});
