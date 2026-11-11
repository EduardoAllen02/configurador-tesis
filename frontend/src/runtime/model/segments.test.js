import { describe, expect, it } from "vitest";
import {
  defaultSegment,
  effectiveSegments,
  hotspotCoversFrame,
  hotspotPositionAt,
  normalizeSegments,
  positionInSegment,
  segmentAt,
  shortestLonDelta,
  withKey,
  withoutKey,
  withRange,
} from "./segments.js";

const seg = (from, to, keys = {}) => ({ from, to, keys });
const k = (lon, lat) => ({ lon, lat });

describe("shortestLonDelta", () => {
  it("toma el arco corto en ambos sentidos", () => {
    expect(shortestLonDelta(10, 40)).toBe(30);
    expect(shortestLonDelta(40, 10)).toBe(-30);
    expect(shortestLonDelta(170, -170)).toBe(20);
    expect(shortestLonDelta(-170, 170)).toBe(-20);
    expect(shortestLonDelta(5, 5)).toBe(0);
  });
});

describe("normalizeSegments", () => {
  it("ignora lo que no es un arreglo o está mal formado, sin lanzar", () => {
    expect(normalizeSegments(null)).toEqual([]);
    expect(normalizeSegments({ from: 1, to: 2 })).toEqual([]);
    expect(normalizeSegments([null, 5, { from: "a", to: 3 }, { from: 5, to: 2 }, { from: -1, to: 4 }])).toEqual([]);
  });

  it("recorta las keys al segmento y descarta las inválidas", () => {
    const [s] = normalizeSegments([
      seg(10, 20, { 5: k(1, 1), 10: k(30, -5), 18: k(42, -3), 25: k(9, 9), x: k(0, 0), 12: { lon: "a", lat: 0 } }),
    ]);
    expect(Object.keys(s.keys)).toEqual(["10", "18"]);
  });

  it("ordena por from y descarta los que se enciman (se queda el primero)", () => {
    const out = normalizeSegments([seg(30, 40), seg(10, 20), seg(15, 25), seg(21, 29), seg(40, 45)]);
    expect(out.map((s) => [s.from, s.to])).toEqual([
      [10, 20],
      [21, 29],
      [30, 40],
    ]);
  });

  it("recorta `to` al último cuadro del lote y descarta los que empiezan después", () => {
    const out = normalizeSegments([seg(10, 99), seg(120, 130)], 59);
    expect(out).toHaveLength(1);
    expect(out[0].to).toBe(59);
  });

  it("no muta la entrada", () => {
    const raw = [seg(10, 20, { 5: k(0, 0), 12: k(1, 1) })];
    const copy = JSON.parse(JSON.stringify(raw));
    normalizeSegments(raw);
    expect(raw).toEqual(copy);
  });
});

describe("positionInSegment", () => {
  const s = seg(10, 20, { 10: k(30, -5), 18: k(42, -3) });
  const fallback = { lon: 99, lat: 99 };

  it("usa la primera key antes de ella, y la última después", () => {
    const wide = seg(5, 30, { 10: k(30, -5), 18: k(42, -3) });
    expect(positionInSegment(wide, 5, fallback)).toEqual(k(30, -5));
    expect(positionInSegment(wide, 25, fallback)).toEqual(k(42, -3));
  });

  it("devuelve exactamente las keys en los cuadros clave", () => {
    expect(positionInSegment(s, 10, fallback)).toEqual(k(30, -5));
    expect(positionInSegment(s, 18, fallback)).toEqual(k(42, -3));
  });

  it("interpola lineal entre keys", () => {
    const mid = positionInSegment(s, 14, fallback);
    expect(mid.lon).toBeCloseTo(36, 10);
    expect(mid.lat).toBeCloseTo(-4, 10);
    expect(positionInSegment(s, 12, fallback).lon).toBeCloseTo(33, 10);
  });

  it("interpola por el arco corto cruzando ±180", () => {
    const wrap = seg(0, 10, { 0: k(170, 0), 10: k(-170, 10) });
    const mid = positionInSegment(wrap, 5, fallback);
    expect(Math.abs(mid.lon)).toBeCloseTo(180, 10); // 170 -> 190 = -170: pasa por 180, no por 0
    expect(mid.lat).toBeCloseTo(5, 10);
  });

  it("sin keys usa el lon/lat del hotspot", () => {
    expect(positionInSegment(seg(0, 5), 3, fallback)).toEqual(fallback);
  });

  it("avanza parejo entre las dos keys (sin saltos)", () => {
    let prev = positionInSegment(s, 10, fallback).lon;
    for (let f = 11; f <= 18; f++) {
      const lon = positionInSegment(s, f, fallback).lon;
      expect(lon - prev).toBeCloseTo(12 / 8, 10);
      prev = lon;
    }
  });
});

