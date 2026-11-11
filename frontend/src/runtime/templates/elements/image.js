import { h } from "../dom.js";
import { resolveAssetUrl } from "../../layout/util.js";
import { animationDefault, animationSlot, applyStyle, px } from "./common.js";

// Imagen / logo: un asset del tour (`asset:<id>` → doc.assets[id].url).
//   props: { asset, alt, fit: "contain"|"cover", radius, opacity, animation }
export const imageElement = {
  id: "image",
  kind: "element",
  name: "Imagen o logo",
  category: "Imagen",
  mobile: "stack",
  interactive: false,
  defaults: { asset: null, alt: "", fit: "contain", radius: 0, opacity: 1, animation: animationDefault },
  slots: [
    { key: "asset", type: "image", label: "Imagen", toolbar: true },
    { key: "alt", type: "text", label: "Descripción (accesibilidad)" },
    {
      key: "fit",
      type: "select",
      label: "Ajuste",
      options: [
        { value: "contain", label: "Completa" },
        { value: "cover", label: "Rellenar" },
      ],
    },
    { key: "radius", type: "range", label: "Redondeo", min: 0, max: 200, step: 1 },
    { key: "opacity", type: "range", label: "Opacidad", min: 0, max: 1, step: 0.05 },
    animationSlot,
  ],

  render(props, ctx) {
    const root = h("div", { className: "tour-rt-image" });
    imageElement.update(root, props, ctx);
    return root;
  },

  update(root, props, ctx) {
    const url = resolveAssetUrl(ctx?.doc, props.asset);
    let img = root.firstElementChild;
    if (!url) {
      root.replaceChildren();
      root.classList.add("tour-rt-image--empty");
      return;
    }
    root.classList.remove("tour-rt-image--empty");
    if (!img || img.tagName !== "IMG") {
      img = h("img", { draggable: "false" });
      root.replaceChildren(img);
    }
    if (img.getAttribute("src") !== url) img.setAttribute("src", url);
    img.setAttribute("alt", typeof props.alt === "string" ? props.alt : "");
    applyStyle(img, {
      objectFit: props.fit === "cover" ? "cover" : "contain",
      borderRadius: px(props.radius, 0, 0, 400),
      opacity: Number.isFinite(props.opacity) ? Math.max(0, Math.min(1, props.opacity)) : 1,
    });
  },
};
