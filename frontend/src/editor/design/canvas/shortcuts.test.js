import { describe, expect, it } from "vitest";
import { createDesignStore } from "../designStore.js";
import { addElement, elementsOf } from "../elementOps.js";
import { arrange } from "./useShortcuts.js";

// useShortcuts importa React, pero `arrange` es pura sobre el almacén y se prueba en Node.
function setup(n = 5) {
  const store = createDesignStore({ autosaveMs: 1e9 });
  let design = { screens: { tour: { elements: [] }, intro: { enabled: false, elements: [] } } };
  const ids = [];
  for (let i = 0; i < n; i++) {
    const res = addElement(design, "tour", { id: `e${i}`, template: "shape", frame: { anchor: "center", x: 0, y: 0, w: 10, h: 10 } });
    design = res.design;
    ids.push(res.id);
  }
  store.load(design);
  return { store, ids };
}

const order = (store) =>
  [...elementsOf(store.getState().design, "tour")].sort((a, b) => a.z - b.z).map((e) => e.id);

describe("arrange (Ctrl+] / Ctrl+[ con uno o varios elementos)", () => {
  it("al frente conserva el orden relativo", () => {
    const { store } = setup();
    store.select(["e0", "e2"]);
    arrange(store, "front");
    expect(order(store)).toEqual(["e1", "e3", "e4", "e0", "e2"]);
  });

  it("al fondo conserva el orden relativo", () => {
    const { store } = setup();
    store.select(["e2", "e4"]);
    arrange(store, "back");
    expect(order(store)).toEqual(["e2", "e4", "e0", "e1", "e3"]);
  });

  it("adelante un paso", () => {
    const { store } = setup();
    store.select(["e1"]);
    arrange(store, "forward");
    expect(order(store)).toEqual(["e0", "e2", "e1", "e3", "e4"]);
  });

  it("atrás un paso", () => {
    const { store } = setup();
    store.select(["e3"]);
    arrange(store, "backward");
    expect(order(store)).toEqual(["e0", "e1", "e3", "e2", "e4"]);
  });

  it("es un solo paso de deshacer", () => {
    const { store } = setup();
    store.select(["e0", "e1"]);
    arrange(store, "front");
    store.undo();
    expect(order(store)).toEqual(["e0", "e1", "e2", "e3", "e4"]);
    expect(store.getState().canUndo).toBe(false);
  });
});
