import { describe, expect, it } from "vitest";
import {
  addBrandColor,
  alignRect,
  alphaOf,
  blankRow,
  borderWidthKey,
  canAlign,
  editingSlots,
  formatColor,
  frameForRect,
  frameWithField,
  freeAxes,
  isAligned,
  moreSlots,
  moveItem,
  parseColor,
  pinFrame,
  quickSlots,
  removeAt,
  removeBrandColor,
  sameColor,
  setBrandColor,
  setBrandFont,
  setIntro,
  setIntroBackground,
  stripAsset,
  stretchAnchor,
  toHex6,
  unionRect,
  usedColors,
  withAlpha,
} from "./logic.js";
import { getTemplate } from "../../../runtime/templates/index.js";
import { resolveFrame } from "../../../runtime/layout/engine.js";

const container = { W: 1440, H: 900 };

describe("colores", () => {
  it("entiende hex corto/largo/con alfa, rgba, transparent y nombres", () => {
    expect(parseColor("#fff")).toEqual({ r: 255, g: 255, b: 255, a: 1 });
    expect(parseColor("1a2b3c")).toEqual({ r: 26, g: 43, b: 60, a: 1 });
    expect(parseColor("#11223380").a).toBeCloseTo(0.5, 1);
    expect(parseColor("rgba(255, 255, 255, .12)")).toEqual({ r: 255, g: 255, b: 255, a: 0.12 });
    expect(parseColor("transparent").a).toBe(0);
    expect(parseColor("Azul")).toEqual(parseColor("#2f6fed"));
    expect(parseColor("var(--tour-accent)")).toBeNull();
    expect(parseColor("")).toBeNull();
  });

  it("formatea opaco como hex y translúcido como rgba", () => {
    expect(formatColor({ r: 255, g: 0, b: 128, a: 1 })).toBe("#ff0080");
    expect(formatColor({ r: 255, g: 255, b: 255, a: 0.5 })).toBe("rgba(255, 255, 255, 0.5)");
    expect(withAlpha("#102030", 0.25)).toBe("rgba(16, 32, 48, 0.25)");
    expect(alphaOf("rgba(0,0,0,.4)")).toBeCloseTo(0.4, 2);
    expect(toHex6("rgba(255,0,0,.3)")).toBe("#ff0000");
  });

  it("compara colores por valor, no por texto", () => {
    expect(sameColor("#FFF", "#ffffff")).toBe(true);
    expect(sameColor("rgba(255,255,255,1)", "#ffffff")).toBe(true);
    expect(sameColor("#fff", "rgba(255,255,255,.5)")).toBe(false);
    expect(sameColor("", undefined)).toBe(true);
  });

  it("junta los colores del diseño sin repetir", () => {
    const design = {
      brand: { colors: ["#ffffff", "#4c8dff"] },
      screens: {
        intro: { background: { color: "#0e1728" }, elements: [{ template: "button", props: { fill: "#FFF", color: "#101a2b" } }] },
        tour: { elements: [{ template: "shape", props: {} }] },
      },
    };
    const list = usedColors(design, getTemplate);
    expect(list.slice(0, 4)).toEqual(["#ffffff", "#4c8dff", "#0e1728", "#101a2b"]);
    expect(list).not.toContain("rgba(255,255,255,.12)"); // el relleno de la forma es automático y no un color manual
    expect(new Set(list.map((c) => parseColor(c) && formatColor(parseColor(c)))).size).toBe(list.length);
  });
});