describe("cobertura y posición por hotspot", () => {
  const h = { lon: 1, lat: 2, segments: [seg(10, 20, { 10: k(30, -5), 18: k(42, -3) })] };

  it("con segmento: visible solo dentro del rango, sin importar el cuadro de origen", () => {
    expect(hotspotCoversFrame(h, 9, 3)).toBe(false);
    expect(hotspotCoversFrame(h, 10, 3)).toBe(true);
    expect(hotspotCoversFrame(h, 20, 3)).toBe(true);
    expect(hotspotCoversFrame(h, 21, 3)).toBe(false);
    expect(hotspotPositionAt(h, 9, 3)).toBeNull();
    expect(hotspotPositionAt(h, 18, 3)).toEqual(k(42, -3));
  });

  it("regla vieja: sin segmentos solo se ve en su cuadro, en lon/lat", () => {
    const old = { lon: 7, lat: 8, segments: null };
    expect(hotspotCoversFrame(old, 4, 4)).toBe(true);
    expect(hotspotCoversFrame(old, 5, 4)).toBe(false);
    expect(hotspotPositionAt(old, 4, 4)).toEqual(k(7, 8));
    // segmentos inválidos o vacíos tampoco rompen: vuelven a la regla vieja
    expect(hotspotCoversFrame({ ...old, segments: [] }, 4, 4)).toBe(true);
    expect(hotspotCoversFrame({ ...old, segments: [seg(9, 3)] }, 5, 4)).toBe(false);
  });

  it("effectiveSegments da un segmento virtual de un cuadro a los hotspots viejos", () => {
    const old = { lon: 7, lat: 8, segments: null };
    expect(effectiveSegments(old, 4)).toEqual([seg(4, 4, { 4: k(7, 8) })]);
    expect(effectiveSegments(h, 3)).toHaveLength(1);
    expect(effectiveSegments(old, -1)).toEqual([]);
  });
});

describe("edición", () => {
  const base = [seg(10, 20, { 10: k(30, -5) })];

  it("defaultSegment: 30 cuadros hacia delante, o hasta el último", () => {
    expect(defaultSegment(5, 59, k(1, 2))).toEqual(seg(5, 35, { 5: k(1, 2) }));
    expect(defaultSegment(50, 59, k(1, 2)).to).toBe(59);
  });

  it("withKey escribe o actualiza la key solo dentro de un segmento", () => {
    const a = withKey(base, 15, k(40, 0));
    expect(Object.keys(a[0].keys)).toEqual(["10", "15"]);
    expect(withKey(a, 15, k(41, 1))[0].keys["15"]).toEqual(k(41, 1));
    expect(withKey(base, 25, k(0, 0))).toEqual(normalizeSegments(base));
    expect(base[0].keys).toEqual({ 10: k(30, -5) }); // no muta
  });

  it("withoutKey quita la key", () => {
    expect(withoutKey(base, 10)[0].keys).toEqual({});
  });

  it("withRange recorta a los límites, a from <= to y a los vecinos; descarta keys fuera", () => {
    const two = [seg(10, 20, { 10: k(1, 1), 18: k(2, 2) }), seg(30, 40)];
    expect(withRange(two, 0, 12, 20, 59)[0].from).toBe(12);
    expect(Object.keys(withRange(two, 0, 12, 20, 59)[0].keys)).toEqual(["18"]);
    expect(withRange(two, 0, 10, 99, 59)[0].to).toBe(29); // no pisa al siguiente
    expect(withRange(two, 1, 5, 99, 59)[1].from).toBe(21);
    expect(withRange(two, 1, 5, 99, 59)[1].to).toBe(59);
    expect(withRange(two, 0, -5, 20, 59)[0].from).toBe(0);
    const inverted = withRange(two, 0, 25, 20, 59)[0];
    expect(inverted.from).toBeLessThanOrEqual(inverted.to);
  });

  it("segmentAt encuentra el segmento que cubre el cuadro", () => {
    expect(segmentAt(normalizeSegments(base), 14)).not.toBeNull();
    expect(segmentAt(normalizeSegments(base), 9)).toBeNull();
  });
});
