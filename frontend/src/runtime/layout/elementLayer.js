import { visibleInScene } from "../model/interfaceModel.js";
import { groupDeviceProps } from "../model/groupDevice.js";
import "./layout.css";
import {
  MOBILE_H,
  MOBILE_MARGIN,
  MOBILE_W,
  computeScale,
  isMobileWidth,
  isStretch,
  layoutAll,
} from "./engine.js";
import { entranceFor, mergeProps } from "./util.js";

// Capa de elementos de pantalla: construye el DOM de una lista de definiciones
// ({ id, template, props, frame, mobile, z }) con las plantillas registradas y las coloca con el
// motor de layout (anclas, escala --s, apilado móvil). La usan el HUD del recorrido y la
// pantalla de inicio; el tamaño que importa es el del CONTENEDOR (`host`), no el de la ventana,
// y se re-evalúa en cada resize.
//
//   rebuild(defs, ctx)  rehace el DOM solo si cambió la ESTRUCTURA (ids, plantillas, orden); si solo
//                       cambiaron props o frames, actualiza en su lugar y recoloca (así el editor
//                       puede arrastrar sin rehacer nada ni repetir animaciones); luego update(ctx)
//   update(ctx)         refresca contenido y visibilidad (cambio de cuadro, listo, idioma…)
//   relayout()          vuelve a colocar todo (resize, cambios de visibilidad)
//   getTopInset()       px que ocupan las barras pegadas arriba
//   getBoxes(origin?)   [{ id, left, top, width, height }] rect visual de cada elemento visible, en px
//                       del contenedor relativos a `origin` (por defecto el host), sin zoom CSS de ancestros (lo usa el editor para dibujar la selección)
//   dispose()
// Opciones: `animate: false` apaga las animaciones de entrada (modo diseño del editor).
const reducedMotion = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

const needsW = (frame) => !(frame.w > 0) && !["stretch-top", "stretch-bottom", "stretch-fill"].includes(frame.anchor);
const needsH = (frame) => !(frame.h > 0) && !["stretch-left", "stretch-right", "stretch-fill"].includes(frame.anchor);