describe("slots", () => {
  const text = getTemplate("text");
  const shape = getTemplate("shape");
  it("separa los rápidos de «Más opciones» y deja Animar aparte", () => {
    expect(quickSlots(text).map((s) => s.key)).toEqual(["color", "size", "weight", "align", "font", "italic", "underline"]);
    expect(moreSlots(text).map((s) => s.key)).toEqual(["text", "variant", "uppercase", "letterSpacing", "lineHeight"]);
    expect(quickSlots(text).concat(moreSlots(text)).some((s) => s.type === "animation")).toBe(false);
  });

  it("al editar un texto muestra su slot, los colores, el tamaño y la alineación", () => {
    expect(editingSlots(text, "text").map((s) => s.key)).toEqual(["text", "color", "size", "weight", "align", "font", "italic", "underline", "uppercase", "letterSpacing", "lineHeight"]);
    const btn = getTemplate("button");
    expect(editingSlots(btn, "label").map((s) => s.key)).toEqual(["label", "fill", "color"]);
  });

  it("encuentra el grosor de un borde", () => {
    expect(borderWidthKey(shape, shape.slots.find((s) => s.key === "stroke"))).toBe("strokeWidth");
    const card = getTemplate("glass-card");
    expect(borderWidthKey(card, card.slots.find((s) => s.key === "borderColor"))).toBeNull();
  });
});

describe("listas", () => {
  it("mueve, quita y crea filas", () => {
    expect(moveItem(["a", "b", "c"], 0, 1)).toEqual(["b", "a", "c"]);
    expect(moveItem(["a", "b", "c"], 0, -1)).toEqual(["a", "b", "c"]);
    expect(removeAt(["a", "b", "c"], 1)).toEqual(["a", "c"]);
    expect(blankRow([{ key: "value", type: "number" }, { key: "label", type: "text" }])).toEqual({ value: 0, label: "" });
    const copy = blankRow([], { a: { b: 1 } });
    expect(copy).toEqual({ a: { b: 1 } });
  });
});

describe("posición", () => {
  const rect = { left: 100, top: 200, width: 300, height: 100 };
  it("alinea a la página y reconoce lo que ya está alineado", () => {
    expect(alignRect(rect, { left: 0, top: 0, width: 1440, height: 900 }, "center").left).toBe(570);
    expect(alignRect(rect, { left: 0, top: 0, width: 1440, height: 900 }, "bottom").top).toBe(800);
    expect(isAligned({ ...rect, left: 0 }, { left: 0, top: 0, width: 1440, height: 900 }, "left")).toBe(true);
    expect(isAligned(rect, { left: 0, top: 0, width: 1440, height: 900 }, "left")).toBe(false);
    expect(unionRect([rect, { left: 0, top: 0, width: 10, height: 10 }])).toEqual({ left: 0, top: 0, width: 400, height: 300 });
  });

  it("las anclas estiradas bloquean el eje que ocupan", () => {
    expect(freeAxes("stretch-top")).toEqual({ x: false, y: true, w: false, h: true });
    expect(canAlign("stretch-top", "left")).toBe(false);
    expect(canAlign("stretch-top", "top")).toBe(true);
    expect(canAlign("top-left", "center")).toBe(true);
  });

  it("alinear mueve el elemento a donde se pidió sin cambiar su tamaño automático", () => {
    const frame = { anchor: "bottom-right", x: -40, y: -30, w: 0, h: 0 };
    const measured = { w: 300, h: 100 };
    const r = resolveFrame(frame, container, 1, measured).rect;
    const moved = alignRect(r, { left: 0, top: 0, width: 1440, height: 900 }, "left");
    const next = frameForRect(frame, moved, { container, s: 1 });
    expect(next.anchor).toBe("bottom-right");
    expect(next.w).toBe(0);
    expect(resolveFrame(next, container, 1, measured).rect.left).toBeCloseTo(0, 1);
  });

  it("editar X/Y/W/H cambia solo ese campo", () => {
    const frame = { anchor: "top-left", x: 50, y: 60, w: 0, h: 0 };
    const measured = { w: 300, h: 100 };
    const rect = resolveFrame(frame, container, 1, measured).rect;
    expect(frameWithField(frame, rect, "x", 200, { container, s: 1 })).toMatchObject({ x: 200, y: 60, w: 0, h: 0 });
    expect(frameWithField(frame, rect, "w", 420, { container, s: 1 })).toMatchObject({ x: 50, y: 60, w: 420, h: 0 });
    expect(frameWithField(frame, rect, "h", 80, { container, s: 1 })).toMatchObject({ w: 0, h: 80 });
  });

  it("«Fijar a…» no mueve el elemento y marca el ancla como fijada", () => {
    const frame = { anchor: "top-left", x: 100, y: 80, w: 0, h: 0 };
    const measured = { w: 300, h: 100 };
    const before = resolveFrame(frame, container, 1, measured).rect;
    ["bottom-right", "center", "top"].forEach((anchor) => {
      const pinned = pinFrame(frame, anchor, { container, s: 1, measured });
      expect(pinned.anchor).toBe(anchor);
      expect(pinned.pinned).toBe(true);
      const after = resolveFrame(pinned, container, 1, measured).rect;
      expect(after.left).toBeCloseTo(before.left, 1);
      expect(after.top).toBeCloseTo(before.top, 1);
    });
  });

  it("estirar a lo ancho elige arriba o abajo según la mitad en que está", () => {
    expect(stretchAnchor("x", { left: 0, top: 100, width: 10, height: 10 }, container)).toBe("stretch-top");
    expect(stretchAnchor("x", { left: 0, top: 700, width: 10, height: 10 }, container)).toBe("stretch-bottom");
    expect(stretchAnchor("y", { left: 1000, top: 0, width: 10, height: 10 }, container)).toBe("stretch-right");
  });
});

