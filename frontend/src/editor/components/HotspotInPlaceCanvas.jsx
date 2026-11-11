import { useCallback, useEffect, useRef, useState } from "react";
import { useDesignEditor, useDesignState } from "../hooks/useTourDesign.jsx";
import { flattenElements } from "../design/elementOps.js";
import { useCanvasPointer } from "../design/canvas/useCanvasPointer.js";
import { useShortcuts } from "../design/canvas/useShortcuts.js";
import { DRAG_TYPE } from "../design/library.js";
import { dropElement } from "../design/canvas/drop.js";
import { rebaseHotspotPlacement } from "../hotspotSession.js";
import SelectionOverlay from "../design/canvas/SelectionOverlay.jsx";
import InlineTextEditor from "../design/canvas/InlineTextEditor.jsx";
import "../design/canvas/canvas.css";

export default function HotspotInPlaceCanvas({ host, hotspotId, surface }) {
  const store = useDesignEditor(), state = useDesignState();
  const viewportRef = useRef(null), board = useRef(null), boxesRef = useRef([]), spaceRef = useRef(false);
  const viewRef = useRef({ x: 0, y: 0, zoom: 1 }), [geometry, setGeometry] = useState({ boxes: [], size: { w: 1, h: 1 }, view: viewRef.current });
  const getBoxes = useCallback(() => boxesRef.current, []), getBoard = useCallback(() => board.current, []);
  const viewApi = useRef({ viewRef, panTo() {}, fit() {}, zoomTo() {} }).current;
  const measureRef = useRef(null);
  const prepareGesture = useCallback(ids => {
    const st = store.getState(), root = st.design.panels.find(p => `panel:${p.id}` === st.screen)?.elements[0];
    if (!root || root.locked || !ids.includes(root.id) || !board.current) return;
    const card = board.current;
    const x = parseFloat(card.style.left), y = parseFloat(card.style.top);
    const screen = surface === "detail" && st.design.hotspotLayouts.detail.placement === "screen";
    if (!screen && (!Number.isFinite(x) || !Number.isFinite(y))) return;
    store.preview(doc => rebaseHotspotPlacement(doc, surface, { x, y }));
    measureRef.current?.();
  }, [store, surface]);
  const pointer = useCanvasPointer({ store, viewportRef, viewApi, getBoxes, getBoard, spaceRef, manualGroupBounds: true, prepareGesture });
  useShortcuts(store, { viewApi, viewportRef, getBoxes, prepareGrouping: () => {
    store.materializeSurface(surface, boxesRef.current);
    measureRef.current?.();
  } });
  useEffect(() => {
    let raf, signature = "", wrapper;
    const marker = host.querySelector(`.hs-marker[data-hotspot-id="${CSS.escape(hotspotId)}"]`); marker?.setAttribute("data-piece-editing", "");
    const measure = () => {
      const st = store.getState(), root = st.design.panels.find(p => `panel:${p.id}` === st.screen)?.elements[0];
      const candidates = [...host.querySelectorAll(`[data-hotspot-id="${CSS.escape(hotspotId)}"][data-hotspot-surface="${surface}"]`)];
      const parent = candidates.find(n => n.getBoundingClientRect().width > 0 && n.querySelector('.hs-detail-stage'));
      const node = parent?.querySelector(`.hs-detail-stage > [data-el-id="${CSS.escape(root?.id || "")}"]`);
      if (node && viewportRef.current) {
        board.current = parent;
        const nextWrapper = node.closest('.hs-marker,.hs-screen-detail');
        if (wrapper !== nextWrapper) { wrapper?.removeAttribute('data-piece-editing'); wrapper = nextWrapper; }
        wrapper?.setAttribute('data-piece-editing', '');
        const vr = viewportRef.current.getBoundingClientRect(), r = node.getBoundingClientRect();
        const zoom = r.width / root.frame.w || 1;
        const view = { zoom, x: r.left - vr.left - (root.frame.x || 0) * zoom, y: r.top - vr.top - (root.frame.y || 0) * zoom };
        viewRef.current = view;
        const rows = [], append = (el, parentId = null, path = el.id) => {
          const n = el === root ? node : node.querySelector(`[data-el-id="${CSS.escape(el.id)}"]`);
          if (!n || !n.getBoundingClientRect().width || getComputedStyle(n).display === 'none') return;
          const b = n.getBoundingClientRect(), inner = el.template === "group" ? n.querySelector(":scope > .tour-rt-group-inner")?.getBoundingClientRect() : null, t = n.querySelector('.tour-rt-text');
          rows.push({ id: el.id, parentId, path, template: el.template,
            left: (b.left-vr.left-view.x)/zoom, top: (b.top-vr.top-view.y)/zoom,
            width: b.width/zoom, height: b.height/zoom,
            ...(inner ? { contentLeft:(inner.left-vr.left-view.x)/zoom, contentTop:(inner.top-vr.top-view.y)/zoom } : {}),
            scale: b.width/zoom/(el.template === 'group' ? el.props?.contentWidth || el.frame.w : el.frame?.w || b.width/zoom),
            fontSize: t ? parseFloat(getComputedStyle(t).fontSize) : undefined });
          el.children?.forEach(child => append(child, el.id, `${path}/${child.id}`));
        };
        append(root); boxesRef.current = rows;
        const value = { boxes: rows, size: { w: vr.width, h: vr.height }, view };
        const key = JSON.stringify(value);
        if (key !== signature) { signature = key; setGeometry(value); }
      }
    };
    measureRef.current = measure;
    const tick = () => { measure(); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => { measureRef.current = null; cancelAnimationFrame(raf); wrapper?.removeAttribute('data-piece-editing'); marker?.removeAttribute("data-piece-editing"); };
  }, [host, hotspotId, surface, store]);
  useEffect(() => {
    const belongs = e => !e.target.closest?.('[data-piece-ui]') && board.current?.contains(e.target);
    const down = e => { if (!belongs(e)) return; e.stopPropagation(); pointer.handlers.onPointerDown(e); };
    const move = e => { if (belongs(e)) pointer.handlers.onPointerMove(e); };
    const click = e => { if (belongs(e)) { e.stopPropagation(); e.preventDefault(); } };
    const double = e => { if (!belongs(e)) return; e.stopPropagation(); e.preventDefault(); pointer.handlers.onDoubleClick(e); };
    const dragover = e => { if (e.dataTransfer.types.includes(DRAG_TYPE)) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; } };
    const drop = e => {
      const raw = e.dataTransfer.getData(DRAG_TYPE); if (!raw) return;
      e.preventDefault(); e.stopPropagation();
      try { const item = JSON.parse(raw), r = viewportRef.current.getBoundingClientRect(), v = viewRef.current;
        dropElement(store, item, { x:(e.clientX-r.left-v.x)/v.zoom, y:(e.clientY-r.top-v.y)/v.zoom }, getBoxes);
      } catch { /* Unsupported drag data leaves the document untouched. */ }
    };
    host.addEventListener('dragover', dragover); host.addEventListener('drop', drop);
    host.addEventListener('click', click, true); host.addEventListener('pointerdown', down, true); host.addEventListener('pointermove', move, true); host.addEventListener('dblclick', double, true);
    return () => { host.removeEventListener('dragover', dragover); host.removeEventListener('drop', drop); host.removeEventListener('click', click, true); host.removeEventListener('pointerdown', down, true); host.removeEventListener('pointermove', move, true); host.removeEventListener('dblclick', double, true); };
  }, [host, pointer.handlers]);
  const elements = flattenElements(state.design.panels.find(p => `panel:${p.id}` === state.screen)?.elements || []);
  return <div ref={viewportRef} className="hs-inplace-canvas" data-piece-ui data-ui tabIndex={-1}>
    <SelectionOverlay {...geometry} elements={elements} selection={state.selection} activeGroupId={state.activeGroupId} editing={state.editing} hoverId={pointer.hoverId} device="desktop" gesture={pointer.gesture} guides={pointer.guides} marquee={pointer.marquee} onHandleDown={pointer.startResize} showGroupHandles />
    <InlineTextEditor getBoard={getBoard} viewportRef={viewportRef} boxes={geometry.boxes} view={geometry.view} />
  </div>;
}
