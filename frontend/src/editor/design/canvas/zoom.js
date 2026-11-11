// Zoom y desplazamiento de la mesa de trabajo (matemática pura, sin DOM; probada en zoom.test.js).
//
//   view = { zoom, x, y }   x,y = esquina superior izquierda de la mesa en px del área (viewport)
//   La mesa mide W×H px de diseño, así que en pantalla mide W·zoom × H·zoom.
export const ZOOM_MIN = 0.1;
export const ZOOM_MAX = 5;
export const ZOOM_PRESETS = [0.25, 0.5, 0.75, 1, 1.25];
const STEPS = [0.1, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4, 5];
export const FIT_PAD = 48;
export const PAN_MARGIN = 48;

export const clampZoom = (z) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Number.isFinite(z) ? z : 1));

// Slider logarítmico (como el de Canva): el valor es ln(zoom), de ln(0.1) a ln(5).
export const SLIDER_MIN = Math.log(ZOOM_MIN);
export const SLIDER_MAX = Math.log(ZOOM_MAX);
export const zoomToSlider = (zoom) => Math.log(clampZoom(zoom));
export const sliderToZoom = (value) => clampZoom(Math.exp(value));

// Zoom con el que la mesa cabe entera en el área (sin pasar de 100 %: la vista previa es 1:1 como máximo).
export function fitZoom(vw, vh, W, H, pad = FIT_PAD) {
  if (!(vw > 0) || !(vh > 0)) return 1;
  return clampZoom(Math.min((vw - pad) / W, (vh - pad) / H, 1));
}

// Posición que deja la mesa centrada en el área.
export function centerPan(zoom, vw, vh, W, H) {
  return { x: (vw - W * zoom) / 2, y: (vh - H * zoom) / 2 };
}

function clampAxis(pos, size, viewSize, margin) {
  if (size + 2 * margin <= viewSize) return (viewSize - size) / 2; // cabe: centrada, no se desplaza
  return Math.min(margin, Math.max(viewSize - size - margin, pos));
}

// Limita el desplazamiento: si la mesa cabe en un eje se centra; si no, no deja que se aleje
// más de `margin` px del borde del área.
export function clampPan(x, y, zoom, vw, vh, W, H, margin = PAN_MARGIN) {
  return { x: clampAxis(x, W * zoom, vw, margin), y: clampAxis(y, H * zoom, vh, margin) };
}

// Cambia el zoom dejando fijo el punto de la mesa que está bajo (cx, cy) (coordenadas del área).
export function zoomAround(view, nextZoom, cx, cy) {
  const zoom = clampZoom(nextZoom);
  const px = (cx - view.x) / view.zoom; // punto de diseño bajo el cursor
  const py = (cy - view.y) / view.zoom;
  return { zoom, x: cx - px * zoom, y: cy - py * zoom };
}

// Siguiente nivel al acercar (dir > 0) o alejar (dir < 0).
export function stepZoom(zoom, dir) {
  if (dir > 0) return STEPS.find((s) => s > zoom * 1.001) ?? ZOOM_MAX;
  return [...STEPS].reverse().find((s) => s < zoom / 1.001) ?? ZOOM_MIN;
}

// Factor de zoom de un evento de rueda (Ctrl+rueda o pellizco).
export const wheelFactor = (deltaY) => Math.exp(-Math.max(-200, Math.min(200, deltaY)) * 0.0022);
