import { h } from "../dom.js";

// Scrubber de cuadros: pista + relleno + perilla + "n / N". La barra captura su propio puntero
// (el arrastre sigue aunque el mouse salga de ella y el pointerup siempre llega aquí) y solo
// busca mientras hay un arrastre activo: sin clic no sigue al mouse y no gira la cámara.
//   ctx: { state: { frameIndex, frameCount }, seek(index) }
const refsOf = new WeakMap(); // root -> { ctx, track, fill, knob, label, dragging }

export const frameScrubber = {
  id: "frame-scrubber",
  kind: "element",
  name: "Barra de cuadros",
  category: "Barras",
  mobile: "keep", // barra estirada: en móvil se queda fija abajo
  defaults: {},
  slots: [],
  // Solo tiene sentido con más de un cuadro en el lote activo.
  isVisible: (ctx) => ctx.mode === "design" || ctx.state.frameCount > 1,

  render(props, ctx) {
    const fillEl = h("div", { className: "tour-rt-scrub-fill" });
    const knob = h("div", { className: "tour-rt-scrub-knob" });
    const track = h("div", { className: "tour-rt-scrub-track" }, [fillEl, knob]);
    const label = h("div", { className: "tour-rt-scrub-label" });
    const root = h("div", { className: "tour-rt-scrub", "data-ui": "" }, [track, label]);
    const refs = { ctx, track, fill: fillEl, knob, label, dragging: false };
    refsOf.set(root, refs);

    function seekFromClientX(clientX) {
      const rect = refs.track.getBoundingClientRect();
      const { frameCount } = refs.ctx.state;
      if (!rect.width || frameCount < 2) return;
      const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      refs.ctx.seek(Math.round(pct * (frameCount - 1)));
    }
    root.addEventListener("pointerdown", (e) => {
      root.setPointerCapture(e.pointerId);
      refs.dragging = true;
      seekFromClientX(e.clientX);
    });
    root.addEventListener("pointermove", (e) => {
      if (refs.dragging) seekFromClientX(e.clientX);
    });
    const stop = () => {
      refs.dragging = false;
    };
    root.addEventListener("pointerup", stop);
    root.addEventListener("pointercancel", stop);
    root.addEventListener("lostpointercapture", stop);

    frameScrubber.update(root, props, ctx);
    return root;
  },

  update(root, props, ctx) {
    const refs = refsOf.get(root);
    refs.ctx = ctx;
    const { frameIndex, frameCount } = ctx.state;
    const pct = frameCount > 1 ? (frameIndex / (frameCount - 1)) * 100 : 0;
    refs.fill.style.width = `${pct}%`;
    refs.knob.style.left = `${pct}%`;
    refs.label.textContent = ctx.mode === "design" && frameCount < 2 ? "Barra de cuadros · visible en videos 360°" : `${frameIndex + 1} / ${frameCount}`;
  },
};
