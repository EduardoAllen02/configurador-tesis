import { detailOf } from "../model/hotspotDetail.js";
import { markerVisualKey, markerContextKey } from "./markerVisualKey.js";
import { hotspotPieceRequest, pieceAtPoint, CARD_HOSTS } from "../model/hotspotCard.js";
import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import { lonLatToVec3 } from "../core/lonLatToVec3.js";
import { getTemplate } from "../templates/index.js";
import { isMobileWidth, mergeProps } from "../templates/hotspots/common.js";
import { createCardPresenter } from "./cardPresenter.js";
import { createDetailState } from "./detailState.js";
import { attachHotspotResize } from "./resizeOverlay.js";
import { resizeHotspot } from "./resizeHotspot.js";

// Marcadores CSS2D reconciliados por id. Mover/guardar uno conserva los nodos de
// todos los demás, y confirmar un gesto adopta la geometría que ya está pintada.
//
//   view/export: clic en un marcador -> onOpen(hotspot)
//   edit:        arrastrar -> onMove(id, {lon, lat}); clic sin arrastre -> onClick(hotspot, rect)
//                (puerto de editor/core/editableHotspotMarkerEl.js: captura de puntero en el
//                marcador + stopPropagation en pointerdown, si no arrastrar un pin también
//                orbitaría la cámara).
const DRAG_THRESHOLD_PX = 4;
const appearanceKey = (hotspot, style, mobile) => markerVisualKey({type:hotspot.type,locked:hotspot.locked},
  {...style,props:{...style?.props,dx:0,dy:0}},mobile, "");

