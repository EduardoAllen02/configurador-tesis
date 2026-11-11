import { h } from "../dom.js";
import { animationDefault, animationSlot, setVar } from "./common.js";

// Selector de idioma: una píldora con los códigos de design.languages.list (EN / IT…). Por ahora
// es solo visual (cambia cuál se ve activo); la lógica de idiomas es de la Oleada 4, y avisa con
// ctx.onLanguage(code) si el motor lo define.
//   props: { active, fill, color, animation }
const refsOf = new WeakMap(); // root -> { ctx, current, signature, buttons }
const CODE = /^[a-z]{2,3}(-[A-Za-z0-9]+)?$/;

function languagesOf(ctx) {
  const list = ctx?.doc?.design?.languages?.list;
  const codes = (Array.isArray(list) ? list : []).filter((c) => typeof c === "string" && CODE.test(c)).slice(0, 6);
  return codes.length ? codes : ["es"];
}

export const languageToggle = {
  id: "language-toggle",
  kind: "element",
  name: "Selector de idioma",
  category: "Botones",
  mobile: "stack",
  defaults: { active: "", fill: "", color: "", animation: animationDefault },
  slots: [
    { key: "active", type: "text", label: "Idioma activo (código)" },
    { key: "fill", type: "color", label: "Color del activo", toolbar: true },
    { key: "color", type: "color", label: "Color del texto", toolbar: true },
    animationSlot,
  ],

  render(props, ctx) {
    const root = h("div", { className: "tour-rt-lang tour-rt-glass", role: "group", "aria-label": "Idioma" });
    const refs = { ctx, current: null, signature: null, buttons: [] };
    refsOf.set(root, refs);
    languageToggle.update(root, props, ctx);
    return root;
  },

  update(root, props, ctx) {
    const refs = refsOf.get(root);
    refs.ctx = ctx;
    const codes = languagesOf(ctx);
    const signature = codes.join("|");
    if (signature !== refs.signature) {
      refs.signature = signature;
      refs.buttons = codes.map((code) => {
        const btn = h("button", { type: "button", className: "tour-rt-lang-btn", "aria-label": code.toUpperCase(), text: code.toUpperCase() });
        btn.addEventListener("click", () => {
          refs.current = code;
          paint(refs);
          refs.ctx?.onLanguage?.(code);
        });
        btn.dataset.lang = code;
        return btn;
      });
      root.replaceChildren(...refs.buttons);
      refs.current = null;
    }
    if (!refs.current || !codes.includes(refs.current)) {
      const wanted = props.active || ctx?.doc?.design?.languages?.default;
      refs.current = codes.includes(wanted) ? wanted : codes[0];
    }
    setVar(root, "--tour-lang-fill", props.fill);
    setVar(root, "--tour-lang-color", props.color);
    paint(refs);
  },
};

function paint(refs) {
  refs.buttons.forEach((btn) => {
    const on = btn.dataset.lang === refs.current;
    btn.classList.toggle("is-active", on);
    btn.setAttribute("aria-pressed", on ? "true" : "false");
  });
}
