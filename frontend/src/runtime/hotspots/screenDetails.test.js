import { afterEach, describe, expect, it, vi } from "vitest";
import { createScreenDetails } from "./screenDetails.js";

vi.mock("./detailView.js", () => ({ mountDetailContent: () => vi.fn() }));
class Node {
  children = []; dataset = {}; style = { setProperty() {} }; clientWidth = 1366; clientHeight = 700;
  setAttribute(key, value) { this[key] = value; }
  append(node) { node.parent = this; this.children.push(node); }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter((node) => node !== this); }
  get childElementCount() { return this.children.length; }
}
afterEach(() => vi.unstubAllGlobals());
function setup() {
  const listeners = {};
  vi.stubGlobal("document", { createElement: () => new Node() });
  vi.stubGlobal("window", { addEventListener: (key, fn) => { listeners[key] = fn; }, removeEventListener: vi.fn() });
  const root = new Node();
  const layer = createScreenDetails(root, () => ({ mode: "view", getTemplate: () => ({ defaults: {} }) }));
  const row = (id, reveal = "click", position = "right") => ({ hotspot: { id, title: id, content: { detail: { version: 1, enabled: true, placement: "screen", reveal, position: { desktop: position }, elements: [] } } } });
  const rows = [row("a", "always"), row("b", "click", "left")];
  const cards = () => root.children[0].children.flatMap((stack) => stack.children).filter((node) => node.className === "hs-screen-detail");
  layer.sync(rows);
  return { layer, rows, root, cards, listeners };
}
describe("un único detalle esquinado bajo demanda", () => {
  it("fixed card height limits the one scroll viewport instead of cropping its pieces", () => {
    const { layer, rows, cards } = setup();
    rows[0].hotspot.content.detail.elements = [{ template: "group", frame: { w: 260, h: 220 }, props: { detailFixedHeight: true } }];
    layer.open(rows[0].hotspot);
    expect(cards()[0].style.height).toBe("220px");
    layer.dispose();
  });
  it("no abre automáticamente ni siquiera documentos antiguos con always", () => {
    const { cards, layer } = setup();
    expect(cards()).toHaveLength(0); layer.dispose();
  });
  it("abrir otro reemplaza el anterior y elimina contenedores vacíos", () => {
    const { layer, rows, cards, root } = setup();
    layer.open(rows[0].hotspot); expect(cards()[0]["aria-label"]).toBe("a");
    layer.open(rows[1].hotspot); expect(cards()).toHaveLength(1); expect(cards()[0]["aria-label"]).toBe("b");
    expect(root.children[0].childElementCount).toBe(1);
    layer.open(rows[1].hotspot); expect(cards()).toHaveLength(0); layer.dispose();
  });
  it("la prueba también es exclusiva y puede cerrarse sin reabrir otro detalle", () => {
    const { layer, rows, cards } = setup();
    layer.open(rows[0].hotspot); layer.preview("b", true);
    expect(cards()).toHaveLength(1); expect(cards()[0]["aria-label"]).toBe("b");
    layer.preview("b", false); expect(cards()).toHaveLength(0); layer.dispose();
  });
  it("Escape, cierre explícito y cambio de escena limpian el detalle", () => {
    const { layer, rows, cards, listeners } = setup();
    layer.open(rows[0].hotspot); listeners.keydown({ key: "Escape" }); expect(cards()).toHaveLength(0);
    layer.open(rows[0].hotspot); layer.close(); expect(cards()).toHaveLength(0);
    layer.open(rows[0].hotspot); layer.sync([]); layer.sync(rows); expect(cards()).toHaveLength(0); layer.dispose();
  });
});
