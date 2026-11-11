// Copiar y pegar elementos (Ctrl+C / Ctrl+V). El portapapeles vive en memoria: no toca el del
// sistema (así el texto que el usuario copió en otra pestaña no se pierde ni se mezcla).
import { addElement, elementsOf, flattenElements, cloneElementTree } from "../elementOps.js";

export const PASTE_OFFSET = 16;

let clip = []; // elementos copiados (clones), de abajo hacia arriba
let pasteCount = 0; // cada pegado sucesivo se desplaza un poco más

const shiftFrame = (frame, by) => (frame ? { ...frame, x: (frame.x ?? 0) + by, y: (frame.y ?? 0) + by } : frame);

// Copia los elementos `ids` de la pantalla activa. Devuelve cuántos copió.
export function copyElements(design, screen, ids) {
  const set = new Set(ids);
  clip = flattenElements(elementsOf(design, screen))
    .filter((el) => set.has(el.id) && !el.path.slice(0, -1).some((id) => set.has(id)))
    .sort((a, b) => (a.z ?? 0) - (b.z ?? 0))
    .map((el) => { const copy = structuredClone(el); delete copy.path; delete copy.parentId; return copy; });
  pasteCount = 0;
  return clip.length;
}

export const hasClipboard = () => clip.length > 0;
export const clipboardItems = () => clip;
export const resetClipboard = () => {
  clip = [];
  pasteCount = 0;
};

// Pura: pega `items` en `screen` con un desplazamiento (también en el frame móvil si lo hay).
// Los pegados quedan arriba de todo, visibles y desbloqueados. Devuelve { design, ids }.
export function pasteElements(design, screen, items, offset = PASTE_OFFSET, parentId = null) {
  let next = design;
  const ids = [];
  items.forEach((item) => {
    const copy = cloneElementTree(item);
    const mobile = item.mobile ? structuredClone(item.mobile) : { mode: "auto" };
    if (mobile.frame) mobile.frame = shiftFrame(mobile.frame, offset);
    const res = addElement(next, screen, {
      ...copy,
      name: item.name ?? null,
      props: structuredClone(item.props ?? {}),
      frame: shiftFrame(structuredClone(item.frame), offset),
      mobile,
    }, parentId);
    next = res.design;
    ids.push(res.id);
  });
  return { design: next, ids };
}

// Pega el portapapeles en la pantalla activa y deja los pegados seleccionados.
export function pasteClipboard(store) {
  if (!clip.length) return [];
  const { screen, activeGroupId } = store.getState();
  pasteCount += 1;
  let ids = [];
  store.apply(
    (d) => {
      const res = pasteElements(d, screen, clip, PASTE_OFFSET * pasteCount, activeGroupId);
      ids = res.ids;
      return res.design;
    },
    { label: "Pegar" }
  );
  store.select(ids);
  return ids;
}
