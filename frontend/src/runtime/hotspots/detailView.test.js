import { afterEach, it, expect, vi } from "vitest";
import { mountDetailContent } from "./detailView.js";
vi.mock("../model/hotspotDetail.js", () => ({ detailElements: detail => detail.elements, detailFrame: element => element.frame, detailOf: () => null }));

class Node {
  constructor(className = "") { this.className = className; this.dataset = {}; this.children = []; this.clientWidth = 200; this.style = { setProperty() {} }; this.height = 0; }
  append(node) { this.children.push(node); node.parentElement = this; }
  get isConnected() { return this.connected || !!this.parentElement?.isConnected; }
  get offsetHeight() { return this.height || this.children.reduce((sum, node) => sum + node.offsetHeight, 0); }
  querySelectorAll() { return this.children.flatMap(node => [node, ...node.querySelectorAll()]).filter(node => node.className === "tour-rt-group"); }
  remove() { this.parentElement.children = this.parentElement.children.filter(node => node !== this); }
}
afterEach(() => vi.unstubAllGlobals());

it("settles connected nested groups before measuring the card used by its resize outline", () => {
  vi.stubGlobal("document", { createElement: () => new Node() });
  const order = [];
  const inner = new Node("tour-rt-group"), root = new Node("tour-rt-group");
  root.append(inner);
  const template = { defaults: {}, render: () => root,
    measure(node) { expect(node.isConnected).toBe(true); order.push(node); node.height = node === inner ? 80 : inner.offsetHeight + 40; }, dispose: vi.fn() };
  const host = new Node(); host.connected = true;
  const dispose = mountDetailContent(host, { elements: [{ template: "group", id: "g", frame: { w: 200 }, props: {} }] }, {}, {}, { getTemplate: () => template });
  expect(order).toEqual([inner, root]);
  expect(host.style.height).toBe("120px");
  dispose(); expect(template.dispose).toHaveBeenCalledWith(root);
});
