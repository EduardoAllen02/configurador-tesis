import { useCallback, useEffect, useState } from "react";
import { api } from "../../api/client";

// Arma un FormData con los campos de texto + la imagen (si viene) para create/update. JSON
// sigue siendo el camino por defecto — el arrastre de marcador en el lienzo manda solo
// {lon,lat} y no debe pasar por multipart para eso.
function toFormData(rest, imageFile, removeImage) {
  const fd = new FormData();
  Object.entries(rest).forEach(([key, value]) => {
    if (value !== undefined) fd.append(key, value);
  });
  if (imageFile) fd.append("image", imageFile);
  if (removeImage) fd.append("removeImage", "true");
  return fd;
}

export function useHotspotEditor(tourId, sceneId) {
  const [hotspots, setHotspots] = useState([]);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    if (!sceneId) {
      setHotspots([]);
      return;
    }
    try {
      setHotspots(await api.get(`/api/tours/${tourId}/scenes/${sceneId}/hotspots`));
    } catch (err) {
      setError(err.message);
    }
  }, [tourId, sceneId]);

  useEffect(() => {
    reload();
  }, [reload]);

  async function createHotspot(data) {
    const { imageFile, removeImage, ...rest } = data;
    const url = `/api/tours/${tourId}/scenes/${sceneId}/hotspots`;
    if (imageFile || removeImage) {
      await api.post(url, toFormData(rest, imageFile, removeImage), { isFormData: true });
    } else {
      await api.post(url, rest);
    }
    await reload();
  }

  async function updateHotspot(hotspotId, data) {
    const { imageFile, removeImage, ...rest } = data;
    const url = `/api/tours/${tourId}/scenes/${sceneId}/hotspots/${hotspotId}`;
    if (imageFile || removeImage) {
      await api.patch(url, toFormData(rest, imageFile, removeImage), { isFormData: true });
    } else {
      await api.patch(url, rest);
    }
    await reload();
  }

  async function removeHotspot(hotspotId) {
    await api.delete(`/api/tours/${tourId}/scenes/${sceneId}/hotspots/${hotspotId}`);
    await reload();
  }

  return { hotspots, error, createHotspot, updateHotspot, removeHotspot };
}
