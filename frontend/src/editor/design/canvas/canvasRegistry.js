// The toolbar and keyboard use the same live geometry as the pointer. Keep this
// transient bridge outside Design so measurements are never saved in a tour.
const canvases = new WeakMap();

export function registerCanvas(store, canvas) {
  canvases.set(store, canvas);
  return () => { if (canvases.get(store) === canvas) canvases.delete(store); };
}

export const canvasFor = store => canvases.get(store);
