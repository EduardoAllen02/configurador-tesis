import { createDesignStore } from "./design/designStore.js";
import { editableHotspotDetail, detailElements, normalizeHotspotDetail } from "../runtime/model/hotspotDetail.js";
import { editableHotspotCard } from "../runtime/model/hotspotCard.js";
import { exteriorLayout } from "../runtime/model/hotspotSurface.js";
export { exteriorLayout } from "../runtime/model/hotspotSurface.js";

export function visibleHotspotSurface(requested, detail, previousReveal) {
  if (requested === "detail" && !detail?.enabled) return "card";
  if (requested === "detail" && detail?.placement === "inline" && detail.reveal === "click" && previousReveal === "always") return "card";
  if (requested === "card" && detail?.enabled && detail.placement === "inline" && detail.reveal === "always") return "detail";
  return requested;
}
export const surfacePanel = surface => `panel:hotspot-${surface}`;
export function sessionLayout(doc, surface) {
  return { ...doc.hotspotLayouts[surface], elements: doc.panels.find(p => p.id === `hotspot-${surface}`)?.elements || [] };
}
const metadata = ({ elements, ...layout }) => layout;
// Start exterior gestures at the runtime's visible (viewport-constrained)
// position. Local root offsets belong to a gesture, never to canvas anchors.
export function rebaseHotspotPlacement(doc, surface, position) {
  const screen = surface === "detail" && doc.hotspotLayouts.detail.placement === "screen";
  const patch = sessionPatch(doc);
  const style = patch.style || doc.hotspotBaseStyle;
  return { ...doc, hotspotPlacementSurface: surface,
    hotspotData: { ...doc.hotspotData, style: screen ? style : { ...style, props: { ...style?.props, dx: position.x, dy: position.y } } },
    hotspotLayouts: { ...doc.hotspotLayouts, detail: { ...doc.hotspotLayouts.detail,
      ...(patch.content.detail?.placement === "screen" ? { offset: patch.content.detail.offset } : {}) } },
    panels: doc.panels.map(p => ({ ...p, elements: p.elements.map((el, i) => i ? el : {
      ...el, frame: { ...el.frame, anchor: "top-left", x: 0, y: 0 },
    }) })),
  };
}
const walk = (rows, fn) => rows.map(row => fn({ ...row, props: { ...row.props }, ...(row.children ? { children: walk(row.children, fn) } : {}) }));
// The academic branch keeps its V1 surface transport. Freeze visible geometry
// before grouping without introducing the V2 document/session model.
export function materializeHotspotGrouping(doc, surface, boxes = []) {
  if (!boxes.length) return doc;
  const byId = new Map(boxes.map(box => [box.id, box]));
  return { ...doc, panels: doc.panels.map(panel => panel.id !== `hotspot-${surface}` ? panel : { ...panel,
    elements: walk(panel.elements, row => {
      const box = byId.get(row.id), parent = box?.parentId && byId.get(box.parentId);
      const scale = parent?.scale || 1;
      return { ...row,
        ...(parent ? { frame: { ...row.frame, anchor: "top-left",
          x: (box.left - (parent.contentLeft ?? parent.left)) / scale,
          y: (box.top - (parent.contentTop ?? parent.top)) / scale,
          w: box.width / scale, h: box.height / scale } } : {}),
        ...(row.template === "group" ? { props: { ...row.props, detailAutoLayout: false } } : {}),
      };
    }) }) };
}
function bind(rows, data) {
  return walk(rows, row => {
    if (row.bind && row.template === "text") row.props.text = String(data[row.bind] || "");
    if (row.bind === "image") row.props.asset = data.image || null;
    return row;
  });
}
export function sessionPatch(doc) {
  const data = doc.hotspotData;
  const content = { ...data.content };
  for (const surface of ["card", "detail"]) {
    const layout = doc.hotspotLayouts[surface];
    if (!layout) continue;
    content[surface] = { ...layout, elements: walk(doc.panels.find(p => p.id === `hotspot-${surface}`).elements, row => {
      if (row.bind && row.template === "text") row.props.text = "";
      if (row.bind === "image") row.props.asset = null;
      return row;
    }) };
  }
  const surface = doc.hotspotPlacementSurface || (doc.hotspotLayouts.detail?.enabled && doc.hotspotLayouts.detail.placement === "inline" ? "detail" : "card");
  const moved = doc.panels.find(p => p.id === `hotspot-${surface}`)?.elements[0]?.frame;
  let style = data.style;
  if (moved && (surface === "card" || content.detail?.placement === "inline") && (moved.x || moved.y)) {
    style = { ...(data.style || doc.hotspotBaseStyle), props: { ...(data.style || doc.hotspotBaseStyle)?.props,
      dx: (data.style?.props?.dx ?? doc.hotspotMarkerProps?.dx ?? 48) + moved.x,
      dy: (data.style?.props?.dy ?? doc.hotspotMarkerProps?.dy ?? -40) + moved.y } };
  }
  if (content.detail?.placement === "screen") {
    const root = content.detail.elements[0], savedFrame = doc.hotspotScreenFrame || doc.hotspotLayouts.detail.elements?.[0]?.frame || {};
    content.detail = { ...content.detail, offset: {
      x: (doc.hotspotLayouts.detail.offset?.x || 0) + (root.frame.x || 0),
      y: (doc.hotspotLayouts.detail.offset?.y || 0) + (root.frame.y || 0),
    } };
    root.frame = { ...root.frame, anchor: savedFrame.anchor, x: savedFrame.x || 0, y: savedFrame.y || 0 };
  }
  for (const name of ["card", "detail"]) if (content[name]?.elements?.[0] && (name === "card" || content[name].placement === "inline")) content[name].elements[0].frame = { ...content[name].elements[0].frame, anchor: "top-left", x: 0, y: 0 };
  return { title: data.title, description: data.description, type: data.type,
    ...(data.type === "price" ? { price: data.price } : {}),
    ...(data.type === "nav" ? { targetSceneId: data.targetSceneId } : {}),
    style, content };
}
export function createHotspotSession({ hotspot, design, markerProps, snapshot, save, preview }) {
  const data = { ...hotspot, image: hotspot.image || "" };
  const layouts = {
    card: exteriorLayout(editableHotspotCard(hotspot, snapshot), "card"),
    detail: exteriorLayout(editableHotspotDetail(hotspot, design), "detail"),
  };
  const hydrated = (layout, boundData) => {
    const saved = new Map(); walk(layout.elements, row => { saved.set(row.id, row); return row; });
    return walk(detailElements(layout, boundData, markerProps), row => {
      const original = saved.get(row.id); row.props = { ...original?.props, ...(row.bind && row.template === "text" ? { text: row.props.text } : {}), ...(row.bind === "image" ? { asset: row.props.asset } : {}) };
      if (row.bind && !original?.hidden) delete row.hidden; return row;
    });
  };
  const panels = ["card", "detail"].map(surface => ({ id: `hotspot-${surface}`,
    elements: hydrated(layouts[surface], data).map(root => ({ ...root, frame: { ...root.frame, anchor: "top-left", x: 0, y: 0 } })), position: { desktop: "custom", mobile: "custom" } }));
  const base = createDesignStore({ save: doc => save(sessionPatch(doc)), autosaveMs: 350 });
  base.load({ ...design, panels, hotspotData: data, hotspotLayouts: Object.fromEntries(Object.entries(layouts).map(([name,layout])=>[name,metadata(layout)])),
    hotspotScreenFrame: layouts.detail.elements[0]?.frame, hotspotMarkerProps: markerProps, hotspotBaseStyle: hotspot.style });
  const update = updater => doc => {
    let next = updater(doc);
    if (!next || next === doc) return next;
    let changed = {};
    for (const panel of next.panels) {
      const old = doc.panels.find(p => p.id === panel.id);
      const before = new Map();
      walk(old?.elements || [], row => { before.set(row.id, row); return row; });
      walk(panel.elements, row => {
        if (row.bind && row.template === "text" && row.props.text !== before.get(row.id)?.props?.text)
          changed[row.bind] = row.props.text;
        return row;
      });
    }
    const merged = { ...next.hotspotData, ...changed };
    next = { ...next, hotspotData: merged, panels: next.panels.map(panel => ({ ...panel,
      elements: bind(panel.elements, merged).map(root => ({ ...root, props: { ...root.props, detailAutoLayout: false } })) })) };
    return next;
  };
  const store = { ...base,
    getPatch: () => sessionPatch(base.getState().design),
    materializeSurface(surface, boxes) { store.preview(doc => materializeHotspotGrouping(doc, surface, boxes)); },
    apply: (fn, options) => base.apply(update(fn), options),
    preview: fn => base.preview(update(fn)),
    patchData(patch) { base.apply(doc => ({ ...doc, hotspotData: { ...doc.hotspotData, ...patch },
      panels: doc.panels.map(panel => ({ ...panel, elements: bind(panel.elements, { ...doc.hotspotData, ...patch }) })) }), { label: "Editar hotspot", mergeKey: "hotspot-data" }); },
    patchLayout(surface, patch, replacement) { base.apply(doc => {
      const layout = normalizeHotspotDetail({ ...sessionLayout(doc, surface), ...patch });
      return { ...doc, hotspotLayouts: { ...doc.hotspotLayouts, [surface]: metadata(layout) },
        ...(replacement ? { panels: doc.panels.map(p => p.id === `hotspot-${surface}` ? { ...p, elements: hydrated(layout, doc.hotspotData).map(root=>({...root,frame:{...root.frame,anchor:"top-left",x:0,y:0}})) } : p),
          ...(surface === "detail" ? {hotspotScreenFrame:layout.elements[0]?.frame} : {}) } : {}) };
    }, { label: "Configurar detalle" }); },
    openSurface(requested, piece) {
      const surface = visibleHotspotSurface(requested, base.getState().design.hotspotLayouts.detail);
      base.setScreen(surfacePanel(surface));
      const root = base.getState().design.panels.find(p => p.id === `hotspot-${surface}`).elements[0];
      base.setInsertionGroup(root.id);
      const selected = root.children?.find(p => p.id === piece?.id) || root.children?.find(p => (p.role || p.bind) === piece?.role);
      base.enterGroup(selected ? root.id : null);
      base.select(selected ? [selected.id] : [root.id]);
    },
  };
  let last;
  base.subscribe(state => {
    if (state.design !== last) { last = state.design; preview(sessionPatch(last), last.hotspotData.image); }
  });
  return store;
}
