import { convertLegacyElement, LEGACY_COMPOSITES } from "../../runtime/model/groupMigration.js";
// Catálogo de la biblioteca del estudio (cajones Elementos y Texto). Cada ítem es una receta lista
// para insertar: { id, category, template, props, name, w, h, frame? }. Sin React ni DOM.
//   w / h = tamaño inicial en px de diseño (0 = automático, lo decide el contenido)
//   frame = ancla fija (las barras van estiradas arriba o abajo); thumbW = ancho solo para la miniatura
// El arrastre al lienzo lleva el ítem como JSON en `dataTransfer` (tipo DRAG_TYPE); C1 lo recibe y
// llama insertElement(store, item, { x, y }).
import { insertElement } from "./actions.js";
import { addElement } from "./elementOps.js";

export const DRAG_TYPE = "application/x-tour-element";

// Orden de las secciones del cajón Elementos.
export const ELEMENT_CATEGORIES = ["Tarjetas", "Botones", "Cifras", "Formas", "Imagen", "Barras"];

const item = (id, category, template, name, w, h, props = {}, extra = {}) => ({ id, category, template, name, w, h, props, ...extra });

const BASE_LIBRARY = [
  // Tarjetas
  item("card-glass", "Tarjetas", "glass-card", "Tarjeta de cristal", 360, 0, {
    kicker: "Etiqueta",
    title: "Título de la tarjeta",
    body: "Cuéntale a tus visitantes qué van a encontrar aquí.",
  }),
  item("card-stats", "Tarjetas", "glass-card", "Tarjeta con cifras", 400, 0, {
    kicker: "En números",
    title: "Datos clave",
    children: [{ template: "stats-row", props: {} }],
  }),
  item("card-features", "Tarjetas", "glass-card", "Tarjeta con lista", 380, 0, {
    kicker: "Incluye",
    title: "Lo que vas a ver",
    children: [{ template: "feature-list", props: { heading: "" } }],
  }),
  item("feature-list", "Tarjetas", "feature-list", "Lista de características", 340, 0),
  // Botones
  item("button-solid", "Botones", "button", "Botón sólido", 240, 0),
  item("button-glass", "Botones", "button", "Botón de cristal", 240, 0, { variant: "glass", label: "Ver más", icon: "chevron-right" }),
  item("button-ghost", "Botones", "button", "Botón con contorno", 240, 0, { variant: "ghost", label: "Saber más", icon: "arrow-up-right" }),
  item("language", "Botones", "language-toggle", "Selector de idioma", 0, 0),
  // Cifras
  item("counter", "Cifras", "stats-counter", "Contador rotativo", 300, 0),
  item("stats-row", "Cifras", "stats-row", "Fila de cifras", 0, 0),
  item("loader", "Cifras", "loader", "Indicador de carga", 240, 0),
  // Formas
  item("shape-rect", "Formas", "shape", "Rectángulo", 280, 160),
  item("shape-circle", "Formas", "shape", "Círculo", 160, 160, { shape: "circle" }),
  item("shape-glass", "Formas", "shape", "Rectángulo de cristal", 280, 160, { glass: true, fill: "" }),
  // Imagen
  item("image", "Imagen", "image", "Imagen o logo", 240, 150),
  // Barras (estiradas: arriba y abajo de la pantalla)
  item("topbar", "Barras", "basic-topbar", "Barra superior", 0, 56, {}, { frame: { anchor: "stretch-top", x: 0, y: 0, w: 0, h: 56 }, thumbW: 320 }),
  item("scrubber", "Barras", "frame-scrubber", "Barra de cuadros", 0, 32, {}, { frame: { anchor: "stretch-bottom", x: 16, y: 16, w: 0, h: 32 }, thumbW: 320 }),
];

// Composite recipes use the same pure conversion as saved designs.
export const LIBRARY = BASE_LIBRARY.map((recipe) => {
  if (!LEGACY_COMPOSITES.includes(recipe.template)) return recipe;
  const converted = convertLegacyElement({ id: recipe.id, template: recipe.template, props: recipe.props, frame: { anchor:"top-left",x:0,y:0,w:recipe.w,h:recipe.h } });
  return { ...recipe, template: converted.template, props: converted.props, children: converted.children, h: recipe.template === "button" ? recipe.h : converted.props.contentHeight };
});

// Estilos del cajón Texto (plantilla `text`).
export const TEXT_STYLES = [
  item("text-title", "Texto", "text", "Título", 560, 0, { variant: "title", text: "Título del tour" }, { thumbW: 0 }),
  item("text-subtitle", "Texto", "text", "Subtítulo", 480, 0, { variant: "title", size: 28, weight: 500, text: "Subtítulo" }, { thumbW: 0 }),
  item("text-paragraph", "Texto", "text", "Párrafo", 420, 0, { variant: "paragraph", text: "Escribe aquí tu texto. Cuéntale a tus visitantes qué van a ver." }),
  item("text-kicker", "Texto", "text", "Etiqueta pequeña", 0, 0, { variant: "kicker", text: "Etiqueta" }),
];

export const ADD_TEXT = item("text-add", "Texto", "text", "Texto", 320, 0, { variant: "paragraph", text: "Escribe aquí" });

export function libraryByCategory(items = LIBRARY) {
  const groups = new Map();
  ELEMENT_CATEGORIES.forEach((c) => groups.set(c, []));
  items.forEach((it) => {
    if (!groups.has(it.category)) groups.set(it.category, []);
    groups.get(it.category).push(it);
  });
  return [...groups.entries()].filter(([, list]) => list.length);
}

// Lo que viaja en el arrastre (y lo que recibe insertElement): solo la receta.
export function dragPayload(it) {
  const { template, props, name, w, h, frame, children } = it;
  return { template, props: structuredClone(props ?? {}), name: template === "text" ? null : name, w, h, ...(frame ? { frame } : {}), ...(children ? { children: structuredClone(children) } : {}) };
}

// Ítem de imagen para un asset de Subidos: ancho 320 y alto proporcional.
export function imageItem(assetId, asset) {
  const ratio = asset?.width && asset?.height ? asset.height / asset.width : 0.625;
  const w = 320;
  return { id: `upload-${assetId}`, category: "Imagen", template: "image", name: asset?.name || "Imagen", w, h: Math.round(w * ratio), props: { asset: `asset:${assetId}`, fit: "contain", alt: asset?.name || "" } };
}

// Clic en la biblioteca: inserta al centro. Las barras (con `frame`) se insertan estiradas;
// el resto pasa por insertElement, que ancla solo según la zona.
export function insertItem(store, it, at) {
  if (!it.frame) return insertElement(store, dragPayload(it), at);
  const { screen } = store.getState();
  let id = null;
  store.apply(
    (design) => {
      const res = addElement(design, screen, { template: it.template, props: structuredClone(it.props ?? {}), ...(it.children ? { children: structuredClone(it.children) } : {}), name: it.name ?? null, frame: { ...it.frame } });
      id = res.id;
      return res.design;
    },
    { label: "Agregar elemento" }
  );
  if (id) store.select(id);
  return id;
}
