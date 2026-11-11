import { useMemo, useState } from "react";
import { useDesignEditor } from "../../../hooks/useTourDesign.jsx";
import { ADD_TEXT, DRAG_TYPE, LIBRARY, TEXT_STYLES, dragPayload, insertItem, libraryByCategory } from "../../library.js";
import Thumb from "../Thumb.jsx";
import { Ico } from "../ui.jsx";

// Una celda de la biblioteca: miniatura real + nombre. Clic = insertar al centro; arrastrar =
// soltar en el lienzo (C1 recibe el JSON del ítem con el tipo application/x-tour-element).
export function LibraryCell({ item, cell = [152, 104] }) {
  const store = useDesignEditor();
  return (
    <button
      type="button"
      className="sp-cell"
      draggable
      title={`Agregar «${item.name}» (clic) o arrástralo al lienzo`}
      aria-label={`Agregar ${item.name}`}
      onClick={() => insertItem(store, item)}
      onDragStart={(e) => {
        e.dataTransfer.setData(DRAG_TYPE, JSON.stringify(dragPayload(item)));
        e.dataTransfer.setData("text/plain", item.name);
        e.dataTransfer.effectAllowed = "copy";
      }}
    >
      <Thumb item={item} cell={cell} />
      <span className="sp-cell-name">{item.name}</span>
    </button>
  );
}

const fold = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export default function ElementsTab({ detailMode = false }) {
  const [q, setQ] = useState("");
  const groups = useMemo(() => {
    const n = fold(q.trim());
    const library = detailMode ? LIBRARY.filter((item) => ["text", "shape", "image", "icon", "button"].includes(item.template)) : LIBRARY;
    const items = n ? library.filter((it) => fold(`${it.name} ${it.category}`).includes(n)) : library;
    return libraryByCategory(items);
  }, [q, detailMode]);
  return (
    <div className="sp-tab">
      <label className="sp-search">
        <input type="search" placeholder="Buscar elementos" value={q} aria-label="Buscar elementos" onChange={(e) => setQ(e.target.value)} />
      </label>
      {groups.length === 0 && <p className="sp-hint">No hay elementos con ese nombre.</p>}
      {groups.map(([category, items]) => (
        <section key={category} className="sp-section">
          <h3>{category}</h3>
          <div className="sp-grid">
            {items.map((it) => (
              <LibraryCell key={it.id} item={it} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export function TextTab() {
  const store = useDesignEditor();
  return (
    <div className="sp-tab">
      <button type="button" className="sp-btn sp-btn--primary sp-btn--wide" onClick={() => insertItem(store, ADD_TEXT)}>
        <Ico name="type" size={18} /> Agregar texto
      </button>
      <section className="sp-section">
        <h3>Estilos de texto</h3>
        <div className="sp-grid">
          {TEXT_STYLES.map((it) => (
            <LibraryCell key={it.id} item={it} />
          ))}
        </div>
        <p className="sp-hint">Haz doble clic en un texto del lienzo para escribir directamente sobre él. Las fuentes se cambian en Marca.</p>
      </section>
    </div>
  );
}
