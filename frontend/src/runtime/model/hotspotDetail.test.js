import { describe, expect, it } from "vitest";
import { createHotspotDetail, detailElements, detailFrame, detailOf, editableHotspotDetail, replaceDetailTemplate } from "./hotspotDetail.js";

describe("detalle propio del hotspot", () => {
  it("las recetas son grupos independientes con datos enlazados, no copias del contenido", () => {
    const a = createHotspotDetail("product", "price"), b = createHotspotDetail("product", "price");
    expect(a.elements[0].template).toBe("group");
    expect(a.elements[0].id).not.toBe(b.elements[0].id);
    expect(a.elements[0].children.map((piece) => piece.bind)).toEqual(["image", "title", "price", "description"]);
    expect(a.elements[0].children.find((piece) => piece.bind === "title").props.text).toBe("");
  });
  it("navegación conserva su salto con el detalle apagado por defecto", () => {
    expect(createHotspotDetail("text", "nav").enabled).toBe(false);
    expect(detailOf({ content: { panelId: "old" } })).toBeNull();
  });
  it("el tamaño y ancla móviles manuales no alteran el frame de escritorio", () => {
    const root = createHotspotDetail().elements[0];
    root.mobile = { mode: "custom", frame: { anchor: "bottom", x: 20, y: -10, w: 280, h: 350 } };
    expect(detailFrame(root, true)).toBe(root.mobile.frame);
    expect(detailFrame(root).w).toBe(320);
    root.mobile.mode = "auto";
    expect(detailFrame(root, true)).toBe(root.frame);
  });
  it("hereda acabado y colores del marcador y respeta cambios por pieza", () => {
    const detail = createHotspotDetail();
    const title = detail.elements[0].children.find((piece) => piece.bind === "title");
    title.props.color = "#ff0000";
    const rendered = detailElements(detail, { title: "Cocina", description: "Descripción" }, { fill: "#12345680", iconColor: "#eeeeee", radius: 18, shadow: false, headingFont: "manrope" });
    expect(rendered[0].props).toMatchObject({ fill: "#12345680", radius: 18, shadow: false, headingFont: "manrope" });
    expect(rendered[0].children.find((piece) => piece.bind === "title").props).toMatchObject({ text: "Cocina", color: "#ff0000" });
    expect(rendered[0].children.find((piece) => piece.bind === "description").props.color).toBe("#eeeeee");
    expect(detail.elements[0].props.fill).toBeUndefined();
  });
  it("oculta campos sin datos o desactivados y reserva espacio para títulos largos", () => {
    const detail = createHotspotDetail(); detail.fields.image = false;
    const root = detailElements(detail, { title: "Una descripción de producto con un título que ocupa varias líneas en una tarjeta pequeña", description: "Texto" })[0];
    expect(root.children.find((piece) => piece.bind === "image").hidden).toBe(true);
    expect(root.children.find((piece) => piece.bind === "price").hidden).toBe(true);
    const heading = root.children.find((piece) => piece.bind === "title"), paragraph = root.children.find((piece) => piece.bind === "description");
    expect(heading.frame.y).toBe(16);
    expect(paragraph.frame.y).toBeGreaterThan(heading.frame.y + 44);
  });
  it("cambiar plantilla conserva activación, ubicación, apertura y campos", () => {
    const before = { ...createHotspotDetail(), enabled: false, placement: "screen", reveal: "always", fields: { image: false } };
    const next = replaceDetailTemplate(before, "text", "info");
    expect(next).toMatchObject({ enabled: false, placement: "screen", reveal: "click", fields: { image: false }, inheritAppearance: true });
    expect(next.elements[0].children.some((piece) => piece.bind === "image")).toBe(false);
  });
  it("convierte un panel compartido en una instancia sin mutar el diseño anterior", () => {
    const design = { panels: [{ id: "p", elements: [{ id: "g", template: "group", props: { fill: "red" } }], position: { desktop: "left" } }], panelDefaults: { info: "p" } };
    const next = editableHotspotDetail({ type: "info" }, design);
    next.elements[0].props.fill = "blue";
    expect(design.panels[0].elements[0].props.fill).toBe("red");
    expect(next).toMatchObject({ placement: "screen", reveal: "click", inheritAppearance: false, position: { desktop: "left" } });
    expect(next.legacyPanel.id).toBe("p");
  });
  it("cambiar receta conserva el acabado explícito y permite volver al del marcador", () => {
    const detail = createHotspotDetail();
    detail.inheritAppearance = false;
    Object.assign(detail.elements[0].props, { fill: "#ffc000", glass: false, radius: 22 });
    const product = replaceDetailTemplate(detail, "product", "price");
    expect(product.inheritAppearance).toBe(false);
    expect(product.elements[0].props).toMatchObject({ fill: "#ffc000", glass: false, radius: 22 });
    expect(product.elements[0].children[0].frame.h).toBe(192);
    const linked = replaceDetailTemplate(product, "text", "price", false);
    expect(linked.inheritAppearance).toBe(true);
    expect(linked.elements[0].props.fill).toBeUndefined();
  });
  it("conserva el panel clásico al migrar y también copia detalles nuevos", () => {
    const classic = editableHotspotDetail({ type: "price" }, { detailPanel: { template: "floating-card", props: { tone: "light" } } });
    expect(classic.legacy.props.tone).toBe("light");
    const hotspot = { content: { detail: createHotspotDetail() } };
    editableHotspotDetail(hotspot).elements[0].props.radius = 77;
    expect(hotspot.content.detail.elements[0].props.radius).toBeUndefined();
  });
  it("los detalles esquinados antiguos pasan a demanda sin perder ni mutar su contenido", () => {
    const saved = { ...createHotspotDetail(), placement: "screen", reveal: "always" };
    const hotspot = { content: { detail: saved } };
    expect(detailOf(hotspot)).toMatchObject({ placement: "screen", reveal: "click", elements: saved.elements });
    expect(editableHotspotDetail(hotspot).reveal).toBe("click");
    expect(saved.reveal).toBe("always");
    saved.placement = "inline";
    expect(detailOf(hotspot).reveal).toBe("always");
  });
});
