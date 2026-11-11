import { afterEach, expect, it, vi } from "vitest";
import { PerspectiveCamera } from "three";
import { attachCameraControls } from "./cameraControls.js";

afterEach(() => vi.unstubAllGlobals());
function setup() {
  const handlers = {}, keys = {};
  const containerEl = { addEventListener: (type, fn) => { handlers[type] = fn; }, removeEventListener: vi.fn(), setPointerCapture: vi.fn() };
  vi.stubGlobal("window", { addEventListener: (type, fn) => { keys[type] = fn; }, removeEventListener: vi.fn() });
  const onArrowKey = vi.fn();
  const controls = attachCameraControls({ containerEl, camera: new PerspectiveCamera(), onArrowKey });
  return { handlers, keys, controls, onArrowKey };
}
it("la rueda sobre un detalle deja desplazar su contenido sin cambiar el zoom", () => {
  const { handlers, controls } = setup();
  const preventDefault = vi.fn();
  handlers.wheel({ target: { closest: () => ({}) }, deltaY: 300, preventDefault });
  expect(controls.getViewState().fov).toBe(75);
  expect(preventDefault).not.toHaveBeenCalled();
  handlers.wheel({ target: { closest: () => null }, deltaY: 100, preventDefault });
  expect(controls.getViewState().fov).toBe(80);
  expect(preventDefault).toHaveBeenCalledOnce(); controls.dispose();
});

it("right-click cannot rotate or capture the panorama; left dragging still can", () => {
  const { handlers, controls } = setup();
  const event = { pointerId: 1, button: 2, clientX: 100, clientY: 100, target: { closest: () => null } };
  handlers.pointerdown(event); handlers.pointermove({ ...event, clientX: 200 });
  expect(controls.getViewState().lon).toBe(0);
  handlers.pointerdown({ ...event, button: 0 }); handlers.pointermove({ ...event, clientX: 200 });
  expect(controls.getViewState().lon).toBe(10);
  controls.dispose();
});
it("reset restores the scene orientation and default zoom", () => {
  const { handlers, controls } = setup();
  controls.setLonLat(80, 30);
  handlers.wheel({ target: { closest: () => null }, deltaY: 100, preventDefault() {} });
  controls.resetView(25, -10);
  expect(controls.getViewState()).toEqual({ lon: 25, lat: -10, fov: 75 });
  controls.dispose();
});
it("las flechas dentro de la UI no cambian de escena", () => {
  const { keys, controls, onArrowKey } = setup();
  keys.keydown({ key: "ArrowRight", target: { closest: () => ({}) } });
  expect(onArrowKey).not.toHaveBeenCalled();
  keys.keydown({ key: "ArrowRight", target: { closest: () => null } });
  expect(onArrowKey).toHaveBeenCalledWith(1); controls.dispose();
});
