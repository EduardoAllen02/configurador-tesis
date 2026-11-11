import { expect, it } from "vitest";
import { contextMenuOf, contextMenuEntries, contextMenuPosition, safeContextUrl } from "./contextMenu.js";

it("keeps old tours disabled, supports an intentionally empty list and does not mutate input", () => {
  expect(contextMenuOf().enabled).toBe(false);
  const value = { enabled: true, items: [], credit: { enabled: false } };
  expect(contextMenuOf(value).items).toEqual([]);
  expect(value).toEqual({ enabled: true, items: [], credit: { enabled: false } });
  expect(contextMenuEntries(contextMenuOf())).toEqual([]);
});
it("only exposes configured functional actions and filters invalid or unsafe links", () => {
  const config = contextMenuOf({ enabled: true, items: [
    { id: "1", type: "fullscreen" }, { id: "2", type: "reset-view", label: "Volver" },
    { id: "3", type: "link", url: "javascript:alert(1)" }, { id: "4", type: "link", label: "Sitio", url: "https://example.com" },
    { id: "5", type: "sound" }, { id: "4", type: "reset-view" },
  ] });
  expect(contextMenuEntries(config, { fullscreenSupported: false }).map(row => row.label)).toEqual(["Volver", "Sitio"]);
  expect(contextMenuEntries(config, { fullscreen: true })[0].label).toBe("Salir de pantalla completa");
  expect(contextMenuOf({ enabled: true, items: Array.from({ length: 20 }, (_, id) => ({ id: String(id), type: "reset-view" })) }).items).toHaveLength(8);
});
it("uses absolute web addresses for both menu and credit", () => {
  for (const url of ["data:text/html,test", "javascript:alert(1)", "//example.com", "/page", "https://", "mailto:a@example.com"]) expect(safeContextUrl(url)).toBe("");
  expect(safeContextUrl(" https://example.com/a?q=1 ")).toBe("https://example.com/a?q=1");
  expect(contextMenuOf({ credit: { url: "javascript:alert(1)" } }).credit.url).toBe("");
});
it("places the menu inside every corner and tolerates a very small viewport", () => {
  for (const [x, y] of [[0, 0], [1000, 0], [0, 700], [1000, 700]]) {
    const pos = contextMenuPosition(x, y, 220, 150, { width: 1000, height: 700 });
    expect(pos.x).toBeGreaterThanOrEqual(6); expect(pos.x + 220).toBeLessThanOrEqual(994);
    expect(pos.y).toBeGreaterThanOrEqual(6); expect(pos.y + 150).toBeLessThanOrEqual(694);
  }
  expect(contextMenuPosition(100, 100, 200, 100, { width: 100, height: 60 })).toEqual({ x: 6, y: 6 });
});
