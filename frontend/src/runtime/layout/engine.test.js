import { describe, expect, it } from "vitest";
import {
  computeScale,
  isMobileWidth,
  layoutAll,
  layoutDesktop,
  layoutMobile,
  resolveFrame,
  rowOfAnchor,
} from "./engine.js";
import { frameToStyle } from "./frame.js";

const D = { W: 1440, H: 900 };
const near = (a, b) => expect(a).toBeCloseTo(b, 6);

describe("computeScale", () => {
  it("en 1440×900 vale exactamente 1", () => {
    expect(computeScale(1440, 900)).toBe(1);
  });
  it("sqrt((W/1440)·(H/900)) dentro del rango", () => {
        near(computeScale(1600, 1000), Math.sqrt((1600 / 1440) * (1000 / 900)));
  });
  it("se limita a 0.8 y 1.25", () => {
    expect(computeScale(300, 300)).toBe(0.8);
    expect(computeScale(3840, 2160)).toBe(1.25);
  });
  it("usa la media geométrica: un eje grande y otro chico se compensan", () => {
    near(computeScale(2880, 450), 1); // ×2 en ancho, ×0.5 en alto
  });
  it("tamaño inválido → 1", () => {
    expect(computeScale(0, 0)).toBe(1);
    expect(computeScale(NaN, 900)).toBe(1);
  });
  it("con otro lienzo de referencia (móvil 390×844) da 1 en ese tamaño", () => {
    expect(computeScale(390, 844, { w: 390, h: 844 })).toBe(1);
  });
});

describe("isMobileWidth", () => {
  it("móvil si el contenedor mide menos de 720 px", () => {
    expect(isMobileWidth(719)).toBe(true);
    expect(isMobileWidth(720)).toBe(false);
    expect(isMobileWidth(390)).toBe(true);
    expect(isMobileWidth(0)).toBe(false);
  });
});

