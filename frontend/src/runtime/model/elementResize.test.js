import { it, expect } from "vitest";
import { scaleElement, reflowElement, proportionalScale, resizeGroupHeight } from "./elementResize.js";
it("corner scales nested geometry and font sizes; side reflows without changing them", () => {
  const source = { template: "group", frame: { x: 80, y: 90, w: 300, h: 0 }, props: { padding: 10, contentWidth: 300 }, children: [{ template: "text", frame: { x: 10, y: 10, w: 280, h: 30 }, props: { size: 20 } }] };
  const scaled = scaleElement(source, 2);
  expect(scaled.frame).toMatchObject({ x: 80, y: 90, w: 600 });
  expect(scaled.children[0]).toMatchObject({ props: { size: 40 }, frame: { x: 20, y: 20, w: 560 } });
  const reflowed = reflowElement(source, 200);
  expect(reflowed.children[0]).toMatchObject({ props: { size: 20 }, frame: { x: 10, y: 10, w: 180 } });
  expect(source.children[0].props.size).toBe(20);
});

it("diagonal projection handles wide/tall images and reversed corner motion", () => {
  expect(proportionalScale(400, 25, 3, 3)).toBeLessThan(1.01);
  expect(proportionalScale(25, 400, 3, 3)).toBeLessThan(1.01);
  expect(proportionalScale(400, 25, 40, 2.5)).toBeCloseTo(1.1);
  expect(proportionalScale(400, 25, -40, -2.5)).toBeCloseTo(.9);
  expect(proportionalScale(200, 100, 10, -20)).toBe(1);
});

it("container height leaves internal text/image geometry intact", () => {
  const source = { template: "group", frame: { w: 320, h: 0 }, props: { autoFit: true, contentHeight: 200 },
    children: [{ template: "text", frame: { x: 16, y: 16, w: 280 }, props: { size: 16.68 } },
      { template: "image", frame: { x: 16, y: 50, w: 280, h: 160 } }] };
  const resized = resizeGroupHeight(source, 360);
  expect(resized.frame).toEqual({ w: 320, h: 360 });
  expect(resized.props).toMatchObject({ autoFit: false, contentHeight: 0, detailFixedHeight: true });
  expect(resized.children).toBe(source.children);
  expect(source.frame.h).toBe(0);
  const scaled = scaleElement(resized, .5);
  expect(scaled.frame.h).toBe(180);
  expect(scaled.children[0].props.size).toBe(8.34);
});
