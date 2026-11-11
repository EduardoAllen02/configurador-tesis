import { beforeEach, describe, expect, it } from "vitest";
import { addElement, elementsOf } from "../elementOps.js";
import { clipboardItems, copyElements, hasClipboard, pasteElements, resetClipboard } from "./clipboard.js";

const base = () => {
  let design = { screens: { tour: { elements: [] }, intro: { enabled: false, elements: [] } } };
  const a = addElement(design, "tour", {
    template: "text",
    props: { text: "Hola" },
    frame: { anchor: "top-left", x: 10, y: 20, w: 0, h: 0 },
    mobile: { mode: "custom", frame: { anchor: "top", x: 0, y: 30, w: 0, h: 0 } },
  });
  design = a.design;
  const b = addElement(design, "tour", { template: "shape", frame: { anchor: "center", x: 0, y: 0, w: 50, h: 50 } });
  return { design: b.design, a: a.id, b: b.id };
};

describe("copiar y pegar", () => {
  beforeEach(resetClipboard);

  it("pega con ids nuevos, +16 px, arriba de todo y sin tocar el original", () => {
    const { design, a, b } = base();
    expect(copyElements(design, "tour", [a, b])).toBe(2);
    expect(hasClipboard()).toBe(true);
    const res = pasteElements(design, "tour", clipboardItems());
    const els = elementsOf(res.design, "tour");
    expect(els).toHaveLength(4);
    expect(res.ids).toHaveLength(2);
    expect(res.ids).not.toContain(a);
    const pasted = els.find((e) => e.id === res.ids[0]);
    expect(pasted.frame).toEqual({ anchor: "top-left", x: 26, y: 36, w: 0, h: 0 });
    expect(pasted.mobile.frame.y).toBe(46); // el ajuste móvil también se desplaza
    expect(pasted.z).toBeGreaterThan(Math.max(...elementsOf(design, "tour").map((e) => e.z)));
    expect(elementsOf(res.design, "tour").find((e) => e.id === a).frame.x).toBe(10);
  });

  it("los pegados no comparten props con el portapapeles", () => {
    const { design, a } = base();
    copyElements(design, "tour", [a]);
    const res = pasteElements(design, "tour", clipboardItems());
    elementsOf(res.design, "tour").find((e) => e.id === res.ids[0]).props.text = "otro";
    expect(clipboardItems()[0].props.text).toBe("Hola");
  });

  it("copiar nada deja el portapapeles vacío", () => {
    const { design } = base();
    expect(copyElements(design, "tour", [])).toBe(0);
    expect(hasClipboard()).toBe(false);
  });

  it("se puede pegar en la otra pantalla", () => {
    const { design, a } = base();
    copyElements(design, "tour", [a]);
    const res = pasteElements(design, "intro", clipboardItems());
    expect(elementsOf(res.design, "intro")).toHaveLength(1);
  });
});
