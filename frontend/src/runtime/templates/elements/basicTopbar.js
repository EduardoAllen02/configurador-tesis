import { h } from "../dom.js";

// Barra superior básica: título del tour + subtítulo, selector de escenas y contador "n / N".
// El selector lista las panorámicas y UNA entrada por lote de video (nunca etiquetas en blanco).
//   props: { subtitle, showScenePicker }
//   ctx:   { doc, state, entries, goToScene(sceneId) }
const refsOf = new WeakMap(); // root -> { ctx, title, subtitle, select, counter, signature }

export const basicTopbar = {
  id: "basic-topbar",
  kind: "element",
  name: "Barra superior",
  category: "Barras",
  mobile: "keep", // barra estirada: en móvil se queda fija arriba
  defaults: { title: "", subtitle: "", showScenePicker: true },
  slots: [
    { key: "title", type: "text", label: "Título", inline: true, toolbar: true },
    { key: "subtitle", type: "text", label: "Subtítulo", inline: true, toolbar: true },
    { key: "showScenePicker", type: "toggle", label: "Selector de escenas", toolbar: true },
  ],

  render(props, ctx) {
    const title = h("strong", { className: "tour-rt-topbar-title", "data-slot": "title" });
    const subtitle = h("span", { className: "tour-rt-topbar-subtitle", "data-slot": "subtitle" }); // [C1]
    const select = h("select", { className: "tour-rt-topbar-select", "aria-label": "Escena" });
    const counter = h("span", { className: "tour-rt-topbar-counter" });
    const root = h("div", { className: "tour-rt-topbar", "data-ui": "" }, [
      h("div", { className: "tour-rt-topbar-heading" }, [title, subtitle]),
      h("div", { className: "tour-rt-topbar-controls" }, [select, counter]),
    ]);
    const refs = { ctx, title, subtitle, select, counter, signature: null };
    refsOf.set(root, refs);
    select.addEventListener("change", () => refs.ctx.goToScene(select.value));
    basicTopbar.update(root, props, ctx);
    return root;
  },

  update(root, props = {}, ctx) {
    const refs = refsOf.get(root);
    refs.ctx = ctx;
    refs.title.textContent = props.title || ctx.doc.tour?.title || "";
    refs.subtitle.textContent = props.subtitle || "";
    refs.subtitle.hidden = !props.subtitle;

    const showPicker = props.showScenePicker !== false && ctx.entries.length > 0;
    refs.select.hidden = !showPicker;
    const signature = ctx.entries.map((e) => `${e.sceneId}|${e.label}`).join("\n");
    if (signature !== refs.signature) {
      refs.signature = signature;
      refs.select.replaceChildren(
        ...ctx.entries.map((entry) => h("option", { value: entry.sceneId, text: entry.label }))
      );
    }
    const current = ctx.entries.findIndex((entry) => entry.key === ctx.state.batchKey);
    if (current >= 0) refs.select.value = ctx.entries[current].sceneId;

    // Dentro de un lote cuenta cuadros; en panorámicas sueltas, la posición en el selector.
    const { frameIndex, frameCount } = ctx.state;
    refs.counter.textContent =
      frameCount > 1 ? `${frameIndex + 1} / ${frameCount}` : `${Math.max(current, 0) + 1} / ${ctx.entries.length}`;
  },
};
