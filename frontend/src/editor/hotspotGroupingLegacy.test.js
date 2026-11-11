import { expect, it, vi } from "vitest";
import { createHotspotSession } from "./hotspotSession.js";
import { createHotspotDetail } from "../runtime/model/hotspotDetail.js";
import { groupSelection, ungroupSelection } from "./design/actions.js";
import { registerCanvas } from "./design/canvas/canvasRegistry.js";
import { findElement } from "./design/elementOps.js";

it("groups V1 hotspot pieces in one undo step and preserves bound text/image through save, reload and ungroup", async () => {
  const hotspot = { id: "legacy-grouping", type: "info", title: "Título académico", description: "Descripción conservada", image: "/fixture.webp", content: { detail: createHotspotDetail() } };
  const save = vi.fn();
  const create = source => createHotspotSession({ hotspot: source, design: { panels: [] }, markerProps: {}, save, preview: vi.fn() });
  const store = create(hotspot); store.openSurface("detail");
  const surfaceRoot = () => store.getState().design.panels.find(panel => panel.id === "hotspot-detail").elements[0];
  const rootId = surfaceRoot().id;
  const titleId = surfaceRoot().children.find(row => row.bind === "title").id;
  const descriptionId = surfaceRoot().children.find(row => row.bind === "description").id;
  const imageId = surfaceRoot().children.find(row => row.bind === "image").id;
  store.enterGroup(rootId); store.select([titleId, descriptionId]);
  const original = store.getPatch();
  const boxes = () => {
    const rows = [];
    const append = (row, parentId = null, left = 0, top = 0) => {
      const x = left + (row.frame?.x || 0), y = top + (row.frame?.y || 0);
      rows.push({ id: row.id, parentId, left: x, top: y, contentLeft: x, contentTop: y, width: row.frame?.w || 100, height: row.frame?.h || 40, scale: 1 });
      row.children?.forEach(child => append(child, row.id, x, y));
    };
    append(surfaceRoot()); return rows;
  };
  const cleanup = registerCanvas(store, { getBoxes: boxes, prepareGrouping: () => store.materializeSurface("detail", boxes()) });
  try {
    const id = groupSelection(store);
    expect(id).toBeTruthy();
    const group = findElement(store.getState().design, store.getState().screen, id);
    expect(group.children.map(row => row.id)).toEqual([titleId, descriptionId]);
    expect(group.children.find(row => row.id === titleId).props.text).toBe(hotspot.title);
    expect(findElement(store.getState().design, store.getState().screen, imageId).props.asset).toBe(hotspot.image);
    await store.flush();
    const patch = store.getPatch();
    expect(patch.content.detail.version).toBe(1);
    expect(patch.title).toBe(hotspot.title); expect(patch.description).toBe(hotspot.description);
    expect(patch.content.card).toEqual(original.content.card);
    const loaded = create({ ...hotspot, ...patch }); loaded.openSurface("detail");
    expect(findElement(loaded.getState().design, loaded.getState().screen, titleId).props.text).toBe(hotspot.title);
    expect(findElement(loaded.getState().design, loaded.getState().screen, descriptionId).props.text).toBe(hotspot.description);
    store.undo(); expect(store.getPatch()).toEqual(original);
    store.redo(); expect(store.getPatch()).toEqual(patch);
    store.select(id); expect(ungroupSelection(store)).toEqual([titleId, descriptionId]);
    expect(surfaceRoot().children.some(row => row.id === titleId && row.props.text === hotspot.title)).toBe(true);
    expect(surfaceRoot().children.some(row => row.id === imageId && row.props.asset === hotspot.image)).toBe(true);
    expect(store.getPatch().content.detail.version).toBe(1);
    await store.flush(); await loaded.flush();
  } finally { cleanup(); }
});