export function createMarkerLayer({ scene, mode, pick, onOpen, onClick, onMove, onStyleMove, onResize, onEditPiece, container, getContext = () => ({}) }) {
  let objects = [];
  const records = new Map();
  let lastEntries = [];
  let mobile = false;
  const visibility = new Map();
  const views = new Map();
  const clickTimers = new Set();
  const draggingIds = new Set();
  const resizers = new Map();
  let selectedId = null;
  let contextDesign, contextAssets, contextKey;
  function visualContext() {
    const context = getContext();
    if (contextKey === undefined || context.doc?.design !== contextDesign || context.doc?.assets !== contextAssets) {
      contextDesign = context.doc?.design; contextAssets = context.doc?.assets;
      contextKey = markerContextKey(context);
    }
    return contextKey;
  }

  // Contenedor < 720 px = móvil: las plantillas suben al mínimo táctil de 36 px. Al cruzar el
  // umbral se rehacen los marcadores (el tamaño depende de ctx.mobile).
  const resizeObserver =
    container && typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(() => {
          const next = isMobileWidth(container.clientWidth);
          if (next === mobile) return;
          mobile = next;
          setEntries(lastEntries);
        })
      : null;
  if (container) {
    mobile = isMobileWidth(container.clientWidth);
    resizeObserver?.observe(container);
  }

  function removeMarker(id) {
    const record = records.get(id);
    if (!record) return;
    views.get(id)?.dispose(); views.delete(id);
    resizers.get(id)?.dispose(); resizers.delete(id);
    draggingIds.delete(id);
    scene.remove(record.obj); records.delete(id);
  }

  function clear() {
    clickTimers.forEach(clearTimeout); clickTimers.clear();
    [...records.keys()].forEach(removeMarker);
    objects = [];
  }

  function buildMarker(hotspot, style, lon, lat) {
    const template = getTemplate(style?.template) || getTemplate("circle-icon");
    const ctx = { ...getContext(), getTemplate, hotspot, mode, mobile };
    // El estilo guardado solo trae lo que cambió: lo demás sale de los defaults de la plantilla.
    const savedProps = mergeProps(template.defaults, style?.props);
    const markerScale = hotspot.content?.detail?.enabled && hotspot.content.detail.placement === "inline" ? 1 : savedProps.markerScale || 1;
    const renderProps = { ...savedProps, size: savedProps.size / markerScale, ...(savedProps.markerWidth ? { markerWidth: savedProps.markerWidth / markerScale } : {}) };
    const content = template.render(renderProps, ctx);
    if (markerScale !== 1) content.style.scale = String(markerScale);
    if (savedProps.markerWidth && markerScale) content.style.width = `${savedProps.markerWidth / markerScale}px`;
    const presentation = createCardPresenter(content, hotspot, savedProps, ctx, visibility.get(hotspot.id));
    views.set(hotspot.id, presentation);

    const wrapper = document.createElement("div");
    wrapper.className = "hs-marker";
    // data-ui: la cámara no captura punteros que nacen aquí. pointer-events: el contenedor del
    // CSS2DRenderer los desactiva (para que el arrastre de órbita llegue al canvas).
    wrapper.setAttribute("data-ui", "");
    wrapper.dataset.hotspotId = hotspot.id;
    wrapper.style.pointerEvents = "auto";
    wrapper.appendChild(content);

    const obj = new CSS2DObject(wrapper);
    obj.position.copy(lonLatToVec3(lon, lat));
    const record = {
      obj, content, appearance: appearanceKey(hotspot,style,mobile), templateId: style?.template, key: markerVisualKey(hotspot, style, mobile, visualContext()),
      refresh(nextHotspot, nextStyle) {
        hotspot = nextHotspot; style = nextStyle;
        Object.assign(ctx, getContext(), { hotspot });
      },
      adopt(patch) {
        record.refresh({ ...hotspot, ...patch }, patch.style ?? style);
        record.appearance = appearanceKey(hotspot,style,mobile);
        record.key = markerVisualKey(hotspot, style, mobile, visualContext());
      },
    };

    if (mode === "edit") {
      // Bloqueado: no se arrastra (el clic sigue abriendo el popover) y lo marca un candado.
      if (hotspot.locked) wrapper.classList.add("hs-marker--locked");
      attachDrag(wrapper, content, () => ({ hotspot, style }), obj, !hotspot.locked, patch => record.adopt(patch));
      if (selectedId === hotspot.id) wrapper.classList.add("hs-marker--selected");
      if (!hotspot.locked) {
        const target = content.querySelector(".hs-co-card") || content;
        let origin, patch;
        const paint = (next) => {
          const props = { ...mergeProps(template.defaults, style?.props) };
          if (target !== content && !(hotspot.content?.detail?.enabled && hotspot.content.detail.placement === "inline")) props.cardWidth = origin.cardWidth;
          if (target === content) props.markerWidth = origin.visualWidth;
          patch = resizeHotspot(hotspot, { template: template.id || style?.template, props }, next.factor, next.corner, target.classList.contains("hs-detail-expanded") ? "detail" : "card");
          if (target !== content) {
            target.style.left = `${origin.dx}px`; target.style.top = `${origin.dy}px`;
            if (patch.content) {
              presentation.update({ ...hotspot, content: patch.content }, patch.style.props, ctx);
            } else {
              target.style.width = `${patch.style.props.cardWidth || 240}px`;
              target.style.scale = String(patch.style.props.cardScale || 1); target.style.transformOrigin = "bottom left";
            }
            target.style.animation = "none";
            const current = target.getBoundingClientRect();
            const left = origin.dx + (next.left - current.left) / origin.scale;
            const top = origin.dy + (next.top - current.top) / origin.scale;
            target.style.left = `${left}px`; target.style.top = `${top}px`;
            patch.style.props.dx = left; patch.style.props.dy = top;
            views.get(hotspot.id)?.setOffset(left, top);
            const line = content.querySelector(".hs-co-line line");
            line?.setAttribute("x2", left); line?.setAttribute("y2", top);
          } else {
            if (patch.content?.card) {
              presentation.update({ ...hotspot, content: patch.content }, patch.style.props, ctx);
            }
            const scale = patch.style.props.markerScale || 1;
            content.style.setProperty("--hs-size", `${(patch.style.props.size || 30) / scale}px`);
            content.style.scale = String(scale);
            content.style.width = `${(patch.style.props.markerWidth || patch.style.props.size || 30) / scale}px`;
          }
        };
        resizers.set(hotspot.id, attachHotspotResize({ wrapper, target,
          start() {
            selectedId = hotspot.id; wrapper.classList.add("hs-marker--selected"); draggingIds.add(hotspot.id);
            origin = { dx: parseFloat(target.style.left) || 0, dy: parseFloat(target.style.top) || 0, cardWidth: target.offsetWidth, visualWidth: target.getBoundingClientRect().width / (wrapper.getBoundingClientRect().width / wrapper.offsetWidth || 1), targetStyle: target.style.cssText, contentStyle: content.style.cssText,
              scale: wrapper.getBoundingClientRect().width / wrapper.offsetWidth || 1 };
          }, preview: paint,
          commit() { draggingIds.delete(hotspot.id); if (patch) { record.adopt(patch); onResize?.(hotspot.id, patch); } },
          cancel() {
            const box = target.getBoundingClientRect(); paint({ factor: 1, corner: true, left: box.left, top: box.top });
            target.style.cssText = origin.targetStyle; content.style.cssText = origin.contentStyle;
            views.get(hotspot.id)?.setOffset(origin.dx, origin.dy); draggingIds.delete(hotspot.id);
          },
        }));
      }
    }
    else {
      wrapper.addEventListener("click", (e) => {
        e.stopPropagation();
        if (presentation.click(e)) { onOpen?.(hotspot); return; }
        onOpen?.(hotspot);
      });
    }
    return record;
  }

  function attachDrag(wrapper, content, readCurrent, obj, draggable, adopt) {
    let dragging = false;
    let moved = false;
    let startX = 0;
    let startY = 0;
    let cardDrag = null;
    let startPosition = null;
    const card = content.querySelector(".hs-co-card");
    const line = content.querySelector(".hs-co-line line");

    wrapper.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      clickTimers.forEach(clearTimeout); clickTimers.clear();
      e.stopPropagation();
      e.preventDefault();
      const { hotspot } = readCurrent();
      selectedId = hotspot.id;
      objects.forEach((object) => object.element.classList.toggle?.("hs-marker--selected", object.element === wrapper));
      dragging = true;
      draggingIds.add(hotspot.id);
      moved = false;
      startX = e.clientX;
      startY = e.clientY;
      startPosition = obj.position.clone();
      cardDrag = card?.contains(e.target) ? {
        dx: parseFloat(card.style.left), dy: parseFloat(card.style.top),
        scale: content.getBoundingClientRect().width / content.offsetWidth || 1,
      } : null;
      wrapper.setPointerCapture(e.pointerId);
    });

    wrapper.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      e.stopPropagation();
      if (!draggable) return;
      if (!moved && Math.hypot(e.clientX - startX, e.clientY - startY) < DRAG_THRESHOLD_PX) return;
      moved = true;
      if (cardDrag) {
        const dx = Math.round(Math.max(-800, Math.min(800, cardDrag.dx + (e.clientX - startX) / cardDrag.scale)));
        const dy = Math.round(Math.max(-800, Math.min(800, cardDrag.dy + (e.clientY - startY) / cardDrag.scale)));
        card.style.animation = "none";
        card.style.left = `${dx}px`;
        card.style.top = `${dy}px`;
        line?.setAttribute("x2", dx);
        line?.setAttribute("y2", dy);
        line?.style.setProperty("--len", Math.hypot(dx, dy));
        return;
      }
      const lonLat = pick(e.clientX, e.clientY);
      if (lonLat) obj.position.copy(lonLatToVec3(lonLat.lon, lonLat.lat));
    });

    function endDrag(e) {
      if (!dragging) return;
      e.stopPropagation();
      dragging = false;
      const { hotspot, style } = readCurrent();
      draggingIds.delete(hotspot.id);
      if (e.type !== "pointerup") {
        if (cardDrag) {
          card.style.left = `${cardDrag.dx}px`;
          card.style.top = `${cardDrag.dy}px`;
          line?.setAttribute("x2", cardDrag.dx);
          line?.setAttribute("y2", cardDrag.dy);
          line?.style.setProperty("--len", Math.hypot(cardDrag.dx, cardDrag.dy));
        } else obj.position.copy(startPosition);
        return;
      }
      if (moved) {
        if (cardDrag) {
          views.get(hotspot.id)?.setOffset(parseFloat(card.style.left), parseFloat(card.style.top));
          const nextStyle = { template: style?.template || "callout", props: { ...(style?.props ?? {}), dx: parseFloat(card.style.left), dy: parseFloat(card.style.top) } };
          adopt({ style: nextStyle });
          onStyleMove?.(hotspot.id, nextStyle);
          return;
        }
        const lonLat = pick(e.clientX, e.clientY);
        if (lonLat) onMove?.(hotspot.id, lonLat);
      } else {
        if (!onEditPiece || !draggable) onClick?.(hotspot, content.getBoundingClientRect());
        else {
          const timer = setTimeout(() => { clickTimers.delete(timer); if (objects.includes(obj)) onClick?.(readCurrent().hotspot, content.getBoundingClientRect()); }, 350);
          clickTimers.add(timer);
        }
      }
    }
    wrapper.addEventListener("pointerup", endDrag);
    wrapper.addEventListener("pointercancel", endDrag);
    wrapper.addEventListener("lostpointercapture", endDrag);
    // El clic nativo posterior al pointerup no debe llegar al contenedor.
    wrapper.addEventListener("click", (e) => e.stopPropagation());
    wrapper.addEventListener("dblclick", (e) => {
      e.stopPropagation(); e.preventDefault();
      if (!draggable || !onEditPiece) return;
      clickTimers.forEach(clearTimeout); clickTimers.clear();
      const { hotspot } = readCurrent();
      const target = pieceAtPoint(content, e.clientX, e.clientY, e.target);
      if (!target.closest?.(CARD_HOSTS)) { onClick?.(hotspot, content.getBoundingClientRect()); return; }
      onEditPiece(hotspot, hotspotPieceRequest(target, wrapper, hotspot), content.getBoundingClientRect());
    });
  }

  // entries: [{ hotspot, style, lon, lat }] ya filtrados por el cuadro actual. La posición va
  // aparte: con keyframes (Oleada 2) cambia en cada cuadro y solo se mueve el objeto, sin
  // rehacer el DOM (si no, los marcadores parpadearían al arrastrar el scrubber).
  function setEntries(entries) {
    for (const id of visibility.keys()) if (!entries.some(({ hotspot }) => hotspot.id === id)) visibility.delete(id);
    lastEntries = entries;
    const visibleIds = new Set(entries.map(({ hotspot }) => hotspot.id));
    [...records.keys()].filter(id => !visibleIds.has(id)).forEach(removeMarker);
    for (const { hotspot, style, lon, lat } of entries) {
      const id = hotspot.id, key = markerVisualKey(hotspot, style, mobile, visualContext());
      let record = records.get(id);
      if (!visibility.has(id)) visibility.set(id, createDetailState());
      visibility.get(id).configure(detailOf(hotspot));
      if (record && record.key !== key && record.appearance === appearanceKey(hotspot,style,mobile) && record.templateId === style?.template && record.obj.element.hasAttribute?.("data-piece-editing")) {
        const ctx = { ...getContext(), getTemplate, hotspot, mode, mobile };
        const props = mergeProps(getTemplate(style?.template)?.defaults || {}, style?.props);
        const updated = views.get(id)?.update(hotspot, props, ctx) === true;
        if (updated) { record.refresh(hotspot, style); record.key = key; }
      }
      if (!record || record.key !== key) {
        const previousElement = record?.obj.element;
        const parent = previousElement?.parentNode, sibling = previousElement?.nextSibling;
        const transform = previousElement?.style.transform;
        removeMarker(id);
        record = buildMarker(hotspot, style, lon ?? hotspot.lon, lat ?? hotspot.lat);
        // Replace only this id within the same DOM turn, already at its last position.
        if (parent) {
          record.obj.element.style.transform = transform;
          parent.insertBefore(record.obj.element, sibling);
        }
        records.set(id, record); scene.add(record.obj);
      } else record.refresh(hotspot, style);
      if (!draggingIds.has(id)) record.obj.position.copy(lonLatToVec3(lon ?? hotspot.lon, lat ?? hotspot.lat));
    }
    objects = entries.map(({ hotspot }) => records.get(hotspot.id).obj);
  }

  function dispose() {
    resizeObserver?.disconnect();
    clear();
  }

  return { setEntries, dispose, setMode(next) { if (mode === next) return; mode = next; for (const state of visibility.values()) state.resetVisitor(); clear(); setEntries(lastEntries); }, select(id) {
    selectedId = id;
    objects.forEach((object, index) => object.element.classList.toggle?.("hs-marker--selected", lastEntries[index]?.hotspot.id === id));
  }, constrainDetails() {
    const rect = container?.getBoundingClientRect();
    objects.forEach((obj, index) => {
      if (obj.element.style.display === "none") return;
      // Layout can finish during a gesture; only viewport clamping should wait.
      if (rect && !draggingIds.has(lastEntries[index]?.hotspot.id)) views.get(lastEntries[index]?.hotspot.id)?.constrain?.(rect);
      resizers.get(lastEntries[index]?.hotspot.id)?.sync();
    });
  }, previewDetail(id, show) {
    if (!visibility.has(id)) visibility.set(id, createDetailState());
    visibility.get(id).preview(show);
    views.get(id)?.paint();
  } };
}
