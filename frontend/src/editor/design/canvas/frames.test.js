import { describe, expect, it } from "vitest";
import { resolveFrame } from "../../../runtime/layout/engine.js";
import { containerOf, convertToMobileCustom, dragItem, finalAnchor, hasMobileFrame, layoutScaleOf, moveFrame, resizeFrame } from "./frames.js";

const close = (a, b) => ["left", "top", "width", "height"].forEach((k) => expect(a[k]).toBeCloseTo(b[k], 1));

describe("contenedor y escala por dispositivo", () => {
  it("tamaños de las mesas", () => {
    expect(containerOf("desktop")).toEqual({ W: 1440, H: 900 });
    expect(containerOf("tablet")).toEqual({ W: 1024, H: 768 });
    expect(containerOf("mobile")).toEqual({ W: 390, H: 844 });
  });
  it("escala --s como la del motor", () => {
    expect(layoutScaleOf("desktop")).toBe(1);
    expect(layoutScaleOf("tablet")).toBe(0.8); // sqrt(1024/1440 · 768/900) ≈ 0.78 → mínimo 0.8
    expect(layoutScaleOf("mobile")).toBe(1);
  });
});

describe("arrastrar en escritorio", () => {
  const container = containerOf("desktop");
  const el = { id: "a", template: "text", frame: { anchor: "top-left", x: 40, y: 40, w: 0, h: 0 } };
  const rect = { left: 40, top: 40, width: 300, height: 60 };
  const item = dragItem(el, rect, "desktop", container);

  it("mover conserva el tamaño automático y el ancla", () => {
    const moved = { ...rect, left: 140, top: 90 };
    const frame = moveFrame(item, moved, { container, s: 1 });
    expect(frame).toEqual({ anchor: "top-left", x: 140, y: 90, w: 0, h: 0 });
  });
  it("repeated moves never replace authored fractional dimensions with DOM measurements", () => {
    let frame={anchor:"top-left",x:40,y:40,w:219.23,h:233.1};
    for(let n=0;n<20;n++) {
      const box={left:frame.x,top:frame.y,width:219.21875,height:233.125};
      const item=dragItem({id:"card",template:"group",frame},box,"desktop",container);
      frame=moveFrame(item,{...box,top:box.top+10},{container,s:1});
      expect(frame.w).toBe(219.23);expect(frame.h).toBe(233.1);
    }
    expect(frame.y).toBe(240);
  });

  it("al soltar lejos, se re-ancla a la zona donde cayó", () => {
    const moved = { left: 1100, top: 800, width: 300, height: 60 };
    const frame = moveFrame(item, moved, { container, s: 1 });
    const anchor = finalAnchor(item, frame, moved, container);
    expect(anchor).toBe("bottom-right");
    const again = moveFrame({ ...item, anchor }, moved, { container, s: 1 });
    close(resolveFrame(again, container, 1, { w: 300, h: 60 }).rect, moved);
  });

  it("con el ancla fijada a mano no se re-ancla", () => {
    const pinned = dragItem({ ...el, frame: { ...el.frame, pinned: true } }, rect, "desktop", container);
    const moved = { left: 1100, top: 800, width: 300, height: 60 };
    const frame = moveFrame(pinned, moved, { container, s: 1 });
    expect(frame.pinned).toBe(true);
    expect(finalAnchor(pinned, frame, moved, container)).toBe("top-left");
  });

  it("redimensionar con manija lateral fija el ancho y deja el alto automático", () => {
    const wider = { ...rect, width: 420 };
    const frame = resizeFrame(item, wider, "e", { container, s: 1 });
    expect(frame.w).toBe(420);
    expect(frame.h).toBe(0);
  });

  it("redimensionar con esquina fija ancho y alto", () => {
    const bigger = { ...rect, width: 420, height: 90 };
    const frame = resizeFrame(item, bigger, "se", { container, s: 1 });
    expect(frame.w).toBe(420);
    expect(frame.h).toBe(90);
  });

  it("con escala --s ≠ 1 el frame se guarda en px de diseño", () => {
    const tablet = containerOf("tablet");
    const s = layoutScaleOf("tablet");
    const it2 = dragItem(el, { left: 32, top: 32, width: 240, height: 48 }, "tablet", tablet);
    const frame = moveFrame(it2, { left: 80, top: 40, width: 240, height: 48 }, { container: tablet, s });
    expect(frame.x).toBeCloseTo(80 / s, 1);
    expect(frame.y).toBeCloseTo(40 / s, 1);
  });
});

