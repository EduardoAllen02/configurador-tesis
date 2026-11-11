// Acciones de alto nivel del editor de diseño, compartidas por el lienzo (C1) y los paneles (C2).
// Todas pasan por el almacén (deshacer + guardado automático) y trabajan sobre la pantalla
// activa (state.screen). Las coordenadas son px de DISEÑO del dispositivo activo (sin escala).
import { DEVICES, autoAnchor, frameFromRect } from "./geometry.js";
import { isStretch } from "../../runtime/layout/engine.js";
import { canvasFor } from "./canvas/canvasRegistry.js";
import { containerOf, layoutScaleOf } from "./canvas/frames.js";
import {
  addElement,
  duplicateElements,
  elementsOf,
  flattenElements,
  findElement,
  parentOf,
  groupElements,
  groupingReason,
  ungroupElements,
  removeElements,
  reorder,
  setFrame,
  updateElement,
} from "./elementOps.js";

// Inserta un elemento de la biblioteca. `item` = { template, props?, name?, w?, h?, frame? }.
// `at` = { x, y } centro deseado en px de diseño; sin `at`, al centro de la mesa de trabajo.
// Se ancla solo a la zona donde cae (anclaje automático). Lo deja seleccionado.
export function insertElement(store, item, at) {
  const { screen, device, activeGroupId, insertionGroupId, insertionSceneId, design } = store.getState();
  const parentId = activeGroupId || insertionGroupId;
  const dev = DEVICES[device] ?? DEVICES.desktop;
  const parent = parentId ? findElement(design, screen, parentId) : null;
  const container = parent ? { W: parent.props?.contentWidth || parent.frame?.w || 400, H: parent.props?.contentHeight || parent.frame?.h || 240 } : { W: dev.W, H: dev.H };
  const w = item.w ?? 0;
  const h = item.h ?? 0;
  const cx = at?.x ?? container.W / 2;
  const cy = at?.y ?? container.H / 2;
  // Tamaño provisional para anclar y centrar; si w/h son automáticos (0) se usa una caja nominal.
  const rect = { left: cx - (w || 240) / 2, top: cy - (h || 60) / 2, width: w || 240, height: h || 60 };
  // Las barras de la biblioteca traen su frame estirado (arriba / abajo): se respeta tal cual.
  const frame = isStretch(item.frame?.anchor)
    ? { ...item.frame }
    : { ...frameFromRect(rect, { anchor: autoAnchor(rect, container), container }), w, h };
  let newId = null;
  store.apply(
    (design) => {
      const res = addElement(design, screen, { template: item.template, props: item.props ?? {}, children: item.children, name: item.name ?? null, showIn: item.showIn ?? (insertionSceneId ? [insertionSceneId] : "all"), frame: parent ? { ...frame, anchor: "top-left", x: rect.left, y: rect.top } : frame }, parent?.id);
      newId = res.id;
      // Insertado en el lienzo móvil: queda acomodado a mano allí; en escritorio sigue automático.
      return device === "mobile" && !parent ? setFrame(res.design, screen, newId, frame, "mobile") : res.design;
    },
    { label: "Agregar elemento" }
  );
  if (newId) { if (parent && !activeGroupId) store.enterGroup(parent.id); store.select(newId); }
  return newId;
}

export function deleteSelection(store) {
  const { screen, selection } = store.getState();
  if (!selection.length) return;
  store.apply((d) => removeElements(d, screen, selection), { label: "Eliminar" });
}

export function duplicateSelection(store) {
  const { screen, selection } = store.getState();
  if (!selection.length) return;
  let ids = [];
  store.apply(
    (d) => {
      const res = duplicateElements(d, screen, selection);
      ids = res.ids;
      return res.design;
    },
    { label: "Duplicar" }
  );
  store.select(ids);
}

