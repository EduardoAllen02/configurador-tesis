import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { api } from "../../api/client";
import { createDesignStore } from "../design/designStore.js";
import { measureLegacyGroups } from "../design/measureLegacyGroups.js";

// Diseño del tour (Tour.design, ver docs/CONTRATO_OLEADA1.md §2) compartido por todo el
// editor. Desde la Oleada 3 su único dueño es el almacén del editor (editor/design/designStore.js):
// deshacer/rehacer, guardado automático y selección viven ahí.
//
//   Paneles de ajustes (nadir, calidad, estilos de hotspot…), como hasta ahora:
//     const { design, saveDesign } = useTourDesign();
//     await saveDesign((prev) => ({ ...prev, nadir: { mode: "limit", limitDeg: -60 } }));
//     (saveDesign aplica el cambio con deshacer y guarda de inmediato)
//
//   Editor de diseño (lienzo y paneles de la Oleada 3):
//     const store = useDesignEditor();                      // acciones: apply, preview, undo…
//     const selection = useDesignState((s) => s.selection); // estado reactivo
const TourDesignContext = createContext(null);
export function DraftDesignProvider({ store, children }) {
  return <TourDesignContext.Provider value={{ store, loadError: null }}>{children}</TourDesignContext.Provider>;
}

export function TourDesignProvider({ tourId, children }) {
  const store = useMemo(
    () => createDesignStore({ save: (design) => api.patch(`/api/tours/${tourId}/design`, design) }),
    [tourId]
  );
  const [loadError, setLoadError] = useState(null);
  // Solo en desarrollo: el almacén queda a mano en la consola para depurar y verificar.
  if (import.meta.env.DEV) window.__designStore = store;

  useEffect(() => {
    let cancelled = false;
    setLoadError(null);
    // El documento trae el diseño ya resuelto (Tour.design o el derivado de theme/customTexts).
    api
      .get(`/api/tours/${tourId}/document`)
      .then(async (doc) => {
        const design = await measureLegacyGroups(doc);
        if (!cancelled) store.load(design);
      })
      .catch((err) => !cancelled && setLoadError(err.message));
    return () => {
      cancelled = true;
      store.flush().catch(() => {}); // lo pendiente se guarda al salir del editor
    };
  }, [tourId, store]);

  // Cerrar la pestaña con cambios sin guardar: el navegador avisa.
  useEffect(() => {
    const onBeforeUnload = (e) => {
      if (!store.hasUnsavedChanges()) return;
      store.flush().catch(() => {});
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [store]);

  return <TourDesignContext.Provider value={{ store, loadError }}>{children}</TourDesignContext.Provider>;
}

function useCtx() {
  const ctx = useContext(TourDesignContext);
  if (!ctx) throw new Error("useTourDesign necesita <TourDesignProvider>");
  return ctx;
}

// Estado reactivo del almacén; `selector` debe devolver algo estable (un campo del estado).
export function useDesignState(selector = (s) => s) {
  const { store } = useCtx();
  return useSyncExternalStore(store.subscribe, () => selector(store.getState()));
}

export function useDesignEditor() {
  return useCtx().store;
}

export function useTourDesign() {
  const { store, loadError } = useCtx();
  const design = useDesignState((s) => s.design);
  const saveError = useDesignState((s) => s.error);
  const saveDesign = useCallback(
    (updater, label = "Ajustes") => {
      store.apply(updater, { label });
      return store.flush();
    },
    [store]
  );
  return { design, error: loadError || saveError, saveDesign };
}
