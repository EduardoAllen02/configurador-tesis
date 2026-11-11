import { describe, expect, it } from "vitest";
import { clampNum, isMobileWidth, mergeProps, touchSize, withAlphaOf } from "./common.js";
import { duplicatePayload, hotspotsToClear, setStyleProp, styleFromTemplate, withPreset, wrapLon } from "./styleOps.js";

describe("touchSize", () => {
  it("no cambia el tamaño en escritorio", () => expect(touchSize(74, false)).toBe(74));
  it("en móvil escala ×0.9", () => expect(touchSize(100, true)).toBe(90));
  it("en móvil nunca baja de 36 px", () => {
    expect(touchSize(30, true)).toBe(36);
    expect(touchSize(38, true)).toBe(36);
  });
});

describe("helpers de props", () => {
  it("isMobileWidth: solo bajo 720 px y con ancho conocido", () => {
    expect(isMobileWidth(719)).toBe(true);
    expect(isMobileWidth(720)).toBe(false);
    expect(isMobileWidth(0)).toBe(false);
  });
  it("mergeProps ignora null/undefined", () => {
    expect(mergeProps({ a: 1, b: 2 }, { a: undefined, b: null, c: 3 })).toEqual({ a: 1, b: 2, c: 3 });
  });
  it("withAlphaOf conserva el alfa de #rrggbbaa", () => {
    expect(withAlphaOf("#111f394d", "#ff0000")).toBe("#ff00004d");
    expect(withAlphaOf("#111f39", "#ff0000")).toBe("#ff0000");
    expect(withAlphaOf("rgba(0,0,0,.5)", "#ff0000")).toBe("#ff0000");
  });
  it("clampNum", () => {
    expect(clampNum("5", 0, 1, 0.5)).toBe(1);
    expect(clampNum(undefined, 0, 1, 0.5)).toBe(0.5);
  });
});

describe("styleOps", () => {
  it("styleFromTemplate copia los defaults", () => {
    const tpl = { id: "x", defaults: { size: 10 } };
    const style = styleFromTemplate(tpl);
    style.props.size = 99;
    expect(tpl.defaults.size).toBe(10);
    expect(style.template).toBe("x");
  });
  it("setStyleProp no muta", () => {
    const s = { template: "x", props: { a: 1 } };
    expect(setStyleProp(s, "a", 2).props.a).toBe(2);
    expect(s.props.a).toBe(1);
  });
  it("withPreset reemplaza solo el tipo pedido", () => {
    const d = withPreset({ hotspotPresets: { info: 1, nav: 2 }, x: 1 }, "info", 9);
    expect(d).toEqual({ hotspotPresets: { info: 9, nav: 2 }, x: 1 });
  });
  it("hotspotsToClear salta bloqueados, otros tipos, sin estilo y el actual", () => {
    const hs = [
      { id: "a", type: "info", style: {} },
      { id: "b", type: "info", style: {}, locked: true },
      { id: "c", type: "nav", style: {} },
      { id: "d", type: "info", style: null },
      { id: "e", type: "info", style: {} },
    ];
    expect(hotspotsToClear(hs, "info", "e").map((h) => h.id)).toEqual(["a"]);
  });
  it("wrapLon da la vuelta", () => {
    expect(wrapLon(185)).toBe(-175);
    expect(wrapLon(-185)).toBe(175);
    expect(wrapLon(10)).toBe(10);
  });
  it("duplicatePayload: +8°, copia estilo y título, desbloqueada", () => {
    const p = duplicatePayload({ type: "info", title: "Sala", lon: 176, lat: 3, style: { template: "x" }, locked: true, id: "z" });
    expect(p).toMatchObject({ type: "info", title: "Sala (copia)", lon: -176, lat: 3, style: { template: "x" } });
    expect(p.locked).toBeUndefined();
    expect(p.id).toBeUndefined();
  });
  it("duplicatePayload desplaza los keyframes", () => {
    const p = duplicatePayload({ type: "info", title: "t", lon: 0, lat: 0, segments: [{ from: 1, to: 5, keys: { 1: { lon: 10, lat: 2 } } }] });
    expect(p.segments[0].keys[1]).toEqual({ lon: 18, lat: 2 });
  });
});
