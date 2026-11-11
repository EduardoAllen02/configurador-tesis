import { describe, expect, it } from "vitest";
import { axesForAnchor, handlesFor, pointInRect, rectsIntersect, resizeRect, unionRect } from "./gestures.js";

const R = { left: 100, top: 100, width: 200, height: 100 };

describe("resizeRect", () => {
  it("manija este: crece a la derecha, el borde izquierdo no se mueve", () => {
    expect(resizeRect(R, "e", 50, 99)).toEqual({ left: 100, top: 100, width: 250, height: 100 });
  });
  it("manija oeste: el borde derecho queda fijo", () => {
    const r = resizeRect(R, "w", -40, 0);
    expect(r.left).toBe(60);
    expect(r.left + r.width).toBe(300);
  });
  it("manija noroeste mueve arriba e izquierda", () => {
    expect(resizeRect(R, "nw", -20, -10)).toEqual({ left: 80, top: 90, width: 220, height: 110 });
  });
  it("Shift conserva la proporción en esquinas", () => {
    const r = resizeRect(R, "se", 100, 5, { shift: true });
    expect(r.width / r.height).toBeCloseTo(2, 6);
    expect(r.width).toBe(282);
    expect(r.left).toBe(100);
    expect(r.top).toBe(100);
  });
  it("Shift en esquina noroeste ancla la esquina opuesta", () => {
    const r = resizeRect(R, "nw", -100, 0, { shift: true });
    expect(r.left + r.width).toBe(300);
    expect(r.top + r.height).toBe(200);
    expect(r.width / r.height).toBeCloseTo(2, 6);
  });
  it("Alt crece desde el centro", () => {
    const r = resizeRect(R, "e", 30, 0, { alt: true });
    expect(r.width).toBe(260);
    expect(r.left + r.width / 2).toBe(200);
    expect(r.top).toBe(100);
  });
  it("Alt en esquina crece en ambos ejes", () => {
    expect(resizeRect(R, "se", 10, 10, { alt: true })).toEqual({ left: 90, top: 90, width: 220, height: 120 });
  });
  it("respeta el tamaño mínimo y no se invierte", () => {
    const r = resizeRect(R, "e", -500, 0, { min: 12 });
    expect(r.width).toBe(12);
    expect(r.left).toBe(100);
    const l = resizeRect(R, "w", 500, 0, { min: 12 });
    expect(l.width).toBe(12);
    expect(l.left + l.width).toBe(300);
  });
  it("el mínimo con proporción no deforma", () => {
    const r = resizeRect(R, "se", -500, -500, { shift: true, min: 12 });
    expect(r.width / r.height).toBeCloseTo(2, 6);
    expect(Math.min(r.width, r.height)).toBeGreaterThanOrEqual(12 - 1e-9);
  });
  it("una manija lateral no toca el otro eje", () => {
    const r = resizeRect(R, "n", 0, -30);
    expect(r.left).toBe(100);
    expect(r.width).toBe(200);
    expect(r.top).toBe(70);
    expect(r.height).toBe(130);
  });
});

describe("axesForAnchor / handlesFor", () => {
  it("barra superior: solo vertical", () => {
    expect(axesForAnchor("stretch-top")).toEqual({ moveX: false, moveY: true, resizeX: false, resizeY: true });
    expect(handlesFor({ anchor: "stretch-top" })).toEqual(["n", "s"]);
  });
  it("barra izquierda: solo horizontal", () => {
    expect(handlesFor({ anchor: "stretch-left" })).toEqual(["e", "w"]);
  });
  it("ocupa todo: ninguna manija", () => {
    expect(handlesFor({ anchor: "stretch-fill" })).toEqual([]);
  });
  it("ancla puntual: las 8", () => {
    expect(handlesFor({ anchor: "center" })).toHaveLength(8);
  });
  it("ajustado al contenido: esquinas para escala y laterales para ancho", () => {
    expect(handlesFor({ anchor: "top-left", fit: "content" }).sort()).toEqual(["e", "ne", "nw", "se", "sw", "w"]);
  });
  it("bloqueado: ninguna", () => {
    expect(handlesFor({ anchor: "center", locked: true })).toEqual([]);
  });
});

describe("rects", () => {
  it("unión", () => {
    expect(unionRect([R, { left: 0, top: 150, width: 50, height: 400 }])).toEqual({ left: 0, top: 100, width: 300, height: 450 });
    expect(unionRect([])).toBeNull();
  });
  it("intersección", () => {
    expect(rectsIntersect(R, { left: 250, top: 150, width: 100, height: 100 })).toBe(true);
    expect(rectsIntersect(R, { left: 300, top: 100, width: 10, height: 10 })).toBe(false);
  });
  it("punto dentro", () => {
    expect(pointInRect(150, 150, R)).toBe(true);
    expect(pointInRect(301, 150, R)).toBe(false);
  });
});

it("a slight corner wobble does not jump the scale of a wide text box", () => {
  const text = { left: 0, top: 0, width: 400, height: 25 };
  const first = resizeRect(text, "se", 3, 3, { shift: true });
  expect(first.width / text.width).toBeLessThan(1.01);
  const next = resizeRect(text, "se", 4, 3, { shift: true });
  expect(next.width - first.width).toBeLessThan(1.01);
  expect(next.width / next.height).toBeCloseTo(16);
  const back = resizeRect(text, "se", 0, 0, { shift: true });
  expect(back).toEqual(text);
});
