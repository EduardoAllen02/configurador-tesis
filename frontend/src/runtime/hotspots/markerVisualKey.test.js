import { it, expect } from "vitest";
import { markerVisualKey } from "./markerVisualKey.js";
it("ignores JSONB order and numeric round-trip noise without changing the model", () => {
  const a = { title: "Sala", lon: 10, content: { card: { width: 248.90915261160825, height: 80 } } };
  const b = { updatedAt: "server", lon: 30, title: "Sala", content: { card: { height: 80, width: 248.9091526116082 } } };
  expect(markerVisualKey(a, null, false)).toBe(markerVisualKey(b, null, false));
  expect(a.content.card.width).toBe(248.90915261160825);
  b.content.card.width += .001;
  expect(markerVisualKey(a, null, false)).not.toBe(markerVisualKey(b, null, false));
});
it("detects content, preset, breakpoint and theme changes", () => {
  const row = { title: "Sala" }, key = markerVisualKey(row, null, false);
  expect(markerVisualKey({ title: "Otra" }, null, false)).not.toBe(key);
  expect(markerVisualKey(row, { props: { size: 35 } }, false)).not.toBe(key);
  expect(markerVisualKey(row, null, true)).not.toBe(key);
  expect(markerVisualKey(row, null, false, { doc: { design: { theme: "light" } } })).not.toBe(key);
});
