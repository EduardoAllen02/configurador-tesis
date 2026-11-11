import { describe, expect, it } from "vitest";
import {
  batchKeyOf,
  buildModel,
  buildPickerEntries,
  effectiveHotspotStyle,
  resolveInitial,
  visibleHotspots,
} from "./tourModel.js";

const scene = (id, extra = {}) => ({
  id,
  name: null,
  label: `Escena ${id}`,
  origen: "panorama_upload",
  batchId: null,
  videoUploadId: null,
  orderIndex: 0,
  image: { webp: `/u/${id}.webp` },
  ...extra,
});
const frame = (id, orderIndex, extra = {}) =>
  scene(id, { origen: "video_frame", videoUploadId: "vid1", batchId: "vid1", orderIndex, ...extra });
const hs = (id, sceneId, extra = {}) => ({ id, sceneId, type: "info", lon: 0, lat: 0, title: id, style: null, ...extra });

describe("lotes", () => {
  it("agrupa por batchId, o por videoUploadId si no hay batchId, y ordena por orderIndex", () => {
    const doc = {
      scenes: [
        frame("f3", 2),
        scene("pano", { orderIndex: 0 }),
        frame("f1", 0),
        frame("viejo-b", 5, { batchId: null, videoUploadId: "legacy" }),
        frame("f2", 1),
        frame("viejo-a", 4, { batchId: null, videoUploadId: "legacy" }),
      ],
    };
    const model = buildModel(doc);
    const byKey = Object.fromEntries(model.batches.map((b) => [b.key, b.scenes.map((s) => s.id)]));
    expect(byKey["vid1"]).toEqual(["f1", "f2", "f3"]);
    expect(byKey["legacy"]).toEqual(["viejo-a", "viejo-b"]);
    expect(byKey["scene:pano"]).toEqual(["pano"]);
    expect(model.batches).toHaveLength(3);
  });

  it("una escena sin lote es un lote de 1; batchId manda sobre videoUploadId", () => {
    expect(batchKeyOf(scene("x"))).toBe("scene:x");
    expect(batchKeyOf(frame("x", 0, { batchId: "b", videoUploadId: "v" }))).toBe("b");
    expect(batchKeyOf(frame("x", 0, { batchId: null, videoUploadId: "v" }))).toBe("v");
  });

  it("panorámicas subidas en lote (mismo batchId) siguen siendo escenas sueltas, sin scrubber", () => {
    const model = buildModel({
      scenes: [scene("p1", { batchId: "subida", orderIndex: 0 }), scene("p2", { batchId: "subida", orderIndex: 1 })],
    });
    expect(model.batches.map((b) => b.key)).toEqual(["scene:p1", "scene:p2"]);
  });

  it("batchByScene da lote y posición de cada escena", () => {
    const model = buildModel({ scenes: [frame("f1", 0), frame("f2", 1)] });
    expect(model.batchByScene.get("f2").index).toBe(1);
    expect(model.batchByScene.get("f2").batch.key).toBe("vid1");
  });
});

describe("visibilidad de hotspots por cuadro", () => {
  const doc = {
    scenes: [frame("f1", 0), frame("f2", 1), frame("f3", 2)],
    hotspots: [hs("h1", "f1"), hs("h2", "f3"), hs("h3", "f3")],
  };
  const model = buildModel(doc);

  it("un hotspot solo se ve en el cuadro de su sceneId", () => {
    expect(visibleHotspots(model, "f1").map((h) => h.id)).toEqual(["h1"]);
    expect(visibleHotspots(model, "f2")).toEqual([]);
    expect(visibleHotspots(model, "f3").map((h) => h.id)).toEqual(["h2", "h3"]);
  });

  it("escena inexistente no devuelve nada", () => {
    expect(visibleHotspots(model, "nope")).toEqual([]);
  });
});

describe("estilo efectivo del hotspot", () => {
  const design = { hotspotPresets: { info: { template: "circle-icon", props: { fill: "red" } } } };
  it("usa hotspot.style si existe", () => {
    const style = { template: "circle-icon", props: { fill: "blue" } };
    expect(effectiveHotspotStyle({ type: "info", style }, design)).toBe(style);
  });
  it("si no, el preset de su tipo", () => {
    expect(effectiveHotspotStyle({ type: "info", style: null }, design)).toBe(design.hotspotPresets.info);
  });
  it("sin preset devuelve null", () => {
    expect(effectiveHotspotStyle({ type: "nav", style: null }, design)).toBeNull();
  });
});

describe("selector de escenas", () => {
  it("una entrada por lote de video más una por panorámica, sin etiquetas en blanco", () => {
    const frames = Array.from({ length: 60 }, (_, i) => frame(`f${i}`, i, { label: "" }));
    const model = buildModel({ scenes: [scene("pano", { label: "Sala", name: "Sala", orderIndex: -1 }), ...frames] });
    const entries = buildPickerEntries(model);
    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({ sceneId: "pano", label: "Sala", count: 1 });
    expect(entries[1].sceneId).toBe("f0");
    expect(entries[1].count).toBe(60);
    entries.forEach((e) => expect(e.label.trim()).not.toBe(""));
  });

  it("usa el nombre del primer cuadro si lo tiene", () => {
    const model = buildModel({ scenes: [frame("f0", 0, { name: "Recorrido de entrada" }), frame("f1", 1)] });
    expect(buildPickerEntries(model)[0].label).toBe("Recorrido de entrada");
  });
});

describe("arranque", () => {
  const model = buildModel({ scenes: [scene("pano"), frame("f1", 1), frame("f2", 2), frame("f3", 3)] });

  it("sin parámetros abre la primera escena", () => {
    expect(resolveInitial(model)).toMatchObject({ frameIndex: 0 });
    expect(resolveInitial(model).batch.key).toBe("scene:pano");
  });

  it("initialSceneId abre el lote EN ese cuadro, no en el 0", () => {
    const r = resolveInitial(model, { initialSceneId: "f3" });
    expect(r.batch.key).toBe("vid1");
    expect(r.frameIndex).toBe(2);
  });

  it("initialFrame manda y se recorta al lote", () => {
    expect(resolveInitial(model, { initialSceneId: "f1", initialFrame: 1 }).frameIndex).toBe(1);
    expect(resolveInitial(model, { initialSceneId: "f1", initialFrame: 99 }).frameIndex).toBe(2);
  });

  it("un initialSceneId desconocido cae en la primera escena; documento vacío devuelve null", () => {
    expect(resolveInitial(model, { initialSceneId: "zzz" }).batch.key).toBe("scene:pano");
    expect(resolveInitial(buildModel({ scenes: [] }))).toBeNull();
  });
});
