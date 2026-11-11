import { describe, expect, it } from "vitest";
import { FONT_LIST, fontStack, resolveBrandFonts } from "./fontList.js";

describe("lista curada de fuentes", () => {
  it("amplía el catálogo sin perder las fuentes de diseños existentes", () => {
    expect(FONT_LIST.map((f) => f.id)).toEqual(expect.arrayContaining(["Inter", "Manrope", "DM Sans", "Playfair Display", "JetBrains Mono", "Montserrat", "Roboto", "Merriweather"]));
    expect(FONT_LIST).toHaveLength(15);
    expect(new Set(FONT_LIST.map((f) => f.id)).size).toBe(FONT_LIST.length);
  });
  it("Inter conserva la pila de siempre (TourInter primero)", () => {
    expect(fontStack("Inter").startsWith('"TourInter", "Inter"')).toBe(true);
  });
  it("una fuente desconocida o inyectada cae en Inter", () => {
    expect(fontStack("Comic Sans; } body { x")).toBe(fontStack("Inter"));
    expect(fontStack(undefined)).toBe(fontStack("Inter"));
  });
  it("resuelve heading/body/mono de la marca", () => {
    const r = resolveBrandFonts({ heading: "Playfair Display", body: "Manrope", mono: "JetBrains Mono" });
    expect(r.heading).toContain("TourPlayfair");
    expect(r.body).toContain("TourManrope");
    expect(r.mono).toContain("TourJetBrainsMono");
  });
  it("sin fuentes: Inter y mono del sistema", () => {
    const r = resolveBrandFonts(undefined);
    expect(r.heading).toBe(fontStack("Inter"));
    expect(r.mono).toContain("ui-monospace");
  });
  it("mono solo acepta fuentes monoespaciadas", () => {
    expect(resolveBrandFonts({ mono: "Manrope" }).mono).toContain("ui-monospace");
  });
});
