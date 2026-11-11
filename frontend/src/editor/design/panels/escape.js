import { useEffect, useRef } from "react";

// Escape dentro de un panel, popover o menú lo cierra y NO llega al lienzo (que lo usa para
// deseleccionar o cancelar gestos). Un solo oyente en `window` (fase de captura, antes que los
// atajos de C1) atiende al más reciente de la pila: así Escape cierra primero el popover y luego
// el panel que lo contenía.
const stack = [];
let installed = false;

function onKey(e) {
  if (e.key !== "Escape" || !stack.length) return;
  const gesture = new Event("tour-studio:cancel-active-gesture", { cancelable: true });
  window.dispatchEvent(gesture);
  e.stopPropagation();
  e.stopImmediatePropagation();
  if (gesture.defaultPrevented) { e.preventDefault(); return; }
  stack[stack.length - 1].current(e);
}

export function useEscape(active, handler) {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    if (!active) return undefined;
    stack.push(ref);
    if (!installed) {
      window.addEventListener("keydown", onKey, true);
      installed = true;
    }
    return () => {
      const i = stack.lastIndexOf(ref);
      if (i >= 0) stack.splice(i, 1);
      if (!stack.length && installed) {
        window.removeEventListener("keydown", onKey, true);
        installed = false;
      }
    };
  }, [active]);
}
