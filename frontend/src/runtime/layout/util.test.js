import { describe, expect, it } from "vitest";
import { entranceFor, gridStyle, mergeProps, numberOr, resolveAssetUrl, safeCssValue, scrimGradient } from "./util.js";

describe("mergeProps", () => {
  it("defaults + guardado, lo guardado manda", () => {
    expect(mergeProps({ defaults: { a: 1, b: 2 } }, { b: 3 })).toEqual({ a: 1, b: 3 });
    expect(mergeProps({ defaults: { a: 1 } }, null)).toEqual({ a: 1 });
    expect(mergeProps(null, undefined)).toEqual({});
  });
});

describe("entranceFor", () => {
  const tpl = { defaults: { animation: { kind: "none", delayMs: 0 } } };
  it("sin animación guardada en el HUD no anima", () => {
    expect(entranceFor({}, tpl)).toBeNull();
  });
  it("respeta lo guardado y su retraso", () => {
    expect(entranceFor({ animation: { kind: "fade", delayMs: 300 } }, tpl)).toEqual({ kind: "fade", delayMs: 300 });
  });
  it("en la intro, sin animación guardada: sube escalonado 180 + 85·i", () => {
    expect(entranceFor({}, tpl, { stagger: true, index: 0 })).toEqual({ kind: "rise", delayMs: 180 });
    expect(entranceFor({}, tpl, { stagger: true, index: 3 })).toEqual({ kind: "rise", delayMs: 180 + 85 * 3 });
  });
  it("un 'none' explícito apaga la animación incluso en la intro", () => {
    expect(entranceFor({ animation: { kind: "none" } }, tpl, { stagger: true, index: 1 })).toBeNull();
  });
  it("el retraso propio se suma al escalonado", () => {
    expect(entranceFor({ animation: { kind: "rise", delayMs: 100 } }, tpl, { stagger: true, index: 2 })).toEqual({
      kind: "rise",
      delayMs: 100 + 180 + 170,
    });
  });
  it("prefers-reduced-motion: nada", () => {
    expect(entranceFor({ animation: { kind: "rise" } }, tpl, { stagger: true, reduced: true })).toBeNull();
  });
  it("un tipo desconocido se ignora", () => {
    expect(entranceFor({ animation: { kind: "explode" } }, tpl)).toBeNull();
  });
});

describe("safeCssValue", () => {
  it("deja pasar colores normales", () => {
    expect(safeCssValue("rgba(20,37,68,.5)")).toBe("rgba(20,37,68,.5)");
    expect(safeCssValue("#fff")).toBe("#fff");
  });
  it("rechaza inyección", () => {
    expect(safeCssValue("red; } body { display:none", "x")).toBe("x");
    expect(safeCssValue("url(http://evil/x.png)", "x")).toBe("x");
    expect(safeCssValue("</style><script>", "x")).toBe("x");
    expect(safeCssValue(42, "x")).toBe("x");
  });
});

describe("numberOr", () => {
  it("acota y cae al valor por defecto", () => {
    expect(numberOr("12", 0)).toBe(12);
    expect(numberOr("zzz", 7)).toBe(7);
    expect(numberOr(500, 0, 0, 100)).toBe(100);
  });
});

describe("scrimGradient / gridStyle", () => {
  it("scrim por defecto: 90° en escritorio y 180° en móvil", () => {
    expect(scrimGradient({}, false).background).toContain("90deg");
    expect(scrimGradient({}, true).background).toContain("180deg");
  });
  it("usa colores y opacidad del diseño", () => {
    const r = scrimGradient({ from: "#000", to: "#111", angle: 45, opacity: 0.5 });
    expect(r.background).toBe("linear-gradient(45deg, #000 0%, #111 100%)");
    expect(r.opacity).toBe(0.5);
  });
  it("cuadrícula por defecto: 68 px y líneas a 0.055", () => {
    const g = gridStyle({});
    expect(g.backgroundSize).toBe("68px 68px");
    expect(g.backgroundImage).toContain("rgba(255,255,255,0.055)");
  });
  it("on:false la apaga", () => {
    expect(gridStyle({ on: false })).toBeNull();
  });
});

describe("resolveAssetUrl", () => {
  it("resuelve imágenes enlazadas del hotspot en app y export sin aceptar scripts", () => {
    expect(resolveAssetUrl({}, "http://localhost:4000/uploads/hotspots/a.webp")).toBe("http://localhost:4000/uploads/hotspots/a.webp");
    expect(resolveAssetUrl({}, "assets/hotspots/a.webp")).toBe("assets/hotspots/a.webp");
    expect(resolveAssetUrl({}, "blob:local-preview")).toBe("blob:local-preview");
    expect(resolveAssetUrl({}, "javascript:alert(1)")).toBeNull();
  });
  const doc = { assets: { abc: { url: "/uploads/a.mp4" } } };
  it("resuelve asset:<id>", () => {
    expect(resolveAssetUrl(doc, "asset:abc")).toBe("/uploads/a.mp4");
    expect(resolveAssetUrl(doc, "abc")).toBe("/uploads/a.mp4");
  });
  it("devuelve null si no existe", () => {
    expect(resolveAssetUrl(doc, "asset:nope")).toBeNull();
    expect(resolveAssetUrl(doc, null)).toBeNull();
    expect(resolveAssetUrl({}, "asset:abc")).toBeNull();
  });
});
