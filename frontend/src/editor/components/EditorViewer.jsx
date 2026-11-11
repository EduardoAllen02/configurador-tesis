import { CARD_HOSTS, hotspotPieceRequest } from "../../runtime/model/hotspotCard.js";
import UnifiedHotspotEditor from "./UnifiedHotspotEditor.jsx";
import { hotspotsToClear, withPreset } from "../../runtime/templates/hotspots/styleOps.js";
import { exteriorLayout } from "../hotspotSession.js";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { api } from "../../api/client";
import { buildDocFromLegacy } from "../../runtime/adapters/legacyDoc.js";
import { buildModel } from "../../runtime/model/tourModel.js";
import { defaultSegment, normalizeSegments, segmentAt, withKey } from "../../runtime/model/segments.js";
import { useEditorViewer } from "../hooks/useEditorViewer.js";
import { useTourDesign } from "../hooks/useTourDesign.jsx";
import FrameTimeline from "./FrameTimeline.jsx";
import HotspotTypePopover from "./HotspotTypePopover.jsx";

// Lienzo de edición: la panorámica activa en vivo, con clic derecho para colocar un
// hotspot y arrastre para reposicionar uno existente — reemplaza el viejo flujo de
// "escribe longitud/latitud a ciegas". "popover" trae su propio modo (creando vs.
// editando uno existente) y su posición de anclaje en pantalla.
//
// Expone un handle imperativo (focusHotspot/openEditPopover) para que la lista de
// hotspots de TourEditorPage — que vive fuera de este componente — pueda animar la
// cámara o abrir el mismo popover de edición sin duplicar ese estado ahí afuera.
//
// Video: si la escena activa es un cuadro de video, debajo del lienzo va la línea de tiempo del
// lote. Un hotspot nuevo nace con un segmento de 30 cuadros, y arrastrar un hotspot dentro de su
// segmento escribe un keyframe en ese cuadro (su lon/lat base no cambia). `hotspots` son TODOS los
// del tour: el motor decide cuáles se ven en cada cuadro. `onFrameChange(sceneId)` avisa a la
// página qué cuadro quedó activo.
const EditorViewer = forwardRef(function EditorViewer(
  {
    scene,
    hotspots,
    scenes,
    onCreateHotspot,
    onUpdateHotspot,
    onDeleteHotspot,
    onNavigateScene,
    onFrameChange,
    theme,
  },
  ref
) {
  const containerRef = useRef(null);
  const sessionRef = useRef(null);
  const sessionCache = useRef(new Map());
  const [popover, setPopover] = useState(null); // { hotspot?, initial?, anchor }
  const [selectedId, setSelectedId] = useState(null); // hotspot elegido en la línea de tiempo
  const [assets, setAssets] = useState({});
  const [assetRevision, setAssetRevision] = useState(0);
  const reloadAssets = useCallback(() => setAssetRevision((v) => v + 1), []);
  const [interactionError, setInteractionError] = useState(null);
  // Estilo en edición del popover, aplicado solo al lienzo hasta guardar: { id, style }.
  const [stylePreview, setStylePreview] = useState(null);
  const [cardPlacement, setCardPlacement] = useState(null);
  const [hotspotMove, setHotspotMove] = useState(null);
  const [hotspotResize, setHotspotResize] = useState(null);
  const [hotspotDraft, setHotspotDraft] = useState(null);
  const [detailTest, setDetailTest] = useState(null);
  const previewDraft = useCallback((id, patch) => setHotspotDraft({ id, patch }), []);
  const testDetail = useCallback((id, open) => setDetailTest({ id, open }), []);
  const previewStyle = useCallback((id, style) => setStylePreview(style === undefined ? null : { id, style }), []);
  const { design, saveDesign } = useTourDesign();
  const [testing, setTesting] = useState(false), [showHint, setShowHint] = useState(true);
  useEffect(() => { setShowHint(true); const timer = setTimeout(() => setShowHint(false), 5000); return () => clearTimeout(timer); }, [scene?.id]);

  // Lote de video de la escena activa (mismo criterio de lotes que el motor).
  const model = useMemo(() => buildModel({ scenes }), [scenes]);
  const located = scene ? model.batchByScene.get(scene.id) : null;
  const batch = scene?.origen === "video_frame" ? (located?.batch ?? null) : null;
  const frameIndex = located?.index ?? 0;
  const lastIndex = batch ? batch.scenes.length - 1 : 0;
  const timelineItems = useMemo(() => {
    if (!batch) return [];
    const items = [];
    batch.scenes.forEach((s, ownIndex) => {
      hotspots.filter((h) => h.sceneId === s.id).forEach((hotspot) => items.push({ hotspot, ownIndex }));
    });
    return items;
  }, [batch, hotspots]);

  // Los assets del tour (logo del nadir…) viajan en el documento: "asset:<id>" se resuelve con ellos.
  const coverImage = design?.nadir?.cover?.image ?? null;
  const tourId = scene?.tourId;
  useEffect(() => {
    if (!tourId) return undefined;
    let cancelled = false;
    api
      .get(`/api/tours/${tourId}/assets`)
      .then((rows) => {
        if (cancelled) return;
        setAssets(
          Object.fromEntries(
            rows.map((a) => [
              a.id,
              { kind: a.kind, url: api.uploadUrl(a.path), mime: a.mime, width: a.width, height: a.height, name: a.originalName },
            ])
          )
        );
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [tourId, coverImage, assetRevision]);

  // El motor es el mismo del visor: se le da un TourDocument con todas las escenas, TODOS los
  // hotspots del tour (el motor decide cuáles se ven en el cuadro activo) y el diseño real
  // (mientras carga, el derivado de theme).
  const markerSnapshot = hotspot => {
    const wrapper = containerRef.current?.querySelector(`.hs-marker[data-hotspot-id="${CSS.escape(hotspot.id)}"]`);
    const card = wrapper?.querySelector(CARD_HOSTS);
    return card && !card.classList.contains("hs-detail-expanded") ? hotspotPieceRequest(card, wrapper, hotspot).snapshot : undefined;
  };
  const doc = useMemo(
    () => {
      const next = {
      ...buildDocFromLegacy({
        tour: { id: scene?.tourId ?? "", title: "", theme: theme ?? null, design },
        scenes,
        hotspots: [...hotspots, ...(popover && !popover.hotspot && hotspotDraft ? [{ id: "__draft-hotspot", sceneId: scene?.id, ...popover.initial }] : [])].map((h) => ({ ...h,
          ...(hotspotDraft?.id === h.id ? hotspotDraft.patch : {}),
          ...(stylePreview?.id === h.id ? { style: stylePreview.style } : {}),
        })),
        resolveUrl: api.uploadUrl,
      }),
      assets,
      };
      if (hotspotDraft) next.hotspots = next.hotspots.map((h) => h.id === hotspotDraft.id ? { ...h, image: hotspotDraft.patch.image } : h);
      return next;
    },
    [scenes, hotspots, stylePreview, hotspotDraft, popover, theme, design, scene?.tourId, scene?.id, assets]
  );

  const { ready, loadError, focusHotspot, goToFrame, previewHotspotDetail, setHotspotTesting } = useEditorViewer({
    selectedHotspotId: selectedId,
    containerRef,
    doc,
    sceneId: scene?.id ?? null,
    onRequestCreateHotspot: ({ lon, lat, clientX, clientY }) => {
      setPopover({ initial: { lon, lat }, anchor: { x: clientX, y: clientY } });
    },
    onHotspotMoved: (hotspotId, { lon, lat, frameIndex: movedFrame }) => {
      // Dentro de su segmento, arrastrar un hotspot de video escribe el keyframe de ESE cuadro; el
      // resto (panorámicas, hotspots viejos de video) mueve su lon/lat como siempre.
      const raw = hotspots.find((h) => h.id === hotspotId);
      if (popover && !popover.hotspot && hotspotId === (popover.hotspot?.id ?? "__draft-hotspot")) {
        let patch = { lon, lat };
        if (batch && raw && Number.isInteger(movedFrame)) {
          const segments = normalizeSegments(hotspotDraft?.patch?.segments ?? raw.segments, lastIndex);
          if (segmentAt(segments, movedFrame)) patch = { segments: withKey(segments, movedFrame, { lon, lat }, lastIndex) };
        }
        setHotspotMove({ id: hotspotId, patch });
        setHotspotDraft((d) => ({ id: hotspotId, patch: { ...d?.patch, ...patch } }));
        return;
      }
      if (batch && raw && Number.isInteger(movedFrame)) {
        const segments = normalizeSegments(raw.segments, lastIndex);
        if (segmentAt(segments, movedFrame)) {
          onUpdateHotspot(hotspotId, { segments: withKey(segments, movedFrame, { lon, lat }, lastIndex) });
          return;
        }
      }
      onUpdateHotspot(hotspotId, { lon, lat });
    },
    onHotspotStyleMoved: async (id, style) => {
      if (popover?.hotspot?.id === id && sessionRef.current) { sessionRef.current.patchData({ style }); return; }
      if (popover && !popover.hotspot && id === (popover.hotspot?.id ?? "__draft-hotspot")) {
        setCardPlacement({ id, style });
        setStylePreview({ id, style });
        return;
      }
      try { await onUpdateHotspot(id, { style }); setInteractionError(null); }
      catch (err) { setInteractionError(err.message); }
    },
    onHotspotResized: async (id, patch) => {
      if (popover?.hotspot?.id === id && sessionRef.current) {
        if (patch.style) sessionRef.current.patchData({ style: patch.style });
        for (const surface of ["card", "detail"]) if (patch.content?.[surface]) sessionRef.current.patchLayout(surface, exteriorLayout(patch.content[surface], surface), true);
        return;
      }
      if (popover && !popover.hotspot && id === (popover.hotspot?.id ?? "__draft-hotspot")) {
        setHotspotResize({ id, patch });
        if (patch.style) setStylePreview({ id, style: patch.style });
        setHotspotDraft((current) => ({ id, patch: { ...current?.patch, ...patch } }));
        return;
      }
      try { await onUpdateHotspot(id, patch); setInteractionError(null); }
      catch (err) { setInteractionError(err.message); }
    },
    onEditHotspotPiece: (hotspot, piece, rect) => {
      const raw = hotspots.find(h => h.id === hotspot.id) ?? hotspot;
      setSelectedId(raw.id);
      setPopover(current => ({ ...(current?.hotspot?.id === raw.id ? current : {}), hotspot: raw, piece: { ...piece, requestId: Date.now() }, openRequest: Date.now(), anchor: { x: rect.right, y: rect.top } }));
    },
    onOpenHotspot: (hotspot, rect) => {
      // El motor entrega el hotspot con forma de documento (image = URL); el popover necesita
      // la fila original (imagePath, etc.).
      const raw = hotspots.find((h) => h.id === hotspot.id) ?? hotspot;
      setSelectedId(raw.id);
      setPopover({ hotspot: raw, snapshot: markerSnapshot(hotspot), openRequest: Date.now(), anchor: { x: rect.right, y: rect.top + rect.height / 2 } });
    },
    onNavigateHotspot: onNavigateScene,
    onFrameChange,
  });
  useEffect(() => { setHotspotTesting(testing); }, [testing]);
  useEffect(() => { previewHotspotDetail(detailTest?.id, !!detailTest?.open); }, [doc, detailTest]);

  useImperativeHandle(ref, () => ({
    focusHotspot,
    flush: () => Promise.all([...sessionCache.current.values()].filter(store => store.hasUnsavedChanges()).map(store => store.flush())),
    openEditPopover: (hotspot, anchor) => {
      const raw = hotspots.find((h) => h.id === hotspot.id) ?? hotspot;
      setSelectedId(raw.id);
      setPopover({ hotspot: raw, snapshot: markerSnapshot(hotspot), openRequest: Date.now(), anchor });
    },
  }));

  useEffect(() => {
    if (!popover) { setStylePreview(null); setCardPlacement(null); setHotspotMove(null); setHotspotResize(null); setHotspotDraft(null); setDetailTest(null); }
  }, [popover]);

  useEffect(() => {
    sessionRef.current?.flush().catch(() => {});
    setPopover(null);
  }, [scene?.id]);

  async function handleSave(data) {
    if (popover.hotspot) {
      await onUpdateHotspot(popover.hotspot.id, data);
    } else {
      const { lon, lat } = popover.initial;
      // En un cuadro de video el hotspot nace con un segmento de 30 cuadros (o hasta el último).
      const segments = batch ? [defaultSegment(frameIndex, lastIndex, { lon, lat })] : undefined;
      const created = await onCreateHotspot({ lon, lat, segments, ...data });
      setStylePreview(null); setHotspotDraft(null);
      if (created?.id) { setSelectedId(created.id); setPopover({ hotspot:created, openRequest:Date.now() }); return; }
    }
    setPopover(null);
  }

  async function handleDelete() {
    await onDeleteHotspot(popover.hotspot.id);
    setPopover(null);
  }

  const style = {
    "--tour-accent": doc.design.brand?.colors?.[0] || "#4da3ff",
    "--tour-radius": `${doc.design.brand?.radius ?? 8}px`,
  };

  return (
    <div className="editor-viewer-stack">
      {interactionError && <p className="error-text">{interactionError}</p>}
      <div className="editor-viewer" style={style}>
        <div ref={containerRef} className="editor-viewer-canvas" />
        {loadError && (
          <div className="editor-viewer-loading">No pudimos cargar esta panorámica. Prueba subiéndola de nuevo.</div>
        )}
        {!ready && !loadError && (
          <div className="editor-viewer-loading">
            <span className="spinner" />
            Cargando panorámica…
          </div>
        )}
        {ready && showHint && (
          <p className="editor-viewer-hint">
            {batch
              ? "Clic derecho para agregar un hotspot · arrastra uno para fijar su posición en este cuadro"
              : "Clic derecho para agregar · arrastra la tarjeta para separarla o el punto para mover todo"}
          </p>
        )}
        {popover?.hotspot && <UnifiedHotspotEditor key={popover.hotspot.id} cachedSession={sessionCache.current.get(popover.hotspot.id)} hotspot={popover.hotspot} markerSnapshot={popover.snapshot} host={containerRef.current} pieceRequest={popover.piece} openRequest={popover.openRequest} scenes={scenes} design={design}
          onTesting={setTesting} onApplyStyle={async (type, style) => {
            await Promise.all(hotspotsToClear(hotspots, type, popover.hotspot.id).map(h => onUpdateHotspot(h.id, { style: null })));
            await saveDesign(prev => withPreset(prev, type, style));
            for (const id of sessionCache.current.keys()) if (id !== popover.hotspot.id) sessionCache.current.delete(id);
          }} onPersist={async data => {
            const saved = await onUpdateHotspot(popover.hotspot.id, data);
            if (data.detailApplyTo && data.detailApplyTo !== "this") for (const id of sessionCache.current.keys()) if (id !== popover.hotspot.id) sessionCache.current.delete(id);
            return saved;
          }} onSession={store => { sessionRef.current = store; if (store) sessionCache.current.set(popover.hotspot.id, store); }}
          onClose={() => {}} onDelete={handleDelete} onPreviewStyle={previewStyle} onPreviewDraft={previewDraft} onTestDetail={testDetail} />}
        {popover && !popover.hotspot && (
          <HotspotTypePopover previewId="__draft-hotspot" scenes={scenes} currentSceneId={scene?.id} onSave={handleSave} onClose={() => setPopover(null)} onPreviewStyle={previewStyle} onPreviewDraft={previewDraft}
          />
        )}
      </div>
      {batch && (
        <FrameTimeline
          frameCount={batch.scenes.length}
          frameIndex={frameIndex}
          onSeek={goToFrame}
          items={timelineItems}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onSegmentsChange={(hotspotId, segments) => onUpdateHotspot(hotspotId, { segments })}
        />
      )}
    </div>
  );
});

export default EditorViewer;
