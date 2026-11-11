import { h } from "../dom.js";
import { animationDefault, animationSlot, applyFinish, finishDefaults, finishSlots, listOf, setVar } from "./common.js";
import { ICON_NAMES, createIcon } from "./icons.js";

// Lista de características: etiqueta opcional + filas de icono y texto.
//   props: { heading, items: [{ icon, text }], iconColor, color, animation }
const refsOf = new WeakMap(); // root -> { heading, list, signature }

export const featureList = {
  id: "feature-list",
  kind: "element",
  name: "Lista de características",
  category: "Tarjetas",
  mobile: "stack",
  fit: "content",
  interactive: false,
  defaults: {
    ...finishDefaults,
    heading: "Lo que vas a ver",
    items: [
      { icon: "layers", text: "Todos los pisos, uno por uno" },
      { icon: "map-pin", text: "Puntos de interés en cada sala" },
      { icon: "eye", text: "Vista de 360° con zoom" },
    ],
    iconColor: "",
    color: "",
    animation: animationDefault,
  },
  slots: [
    { key: "heading", type: "text", label: "Etiqueta", inline: true, toolbar: true },
    {
      key: "items",
      type: "list",
      label: "Características",
      of: [
        { key: "icon", type: "icon", label: "Icono", options: ["", ...ICON_NAMES] },
        { key: "text", type: "text", label: "Texto" },
      ],
    },
    { key: "iconColor", type: "color", label: "Color de iconos", toolbar: true },
    { key: "color", type: "color", label: "Color del texto", toolbar: true },
    ...finishSlots,
    animationSlot,
  ],

  render(props) {
    const heading = h("p", { className: "tour-rt-text tour-rt-text--kicker", "data-slot": "heading" }); // [C1]
    const list = h("ul", { className: "tour-rt-features" });
    const root = h("div", { className: "tour-rt-featurelist" }, [heading, list]);
    refsOf.set(root, { heading, list, signature: null });
    featureList.update(root, props);
    return root;
  },

  update(root, props) {
    applyFinish(root, props, { bare: true });
    const refs = refsOf.get(root);
    refs.heading.textContent = typeof props.heading === "string" ? props.heading : "";
    refs.heading.hidden = !refs.heading.textContent;
    const items = listOf(props.items, 10);
    const signature = JSON.stringify(items);
    if (signature !== refs.signature) {
      refs.signature = signature;
      refs.list.replaceChildren(
        ...items.map((item) => {
          const icon = h("span", { className: "tour-rt-features-icon" }, item.icon ? createIcon(item.icon, { size: 16 }) : null);
          const text = h("span", { className: "tour-rt-features-text", text: typeof item.text === "string" ? item.text : "" });
          return h("li", {}, [icon, text]);
        })
      );
    }
    setVar(root, "--tour-feat-icon", props.iconColor);
    setVar(root, "--tour-feat-text", props.color);
  },
};