describe("barras estiradas", () => {
  const container = containerOf("desktop");
  const bar = { id: "t", template: "basic-topbar", frame: { anchor: "stretch-top", x: 0, y: 0, w: 0, h: 56 } };
  const rect = { left: 0, top: 0, width: 1440, height: 56 };
  const item = dragItem(bar, rect, "desktop", container);

  it("bajar la barra solo cambia y", () => {
    const frame = moveFrame(item, { ...rect, top: 30 }, { container, s: 1 });
    expect(frame).toEqual({ anchor: "stretch-top", x: 0, y: 30, w: 0, h: 56 });
  });
  it("sigue estirada al soltar", () => {
    const moved = { ...rect, top: 600 };
    const frame = moveFrame(item, moved, { container, s: 1 });
    expect(finalAnchor(item, frame, moved, container)).toBe("stretch-top");
  });
  it("estirar su alto con la manija inferior", () => {
    const frame = resizeFrame(item, { ...rect, height: 90 }, "s", { container, s: 1 });
    expect(frame).toMatchObject({ anchor: "stretch-top", h: 90, w: 0 });
  });
});

describe("móvil", () => {
  const container = containerOf("mobile");
  const el = { id: "c", template: "glass-card", frame: { anchor: "bottom-left", x: 40, y: -40, w: 380, h: 0 }, mobile: { mode: "auto" } };
  const rect = { left: 16, top: 500, width: 358, height: 200 };

  it("un elemento en automático parte de su caja y se ancla a su zona", () => {
    const item = dragItem(el, rect, "mobile", container);
    expect(item.anchor).toBe("bottom");
    expect(item.base).toEqual({ ...el.frame, w: 358 }); // el ancho del apilado se conserva
    const frame = moveFrame(item, { ...rect, left: 20 }, { container, s: 1 });
    expect(frame.anchor).toBe("bottom");
    expect(frame.h).toBe(0); // el alto sigue automático
  });

  it("un texto de ancho automático conserva el ancho del apilado al pasar a mano", () => {
    const text = { id: "t", template: "text", frame: { anchor: "top-left", x: 40, y: 40, w: 0, h: 0 }, mobile: { mode: "auto" } };
    const box = { left: 16, top: 300, width: 358, height: 39 };
    const item = dragItem(text, box, "mobile", container);
    const frame = moveFrame(item, box, { container, s: 1 });
    expect(frame.w).toBe(358);
    expect(frame.h).toBe(0);
    close(resolveFrame(frame, container, 1, { w: 213, h: 39 }).rect, box);
  });

  it("un elemento a mano usa su frame móvil", () => {
    const custom = { ...el, mobile: { mode: "custom", frame: { anchor: "top", x: 0, y: 80, w: 300, h: 0 } } };
    expect(hasMobileFrame(custom)).toBe(true);
    const item = dragItem(custom, rect, "mobile", container);
    expect(item.anchor).toBe("top");
    expect(item.base).toBe(custom.mobile.frame);
  });

  it("modo a mano sin frame cuenta como automático", () => {
    expect(hasMobileFrame({ mobile: { mode: "custom", frame: null } })).toBe(false);
  });

  it("una barra estirada sigue estirada en móvil", () => {
    const bar = { id: "t", template: "basic-topbar", frame: { anchor: "stretch-top", x: 0, y: 0, w: 0, h: 56 }, mobile: { mode: "auto" } };
    expect(dragItem(bar, { left: 0, top: 0, width: 390, height: 56 }, "mobile", container).anchor).toBe("stretch-top");
  });
});

describe("convertToMobileCustom", () => {
  const design = {
    screens: {
      tour: {
        elements: [
          { id: "a", template: "glass-card", frame: { anchor: "bottom-left", x: 40, y: -40, w: 380, h: 0 }, mobile: { mode: "auto" }, z: 1 },
          { id: "b", template: "text", frame: { anchor: "top-left", x: 40, y: 40, w: 0, h: 0 }, mobile: { mode: "custom", frame: { anchor: "top", x: 0, y: 70, w: 0, h: 0 } }, z: 2 },
          { id: "c", template: "text", frame: { anchor: "top-left", x: 0, y: 0, w: 0, h: 0 }, mobile: { mode: "auto" }, locked: true, z: 3 },
        ],
      },
    },
  };
  const boxes = [
    { id: "a", left: 16, top: 500, width: 358, height: 200 },
    { id: "b", left: 100, top: 70, width: 190, height: 30 },
    { id: "c", left: 16, top: 16, width: 100, height: 20 },
  ];

  it("pasa a mano solo lo automático y desbloqueado, conservando la caja", () => {
    const next = convertToMobileCustom(design, "tour", ["a", "b", "c"], boxes);
    const a = next.screens.tour.elements.find((e) => e.id === "a");
    expect(a.mobile.mode).toBe("custom");
    expect(a.mobile.frame.anchor).toBe("bottom");
    const container = containerOf("mobile");
    close(resolveFrame(a.mobile.frame, container, 1, { w: 358, h: 200 }).rect, { left: 16, top: 500, width: 358, height: 200 });
    expect(next.screens.tour.elements.find((e) => e.id === "b")).toBe(design.screens.tour.elements[1]); // ya estaba a mano
    expect(next.screens.tour.elements.find((e) => e.id === "c").mobile.mode).toBe("auto"); // bloqueado
  });

  it("sin nada que pasar devuelve el mismo diseño", () => {
    expect(convertToMobileCustom(design, "tour", ["b", "c"], boxes)).toBe(design);
  });
});
