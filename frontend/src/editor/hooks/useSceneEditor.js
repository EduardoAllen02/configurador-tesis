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

  // Sube varias panorámicas a la vez, cada una en su propio request (para poder reportar
  // progreso y aparecer en el rail apenas termina, en vez de esperar a que las 20 acaben).
  // Todas comparten un batchId generado en el cliente, así navegan como secuencia
  // (scrubber) igual que los frames de un video. `onFileProgress(index, {status, pct, scene})`
  // deja que el rail dibuje una miniatura-esqueleto por archivo mientras sube.
  async function uploadPanoramasBulk(files, onFileProgress) {
    const batchId = crypto.randomUUID();
    const CONCURRENCY = 3;
    let cursor = 0;

    async function worker() {
      while (cursor < files.length) {
        const index = cursor++;
        const file = files[index];
        onFileProgress?.(index, { status: "uploading", pct: 0 });
        try {
          const form = new FormData();
          form.append("panorama", file);
          form.append("batchId", batchId);
          const scene = await api.uploadWithProgress(
            `/api/tours/${tourId}/scenes/upload-panorama`,
            form,
            (pct) => onFileProgress?.(index, { status: "uploading", pct })
          );
          setScenes((prev) => [...prev, scene]);
          onFileProgress?.(index, { status: "done", pct: 1, scene });
        } catch (err) {
          onFileProgress?.(index, { status: "error", error: err.message });
        }
      }
    }

    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, files.length) }, worker));
  }

  async function reorderScenes(orderedIds) {
    const previous = scenes;
    setScenes((prev) => orderedIds.map((id) => prev.find((s) => s.id === id)).filter(Boolean));
    try {
      await api.patch(
        `/api/tours/${tourId}/scenes/reorder`,
        orderedIds.map((sceneId, orderIndex) => ({ sceneId, orderIndex }))
      );
    } catch (err) {
      setScenes(previous);
      setError(err.message);
    }
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

  return { scenes, error, reload, uploadPanoramasBulk, reorderScenes, uploadVideo, removeScene };
}