export function createElementLayer({ host, getTemplate, stagger = false, animate = true, onLayout }) {
  const items = []; // { def, template, wrapper, anim, content, visible, propsKey }
  let signature = null; // estructura: ids + plantillas + orden
  let lastCtx = { getTemplate };
  let topInset = 0;
  let layoutScale = 1;
  let visibleSignature = "";
  let destroyed = false;

  const baseCtx = (ctx) => ({ ...ctx, getTemplate });
  const propsOf = (template, def) => ({ ...mergeProps(template, def.props), ...(def.template === "group" ? { children: def.children ?? [], width: def.frame?.w, height: def.frame?.h,
    ...groupDeviceProps(def, isMobileWidth(host.clientWidth)) } : {}) });
  const ctxOf = (def) => ({ ...lastCtx, mobile: isMobileWidth(host.clientWidth), elementId: def.id, elementPath: def.id, groupDepth: 0 });

  function behaviorOf(item) {
    const m = item.def.mobile || {};
    if (m.mode === "hidden") return "hide";
    return m.behavior || item.template.mobile || "stack";
  }

  function computeVisible() {
    return items.map((item) => {
      try {
        item.visible = visibleInScene(item.def,lastCtx?.state?.sceneId) && (item.template.isVisible ? !!item.template.isVisible(lastCtx) : true);
      } catch {
        item.visible = true;
      }
      return item.visible;
    });
  }

  // Tamaño natural (sin escalar) de un wrapper, con ancho opcional fijo.
  function measure(item, boxWidth) {
    const st = item.wrapper.style;
    st.display = "";
    st.left = "0px";
    st.top = "0px";
    st.width = boxWidth > 0 ? `${boxWidth}px` : "max-content";
    st.height = "auto";
    st.transform = "none";
    // offsetWidth redondea hacia abajo: un texto de 118.2 px en una caja de 118 se parte en dos
    // líneas. Se mide con fracciones (sin el zoom CSS de ancestros, p. ej. la mesa del editor) y
    // se redondea hacia arriba.
    const r = item.wrapper.getBoundingClientRect();
    const k = host.offsetWidth ? host.getBoundingClientRect().width / host.offsetWidth || 1 : 1;
    return { w: Math.ceil(r.width / k - 0.01), h: Math.ceil(r.height / k - 0.01) };
  }

  function apply(item, res) {
    const st = item.wrapper.style;
    const b = res.box;
    st.display = "";
    st.left = `${round(b.left)}px`;
    st.top = `${round(b.top)}px`;
    st.width = `${round(b.width)}px`;
    st.height = `${round(b.height)}px`;
    st.transformOrigin = `${res.origin.x * 100}% ${res.origin.y * 100}%`;
    st.transform = res.scale === 1 ? "none" : `scale(${round(res.scale, 4)})`;
  }

  function relayout() {
    if (destroyed) return;
    const W = host.clientWidth;
    const H = host.clientHeight;
    if (!W || !H) return;
    const container = { W, H };
    const mobile = isMobileWidth(W);
    // Antes de medir: el CSS solo móvil (título más chico…) cambia los tamaños naturales.
    host.toggleAttribute("data-tour-mobile", mobile);
    const vis = computeVisible();

    const layoutItems = [];
    items.forEach((item, i) => {
      const behavior = behaviorOf(item);
      if (!vis[i] || (mobile && behavior === "hide") || item.def.hidden) {
        item.wrapper.style.display = "none";
        return;
      }
      const frame = item.def.frame || {};
      const m = item.def.mobile || {};
      const custom = mobile && m.mode === "custom" && m.frame;
      const entry = {
        id: item.def.id ?? String(i),
        frame,
        mode: custom ? "custom" : "auto",
        mobileFrame: custom ? m.frame : undefined,
        behavior,
        scaleGroup: item.def.template === "group",
        item,
      };
      layoutItems.push(entry);
    });

    // Tamaños naturales: elementos con w/h en 0 ("auto") y, en móvil, los que se ajustan al
    // contenido (su alto depende del ancho disponible).
    const s0 = mobile ? computeScale(W, H, { w: MOBILE_W, h: MOBILE_H }) : computeScale(W, H);
    layoutItems.forEach((entry) => {
      const frame = entry.mode === "custom" ? entry.mobileFrame : entry.frame;
      const stacked =
        mobile && entry.mode === "auto" && !isStretch(entry.frame.anchor) && entry.behavior !== "keep";
      if (entry.item.def.template === "group") {
        // Re-evaluate the device override on resize as well as document updates.
        // It affects render props only; desktop frames and child geometry stay authored.
        entry.item.template.update(entry.item.content, propsOf(entry.item.template, entry.item.def), ctxOf(entry.item.def));
        const natural = measure(entry.item, frame.w || groupDeviceProps(entry.item.def, mobile).contentWidth || entry.item.def.props?.contentWidth || 360);
        entry.w = natural.w; entry.h = Math.max(natural.h, frame.h || 0);
      } else if (stacked && (entry.item.template.fit === "content" || !(entry.frame.h > 0))) {
        const avail = W - 2 * MOBILE_MARGIN;
        const want = entry.frame.w > 0 ? entry.frame.w * s0 : avail;
        entry.h = measure(entry.item, Math.min(want, avail) / s0).h;
      } else if (needsW(frame) || needsH(frame)) {
        const natural = measure(entry.item, frame.w > 0 ? frame.w : 0);
        entry.w = natural.w;
        entry.h = needsH(frame) ? natural.h : undefined;
      }
    });

    const result = layoutAll(layoutItems, container);
    layoutScale = result.scale;
    layoutItems.forEach((entry) => {
      const res = result.items.get(entry.id);
      if (res) apply(entry.item, res);
    });
    topInset = result.topInset;
    host.style.setProperty("--s", String(round(result.scale, 4)));
    host.style.setProperty("--tour-rt-top", `${round(topInset + 16)}px`);
    visibleSignature = vis.join("");
    onLayout?.({ W, H, mobile, scale: result.scale, topInset });
  }

  function playEntrance(item, index) {
    if (!animate) return;
    const entrance = entranceFor(item.def.props, item.template, { stagger, index, reduced: reducedMotion() });
    if (!entrance) return;
    const cls = `tour-rt-anim--${entrance.kind}`;
    item.anim.style.setProperty("--tour-anim-delay", `${entrance.delayMs}ms`);
    item.anim.classList.add(cls);
    const done = () => item.anim.classList.remove(cls);
    item.anim.addEventListener("animationend", done, { once: true });
    item.anim.addEventListener("animationcancel", done, { once: true });
  }

  function clearItems() {
    items.forEach((item) => {
      try {
        resizeObserver?.unobserve(item.content);
        item.template.dispose?.(item.content);
      } catch {
        /* una plantilla que falla al limpiar no debe romper el tour */
      }
      item.wrapper.remove();
    });
    items.length = 0;
  }

  const sortByZ = (defs) => [...defs].sort((a, b) => (a.z ?? 0) - (b.z ?? 0));
  const structureOf = (sorted) => JSON.stringify(sorted.map((d) => [d.id ?? "", d.template, d.z ?? 0]));

  function rebuild(defs, ctx) {
    const sorted = sortByZ(defs).filter((def) => getTemplate(def.template)); // plantilla desconocida: se omite
    const next = structureOf(sorted);
    lastCtx = baseCtx(ctx);
    if (next !== signature) {
      signature = next;
      clearItems();
      sorted.forEach((def, index) => {
        const template = getTemplate(def.template);
        const props = propsOf(template, def);
        const wrapper = document.createElement("div");
        wrapper.className = "tour-rt-el" + (template.interactive === false ? " tour-rt-el--through" : "");
        if (template.interactive !== false) wrapper.setAttribute("data-ui", "");
        wrapper.dataset.elId = def.id ?? "";
        wrapper.dataset.elPath = def.id ?? "";
        wrapper.dataset.template = def.template;
        wrapper.style.zIndex = String(def.z ?? 0);
        const anim = document.createElement("div");
        anim.className = "tour-rt-el-anim";
        const content = template.render(props, ctxOf(def));
        anim.appendChild(content);
        wrapper.appendChild(anim);
        host.appendChild(wrapper);
        if (def.template === "group") resizeObserver?.observe(content);
        const item = { def, template, wrapper, anim, content, visible: true, propsKey: JSON.stringify(def.props ?? null) };
        items.push(item);
        playEntrance(item, index);
      });
      update(ctx);
      return;
    }
    // Misma estructura: se actualizan props y frames en su lugar.
    sorted.forEach((def, i) => {
      const item = items[i];
      item.def = def;
      item.propsKey = JSON.stringify(def.props ?? null);
    });
    update(ctx);
    relayout();
  }

  function getBoxes(origin = host) {
    const hostRect = origin.getBoundingClientRect();
    // Si un ancestro está escalado con CSS (la mesa de trabajo del editor), los rects de pantalla
    // vienen multiplicados: se devuelven en px del contenedor, sin ese zoom.
    const k = origin.offsetWidth ? hostRect.width / origin.offsetWidth : 1;
    const boxes = [];
    const append = (wrapper, def, parentId = null, path = def.id) => {
      if (wrapper.style.display === "none" || !wrapper.isConnected) return;
      const r = wrapper.getBoundingClientRect();
      const reference = def.template === "group" ? groupDeviceProps(def, isMobileWidth(host.clientWidth)).contentWidth || def.props?.contentWidth || def.frame?.w : def.frame?.w;
      const parent = boxes.find((box) => box.id === parentId);
      const scale = reference > 0 ? r.width / k / reference : parent?.scale ?? layoutScale;
      const text = wrapper.querySelector(".tour-rt-text");
      const inner = def.template === "group" ? wrapper.querySelector(":scope > .tour-rt-el-anim > .tour-rt-group > .tour-rt-group-inner, :scope > .tour-rt-group > .tour-rt-group-inner")?.getBoundingClientRect() : null;
      boxes.push({ id: def.id ?? "", parentId, path, template: def.template, scale, fontSize: text ? parseFloat(getComputedStyle(text).fontSize) / layoutScale : undefined,
        ...(inner ? { contentLeft: round((inner.left-hostRect.left)/k), contentTop: round((inner.top-hostRect.top)/k) } : {}),
        left: round((r.left-hostRect.left)/k), top: round((r.top-hostRect.top)/k), width: round(r.width/k), height: round(r.height/k) });
      if (def.template === "group") {
        const nodes = wrapper.querySelectorAll("[data-el-id]");
        (def.children ?? []).forEach((child) => {
          const node = [...nodes].find((candidate) => candidate.dataset.elId === child.id);
          if (node) append(node, child, def.id, `${path}/${child.id}`);
        });
      }
    };
    items.forEach((item) => append(item.wrapper,item.def));
    return boxes;
  }

  function update(ctx) {
    lastCtx = baseCtx(ctx);
    let changed = false;
    const before = visibleSignature;
    const vis = computeVisible();
    items.forEach((item, i) => {
      if (!vis[i]) return;
      // Una plantilla puede devolver un nodo nuevo desde update (p. ej. el botón que pasa a enlace).
      const next = item.template.update(item.content, propsOf(item.template, item.def), ctxOf(item.def));
      if (next && typeof next === "object" && next.nodeType === 1 && next !== item.content) {
        resizeObserver?.unobserve(item.content);
        item.anim.replaceChild(next, item.content);
        if (item.def.template === "group") resizeObserver?.observe(next);
        item.content = next;
      }
    });
    if (vis.join("") !== before) changed = true;
    // Primera pasada o cambio de visibilidad: recoloca (la pila móvil depende de quién se ve).
    if (changed || !visibleSignature) relayout();
  }

  const resizeObserver = typeof ResizeObserver === "function" ? new ResizeObserver(() => relayout()) : null;
  resizeObserver?.observe(host);
  // Cuando llegan las fuentes cambian las métricas del texto: se vuelve a medir.
  if (typeof document !== "undefined" && document.fonts?.ready) document.fonts.ready.then(() => relayout());
  if (typeof document !== "undefined" && document.fonts?.addEventListener) {
    document.fonts.addEventListener("loadingdone", relayout);
  }

  function dispose() {
    destroyed = true;
    resizeObserver?.disconnect();
    if (typeof document !== "undefined") document.fonts?.removeEventListener?.("loadingdone", relayout);
    clearItems();
    signature = null;
  }

  return {
    rebuild,
    update,
    relayout,
    getTopInset: () => topInset,
    getScale: () => layoutScale,
    getBoxes,
    items,
    dispose,
  };
}

function round(n, digits = 2) {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}
