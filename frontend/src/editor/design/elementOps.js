import { screenElements, withScreenElements } from "../../runtime/model/interfaceModel.js";
// Operaciones puras sobre los elementos de una pantalla del diseño (plan §3.2):
//   design.screens[screen].elements = [Element…]
//   Element = { id, template, name, props, frame, mobile: { mode, frame? }, locked, hidden, z }
// Cada función recibe el diseño y devuelve uno NUEVO (sin mutar), listo para designStore.apply.
// `screen` es "tour" (HUD sobre el 360) o "intro" (pantalla de inicio).

import { frameFromRect } from "./geometry.js";

export const SCREENS = ["tour", "intro"];

export function newElementId() {
  const rnd = Math.random().toString(36).slice(2, 8);
  return `el_${Date.now().toString(36)}${rnd}`;
}

export function elementsOf(design, screen) {
  return screenElements(design, screen);
}

// Every element has a stable id. Callers may also use parent/child paths or arrays.
export function flattenElements(elements, parentId = null, path = []) {
  return (elements ?? []).flatMap((element) => [
    { ...element, parentId, path: [...path, element.id] },
    ...flattenElements(element.children, element.id, [...path, element.id]),
  ]);
}

export function findElementPath(design, screen, id) {
  const path = Array.isArray(id) ? id : String(id ?? "").split("/");
  if (path.length > 1) {
    let elements = elementsOf(design, screen);
    for (const part of path) {
      const found = elements.find((el) => el.id === part);
      if (!found) return null;
      elements = found.children ?? [];
    }
    return path;
  }
  return flattenElements(elementsOf(design, screen)).find((el) => el.id === path[0])?.path ?? null;
}

export function findElement(design, screen, id) {
  const path = findElementPath(design, screen, id);
  if (!path) return null;
  let found;
  let elements = elementsOf(design, screen);
  for (const part of path) {
    found = elements.find((el) => el.id === part);
    elements = found.children ?? [];
  }
  return found;
}

export function parentOf(design, screen, id) {
  const path = findElementPath(design, screen, id);
  return path?.length > 1 ? findElement(design, screen, path.slice(0, -1)) : null;
}

export function editableElements(design, screen, activeGroupId = null) {
  return activeGroupId ? findElement(design, screen, activeGroupId)?.children ?? [] : elementsOf(design, screen);
}

function mapTree(elements, fn) {
  return elements.map((el) => {
    const next = el.children ? { ...el, children: mapTree(el.children, fn) } : el;
    return fn(next);
  });
}

function withChildren(design, screen, parentId, children) {
  return parentId ? mapElements(design, screen, parentId, (el) => ({ ...el, children })) : withElements(design, screen, children);
}

export function cloneElementTree(element) {
  const copy = structuredClone(element);
  copy.id = newElementId();
  if (copy.children) copy.children = copy.children.map(cloneElementTree);
  return copy;
}

function withElements(design, screen, elements) {
  return withScreenElements(design, screen, elements);
}

function mapElements(design, screen, ids, fn) {
  const list = Array.isArray(ids) && findElementPath(design, screen, ids) ? [ids] : Array.isArray(ids) ? ids : [ids];
  const set = new Set(list.map((id) => Array.isArray(id) ? id.at(-1) : String(id).split("/").at(-1)));
  return withElements(
    design,
    screen,
    mapTree(elementsOf(design, screen), (el) => (set.has(el.id) ? fn(el) : el))
  );
}

const maxZ = (elements) => elements.reduce((m, el) => Math.max(m, el.z ?? 0), 0);

// Agrega un elemento nuevo arriba de todo. `partial` trae al menos { template, frame }.
export function addElement(design, screen, partial, parentId = null) {
  const elements = editableElements(design, screen, parentId);
  const element = {
    ...partial,
    id: partial.id ?? newElementId(),
    template: partial.template,
    name: partial.name ?? null,
    props: partial.props ?? {},
    ...(partial.children ? { children: partial.children.map(cloneElementTree) } : {}),
    ...(partial.showIn !== undefined ? { showIn: partial.showIn } : {}),
    ...(partial.bind !== undefined ? { bind: partial.bind } : {}),
    frame: partial.frame ?? { anchor: "center", x: 0, y: 0, w: 0, h: 0 },
    mobile: partial.mobile ?? { mode: "auto" },
    locked: false,
    hidden: false,
    z: maxZ(elements) + 1,
  };
  return { design: withChildren(design, screen, parentId, [...elements, element]), id: element.id };
}

// Cambia campos de primer nivel (name, locked, hidden, mobile…). No toca props ni frame.
export function updateElement(design, screen, ids, patch) {
  return mapElements(design, screen, ids, (el) => ({ ...el, ...patch }));
}

