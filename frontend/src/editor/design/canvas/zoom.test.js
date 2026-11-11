import { describe, expect, it } from "vitest";
import {
  SLIDER_MAX,
  SLIDER_MIN,
  ZOOM_MAX,
  ZOOM_MIN,
  centerPan,
  clampPan,
  fitZoom,
  sliderToZoom,
  stepZoom,
  wheelFactor,
  zoomAround,
  zoomToSlider,
} from "./zoom.js";

describe("slider logarítmico", () => {
  it("cubre 10 %–500 %", () => {
    expect(sliderToZoom(SLIDER_MIN)).toBeCloseTo(ZOOM_MIN, 6);
    expect(sliderToZoom(SLIDER_MAX)).toBeCloseTo(ZOOM_MAX, 6);
  });
  it("ida y vuelta", () => {
    [0.1, 0.25, 0.59, 1, 2.5, 5].forEach((z) => expect(sliderToZoom(zoomToSlider(z))).toBeCloseTo(z, 6));
  });
  it("el medio del slider es la media geométrica, no la aritmética", () => {
    expect(sliderToZoom((SLIDER_MIN + SLIDER_MAX) / 2)).toBeCloseTo(Math.sqrt(0.1 * 5), 6);
  });
  it("fuera de rango se acota", () => {
    expect(sliderToZoom(10)).toBe(ZOOM_MAX);
    expect(sliderToZoom(-10)).toBe(ZOOM_MIN);
  });
});

describe("fitZoom", () => {
  it("encoge para caber con margen", () => {
    expect(fitZoom(1000, 600, 1440, 900, 48)).toBeCloseTo(Math.min(952 / 1440, 552 / 900), 6);
  });
  it("no pasa de 100 %", () => {
    expect(fitZoom(4000, 3000, 1440, 900)).toBe(1);
  });
  it("área sin tamaño: 100 %", () => {
    expect(fitZoom(0, 0, 1440, 900)).toBe(1);
  });
  it("no baja de 10 %", () => {
    expect(fitZoom(100, 100, 1440, 900)).toBe(ZOOM_MIN);
  });
});

describe("zoomAround", () => {
  it("el punto bajo el cursor no se mueve", () => {
    const view = { zoom: 0.5, x: 100, y: 40 };
    const cx = 420;
    const cy = 300;
    const before = { x: (cx - view.x) / view.zoom, y: (cy - view.y) / view.zoom };
    const next = zoomAround(view, 1.25, cx, cy);
    expect((cx - next.x) / next.zoom).toBeCloseTo(before.x, 6);
    expect((cy - next.y) / next.zoom).toBeCloseTo(before.y, 6);
    expect(next.zoom).toBe(1.25);
  });
  it("acota el zoom", () => {
    expect(zoomAround({ zoom: 1, x: 0, y: 0 }, 99, 0, 0).zoom).toBe(ZOOM_MAX);
  });
});

describe("clampPan", () => {
  it("si la mesa cabe, queda centrada", () => {
    expect(clampPan(7, 9, 0.5, 1000, 600, 1440, 900)).toEqual(centerPan(0.5, 1000, 600, 1440, 900));
  });
  it("si no cabe, no se aleja más del margen", () => {
    const p = clampPan(500, 500, 1, 1000, 600, 1440, 900, 48);
    expect(p).toEqual({ x: 48, y: 48 });
    const q = clampPan(-5000, -5000, 1, 1000, 600, 1440, 900, 48);
    expect(q).toEqual({ x: 1000 - 1440 - 48, y: 600 - 900 - 48 });
  });
});

describe("stepZoom", () => {
  it("sube y baja por niveles", () => {
    expect(stepZoom(1, 1)).toBe(1.25);
    expect(stepZoom(1, -1)).toBe(0.75);
    expect(stepZoom(0.59, 1)).toBe(0.75);
    expect(stepZoom(0.59, -1)).toBe(0.5);
  });
  it("respeta los topes", () => {
    expect(stepZoom(5, 1)).toBe(5);
    expect(stepZoom(0.1, -1)).toBe(0.1);
  });
});

describe("wheelFactor", () => {
  it("rueda hacia arriba acerca, hacia abajo aleja", () => {
    expect(wheelFactor(-100)).toBeGreaterThan(1);
    expect(wheelFactor(100)).toBeLessThan(1);
    expect(wheelFactor(0)).toBe(1);
  });
});
