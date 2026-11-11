import { h } from "../dom.js";
import { animationDefault, animationSlot, applyFinish, finishDefaults, finishSlots, languageOf, listOf, setVar } from "./common.js";
import { COUNT_MS, ROTATE_MS, countValueAt, formatCount, isCountable, nextIndex } from "./counterMath.js";

// Contador rotativo "en números": una cifra grande que cuenta hacia arriba (1100 ms, ease-out
// cúbico) y rota a la siguiente cada 4200 ms, con ticks de progreso. Con prefers-reduced-motion
// las cifras aparecen ya completas y sin fundidos.
//   props: { heading, items: [{ value, suffix, label }], countMs, rotateMs, showTicks, color, animation }
const refsOf = new WeakMap(); // root -> { ctx, kicker, num, suffix, label, body, ticks[], index, timer, raf, safety, swap, signature, props }

const reduced = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

function stop(refs) {
  clearInterval(refs.timer);
  clearTimeout(refs.safety);
  clearTimeout(refs.swap);
  if (refs.raf) cancelAnimationFrame(refs.raf);
  refs.timer = refs.raf = refs.safety = refs.swap = null;
}

function paintTicks(refs, rotateMs) {
  refs.ticks.forEach((tick, i) => {
    tick.classList.toggle("is-done", i < refs.index);
    tick.classList.remove("is-active");
    if (i === refs.index) {
      tick.style.setProperty("--tour-rotate", `${rotateMs}ms`);
      void tick.offsetWidth; // reinicia la animación del relleno
      tick.classList.add("is-active");
    }
  });
}

function showItem(refs, items, index, { countMs, rotateMs, animate, locale }) {
  const item = items[index] || {};
  refs.index = index;
  refs.root.dataset.counterIndex = String(index);
  refs.suffix.textContent = typeof item.suffix === "string" ? item.suffix : "";
  refs.label.textContent = typeof item.label === "string" ? item.label : "";
  paintTicks(refs, rotateMs);
  if (refs.raf) cancelAnimationFrame(refs.raf);
  clearTimeout(refs.safety);

  const value = item.value;
  if (!isCountable(value)) {
    refs.num.textContent = value == null ? "" : String(value);
    return;
  }
  const direction = item.direction === "down" ? "down" : "up";
  const final = formatCount(direction === "down" ? 0 : value, locale);
  if (!animate || reduced()) {
    refs.num.textContent = animate === false ? formatCount(value, locale) : final;
    return;
  }
  const t0 = performance.now();
  const step = (now) => {
    const elapsed = now - t0;
    refs.num.textContent = formatCount(countValueAt(value, elapsed, countMs, direction), locale);
    refs.raf = elapsed < countMs ? requestAnimationFrame(step) : null;
  };
  refs.num.textContent = formatCount(direction === "down" ? value : 0, locale);
  refs.raf = requestAnimationFrame(step);
  // Si el navegador pausa los cuadros (pestaña oculta) la cifra igual termina completa.
  refs.safety = setTimeout(() => {
    if (refs.raf) cancelAnimationFrame(refs.raf);
    refs.raf = null;
    refs.num.textContent = final;
  }, countMs + 80);
}

function restart(root, refs, props, paused, previewIndex) {
  stop(refs);
  const items = listOf(props.items, 8);
  const countMs = Number.isFinite(Number(props.countMs)) ? Math.max(0, Number(props.countMs)) : COUNT_MS;
  const rotateMs = Math.max(800, Number(props.rotateMs) || ROTATE_MS);
  const locale = languageOf(refs.ctx);
  refs.ticks = items.map(() => h("i", { className: "tour-rt-counter-tick" }, h("b")));
  refs.tickBox.replaceChildren(...refs.ticks);
  refs.tickBox.hidden = props.showTicks === false || items.length < 2;
  refs.body.hidden = items.length === 0;
  if (!items.length) return;
  const opts = { countMs, rotateMs, locale };
  const index = Math.max(0, Math.min(items.length - 1, previewIndex ?? (paused ? refs.index || 0 : 0)));
  refs.body.classList.remove("is-out");
  root.dataset.paused = String(paused);
  showItem(refs, items, index, { ...opts, animate: !paused });
  if (paused) { refs.ticks.forEach((tick) => tick.classList.remove("is-active")); return; }
  if (items.length < 2) return;
  refs.timer = setInterval(() => {
    if (!root.isConnected) return stop(refs); // el elemento ya no está: no dejar timers sueltos
    const go = () => showItem(refs, items, nextIndex(refs.index, items.length), { ...opts, animate: true });
    if (reduced()) return go();
    refs.body.classList.add("is-out");
    refs.swap = setTimeout(() => {
      go();
      refs.body.classList.remove("is-out");
    }, 180);
  }, rotateMs);
}

