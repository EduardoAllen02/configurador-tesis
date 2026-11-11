import { describe, expect, it } from "vitest";
import { POINT_ANCHORS, STRETCH_ANCHORS, resolveFrame } from "../../runtime/layout/engine.js";
import { anchorAfterMove, autoAnchor, frameFromRect, reanchor } from "./geometry.js";

const D = { W: 1440, H: 900 };
const close = (a, b) => {
  ["left", "top", "width", "height"].forEach((k) => expect(a[k]).toBeCloseTo(b[k], 1));
};

describe("frameFromRect es la inversa de resolveFrame", () => {
  const rect = { left: 200, top: 120, width: 300, height: 140 };
  Object.keys(POINT_ANCHORS).forEach((anchor) => {
    [1, 0.8, 1.25].forEach((s) => {
      it(`${anchor} con s=${s}`, () => {
        const frame = frameFromRect(rect, { anchor, container: D, s });
        close(resolveFrame(frame, D, s).rect, rect);
      });
    });
  });

  it("ancla abajo-derecha guarda la distancia a esa esquina", () => {
    const f = frameFromRect({ left: 1440 - 24 - 200, top: 900 - 20 - 100, width: 200, height: 100 }, { anchor: "bottom-right", container: D });
    expect(f).toEqual({ anchor: "bottom-right", x: -24, y: -20, w: 200, h: 100 });
  });

  STRETCH_ANCHORS.forEach((anchor) => {
    it(`${anchor} conserva márgenes`, () => {
      const base = resolveFrame({ anchor, x: 16, y: 16, w: 200, h: 56 }, D, 1).rect;
      const frame = frameFromRect(base, { anchor, container: D });
      close(resolveFrame(frame, D, 1).rect, base);
    });
  });

  it("con keepAutoSize un elemento de tamaño automático sigue automático", () => {
    const f = frameFromRect({ left: 72, top: 300, width: 410, height: 60 }, { anchor: "left", container: D, base: { w: 0, h: 0 }, keepAutoSize: true });
    expect(f.w).toBe(0);
    expect(f.h).toBe(0);
  });
});

describe("autoAnchor", () => {
  const at = (cx, cy) => autoAnchor({ left: cx - 10, top: cy - 10, width: 20, height: 20 }, D);
  it("elige la zona de 3×3 del centro del rect", () => {
    expect(at(100, 100)).toBe("top-left");
    expect(at(720, 100)).toBe("top");
    expect(at(1400, 100)).toBe("top-right");
    expect(at(100, 450)).toBe("left");
    expect(at(720, 450)).toBe("center");
    expect(at(1400, 450)).toBe("right");
    expect(at(100, 880)).toBe("bottom-left");
    expect(at(720, 880)).toBe("bottom");
    expect(at(1400, 880)).toBe("bottom-right");
  });
  it("las barras estiradas no se re-anclan al moverlas", () => {
    expect(anchorAfterMove({ anchor: "stretch-top" }, { left: 0, top: 800, width: 1440, height: 56 }, D)).toBe("stretch-top");
  });
  it("un ancla fijada a mano se respeta", () => {
    expect(anchorAfterMove({ anchor: "top-left" }, { left: 1300, top: 800, width: 50, height: 50 }, D, { pinned: true })).toBe("top-left");
  });
});

describe("reanchor", () => {
  it("cambiar el ancla no mueve el elemento", () => {
    const frame = { anchor: "top-left", x: 300, y: 200, w: 240, h: 80 };
    [1, 0.8].forEach((s) => {
      const before = resolveFrame(frame, D, s).rect;
      Object.keys(POINT_ANCHORS).forEach((anchor) => {
        close(resolveFrame(reanchor(frame, anchor, { container: D, s }), D, s).rect, before);
      });
    });
  });
});
