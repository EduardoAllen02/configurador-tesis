import { describe, expect, it, vi } from "vitest";
import { normalizeAction, runAction, safeHttpUrl } from "./actions.js";

describe("safeHttpUrl", () => {
  it("acepta http y https", () => {
    expect(safeHttpUrl("https://colombini.it/tour")).toBe("https://colombini.it/tour");
    expect(safeHttpUrl("  http://example.com ")).toBe("http://example.com/");
  });
  it("rechaza todo lo demás", () => {
    const bad = [
      "javascript:alert(1)",
      "JaVaScRiPt:alert(1)",
      "data:text/html,<b>x</b>",
      "file:///etc/passwd",
      "ftp://x.com",
      "//evil.com",
      "/ruta",
      "",
      "   ",
      null,
      undefined,
      42,
    ];
    bad.forEach((v) => expect(safeHttpUrl(v)).toBeNull());
  });
  it("rechaza caracteres de control escondidos", () => {
    expect(safeHttpUrl("java\nscript:alert(1)")).toBeNull();
    expect(safeHttpUrl("https://a.com/\u0000x")).toBeNull();
  });
});

describe("runAction", () => {
  it("enter llama a ctx.enter", () => {
    const ctx = { enter: vi.fn() };
    expect(runAction({ type: "enter" }, ctx)).toBe(true);
    expect(ctx.enter).toHaveBeenCalledOnce();
  });
  it("goToScene lleva el target", () => {
    const ctx = { goToScene: vi.fn() };
    runAction({ type: "goToScene", target: "s1" }, ctx);
    expect(ctx.goToScene).toHaveBeenCalledWith("s1");
  });
  it("sin target o sin ctx no hace nada ni rompe", () => {
    expect(runAction({ type: "goToScene" }, { goToScene: vi.fn() })).toBe(false);
    expect(runAction({ type: "enter" }, {})).toBe(false);
    expect(runAction(null, {})).toBe(false);
  });
  it("un tipo desconocido se ignora", () => {
    expect(normalizeAction({ type: "eval", target: "x" })).toEqual({ type: null, target: null });
  });
});