export const statsCounter = {
  id: "stats-counter",
  kind: "element",
  name: "Contador rotativo",
  category: "Cifras",
  mobile: "stack",
  fit: "content",
  interactive: false,
  defaults: {
    compositeLeaf: false,
    ...finishDefaults,
    heading: "En números",
    items: [
      { value: 1100, suffix: "+", label: "metros cuadrados" },
      { value: 12, suffix: "", label: "salas para recorrer" },
      { value: 5, suffix: "", label: "pisos" },
    ],
    countMs: COUNT_MS,
    rotateMs: ROTATE_MS,
    showTicks: true,
    color: "",
    animation: animationDefault,
  },
  slots: [
    { key: "heading", type: "text", label: "Etiqueta", inline: true, toolbar: true },
    {
      key: "items",
      type: "list",
      label: "Cifras",
      max: 8,
      of: [
        { key: "value", type: "number", label: "Valor" },
        { key: "suffix", type: "text", label: "Sufijo" },
        { key: "label", type: "text", label: "Descripción" },
        { key: "direction", type: "select", label: "Sentido", default: "up", options: [{ value: "up", label: "De cero al valor" }, { value: "down", label: "Del valor a cero" }] },
      ],
    },
    { key: "rotateMs", type: "range", label: "Cambia cada (ms)", min: 1500, max: 12000, step: 100 },
    { key: "countMs", type: "range", label: "Duración de la cuenta (ms)", min: 0, max: 3000, step: 50 },
    { key: "showTicks", type: "toggle", label: "Mostrar progreso" },
    { key: "color", type: "color", label: "Color de la cifra", toolbar: true },
    ...finishSlots,
    animationSlot,
  ],

  render(props, ctx) {
    const kicker = h("p", { className: "tour-rt-text tour-rt-text--kicker", "data-slot": "heading" }); // [C1]
    const num = h("span", { className: "tour-rt-counter-num" });
    const suffix = h("span", { className: "tour-rt-counter-suffix" });
    const label = h("span", { className: "tour-rt-counter-label" });
    const body = h("div", { className: "tour-rt-counter-body", "aria-live": "polite" }, [
      h("div", { className: "tour-rt-counter-value" }, [num, suffix]),
      label,
    ]);
    const tickBox = h("div", { className: "tour-rt-counter-ticks", "aria-hidden": "true" });
    const root = h("div", { className: "tour-rt-counter" }, [kicker, body, tickBox]);
    const refs = {
      root,
      ctx,
      kicker,
      num,
      suffix,
      label,
      body,
      tickBox,
      ticks: [],
      index: 0,
      timer: null,
      raf: null,
      safety: null,
      swap: null,
      signature: null,
    };
    refsOf.set(root, refs);
    statsCounter.update(root, props, ctx);
    return root;
  },

  update(root, props, ctx) {
    const refs = refsOf.get(root);
    if (!refs) return;
    refs.ctx = ctx;
    applyFinish(root, props, { bare: true });
    refs.kicker.textContent = typeof props.heading === "string" ? props.heading : "";
    refs.kicker.hidden = !refs.kicker.textContent;
    setVar(root, "--tour-counter-color", props.color);
    // Los timers solo se reinician si cambió el contenido; los refrescos por cuadro no los tocan.
    const preview = ctx?.editorState?.elementPreview;
    const selected = (ctx?.elementPath || ctx?.elementId || "").split("/").some((id) => ctx?.editorState?.selection?.includes(id));
    const previewing = preview?.id === ctx?.elementId;
    const paused = ctx?.mode === "design" && (selected || previewing) && !(previewing && preview.playing);
    const index = previewing ? preview.index : undefined;
    const signature = JSON.stringify([props.items, props.countMs, props.rotateMs, props.showTicks, languageOf(ctx), paused, index]);
    if (signature !== refs.signature) {
      refs.signature = signature;
      restart(root, refs, props, paused, index);
    }
  },

  dispose(root) {
    const refs = refsOf.get(root);
    if (refs) stop(refs);
  },
};
