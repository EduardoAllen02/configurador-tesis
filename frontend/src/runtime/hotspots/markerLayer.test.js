import { lonLatToVec3 } from "../core/lonLatToVec3.js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createCardPresenter } from "./cardPresenter.js";
vi.mock("./cardPresenter.js", () => ({ createCardPresenter: vi.fn(() => ({update:vi.fn(()=>true),dispose:vi.fn(),paint:vi.fn(),setOffset:vi.fn(),click:()=>false})) }));
import { createMarkerLayer } from "./markerLayer.js";
vi.mock("./resizeOverlay.js", () => ({ attachHotspotResize: () => ({ sync() {}, dispose() {} }) }));

vi.mock("../templates/index.js", () => ({ getTemplate: () => ({ defaults: {}, render: () => {
  const content = document.createElement("div");
  const card = document.createElement("span");
  const line = document.createElement("line");
  Object.assign(card.style, { left: "65px", top: "-85px" });
  content.card = card;
  content.line = line;
  content.querySelector = (selector) => selector === ".hs-co-card" ? card : line;
  return content;
} }) }));

class Node {
  constructor() { this.style = { setProperty: vi.fn() }; this.dataset = {}; this.handlers = {}; this.classList = { add: vi.fn() }; this.offsetWidth = 40; }
  setAttribute(key, value) { this[key] = value; }
  hasAttribute(key) { return Object.hasOwn(this,key); }
  appendChild(node) { this.content = node; }
  addEventListener(type, listener) { this.handlers[type] = listener; }
  setPointerCapture() {}
  contains(node) { return node === this; }
  getBoundingClientRect() { return { width: 20 }; }
  fire(type, target, x, y) {
    this.handlers[type]?.({ type, target, clientX: x, clientY: y, button: 0, pointerId: 1, preventDefault() {}, stopPropagation() {} });
  }
}

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

function setup(locked = false) {
  vi.stubGlobal("document", { createElement: () => new Node() });
  const onMove = vi.fn(), onStyleMove = vi.fn(), onClick = vi.fn();
  let obj;
  const scene = { add: vi.fn((node) => { obj = node; }), remove: vi.fn() };
  const layer = createMarkerLayer({ scene, mode: "edit", pick: () => ({ lon: 12, lat: 4 }), onMove, onStyleMove, onClick });
  layer.setEntries([{ hotspot: { id: "h", lon: 0, lat: 0, locked }, style: { template: "callout", props: { fill: "red", size: 40 } } }]);
  const wrapper = obj.element, content = wrapper.content;
  return { obj, wrapper, content, onMove, onStyleMove, onClick, layer, scene };
}

describe("gestos de la tarjeta con línea guía", () => {
  it("arrastra solo la tarjeta, compensa la escala y conserva estilo y ancla", () => {
    const { obj, wrapper, content, onMove, onStyleMove } = setup();
    const position = obj.position.clone();
    wrapper.fire("pointerdown", content.card, 100, 100);
    wrapper.fire("pointermove", content.card, 120, 130);
    wrapper.fire("pointerup", content.card, 120, 130);
    expect(obj.position.equals(position)).toBe(true);
    expect(onMove).not.toHaveBeenCalled();
    expect(onStyleMove).toHaveBeenCalledWith("h", { template: "callout", props: { fill: "red", size: 40, dx: 105, dy: -25 } });
    expect(content.line.x2).toBe(105);
    expect(content.line.y2).toBe(-25);
  });
  it("arrastra el ancla sin cambiar las distancias de la tarjeta", () => {
    const { wrapper, content, onMove, onStyleMove } = setup();
    wrapper.fire("pointerdown", content, 100, 100);
    wrapper.fire("pointermove", content, 130, 130);
    wrapper.fire("pointerup", content, 130, 130);
    expect(onMove).toHaveBeenCalledWith("h", { lon: 12, lat: 4 });
    expect(onStyleMove).not.toHaveBeenCalled();
    expect(content.card.style.left).toBe("65px");
  });
  it("un clic abre la configuración y un hotspot bloqueado no se mueve", () => {
    const { wrapper, content, onClick, onMove, onStyleMove } = setup(true);
    wrapper.fire("pointerdown", content.card, 100, 100);
    wrapper.fire("pointermove", content.card, 130, 130);
    wrapper.fire("pointerup", content.card, 130, 130);
    expect(onClick).toHaveBeenCalledOnce();
    expect(onStyleMove).not.toHaveBeenCalled();
    expect(onMove).not.toHaveBeenCalled();
  });
  it("cancelar el gesto restaura la tarjeta sin guardar cambios", () => {
    const { wrapper, content, onStyleMove, onMove } = setup();
    wrapper.fire("pointerdown", content.card, 100, 100);
    wrapper.fire("pointermove", content.card, 120, 130);
    wrapper.fire("pointercancel", content.card, 120, 130);
    expect(content.card.style.left).toBe("65px");
    expect(content.card.style.top).toBe("-85px");
    expect(onStyleMove).not.toHaveBeenCalled();
    expect(onMove).not.toHaveBeenCalled();
  });
});

