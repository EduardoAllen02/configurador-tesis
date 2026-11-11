// Medidas de los elementos que ya están pintados en la mesa de trabajo. El panel Posición las
// necesita para "Fijar a…", alinear y mostrar X/Y/Ancho/Alto: el tamaño de un elemento con
// w/h automáticos solo se conoce midiendo el DOM del motor (cada elemento es
// `.tour-rt-el[data-el-id]` dentro de la capa de su pantalla).
//
// Devuelve, en px de DISEÑO del contenedor del motor (sin el zoom CSS de la mesa):
//   { rect: { left, top, width, height }, container: { W, H }, s, natural: { w, h } }
// `natural` es el tamaño sin escalar (rect / s) que reanchor() llama `measured`.
function wrapperOf(id) {
  if (typeof document === "undefined" || !id) return null;
  return [...document.querySelectorAll(".studio :is(.tour-rt-el, .tour-rt-group-child)[data-el-id], .content-studio :is(.tour-rt-el, .tour-rt-group-child)[data-el-id], [data-piece-editing] [data-el-id]")].find((n) => n.dataset.elId === id && n.style.display !== "none" && n.isConnected) ?? null;
}

// Capa que contiene a un elemento (el motor la recoloca y reescribe el `style` de sus hijos).
export function measureHost(id) {
  return wrapperOf(id)?.parentElement ?? null;
}

export function measureElement(id) {
  const wrapper = wrapperOf(id);
  if (!wrapper) return null;
  const host = wrapper.parentElement;
  if (!host || !host.offsetWidth || !host.offsetHeight) return null;
  const hostRect = host.getBoundingClientRect();
  const k = hostRect.width / host.offsetWidth || 1; // zoom CSS de la mesa
  const r = wrapper.getBoundingClientRect();
  const nested = !!wrapper.parentElement?.closest("[data-el-id]");
  const s = nested ? 1 : parseFloat(getComputedStyle(host).getPropertyValue("--s")) || 1;
  const rect = {
    left: (r.left - hostRect.left) / k,
    top: (r.top - hostRect.top) / k,
    width: r.width / k,
    height: r.height / k,
  };
  return { rect, container: { W: host.offsetWidth, H: host.offsetHeight }, s, natural: { w: rect.width / s, h: rect.height / s } };
}
