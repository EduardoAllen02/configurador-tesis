// Posicionamiento mínimo de un elemento de pantalla según su `frame` (anclaje tipo Unity).
// Oleada 1: solo los anclajes que usa el diseño por defecto + esquinas/centro; el motor de
// layout completo (escalado, móvil) llega en la Oleada 3.
//   stretch-*: ancho = 100% menos el margen x a cada lado (w se ignora), alto fijo h.
//   resto: caja de w×h pegada a la esquina/centro con margen x,y.
const px = (n) => `${n || 0}px`;

export function frameToStyle(frame) {
  const { anchor = "top-left", x = 0, y = 0, w = 0, h = 0 } = frame || {};
  switch (anchor) {
    case "stretch-top":
      return { left: px(x), right: px(x), top: px(y), height: px(h) };
    case "stretch-bottom":
      return { left: px(x), right: px(x), bottom: px(y), height: px(h) };
    case "stretch-fill":
      return { left: px(x), right: px(x), top: px(y), bottom: px(y) };
    case "top-right":
      return { right: px(x), top: px(y), width: px(w), height: px(h) };
    case "bottom-left":
      return { left: px(x), bottom: px(y), width: px(w), height: px(h) };
    case "bottom-right":
      return { right: px(x), bottom: px(y), width: px(w), height: px(h) };
    case "center":
      return { left: "50%", top: "50%", width: px(w), height: px(h), transform: `translate(calc(-50% + ${px(x)}), calc(-50% + ${px(y)}))` };
    case "top-left":
    default:
      return { left: px(x), top: px(y), width: px(w), height: px(h) };
  }
}
