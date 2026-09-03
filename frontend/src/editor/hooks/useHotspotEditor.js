import { useCallback, useEffect, useState } from "react";
import { api } from "../../api/client";

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
    await api.post(`/api/tours/${tourId}/scenes/${sceneId}/hotspots`, data);
    await reload();
  }

  async function updateHotspot(hotspotId, data) {
    await api.patch(`/api/tours/${tourId}/scenes/${sceneId}/hotspots/${hotspotId}`, data);
    await reload();
  }

  async function removeHotspot(hotspotId) {
    await api.delete(`/api/tours/${tourId}/scenes/${sceneId}/hotspots/${hotspotId}`);
    await reload();
  }

  return { hotspots, error, createHotspot, updateHotspot, removeHotspot };
}
