import { FONT_LIST, fontStack } from "../../fonts/fontList.js";
import { resolveThemeProps } from "../../theme/index.js";
import { h } from "../dom.js";
import { animationDefault, animationSlot, applyStyle, px } from "./common.js";

// Texto: título, párrafo o kicker (mono, mayúsculas). Hereda la tipografía de la marca
// (design.brand.fonts.heading/body) salvo que se elija otra con `font`.
//   props: { text, variant: "title"|"paragraph"|"kicker", color, size, weight, align, font, animation }
const VARIANTS = ["title", "paragraph", "kicker"];

export const textElement = {
  id: "text",
  kind: "element",
  name: "Texto",
  category: "Texto",
  mobile: "stack",
  fit: "content",
  interactive: false,
  defaults: {
    text: "Escribe aquí",
    variant: "paragraph",
    color: "",
    size: 0,
    weight: 0,
    align: "left",
    font: "",
    italic: false, underline: false, uppercase: false, letterSpacing: 0, lineHeight: 0,
    animation: animationDefault,
  },
  slots: [
    { key: "text", type: "text", label: "Texto", inline: true, toolbar: true },
    {
      key: "variant",
      type: "select",
      label: "Estilo",
      toolbar: true,
      options: [
        { value: "title", label: "Título" },
        { value: "paragraph", label: "Párrafo" },
        { value: "kicker", label: "Etiqueta" },
      ],
    },
    { key: "color", type: "color", label: "Color", toolbar: true },
    { key: "size", type: "range", toolbar: true, label: "Tamaño (0 = automático)", min: 0, max: 120, step: 1 },
    { key: "weight", type: "range", toolbar: true, label: "Grosor (0 = automático)", min: 0, max: 900, step: 100 },
    {
      key: "align",
      type: "select",
      label: "Alineación",
      options: [
        { value: "left", label: "Izquierda" },
        { value: "center", label: "Centro" },
        { value: "right", label: "Derecha" },
      ],
    },
    {
      key: "font",
      toolbar: true,
      type: "select",
      label: "Fuente",
      options: [
        { value: "", label: "Automática" },
        { value: "heading", label: "Títulos de la marca" },
        { value: "body", label: "Texto de la marca" },
        { value: "mono", label: "Monoespaciada" },
        ...FONT_LIST.map((f) => ({ value: f.id, label: f.label })),
      ],
    },
    { key:"italic",type:"toggle",label:"Cursiva",toolbar:true },
    { key:"underline",type:"toggle",label:"Subrayado",toolbar:true },
    { key:"uppercase",type:"toggle",label:"Mayúsculas" },
    { key:"letterSpacing",type:"range",label:"Interletrado",min:-5,max:30,step:.1 },
    { key:"lineHeight",type:"range",label:"Interlineado (0 = automático)",min:0,max:3,step:.05 },
    animationSlot,
  ],

  render(props, ctx) {
    const root = h("div", { className: "tour-rt-text", "data-slot": "text" }); // [C1]
    textElement.update(root, props, ctx);
    return root;
  },

  update(el, props, ctx) {
    props = resolveThemeProps("text", props, ctx?.doc?.design?.theme);
    const variant = VARIANTS.includes(props.variant) ? props.variant : "paragraph";
    el.className = `tour-rt-text tour-rt-text--${variant}`;
    if (variant === "title") {
      el.setAttribute("role", "heading");
      el.setAttribute("aria-level", "2");
    } else {
      el.removeAttribute("role");
      el.removeAttribute("aria-level");
    }
    el.textContent = typeof props.text === "string" ? props.text : "";
    const fontVar = { heading: "--tour-font-heading", body: "--tour-font-body", mono: "--tour-font-mono" }[props.font];
    applyStyle(el, {
      color: props.color,
      fontStyle: props.italic ? "italic" : "normal", textDecoration: props.underline ? "underline" : "none",
      textTransform: props.uppercase ? "uppercase" : variant === "kicker" ? "uppercase" : "none",
      letterSpacing: Number(props.letterSpacing) ? `${Math.min(30,Math.max(-5,Number(props.letterSpacing)))}px` : "",
      lineHeight: Number(props.lineHeight)>0 ? String(Math.min(4,Math.max(.6,Number(props.lineHeight)))) : "",
      fontSize: props.size > 0 ? px(props.size, 16, 6, 240) : "",
      fontWeight: props.weight > 0 ? String(Math.min(900, Math.max(100, Math.round(props.weight)))) : "",
      textAlign: ["left", "center", "right"].includes(props.align) ? props.align : "left",
      fontFamily: fontVar ? `var(${fontVar})` : FONT_LIST.some((f) => f.id === props.font) ? fontStack(props.font) : "",
    });
  },
};
