import { useRef } from "react";

// Versión React del scrubber del prototipo: track controlado por props, sin variables
// globales. onSeek se dispara al soltar; durante el arrastre se llama de inmediato para
// mantener la sensación de scrubbing en vivo (el guard anti-race-condition vive en el hook).
export default function TimelineScrubber({ totalFrames, currentIndex, onSeek }) {
  const trackRef = useRef(null);
  const draggingRef = useRef(false);

  function seekFromClientX(clientX) {
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    onSeek(Math.round(pct * (totalFrames - 1)));
  }

  function handlePointerDown(e) {
    draggingRef.current = true;
    seekFromClientX(e.clientX);
  }

  function handlePointerMove(e) {
    if (!draggingRef.current) return;
    seekFromClientX(e.clientX);
  }

  function handlePointerUp() {
    draggingRef.current = false;
  }

  const pct = totalFrames > 1 ? currentIndex / (totalFrames - 1) : 0;

  return (
    <div
      style={{ position: "absolute", left: 16, right: 16, bottom: 16, height: 32 }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <div
        ref={trackRef}
        style={{
          position: "relative",
          height: 6,
          borderRadius: "var(--tour-radius, 3px)",
          background: "rgba(255,255,255,0.25)",
          marginTop: 12,
          cursor: "pointer",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: `${pct * 100}%`,
            background: "var(--tour-accent, #4da3ff)",
            borderRadius: "var(--tour-radius, 3px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: `${pct * 100}%`,
            top: -5,
            width: 16,
            height: 16,
            marginLeft: -8,
            borderRadius: "50%",
            background: "var(--tour-accent, #4da3ff)",
          }}
        />
      </div>
      <div style={{ color: "#ccc", fontSize: 12, marginTop: 4 }}>
        {currentIndex + 1} / {totalFrames}
      </div>
    </div>
  );
}
