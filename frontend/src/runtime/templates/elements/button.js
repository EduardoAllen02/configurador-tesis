import { resolveThemeProps } from "../../theme/index.js";
import { h } from "../dom.js";
import { animationDefault, animationSlot, applyStyle, px } from "./common.js";
import { normalizeAction, runAction, safeHttpUrl } from "./actions.js";
import { ICON_NAMES, createIcon } from "./icons.js";

// Botón con acción: Entrar al tour / Ir a una escena / Abrir un enlace (solo http y https, en
// pestaña nueva con rel="noopener"). El botón con acción "enter" queda deshabilitado hasta que
// la primera escena ya se ve (ctx.ready === false, lo pone la pantalla de inicio).
//   props: { label, variant: "primary"|"glass"|"ghost", icon, fill, color, radius, action, animation }
const refsOf = new WeakMap(); // root -> { ctx, action, label, iconWrap, iconName }

export const buttonElement = {
  id: "button",
  kind: "element",
  name: "Botón",
  category: "Botones",
  mobile: "stack",
  defaults: {
    label: "Entrar al tour",
    variant: "primary",
    icon: "arrow-right",
    fill: "",
    color: "",
    radius: null,
    action: { type: "enter", target: null },
    animation: animationDefault,
  },
  slots: [
    { key: "label", type: "text", label: "Texto", inline: true, toolbar: true },
    {
      key: "variant",
      type: "select",
      label: "Estilo",
      toolbar: true,
      options: [
        { value: "primary", label: "Sólido" },
        { value: "glass", label: "Cristal" },
        { value: "ghost", label: "Contorno" },
      ],
    },
    { key: "fill", type: "color", label: "Fondo", toolbar: true },
    { key: "color", type: "color", label: "Texto", toolbar: true },
    { key: "icon", type: "icon", label: "Icono", options: ["", ...ICON_NAMES] },
    { key: "radius", type: "range", label: "Redondeo", min: 0, max: 40, step: 1 },
    {
      key: "action",
      type: "action",
      label: "Al hacer clic",
      options: [
        { value: "enter", label: "Entrar al tour" },
        { value: "goToScene", label: "Ir a una escena" },
        { value: "openUrl", label: "Abrir un enlace" },
      ],
    },
    animationSlot,
  ],

  render(props, ctx) {
    const action = normalizeAction(props.action);
    const href = action.type === "openUrl" ? safeHttpUrl(action.target) : null;
    const asLink = !!href;
    const root = h(asLink ? "a" : "button", { className: "tour-rt-btn" });
    if (asLink) {
      root.setAttribute("href", href);
      root.setAttribute("target", "_blank");
      root.setAttribute("rel", "noopener noreferrer");
    } else {
      root.setAttribute("type", "button");
    }
    const label = h("span", { className: "tour-rt-btn-label", "data-slot": "label" }); // [C1]
    const iconWrap = h("span", { className: "tour-rt-btn-icon" });
    root.append(label, iconWrap);
    const refs = { ctx, action, label, iconWrap, iconName: null };
    refsOf.set(root, refs);
    if (!asLink) {
      root.addEventListener("click", () => {
        if (root.disabled) return;
        runAction(refs.action, refs.ctx);
      });
    }
    buttonElement.update(root, props, ctx);
    return root;
  },

  update(root, props, ctx) {
    props = resolveThemeProps("button", props, ctx?.doc?.design?.theme);
    const refs = refsOf.get(root);
    if (!refs) return undefined;
    // Pasar de acción normal a "Abrir enlace" (o al revés) cambia la etiqueta (<button> ↔ <a>):
    // se devuelve un nodo nuevo y la capa de elementos lo pone en lugar del viejo.
    const nextAction = normalizeAction(props.action);
    const href = nextAction.type === "openUrl" ? safeHttpUrl(nextAction.target) : null;
    if (!!href !== (root.tagName === "A")) return buttonElement.render(props, ctx);
    if (href && root.getAttribute("href") !== href) root.setAttribute("href", href);
    refs.ctx = ctx;
    refs.action = nextAction;
    const variant = ["primary", "glass", "ghost"].includes(props.variant) ? props.variant : "primary";
    root.className = `tour-rt-btn tour-rt-btn--${variant}`;
    const text = typeof props.label === "string" ? props.label : "";
    refs.label.textContent = text;
    root.setAttribute("aria-label", text || "Botón");
    if (props.icon !== refs.iconName) {
      refs.iconName = props.icon;
      refs.iconWrap.replaceChildren(...(props.icon ? [createIcon(props.icon, { size: 16 })] : []));
    }
    refs.iconWrap.hidden = !refs.iconWrap.firstChild;
    applyStyle(root, { background: props.fill, color: props.color, borderRadius: px(props.radius, 3, 0, 60) });
    // "Entrar" espera a que haya algo que ver; fuera de la pantalla de inicio (ready indefinido) no.
    const waiting = refs.action.type === "enter" && ctx?.ready === false;
    if ("disabled" in root) root.disabled = waiting;
    root.toggleAttribute("data-waiting", waiting);
    if (waiting) root.setAttribute("aria-disabled", "true");
    else root.removeAttribute("aria-disabled");
    return undefined;
  },
};
