import { useRef, useState } from "react";
import {
  effectiveSegments,
  hotspotCoversFrame,
  sortedKeys,
  withRange,
  withoutKey,
} from "../../runtime/model/segments.js";
import "./FrameTimeline.css";

// Línea de tiempo de un video 360° (plan §3.6): debajo del lienzo, con
//   - un scrubber de cuadros (arrastrable, con teclado),
//   - una barra de cobertura por hotspot (un color cada uno): en qué cuadros se ve,
//   - manijas de inicio y fin arrastrables en el hotspot seleccionado,
//   - rombos de keyframes (posiciones que el hotspot recorre de un cuadro clave a otro),
//   - un aviso al pasar el mouse: "Cuadro n · títulos activos".
// Los cuadros se muestran a las personas desde 1 ("Cuadro 1"); por dentro son índices desde 0.
//
// Es de presentación: no sabe de red ni del motor. `onSeek(i)` pide ir a un cuadro y
// `onSegmentsChange(hotspotId, segments)` pide guardar los segmentos de un hotspot.
const PALETTE = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const sameSegments = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export default function FrameTimeline({
  frameCount,
  frameIndex,
  onSeek,
  items, // [{ hotspot, ownIndex }]: los hotspots cuyo cuadro de origen está en este lote
  selectedId,
  onSelect,
  onSegmentsChange,
}) {
  const last = frameCount - 1;
  const bodyRef = useRef(null);
  const rulerRef = useRef(null);
  const [hover, setHover] = useState(null); // { frame, x }
  const [drag, setDrag] = useState(null); // { id, segments } mientras se arrastra o se guarda

  const colorOf = (index) => PALETTE[index % PALETTE.length];
  const segmentsOf = (item) =>
    drag?.id === item.hotspot.id ? drag.segments : effectiveSegments(item.hotspot, item.ownIndex, last);
  const selected = items.find((it) => it.hotspot.id === selectedId) ?? null;

  function frameAt(clientX, trackEl) {
    const rect = trackEl.getBoundingClientRect();
    return clamp(Math.floor(((clientX - rect.left) / rect.width) * frameCount), 0, last);
  }

  // ── Scrubber ────────────────────────────────────────────────────────
  function scrubStart(e) {
    e.preventDefault();
    const track = e.currentTarget;
    track.setPointerCapture(e.pointerId);
    track.focus();
    onSeek(frameAt(e.clientX, track));
    const move = (ev) => onSeek(frameAt(ev.clientX, track));
    const up = () => {
      track.removeEventListener("pointermove", move);
      track.removeEventListener("pointerup", up);
      track.removeEventListener("pointercancel", up);
    };
    track.addEventListener("pointermove", move);
    track.addEventListener("pointerup", up);
    track.addEventListener("pointercancel", up);
  }

  function scrubKey(e) {
    const step = e.shiftKey ? 10 : 1;
    const target =
      e.key === "ArrowLeft" ? frameIndex - step
      : e.key === "ArrowRight" ? frameIndex + step
      : e.key === "Home" ? 0
      : e.key === "End" ? last
      : null;
    if (target === null) return;
    e.preventDefault();
    onSeek(clamp(target, 0, last));
  }

  // ── Manijas de inicio y fin ─────────────────────────────────────────
  function commit(item, next) {
    const base = effectiveSegments(item.hotspot, item.ownIndex, last);
    if (sameSegments(base, next)) {
      setDrag(null);
      return;
    }
    setDrag({ id: item.hotspot.id, segments: next }); // se queda hasta que el guardado termine: sin parpadeo
    Promise.resolve(onSegmentsChange(item.hotspot.id, next))
      .catch(() => {})
      .finally(() => setDrag(null));
  }

  function handleStart(e, item, segIndex, edge) {
    e.preventDefault();
    e.stopPropagation();
    onSelect(item.hotspot.id);
    const handle = e.currentTarget;
    const track = handle.closest(".ft-track");
    handle.setPointerCapture(e.pointerId);
    const base = effectiveSegments(item.hotspot, item.ownIndex, last);
    let latest = null;

    const move = (ev) => {
      const f = frameAt(ev.clientX, track);
      const seg = base[segIndex];
      latest = edge === "from" ? withRange(base, segIndex, f, seg.to, last) : withRange(base, segIndex, seg.from, f, last);
      setDrag({ id: item.hotspot.id, segments: latest });
      onSeek(edge === "from" ? latest[segIndex].from : latest[segIndex].to);
    };
    const up = () => {
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", up);
      handle.removeEventListener("pointercancel", up);
      if (latest) commit(item, latest);
      else setDrag(null);
    };
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", up);
    handle.addEventListener("pointercancel", up);
  }

  function handleKey(e, item, segIndex, edge) {
    const dir = e.key === "ArrowLeft" ? -1 : e.key === "ArrowRight" ? 1 : 0;
    if (!dir) return;
    e.preventDefault();
    e.stopPropagation();
    const base = effectiveSegments(item.hotspot, item.ownIndex, last);
    const seg = base[segIndex];
    const next =
      edge === "from"
        ? withRange(base, segIndex, seg.from + dir, seg.to, last)
        : withRange(base, segIndex, seg.from, seg.to + dir, last);
    commit(item, next);
  }

  // ── Keyframes ───────────────────────────────────────────────────────
  const selectedSegments = selected ? segmentsOf(selected) : [];
  const hasKeyHere = selectedSegments.some((s) => String(frameIndex) in s.keys);
  function removeKeyHere() {
    commit(selected, withoutKey(selectedSegments, frameIndex, last));
  }

  // ── Aviso al pasar el mouse ─────────────────────────────────────────
  function onHover(e) {
    const ruler = rulerRef.current;
    const body = bodyRef.current;
    if (!ruler || !body) return;
    const rect = ruler.getBoundingClientRect();
    if (e.clientX < rect.left || e.clientX > rect.right) {
      setHover(null);
      return;
    }
    const frame = frameAt(e.clientX, ruler);
    setHover({ frame, x: e.clientX - body.getBoundingClientRect().left });
  }
  const hoverTitles = hover
    ? items
        .filter((it) => hotspotCoversFrame(it.hotspot, hover.frame, it.ownIndex, last))
        .map((it) => it.hotspot.title || "(sin título)")
    : [];

  const cell = 100 / frameCount;
  const ticks = [];
  for (let f = 0; f <= last; f++) if (f === 0 || (f + 1) % 10 === 0) ticks.push(f);
  const playhead = <span className="ft-playhead" style={{ left: `${(frameIndex + 0.5) * cell}%` }} />;

  return (
    <div className="frame-timeline ft" aria-label="Línea de tiempo del video">
      <div className="ft-head">
        <span className="ft-title">Cuadros</span>
        <span className="ft-count">
          Cuadro {frameIndex + 1} de {frameCount}
        </span>
        <span className="ft-spacer" />
        {selected && (
          <>
            <span className="ft-selected">
              {selected.hotspot.title || "(sin título)"} ·{" "}
              {selectedSegments.map((s) => `${s.from + 1}–${s.to + 1}`).join(", ")}
            </span>
            <button type="button" className="btn btn-ghost btn-sm" disabled={!hasKeyHere} onClick={removeKeyHere}>
              Quitar keyframe
            </button>
          </>
        )}
      </div>

      <div className="ft-body" ref={bodyRef} onPointerMove={onHover} onPointerLeave={() => setHover(null)}>
        <div className="ft-scroll">
        <div className="ft-line ft-ruler-line">
          <span className="ft-label" />
          <div
            className="ft-track ft-ruler"
            ref={rulerRef}
            role="slider"
            tabIndex={0}
            aria-label="Cuadro del video"
            aria-valuemin={1}
            aria-valuemax={frameCount}
            aria-valuenow={frameIndex + 1}
            onPointerDown={scrubStart}
            onKeyDown={scrubKey}
          >
            {ticks.map((f) => (
              <span
                key={f}
                className="ft-tick"
                style={{ left: `${(f + 0.5) * cell}%`, transform: f >= last - 1 ? "translateX(-100%)" : undefined }}
              >
                {f + 1}
              </span>
            ))}
            {playhead}
          </div>
        </div>

        <div className="ft-rows">
          {items.length === 0 && (
            <p className="ft-empty">
              Este video aún no tiene hotspots. Haz clic derecho en el lienzo para agregar uno: aparecerá aquí con el
              rango de cuadros en que se ve.
            </p>
          )}
          {items.map((item, i) => {
            const isSelected = item.hotspot.id === selectedId;
            const color = colorOf(i);
            const segments = segmentsOf(item);
            return (
              <div
                key={item.hotspot.id}
                className={`ft-line ft-row${isSelected ? " ft-row-selected" : ""}`}
                style={{ "--ft-color": color }}
              >
                <button
                  type="button"
                  className="ft-label"
                  title={item.hotspot.title}
                  onClick={() => onSelect(isSelected ? null : item.hotspot.id)}
                >
                  <span className="ft-dot" />
                  <span className="ft-label-text">{item.hotspot.title || "(sin título)"}</span>
                </button>
                <div
                  className="ft-track"
                  onPointerDown={(e) => {
                    onSelect(item.hotspot.id);
                    onSeek(frameAt(e.clientX, e.currentTarget));
                  }}
                >
                  {segments.map((seg, si) => (
                    <div
                      key={si}
                      className="ft-bar"
                      style={{ left: `${seg.from * cell}%`, width: `${(seg.to - seg.from + 1) * cell}%` }}
                    >
                      {isSelected && (
                        <>
                          <button
                            type="button"
                            className="ft-handle ft-handle-from"
                            aria-label="Inicio del rango"
                            onPointerDown={(e) => handleStart(e, item, si, "from")}
                            onKeyDown={(e) => handleKey(e, item, si, "from")}
                          />
                          <button
                            type="button"
                            className="ft-handle ft-handle-to"
                            aria-label="Fin del rango"
                            onPointerDown={(e) => handleStart(e, item, si, "to")}
                            onKeyDown={(e) => handleKey(e, item, si, "to")}
                          />
                        </>
                      )}
                    </div>
                  ))}
                  {isSelected &&
                    segments.flatMap((seg) =>
                      sortedKeys(seg).map(([f]) => (
                        <button
                          key={`${seg.from}-${f}`}
                          type="button"
                          className={`ft-key${f === frameIndex ? " ft-key-current" : ""}`}
                          style={{ left: `${(f + 0.5) * cell}%` }}
                          aria-label={`Keyframe en el cuadro ${f + 1}`}
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={() => onSeek(f)}
                        />
                      ))
                    )}
                  {playhead}
                </div>
              </div>
            );
          })}
        </div>

        </div>

        {hover && (
          <div className="ft-tip" style={{ left: hover.x }} role="status">
            Cuadro {hover.frame + 1} · {hoverTitles.length ? hoverTitles.join(", ") : "sin hotspots"}
          </div>
        )}
      </div>
    </div>
  );
}
