import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import TourViewer from "../viewer/components/TourViewer.jsx";
import AppShell from "../components/ui/AppShell.jsx";
import { PencilIcon } from "../components/ui/Icon.jsx";
import { sceneLabel } from "../editor/utils/sceneLabel.js";

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

  return (
    <AppShell fullBleed crumbs={[{ label: tour?.title ?? "Cargando…" }]}>
      <div style={{ height: "calc(100vh - 53px)", display: "flex", flexDirection: "column" }}>
        {error && <p className="error-text" style={{ padding: "var(--space-4)" }}>{error}</p>}
        {tour && (
          <>
            <div className="row" style={{ padding: "10px var(--space-6)", borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
              <select
                className="select"
                style={{ maxWidth: 260 }}
                value={activeSceneId ?? ""}
                onChange={(e) => setActiveSceneId(e.target.value)}
              >
                {scenes.map((scene, index) => (
                  <option key={scene.id} value={scene.id}>
                    {sceneLabel(scene, index)}
                  </option>
                ))}
              </select>
              <span className="text-faint" style={{ fontSize: 13 }}>
                {scenes.findIndex((s) => s.id === activeSceneId) + 1} / {scenes.length}
              </span>
              <span style={{ flex: 1 }} />
              <Link to={`/tours/${tourId}/edit`} className="btn btn-secondary btn-sm">
                <PencilIcon width={15} height={15} />
                Editar
              </Link>
            </div>
            <div style={{ flex: 1, position: "relative", background: "#111" }}>
              {activeSceneId && (
                <TourViewer scenes={scenes} activeSceneId={activeSceneId} onSceneChange={setActiveSceneId} />
              )}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
