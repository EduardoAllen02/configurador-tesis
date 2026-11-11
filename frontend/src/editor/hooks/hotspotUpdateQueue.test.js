import { describe, expect, it, vi } from "vitest";
import { createHotspotUpdateQueue } from "./hotspotUpdateQueue.js";

describe("guardado consecutivo de gestos de hotspot", () => {
  it("tarjeta, tarjeta y punto conservan las últimas distancias aunque el servidor tarde", async () => {
    let release;
    const gate = new Promise((resolve) => { release = resolve; });
    let local = { id: "h", style: { dx: 65, dy: -85 }, lon: 0 };
    let server = { ...local };
    const commit = vi.fn((id, row) => { local = row; });
    const queue = createHotspotUpdateQueue({ preview: (id, patch) => { local = { ...local, ...patch }; }, commit, recover: vi.fn() });
    const save = vi.fn(async (patch, wait) => { if (wait) await gate; server = { ...server, ...patch }; return { ...server }; });
    const a = queue("h", { style: { dx: 150, dy: -50 } }, () => save({ style: { dx: 150, dy: -50 } }, true));
    const b = queue("h", { style: { dx: -120, dy: 40 } }, () => save({ style: { dx: -120, dy: 40 } }));
    const c = queue("h", { lon: 28 }, () => save({ lon: 28 }));
    expect(local).toMatchObject({ style: { dx: -120, dy: 40 }, lon: 28 });
    await vi.waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    release();
    await Promise.all([a, b, c]);
    expect(commit).toHaveBeenCalledTimes(1);
    expect(local).toEqual({ id: "h", style: { dx: -120, dy: 40 }, lon: 28 });
    expect(server).toEqual(local);
  });
  it("otro hotspot se guarda mientras el anterior sigue pendiente", async () => {
    let release;
    const gate = new Promise((resolve) => { release = resolve; });
    const commit = vi.fn();
    const queue = createHotspotUpdateQueue({ preview: vi.fn(), commit, recover: vi.fn() });
    const a = queue("a", { lon: 1 }, async () => { await gate; return { id: "a", lon: 1 }; });
    await queue("b", { lon: 2 }, async () => ({ id: "b", lon: 2 }));
    expect(commit).toHaveBeenCalledWith("b", { id: "b", lon: 2 });
    release();
    await a;
  });
  it("recarga el estado guardado al fallar y permite reintentar", async () => {
    const recover = vi.fn();
    const commit = vi.fn();
    const queue = createHotspotUpdateQueue({ preview: vi.fn(), commit, recover });
    await expect(queue("h", {}, () => Promise.reject(new Error("Sin conexión")))).rejects.toThrow("Sin conexión");
    expect(recover).toHaveBeenCalledOnce();
    await queue("h", { lon: 4 }, async () => ({ id: "h", lon: 4 }));
    expect(commit).toHaveBeenCalledWith("h", { id: "h", lon: 4 });
  });
});
