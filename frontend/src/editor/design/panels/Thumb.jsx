import { applyTheme } from "../../../runtime/theme/index.js";
import { useLayoutEffect, useRef, useState } from "react";
import { applyFonts } from "../../../runtime/fonts/fonts.js";
import { getTemplate } from "../../../runtime/templates/index.js";
import { mergeProps } from "../../../runtime/layout/util.js";
import { useDesignState } from "../../hooks/useTourDesign.jsx";
import { useStudio } from "../StudioContext.jsx";
import { Ico } from "./ui.jsx";

// Miniatura REAL de un ítem de la biblioteca: `template.render(props, ctx)` dentro de un
// contenedor del motor (para heredar los tokens y los estilos de las plantillas), medido a su
// tamaño natural y encogido para caber en la celda. Usa la marca del diseño, así que cambia
// cuando cambia la fuente o el color de acento.
const FAKE_ENTRIES = [{ sceneId: "demo", key: "demo", label: "Sala principal", count: 1 }];
const noop = () => {};

function thumbCtx(doc) {
  return {
    doc,
    thumb: true,
    getTemplate,
    state: { frameIndex: 3, frameCount: 12, batchKey: "demo", sceneId: "demo" },
    entries: FAKE_ENTRIES,
    goToScene: noop,
    seek: noop,
    enter: noop,
    onLanguage: noop,
  };
}

export default function Thumb({ item, cell = [140, 92], fill = 0.8 }) {
  const { baseDoc } = useStudio();
  const theme = useDesignState((s) => s.design?.theme);
  const themeKey = JSON.stringify(theme);
  const brand = useDesignState((s) => s.design?.brand);
  const brandKey = JSON.stringify([brand?.colors?.[0], brand?.radius, brand?.fonts]);
  const stage = useRef(null);
  const [empty, setEmpty] = useState(false);
  const propsKey = JSON.stringify([item.props ?? {}, item.children]);

  useLayoutEffect(() => {
    const host = stage.current;
    const template = getTemplate(item.template);
    if (!host || !template) return undefined;
    host.replaceChildren();
    host.style.setProperty("--tour-accent", brand?.colors?.[0] || "#4da3ff");
    host.style.setProperty("--tour-radius", `${brand?.radius ?? 8}px`);
    applyFonts(host, brand?.fonts);
    applyTheme(host, theme);
    const doc = { ...baseDoc, design: { brand, theme } };
    const node = document.createElement("div");
    node.className = "tour-rt-el sp-thumb-el";
    const natW = item.thumbW ?? item.w;
    node.style.width = natW > 0 ? `${natW}px` : "max-content";
    if (item.h > 0) node.style.height = `${item.h}px`;
    let content = null;
    try {
      content = template.render({ ...mergeProps(template, item.props), ...(item.template === "group" ? { children: item.children ?? [], width: natW, height: item.h } : {}) }, thumbCtx(doc));
      const anim = document.createElement("div");
      anim.style.cssText = "width:100%;height:100%";
      anim.append(content);
      node.append(anim);
    } catch {
      /* una plantilla que falla no debe romper el cajón */
    }
    host.append(node);
    const w = node.offsetWidth;
    const h = node.offsetHeight;
    if (!content || w < 4 || h < 4) {
      setEmpty(true);
    } else {
      setEmpty(false);
      const k = Math.min((cell[0] * fill) / w, (cell[1] * fill) / h, 1.6);
      node.style.transformOrigin = "0 0";
      node.style.transform = `scale(${k})`;
      node.style.left = `${(cell[0] - w * k) / 2}px`;
      node.style.top = `${(cell[1] - h * k) / 2}px`;
    }
    return () => {
      try {
        template.dispose?.(content);
      } catch {
        /* nada */
      }
      host.replaceChildren();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id, item.template, propsKey, item.w, item.h, brandKey, themeKey, baseDoc]);

  return (
    <span className="tour-rt-root sp-thumb" style={{ width: cell[0], height: cell[1], ...(theme ? { background: theme.tokens?.surface || "#f4f2ed" } : {}) }} aria-hidden="true" inert>
      <span ref={stage} className="sp-thumb-stage" />
      {(empty || (item.template === "image" && !item.props?.asset)) && (
        <span className="sp-thumb-empty">
          <Ico name={item.template === "image" ? "image" : "shapes"} size={28} />
        </span>
      )}
    </span>
  );
}
