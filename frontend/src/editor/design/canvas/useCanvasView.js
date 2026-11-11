import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { centerPan, clampPan, clampZoom, fitZoom, stepZoom, zoomAround } from "./zoom.js";

// Vista de la mesa de trabajo: zoom y desplazamiento dentro del área (viewport).
//   view   = { zoom, x, y, fitted }  (x, y = esquina de la mesa en px del área)
//   · "Ajustar" (fitted) sigue al área: si C2 abre o cierra el cajón, o cambia el dispositivo,
//     la mesa se vuelve a ajustar sola. Cualquier zoom o desplazamiento manual lo desactiva.
//   · viewRef.current siempre tiene la vista más reciente (para los manejadores de punteros).
export function useCanvasView(viewportRef, { W, H }) {
  const [view, setView] = useState({ zoom: 1, x: 0, y: 0, fitted: true });
  const viewRef = useRef(view);
  const sizeRef = useRef({ w: 0, h: 0 });
  const [size, setSize] = useState({ w: 0, h: 0 });
  const dims = useRef({ W, H });
  dims.current = { W, H };

  const commit = useCallback((next) => {
    viewRef.current = next;
    setView(next);
  }, []);

  const applyFit = useCallback(() => {
    const { w, h } = sizeRef.current;
    const { W: bw, H: bh } = dims.current;
    if (!(w > 0) || !(h > 0)) return;
    const zoom = fitZoom(w, h, bw, bh);
    commit({ zoom, ...centerPan(zoom, w, h, bw, bh), fitted: true });
  }, [commit]);

  // Tamaño del área: se mide al montar y en cada cambio.
  useLayoutEffect(() => {
    const el = viewportRef.current;
    if (!el) return undefined;
    const measure = () => {
      const next = { w: el.clientWidth, h: el.clientHeight };
      if (next.w === sizeRef.current.w && next.h === sizeRef.current.h) return;
      sizeRef.current = next;
      setSize(next);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [viewportRef]);

  // Cambia el tamaño del área → si está ajustada se reajusta; si no, solo se mantiene dentro.
  useLayoutEffect(() => {
    const cur = viewRef.current;
    if (cur.fitted) applyFit();
    else {
      const { w, h } = sizeRef.current;
      const p = clampPan(cur.x, cur.y, cur.zoom, w, h, dims.current.W, dims.current.H);
      if (p.x !== cur.x || p.y !== cur.y) commit({ ...cur, ...p });
    }
  }, [size, applyFit, commit]);

  // Cambia de dispositivo (otra mesa) → siempre se reajusta.
  useLayoutEffect(() => {
    applyFit();
  }, [W, H, applyFit]);

  const api = useMemo(() => {
    const clamp = (zoom, x, y) => {
      const { w, h } = sizeRef.current;
      return clampPan(x, y, zoom, w, h, dims.current.W, dims.current.H);
    };
    const center = () => ({ cx: sizeRef.current.w / 2, cy: sizeRef.current.h / 2 });
    return {
      viewRef,
      fit: applyFit,
      // Zoom a un nivel; (cx, cy) = punto del área que no se mueve (por defecto, el centro).
      zoomTo(zoom, cx, cy) {
        const c = center();
        const z = zoomAround(viewRef.current, clampZoom(zoom), cx ?? c.cx, cy ?? c.cy);
        commit({ zoom: z.zoom, ...clamp(z.zoom, z.x, z.y), fitted: false });
      },
      zoomBy(factor, cx, cy) {
        api.zoomTo(viewRef.current.zoom * factor, cx, cy);
      },
      step(dir) {
        api.zoomTo(stepZoom(viewRef.current.zoom, dir));
      },
      // Desplaza la mesa a (x, y) (px del área), dentro de los límites.
      panTo(x, y) {
        const cur = viewRef.current;
        const p = clamp(cur.zoom, x, y);
        if (p.x === cur.x && p.y === cur.y) return;
        commit({ ...cur, ...p, fitted: false });
      },
      panBy(dx, dy) {
        const cur = viewRef.current;
        api.panTo(cur.x + dx, cur.y + dy);
      },
    };
  }, [applyFit, commit]);

  return { view, size, api };
}
