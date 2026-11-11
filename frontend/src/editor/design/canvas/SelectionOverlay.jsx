import { getTemplate } from "../../../runtime/templates/index.js";
import { deleteSelection, duplicateSelection, setSelectionLocked } from "../actions.js";
import { useDesignEditor } from "../../hooks/useTourDesign.jsx";
import { CopyIcon, LockIcon, MoreIcon, TrashIcon, UnlockIcon } from "./canvasIcons.jsx";
import { HANDLES, HANDLE_CURSORS, handlesFor, unionRect } from "./gestures.js";
import { hasMobileFrame } from "./frames.js";

const BAR_W = 160; // ancho aproximado de la mini-barra (para no salirse del área)
const BAR_H = 40;
const BAR_GAP = 16;

// Ancla efectiva del elemento en el dispositivo activo (solo importa si es estirada).
const anchorOf = (el, device) => (device === "mobile" && hasMobileFrame(el) ? el.mobile.frame.anchor : el.frame?.anchor);

// Capa de selección (encima de la mesa, en px del área): contorno al pasar, caja con manijas,
// mini-barra flotante, guías inteligentes y rectángulo de selección. No dibuja ningún elemento:
// eso lo hace siempre el motor, así la vista previa es idéntica al export.
export default function SelectionOverlay({ view, size, boxes, elements, selection, activeGroupId, editing, hoverId, device, gesture, guides, marquee, onHandleDown, showGroupHandles = false }) {
  const store = useDesignEditor();
  const z = view.zoom;
  const px = (x) => view.x + x * z;
  const py = (y) => view.y + y * z;
  const toScreen = (b) => ({ left: px(b.left), top: py(b.top), width: b.width * z, height: b.height * z });
  const byId = new Map(elements.map((el) => [el.id, el]));
  const selected = selection.map((id) => boxes.find((b) => b.id === id)).filter(Boolean);
  const single = selected.length === 1 ? selected[0] : null;
  const singleEl = single ? byId.get(single.id) : null;
  const hover = hoverId && !selection.includes(hoverId) && !gesture ? boxes.find((b) => b.id === hoverId) : null;
  const busy = !!gesture;
  const editingNow = !!editing;

  const union = selected.length > 1 ? unionRect(selected) : null;
  const anchorBox = single ?? union;
  const allLocked = selected.length > 0 && selected.every((b) => byId.get(b.id)?.locked);

  // Manijas de la caja única.
  let handles = []; // al mover se esconden; al redimensionar se quedan
  if (single && singleEl && !editingNow && gesture?.kind !== "move" && gesture?.kind !== "pan") {
    const tpl = getTemplate(singleEl.template);
    handles = showGroupHandles && singleEl.template === "group" ? HANDLES : handlesFor({ anchor: anchorOf(singleEl, device), fit: tpl?.fit, locked: singleEl.locked });
  }

  const groupBox = activeGroupId ? boxes.find((box) => box.id === activeGroupId) : null;
  const groupEl = activeGroupId ? byId.get(activeGroupId) : null;
  const groupHandles = showGroupHandles && groupBox && groupEl && !groupEl.locked && !editingNow &&
    single?.id !== activeGroupId && gesture?.kind !== "move" && gesture?.kind !== "pan" ? HANDLES : [];
  if (gesture?.targetId) handles = [];
  const handleEntries = [
    ...groupHandles.map(h => ({ h, box: groupBox, targetId: activeGroupId })),
    ...handles.map(h => ({ h, box: single })),
  ];

  const showAuto = (b) => {
    const el = byId.get(b.id);
    return !activeGroupId && device === "mobile" && el && el.mobile?.mode !== "hidden" && !hasMobileFrame(el) && !el.locked;
  };

  return (
    <div className="cv-overlay" aria-hidden={false}>
      {activeGroupId && (() => { const group = boxes.find((box) => box.id === activeGroupId); return group ? <div className={`cv-group-boundary${groupHandles.length ? " is-resizable" : ""}`} style={toScreen(group)} /> : null; })()}
      {hover && <div className="cv-hover" style={toScreen(hover)} />}

      {selected.map((b) => (
        <div key={b.id} className={`cv-sel${editingNow ? " is-editing" : ""}`} style={toScreen(b)} />
      ))}
      {union && <div className="cv-union" style={toScreen(union)} />}

      {[...selected, ...(hover ? [hover] : [])]
        .filter((b) => showAuto(b))
        .map((b) => {
          const r = toScreen(b);
          return (
            <span key={`auto-${b.id}`} className="cv-auto" style={{ left: r.left, top: r.top - 22 }} title="Se acomoda solo; si lo mueves, queda a mano">
              Auto
            </span>
          );
        })}

      {handleEntries.map(({ h, box, targetId }) => {
        const r = toScreen(box);
        const x = h.includes("w") ? r.left : h.includes("e") ? r.left + r.width : r.left + r.width / 2;
        const y = h.includes("n") ? r.top : h.includes("s") ? r.top + r.height : r.top + r.height / 2;
        // Adjacent handles are half a box apart. Their hit areas must not cover
        // one another on short text lines or small images at reduced zoom.
        const width = Math.min(24, r.width / 2), height = Math.min(24, r.height / 2);
        const dot = Math.min(12, width, height);
        return (
          <div
            key={`${targetId || "piece"}-${h}`}
            className={`cv-handle cv-handle--${h.length === 2 ? "corner" : h === "n" || h === "s" ? "row" : "col"}`}
            style={{ left: x - width / 2, top: y - height / 2, width, height, cursor: HANDLE_CURSORS[h] }}
            onPointerDown={(e) => onHandleDown(h, e, targetId)}
            data-handle={targetId ? undefined : h}
            data-group-handle={targetId ? h : undefined}
            title={targetId ? h.length === 2 ? "Escalar contenedor y piezas" : h === "n" || h === "s" ? "Cambiar alto del contenedor" : "Cambiar ancho del contenedor" : undefined}
          >
            <span style={h.length === 2 ? { width: dot, height: dot } : { maxWidth: width, maxHeight: height }} />
          </div>
        );
      })}

      {guides.map((g, i) =>
        g.axis === "x" ? (
          <div key={`g${i}`} className="cv-guide cv-guide--v" style={{ left: Math.round(px(g.pos)), top: py(g.from), height: (g.to - g.from) * z }} />
        ) : (
          <div key={`g${i}`} className="cv-guide cv-guide--h" style={{ top: Math.round(py(g.pos)), left: px(g.from), width: (g.to - g.from) * z }} />
        )
      )}

      {gesture?.label && single && (() => {
        const r = toScreen(boxes.find(box => box.id === gesture.targetId) || single);
        return (
          <span className="cv-size" style={{ left: r.left + r.width / 2, top: r.top + r.height + 10 }}>
            {gesture.label}
          </span>
        );
      })()}

      {marquee && (
        <div
          className="cv-marquee"
          style={{ left: Math.min(marquee.x0, marquee.x1), top: Math.min(marquee.y0, marquee.y1), width: Math.abs(marquee.x1 - marquee.x0), height: Math.abs(marquee.y1 - marquee.y0) }}
        />
      )}

      {anchorBox && !busy && !editingNow && (() => {
        const r = toScreen(anchorBox);
        let top = r.top - BAR_GAP - BAR_H;
        if (top < 8) top = r.top + r.height + BAR_GAP; // sin sitio arriba: debajo
        top = Math.max(8, Math.min(top, size.h - BAR_H - 8));
        const cx = Math.max(BAR_W / 2 + 8, Math.min(r.left + r.width / 2, size.w - BAR_W / 2 - 8));
        return (
          <div className="cv-minibar" style={{ left: cx, top }} role="toolbar" aria-label="Acciones del elemento" onPointerDown={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
            <button type="button" title={allLocked ? "Desbloquear (Alt+Shift+L)" : "Bloquear (Alt+Shift+L)"} aria-label={allLocked ? "Desbloquear" : "Bloquear"} aria-pressed={allLocked} onClick={() => setSelectionLocked(store, !allLocked)}>
              {allLocked ? <LockIcon /> : <UnlockIcon />}
            </button>
            <button type="button" title="Duplicar (Ctrl+D)" aria-label="Duplicar" onClick={() => duplicateSelection(store)}>
              <CopyIcon />
            </button>
            <button type="button" title="Eliminar (Supr)" aria-label="Eliminar" disabled={allLocked} onClick={() => deleteSelection(store)}>
              <TrashIcon />
            </button>
            <button type="button" title="Más opciones: posición, capas…" aria-label="Más" onClick={() => store.openPanel("position")}>
              <MoreIcon />
            </button>
          </div>
        );
      })()}
    </div>
  );
}
