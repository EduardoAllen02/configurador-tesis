import { describe, expect, it } from "vitest";
import { frameToStyle } from "./frame.js";

describe("frameToStyle", () => {
  it("stretch-top del topbar por defecto: ancho completo, 56 px de alto", () => {
    expect(frameToStyle({ anchor: "stretch-top", x: 0, y: 0, w: 0, h: 56 })).toEqual({
      left: "0px",
      right: "0px",
      top: "0px",
      height: "56px",
    });
  });
  it("stretch-bottom del scrubber por defecto: márgenes de 16 px", () => {
    expect(frameToStyle({ anchor: "stretch-bottom", x: 16, y: 16, w: 0, h: 32 })).toEqual({
      left: "16px",
      right: "16px",
      bottom: "16px",
      height: "32px",
    });
  });
  it("un anclaje desconocido cae en top-left", () => {
    expect(frameToStyle({ anchor: "raro", x: 4, y: 5, w: 10, h: 20 })).toEqual({
      left: "4px",
      top: "5px",
      width: "10px",
      height: "20px",
    });
  });
});
