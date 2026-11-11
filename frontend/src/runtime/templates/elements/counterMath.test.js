import { describe, expect, it } from "vitest";
import { COUNT_MS, ROTATE_MS, countValueAt, easeOutCubic, formatCount, isCountable, nextIndex } from "./counterMath.js";

describe("contador rotativo", () => {
  it("constantes del diseño de Colombini", () => {
    expect(COUNT_MS).toBe(1100);
    expect(ROTATE_MS).toBe(4200);
  });
  it("easeOutCubic: 0 → 0, 1 → 1, rápido al principio", () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
    expect(easeOutCubic(0.5)).toBeGreaterThan(0.8);
    expect(easeOutCubic(2)).toBe(1);
  });
  it("cuenta de 0 al objetivo en 1100 ms", () => {
    expect(countValueAt(1100, 0)).toBe(0);
    expect(countValueAt(1100, COUNT_MS)).toBe(1100);
    expect(countValueAt(1100, COUNT_MS * 2)).toBe(1100);
    const mid = countValueAt(1100, COUNT_MS / 2);
    expect(mid).toBeGreaterThan(550);
    expect(mid).toBeLessThan(1100);
  });
  it("es monótona", () => {
    let prev = -1;
    for (let t = 0; t <= COUNT_MS; t += 50) {
      const v = countValueAt(500, t);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
  });
  it("rota en círculo", () => {
    expect(nextIndex(0, 3)).toBe(1);
    expect(nextIndex(2, 3)).toBe(0);
    expect(nextIndex(0, 0)).toBe(0);
  });
  it("cuenta del valor a cero y respeta una duración de cero", () => {
    expect(countValueAt(9, 0, 1000, "down")).toBe(9);
    expect(countValueAt(9, 500, 1000, "down")).toBeLessThan(5);
    expect(countValueAt(9, 1000, 1000, "down")).toBe(0);
    expect(countValueAt(9, 0, 0, "up")).toBe(9);
    expect(countValueAt(9, 0, 0, "down")).toBe(0);
  });
  it("formatea con separador de miles", () => {
    expect(formatCount(1100, "en")).toBe("1,100");
    expect(formatCount(12, "en")).toBe("12");
  });
  it("solo los números son contables", () => {
    expect(isCountable(5)).toBe(true);
    expect(isCountable("5")).toBe(false);
    expect(isCountable(NaN)).toBe(false);
  });
});