describe("resolveFrame · anclas puntuales", () => {
  it("top-left: el pivote (esquina sup. izq.) queda a (x, y) de la esquina", () => {
    const r = resolveFrame({ anchor: "top-left", x: 40, y: 30, w: 200, h: 100 }, D, 1);
    expect(r.rect).toEqual({ left: 40, top: 30, width: 200, height: 100 });
  });

  it("bottom-right con offset negativo: conserva la distancia a su esquina", () => {
    const frame = { anchor: "bottom-right", x: -24, y: -20, w: 200, h: 100 };
    const r = resolveFrame(frame, D, 1);
    expect(D.W - (r.rect.left + r.rect.width)).toBe(24);
    expect(D.H - (r.rect.top + r.rect.height)).toBe(20);
  });

  it("la esquina anclada conserva su distancia cuando el contenedor crece (s=1 fijo)", () => {
    const frame = { anchor: "bottom-right", x: -24, y: -20, w: 200, h: 100 };
    [
      { W: 1440, H: 900 },
      { W: 1700, H: 1000 },
      { W: 2200, H: 1300 },
    ].forEach((c) => {
      const r = resolveFrame(frame, c, 1);
      expect(c.W - (r.rect.left + r.rect.width)).toBe(24);
      expect(c.H - (r.rect.top + r.rect.height)).toBe(20);
    });
  });

  it("con escala, la distancia a la esquina y el tamaño crecen con --s", () => {
    const c = { W: 1800, H: 1125 }; // s = 1.25
    const s = computeScale(c.W, c.H);
    expect(s).toBe(1.25);
    const r = resolveFrame({ anchor: "bottom-right", x: -24, y: -20, w: 200, h: 100 }, c, s);
    near(c.W - (r.rect.left + r.rect.width), 24 * s);
    near(c.H - (r.rect.top + r.rect.height), 20 * s);
    near(r.rect.width, 200 * s);
    near(r.rect.height, 100 * s);
  });

  it("escala desde el pivote: la esquina anclada no se mueve al escalar", () => {
    const frame = { anchor: "bottom-right", x: 0, y: 0, w: 200, h: 100 };
    const a = resolveFrame(frame, D, 1).rect;
    const b = resolveFrame(frame, D, 1.25).rect;
    near(a.left + a.width, b.left + b.width);
    near(a.top + a.height, b.top + b.height);
  });

  it("center: el pivote es el centro; offset positivo mueve a la derecha y abajo", () => {
    const r = resolveFrame({ anchor: "center", x: 100, y: -50, w: 300, h: 200 }, D, 1);
    near(r.rect.left + r.rect.width / 2, 720 + 100);
    near(r.rect.top + r.rect.height / 2, 450 - 50);
  });

  it("el centro sigue en el centro del contenedor al cambiar de tamaño", () => {
    const frame = { anchor: "center", x: 0, y: 0, w: 300, h: 200 };
    [
      { W: 1024, H: 768 },
      { W: 1920, H: 1080 },
    ].forEach((c) => {
      const r = resolveFrame(frame, c, computeScale(c.W, c.H));
      near(r.rect.left + r.rect.width / 2, c.W / 2);
      near(r.rect.top + r.rect.height / 2, c.H / 2);
    });
  });

  it("left (centro-izquierda): pegado al borde izquierdo y centrado en vertical", () => {
    const r = resolveFrame({ anchor: "left", x: 56, y: 0, w: 520, h: 400 }, D, 1);
    expect(r.rect.left).toBe(56);
    near(r.rect.top + r.rect.height / 2, 450);
  });

  it("top y bottom centran en horizontal", () => {
    const t = resolveFrame({ anchor: "top", x: 0, y: 24, w: 400, h: 60 }, D, 1).rect;
    near(t.left + t.width / 2, 720);
    expect(t.top).toBe(24);
    const b = resolveFrame({ anchor: "bottom", x: 0, y: -24, w: 400, h: 60 }, D, 1).rect;
    near(b.left + b.width / 2, 720);
    near(b.top + b.height, 900 - 24);
  });

  it("devuelve la caja sin escalar + origen en el pivote: scale(s) desde ahí da el rect visual", () => {
    const s = 1.25;
    const r = resolveFrame({ anchor: "bottom-right", x: -30, y: -30, w: 200, h: 100 }, { W: 1800, H: 1125 }, s);
    expect(r.origin).toEqual({ x: 1, y: 1 });
    expect(r.box.width).toBe(200);
    expect(r.box.height).toBe(100);
    // rect visual = escalar la caja desde el pivote
    const pivotX = r.box.left + r.origin.x * r.box.width;
    const pivotY = r.box.top + r.origin.y * r.box.height;
    near(pivotX - r.origin.x * r.box.width * s, r.rect.left);
    near(pivotY - r.origin.y * r.box.height * s, r.rect.top);
  });

  it("anclaje desconocido y frame vacío caen en top-left sin romper", () => {
    expect(resolveFrame({ anchor: "raro", x: 4, y: 5, w: 10, h: 20 }, D, 1).rect).toEqual({
      left: 4,
      top: 5,
      width: 10,
      height: 20,
    });
    expect(resolveFrame(null, D, 1).rect).toEqual({ left: 0, top: 0, width: 0, height: 0 });
  });

  it("w/h = 0 usan el tamaño natural medido (auto)", () => {
    const r = resolveFrame({ anchor: "bottom-right", x: -10, y: -10, w: 0, h: 0 }, D, 1, { w: 180, h: 40 });
    expect(r.rect.width).toBe(180);
    expect(r.rect.left + r.rect.width).toBe(1430);
  });
});

