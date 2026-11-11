import { describe, expect, it } from "vitest";
import { minLatFor, normalizeNadir, resolveAssetUrl } from "./nadir.js";

describe("normalizeNadir", () => {
  it("sin configuración: sin límite", () => {
    expect(normalizeNadir(undefined).mode).toBe("none");
    expect(normalizeNadir({ mode: "basura" }).mode).toBe("none");
  });

  it("rellena y acota los valores que faltan o vienen mal", () => {
    const n = normalizeNadir({ mode: "limit", limitDeg: -999, cover: { sizePct: 500, kind: "otra" } });
    expect(n.limitDeg).toBe(-85);
    expect(n.cover.sizePct).toBe(70);
    expect(n.cover.kind).toBe("color");
    expect(n.cover.color).toBe("#000000");
    expect(normalizeNadir({ mode: "limit" }).limitDeg).toBe(-60);
    expect(normalizeNadir({ mode: "limit", limitDeg: 20 }).limitDeg).toBe(0);
  });
});

describe("minLatFor", () => {
  it("none y cover: sin límite hasta el tope duro de -85", () => {
    expect(minLatFor(normalizeNadir({ mode: "none" }), 75)).toBe(-85);
    expect(minLatFor(normalizeNadir({ mode: "cover" }), 30)).toBe(-85);
  });

  it("limit: lat >= limitDeg + fov/2, así que acercar el zoom deja bajar más", () => {
    const cfg = normalizeNadir({ mode: "limit", limitDeg: -60 });
    expect(minLatFor(cfg, 75)).toBe(-22.5);
    expect(minLatFor(cfg, 30)).toBe(-45);
    expect(minLatFor(cfg, 100)).toBe(-10);
  });

  it("limit nunca baja de -85 ni sube de 85", () => {
    expect(minLatFor(normalizeNadir({ mode: "limit", limitDeg: -85 }), 30)).toBe(-70);
    expect(minLatFor({ mode: "limit", limitDeg: -85 }, 0)).toBe(-85);
  });
});

describe("resolveAssetUrl", () => {
  const doc = { assets: { abc: { url: "https://x/y.webp" } } };
  it("resuelve asset:<id> desde doc.assets", () => {
    expect(resolveAssetUrl("asset:abc", doc)).toBe("https://x/y.webp");
  });
  it("devuelve null si no existe o no es un asset", () => {
    expect(resolveAssetUrl("asset:nada", doc)).toBeNull();
    expect(resolveAssetUrl("https://otro", doc)).toBeNull();
    expect(resolveAssetUrl(null, doc)).toBeNull();
    expect(resolveAssetUrl("asset:abc", {})).toBeNull();
  });
});