// Empuja la selección (flechas: 1 px; con Shift: 10 px). En anclas estiradas solo se mueve el
// eje libre. En móvil automático no hace nada (el motor apila); el lienzo debe pasar a "a mano".
export function nudgeSelection(store, dx, dy) {
  const { screen, selection, device, design } = store.getState();
  if (!selection.length) return;
  const mobile = device === "mobile";
  store.apply(
    (d) => {
      let next = d;
      flattenElements(elementsOf(design, screen))
        .filter((el) => selection.includes(el.id) && !el.locked)
        .forEach((el) => {
          const child = !!parentOf(design, screen, el.id);
          const frame = mobile ? child ? el.mobile?.groupFrame || el.frame : el.mobile?.frame : el.frame;
          if (!frame) return;
          const sx = /^stretch-(top|bottom|fill)$/.test(frame.anchor) ? 0 : dx;
          const sy = /^stretch-(left|right|fill)$/.test(frame.anchor) ? 0 : dy;
          // En right/bottom de las anclas estiradas el margen crece hacia adentro.
          const signX = frame.anchor === "stretch-right" ? -1 : 1;
          const signY = frame.anchor === "stretch-bottom" ? -1 : 1;
          next = setFrame(next, screen, el.id, { ...frame, x: (frame.x ?? 0) + sx * signX, y: (frame.y ?? 0) + sy * signY }, mobile ? child ? "mobile-group" : "mobile" : "desktop");
        });
      return next;
    },
    { label: "Mover", mergeKey: `nudge:${selection.join(",")}` }
  );
}

export function setSelectionLocked(store, locked) {
  const { screen, selection } = store.getState();
  if (!selection.length) return;
  store.apply((d) => updateElement(d, screen, selection, { locked }), { label: locked ? "Bloquear" : "Desbloquear" });
}

export function setSelectionHidden(store, hidden) {
  const { screen, selection } = store.getState();
  if (!selection.length) return;
  store.apply((d) => updateElement(d, screen, selection, { hidden }), { label: hidden ? "Ocultar" : "Mostrar" });
}

export function arrangeSelection(store, where) {
  const { screen, selection } = store.getState();
  if (selection.length !== 1) return;
  store.apply((d) => reorder(d, screen, selection[0], where), { label: "Ordenar" });
}


export function selectionGrouping(store) {
  const { design, screen, selection } = store.getState();
  const protectedRoot = design?.hotspotLayouts ? elementsOf(design, screen)[0]?.id : null;
  const protectedGroups = selection.filter(id => id === protectedRoot || findElement(design, screen, id)?.props?.legacyTemplate === "button");
  return {
    groupReason: groupingReason(design, screen, selection),
    canUngroup: selection.some(id => {
      const el = findElement(design, screen, id);
      return el?.template === "group" && !el.locked && !protectedGroups.includes(id);
    }),
    protectedRoot,
    protectedGroups,
  };
}

function groupingGeometry(store, boxes, options) {
  const { device } = store.getState();
  return { boxes: boxes ?? canvasFor(store)?.getBoxes() ?? [], options: options ?? { s: layoutScaleOf(device), container: containerOf(device) } };
}

function groupDeviceGeometry(store, options) {
  const canvas = canvasFor(store);
  if (!canvas?.getDeviceBoxes) return options;
  const desktop = canvas.getDeviceBoxes("desktop"), mobile = canvas.getDeviceBoxes("mobile");
  return desktop && mobile ? { ...options, deviceBoxes: { desktop, mobile } } : options;
}

export function groupSelection(store, boxes, options) {
  if (selectionGrouping(store).groupReason) return null;
  const geometry = groupingGeometry(store, boxes, options);
  if (canvasFor(store)?.prepareGrouping) {
    store.beginGesture();
    canvasFor(store).prepareGrouping();
    geometry.boxes = canvasFor(store).getBoxes();
  }
  const { design, screen, selection, device } = store.getState();
  const result = groupElements(design, screen, selection, geometry.boxes, { ...groupDeviceGeometry(store, geometry.options), device });
  if (!result.id) { store.cancelGesture(); return null; }
  store.apply(() => result.design, { label: "Agrupar" });
  store.endGesture("Agrupar");
  store.select(result.id);
  return result.id;
}

export function ungroupSelection(store, boxes, options) {
  const eligibility = selectionGrouping(store);
  if (!eligibility.canUngroup) return [];
  const geometry = groupingGeometry(store, boxes, options);
  if (canvasFor(store)?.prepareGrouping) {
    store.beginGesture();
    canvasFor(store).prepareGrouping();
    geometry.boxes = canvasFor(store).getBoxes();
  }
  const { design, screen, selection, device, activeGroupId } = store.getState();
  const result = ungroupElements(design, screen, selection.filter(id => !eligibility.protectedGroups.includes(id)), geometry.boxes, { ...groupDeviceGeometry(store, geometry.options), device });
  if (!result.ids.length) { store.cancelGesture(); return []; }
  if (selection.includes(activeGroupId)) store.exitGroup();
  store.apply(() => result.design, { label: "Desagrupar" });
  store.endGesture("Desagrupar");
  store.select(result.ids);
  return result.ids;
}
