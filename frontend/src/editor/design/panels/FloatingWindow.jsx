import { createContext, useContext, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useEscape } from "./escape.js";
import { clampWindowPosition, clampWindowSize, fitWindowPosition, WINDOW_HEIGHT, WINDOW_WIDTH } from "./floatingGeometry.js";
import { Ico } from "./ui.jsx";
import "./FloatingWindow.css";

const POSITION_KEY = "tour-studio.more-options.position";
const sessionPositions = new Map();
const WindowDepth = createContext(0);
let activeWindow = null;
const viewport = () => ({ width: window.innerWidth, height: window.innerHeight });

function initialPosition(key, depth, width) {
  if (!sessionPositions.has(key)) {
    try { sessionPositions.set(key, JSON.parse(sessionStorage.getItem(key))); } catch { /* Storage can be unavailable. */ }
  }
  const parent = depth ? [...document.querySelectorAll(".sp-floating-window")].at(-1)?.getBoundingClientRect() : null;
  const beside = parent ? { x: parent.right + 16 + width <= window.innerWidth ? parent.right + 16 : Math.max(16, parent.left - width - 16), y: Math.min(parent.top + 24, window.innerHeight - 100) } : null;
  return clampWindowPosition(sessionPositions.get(key) ?? beside, viewport(), Math.min(width, window.innerWidth - 16));
}

function initialSize(key, width, height) {
  try { return clampWindowSize(JSON.parse(sessionStorage.getItem(`${key}.size`)) ?? { width, height }, viewport()); }
  catch { return clampWindowSize({ width, height }, viewport()); }
}

// One nonmodal window, portaled above the whole studio. Position belongs to the session,
// rather than to an element, so reopening it keeps the workspace the user arranged.
export default function FloatingWindow({ title, onClose, children, windowKey = "main", hidden = false, defaultWidth = WINDOW_WIDTH, defaultHeight = WINDOW_HEIGHT }) {
  const depth = useContext(WindowDepth);
  const positionKey = `${POSITION_KEY}.${depth && windowKey === "main" ? title : windowKey}`;
  const sizeKey = windowKey === "main" ? `${POSITION_KEY}.${title}` : positionKey;
  const titleId = useId();
  const root = useRef(null);
  const returnFocus = useRef(document.activeElement);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const [size, setSize] = useState(() => initialSize(sizeKey, defaultWidth, defaultHeight));
  const [position, setPosition] = useState(() => fitWindowPosition(initialPosition(positionKey, depth, size.width), viewport(), size));
  const [tokens, setTokens] = useState({});
  const drag = useRef(null);
  const resizing = useRef(null);
  useEscape(!hidden, () => closeRef.current());
  useLayoutEffect(() => { if (!hidden) (root.current?.querySelector("[data-initial-focus]") || root.current)?.focus({ preventScroll: true }); }, [hidden]);

  useLayoutEffect(() => {
    const owner = { close: () => closeRef.current() };
    if (!depth) { activeWindow?.close(); activeWindow = owner; }
    // CSS variables on .studio would otherwise be lost at the body portal boundary.
    const studio = document.querySelector(".studio, .content-studio");
    if (studio) {
      const style = getComputedStyle(studio);
      const inherited = { fontFamily: style.fontFamily, fontSize: style.fontSize };
      for (const key of style) if (key.startsWith("--")) inherited[key] = style.getPropertyValue(key);
      setTokens(inherited);
    }
    const resize = () => setPosition((p) => fitWindowPosition(p, viewport(), { width: root.current?.offsetWidth ?? defaultWidth, height: root.current?.offsetHeight ?? defaultHeight }));
    window.addEventListener("resize", resize);
    return () => {
      if (activeWindow === owner) activeWindow = null;
      window.removeEventListener("resize", resize);
      if (returnFocus.current?.isConnected) returnFocus.current.focus?.({ preventScroll: true });
    };
  }, []);

  useLayoutEffect(() => {
    sessionPositions.set(positionKey, position);
    try { sessionStorage.setItem(positionKey, JSON.stringify(position)); } catch { /* Memory fallback. */ }
  }, [position, positionKey]);

  useLayoutEffect(() => {
    try { sessionStorage.setItem(`${sizeKey}.size`, JSON.stringify(size)); } catch { /* Optional session preference. */ }
  }, [size, sizeKey]);

  const startDrag = (e) => {
    if (e.button !== 0 || e.target.closest("button")) return;
    e.preventDefault();
    drag.current = { x: e.clientX, y: e.clientY, origin: position };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const moveDrag = (e) => {
    if (!drag.current) return;
    setPosition(clampWindowPosition({
      x: drag.current.origin.x + e.clientX - drag.current.x,
      y: drag.current.origin.y + e.clientY - drag.current.y,
    }, viewport(), root.current?.offsetWidth));
  };
  const stopDrag = () => { drag.current = null; };

  return createPortal(
    <section ref={root} className="sp-floating-window" role="dialog" aria-modal="false" aria-labelledby={titleId} tabIndex={-1}
      style={{ ...tokens, left: position.x, top: position.y, width: size.width, height: size.height, zIndex: 1000 + depth, ...(hidden ? { display: "none" } : {}) }}
      onKeyDown={(e) => {
        // Native Tab and text editing stay inside their controls, away from canvas shortcuts.
        // Preserve undo/redo/save, which are intentionally global editor commands.
        if (!(e.ctrlKey || e.metaKey) || !["z", "y", "s"].includes(e.key.toLowerCase())) e.stopPropagation();
      }}>
      <header className="sp-floating-title" onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={stopDrag} onPointerCancel={stopDrag} onLostPointerCapture={stopDrag}>
        <h2 id={titleId}>{title}</h2>
        <button type="button" className="sp-icon-btn" aria-label="Cerrar ventana" title="Cerrar (Esc)" onClick={onClose}><Ico name="close" /></button>
      </header>
      <div className="sp-floating-content"><WindowDepth.Provider value={depth + 1}>{children}</WindowDepth.Provider></div>
      <button type="button" className="sp-floating-resize" aria-label="Redimensionar ventana" title="Arrastra para cambiar el tamaño. También puedes usar las flechas."
        onPointerDown={(e) => { if (e.button !== 0) return; e.preventDefault(); const rect = root.current.getBoundingClientRect(); resizing.current = { x: e.clientX, y: e.clientY, width: rect.width, height: rect.height }; e.currentTarget.setPointerCapture(e.pointerId); }}
        onPointerMove={(e) => { const start = resizing.current; if (start) setSize(clampWindowSize({ width: start.width + e.clientX - start.x, height: start.height + e.clientY - start.y }, viewport(), position)); }}
        onPointerUp={() => { resizing.current = null; }} onPointerCancel={() => { resizing.current = null; }} onLostPointerCapture={() => { resizing.current = null; }}
        onKeyDown={(e) => { const deltas = { ArrowLeft: [-10, 0], ArrowRight: [10, 0], ArrowUp: [0, -10], ArrowDown: [0, 10] }; if (deltas[e.key]) { e.preventDefault(); const [w, h] = deltas[e.key]; setSize(clampWindowSize({ width: root.current.offsetWidth + w, height: root.current.offsetHeight + h }, viewport(), position)); } }}>
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M3 15 15 3M8 15l7-7M13 15l2-2" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>
      </button>
    </section>, document.body,
  );
}
