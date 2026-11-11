import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createTourRuntime } from "../../../runtime/tourRuntime.js";
import { useDesignEditor, useDesignState } from "../../hooks/useTourDesign.jsx";
import { useStudio } from "../StudioContext.jsx";
import { editableElements, findElement, flattenElements, updateProps } from "../elementOps.js";
import { DEVICES } from "../geometry.js";
import FloatingWindow from "../panels/FloatingWindow.jsx";
import { IconPicker } from "../panels/controls.jsx";
import BottomBar from "./BottomBar.jsx";
import { dropElement } from "./drop.js";
import InlineTextEditor from "./InlineTextEditor.jsx";
import SelectionOverlay from "./SelectionOverlay.jsx";
import { useCanvasPointer } from "./useCanvasPointer.js";
import { useCanvasView } from "./useCanvasView.js";
import { isTypingTarget, useShortcuts } from "./useShortcuts.js";
import { HANDLE_CURSORS } from "./gestures.js";
import { wheelFactor } from "./zoom.js";
import { measureDevice } from "./measureDevice.js";
import "./canvas.css";

export const DROP_TYPE = "application/x-tour-element";

const sameBoxes = (a, b) =>
  a.length === b.length && a.every((x, i) => x.id === b[i].id && ["left", "top", "width", "height", "scale", "contentLeft", "contentTop"].every(key => x[key] === b[i][key]));

