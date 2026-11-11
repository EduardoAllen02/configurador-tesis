import { describe, expect, it } from "vitest";
import { buildModel } from "./tourModel.js";
import { hotspotsForFrame } from "./frameHotspots.js";

const frame = (id, orderIndex) => ({
  id,
  origen: "video_frame",
  batchId: "vid",
  videoUploadId: "vid",
  orderIndex,
  image: { webp: `/${id}.webp` },
});
const pano = (id) => ({
  id,
  origen: "panorama_upload",
  batchId: null,
  videoUploadId: null,
  orderIndex: 0,
  image: { webp: `/${id}.webp` },
});
const hs = (id, sceneId, extra = {}) => ({ id, sceneId, type: "info", lon: 10, lat: 5, title: id, segments: null, ...extra });
const frames = Array.from({ length: 30 }, (_, i) => frame(`f${i}`, i));

function run(hotspots, scenes, index, batchIndex = 0) {
  const model = buildModel({ scenes, hotspots });
  return hotspotsForFrame(model, model.batches[batchIndex], index);
}
const ids = (placed) => placed.map((p) => p.hotspot.id);

describe("hotspotsForFrame: video con segmentos", () => {
  const seg = { from: 10, to: 20, keys: { 10: { lon: 30, lat: -5 }, 18: { lon: 42, lat: -3 } } };
  const hotspots = [hs("a", "f10", { segments: [seg] })];

  it("es invisible en 9 y 21, y visible de 10 a 20", () => {
    expect(ids(run(hotspots, frames, 9))).toEqual([]);
    expect(ids(run(hotspots, frames, 21))).toEqual([]);
    for (let f = 10; f <= 20; f++) expect(ids(run(hotspots, frames, f))).toEqual(["a"]);
  });

  it("su posición se interpola entre las keys y se queda quieta fuera de ellas", () => {
    expect(run(hotspots, frames, 10)[0]).toMatchObject({ lon: 30, lat: -5 });
    expect(run(hotspots, frames, 14)[0].lon).toBeCloseTo(36, 10);
    expect(run(hotspots, frames, 18)[0]).toMatchObject({ lon: 42, lat: -3 });
    expect(run(hotspots, frames, 20)[0]).toMatchObject({ lon: 42, lat: -3 });
  });

  it("un hotspot anclado a otro cuadro del lote se ve en cuadros ajenos a su sceneId", () => {
    const h = hs("b", "f2", { segments: [{ from: 25, to: 29, keys: {} }] });
    expect(ids(run([h], frames, 2))).toEqual([]);
    expect(ids(run([h], frames, 27))).toEqual(["b"]);
    expect(run([h], frames, 27)[0]).toMatchObject({ lon: 10, lat: 5 }); // sin keys: lon/lat del hotspot
  });

  it("varios segmentos: el hotspot reaparece en el segundo", () => {
    const h = hs("c", "f0", {
      segments: [
        { from: 0, to: 3, keys: {} },
        { from: 8, to: 9, keys: {} },
      ],
    });
    expect([0, 3, 5, 8, 9, 10].map((f) => ids(run([h], frames, f)).length)).toEqual([1, 1, 0, 1, 1, 0]);
  });

  it("un segmento mal formado se ignora y el tour sigue funcionando (regla vieja)", () => {
    const bad = hs("d", "f4", { segments: [{ from: 9, to: 3 }, "x"] });
    expect(ids(run([bad], frames, 4))).toEqual(["d"]);
    expect(ids(run([bad], frames, 5))).toEqual([]);
  });

  it("el orden es estable al pasar de un cuadro a otro", () => {
    const all = [{ from: 0, to: 29, keys: {} }];
    const hotspots2 = [hs("x", "f9", { segments: all }), hs("y", "f1", { segments: all })];
    expect(ids(run(hotspots2, frames, 3))).toEqual(ids(run(hotspots2, frames, 20)));
  });
});

describe("hotspotsForFrame: regla vieja (sin segmentos)", () => {
  it("un hotspot sin segmentos se ve solo en su cuadro, en su lon/lat", () => {
    const hotspots = [hs("old", "f7")];
    expect(ids(run(hotspots, frames, 6))).toEqual([]);
    expect(run(hotspots, frames, 7)).toEqual([{ hotspot: hotspots[0], lon: 10, lat: 5 }]);
    expect(ids(run(hotspots, frames, 8))).toEqual([]);
  });

  it("conviven viejos y nuevos en el mismo cuadro", () => {
    const hotspots = [hs("old", "f12"), hs("new", "f0", { segments: [{ from: 10, to: 15, keys: {} }] })];
    expect(ids(run(hotspots, frames, 12)).sort()).toEqual(["new", "old"]);
  });
});

describe("hotspotsForFrame: panorámicas y bordes", () => {
  it("las panorámicas no cambian: solo los hotspots de su escena, ignorando segments", () => {
    const scenes = [pano("p1"), pano("p2")];
    const hotspots = [hs("a", "p1"), hs("b", "p2"), hs("c", "p1", { segments: [{ from: 0, to: 5, keys: {} }] })];
    expect(ids(run(hotspots, scenes, 0, 0))).toEqual(["a", "c"]);
    expect(ids(run(hotspots, scenes, 0, 1))).toEqual(["b"]);
  });

  it("un hotspot de panorámica no aparece en un lote de video", () => {
    const scenes = [pano("p1"), ...frames];
    const hotspots = [hs("a", "p1", { segments: [{ from: 0, to: 29, keys: {} }] })];
    expect(ids(run(hotspots, scenes, 5, 1))).toEqual([]);
  });

  it("cuadro fuera del lote o lote vacío devuelve []", () => {
    const model = buildModel({ scenes: frames, hotspots: [] });
    expect(hotspotsForFrame(model, model.batches[0], 99)).toEqual([]);
    expect(hotspotsForFrame(model, null, 0)).toEqual([]);
  });
});
