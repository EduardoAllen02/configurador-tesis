import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "../../api/client";

// Datos del tour que el estudio de diseño necesita además del diseño (que vive en el almacén):
// el TourDocument completo (escenas, hotspots, assets) para pintar el 360 real detrás del
// lienzo, y la lista de assets para el panel de Subidos.
//
//   const { tourId, tour, baseDoc, assets, reload } = useStudio();
//   baseDoc  = TourDocument de GET /api/tours/:id/document (su `design` NO se usa: el bueno es
//              el del almacén; el lienzo arma { ...baseDoc, design } en cada cambio)
//   assets   = baseDoc.assets  ({ [id]: { kind, url, mime, width, height, name } })
//   reload() = vuelve a pedir el documento (tras subir o borrar un asset)
const StudioContext = createContext(null);

export function StudioProvider({ tourId, children, sceneRevision }) {
  const [baseDoc, setBaseDoc] = useState(null);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    try {
      setBaseDoc(await api.get(`/api/tours/${tourId}/document`));
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }, [tourId]);

  useEffect(() => {
    reload();
  }, [reload, sceneRevision]);

  const value = {
    tourId,
    tour: baseDoc?.tour ?? null,
    baseDoc,
    assets: baseDoc?.assets ?? {},
    error,
    reload,
  };
  return <StudioContext.Provider value={value}>{children}</StudioContext.Provider>;
}

export function useStudio() {
  const ctx = useContext(StudioContext);
  if (!ctx) throw new Error("useStudio necesita <StudioProvider>");
  return ctx;
}