// Mezcla props (lo que edita la barra contextual). `undefined` en un valor lo quita (vuelve al default).
export function updateProps(design, screen, ids, propsPatch) {
  return mapElements(design, screen, ids, (el) => {
    const props = { ...(el.props ?? {}), ...propsPatch };
    Object.keys(propsPatch).forEach((k) => propsPatch[k] === undefined && delete props[k]);
    if (el.template === "group" && el.props?.legacyTemplate === "button") {
      let children = (el.children || []).map(child => {
        if (child.role === "button-label") return { ...child, props: { ...child.props,
          ...(Object.hasOwn(propsPatch,"label") ? { text: propsPatch.label ?? "" } : {}),
          ...(Object.hasOwn(propsPatch,"color") ? { color: propsPatch.color || "inherit" } : {}),
        } };
        if (child.role === "button-icon" && Object.hasOwn(propsPatch,"icon")) return { ...child, hidden: !propsPatch.icon, props: { ...child.props, icon: propsPatch.icon || child.props.icon } };
        return child;
      });
      if (propsPatch.icon && !children.some(child => child.role === "button-icon")) children = [...children, {
        id: `${el.id}--button-icon`, template: "icon", role: "button-icon", props: { icon: propsPatch.icon, size:16, color:"inherit" },
        frame: { anchor:"top-left",x:(props.contentWidth || el.frame.w || 240)-32,y:14,w:16,h:16 }, mobile:{mode:"auto"}, z:children.length+1,
      }];
      return { ...el, props, children };
    }
    return { ...el, props };
  });
}

// Guarda el frame según el dispositivo que se edita:
//   desktop / tablet → frame (un solo diseño que el motor escala)
//   mobile           → mobile = { mode: "custom", frame } (ajuste propio de móvil)
export function setFrame(design, screen, id, frame, device = "desktop") {
  return mapElements(design, screen, id, (el) =>
    device === "mobile-group" ? { ...el, mobile: { ...(el.mobile ?? {}), groupFrame: frame } }
      : device === "mobile" ? { ...el, mobile: { ...(el.mobile ?? {}), mode: "custom", frame } } : { ...el, frame }
  );
}

// Modo móvil de un elemento: "auto" (se apila solo), "custom" (a mano) o "hidden".
export function setMobileMode(design, screen, id, mode) {
  return mapElements(design, screen, id, (el) => {
    const mobile = { ...(el.mobile ?? {}), mode };
    if (mode === "custom" && !mobile.frame) mobile.frame = null; // el lienzo lo crea al primer arrastre
    return { ...el, mobile };
  });
}

export function removeElements(design, screen, ids) {
  const set = new Set((Array.isArray(ids) ? ids : [ids]).map((id) => String(id).split("/").at(-1)));
  const remove = (elements) => elements.filter((el) => !set.has(el.id) || el.locked).map((el) => el.children ? { ...el, children: remove(el.children) } : el);
  return withElements(design, screen, remove(elementsOf(design, screen)));
}

// Copies remain in the same parent; every descendant receives a fresh id.
export function duplicateElements(design, screen, ids, offset = 16) {
  const list = Array.isArray(ids) ? ids : [ids];
  const selected = new Set(list);
  const roots = flattenElements(elementsOf(design, screen)).filter((el) => selected.has(el.id) && !el.path.slice(0, -1).some((id) => selected.has(id)));
  let next = design;
  const copied = [];
  for (const entry of roots) {
    const el = findElement(design, screen, entry.id);
    const siblings = editableElements(next, screen, entry.parentId);
    const copy = cloneElementTree(el);
    const shift = (f) => f ? { ...f, x: (f.x ?? 0) + offset, y: (f.y ?? 0) + offset } : f;
    copy.frame = shift(copy.frame);
    if (copy.mobile?.frame) copy.mobile.frame = shift(copy.mobile.frame);
    copy.locked = false;
    copy.z = maxZ(siblings) + 1;
    next = withChildren(next, screen, entry.parentId, [...siblings, copy]);
    copied.push(copy.id);
  }
  return { design: next, ids: copied };
}

// Orden de capas: "front" | "back" | "forward" | "backward". Renumera z de 1 a n.
export function reorder(design, screen, id, where) {
  const parent = parentOf(design, screen, id);
  const siblings = editableElements(design, screen, parent?.id);
  const sorted = [...siblings].sort((a, b) => (a.z ?? 0) - (b.z ?? 0));
  const i = sorted.findIndex((el) => el.id === id);
  if (i < 0) return design;
  const [el] = sorted.splice(i, 1);
  const to = { front: sorted.length, back: 0, forward: Math.min(i + 1, sorted.length), backward: Math.max(i - 1, 0) }[where] ?? i;
  sorted.splice(to, 0, el);
  const zOf = new Map(sorted.map((e, k) => [e.id, k + 1]));
  return withChildren(design, screen, parent?.id, siblings.map((e) => ({ ...e, z: zOf.get(e.id) })));

}