// Lienzo del estudio de diseño (contrato Oleada 3 §3): la mesa de trabajo con el motor real en
// modo "design", la capa de selección encima, la barra inferior y los atajos.
//   · La mesa mide W×H px reales del dispositivo y se escala con CSS (zoom); el motor calcula el
//     layout del dispositivo, así la vista previa es idéntica al export.
//   · Nunca se pinta un elemento en React: solo se dibuja la interfaz de selección.
export default function DesignCanvas({ contentMode = false, contentSceneId = null, hideHotspots = false, hidePages = false, showGroupHandles = false }) {
  const store = useDesignEditor();
  const { baseDoc } = useStudio();
  const design = useDesignState((s) => s.design);
  const screen = useDesignState((s) => s.screen);
  const device = useDesignState((s) => s.device);
  const selection = useDesignState((s) => s.selection);
  const editing = useDesignState((s) => s.editing);
  const activeGroupId = useDesignState((s) => s.activeGroupId);
  const [iconId, setIconId] = useState(null);
  const dev = DEVICES[device] ?? DEVICES.desktop;

  const viewportRef = useRef(null);
  const boardRef = useRef(null);
  const runtimeRef = useRef(null);
  const boxesRef = useRef([]);
  const [boxes, setBoxes] = useState([]);
  const [spaceDown, setSpaceDown] = useState(false);
  const spaceRef = useRef(false);
  const [dropOver, setDropOver] = useState(false);

  const { view, size, api: viewApi } = useCanvasView(viewportRef, { W: dev.W, H: dev.H });
  const getBoxes = useCallback(() => boxesRef.current, []);
  const getBoard = useCallback(() => boardRef.current, []);
  const elements = useMemo(() => flattenElements(editableElements(design, screen)), [design, screen]);
  const getRuntime = useCallback(() => runtimeRef.current, []);
  const iconElement = iconId ? findElement(design, screen, iconId) : null;

  useEffect(() => { store.setInsertionScene(contentMode ? contentSceneId : null); return () => store.setInsertionScene(null); }, [store, contentMode, contentSceneId]);
  useEffect(() => { if (contentMode && contentSceneId) runtimeRef.current?.goToScene(contentSceneId); }, [contentMode, contentSceneId, baseDoc]);

  // ── Motor en modo diseño ────────────────────────────────────────────────
  useEffect(() => {
    if (!baseDoc || !boardRef.current) return undefined;
    const initial = store.getState();
    const rt = createTourRuntime(boardRef.current, { ...baseDoc, ...(hideHotspots ? { hotspots: [] } : {}), design: initial.design }, { mode: "design", designScreen: initial.screen, initialSceneId: contentMode ? contentSceneId : initial.previewSceneId ?? undefined });
    runtimeRef.current = rt;
    rt.setEditorState(initial);
    if (contentMode && contentSceneId) rt.goToScene(contentSceneId);
    if (import.meta.env.DEV) window.__designRuntime = rt; // solo para depurar en la consola

    // Cajas (px de diseño de la mesa) tras cada recolocación del motor.
    const readBoxes = () => {
      const { boxes: next } = rt.getElementBoxes();
      if (sameBoxes(boxesRef.current, next)) return;
      boxesRef.current = next;
      setBoxes(next);
    };
    rt.on("layout", readBoxes);
    rt.on("ready", readBoxes);

    // Cada cambio del almacén (también cada paso de un arrastre) llega al motor al instante, sin
    // esperar a React: así las cajas ya están al día cuando el gesto las lee.
    let last = initial;
    const unsubscribe = store.subscribe((state) => {
      if (state.selection !== last.selection || state.elementPreview !== last.elementPreview || state.editing !== last.editing) rt.setEditorState(state);
      if (state.design !== last.design) rt.setDesign(state.design);
      if (state.screen !== last.screen) rt.setDesignScreen(state.screen);
      if (state.previewSceneId !== last.previewSceneId && state.previewSceneId) rt.goToScene(state.previewSceneId);
      last = state;
    });
    readBoxes();
    return () => {
      unsubscribe();
      rt.off("layout", readBoxes);
      rt.destroy();
      runtimeRef.current = null;
      boxesRef.current = [];
    };
  }, [baseDoc, store, contentMode, hideHotspots]);

  // ── Puntero, atajos, rueda, espacio ─────────────────────────────────────
  const pointer = useCanvasPointer({ store, viewportRef, viewApi, getBoxes, getBoard, spaceRef, onIconPick: setIconId, getRuntime, contentMode });
  useShortcuts(store, { viewApi, viewportRef, getBoxes, getDeviceBoxes: target => {
    const st = store.getState();
    return target === st.device ? getBoxes() : measureDevice(st.design, st.screen, baseDoc, target, contentMode ? contentSceneId : st.previewSceneId || baseDoc?.scenes?.[0]?.id);
  } });

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return undefined;
    // Ctrl+rueda (o pellizco) hace zoom hacia el cursor; la rueda sola desplaza.
    const onWheel = (e) => {
      if (e.target.closest?.(".hs-co-card.hs-detail-expanded, .hs-screen-detail")) return;
      e.preventDefault();
      const unit = e.deltaMode === 1 ? 16 : 1;
      const r = el.getBoundingClientRect();
      if (e.ctrlKey || e.metaKey) viewApi.zoomBy(wheelFactor(e.deltaY * unit), e.clientX - r.left, e.clientY - r.top);
      else if (e.shiftKey) viewApi.panBy(-(e.deltaY || e.deltaX) * unit, 0);
      else viewApi.panBy(-e.deltaX * unit, -e.deltaY * unit);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [viewApi]);

  // Espacio + arrastrar desplaza (como en Canva); mantenerlo no activa botones.
  useEffect(() => {
    const set = (v) => {
      spaceRef.current = v;
      setSpaceDown(v);
    };
    const down = (e) => {
      if (e.code !== "Space" || e.repeat || isTypingTarget(e.target)) return;
      if (e.target?.closest?.("button, a, [role=menuitem]") && !viewportRef.current?.contains(e.target)) return;
      e.preventDefault();
      set(true);
    };
    const up = (e) => {
      if (e.code === "Space") set(false);
    };
    const blur = () => set(false);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, []);

  // ── Soltar desde la biblioteca de C2 ────────────────────────────────────
  const onDragOver = (e) => {
    if (!e.dataTransfer?.types?.includes(DROP_TYPE)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    if (!dropOver) setDropOver(true);
  };
  const onDrop = (e) => {
    setDropOver(false);
    const raw = e.dataTransfer?.getData(DROP_TYPE);
    if (!raw) return;
    e.preventDefault();
    let item;
    try {
      item = JSON.parse(raw);
    } catch {
      return;
    }
    if (!item || typeof item.template !== "string") return;
    const r = viewportRef.current.getBoundingClientRect();
    const v = viewApi.viewRef.current;
    // Punto del puntero en px de diseño, sin salirse de la mesa.
    const x = Math.min(dev.W, Math.max(0, (e.clientX - r.left - v.x) / v.zoom));
    const y = Math.min(dev.H, Math.max(0, (e.clientY - r.top - v.y) / v.zoom));
    dropElement(store, item, { x, y }, getBoxes);
  };

  const kind = pointer.gesture?.kind;
  const cursor =
    kind === "pan" ? "grabbing" : kind === "resize" ? HANDLE_CURSORS[pointer.gesture.handle] : kind === "move" ? "move" : spaceDown ? "grab" : pointer.hoverId ? "move" : "default";

  return (
    <div className="cv-root">
      <div
        ref={viewportRef}
        className={`cv-viewport${dropOver ? " is-drop" : ""}`}
        tabIndex={-1}
        onDragOver={onDragOver}
        onDragLeave={() => setDropOver(false)}
        onDrop={onDrop}
        {...pointer.handlers}
        onContextMenu={(e) => e.preventDefault()}
      >
        <div className="cv-stage" style={{ left: view.x, top: view.y, width: dev.W * view.zoom, height: dev.H * view.zoom }}>
          <div ref={boardRef} className="cv-board" data-design-board="" style={{ width: dev.W, height: dev.H, transform: `scale(${view.zoom})` }} />
        </div>
        {/* Capa de captura: ningún clic llega a los elementos del motor (sus botones no se activan). */}
        <div className="cv-hit" style={{ cursor }} />
        <SelectionOverlay
          view={view}
          size={size}
          boxes={boxes}
          elements={elements}
          selection={selection}
          activeGroupId={activeGroupId}
          editing={editing}
          hoverId={pointer.hoverId}
          device={device}
          gesture={pointer.gesture}
          guides={pointer.guides}
          marquee={pointer.marquee}
          onHandleDown={pointer.startResize}
          showGroupHandles={showGroupHandles}
        />
        <InlineTextEditor getBoard={getBoard} viewportRef={viewportRef} boxes={boxes} view={view} />
      </div>
      <BottomBar hidePages={contentMode || hidePages} zoom={view.zoom} fitted={view.fitted} onZoom={(z) => viewApi.zoomTo(z)} onFit={viewApi.fit} />
      {iconElement && <FloatingWindow title="Elegir icono" onClose={() => setIconId(null)}><IconPicker allowNone={false} value={iconElement.props?.icon} onChange={(icon) => store.apply((d) => updateProps(d, screen, iconId, { icon }), { label: "Cambiar icono" })} close={() => setIconId(null)} /></FloatingWindow>}
    </div>
  );
}
