import { describe, expect, it } from "vitest";
import { SAFE_MARGIN, SNAP_PX, buildTargets, snapMove, snapResize } from "./snapping.js";

const D = { W: 1440, H: 900 };
const T = SNAP_PX; // zoom 1: 5 px de pantalla = 5 px de diseño
const rect = (left, top, width, height) => ({ left, top, width, height });

describe("buildTargets", () => {
  it("incluye bordes, centro y margen seguro de la mesa", () => {
    const { x, y } = buildTargets(D, []);
    expect(x.map((t) => t.v)).toEqual([0, 720, 1440, SAFE_MARGIN, 1440 - SAFE_MARGIN]);
    expect(y.map((t) => t.v)).toEqual([0, 450, 900, SAFE_MARGIN, 900 - SAFE_MARGIN]);
  });
  it("suma borde, centro y borde de cada elemento (y salta los vacíos)", () => {
    const { x } = buildTargets(D, [rect(100, 100, 200, 50), rect(10, 10, 0, 0)]);
    const els = x.filter((t) => t.kind === "element").map((t) => t.v);
    expect(els).toEqual([100, 200, 300]);
  });
});

describe("snapMove", () => {
  const targets = buildTargets(D, [rect(600, 300, 200, 100)]);

  it("pega el borde izquierdo al borde de la mesa dentro de 5 px", () => {
    const r = snapMove(rect(4, 500, 200, 80), targets, T);
    expect(r.dx).toBe(-4);
    expect(r.guides.some((g) => g.axis === "x" && g.pos === 0)).toBe(true);
  });

  it("no pega si pasa del umbral", () => {
    const r = snapMove(rect(10, 500, 200, 80), targets, T);
    // a 10 px del borde (0) y a 14 del margen seguro (24): nada cae dentro de 5 px
    expect(r.dx).toBe(0);
    expect(r.dy).toBe(0);
    expect(r.guides.filter((g) => g.axis === "x" && g.pos === 0)).toHaveLength(0);
  });

  it("pega el centro al centro de la mesa", () => {
    const r = snapMove(rect(623, 500, 200, 80), targets, T); // centro en 723
    expect(r.dx).toBe(-3);
    expect(r.guides.some((g) => g.axis === "x" && g.pos === 720)).toBe(true);
  });

  it("pega al margen seguro de 24 px", () => {
    const r = snapMove(rect(21, 500, 200, 80), targets, T);
    expect(r.dx).toBe(3);
  });

  it("pega al borde de otro elemento y dibuja la guía entre ambos", () => {
    const r = snapMove(rect(598, 500, 150, 80), targets, T);
    expect(r.dx).toBe(2);
    const g = r.guides.find((l) => l.axis === "x" && l.pos === 600);
    expect(g).toBeTruthy();
    expect(g.from).toBe(300); // desde el elemento fijo…
    expect(g.to).toBe(580); // …hasta el que se mueve
  });

  it("pega en los dos ejes a la vez", () => {
    const r = snapMove(rect(3, 2, 100, 100), targets, T);
    expect(r.dx).toBe(-3);
    expect(r.dy).toBe(-2);
  });

  it("el umbral crece al alejar el zoom (5 px de pantalla)", () => {
    const far = snapMove(rect(8, 500, 200, 80), targets, SNAP_PX / 0.5); // 10 px de diseño
    expect(far.dx).toBe(-8);
  });

  it("elige el objetivo más cercano", () => {
    const t = buildTargets(D, [rect(30, 0, 10, 10)]);
    // borde izq. en 26: cerca de 24 (margen, 2 px) y de 30 (elemento, 4 px)
    expect(snapMove(rect(26, 500, 100, 50), t, T).dx).toBe(-2);
  });
});

describe("snapResize", () => {
  const targets = buildTargets(D, []);

  it("solo corrige el borde que se arrastra", () => {
    const far = snapResize(rect(100, 100, 300, 200), "e", targets, T); // borde derecho en 400: nada cerca
    expect(far.rect).toEqual(rect(100, 100, 300, 200));
    const near = snapResize(rect(100, 100, 1338, 200), "e", targets, T); // derecho en 1438 → 1440
    expect(near.rect.left).toBe(100);
    expect(near.rect.width).toBe(1340);
    expect(near.guides.some((g) => g.axis === "x" && g.pos === 1440)).toBe(true);
  });

  it("manija noroeste pega izquierdo y superior, y conserva el borde opuesto", () => {
    const { rect: r } = snapResize(rect(3, 4, 200, 100), "nw", targets, T);
    expect(r.left).toBe(0);
    expect(r.top).toBe(0);
    expect(r.left + r.width).toBe(203);
    expect(r.top + r.height).toBe(104);
  });

  it("no deja una caja menor de 1 px", () => {
    const { rect: r } = snapResize(rect(719.5, 100, 1, 50), "w", targets, T);
    expect(r.width).toBeGreaterThanOrEqual(1);
  });
});