describe("resolveFrame · anclas estiradas", () => {
  it("stretch-top: margen x a cada lado y alto h; el ancho crece con el contenedor", () => {
    const a = resolveFrame({ anchor: "stretch-top", x: 16, y: 0, w: 0, h: 56 }, D, 1).rect;
    expect(a).toEqual({ left: 16, top: 0, width: 1408, height: 56 });
    const b = resolveFrame({ anchor: "stretch-top", x: 16, y: 0, w: 0, h: 56 }, { W: 1920, H: 900 }, 1).rect;
    expect(b.width).toBe(1888);
  });

  it("stretch-bottom (scrubber de la Oleada 1): márgenes de 16 px y pegado abajo", () => {
    const r = resolveFrame({ anchor: "stretch-bottom", x: 16, y: 16, w: 0, h: 32 }, D, 1).rect;
    expect(r).toEqual({ left: 16, top: 900 - 16 - 32, width: 1408, height: 32 });
  });

  it("stretch-left / stretch-right: alto completo menos el margen y; ancho w", () => {
    const l = resolveFrame({ anchor: "stretch-left", x: 12, y: 20, w: 300, h: 0 }, D, 1).rect;
    expect(l).toEqual({ left: 12, top: 20, width: 300, height: 860 });
    const r = resolveFrame({ anchor: "stretch-right", x: 12, y: 20, w: 300, h: 0 }, D, 1).rect;
    expect(r).toEqual({ left: 1440 - 12 - 300, top: 20, width: 300, height: 860 });
  });

  it("stretch-fill: llena el contenedor menos los márgenes", () => {
    expect(resolveFrame({ anchor: "stretch-fill", x: 10, y: 20 }, D, 1).rect).toEqual({
      left: 10,
      top: 20,
      width: 1420,
      height: 860,
    });
  });

  it("con escala, la barra estirada sigue ocupando todo el ancho", () => {
    const c = { W: 1024, H: 768 };
    const s = computeScale(c.W, c.H);
    const r = resolveFrame({ anchor: "stretch-top", x: 0, y: 0, w: 0, h: 56 }, c, s);
    near(r.rect.width, c.W);
    near(r.rect.height, 56 * s);
    near(r.box.width * s, c.W);
  });
});

describe("compatibilidad con los frames de la Oleada 1", () => {
  const css = (f) => frameToStyle(f);
  it("topbar (stretch-top) en 1440×900 ocupa lo mismo que antes", () => {
    const f = { anchor: "stretch-top", x: 0, y: 0, w: 0, h: 56 };
    const r = resolveFrame(f, D, 1).rect;
    expect(css(f)).toEqual({ left: "0px", right: "0px", top: "0px", height: "56px" });
    expect([r.left, r.top, r.width, r.height]).toEqual([0, 0, 1440, 56]);
  });
  it("scrubber (stretch-bottom) en 1440×900 ocupa lo mismo que antes", () => {
    const f = { anchor: "stretch-bottom", x: 16, y: 16, w: 0, h: 32 };
    const r = resolveFrame(f, D, 1).rect;
    expect(css(f)).toEqual({ left: "16px", right: "16px", bottom: "16px", height: "32px" });
    expect([r.left, r.top, r.width, r.height]).toEqual([16, 852, 1408, 32]);
  });
  it("top-left y center coinciden con la Oleada 1", () => {
    const tl = { anchor: "top-left", x: 30, y: 40, w: 100, h: 50 };
    expect(resolveFrame(tl, D, 1).rect).toEqual({ left: 30, top: 40, width: 100, height: 50 });
    const c = { anchor: "center", x: 10, y: 20, w: 100, h: 50 };
    const r = resolveFrame(c, D, 1).rect;
    near(r.left + 50, 720 + 10);
    near(r.top + 25, 450 + 20);
  });
});

describe("layoutDesktop", () => {
  const items = [
    { id: "bar", frame: { anchor: "stretch-top", x: 0, y: 0, w: 0, h: 56 } },
    { id: "logo", frame: { anchor: "top-left", x: 20, y: 70, w: 100, h: 40 } },
  ];
  it("topInset = fondo de la barra superior, escalado", () => {
    expect(layoutDesktop(items, D).topInset).toBe(56);
    const c = { W: 1800, H: 1125 };
    near(layoutDesktop(items, c).topInset, 56 * 1.25);
  });
  it("devuelve la escala usada", () => {
    expect(layoutDesktop(items, D).scale).toBe(1);
  });
});

