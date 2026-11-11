import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { getTemplate } from "../../../runtime/templates/index.js";
import { mergeProps } from "../../../runtime/layout/util.js";
import { useDesignEditor, useDesignState } from "../../hooks/useTourDesign.jsx";
import { findElement, updateProps } from "../elementOps.js";
import { useStudio } from "../StudioContext.jsx";

// Texto en el lugar (doble clic): un textarea transparente, con la misma fuente, tamaño y color
// del texto del motor, se coloca exactamente encima del nodo [data-slot=<clave>]. Mientras se
// escribe, el texto del motor se esconde (visibility) para no verlo doble; cada tecla escribe en
// el diseño con `apply` (mergeKey por elemento y clave), así el motor lo pinta en vivo y Ctrl+Z
// deshace por tramos.
//   Enter confirma (salvo en slots con `multiline`) · Shift+Enter, salto de línea · Escape sale
export default function InlineTextEditor({ getBoard, viewportRef, boxes, view }) {
  const store = useDesignEditor();
  const editing = useDesignState((s) => s.editing);
  const element = useDesignState((s) => (s.editing ? findElement(s.design, s.screen, s.editing.id) : null));
  const screen = useDesignState((s) => s.screen);
  const selection = useDesignState((s) => s.selection);
  const area = useRef(null);
  const hiddenNode = useRef(null);
  const [frame, setFrame] = useState(null);

  const template = element ? getTemplate(element.template) : null;
  const slot = template?.slots?.find((sl) => sl.key === editing?.key);
  const { tour } = useStudio();
  const rawValue = element && editing ? mergeProps(template, element.props)[editing.key] : "";
  const value = String(element?.template === "basic-topbar" && editing?.key === "title" ? rawValue || tour?.title || "" : rawValue ?? "");

  // La edición solo vale mientras ese elemento sea la única selección.
  useEffect(() => {
    if (editing && (selection.length !== 1 || selection[0] !== editing.id || !element)) store.setEditing(null);
  }, [editing, selection, element, store]);

  // Coloca el textarea sobre el nodo de texto y copia su tipografía.
  useLayoutEffect(() => {
    if (!editing || !element) {
      setFrame(null);
      return;
    }
    const board = getBoard();
    const viewport = viewportRef.current;
    const node = board?.querySelector(`[data-el-id="${CSS.escape(editing.id)}"] [data-slot="${CSS.escape(editing.key)}"]`);
    if (!node || !viewport) {
      setFrame(null);
      return;
    }
    if (hiddenNode.current !== node) {
      if (hiddenNode.current) hiddenNode.current.style.visibility = "";
      hiddenNode.current = node;
    }

    const vr = viewport.getBoundingClientRect();
    let r = node.getBoundingClientRect();
    if (!(r.width > 0 && r.height > 0)) {
      // Texto vacío (el motor lo oculta): se usa la esquina de la caja del elemento.
      const box = boxes.find((b) => b.id === editing.id);
      if (!box) {
        setFrame(null);
        return;
      }
      const left = view.x + box.left * view.zoom + vr.left;
      const top = view.y + box.top * view.zoom + vr.top;
      r = { left, top, width: 160, height: 28 * view.zoom };
    }
    const cs = getComputedStyle(node);
    // Escala total sobre el nodo (zoom de la mesa × --s del motor).
    const k = node.offsetWidth > 0 ? r.width / node.offsetWidth : view.zoom;
    const num = (v, fallback = 0) => (Number.isFinite(parseFloat(v)) ? parseFloat(v) : fallback);
    const fontSize = num(cs.fontSize, 16) * k;
    node.style.visibility = "hidden";
    setFrame({
      left: r.left - vr.left - 2,
      top: r.top - vr.top - 1,
      width: Math.max(r.width + 4, 48),
      height: Math.max(r.height + 2, fontSize * 1.2),
      fontFamily: cs.fontFamily,
      fontSize,
      fontWeight: cs.fontWeight,
      fontStyle: cs.fontStyle,
      lineHeight: cs.lineHeight.endsWith("px") ? `${num(cs.lineHeight) * k}px` : cs.lineHeight,
      letterSpacing: cs.letterSpacing === "normal" ? "normal" : `${num(cs.letterSpacing) * k}px`,
      textTransform: cs.textTransform,
      textDecoration: cs.textDecoration,
      textAlign: cs.textAlign,
      color: cs.color,
    });
    return () => {
      node.style.visibility = "";
      if (hiddenNode.current === node) hiddenNode.current = null;
    };
  }, [editing, element, boxes, view, value, getBoard, viewportRef]);

  // Foco con todo el texto elegido al entrar.
  useEffect(() => {
    if (!editing || !frame) return;
    const ta = area.current;
    if (ta && document.activeElement !== ta) {
      ta.focus({ preventScroll: true });
      ta.select();
    }
    // Solo al abrir la edición (no en cada tecla).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing?.id, editing?.key, !!frame]);

  // Cambios de fuera (deshacer, panel) → el textarea los refleja.
  useEffect(() => {
    const ta = area.current;
    if (ta && ta.value !== value) ta.value = value;
  }, [value]);

  if (!editing || !element || !frame) return null;

  const multiline = !!slot?.multiline;
  const commit = (raw) => {
    const text = multiline ? raw : raw.replace(/\r?\n/g, " ");
    store.apply((d) => updateProps(d, screen, [editing.id], { [editing.key]: text }), {
      label: "Editar texto",
      mergeKey: `text:${editing.id}.${editing.key}`,
    });
  };

  const onKeyDown = (e) => {
    const mod = e.ctrlKey || e.metaKey;
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      store.setEditing(null);
      viewportRef.current?.focus({ preventScroll: true });
    } else if (e.key === "Enter" && !e.shiftKey && !multiline) {
      e.preventDefault();
      store.setEditing(null);
      viewportRef.current?.focus({ preventScroll: true });
    } else if (mod && e.key.toLowerCase() === "z") {
      e.preventDefault(); // el deshacer es el del almacén, no el del textarea
      if (e.shiftKey) store.redo();
      else store.undo();
    } else if (mod && e.key.toLowerCase() === "y") {
      e.preventDefault();
      store.redo();
    }
    e.stopPropagation();
  };

  return (
    <textarea
      ref={area}
      className="cv-inline-editor"
      style={frame}
      defaultValue={value}
      spellCheck={false}
      rows={1}
      aria-label={slot?.label ?? "Texto"}
      onChange={(e) => commit(e.target.value)}
      onKeyDown={onKeyDown}
      onPointerDown={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
    />
  );
}
