import { describe, expect, it } from "vitest";
import { resolveFrame } from "../../../runtime/layout/engine.js";
import { createDesignStore } from "../designStore.js";
import { elementsOf } from "../elementOps.js";
import { dropElement } from "./drop.js";

// Caja que daría el motor: resuelve el frame con el tamaño natural de un elemento "auto".
function fakeBoxes(store, natural) {
  return () => {
    const { design, screen } = store.getState();
    return elementsOf(design, screen).map((el) => {
      const { rect } = resolveFrame(el.frame, { W: 1440, H: 900 }, 1, natural);
      return { id: el.id, left: rect.left, top: rect.top, width: rect.width, height: rect.height };
    });
  };
}

const newStore = () => {
  const store = createDesignStore({ autosaveMs: 1e9 });
  store.load({ screens: { tour: { elements: [] }, intro: { enabled: false, elements: [] } } });
  return store;
};

describe("dropElement", () => {
  it("deja el elemento centrado bajo el cursor (caja real, no la nominal) y en un solo paso de deshacer", () => {
    const store = newStore();
    const natural = { w: 114, h: 44 }; // el botón mide menos que la caja nominal de 240×60
    const id = dropElement(store, { template: "button", props: { label: "Entrar" } }, { x: 300, y: 380 }, fakeBoxes(store, natural));
    const box = fakeBoxes(store, natural)().find((b) => b.id === id);
    expect(box.left + box.width / 2).toBeCloseTo(300, 0);
    expect(box.top + box.height / 2).toBeCloseTo(380, 0);
    expect(store.getState().selection).toEqual([id]);
    expect(store.getState().label).toBe("Agregar elemento");
    store.undo();
    expect(elementsOf(store.getState().design, "tour")).toHaveLength(0); // un solo paso
    expect(store.getState().canUndo).toBe(false);
  });

  it("se ancla a la zona donde cae", () => {
    const store = newStore();
    const id = dropElement(store, { template: "button", props: {} }, { x: 1300, y: 820 }, fakeBoxes(store, { w: 114, h: 44 }));
    expect(elementsOf(store.getState().design, "tour").find((e) => e.id === id).frame.anchor).toBe("bottom-right");
  });
});