// Mueve elementos de capa por arrastre en el panel de capas: `orderedIds` de abajo hacia arriba.
export function setLayerOrder(design, screen, orderedIds, parentId = null) {
  const zOf = new Map(orderedIds.map((id, k) => [id, k + 1]));
  return withChildren(design, screen, parentId, editableElements(design, screen, parentId).map((e) => (zOf.has(e.id) ? { ...e, z: zOf.get(e.id) } : e)));
}


export function groupingReason(design, screen, ids) {
  const selected = new Set(ids);
  const entries = flattenElements(elementsOf(design, screen)).filter((el) => selected.has(el.id));
  if (entries.length < 2) return "Selecciona al menos dos elementos";
  if (entries.some((el) => el.locked)) return "Desbloquea los elementos para agrupar";
  if (entries.some((el) => el.parentId !== entries[0].parentId)) return "Selecciona elementos del mismo grupo";
  const parentId = entries[0].parentId;
  // One nested group is allowed (group -> group -> leaf).
  const depth = parentId ? findElementPath(design, screen, parentId).length : 0;
  const subtreeDepth = (el) => el.children?.length ? 1 + Math.max(...el.children.map(subtreeDepth)) : 0;
  return depth + 1 + Math.max(...entries.map(subtreeDepth)) > 2 ? "Se admite un grupo dentro de otro grupo" : null;
}

// Group/ungroup preserve the measured appearance. Boxes are absolute board pixels.
export function groupElements(design, screen, ids, boxes, { s = 1, container = { W: 1440, H: 900 }, device = "desktop", deviceBoxes } = {}) {
  if (deviceBoxes) {
    const grouped = groupElements(design, screen, ids, deviceBoxes.desktop, { s: 1 });
    if (!grouped.id) return grouped;
    const group = findElement(grouped.design, screen, grouped.id), parent = parentOf(grouped.design, screen, grouped.id);
    const rows = ids.map(id => deviceBoxes.mobile.find(box => box.id === id)).filter(Boolean);
    if (ids.some(id => !rows.some(row => row.id === id) && findElement(design, screen, id)?.mobile?.mode !== "hidden")) return { design, id: null };
    if (!rows.length) return { ...grouped, design: updateElement(grouped.design, screen, grouped.id, { mobile: { mode: "hidden" } }) };
    const left = Math.min(...rows.map(row => row.left)), top = Math.min(...rows.map(row => row.top));
    const width = Math.max(...rows.map(row => row.left + row.width)) - left, height = Math.max(...rows.map(row => row.top + row.height)) - top;
    const host = parent ? deviceBoxes.mobile.find(box => box.id === parent.id) : null;
    const scale = host?.scale || 1;
    const frame = frameFromRect({ left: left - (host?.contentLeft ?? host?.left ?? 0), top: top - (host?.contentTop ?? host?.top ?? 0), width, height }, { anchor: "top-left", s: scale, container: { W: 390, H: 844 } });
    return { id: grouped.id, design: updateElement(grouped.design, screen, grouped.id, {
      props: { ...group.props, groupingSource: ids.map(id => {
        const original = findElement(design, screen, id);
        return { id, frame: original.frame, mobile: original.mobile ?? null, desktopBox: deviceBoxes.desktop.find(box => box.id === id), mobileBox: deviceBoxes.mobile.find(box => box.id === id) };
      }) },
      mobile: { ...group.mobile, ...(parent ? { groupFrame: frame } : { mode: "custom", frame }), contentWidth: width / scale, contentHeight: height / scale },
      children: group.children.map(child => {
        const box = deviceBoxes.mobile.find(row => row.id === child.id);
        if (!box) return child;
        return { ...child, mobile: { ...child.mobile, groupFrame: { anchor: "top-left", x: (box.left-left)/scale, y: (box.top-top)/scale, w: box.width/scale, h: box.height/scale } } };
      }),
    }) };
  }
  if (groupingReason(design, screen, ids)) return { design, id: null };
  const selected = new Set(ids);
  const entries = flattenElements(elementsOf(design, screen)).filter((el) => selected.has(el.id));
  const parentId = entries[0].parentId;
  const parent = parentId ? findElement(design, screen, parentId) : null;
  const parentBox = parentId ? boxes.find((b) => b.id === parentId) : null;
  const scale = parentBox ? parentBox.scale || parentBox.width / parent.frame.w : s;
  const origin = parentBox ? { left: parentBox.contentLeft ?? parentBox.left, top: parentBox.contentTop ?? parentBox.top } : { left: 0, top: 0 };
  const measured = entries.map((el) => ({ el, box: boxes.find((b) => b.id === el.id) })).filter((entry) => entry.box).sort((a, b) => (a.el.z ?? 0) - (b.el.z ?? 0));
  if (measured.length !== entries.length) return { design, id: null };
  const left = Math.min(...measured.map(({ box }) => box.left));
  const top = Math.min(...measured.map(({ box }) => box.top));
  const width = Math.max(...measured.map(({ box }) => box.left + box.width)) - left;
  const height = Math.max(...measured.map(({ box }) => box.top + box.height)) - top;
  const frame = frameFromRect({ left: left - origin.left, top: top - origin.top, width, height }, { anchor: "top-left", s: scale, container });
  const children = measured.map(({ el, box }, i) => ({
    ...findElement(design, screen, el.id),
    frame: { anchor: "top-left", x: (box.left - left) / scale, y: (box.top - top) / scale, w: box.width / scale, h: box.height / scale },
    z: i + 1,
  }));
  const id = newElementId();
  const group = { id, template: "group", name: "Grupo", props: { fill: "rgba(0,0,0,0)", glass: false, borderWidth: 0, shadow: false, padding: 0, contentWidth: width / scale, contentHeight: height / scale, autoFit: false }, children, frame, mobile: device === "mobile" && !parentId ? { mode: "custom", frame } : { mode: "auto" }, locked: false, hidden: false, z: Math.max(...entries.map((el) => el.z ?? 0)) };
  const siblings = editableElements(design, screen, parentId);
  return { design: withChildren(design, screen, parentId, [...siblings.filter((el) => !selected.has(el.id)), group]), id };
}

