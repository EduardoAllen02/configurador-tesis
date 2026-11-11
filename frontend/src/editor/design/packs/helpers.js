// Piezas para armar paquetes de plantillas (cada paquete es un fragmento de diseño válido que
// solo usa plantillas existentes; packs.test.js lo comprueba).
export const frame = (anchor, x, y, w = 0, h = 0) => ({ anchor, x, y, w, h });

export const element = (id, template, props, fr, z, mobile = { mode: "auto" }) => ({
  id,
  template,
  name: null,
  props,
  frame: fr,
  mobile,
  locked: false,
  hidden: false,
  z,
});

// Barras del recorrido, iguales en todos los paquetes (arriba el título y el selector de escenas,
// abajo la barra de cuadros).
export const tourBars = () => [
  element("topbar", "basic-topbar", { subtitle: "", showScenePicker: true }, frame("stretch-top", 0, 0, 0, 56), 10),
  element("scrubber", "frame-scrubber", {}, frame("stretch-bottom", 16, 16, 0, 32), 10),
];