describe("inicio y marca", () => {
  const base = { screens: { intro: { enabled: false, background: null, elements: [{ id: "a" }] }, tour: { elements: [] } }, brand: { colors: ["#fff"], fonts: {} } };
  it("cambia la pantalla de inicio sin perder sus elementos", () => {
    const on = setIntro(base, { enabled: true });
    expect(on.screens.intro.enabled).toBe(true);
    expect(on.screens.intro.elements).toHaveLength(1);
    expect(on.screens.tour).toBe(base.screens.tour);
    const bg = setIntroBackground(on, { kind: "video", asset: "asset:v" });
    expect(bg.screens.intro.background).toEqual({ kind: "video", asset: "asset:v" });
    const bg2 = setIntroBackground(bg, { asset: undefined, color: "#000" });
    expect(bg2.screens.intro.background).toEqual({ kind: "video", color: "#000" });
  });

  it("la marca admite hasta 5 colores y al menos 1", () => {
    let d = base;
    for (let i = 0; i < 8; i++) d = addBrandColor(d, "#000000");
    expect(d.brand.colors).toHaveLength(5);
    expect(setBrandColor(d, 0, "#123456").brand.colors[0]).toBe("#123456");
    expect(setBrandColor(d, 9, "#123456")).toBe(d);
    expect(removeBrandColor(base, 0)).toBe(base);
    expect(removeBrandColor(d, 4).brand.colors).toHaveLength(4);
    expect(setBrandFont(base, "heading", "Manrope").brand.fonts.heading).toBe("Manrope");
  });
});

describe("assets borrados", () => {
  it("quita toda referencia a un asset y deja intacto lo demás", () => {
    const design = {
      brand: { logo: "asset:a1", colors: ["#fff"] },
      screens: {
        intro: { background: { kind: "video", asset: "asset:a1", poster: "asset:b2" }, elements: [{ id: "x", props: { asset: "asset:a1", alt: "logo" } }] },
        tour: { elements: [{ id: "y", props: { asset: "asset:b2" } }] },
      },
    };
    const next = stripAsset(design, "a1");
    expect(next.brand).toEqual({ colors: ["#fff"] });
    expect(next.screens.intro.background).toEqual({ kind: "video", poster: "asset:b2" });
    expect(next.screens.intro.elements[0].props).toEqual({ alt: "logo" });
    expect(next.screens.tour.elements[0].props.asset).toBe("asset:b2");
    expect(stripAsset(design, "zzz")).toBe(design); // nada que quitar: mismo objeto
  });
});
