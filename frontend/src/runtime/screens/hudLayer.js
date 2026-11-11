import { createElementLayer } from "../layout/elementLayer.js";

// Capa de elementos del recorrido (design.screens.tour.elements): topbar, scrubber y todo lo
// que se agregue desde el editor de diseño. Usa el motor de layout (anclaje tipo Unity, escala
// --s por el tamaño del contenedor y reglas móviles; docs/CONTRATO_OLEADA2.md §5). Dueño: B3.
//
//   rebuild(defs, ctx) → rehace el DOM solo si cambiaron las definiciones; luego update(ctx).
//   update(ctx)        → refresca contenido/visibilidad (cambio de cuadro, escena, idioma…).
//   getTopInset()      → px que ocupan las barras pegadas arriba (el panel de detalle se pone debajo).
//   getBoxes()         → rects de los elementos (para la selección del editor).
//   dispose()
export function createHudLayer({ uiLayer, getTemplate, animate = true, onLayout }) {
  const layer = createElementLayer({ host: uiLayer, getTemplate, animate, onLayout });
  return {
    rebuild: layer.rebuild,
    update: layer.update,
    getTopInset: layer.getTopInset,
    getBoxes: layer.getBoxes,
    dispose: layer.dispose,
  };
}
