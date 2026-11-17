import { describe, expect, it } from "vitest";
import { sceneThumbPath } from "./sceneThumb.js";

describe("scene rail thumbnails", () => {
  it("asks for the lightweight thumbnail next to each scene WebP", () => {
    expect(sceneThumbPath("/uploads/panoramas/abc.webp")).toBe("/uploads/panoramas/abc.thumb.webp");
    expect(sceneThumbPath("/uploads/frames/video/0001.webp")).toBe("/uploads/frames/video/0001.thumb.webp");
  });
  it("leaves derived, foreign or missing paths untouched", () => {
    for (const value of ["/uploads/panoramas/abc.preview.webp", "/uploads/panoramas/abc.thumb.webp", "https://cdn.example.com/a.webp", "/uploads/panoramas/a.jpg", null, undefined]) {
      expect(sceneThumbPath(value)).toBe(value);
    }
  });
});
