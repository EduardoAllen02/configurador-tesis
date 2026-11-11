import { describe, expect, it } from "vitest";
import { numberConfiguration, resizeSections, sectionValues, writeNumberSections } from "./numberSections.js";
import { convertLegacyElement } from "../../runtime/model/groupMigration.js";
import { createDesignStore } from "./designStore.js";
const group = (kind = "stats-row") => convertLegacyElement({ id: "numbers", template: kind, props: {}, frame: { anchor: "top-left", x: 50, y: 80, w: 360, h: 0 } });
const designOf = (el) => ({ version: 1, screens: { tour: { elements: [el] }, intro: { elements: [] } } });
const configOf = (design, id = "numbers") => numberConfiguration(design, "tour", id);

describe("configuración semántica de cifras", () => {
  it("encuentra secciones desde el grupo y desde una pieza convertida", () => {
    const el = group(), design = designOf(el);
    expect(configOf(design, el.children[0].id).id).toBe(el.id);
    expect(sectionValues(configOf(design)).map(({ value, label }) => [value, label])).toEqual([["5", "Pisos"], ["12", "Salas"], ["2", "Idiomas"]]);
  });
  it("una tarjeta contenedora ofrece la configuración de sus cifras", () => {
    const design = designOf({ id: "card", template: "group", children: [group()] });
    expect(configOf(design, "card").id).toBe("numbers");
  });
  it("cambiar texto conserva identidades, posiciones y estilos de las piezas", () => {
    const el = group(); el.children[0].props.color = "#ff0000";
    const design = designOf(el), rows = sectionValues(configOf(design)); rows[0].value = "99";
    const next = writeNumberSections(design, "tour", el.id, rows);
    const child = next.screens.tour.elements[0].children[0];
    expect(child).toMatchObject({ id: el.children[0].id, frame: el.children[0].frame, props: { text: "99", color: "#ff0000" } });
    expect(el.children[0].props.text).toBe("5");
  });
  it("añadir hasta ocho redistribuye columnas y separadores sin cambiar el ancla", () => {
    const design = designOf(group()), rows = resizeSections(sectionValues(configOf(design)), 8, "stats-row");
    const next = writeNumberSections(design, "tour", "numbers", rows).screens.tour.elements[0];
    expect(sectionValues(configOf(designOf(next)))).toHaveLength(8);
    expect(next.children.filter((el) => el.template === "shape")).toHaveLength(6);
    expect(next.children.filter((el) => el.template === "text").some((el) => el.frame.y >= 64)).toBe(true);
    expect(next.frame).toMatchObject({ anchor: "top-left", x: 50, y: 80 });
    expect(new Set(next.children.map((el) => el.id)).size).toBe(next.children.length);
    expect(new Set(next.children.map((el) => el.z)).size).toBe(next.children.length);
  });
  it("reordenar conserva la identidad y estilo de cada cifra", () => {
    const design = designOf(group()), rows = sectionValues(configOf(design));
    const first = rows[0].key;
    const next = writeNumberSections(design, "tour", "numbers", [rows[1], rows[0], rows[2]]);
    expect(sectionValues(configOf(next)).map((row) => row.key)).toEqual([rows[1].key, first, rows[2].key]);
  });
  it("recrea separadores al crecer desde una sola sección", () => {
    const design = designOf(group());
    const single = writeNumberSections(design, "tour", "numbers", sectionValues(configOf(design)).slice(0, 1));
    const next = writeNumberSections(single, "tour", "numbers", resizeSections(sectionValues(configOf(single)), 4, "stats-row"));
    expect(next.screens.tour.elements[0].children.filter((el) => el.template === "shape")).toHaveLength(3);
  });
  it("el contador conserva sufijos, sentido y tiempos en su hoja funcional", () => {
    const design = designOf(group("stats-counter")), rows = sectionValues(configOf(design));
    rows[1] = { ...rows[1], value: 9, direction: "down", suffix: "+" };
    const next = writeNumberSections(design, "tour", "numbers", rows, { countMs: 0, rotateMs: 6000 });
    expect(configOf(next).leaf.props).toMatchObject({ countMs: 0, rotateMs: 6000, compositeLeaf: true });
    expect(sectionValues(configOf(next))[1]).toMatchObject({ value: 9, direction: "down", suffix: "+" });
  });
  it("respeta bloqueo de una pieza o de un contenedor", () => {
    const el = group(); el.children[0].locked = true;
    const design = designOf(el);
    expect(writeNumberSections(design, "tour", el.id, resizeSections(sectionValues(configOf(design)), 4, "stats-row"))).toBe(design);
  });
  it("deshacer y rehacer restauran secciones y geometría juntas", () => {
    const store = createDesignStore(); store.load(designOf(group()));
    const original = store.getState().design;
    store.apply((design) => writeNumberSections(design, "tour", "numbers", resizeSections(sectionValues(configOf(design)), 4, "stats-row")));
    const changed = store.getState().design;
    store.undo(); expect(store.getState().design).toEqual(original);
    store.redo(); expect(store.getState().design).toEqual(changed);
  });
  it("la cantidad se limita a una a ocho y la vista de prueba no ensucia el documento", () => {
    expect(resizeSections([], 0, "stats-counter")).toHaveLength(1);
    expect(resizeSections([], 99, "stats-counter")).toHaveLength(8);
    const store = createDesignStore(); store.load(designOf(group()));
    store.setElementPreview({ id: "numbers", index: 2, playing: true });
    expect(store.hasUnsavedChanges()).toBe(false);
    expect(store.getState().design.elementPreview).toBeUndefined();
  });
});
