import { describe, expect, it } from "vitest";
import {
  angularDistance,
  cameraBasis,
  fillTileUrl,
  lonLatToDir,
  normalizeLon,
  patchCenter,
  pickReleases,
  visiblePatches,
} from "./tileMath.js";

const keys = (list) => list.map((p) => p.key);

describe("fillTileUrl", () => {
  it("reemplaza {c} y {r}", () => {
    expect(fillTileUrl("a/tile_{c}_{r}.avif", 3, 2)).toBe("a/tile_3_2.avif");
  });
});

describe("patchCenter", () => {
  it("el mosaico central de 8x4 queda frente a lon -90/+90 y al ecuador", () => {
    // u = 0.5 (borde entre columnas 3 y 4) ↔ lon = 90 − 180 = −90
    const left = patchCenter(3, 1, 8, 4);
    const right = patchCenter(4, 1, 8, 4);
    expect(left.lat).toBeCloseTo(22.5);
    expect(right.lat).toBeCloseTo(22.5);
    expect(normalizeLon(left.lon - right.lon)).toBeCloseTo(45);
  });
  it("la columna 0 está centrada en u=1/16 → lon 67.5", () => {
    expect(patchCenter(0, 0, 8, 4)).toEqual({ lon: 67.5, lat: 67.5 });
  });
});

describe("angularDistance", () => {
  it("es 0 consigo misma y 180 entre opuestos", () => {
    expect(angularDistance(30, 10, 30, 10)).toBeCloseTo(0);
    expect(angularDistance(0, 0, 180, 0)).toBeCloseTo(180);
  });
  it("atraviesa el antimeridiano por el lado corto", () => {
    expect(angularDistance(179, 0, -179, 0)).toBeCloseTo(2);
  });
});

describe("cameraBasis", () => {
  it("es ortonormal, también cerca del polo", () => {
    for (const [lon, lat] of [[0, 0], [123, -40], [10, 89.9], [0, 90]]) {
      const { forward, right, up } = cameraBasis(lon, lat);
      const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
      expect(dot(forward, forward)).toBeCloseTo(1);
      expect(dot(right, right)).toBeCloseTo(1);
      expect(dot(up, up)).toBeCloseTo(1);
      expect(dot(forward, right)).toBeCloseTo(0);
      expect(dot(forward, up)).toBeCloseTo(0);
      expect(dot(right, up)).toBeCloseTo(0);
    }
  });
});

describe("visiblePatches", () => {
  const base = { cols: 8, rows: 4, fov: 75, aspect: 16 / 9, marginDeg: 0 };

  it("mirando al frente ve pocos mosaicos y no los de atrás", () => {
    const v = visiblePatches({ ...base, lon: 0, lat: 0 });
    expect(v.length).toBeGreaterThan(0);
    expect(v.length).toBeLessThan(16);
    // el punto de atrás (lon 180) no puede estar visible
    expect(v.every((p) => angularDistance(0, 0, patchCenter(p.c, p.r, 8, 4).lon, patchCenter(p.c, p.r, 8, 4).lat) < 120)).toBe(true);
  });

  it("con un fov muy angosto y la vista dentro de un mosaico, ese mosaico es el único (aunque ninguna esquina esté en pantalla)", () => {
    const center = patchCenter(2, 1, 8, 4);
    const v = visiblePatches({ ...base, fov: 20, aspect: 1, lon: center.lon, lat: center.lat });
    expect(keys(v)).toEqual(["2_1"]);
  });

  it("ordena por cercanía al centro de la vista", () => {
    const v = visiblePatches({ ...base, lon: 40, lat: 10, marginDeg: 10 });
    for (let i = 1; i < v.length; i++) expect(v[i].dist).toBeGreaterThanOrEqual(v[i - 1].dist);
    const center = patchCenter(v[0].c, v[0].r, 8, 4);
    expect(angularDistance(40, 10, center.lon, center.lat)).toBeCloseTo(v[0].dist);
  });

  it("girar 180° cambia por completo el conjunto visible", () => {
    const a = new Set(keys(visiblePatches({ ...base, lon: 0, lat: 0 })));
    const b = new Set(keys(visiblePatches({ ...base, lon: 180, lat: 0 })));
    expect([...a].filter((k) => b.has(k))).toEqual([]);
  });

  it("el margen amplía el conjunto", () => {
    const sin = visiblePatches({ ...base, lon: 0, lat: 0 });
    const con = visiblePatches({ ...base, lon: 0, lat: 0, marginDeg: 25 });
    expect(con.length).toBeGreaterThan(sin.length);
    const conKeys = new Set(keys(con));
    expect(keys(sin).every((k) => conKeys.has(k))).toBe(true);
  });

  it("mirando al cenit entran las 8 columnas de la fila de arriba", () => {
    const v = visiblePatches({ ...base, lon: 0, lat: 89 });
    const top = v.filter((p) => p.r === 0);
    expect(top.length).toBe(8);
  });

  it("con un fov enorme se ve al menos medio mundo", () => {
    const v = visiblePatches({ ...base, fov: 170, aspect: 2, lon: 0, lat: 0, marginDeg: 20 });
    expect(v.length).toBeGreaterThanOrEqual(16);
  });

  it("un punto cualquiera de la vista siempre pertenece a un mosaico visible", () => {
    const view = { ...base, lon: -75, lat: 20, marginDeg: 0 };
    const visible = new Set(keys(visiblePatches(view)));
    // rayos hacia varios puntos dentro del campo: su mosaico (por u/v) debe estar en el conjunto
    for (const [dl, dt] of [[0, 0], [20, 10], [-25, -15], [30, 20], [-30, 20]]) {
      const lon = view.lon + dl;
      const lat = view.lat + dt;
      const u = (((90 - lon) / 360) % 1 + 1) % 1;
      const v = (90 - lat) / 180;
      const c = Math.min(7, Math.floor(u * 8));
      const r = Math.min(3, Math.floor(v * 4));
      expect(visible.has(`${c}_${r}`)).toBe(true);
    }
  });
});

describe("pickReleases", () => {
  it("nunca libera visibles y conserva los extras más cercanos", () => {
    const loaded = [
      { key: "a", dist: 10 },
      { key: "b", dist: 20 },
      { key: "c", dist: 90 },
      { key: "d", dist: 120 },
      { key: "e", dist: 170 },
    ];
    const out = pickReleases(loaded, new Set(["a", "e"]), 1);
    expect(out.sort()).toEqual(["c", "d"]);
  });
  it("no libera nada si cabe", () => {
    expect(pickReleases([{ key: "a", dist: 1 }], new Set(), 8)).toEqual([]);
  });
});

describe("lonLatToDir", () => {
  it("coincide con lonLatToVec3: lon 0 → +Z, lon 90 → +X", () => {
    const [x, , z] = lonLatToDir(0, 0);
    expect(x).toBeCloseTo(0);
    expect(z).toBeCloseTo(1);
    expect(lonLatToDir(90, 0)[0]).toBeCloseTo(1);
  });
});