export function ungroupElements(design, screen, ids, boxes, { s = 1, container = { W: 1440, H: 900 }, device = "desktop", deviceBoxes } = {}) {
  if (deviceBoxes) {
    const result = ungroupElements(design, screen, ids, deviceBoxes.desktop, { s: 1 });
    let next = result.design;
    const sources = ids.flatMap(id => findElement(design, screen, id)?.props?.groupingSource || []);
    const sameBox = (a, b) => a && b && ["left", "top", "width", "height"].every(key => Math.abs(a[key] - b[key]) < .05);
    for (const id of result.ids) {
      const parent = parentOf(next, screen, id), host = parent ? deviceBoxes.mobile.find(box => box.id === parent.id) : null;
      const box = deviceBoxes.mobile.find(row => row.id === id);
      if (!box) {
        const child = findElement(next, screen, id);
        if (child?.mobile?.mode === "hidden") continue;
        return { design, ids: [] };
      }
      const frame = frameFromRect({ ...box, left: box.left - (host?.contentLeft ?? host?.left ?? 0), top: box.top - (host?.contentTop ?? host?.top ?? 0) }, { anchor: "top-left", s: host?.scale || 1, container: { W: 390, H: 844 } });
      const source = sources.find(row => row.id === id), child = findElement(next, screen, id), mobile = { ...child.mobile };
      if (parent) mobile.groupFrame = frame;
      else { delete mobile.groupFrame; Object.assign(mobile, { mode: "custom", frame }); }
      next = updateElement(next, screen, id, {
        ...(sameBox(deviceBoxes.desktop.find(box => box.id === id), source?.desktopBox) ? { frame: source.frame } : {}),
        mobile: sameBox(box, source?.mobileBox) ? source.mobile ?? { mode: "auto" } : mobile,
      });
    }
    return { design: next, ids: result.ids };
  }
  let next = design;
  const ungrouped = [];
  for (const id of ids) {
    const group = findElement(next, screen, id);
    if (group?.template !== "group" || group.locked) continue;
    const parent = parentOf(next, screen, id);
    const parentBox = parent ? boxes.find((b) => b.id === parent.id) : null;
    const origin = parentBox ? { left: parentBox.contentLeft ?? parentBox.left, top: parentBox.contentTop ?? parentBox.top } : { left: 0, top: 0 };
    const scale = parentBox ? parentBox.scale || parentBox.width / parent.frame.w : s;
    if ((group.children ?? []).some((child) => !boxes.some((b) => b.id === child.id))) continue;
    const children = (group.children ?? []).map((child) => {
      const box = boxes.find((b) => b.id === child.id);
      if (!box) return child;
      const frame = frameFromRect({ ...box, left: box.left - origin.left, top: box.top - origin.top }, { anchor: "top-left", s: scale, container });
      return { ...child, frame, ...(device === "mobile" && !parent ? { mobile: { mode: "custom", frame } } : {}) };
    });
    const siblings = editableElements(next, screen, parent?.id);
    const ordered = [...siblings].sort((a, b) => (a.z ?? 0) - (b.z ?? 0)).flatMap((el) => el.id === id ? children : [el]).map((el, i) => ({ ...el, z: i + 1 }));
    next = withChildren(next, screen, parent?.id, ordered);
    ungrouped.push(...children.map((child) => child.id));
  }
  return { design: next, ids: ungrouped };
}
