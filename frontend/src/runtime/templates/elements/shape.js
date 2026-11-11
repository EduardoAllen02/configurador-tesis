import { resolveThemeProps } from "../../theme/index.js";
import { h } from "../dom.js";
import { animationDefault, animationSlot, applyStyle, applyFinish, finishDefaults, finishSlots, px } from "./common.js";

// Forma: rectángulo o círculo, con relleno liso o cristal (desenfoque del fondo).
//   props: { shape: "rect"|"circle", fill, glass, stroke, strokeWidth, radius, opacity, animation }
export const shapeElement = {
  id: "shape",
  kind: "element",
  name: "Forma",
  category: "Formas",
  mobile: "keep",
  interactive: false,
  defaults: {
    shape: "rect",
    fill: "",
    ...finishDefaults,
    stroke: "",
    strokeWidth: 1,
    opacity: 1,
    animation: animationDefault,
  },
  slots: [
    {
      key: "shape",
      type: "select",
      label: "Forma",
      toolbar: true,
      options: [
        { value: "rect", label: "Rectángulo" },
        { value: "circle", label: "Círculo" },
      ],
    },
    { key: "fill", type: "color", label: "Relleno", toolbar: true },
    ...finishSlots,
    { key: "stroke", type: "border", label: "Borde", toolbar: true },
    { key: "opacity", type: "range", label: "Opacidad", min: 0, max: 1, step: 0.05 },
    animationSlot,
  ],

  render(props, ctx) {
    const root = h("div", { className: "tour-rt-shape", "aria-hidden": "true" });
    shapeElement.update(root, props, ctx);
    return root;
  },

  update(root, props, ctx) {
    props = resolveThemeProps("shape", props, ctx?.doc?.design?.theme);
    if (!ctx?.doc?.design?.theme && !props.fill && !props.glass) props = { ...props, fill: "rgba(255,255,255,.12)" };
    root.className = "tour-rt-shape";
    applyFinish(root, props.stroke ? { ...props, borderColor: props.stroke, borderWidth: props.strokeWidth } : props, { bare: true });
    applyStyle(root, { opacity: Number.isFinite(props.opacity) ? Math.max(0, Math.min(1, props.opacity)) : 1 });
  },
};
