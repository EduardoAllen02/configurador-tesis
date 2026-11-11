import { describe, expect, it, vi } from "vitest";
import { createDesignStore } from "./designStore.js";
import { addElement, duplicateElements, removeElements, reorder, setFrame, updateProps } from "./elementOps.js";

const base = () => ({
  version: 1,
  screens: {
    tour: { elements: [{ id: "a", template: "text", props: { text: "Hola" }, frame: { anchor: "top-left", x: 10, y: 10, w: 0, h: 0 }, z: 1 }] },
    intro: { enabled: false, background: null, elements: [] },
  },
});

const settle = () => new Promise((r) => setTimeout(r, 0));

// Reloj y temporizadores manuales: el guardado automático se dispara a mano.
function harness(saveImpl) {
  let t = 0;
  const timers = [];
  const save = vi.fn(saveImpl ?? ((d) => Promise.resolve(d)));
  const store = createDesignStore({
    save,
    now: () => t,
    schedule: (fn) => {
      timers.push(fn);
      return timers.length;
    },
    cancel: (id) => {
      if (id) timers[id - 1] = null;
    },
  });
  const fire = async () => {
    const pending = timers.splice(0).filter(Boolean);
    pending.forEach((fn) => fn());
    await settle();
  };
  return { store, save, fire, tick: (ms) => (t += ms) };
}

describe("designStore", () => {
  it("apply cambia el diseño, permite deshacer/rehacer y guarda solo", async () => {
    const { store, save, fire } = harness();
    store.load(base());
    store.apply((d) => updateProps(d, "tour", "a", { text: "Chao" }), { label: "Texto" });
    expect(store.getState().design.screens.tour.elements[0].props.text).toBe("Chao");
    expect(store.getState().status).toBe("dirty");
    expect(store.getState().canUndo).toBe(true);
    await fire();
    expect(save).toHaveBeenCalledTimes(1);
    expect(store.getState().status).toBe("saved");
    store.undo();
    expect(store.getState().design.screens.tour.elements[0].props.text).toBe("Hola");
    store.redo();
    expect(store.getState().design.screens.tour.elements[0].props.text).toBe("Chao");
  });

  it("cambios seguidos con el mismo mergeKey son un solo paso de deshacer", () => {
    const { store, tick } = harness();
    store.load(base());
    ["H", "Ho", "Hol"].forEach((text) => {
      store.apply((d) => updateProps(d, "tour", "a", { text }), { mergeKey: "a.text" });
      tick(100);
    });
    store.undo();
    expect(store.getState().design.screens.tour.elements[0].props.text).toBe("Hola");
    expect(store.getState().canUndo).toBe(false);
  });

  it("un gesto (arrastre) se ve en vivo y deja un solo paso; cancelar lo revierte", () => {
    const { store } = harness();
    store.load(base());
    store.beginGesture();
    [20, 30, 40].forEach((x) => store.preview((d) => setFrame(d, "tour", "a", { anchor: "top-left", x, y: 10, w: 0, h: 0 })));
    expect(store.getState().design.screens.tour.elements[0].frame.x).toBe(40);
    store.endGesture("Mover");
    store.undo();
    expect(store.getState().design.screens.tour.elements[0].frame.x).toBe(10);

    store.beginGesture();
    store.preview((d) => setFrame(d, "tour", "a", { anchor: "top-left", x: 99, y: 10, w: 0, h: 0 }));
    store.cancelGesture();
    expect(store.getState().design.screens.tour.elements[0].frame.x).toBe(10);
  });

  it("si el diseño cambia mientras se guarda, se vuelve a guardar y no se pisa lo local", async () => {
    let resolveFirst;
    const { store, save, fire } = harness(
      (d) =>
        new Promise((resolve) => {
          if (!resolveFirst) resolveFirst = () => resolve(d);
          else resolve(d);
        })
    );
    store.load(base());
    store.apply((d) => updateProps(d, "tour", "a", { text: "1" }));
    await fire();
    store.apply((d) => updateProps(d, "tour", "a", { text: "2" }));
    resolveFirst();
    await settle();
    expect(store.getState().design.screens.tour.elements[0].props.text).toBe("2");
    expect(store.getState().status).not.toBe("saved");
    await fire();
    expect(save).toHaveBeenCalledTimes(2);
    expect(save.mock.calls[1][0].screens.tour.elements[0].props.text).toBe("2");
  });

  it("flush guarda de inmediato y un error queda en status", async () => {
    const { store } = harness(() => Promise.reject(new Error("sin red")));
    store.load(base());
    store.apply((d) => updateProps(d, "tour", "a", { text: "x" }));
    await expect(store.flush()).rejects.toThrow("sin red");
    expect(store.getState().status).toBe("error");
    expect(store.getState().error).toBe("sin red");
  });

  it("la selección se limpia sola cuando el elemento desaparece o se cambia de pantalla", () => {
    const { store } = harness();
    store.load(base());
    store.select("a");
    expect(store.getState().selection).toEqual(["a"]);
    store.apply((d) => removeElements(d, "tour", ["a"]));
    expect(store.getState().selection).toEqual([]);
    store.undo();
    store.select(["a", "no-existe"]);
    expect(store.getState().selection).toEqual(["a"]);
    store.setScreen("intro");
    expect(store.getState().selection).toEqual([]);
  });
});

describe("elementOps", () => {
  it("addElement lo pone arriba de todo con móvil automático", () => {
    const { design, id } = addElement(base(), "intro", { template: "button", frame: { anchor: "center", x: 0, y: 0, w: 200, h: 48 } });
    const el = design.screens.intro.elements.find((e) => e.id === id);
    expect(el.z).toBe(1);
    expect(el.mobile).toEqual({ mode: "auto" });
    expect(design.screens.intro.enabled).toBe(false); // agregar no activa la pantalla para los visitantes
  });

  it("setFrame en móvil guarda un ajuste propio y no toca el de escritorio", () => {
    const d = setFrame(base(), "tour", "a", { anchor: "top", x: 0, y: 80, w: 300, h: 0 }, "mobile");
    const el = d.screens.tour.elements[0];
    expect(el.frame.x).toBe(10);
    expect(el.mobile).toEqual({ mode: "custom", frame: { anchor: "top", x: 0, y: 80, w: 300, h: 0 } });
  });

  it("duplicar desplaza 16 px con ids nuevos; eliminar respeta los bloqueados", () => {
    const { design, ids } = duplicateElements(base(), "tour", ["a"]);
    const copy = design.screens.tour.elements.find((e) => e.id === ids[0]);
    expect(copy.frame.x).toBe(26);
    expect(copy.z).toBe(2);
    const locked = { ...design, screens: { ...design.screens, tour: { elements: design.screens.tour.elements.map((e) => ({ ...e, locked: e.id === "a" })) } } };
    expect(removeElements(locked, "tour", ["a", ids[0]]).screens.tour.elements.map((e) => e.id)).toEqual(["a"]);
  });

  it("reorder traer al frente / enviar al fondo renumera z", () => {
    let d = addElement(base(), "tour", { id: "b", template: "shape" }).design;
    d = addElement(d, "tour", { id: "c", template: "shape" }).design;
    d = reorder(d, "tour", "a", "front");
    const z = Object.fromEntries(d.screens.tour.elements.map((e) => [e.id, e.z]));
    expect(z).toEqual({ a: 3, b: 1, c: 2 });
    d = reorder(d, "tour", "a", "back");
    expect(Object.fromEntries(d.screens.tour.elements.map((e) => [e.id, e.z]))).toEqual({ a: 1, b: 2, c: 3 });
  });
});
