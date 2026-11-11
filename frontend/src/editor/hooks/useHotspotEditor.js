import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../api/client";
import { createHotspotUpdateQueue } from "./hotspotUpdateQueue.js";

// Arma un FormData con los campos de texto + la imagen (si viene) para create/update. JSON
// sigue siendo el camino por defecto — el arrastre de marcador en el lienzo manda solo
// {lon,lat} y no debe pasar por multipart para eso. Los campos objeto (style, segments,
// content) viajan como JSON en texto; el backend los parsea.
function toFormData(rest, imageFile, removeImage) {
  const fd = new FormData();
  Object.entries(rest).forEach(([key, value]) => {
    if (value === undefined) return;
    fd.append(key, value !== null && typeof value === "object" ? JSON.stringify(value) : value);
  });
  if (imageFile) fd.append("image", imageFile);
  if (removeImage) fd.append("removeImage", "true");
  return fd;
}

// Carga TODOS los hotspots del tour de una vez: un hotspot de video con segmentos se ve en
// cuadros que no son su propia escena, así que el lienzo necesita el conjunto completo.
//   hotspots     → los de la escena activa (lista de la escena, popover)
//   allHotspots  → todos (lo que se le pasa al motor del lienzo)
// Crear usa la escena activa; editar y borrar usan la escena propia de cada hotspot.
export function useHotspotEditor(tourId, sceneId) {
  const [allHotspots, setAllHotspots] = useState([]);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    try {
      setAllHotspots(await api.get(`/api/tours/${tourId}/hotspots`));
    } catch (err) {
      setError(err.message);
    }
  }, [tourId]);

  const updateQueue = useMemo(() => createHotspotUpdateQueue({
    preview: (id, patch) => setAllHotspots((rows) => rows.map((row) => row.id === id ? { ...row, ...patch } : row)),
    commit: (id, saved) => setAllHotspots((rows) => rows.map((row) => row.id === id ? saved : row)),
    recover: async () => {},
  }), [reload]);

  useEffect(() => {
    reload();
  }, [reload]);

  const hotspots = useMemo(() => allHotspots.filter((h) => h.sceneId === sceneId), [allHotspots, sceneId]);

  function hotspotUrl(hotspotId) {
    const owner = allHotspots.find((h) => h.id === hotspotId)?.sceneId ?? sceneId;
    return `/api/tours/${tourId}/scenes/${owner}/hotspots/${hotspotId}`;
  }

  async function createHotspot(data) {
    const { imageFile, removeImage, ...rest } = data;
    const url = `/api/tours/${tourId}/scenes/${sceneId}/hotspots`;
    let created;
    if (imageFile || removeImage) {
      created = await api.post(url, toFormData(rest, imageFile, removeImage), { isFormData: true });
    } else {
      created = await api.post(url, rest);
    }
    await reload();
    return created;
  }

  async function updateHotspot(hotspotId, data) {
    const { imageFile, removeImage, ...rest } = data;
    const url = hotspotUrl(hotspotId);
    const patch = Object.fromEntries(Object.entries(rest).filter(([, value]) => value !== undefined));
    const saved = await updateQueue(hotspotId, patch, () => imageFile || removeImage
      ? api.patch(url, toFormData(rest, imageFile, removeImage), { isFormData: true })
      : api.patch(url, rest));
    if (rest.detailApplyTo && rest.detailApplyTo !== "this") await reload();
    return saved;
  }

  async function removeHotspot(hotspotId) {
    await api.delete(hotspotUrl(hotspotId));
    await reload();
  }

  return { hotspots, allHotspots, error, createHotspot, updateHotspot, removeHotspot, reload };
}
