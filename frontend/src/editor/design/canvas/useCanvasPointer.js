import { useCallback, useEffect, useRef, useState } from "react";
import { numberConfiguration } from "../numberSections.js";
import { getTemplate } from "../../../runtime/templates/index.js";
import { editableElements, findElement, parentOf, setFrame, updateElement } from "../elementOps.js";
import { scaleElement, reflowElement, resizeGroupHeight } from "../../../runtime/model/elementResize.js";
import { SNAP_PX, buildTargets, snapMove, snapResize } from "./snapping.js";
import { axesForAnchor, pointInRect, rectsIntersect, resizeRect, unionRect } from "./gestures.js";
import { containerOf, dragItem, finalAnchor, layoutScaleOf, moveFrame, resizeFrame } from "./frames.js";

const DRAG_THRESHOLD = 3; // px de pantalla antes de que un clic se vuelva arrastre

// Todo lo que hace el puntero sobre el lienzo (INVESTIGACION_CANVA §3 y contrato §3):
//   clic · Shift+clic · rectángulo de selección · mover · redimensionar · desplazar (espacio o
//   botón central) · contorno al pasar · doble clic para editar texto.
//
// Los gestos usan el almacén: beginGesture al empezar, preview en cada movimiento y endGesture al
// soltar (un solo paso de deshacer). Escape a medio gesto = cancelGesture.
//
//   const pointer = useCanvasPointer({ store, viewportRef, viewApi, getBoxes, getBoard, spaceRef })
//   pointer.handlers  → para el área (onPointerDown, onPointerMove, onPointerLeave, onDoubleClick)
//   pointer.startResize(handle, event)  → para las manijas de la selección
//   pointer.hoverId · pointer.marquee · pointer.guides · pointer.gesture → lo que dibuja el overlay
export function useCanvasPointer({ store, viewportRef, viewApi, getBoxes, getBoard, spaceRef, onIconPick, getRuntime, contentMode = false, manualGroupBounds = false, prepareGesture }) {
  const [hoverId, setHoverId] = useState(null);
  const [marquee, setMarquee] = useState(null); // { x0, y0, x1, y1 } en px del área
  const [guides, setGuides] = useState([]);
  const [gesture, setGesture] = useState(null); // { kind: "move"|"resize"|"pan", handle?, label? }
  const session = useRef(null);
  const hoverRef = useRef(null);

  // Coordenadas del puntero: px del área (vx, vy) y px de diseño de la mesa (x, y).
  const locate = useCallback(
    (e) => {
      const vr = viewportRef.current.getBoundingClientRect();
      const v = viewApi.viewRef.current;
      const vx = e.clientX - vr.left;
      const vy = e.clientY - vr.top;
      return { vx, vy, x: (vx - v.x) / v.zoom, y: (vy - v.y) / v.zoom };
    },
    [viewportRef, viewApi]
  );

  // Elemento más arriba (mayor z) cuya caja contiene el punto de diseño.
  const hitTest = useCallback(
    (x, y) => {
      const { design, screen, activeGroupId } = store.getState();
      const zOf = new Map(editableElements(design, screen, activeGroupId).map((el) => [el.id, el.z ?? 0]));
      let best = null;
      getBoxes().forEach((b) => {
        if (!zOf.has(b.id) || !pointInRect(x, y, b)) return;
        if (!best || zOf.get(b.id) >= zOf.get(best.id)) best = b;
      });
      return best?.id ?? null;
    },
    [store, getBoxes]
  );

  const clearSession = useCallback(() => {
    const s = session.current;
    if (!s) return;
    s.cleanup?.();
    session.current = null;
    setMarquee(null);
    setGuides([]);
    setGesture(null);
  }, []);

  // ── Pasos de cada gesto ────────────────────────────────────────────────
  const gestureContext = useCallback((activeGroupId = store.getState().activeGroupId) => {
    const { device, screen } = store.getState();
    const parent = activeGroupId ? getBoxes().find((box) => box.id === activeGroupId) : null;
    const group = activeGroupId ? findElement(store.getState().design, screen, activeGroupId) : null;
    return parent ? {
      device: device === "mobile" ? "mobile-group" : "desktop", screen, groupId: activeGroupId, origin: { ...parent, left: parent.contentLeft ?? parent.left, top: parent.contentTop ?? parent.top },
      container: { W: parent.width, H: parent.height }, s: parent.scale || parent.width / group.frame.w || 1, key: device === "mobile" ? "mobile-group" : "desktop",
    } : { device, screen, container: containerOf(device), s: layoutScaleOf(device), key: device === "mobile" ? "mobile" : "desktop" };

  }, [store, getBoxes]);

  const localBox = (box, ctx) => box && ctx.origin ? { ...box, left: box.left - ctx.origin.left, top: box.top - ctx.origin.top } : box;
  const scopeBoxes = (ctx) => {
    const st = store.getState();
    const ids = new Set(editableElements(st.design, st.screen, ctx.groupId ?? null).map((el) => el.id));
    return getBoxes().filter((box) => ids.has(box.id)).map((box) => localBox(box, ctx));
  };
  const boardGuides = (guides, ctx) => ctx.origin ? guides.map((guide) => ({
    ...guide, pos: guide.pos + (guide.axis === "x" ? ctx.origin.left : ctx.origin.top),
    from: guide.from + (guide.axis === "x" ? ctx.origin.top : ctx.origin.left),
    to: guide.to + (guide.axis === "x" ? ctx.origin.top : ctx.origin.left),
  })) : guides;

  // Prepara los elementos que se van a mover (los bloqueados se quedan quietos).
  function beginMove(s) {
    if (prepareGesture) { store.beginGesture(); prepareGesture(store.getState().selection); }
    const st = store.getState();
    const ctx = gestureContext();
    const boxes = scopeBoxes(ctx);
    const items = st.selection
      .map((id) => {
        const el = findElement(st.design, st.screen, id);
        const box = boxes.find((b) => b.id === id);
        return el && box && !el.locked ? dragItem(el, box, ctx.device, ctx.container) : null;
      })
      .filter(Boolean);
    if (!items.length) { if (prepareGesture) store.cancelGesture(); return false; }
    s.ctx = ctx;
    s.items = items;
    s.axes = items.map((it) => axesForAnchor(it.anchor));
    s.ids = new Set(items.map((it) => it.id));
    s.union = unionRect(items.map((it) => it.rect));
    store.beginGesture();
    setGesture({ kind: "move" });
    return true;
  }

  function stepMove(s, ev) {
    const { zoom } = viewApi.viewRef.current;
    const { container, screen, key } = s.ctx;
    let dx = (ev.clientX - s.startX) / zoom;
    let dy = (ev.clientY - s.startY) / zoom;
    // Shift = solo en el eje dominante; los ejes que ningún elemento puede mover tampoco corrigen.
    const dominantX = Math.abs(dx) >= Math.abs(dy);
    let lockX = (ev.shiftKey && !dominantX) || !s.axes.some((a) => a.moveX);
    let lockY = (ev.shiftKey && dominantX) || !s.axes.some((a) => a.moveY);
    if (lockX) dx = 0;
    if (lockY) dy = 0;
    let nextGuides = [];
    if (!ev.ctrlKey && !ev.metaKey) {
      const others = scopeBoxes(s.ctx).filter((b) => !s.ids.has(b.id));
      const targets = buildTargets(container, others);
      const probe = { left: s.union.left + dx, top: s.union.top + dy, width: s.union.width, height: s.union.height };
      const snap = snapMove(probe, targets, SNAP_PX / zoom);
      if (!lockX) dx += snap.dx;
      if (!lockY) dy += snap.dy;
      nextGuides = snap.guides.filter((g) => !(g.axis === "x" && lockX) && !(g.axis === "y" && lockY));
    }
    const apply = (d) =>
      s.items.reduce((acc, it, i) => {
        const ax = s.axes[i];
        const rect = { ...it.rect, left: it.rect.left + (ax.moveX ? dx : 0), top: it.rect.top + (ax.moveY ? dy : 0) };
        return setFrame(acc, screen, it.id, moveFrame(it, rect, s.ctx), key);
      }, d);
    store.preview(apply);
    setGuides(boardGuides(nextGuides, s.ctx));
  }

  function finishMove(s) {
    const { container, screen, key } = s.ctx;
    // Re-anclaje automático con la caja que el motor dejó de verdad.
    const fresh = scopeBoxes(s.ctx);
    store.preview((d) =>
      s.items.reduce((acc, it) => {
        const el = findElement(acc, screen, it.id);
        const frame = key === "mobile-group" ? el?.mobile?.groupFrame : key === "mobile" ? el?.mobile?.frame : el?.frame;
        const rect = fresh.find((b) => b.id === it.id) ?? it.rect;
        if (!frame) return acc;
        const anchor = s.ctx.groupId || manualGroupBounds ? it.anchor : finalAnchor(it, frame, rect, container);
        return setFrame(acc, screen, it.id, moveFrame({ ...it, anchor }, rect, s.ctx), key);
      }, d)
    );
    store.endGesture("Mover");
  }

  function beginResize(s) {
    if (prepareGesture) { store.beginGesture(); prepareGesture([s.targetId ?? store.getState().selection[0]]); }
    const st = store.getState();
    const id = s.targetId ?? st.selection[0];
    // Parent handles resize in the parent's own coordinate system. Keep the
    // selected child and editing scope intact throughout the container gesture.
    const ctx = s.targetId ? gestureContext(parentOf(st.design, st.screen, id)?.id ?? null) : gestureContext();
    const el = findElement(st.design, st.screen, id);
    const box = scopeBoxes(ctx).find((b) => b.id === id);
    if ((!s.targetId && st.selection.length !== 1) || !el || !box || el.locked) { if (prepareGesture) store.cancelGesture(); return false; }
    s.ctx = ctx;
    s.item = dragItem(el, box, ctx.device, ctx.container);
    s.source = structuredClone(el);
    s.fontSize = box.fontSize;
    s.groupScale = box.scale || ctx.s;
    s.axes = axesForAnchor(s.item.anchor);
    s.last = box;
    store.beginGesture();
    setGesture({ kind: "resize", handle: s.handle, targetId: s.targetId });
    return true;
  }

  function stepResize(s, ev) {
    const { zoom } = viewApi.viewRef.current;
    const { container, screen, key } = s.ctx;
    const dx = s.axes.resizeX ? (ev.clientX - s.startX) / zoom : 0;
    const dy = s.axes.resizeY ? (ev.clientY - s.startY) / zoom : 0;
    const corner = s.handle.length === 2;
    let rect = resizeRect(s.item.rect, s.handle, dx, dy, { shift: corner, alt: ev.altKey });
    let nextGuides = [];
    // Con proporción (Shift en esquina) o desde el centro (Alt) el imán rompería la forma.
    if (!ev.ctrlKey && !ev.metaKey && !ev.altKey && !corner) {
      const others = scopeBoxes(s.ctx).filter((b) => b.id !== s.item.id);
      const snap = snapResize(rect, s.handle, buildTargets(container, others), SNAP_PX / zoom);
      rect = snap.rect;
      nextGuides = snap.guides;
    }
    s.last = rect;
    store.preview((d) => {
      const frame = resizeFrame(s.item, rect, s.handle, s.ctx);
      let resized = s.source;
      if (!key.startsWith("mobile")) {
        if (corner) resized = scaleElement(s.source, rect.width / s.item.rect.width, s.fontSize);
        else if (s.source.template === "group" && ["e", "w"].includes(s.handle)) resized = manualGroupBounds
          ? { ...s.source, props: { ...s.source.props, contentWidth: rect.width / s.groupScale } }
          : reflowElement(s.source, rect.width / s.groupScale);
        if (s.targetId && s.source.template === "group" && ["n", "s"].includes(s.handle)) {
          resized = resizeGroupHeight(s.source, frame.h);
        } else if (s.source.template === "group" && s.source.props?.autoFit !== false) {
          frame.h = 0;
          if (corner) resized.props = { ...resized.props, contentWidth: (s.source.props?.contentWidth || s.item.rect.width / s.groupScale) * rect.width / s.item.rect.width,
            contentHeight: s.item.rect.height / s.groupScale * rect.width / s.item.rect.width };
        }
      } else if (s.source.template === "group" && s.source.props?.autoFit !== false) frame.h = 0;
      return setFrame(updateElement(d, screen, s.item.id, { props: resized.props, ...(resized.children ? { children: resized.children } : {}) }), screen, s.item.id, frame, key);
    });
    setGuides(boardGuides(nextGuides, s.ctx));
    setGesture({ kind: "resize", handle: s.handle, targetId: s.targetId, label: `${Math.round(rect.width / s.ctx.s)} × ${Math.round(rect.height / s.ctx.s)}` });
  }

  function finishResize(s) {
    const { container, screen, key } = s.ctx;
    const rect = scopeBoxes(s.ctx).find((b) => b.id === s.item.id) ?? s.last;
    store.preview((d) => {
      const el = findElement(d, screen, s.item.id);
      const frame = key === "mobile-group" ? el?.mobile?.groupFrame : key === "mobile" ? el?.mobile?.frame : el?.frame;
      if (!frame) return d;
      const anchor = s.ctx.groupId || manualGroupBounds ? s.item.anchor : finalAnchor(s.item, frame, rect, container);
      return setFrame(d, screen, s.item.id, { ...frame, anchor }, key);
    });
    store.endGesture("Cambiar tamaño");
  }

  function stepMarquee(s, ev) {
    const p = locate(ev);
    setMarquee({ x0: s.p0.vx, y0: s.p0.vy, x1: p.vx, y1: p.vy });
    const left = Math.min(s.p0.x, p.x);
    const top = Math.min(s.p0.y, p.y);
    const rect = { left, top, width: Math.abs(p.x - s.p0.x), height: Math.abs(p.y - s.p0.y) };
    const st = store.getState();
    const ids = new Set(editableElements(st.design, st.screen, st.activeGroupId).map((el) => el.id));
    const inside = getBoxes()
      .filter((b) => ids.has(b.id) && rectsIntersect(rect, b))
      .map((b) => b.id);
    const next = [...new Set([...s.base, ...inside])];
    const cur = store.getState().selection;
    if (next.length !== cur.length || next.some((id, i) => id !== cur[i])) store.select(next);
  }

  function stepPan(s, ev) {
    viewApi.panTo(s.view0.x + (ev.clientX - s.startX), s.view0.y + (ev.clientY - s.startY));
  }

  // ── Sesión de puntero (ventana: sigue al puntero aunque salga del área) ──
  function startSession(s, ev) {
    s.startX = ev.clientX;
    s.startY = ev.clientY;
    s.started = false;
    const onMove = (e) => {
      const cur = session.current;
      if (!cur) return;
      if (!cur.started) {
        if (Math.hypot(e.clientX - cur.startX, e.clientY - cur.startY) < (cur.threshold ?? DRAG_THRESHOLD)) return;
        cur.started = true;
        if (cur.type === "move" && !beginMove(cur)) cur.dead = true;
        if (cur.type === "resize" && !beginResize(cur)) cur.dead = true;
        if (cur.type === "pan") setGesture({ kind: "pan" });
      }
      if (cur.dead) return;
      if (cur.type === "move") stepMove(cur, e);
      else if (cur.type === "resize") stepResize(cur, e);
      else if (cur.type === "marquee") stepMarquee(cur, e);
      else if (cur.type === "pan") stepPan(cur, e);
      else if (cur.type === "camera") getRuntime?.()?.focus(cur.camera.lon - (e.clientX - cur.startX) * 0.12, cur.camera.lat + (e.clientY - cur.startY) * 0.12, 0);
    };
    const onUp = () => {
      const cur = session.current;
      if (!cur) return;
      if (cur.started && !cur.dead) {
        if (cur.type === "move") finishMove(cur);
        else if (cur.type === "resize") finishResize(cur);
      } else if (!cur.started) {
        // Un clic sin arrastre.
        if (cur.type === "move" && cur.reduceTo) store.select([cur.reduceTo]);
        if (cur.type === "move" && cur.iconId) onIconPick?.(cur.iconId);
        if (cur.type === "marquee" && !cur.base.length) store.select([]);
      }
      clearSession();
    };
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      const cur = session.current;
      if (cur?.started && (cur.type === "move" || cur.type === "resize")) store.cancelGesture();
      if (cur?.type === "marquee") store.select(cur.base);
      clearSession();
    };
    const cancelActive = (e) => {
      const cur = session.current;
      if (!cur?.started) return;
      if (cur.type === "move" || cur.type === "resize") store.cancelGesture();
      if (cur.type === "marquee") store.select(cur.base);
      clearSession(); e.preventDefault();
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("tour-studio:cancel-active-gesture", cancelActive);
    s.cleanup = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("tour-studio:cancel-active-gesture", cancelActive);
    };
    session.current = s;
  }

  // Si el lienzo se desmonta a medio gesto, no queda nada colgado.
  useEffect(
    () => () => {
      if (session.current?.started) store.cancelGesture();
      session.current?.cleanup?.();
      session.current = null;
    },
    [store]
  );

  // ── Manejadores del área ───────────────────────────────────────────────
  const onPointerDown = useCallback(
    (e) => {
      if (session.current) return;
      if (e.button === 1 || (e.button === 0 && spaceRef.current)) {
        e.preventDefault();
        startSession({ type: "pan", view0: { ...viewApi.viewRef.current }, threshold: 0 }, e);
        return;
      }
      if (e.button !== 0) return;
      viewportRef.current?.focus({ preventScroll: true });
      const st = store.getState();
      if (st.editing) store.setEditing(null);
      const p = locate(e);
      let id = hitTest(p.x, p.y);
      // Un icono sigue siendo accesible con un clic aunque la receta incluya
      // un subgrupo (p. ej. la lista dentro de una tarjeta).
      if (st.activeGroupId) {
        const iconBox = getBoxes().filter((box) => box.template === "icon" &&
          String(box.path).split("/").includes(st.activeGroupId) && pointInRect(p.x, p.y, box)).at(-1);
        if (iconBox) {
          const parent = parentOf(st.design, st.screen, iconBox.id);
          if (parent && parent.id !== st.activeGroupId) store.enterGroup(parent.id);
          id = iconBox.id;
        }
      }
      if (id) {
        const sel = st.selection;
        if (e.shiftKey) {
          if (sel.includes(id)) {
            store.select(sel.filter((i) => i !== id)); // Shift+clic en uno ya elegido lo quita
            return;
          }
          store.select([...sel, id]);
        } else if (!sel.includes(id)) {
          store.select([id]);
        }
        // Clic sin arrastre sobre uno de varios elegidos: se queda solo ese (al soltar).
        startSession({ type: "move", reduceTo: !e.shiftKey && sel.includes(id) && sel.length > 1 ? id : null, iconId: store.getState().activeGroupId && findElement(st.design, st.screen, id)?.template === "icon" ? id : null }, e);
      } else if (contentMode && !e.shiftKey) {
        store.select([]);
        startSession({ type: "camera", camera: getRuntime?.()?.getState() ?? { lon: 0, lat: 0 } }, e);
      } else {
        startSession({ type: "marquee", p0: p, base: e.shiftKey ? st.selection : [] }, e);
      }
    },
    // startSession usa solo refs y funciones estables del almacén.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [store, locate, hitTest, viewportRef, viewApi, spaceRef, getBoxes, contentMode, getRuntime, onIconPick, prepareGesture]
  );

  const onPointerMove = useCallback(
    (e) => {
      if (session.current || e.buttons) return;
      const p = locate(e);
      const id = hitTest(p.x, p.y);
      if (id !== hoverRef.current) {
        hoverRef.current = id;
        setHoverId(id);
      }
    },
    [locate, hitTest]
  );

  const onPointerLeave = useCallback(() => {
    hoverRef.current = null;
    setHoverId(null);
  }, []);

  // Doble clic en un elemento con texto editable → edición en el lugar.
  const onDoubleClick = useCallback(
    (e) => {
      const st = store.getState();
      const p = locate(e);
      let id = hitTest(p.x, p.y);
      let el = id ? findElement(st.design, st.screen, id) : null;
      if (!el || el.locked) return;
      const config = numberConfiguration(st.design, st.screen, id);
      if (config?.kind === "stats-counter" && el.template !== "text") {
        const node = getBoard()?.querySelector(`[data-el-id="${CSS.escape(config.leaf.id)}"] .tour-rt-counter`);
        const body = node?.querySelector(".tour-rt-counter-body")?.getBoundingClientRect();
        if (body && e.clientX >= body.left && e.clientX <= body.right && e.clientY >= body.top && e.clientY <= body.bottom) {
          store.select([id]); store.setEditing(null);
          store.openPanel("element-config", { id: config.id, section: Number(node.dataset.counterIndex) || 0 });
          return;
        }
      }
      if (el.template === "group") {
        store.enterGroup(id);
        id = hitTest(p.x, p.y);
        el = id ? findElement(st.design, st.screen, id) : null;
        if (id) store.select([id]);
        if (el?.template === "icon") onIconPick?.(id);
        if (el?.template === "text") {
          const key = pickInlineSlot(el, getBoard(), e);
          if (key) store.setEditing({ id, key });
        }
        return;
      }
      if (el.template === "icon") { onIconPick?.(id); return; }
      const key = pickInlineSlot(el, getBoard(), e);
      if (!key) return;
      store.select([id]);
      store.setEditing({ id, key });
    },
    [store, locate, hitTest, getBoard, onIconPick]
  );

  const startResize = useCallback(
    (handle, e, targetId) => {
      if (e.button !== 0 || session.current) return;
      e.stopPropagation();
      e.preventDefault();
      startSession({ type: "resize", handle, targetId, threshold: 2 }, e);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [store, viewApi, getBoxes, prepareGesture]
  );

  return {
    handlers: { onPointerDown, onPointerMove, onPointerLeave, onDoubleClick },
    startResize,
    hoverId,
    marquee,
    guides,
    gesture,
    busy: !!gesture,
  };
}

// Qué texto se edita con doble clic: el nodo [data-slot] bajo el puntero; si no hay, el primero
// visible; si el elemento no tiene ninguno visible, el slot "toolbar" de la plantilla.
export function pickInlineSlot(el, board, e) {
  const template = getTemplate(el.template);
  const inline = (template?.slots ?? []).filter((s) => s.inline);
  if (!inline.length) return null;
  const keys = new Set(inline.map((s) => s.key));
  const nodes = [...(board?.querySelectorAll(`[data-el-id="${CSS.escape(el.id)}"] [data-slot]`) ?? [])].filter((n) => keys.has(n.getAttribute("data-slot")));
  const visible = nodes.filter((n) => {
    const r = n.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  });
  const under = visible.find((n) => {
    const r = n.getBoundingClientRect();
    return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
  });
  if (under) return under.getAttribute("data-slot");
  // Background or dynamic content must not edit an unrelated/hidden text slot.
  return el.template === "text" && visible[0] ? visible[0].getAttribute("data-slot") : null;
}
