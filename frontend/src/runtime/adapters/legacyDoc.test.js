import { describe, expect, it } from "vitest";
import { buildDocFromLegacy, deriveDesign } from "./legacyDoc.js";

const resolveUrl = (p) => `http://api.test${p}`;

describe("deriveDesign", () => {
  it("sin theme ni customTexts usa los defaults del contrato", () => {
    const d = deriveDesign(null, null);
    expect(d.version).toBe(1);
    expect(d.brand.colors).toEqual(["#4da3ff", "#ffffff", "#111111"]);
    expect(d.brand.radius).toBe(8);
    expect(d.detailPanel).toEqual({ template: "floating-card", props: { tone: "dark" } });
    const topbar = d.screens.tour.elements.find((e) => e.id === "topbar");
    expect(topbar.props).toEqual({ subtitle: "", showScenePicker: true });
    expect(d.hotspotPresets.info.props.fill).toBe("#4da3ff");
  });

  it("deriva acento, radio, tono y subtítulo de theme y customTexts", () => {
    const d = deriveDesign(
      { accentColor: "#e0392b", borderRadius: 18, tooltipStyle: "light" },
      { welcomeMessage: "Bienvenido" }
    );
    expect(d.brand.colors[0]).toBe("#e0392b");
    expect(d.brand.radius).toBe(18);
    expect(d.detailPanel.props.tone).toBe("light");
    expect(d.hotspotPresets.info.props.fill).toBe("#e0392b");
    expect(d.screens.tour.elements.find((e) => e.id === "topbar").props.subtitle).toBe("Bienvenido");
  });

  it("price y nav conservan su color y glifo fijos; info toma el acento", () => {
    const { hotspotPresets: p } = deriveDesign({ accentColor: "#123456" }, null);
    expect(p.price.props).toMatchObject({ fill: "rgba(165,104,14,.88)", glyph: "$", iconColor: "#ffffff" });
    expect(p.nav.props).toMatchObject({ fill: "rgba(47,111,237,.88)", glyph: "→" });
    expect(p.info.props).toMatchObject({ fill: "#123456", glyph: "i" });
  });

  it("borderRadius 0 es válido (no cae al default)", () => {
    expect(deriveDesign({ borderRadius: 0 }, null).brand.radius).toBe(0);
  });

  it("incluye topbar y scrubber con los frames del contrato", () => {
    const els = deriveDesign(null, null).screens.tour.elements;
    expect(els.map((e) => e.template)).toEqual(["basic-topbar", "frame-scrubber"]);
    expect(els[0].frame).toMatchObject({ anchor: "stretch-top", h: 56 });
    expect(els[1].frame).toMatchObject({ anchor: "stretch-bottom", x: 16, y: 16, h: 32 });
  });
});

describe("buildDocFromLegacy", () => {
  const tour = { id: "t1", title: "Tour", description: null, theme: { accentColor: "#e0392b" }, customTexts: null };
  const scenes = [
    { id: "b", name: null, origen: "video_frame", webpPath: "/uploads/f/2.webp", orderIndex: 1, batchId: "v", videoUploadId: "v" },
    { id: "a", name: "Sala", origen: "panorama_upload", webpPath: "/uploads/p/a.webp", orderIndex: 0, initialYaw: 12 },
  ];
  const hotspots = [
    { id: "h1", sceneId: "a", type: "price", lon: 1, lat: 2, title: "T", price: "$1", imagePath: "/uploads/h.webp" },
    { id: "h2", sceneId: "a", type: "nav", lon: 3, lat: 4, title: "N", targetSceneId: "b" },
  ];
  const doc = buildDocFromLegacy({ tour, scenes, hotspots, resolveUrl });

  it("ordena escenas por orderIndex, con label como sceneLabel y URLs resueltas", () => {
    expect(doc.scenes.map((s) => s.id)).toEqual(["a", "b"]);
    expect(doc.scenes[0]).toMatchObject({
      label: "Sala",
      image: { webp: "http://api.test/uploads/p/a.webp", tiles: null },
      initialYaw: 12,
      initialPitch: 0,
      batchId: null,
      groupId: null,
      plan: null,
    });
    expect(doc.scenes[1].label).toBe("Escena 2");
  });

  it("mapea hotspots con image resuelta y columnas nuevas en su valor neutro", () => {
    expect(doc.hotspots[0]).toMatchObject({
      image: "http://api.test/uploads/h.webp",
      style: null,
      locked: false,
      segments: null,
      content: null,
      description: null,
    });
    expect(doc.hotspots[1]).toMatchObject({ image: null, targetSceneId: "b", price: null });
  });

  it("forma general del documento", () => {
    expect(doc).toMatchObject({ schema: 1, tour: { id: "t1", title: "Tour", description: null }, groups: [], assets: {} });
    expect(doc.design.brand.colors[0]).toBe("#e0392b");
  });

  it("respeta tour.design cuando ya existe", () => {
    const design = { version: 1, custom: true };
    expect(buildDocFromLegacy({ tour: { ...tour, design }, scenes, resolveUrl }).design).toBe(design);
  });
});