describe("layoutMobile", () => {
  const C = { W: 390, H: 844 };
  const title = { id: "title", frame: { anchor: "left", x: 56, y: -60, w: 520, h: 160 }, mode: "auto", behavior: "stack" };
  const lead = { id: "lead", frame: { anchor: "left", x: 56, y: 90, w: 480, h: 90 }, mode: "auto", behavior: "stack" };
  const logo = { id: "logo", frame: { anchor: "top", x: 0, y: 40, w: 160, h: 48 }, mode: "auto", behavior: "stack" };
  const loader = { id: "loader", frame: { anchor: "bottom-right", x: -40, y: -40, w: 220, h: 40 }, mode: "auto", behavior: "dock-bottom" };
  const cta = { id: "cta", frame: { anchor: "bottom-left", x: 56, y: -70, w: 260, h: 52 }, mode: "auto", behavior: "stack" };

  it("el ancho es min(w, 100% − 32 px) y hay 16 px de margen", () => {
    const { items: out } = layoutMobile([title], C);
    const r = out.get("title").rect;
    expect(r.width).toBe(358);
    expect(r.left).toBe(16);
    expect(r.left + r.width).toBe(C.W - 16);
  });

  it("un elemento más angosto que el espacio conserva su ancho", () => {
    const { items: out } = layoutMobile([logo], C);
    const r = out.get("logo").rect;
    expect(r.width).toBe(160);
    near(r.left + r.width / 2, C.W / 2); // ancla "top" → centrado
  });

  it("apila por zona: arriba empieza en 16 px, con 12 px entre piezas, en el orden del diseño", () => {
    const { items: out } = layoutMobile([lead, title, logo], C); // desordenados a propósito
    const l = out.get("logo").rect;
    const t = out.get("title").rect;
    const p = out.get("lead").rect;
    expect(l.top).toBe(16);
    // logo (y=40) → título (centro-izq. y<) → párrafo; el orden sale del diseño de escritorio.
    expect(t.top).toBeGreaterThanOrEqual(l.top + l.height + 12 - 1e-9);
    expect(t.top).toBeLessThan(p.top);
    // no se encimen entre sí
    expect(t.top + t.height).toBeLessThanOrEqual(p.top + 1e-9);
  });

  it("la pila de abajo crece hacia arriba desde 16 px del borde inferior", () => {
    const { items: out } = layoutMobile([cta, loader], C);
    const lo = out.get("loader").rect;
    const c = out.get("cta").rect;
    near(lo.top + lo.height, C.H - 16);
    near(c.top + c.height, lo.top - 12);
  });

  it("dock-bottom va a la zona de abajo y centrado aunque su ancla sea arriba", () => {
    const pill = { id: "pill", frame: { anchor: "top-right", x: -20, y: 20, w: 200, h: 40 }, mode: "auto", behavior: "dock-bottom" };
    const { items: out } = layoutMobile([pill], C);
    const r = out.get("pill").rect;
    near(r.top + r.height, C.H - 16);
    near(r.left + r.width / 2, C.W / 2);
  });

  it("las barras estiradas se quedan fijas y la pila de arriba empieza debajo", () => {
    const bar = { id: "bar", frame: { anchor: "stretch-top", x: 0, y: 0, w: 0, h: 56 }, mode: "auto", behavior: "keep" };
    const res = layoutMobile([bar, logo], C);
    expect(res.items.get("bar").rect).toEqual({ left: 0, top: 0, width: 390, height: 56 });
    expect(res.topInset).toBe(56);
    expect(res.items.get("logo").rect.top).toBe(56 + 12);
  });

  it("la pila de abajo se asienta sobre el scrubber fijo", () => {
    const scrub = { id: "scrub", frame: { anchor: "stretch-bottom", x: 16, y: 16, w: 0, h: 32 }, mode: "auto", behavior: "keep" };
    const res = layoutMobile([scrub, loader], C);
    const sc = res.items.get("scrub").rect;
    expect(sc.top + sc.height).toBe(C.H - 16);
    const lo = res.items.get("loader").rect;
    near(lo.top + lo.height, sc.top - 12);
  });

  it("el centro se centra en el espacio libre", () => {
    const { items: out } = layoutMobile([title], C);
    const r = out.get("title").rect;
    near(r.top + r.height / 2, C.H / 2);
  });

  it("el centro no se encima con las pilas de arriba y abajo", () => {
    const tall = { id: "tall", frame: { anchor: "center", x: 0, y: 0, w: 500, h: 780 }, mode: "auto", behavior: "stack" };
    const res = layoutMobile([logo, tall, cta], C);
    const t = res.items.get("tall").rect;
    const l = res.items.get("logo").rect;
    expect(t.top).toBeGreaterThanOrEqual(l.top + l.height + 12 - 1e-9);
  });

  it("usa el alto medido (h) del item cuando viene", () => {
    const measured = { ...title, h: 300 };
    const { items: out } = layoutMobile([measured], C);
    expect(out.get("title").rect.height).toBe(300);
  });

  it("modo custom usa mobileFrame sobre el lienzo de 390×844", () => {
    const el = {
      id: "x",
      mode: "custom",
      frame: { anchor: "left", x: 56, y: 0, w: 520, h: 160 },
      mobileFrame: { anchor: "bottom", x: 0, y: -100, w: 300, h: 60 },
      behavior: "stack",
    };
    const { items: out, scale } = layoutMobile([el], C);
    expect(scale).toBe(1);
    const r = out.get("x").rect;
    near(r.left + r.width / 2, 195);
    near(r.top + r.height, 844 - 100);
  });

  it("la escala móvil es 1 en 390×844 y se reduce en pantallas más chicas", () => {
    expect(layoutMobile([], { W: 390, H: 844 }).scale).toBe(1);
    expect(layoutMobile([], { W: 360, H: 640 }).scale).toBeLessThan(1);
    expect(layoutMobile([], { W: 360, H: 640 }).scale).toBeGreaterThanOrEqual(0.8);
  });

  it("un elemento 'keep' conserva su frame de escritorio a escala móvil", () => {
    const keep = { id: "k", frame: { anchor: "top-left", x: 14, y: 14, w: 60, h: 24 }, mode: "auto", behavior: "keep" };
    expect(layoutMobile([keep], C).items.get("k").rect).toEqual({ left: 14, top: 14, width: 60, height: 24 });
  });
});

