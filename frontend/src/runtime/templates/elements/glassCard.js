import { resolveThemeProps } from "../../theme/index.js";
import { h } from "../dom.js";
import { animationDefault, animationSlot, applyStyle, applyFinish, finishDefaults, finishSlots, listOf, px } from "./common.js";
import { mergeProps } from "../../layout/util.js";

// Tarjeta de cristal: contenedor con etiqueta, título y texto, y una lista de piezas dentro
// (`children`: cualquier otra plantilla de elemento, apiladas en vertical; p. ej. la lista de
// características y el contador rotativo de Colombini). Una tarjeta no contiene otra tarjeta.
//   props: { kicker, title, body, children: [{ template, props }], padding, gap, fill, borderColor,
//            blur, radius, animation }
const refsOf = new WeakMap(); // root -> { head, kicker, title, body, box, children[], signature, ctx }

export const glassCard = {
  id: "glass-card",
  kind: "element",
  name: "Tarjeta de cristal",
  category: "Tarjetas",
  mobile: "stack",
  fit: "content",
  defaults: {
    kicker: "",
    color: "", secondaryColor: "", font: "", headingFont: "",
    title: "Título de la tarjeta",
    body: "",
    children: [],
    padding: 22,
    gap: 18,
    fill: "",
    borderColor: "",
    ...finishDefaults,
    animation: animationDefault,
  },
  slots: [
    { key: "kicker", type: "text", label: "Etiqueta", inline: true },
    { key: "title", type: "text", label: "Título", inline: true, toolbar: true },
    { key: "body", type: "text", label: "Texto", inline: true },
    { key: "fill", type: "color", label: "Fondo", toolbar: true },
    ...finishSlots,
    { key: "padding", type: "range", label: "Margen interior", min: 0, max: 60, step: 1 },
    {
      key: "children",
      type: "list",
      label: "Contenido",
      of: [
        { key: "template", type: "select", label: "Pieza" },
        { key: "props", type: "text", label: "Propiedades" },
      ],
    },
    animationSlot,
  ],

  render(props, ctx) {
    const kicker = h("p", { className: "tour-rt-text tour-rt-text--kicker", "data-slot": "kicker" }); // [C1]
    const title = h("h3", { className: "tour-rt-gcard-title", "data-slot": "title" }); // [C1]
    const body = h("p", { className: "tour-rt-gcard-body", "data-slot": "body" }); // [C1]
    const box = h("div", { className: "tour-rt-gcard-children" });
    const root = h("div", { className: "tour-rt-glass tour-rt-gcard" }, [kicker, title, body, box]);
    refsOf.set(root, { kicker, title, body, box, children: [], signature: null, ctx });
    glassCard.update(root, props, ctx);
    return root;
  },

  update(root, props, ctx) {
    props = resolveThemeProps("glass-card", props, ctx?.doc?.design?.theme);
    const refs = refsOf.get(root);
    if (!refs) return;
    refs.ctx = ctx;
    const setText = (el, value) => {
      el.textContent = typeof value === "string" ? value : "";
      el.hidden = !el.textContent;
    };
    setText(refs.kicker, props.kicker);
    setText(refs.title, props.title);
    setText(refs.body, props.body);
    applyStyle(root, { padding: px(props.padding, 22, 0, 120) });
    applyFinish(root, props);
    refs.box.style.gap = px(props.gap, 18, 0, 80);

    const defs = listOf(props.children).filter((c) => c.template && c.template !== "glass-card");
    const signature = JSON.stringify(defs);
    const getTemplate = ctx?.getTemplate;
    if (signature !== refs.signature && getTemplate) {
      refs.signature = signature;
      refs.children.forEach(({ template, el }) => template.dispose?.(el));
      refs.children = [];
      const nodes = [];
      defs.forEach((def) => {
        const template = getTemplate(def.template);
        if (!template || template.kind !== "element") return;
        const el = template.render(mergeProps(template, def.props), ctx);
        refs.children.push({ template, el, def });
        nodes.push(el);
      });
      refs.box.replaceChildren(...nodes);
    }
    refs.children.forEach(({ template, el, def }) => template.update(el, mergeProps(template, def.props), ctx));
    refs.box.hidden = refs.children.length === 0;
  },

  dispose(root) {
    refsOf.get(root)?.children.forEach(({ template, el }) => template.dispose?.(el));
  },
};
