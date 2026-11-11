import "../layout/layout.css";
import { createElementLayer } from "../layout/elementLayer.js";
import { gridStyle, resolveAssetUrl, safeCssValue, scrimGradient } from "../layout/util.js";

// Pantalla de inicio (design.screens.intro): fondo de video/imagen/color + degradado + cuadrícula
// + elementos con el mismo motor de layout, encima del recorrido mientras carga. Dueño: B3
// (contrato Oleada 2 §5, plan §3.2 y §4).
//
// Contrato con tourRuntime.js (solo modos view/export):
//   show(doc, ctx) → true si se mostró (intro.enabled); el recorrido arranca debajo, cargando.
//                    ctx = { root, getTemplate, getCtx(), enter() } — enter() la oculta y emite "enter".
//   setReady(bool) → la primera escena ya se ve (habilita el botón con acción "enter").
//   refresh(doc)   → aplica un diseño nuevo sin cerrarla: si el fondo no cambió solo actualiza
//                    elementos y degradado (el editor la redibuja así en cada cambio).
//   getBoxes()     → rects de sus elementos (ver elementLayer.getBoxes), [] si no se muestra.
//   hide(), dispose()
// Modo diseño (ctx.design = true, lo usa el editor): sin animaciones de entrada, sin parallax,
// lista desde el principio y nunca se cierra sola.
//
// design.screens.intro = {
//   enabled,
//   background: { kind: "video"|"image"|"color", asset: "asset:<id>", poster: "asset:<id>", color,
//                 scrim: { from, to, angle, mobileAngle, opacity }, grid: { on, size, opacity },
//                 parallax: bool },
//   elements: [ Element… ]          // mismo formato y mismo layout que el HUD
// }
const LEAVE_MS = 850;
const PARALLAX_PX = { x: 22, y: 14 };

const reduced = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

