import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { DraftDesignProvider, useDesignState } from "../hooks/useTourDesign.jsx";
import { StudioProvider } from "../design/StudioContext.jsx";
import { createHotspotSession, visibleHotspotSurface } from "../hotspotSession.js";
import { getTemplate } from "../../runtime/templates/index.js";
import { api } from "../../api/client.js";
import { resolveStyle, FALLBACK_STYLE } from "./HotspotStyleEditor.jsx";
import ContextToolbar from "../design/panels/ContextToolbar.jsx";
import LeftRail from "../design/panels/LeftRail.jsx";
import HotspotInspector from "./HotspotInspector.jsx";
import HotspotInPlaceCanvas from "./HotspotInPlaceCanvas.jsx";
import "./UnifiedHotspotEditor.css";

function Workspace({ store, host, hotspot, pieceRequest, openRequest, scenes, design, onClose, onDelete, onPersist, onTestDetail, onTesting, onApplyStyle }) {
  const state = useDesignState(), [inspector, setInspector] = useState(true), [active, setActive] = useState(false);
  const [testing, setTesting] = useState(false);
  useEffect(() => { onTesting(testing); return () => onTesting(false); }, [testing]);
  const surface = state.screen.endsWith('card') ? 'card' : 'detail';
  const previousReveal = useRef(state.design.hotspotLayouts.detail.reveal);
  useEffect(() => {
    const previous = previousReveal.current;
    previousReveal.current = state.design.hotspotLayouts.detail.reveal;
    if (!active || testing) return;
    const visible = visibleHotspotSurface(surface, state.design.hotspotLayouts.detail, previous);
    if (visible !== surface) store.openSurface(visible);
  }, [active, testing, surface, state.design.hotspotLayouts.detail, store]);
  const select = (surface, piece) => { store.openSurface(surface, piece); setActive(true); };
  useEffect(() => { setInspector(!pieceRequest); if (pieceRequest) select(pieceRequest.surface, pieceRequest); }, [pieceRequest?.requestId, openRequest]);
  useEffect(() => {
    onTestDetail(hotspot.id, active && !testing && surface === 'detail');
    return () => onTestDetail(hotspot.id, false);
  }, [active, testing, surface, hotspot.id, onTestDetail]);
  useEffect(() => {
    const unload = event => { if (!store.hasUnsavedChanges()) return; store.flush().catch(() => {}); event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", unload); return () => window.removeEventListener("beforeunload", unload);
  }, [store]);
  useEffect(() => () => { store.flush().catch(() => {}); }, [store]);
  const close = () => { if (document.activeElement?.closest(".hs-inspector")) document.activeElement.blur(); store.setEditing(null); setInspector(false); store.flush().catch(() => {}); onClose(); };
  const status = { saved:'Guardado', dirty:'Guardando…', saving:'Guardando…', error:'No se pudo guardar' }[state.status] || 'Cargando…';
  return <>
    {document.querySelector('.editor-header-right') && createPortal(<div className="hs-header-actions">
      <button className="btn btn-sm" disabled={testing} onClick={() => setInspector(v => !v)}>Hotspot</button>
      <button className="btn btn-sm" disabled={!state.canUndo} onClick={() => store.undo()} aria-label="Deshacer">↶</button><button className="btn btn-sm" disabled={!state.canRedo} onClick={() => store.redo()} aria-label="Rehacer">↷</button>
      <button className="btn btn-sm" aria-pressed={testing} onClick={async () => { try { await store.flush(); setTesting(v => !v); setInspector(false); } catch {} }}>{testing ? "Volver a editar" : "Probar"}</button>
      <span className="hs-save-status" role="status">{status}</span>{state.status==='error' && <button className="btn btn-sm" title={state.error} onClick={() => store.flush().catch(() => {})}>Reintentar</button>}
      {active && <button className="btn btn-sm" title="Deseleccionar" aria-label="Deseleccionar" onClick={() => { setActive(false); store.setEditing(null); store.select([]); }}>×</button>}
    </div>, document.querySelector('.editor-header-right'))}
    {createPortal(<div className="hs-workspace-ui content-studio" data-piece-ui data-ui>

      {active && !testing && <><div className="hs-workspace-library"><LeftRail allowedTabs={['elementos','texto','subidos']} detailMode /></div><div className="hs-context-overlay"><ContextToolbar /></div></>}
    </div>, host.parentElement)}
    {active && !testing && createPortal(<HotspotInPlaceCanvas host={host} hotspotId={hotspot.id} surface={surface} />,host.parentElement)}
    {inspector && !testing && <HotspotInspector store={store} onApplyStyle={onApplyStyle} scenes={scenes} design={design} onClose={close} onSelectSurface={select} onDelete={async () => { try { await store.flush(); await onDelete(); } catch {} }} onUpload={onPersist} onApplyDetail={async scope => { await store.flush(); await onPersist({ ...store.getPatch(), detailApplyTo: scope }); }} />}
  </>;
}
export default function UnifiedHotspotEditor(props) {
  const callbacks = useRef(props); callbacks.current = props;
  const store = useMemo(() => {
    if (props.cachedSession) return props.cachedSession;
    const style = resolveStyle(props.hotspot.style || props.design?.hotspotPresets?.[props.hotspot.type] || FALLBACK_STYLE);
    const hs = { ...props.hotspot, image: props.hotspot.imagePath ? api.uploadUrl(props.hotspot.imagePath) : props.hotspot.image || '', style };
    return createHotspotSession({ hotspot: hs, design: props.design, markerProps: { ...getTemplate(style.template)?.defaults, ...style.props }, snapshot: props.pieceRequest?.surface === "card" ? props.pieceRequest.snapshot : props.markerSnapshot,
      save: patch => callbacks.current.onPersist(patch),
      preview: (patch,image) => { callbacks.current.onPreviewStyle(hs.id, patch.style); callbacks.current.onPreviewDraft(hs.id, { ...patch,image }); },
    });
  }, []);
  useEffect(() => { props.onSession?.(store); return () => props.onSession?.(null); }, [store]);
  if (import.meta.env.DEV) window.__hotspotSession = store;
  return <DraftDesignProvider store={store}><StudioProvider tourId={props.hotspot.tourId || props.scenes[0]?.tourId}><Workspace {...props} store={store} /></StudioProvider></DraftDesignProvider>;
}