describe("incremental marker updates", () => {
  function create() {
    vi.stubGlobal("document", { createElement: () => new Node() });
    const scene = { add: vi.fn(), remove: vi.fn() };
    const layer = createMarkerLayer({ scene, mode: "edit", pick: () => ({ lon: 0, lat: 0 }) });
    const row = (id, changes = {}) => ({ hotspot: { id, type: "info", title: id, lon: 0, lat: 0, ...changes }, style: { template: "callout", props: { size: 30 } } });
    return { scene, layer, row };
  }
  it("keeps both nodes on position/server metadata updates and reordering", () => {
    const { scene, layer, row } = create();
    layer.setEntries([row("a"), row("b")]);
    const [a, b] = scene.add.mock.calls.map(([obj]) => obj);
    layer.setEntries([row("b", { lon: 25 }), row("a", { updatedAt: "later", lat: 10, segments: [] })]);
    expect(scene.add).toHaveBeenCalledTimes(2);
    expect(scene.remove).not.toHaveBeenCalled();
    expect(a.position.equals(lonLatToVec3(0, 10))).toBe(true);
    expect(b.position.equals(lonLatToVec3(25, 0))).toBe(true);
  });
  it("rebuilds only a changed visual id and removes only a deleted id", () => {
    const { scene, layer, row } = create();
    layer.setEntries([row("a"), row("b")]);
    const [a, b] = scene.add.mock.calls.map(([obj]) => obj);
    layer.setEntries([row("a", { title: "Edited" }), row("b")]);
    expect(scene.add).toHaveBeenCalledTimes(3);
    expect(scene.remove).toHaveBeenCalledExactlyOnceWith(a);
    layer.setEntries([row("a", { title: "Edited" })]);
    expect(scene.add).toHaveBeenCalledTimes(3);
    expect(scene.remove).toHaveBeenLastCalledWith(b);
  });
  it("reconciles detail structure through one presenter without replacing other markers", () => {
    const {scene,layer,row}=create();
    const entry = changes => row("a",{content:{card:{version:1},detail:{version:1,enabled:false,placement:"inline",reveal:"always",elements:[],...changes}}});
    layer.setEntries([entry({}),row("b")]);const [a,b]=scene.add.mock.calls.map(([obj])=>obj);
    const presenter=createCardPresenter.mock.results.at(-2).value;
    a.element.setAttribute("data-piece-editing","");
    layer.setEntries([entry({enabled:true}),row("b")]);
    layer.setEntries([entry({enabled:true,elements:[{id:"moved-image"}]}),row("b")]);
    expect(presenter.update).toHaveBeenCalledTimes(2);
    expect(scene.add).toHaveBeenCalledTimes(2);expect(scene.remove).not.toHaveBeenCalledWith(a);expect(scene.remove).not.toHaveBeenCalledWith(b);
    expect(presenter.update.mock.calls.at(-1)[0].content.detail.elements[0].id).toBe("moved-image");
  });
  it("keeps preview intent separate and shares it with a rebuilt presenter", () => {
    const {scene,layer,row}=create();
    const entry = reveal => row("a",{content:{detail:{version:1,enabled:true,placement:"inline",reveal,elements:[]}}});
    layer.setEntries([entry("click")]);const state=createCardPresenter.mock.calls.at(-1)[4];
    layer.previewDetail("a",true);expect(state.open).toBe(true);
    layer.setEntries([entry("always")]);
    expect(createCardPresenter.mock.calls.at(-1)[4]).toBe(state);
    layer.previewDetail("a",false);expect(state.open).toBe(true);
    layer.setEntries([entry("click")]);expect(state.open).toBe(false);
    expect(scene.add).toHaveBeenCalledTimes(3);
  });
  it("rebuilds the stem for an appearance change, but placement keeps its node", () => {
    const {scene,layer,row}=create();const a=row("a");layer.setEntries([a,row("b")]);
    const first=scene.add.mock.calls[0][0];first.element.setAttribute("data-piece-editing","");
    layer.setEntries([{...a,style:{...a.style,props:{...a.style.props,dx:100,dy:-50}}},row("b")]);
    expect(scene.add).toHaveBeenCalledTimes(2);
    layer.setEntries([{...a,style:{...a.style,props:{...a.style.props,stroke:"#ff0000"}}},row("b")]);
    expect(scene.add).toHaveBeenCalledTimes(3);expect(scene.remove).toHaveBeenCalledExactlyOnceWith(first);
  });
  it("adopts a card drag before optimistic save and a reordered JSONB response", () => {
    const { obj, wrapper, content, onStyleMove, layer, scene } = setup();
    wrapper.fire("pointerdown", content.card, 100, 100);
    wrapper.fire("pointermove", content.card, 120, 130);
    wrapper.fire("pointerup", content.card, 120, 130);
    const style = onStyleMove.mock.calls[0][1];
    layer.setEntries([{ hotspot: { id: "h", lon: 0, lat: 0, locked: false }, style }]);
    const observed = obj.element;
    // If the layer rebuilt h, its old wrapper would no longer be selected/updated.
    layer.select("h");
    expect(observed).toBe(wrapper);
    expect(scene.add).toHaveBeenCalledTimes(1);
    expect(scene.remove).not.toHaveBeenCalled();
    const response = { props: Object.fromEntries(Object.entries(style.props).reverse()), template: style.template };
    layer.setEntries([{ hotspot: { updatedAt: "server", locked: false, lat: 0, lon: 0, id: "h" }, style: response }]);
    expect(scene.add).toHaveBeenCalledTimes(1);
    expect(scene.remove).not.toHaveBeenCalled();
    wrapper.fire("pointerdown", content.card, 100, 100);
    wrapper.fire("pointermove", content.card, 110, 110);
    wrapper.fire("pointerup", content.card, 110, 110);
    expect(onStyleMove).toHaveBeenLastCalledWith("h", { ...style, props: { ...style.props, dx: 125, dy: -5 } });
  });
});