export function createIntroScreen() {
  let state = null; // { el, bg, scrim, grid, layer, video, hostCtx, doc, intro, timers…}
  let ready = false;
  let lastHostCtx = null;

  function uiCtx() {
    const { hostCtx } = state;
    return { ...hostCtx.getCtx(), ready, enter: hostCtx.enter, intro: true };
  }

  function buildBackground(doc, background) {
    const bg = document.createElement("div");
    bg.className = "tour-rt-intro-bg";
    const b = background && typeof background === "object" ? background : {};
    const color = safeCssValue(b.color, "");
    if (color) bg.style.background = color;
    const posterUrl = resolveAssetUrl(doc, b.poster);
    let video = null;
    if (b.kind === "video") {
      const src = resolveAssetUrl(doc, b.asset);
      if (src) {
        video = document.createElement("video");
        video.muted = true;
        video.defaultMuted = true;
        video.loop = true;
        video.autoplay = true;
        video.playsInline = true;
        video.setAttribute("muted", "");
        video.setAttribute("playsinline", "");
        video.setAttribute("aria-hidden", "true");
        video.preload = "auto";
        video.disablePictureInPicture = true;
        if (posterUrl) video.poster = posterUrl;
        video.src = src;
        // Si el video no carga, queda el póster (o el color) en vez de un hueco.
        video.addEventListener("error", () => {
          video.remove();
          if (posterUrl) bg.appendChild(posterImage(posterUrl));
        });
        bg.appendChild(video);
        const play = video.play?.();
        if (play && typeof play.catch === "function") play.catch(() => {});
      } else if (posterUrl) {
        bg.appendChild(posterImage(posterUrl));
      }
    } else if (b.kind === "image") {
      const src = resolveAssetUrl(doc, b.asset) || posterUrl;
      if (src) bg.appendChild(posterImage(src));
    }
    return { bg, video };
  }

  function posterImage(url) {
    const img = document.createElement("img");
    img.src = url;
    img.alt = "";
    img.draggable = false;
    img.setAttribute("aria-hidden", "true");
    return img;
  }

  function paintDecor(mobile) {
    const { scrim, grid, intro } = state;
    const bgSpec = intro.background || {};
    const sg = scrimGradient(bgSpec.scrim, mobile);
    scrim.style.background = sg.background;
    scrim.style.opacity = String(sg.opacity);
    const gs = gridStyle(bgSpec.grid);
    grid.hidden = !gs;
    if (gs) Object.assign(grid.style, gs);
  }

  function show(doc, hostCtx) {
    dispose();
    lastHostCtx = hostCtx;
    const design = !!hostCtx?.design;
    const intro = doc?.design?.screens?.intro;
    if (!intro || !intro.enabled || !hostCtx?.root) return false;

    const el = document.createElement("div");
    el.className = "tour-rt-intro";
    el.setAttribute("data-ui", ""); // la cámara no recibe los arrastres que ocurren aquí
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-label", "Bienvenida");
    // Nada de lo que pase en la intro debe llegar a la cámara del 360 que hay debajo.
    ["wheel", "pointerdown", "touchstart"].forEach((evt) => el.addEventListener(evt, (e) => e.stopPropagation(), { passive: true }));

    const { bg, video } = buildBackground(doc, intro.background);
    const scrim = document.createElement("div");
    scrim.className = "tour-rt-intro-scrim";
    const grid = document.createElement("div");
    grid.className = "tour-rt-intro-grid";
    const layerEl = document.createElement("div");
    layerEl.className = "tour-rt-intro-layer";
    el.append(bg, scrim, grid, layerEl);
    hostCtx.root.appendChild(el);

    state = { el, bg, scrim, grid, layerEl, video, hostCtx, doc, intro, layer: null, leaveTimer: null, readyTimer: null, mobile: null };
    ready = design;
    el.toggleAttribute("data-ready", ready);

    const layer = createElementLayer({
      host: layerEl,
      getTemplate: hostCtx.getTemplate,
      stagger: true,
      animate: !design,
      onLayout: (info) => {
        if (state && state.mobile !== info.mobile) {
          state.mobile = info.mobile;
          paintDecor(info.mobile);
        }
        hostCtx.onLayout?.(info);
      },
    });
    state.layer = layer;
    paintDecor(false);

    const defs = (Array.isArray(intro.elements) ? intro.elements : []).filter((d) => d && !d.hidden);
    layer.rebuild(defs, uiCtx());

    // Parallax del fondo con el puntero (no en táctil ni con movimiento reducido).
    if (intro.background?.parallax && !reduced() && !design) {
      el.addEventListener("pointermove", (e) => {
        if (e.pointerType === "touch" || state.mobile) return;
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height) return;
        const nx = (e.clientX - r.left) / r.width - 0.5;
        const ny = (e.clientY - r.top) / r.height - 0.5;
        bg.style.transform = `translate(${(-nx * PARALLAX_PX.x).toFixed(1)}px, ${(-ny * PARALLAX_PX.y).toFixed(1)}px) scale(1.03)`;
      });
      el.addEventListener("pointerleave", () => {
        bg.style.transform = "";
      });
    }

    return true;
  }

  function refresh(doc) {
    const intro = doc?.design?.screens?.intro;
    if (!state || state.leaving) return lastHostCtx ? show(doc, lastHostCtx) : false;
    if (!intro || !intro.enabled) {
      dispose();
      return false;
    }
    if (JSON.stringify(intro.background ?? null) !== JSON.stringify(state.intro.background ?? null)) {
      return show(doc, state.hostCtx);
    }
    state.doc = doc;
    state.intro = intro;
    paintDecor(!!state.mobile);
    const defs = (Array.isArray(intro.elements) ? intro.elements : []).filter((d) => d && !d.hidden);
    state.layer.rebuild(defs, uiCtx());
    return true;
  }

  function getBoxes(origin) {
    return state && !state.leaving ? state.layer.getBoxes(origin) : [];
  }

  function setReady(value) {
    ready = !!value;
    if (!state || !state.layer) return;
    if (ready) clearTimeout(state.readyTimer);
    state.el.toggleAttribute("data-ready", ready);
    state.layer.update(uiCtx());
    if (ready && state.intro.autoEnter && !state.hostCtx.design && !state.autoEntered) {
      state.autoEntered = true;
      state.hostCtx.enter();
    }
  }

  function teardown(s) {
    clearTimeout(s.leaveTimer);
    clearTimeout(s.readyTimer);
    s.layer?.dispose();
    if (s.video) {
      s.video.pause?.();
      s.video.removeAttribute("src");
      s.video.load?.();
    }
    s.el.remove();
  }

  function hide() {
    if (!state || state.leaving) return;
    const s = state;
    s.leaving = true;
    s.el.classList.add("is-leaving");
    s.el.setAttribute("aria-hidden", "true");
    const finish = () => {
      if (state === s) state = null;
      teardown(s);
    };
    if (reduced()) finish();
    else s.leaveTimer = setTimeout(finish, LEAVE_MS);
  }

  function dispose() {
    if (!state) return;
    const s = state;
    state = null;
    teardown(s);
  }

  return { show, refresh, setReady, refreshProgress: () => state?.layer?.update(uiCtx()), hide, getBoxes, dispose };
}