describe("layoutAll / rowOfAnchor", () => {
  it("elige el modo por el ancho del contenedor", () => {
    const item = { id: "a", frame: { anchor: "left", x: 56, y: 0, w: 520, h: 100 }, mode: "auto", behavior: "stack" };
    expect(layoutAll([item], { W: 720, H: 900 }).items.get("a").rect.left).toBe(56 * computeScale(720, 900));
    expect(layoutAll([item], { W: 719, H: 900 }).items.get("a").rect.left).toBe(16);
  });
  it("zona de cada ancla", () => {
    expect(rowOfAnchor("top-right")).toBe("top");
    expect(rowOfAnchor("stretch-top")).toBe("top");
    expect(rowOfAnchor("left")).toBe("center");
    expect(rowOfAnchor("center")).toBe("center");
    expect(rowOfAnchor("bottom-left")).toBe("bottom");
  });
});

describe("mobile composite scaling",()=>{
 it("scales an entire wide group without changing its interior aspect ratio",()=>{
   const frame={anchor:"center",x:0,y:0,w:600,h:300};
   const result=layoutMobile([{id:"group",frame,scaleGroup:true,behavior:"scale",h:300}],{W:390,H:844}).items.get("group");
   expect(result.rect.width).toBe(358);
   expect(result.rect.height).toBe(179);
   expect(result.scale).toBeCloseTo(358/600);
   expect(result.box.width).toBeCloseTo(600);
   expect(result.box.height).toBeCloseTo(300);
 });
});
