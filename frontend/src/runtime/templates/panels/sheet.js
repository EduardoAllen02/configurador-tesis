import "./panels.css";
import { createIcon } from "../../icons/index.js";
import { el, typeLabel } from "../hotspots/common.js";
import { isMobileWidth } from "../hotspots/common.js";

// Paneles de detalle de hoja: "side-sheet" (hoja lateral de alto completo, estilo Colombini) y
// "bottom-sheet" (hoja inferior). En móvil (contenedor < 720 px) CUALQUIER panel, incluida la
// tarjeta flotante, se muestra como hoja inferior: lo decide `watchMobile` midiendo el padre.

// Marca `is-mobile` en el panel según el ancho de su contenedor y lo mantiene al redimensionar.
// El panel ya está en el DOM cuando corre el microtask (showPanel lo agrega de inmediato).
export function watchMobile(node, { lift = false } = {}) {
  queueMicrotask(() => {
    const parent = node.parentElement;
    if (!parent) {
      node.classList.add("is-ready");
      return;
    }
    // Los marcadores (CSS2D) llevan z-index enormes y quedarían encima de una hoja que cubre la
    // pantalla: mientras la hoja está abierta, la capa de UI sube sobre ellos.
    if (lift) {
      const prev = parent.style.zIndex;
      parent.style.zIndex = "2147483000";
      const mo = new MutationObserver(() => {
        if (node.parentElement === parent) return;
        parent.style.zIndex = prev;
        mo.disconnect();
      });
      mo.observe(parent, { childList: true });
    }
    const apply = () => node.classList.toggle("is-mobile", isMobileWidth(parent.clientWidth));
    apply();
    node.classList.add("is-ready"); // la animación de entrada arranca ya con la variante correcta
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => (node.isConnected ? apply() : ro.disconnect()));
    ro.observe(parent);
  });
}

// Cierra con la animación de salida; sin movimiento (o sin animación) cierra de inmediato.
function closeWithMotion(node, onClose) {
  const reduce = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce || node.classList.contains("is-closing")) return onClose?.();
  node.classList.add("is-closing");
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    onClose?.();
  };
  node.addEventListener("animationend", finish, { once: true });
  setTimeout(finish, 420);
}

function fill(sheet, variant, props = {}, ctx) {
  const { hotspot, onClose } = ctx;
  sheet.className = `tour-rt-sheet tour-rt-sheet--${variant} tour-rt-sheet--${props.tone === "light" ? "light" : "dark"}${sheet.classList.contains("is-ready") ? " is-ready" : ""}${sheet.classList.contains("is-mobile") ? " is-mobile" : ""}`;
  sheet.setAttribute("role", "dialog");
  sheet.setAttribute("aria-label", hotspot.title || "Detalle");

  const close = el("button", "tour-rt-sheet-close");
  close.type = "button";
  close.setAttribute("aria-label", "Cerrar");
  close.appendChild(createIcon("x", { size: 18, strokeWidth: 2 }));
  close.addEventListener("click", (e) => {
    e.stopPropagation();
    closeWithMotion(sheet, onClose);
  });

  const head = el("div", "tour-rt-sheet-head");
  const titles = el("div", "tour-rt-sheet-titles");
  titles.append(el("span", "tour-rt-sheet-kicker", props.kicker || typeLabel(hotspot.type)), el("h2", "tour-rt-sheet-title", hotspot.title));
  head.append(el("span", "tour-rt-sheet-grab"), titles, close);

  const body = el("div", "tour-rt-sheet-body");
  if (hotspot.image) {
    const img = document.createElement("img");
    img.src = hotspot.image;
    img.alt = "";
    img.className = "tour-rt-sheet-img";
    body.appendChild(img);
  }
  if (hotspot.type === "price" && hotspot.price) body.appendChild(el("p", "tour-rt-sheet-price", hotspot.price));
  if (hotspot.description) body.appendChild(el("p", "tour-rt-sheet-desc", hotspot.description));

  sheet.replaceChildren(head, body);
}

function defineSheet(id, variant, name) {
  return {
    id,
    kind: "panel",
    name,
    category: "Paneles",
    defaults: { tone: "dark", kicker: "" },
    slots: [
      { key: "tone", type: "select", label: "Tono", options: [{ value: "dark", label: "Oscuro" }, { value: "light", label: "Claro" }] },
      { key: "kicker", type: "text", label: "Etiqueta superior" },
    ],
    render(props, ctx) {
      const sheet = el("div", "");
      sheet.setAttribute("data-ui", "");
      fill(sheet, variant, props, ctx);
      watchMobile(sheet, { lift: true });
      return sheet;
    },
    update(sheet, props, ctx) {
      fill(sheet, variant, props, ctx);
    },
  };
}

export const sideSheet = defineSheet("side-sheet", "side", "Hoja lateral");
export const bottomSheet = defineSheet("bottom-sheet", "bottom", "Hoja inferior");
