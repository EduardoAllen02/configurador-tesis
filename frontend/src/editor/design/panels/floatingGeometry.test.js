import { describe, expect, it } from "vitest";
import { clampWindowPosition, clampWindowSize, fitWindowPosition } from "./floatingGeometry.js";
import { ICONS, ICON_CATEGORIES } from "../../../runtime/icons/index.js";

describe("floating window reachability", () => {
  const screen = { width: 1440, height: 900 };
  it("permits dragging above both toolbars and partially outside either side", () => {
    expect(clampWindowPosition({ x: -100, y: 0 }, screen)).toEqual({ x: -100, y: 0 });
    expect(clampWindowPosition({ x: 1300, y: 300 }, screen)).toEqual({ x: 1300, y: 300 });
  });
  it("always retains 48 pixels of draggable title and the full title height", () => {
    expect(clampWindowPosition({ x: -10000, y: -10000 }, screen)).toEqual({ x: -344, y: 0 });
    expect(clampWindowPosition({ x: 10000, y: 10000 }, screen)).toEqual({ x: 1392, y: 852 });
  });
  it("recovers the session position after resizing the viewport", () => {
    expect(clampWindowPosition({ x: 1392, y: 852 }, { width: 390, height: 844 }, 374)).toEqual({ x: 342, y: 796 });
  });
  it("ignores invalid persisted coordinates", () => {
    expect(clampWindowPosition({ x: "bad", y: null }, screen)).toEqual({ x: 976, y: 112 });
  });
});

it("resizes in both axes within usable minimums and the remaining viewport", () => {
  const viewport = { width: 1040, height: 700 };
  expect(clampWindowSize({ width: 10, height: 10 }, viewport, { x: 400, y: 112 })).toEqual({ width: 280, height: 180 });
  expect(clampWindowSize({ width: 9999, height: 9999 }, viewport, { x: 400, y: 112 })).toEqual({ width: 632, height: 580 });
  expect(clampWindowSize({ width: 400, height: 500 }, { width: 200, height: 150 })).toEqual({ width: 184, height: 134 });
});

it("keeps the resize grip visible after reopening in a smaller Chrome window", () => {
  expect(fitWindowPosition({ x: 1000, y: 200 }, { width: 880, height: 500 }, { width: 370, height: 560 })).toEqual({ x: 502, y: 8 });
});

it("categorizes every selectable icon under one of the seven editor categories", () => {
  expect(ICON_CATEGORIES).toHaveLength(7);
  const categories = ICON_CATEGORIES.map((category) => category.id);
  for (const icon of Object.values(ICONS)) expect(categories).toContain(icon.cat);
  for (const category of categories) expect(Object.values(ICONS).some((icon) => icon.cat === category)).toBe(true);
});
