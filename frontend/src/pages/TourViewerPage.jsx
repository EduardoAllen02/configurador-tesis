import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import TourViewer from "../viewer/components/TourViewer.jsx";

// Carga el tour + escenas y adjunta los hotspots de cada escena una sola vez, para que
// el visor pueda cambiar de escena/frame sin volver a pedirlos a la API.
export default function TourViewerPage() {
  const { tourId } = useParams();
  const [tour, setTour] = useState(null);
  const [scenes, setScenes] = useState([]);
  const [activeSceneId, setActiveSceneId] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const tourData = await api.get(`/api/tours/${tourId}`);
        const scenesWithHotspots = await Promise.all(
          tourData.scenes.map(async (scene) => ({
            ...scene,
            hotspots: await api.get(`/api/tours/${tourId}/scenes/${scene.id}/hotspots`),
          }))
        );
        if (cancelled) return;
        setTour(tourData);
        setScenes(scenesWithHotspots);
        setActiveSceneId(scenesWithHotspots[0]?.id ?? null);
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [tourId]);

  if (error) return <p style={{ color: "salmon" }}>{error}</p>;
  if (!tour) return <p>Cargando…</p>;

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <header style={{ padding: "0.5rem 1rem", display: "flex", justifyContent: "space-between" }}>
        <Link to="/tours">← Tours</Link>
        <strong>{tour.title}</strong>
        <select value={activeSceneId ?? ""} onChange={(e) => setActiveSceneId(e.target.value)}>
          {scenes.map((scene) => (
            <option key={scene.id} value={scene.id}>
              {scene.name}
            </option>
          ))}
        </select>
      </header>
      <div style={{ flex: 1, position: "relative" }}>
        {activeSceneId && (
          <TourViewer scenes={scenes} activeSceneId={activeSceneId} onSceneChange={setActiveSceneId} />
        )}
      </div>
    </div>
  );
}
