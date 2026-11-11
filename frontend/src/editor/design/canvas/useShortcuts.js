import { useEffect, useRef } from "react";
import { deleteSelection, duplicateSelection, nudgeSelection, setSelectionLocked, groupSelection, ungroupSelection } from "../actions.js";
import { elementsOf, editableElements, flattenElements, reorder } from "../elementOps.js";
import { copyElements, pasteClipboard } from "./clipboard.js";
import { convertToMobileCustom } from "./frames.js";
import { registerCanvas } from "./canvasRegistry.js";

// Atajos de teclado del lienzo (contrato §3), en `window`. Se ignoran cuando el foco está en un
// campo de texto (input, textarea, select o [contenteditable]) para no pelear con la escritura.
// Los paneles de C2 no registran atajos globales; su Escape se queda dentro (stopPropagation).

export function isTypingTarget(target) {
  if (!target || target.nodeType !== 1) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return !!target.closest?.('[contenteditable=""], [contenteditable="true"]');
}

// Orden de capas para varios elementos a la vez, conservando su orden relativo.
export function arrange(store, where) {
  const { screen, selection, design } = store.getState();
  if (!selection.length) return;
  const zOf = new Map(flattenElements(elementsOf(design, screen)).map((el) => [el.id, el.z ?? 0]));
  const asc = [...selection].sort((a, b) => zOf.get(a) - zOf.get(b));
  // Para conservar el orden relativo: al frente y atrás un paso se recorren de abajo hacia arriba;
  // al fondo y adelante un paso, de arriba hacia abajo.
  const order = where === "front" || where === "backward" ? asc : [...asc].reverse();
  store.apply((d) => order.reduce((acc, id) => reorder(acc, screen, id, where), d), { label: "Ordenar" });
}

// Ids de los elementos visibles de la pantalla, por capa (para Tab).
function tabOrder(store) {
  const { design, screen, activeGroupId } = store.getState();
  return editableElements(design, screen, activeGroupId)
    .filter((el) => !el.hidden)
    .sort((a, b) => (a.z ?? 0) - (b.z ?? 0))
    .map((el) => el.id);
}

// `canvas` = { viewApi, viewportRef, getBoxes }.
export function useShortcuts(store, canvas) {
  const ref = useRef(canvas);
  ref.current = canvas;

  useEffect(() => registerCanvas(store, {
    getBoxes: () => ref.current.getBoxes(),
    getDeviceBoxes: device => ref.current.getDeviceBoxes?.(device),
    prepareGrouping: () => ref.current.prepareGrouping?.(),
  }), [store]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.defaultPrevented || e.isComposing || isTypingTarget(e.target)) return;
      const { viewApi, viewportRef, getBoxes } = ref.current;
      const st = store.getState();
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      const done = () => e.preventDefault();

      if (mod) {
        switch (key) {
          case "z":
            done();
            if (e.shiftKey) store.redo();
            else store.undo();
            return;
          case "y":
            done();
            store.redo();
            return;
          case "s":
            done();
            store.flush().catch(() => {});
            return;
          case "a":
            done();
            store.select(editableElements(st.design, st.screen, st.activeGroupId).map((el) => el.id));
            return;
          case "g":
            done();
            if (e.shiftKey) ungroupSelection(store);
            else groupSelection(store);
            return;
          case "d":
            done();
            duplicateSelection(store);
            return;
          case "c":
            if (st.selection.length) {
              done();
              copyElements(st.design, st.screen, st.selection);
            }
            return;
          case "x":
            if (st.selection.length) {
              done();
              copyElements(st.design, st.screen, st.selection);
              deleteSelection(store);
            }
            return;
          case "v":
            done();
            pasteClipboard(store);
            return;
          case "+":
          case "=":
            done();
            viewApi.step(1);
            return;
          case "-":
          case "_":
            done();
            viewApi.step(-1);
            return;
          case "0":
            done();
            if (e.altKey) viewApi.fit();
            else viewApi.zoomTo(1);
            return;
          default:
        }
        if (key === "]" || e.code === "BracketRight") {
          done();
          arrange(store, e.altKey ? "front" : "forward");
        } else if (key === "[" || e.code === "BracketLeft") {
          done();
          arrange(store, e.altKey ? "back" : "backward");
        }
        return;
      }

      if (e.altKey && e.shiftKey && key === "l") {
        done();
        const els = flattenElements(elementsOf(st.design, st.screen)).filter((el) => st.selection.includes(el.id));
        if (els.length) setSelectionLocked(store, !els.every((el) => el.locked));
        return;
      }
      if (e.altKey) return;

      switch (e.key) {
        case "Escape":
          if (st.activeGroupId) store.exitGroup();
          else if (st.panel) store.closePanel();
          else if (st.selection.length) store.select([]);
          return;
        case "Delete":
        case "Backspace":
          if (!st.selection.length) return;
          done();
          deleteSelection(store);
          return;
        case "Tab": {
          // Solo si el foco no está en un botón u otro control (no se rompe la navegación por teclado).
          const active = document.activeElement;
          if (active && active !== document.body && !viewportRef.current?.contains(active)) return;
          const ids = tabOrder(store);
          if (!ids.length) return;
          done();
          const at = st.selection.length === 1 ? ids.indexOf(st.selection[0]) : -1;
          const next = e.shiftKey ? (at <= 0 ? ids.length - 1 : at - 1) : (at + 1) % ids.length;
          store.select([ids[next]]);
          return;
        }
        case "ArrowLeft":
        case "ArrowRight":
        case "ArrowUp":
        case "ArrowDown": {
          if (!st.selection.length) return;
          done();
          const step = e.shiftKey ? 10 : 1;
          const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
          const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
          if (st.device === "mobile" && !st.activeGroupId) {
            // En móvil automático el motor apila solo: el primer empujón lo pasa "a mano".
            const next = convertToMobileCustom(st.design, st.screen, st.selection, getBoxes());
            if (next !== st.design) {
              store.beginGesture();
              store.preview(() => next);
              nudgeSelection(store, dx, dy);
              store.endGesture("Mover");
              return;
            }
          }
          nudgeSelection(store, dx, dy);
          return;
        }
        default:
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [store]);
}
