import { describe, expect, it } from "vitest";
import { fetchBlobWithProgress } from "./loadProgress.js";

describe("descarga de panorámica", () => {
  const response = (headers = {}) => new Response(new ReadableStream({ start(c) { c.enqueue(new Uint8Array([1, 2])); c.enqueue(new Uint8Array([3])); c.close(); } }), { headers });
  it("informa bytes por bloque y el total conocido", async () => {
    const events = [];
    const blob = await fetchBlobWithProgress("test", { fetcher: async () => response({ "content-length": "3" }), onProgress: e => events.push(e) });
    expect(blob.size).toBe(3);
    expect(events).toContainEqual({ loaded: 2, total: 3 });
    expect(events.at(-1)).toEqual({ loaded: 3, total: 3 });
  });
  it("mantiene indeterminado si no hay longitud y termina con bytes reales", async () => {
    const events = [];
    await fetchBlobWithProgress("test", { fetcher: async () => response(), onProgress: e => events.push(e) });
    expect(events[1]).toEqual({ loaded: 2, total: 0 });
    expect(events.at(-1)).toEqual({ loaded: 3, total: 3 });
  });
  it("no confunde bytes comprimidos con bytes del stream", async () => {
    const events = [];
    await fetchBlobWithProgress("test", { fetcher: async () => response({ "content-length": "2", "content-encoding": "gzip" }), onProgress: e => events.push(e) });
    expect(events[0].total).toBe(0);
  });
  it("rechaza HTTP fallido sin marcar carga completa", async () => {
    await expect(fetchBlobWithProgress("test", { fetcher: async () => new Response(null, { status: 404 }) })).rejects.toThrow("404");
  });
});
