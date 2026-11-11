import { h } from "../dom.js";
import { animationDefault, animationSlot, applyFinish, finishDefaults, finishSlots, listOf, setVar } from "./common.js";

// Fila de cifras: "5 PISOS · 12 SALAS · 2 IDIOMAS". Los valores son texto libre (o números); la
// conexión automática a los datos del tour llega en la Oleada 4.
//   props: { items: [{ value, label }], valueColor, labelColor, animation }
const refsOf = new WeakMap(); // root -> { signature }

export const statsRow = {
  id: "stats-row",
  kind: "element",
  name: "Fila de cifras",
  category: "Cifras",
  mobile: "stack",
  fit: "content",
  interactive: false,
  defaults: {
    ...finishDefaults,
    items: [
      { value: "5", label: "Pisos" },
      { value: "12", label: "Salas" },
      { value: "2", label: "Idiomas" },
    ],
    valueColor: "",
    labelColor: "",
    animation: animationDefault,
  },
  slots: [
    {
      key: "items",
      type: "list",
      label: "Cifras",
      toolbar: true,
      max: 8,
      of: [
        { key: "value", type: "text", label: "Valor" },
        { key: "label", type: "text", label: "Descripción" },
      ],
    },
    { key: "valueColor", type: "color", label: "Color de la cifra", toolbar: true },
    { key: "labelColor", type: "color", label: "Color de la descripción" },
    ...finishSlots,
    animationSlot,
  ],

  render(props) {
    const root = h("div", { className: "tour-rt-statsrow" });
    refsOf.set(root, { signature: null });
    statsRow.update(root, props);
    return root;
  },

  update(root, props) {
    applyFinish(root, props, { bare: true });
    const refs = refsOf.get(root);
    const items = listOf(props.items, 8);
    const signature = JSON.stringify(items);
    if (signature !== refs.signature) {
      refs.signature = signature;
      root.replaceChildren(
        ...items.map((item) =>
          h("div", { className: "tour-rt-statsrow-item" }, [
            h("span", { className: "tour-rt-statsrow-value", text: item.value == null ? "" : String(item.value) }),
            h("span", { className: "tour-rt-statsrow-label", text: typeof item.label === "string" ? item.label : "" }),
          ])
        )
      );
    }
    setVar(root, "--tour-stat-value", props.valueColor);
    setVar(root, "--tour-stat-label", props.labelColor);
  },
};
