import { afterEach, expect, it, vi } from "vitest";
import { createContextMenu } from "./contextMenu.js";

class Node {
  children = []; attrs = {}; dataset = {}; style = {}; listeners = {}; isConnected = true;
  classList = { add: value => { this.className += ` ${value}`; } };
  constructor(tag = "div") { this.tagName = tag.toUpperCase(); }
  setAttribute(key, value) { this.attrs[key] = value; }
  hasAttribute(key) { return key in this.attrs; }
  removeAttribute(key) { delete this.attrs[key]; }
  append(node) { node.parent = this; this.children.push(node); }
  remove() { this.isConnected = false; if (this.parent) this.parent.children = this.parent.children.filter(node => node !== this); }
  contains(node) { return node === this || this.children.some(child => child.contains(node)); }
  querySelectorAll() { return this.children.flatMap(node => [node, ...node.querySelectorAll()]).filter(node => node.attrs.role === "menuitem"); }
  querySelector() { return this.querySelectorAll()[0]; }
  focus() { document.activeElement = this; }
  addEventListener(type, fn) { this.listeners[type] = fn; }
  click() { return this.listeners.click?.(); }
  get offsetWidth() { return 220; }
  get offsetHeight() { return 150; }
  getBoundingClientRect() { return { left: 20, top: 30, width: 500, height: 300 }; }
}

afterEach(() => vi.unstubAllGlobals());
function setup(value = { enabled: true }) {
  const events = {}, windowEvents = {};
  const doc = { createElement: tag => new Node(tag), activeElement: new Node(), fullscreenEnabled: true, fullscreenElement: null,
    addEventListener: (type, fn) => { events[type] = fn; }, removeEventListener: vi.fn(), exitFullscreen: vi.fn() };
  vi.stubGlobal("document", doc);
  vi.stubGlobal("window", { addEventListener: (type, fn) => { windowEvents[type] = fn; }, removeEventListener: vi.fn() });
  const observer = { observe: vi.fn(), disconnect: vi.fn() };
  vi.stubGlobal("ResizeObserver", class { constructor() { return observer; } });
  const root = new Node(); root.requestFullscreen = vi.fn();
  const resetView = vi.fn(), reportError = vi.fn();
  const layer = createContextMenu({ root, getConfig: () => value, resetView, reportError });
  return { root, layer, events, windowEvents, resetView, reportError, doc, observer };
}
it("does not intercept disabled or empty menus and removes its lifecycle listeners", () => {
  const { layer, root, doc, observer } = setup({ enabled: false });
  expect(layer.open(100, 100)).toBe(false); expect(root.children).toHaveLength(0);
  layer.dispose(); expect(observer.disconnect).toHaveBeenCalledOnce(); expect(doc.removeEventListener).toHaveBeenCalledTimes(3);
});
it("opens within the panorama, navigates with keys and Escape restores panorama focus", () => {
  const { layer, root, events, resetView, doc } = setup();
  expect(layer.open(515, 325)).toBe(true);
  const menu = root.children[0], nodes = menu.querySelectorAll();
  expect(menu.style).toEqual({ left: "274px", top: "144px" }); expect(doc.activeElement).toBe(nodes[0]);
  const key = name => events.keydown({ key: name, target: doc.activeElement, preventDefault: vi.fn(), stopPropagation: vi.fn() });
  key("ArrowDown"); expect(doc.activeElement).toBe(nodes[1]);
  nodes[1].click(); expect(resetView).toHaveBeenCalledOnce(); expect(root.children).toHaveLength(0);
  expect(doc.activeElement).toBe(root);
  layer.open(100, 100); key("Escape"); expect(root.children).toHaveLength(0); expect(doc.activeElement).toBe(root);
  layer.dispose();
});
it("executes fullscreen with user activation, supports exit and reports rejection", async () => {
  const { layer, root, doc, reportError } = setup();
  layer.open(100, 100); await root.children[0].children[0].click(); expect(root.requestFullscreen).toHaveBeenCalledOnce();
  doc.fullscreenElement = root;
  layer.open(100, 100); expect(root.children[0].children[0].textContent).toBe("Salir de pantalla completa");
  await root.children[0].children[0].click(); expect(doc.exitFullscreen).toHaveBeenCalledOnce();
  doc.fullscreenElement = null; root.requestFullscreen.mockRejectedValue(new Error("blocked"));
  layer.open(100, 100); await root.children[0].children[0].click(); expect(reportError).toHaveBeenCalledOnce();
  layer.dispose();
});
it("uses plain text and safe external links for options and credits, dismissing outside", () => {
  const { layer, root, events } = setup({ enabled: true, items: [{ id: "a", type: "link", label: "<script>test</script>", url: "https://example.com" }], credit: { enabled: true, name: "Organization", url: "https://example.org" } });
  layer.open(100, 100);
  const nodes = root.children[0].children;
  expect(nodes[0].textContent).toBe("<script>test</script>"); expect(nodes[0].href).toBe("https://example.com/");
  expect(nodes[0].rel).toBe("noopener noreferrer"); expect(nodes[1].textContent).toBe("Created by Organization");
  events.pointerdown({ target: root }); expect(root.children).toHaveLength(0);
  layer.dispose();
});
