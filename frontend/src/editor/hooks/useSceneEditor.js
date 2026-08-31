import { useCallback, useEffect, useState } from "react";
import { api } from "../../api/client";

export function useSceneEditor(tourId) {
  const [scenes, setScenes] = useState([]);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    try {
      setScenes(await api.get(`/api/tours/${tourId}/scenes`));
    } catch (err) {
      setError(err.message);
    }
  }, [tourId]);

  useEffect(() => {
    reload();
  }, [reload]);

  async function uploadPanorama({ name, file }) {
    const form = new FormData();
    form.append("name", name);
    form.append("panorama", file);
    await api.post(`/api/tours/${tourId}/scenes/upload-panorama`, form, { isFormData: true });
    await reload();
  }

  async function removeScene(sceneId) {
    await api.delete(`/api/tours/${tourId}/scenes/${sceneId}`);
    await reload();
  }

  // Procesa el video síncronamente en el backend (FFmpeg+Sharp) — puede tardar según
  // duración/frameInterval; el caller debe mostrar un estado de "procesando".
  async function uploadVideo({ file, frameInterval }) {
    const form = new FormData();
    form.append("video", file);
    if (frameInterval) form.append("frameInterval", String(frameInterval));
    const result = await api.post(`/api/tours/${tourId}/video-uploads`, form, { isFormData: true });
    await reload();
    return result;
  }

  return { scenes, error, reload, uploadPanorama, uploadVideo, removeScene };
}
