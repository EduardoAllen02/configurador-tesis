import { h } from "../dom.js";
import "./loaderProgress.css";
import { animationDefault, animationSlot, setVar } from "./common.js";

// Indicador de carga: "INICIALIZANDO → LISTO" con una barra. Está "listo" cuando la pantalla de
// inicio avisa ctx.ready === true o, fuera de ella, cuando ya hay una escena activa.
//   props: { labelLoading, labelReady, color, animation }
const refsOf = new WeakMap(); // root -> { label, fill }

export const loaderElement = {
  id: "loader",
  kind: "element",
  name: "Indicador de carga",
  category: "Cifras",
  mobile: "dock-bottom",
  interactive: false,
  isVisible: (ctx) => ctx?.mode === "design" || ctx?.thumb || ctx?.intro || !ctx?.loading?.ready,
  defaults: { labelLoading: "Inicializando", labelReady: "Listo", color: "", animation: animationDefault },
  slots: [
    { key: "labelLoading", type: "text", label: "Texto mientras carga", inline: true, toolbar: true },
    { key: "labelReady", type: "text", label: "Texto al terminar", inline: true, toolbar: true },
    { key: "color", type: "color", label: "Color de la barra", toolbar: true },
    animationSlot,
  ],

  render(props, ctx) {
    const label = h("span", { className: "tour-rt-text tour-rt-text--kicker tour-rt-loader-label" });
    const fill = h("span", { className: "tour-rt-loader-fill" });
    const root = h("div", { className: "tour-rt-loader", role: "status" }, [
      label,
      h("span", { className: "tour-rt-loader-track", "aria-hidden": "true" }, fill),
    ]);
    refsOf.set(root, { label, fill });
    loaderElement.update(root, props, ctx);
    return root;
  },

  update(root, props, ctx) {
    const refs = refsOf.get(root);
    const progress = ctx?.loading;
    const preview = ctx?.mode === "design" || ctx?.thumb;
    const ready = preview || (ctx?.intro ? ctx.ready : progress?.ready) || false;
    const ratio = progress?.total > 0 ? Math.min(1, progress.loaded / progress.total) : null;
    root.hidden = !ctx?.intro && !preview && ready;
    root.classList.toggle("is-ready", !!ready);
    root.classList.toggle("is-determinate", ratio !== null && !ready);
    refs.fill.style.width = ready ? "100%" : ratio !== null ? `${ratio * 100}%` : "";
    root.setAttribute("aria-label", ready ? props.labelReady : `${props.labelLoading}${ratio !== null ? ` ${Math.round(ratio * 100)}%` : ""}`);
    root.setAttribute("aria-busy", String(!ready));
    const text = ready ? props.labelReady : props.labelLoading;
    refs.label.textContent = (typeof text === "string" ? text : "") + (!ready && ratio !== null ? ` ${Math.round(ratio * 100)}%` : "");
    refs.label.setAttribute("data-slot", ready ? "labelReady" : "labelLoading"); // [C1] la clave cambia con el estado
    setVar(root, "--tour-loader-color", props.color);
  },
};
