import { sceneLabel } from "../utils/sceneLabel.js";
import { useState } from "react";
import { InfoIcon, PriceTagIcon, NavArrowIcon } from "../../components/ui/Icon.jsx";
import FloatingWindow from "../design/panels/FloatingWindow.jsx";
import HotspotStyleEditor, { FALLBACK_STYLE, resolveStyle } from "./HotspotStyleEditor.jsx";
import { DETAIL_TEMPLATES, replaceDetailTemplate } from "../../runtime/model/hotspotDetail.js";
import { useDesignState } from "../hooks/useTourDesign.jsx";
import { api } from "../../api/client.js";
import { sessionLayout } from "../hotspotSession.js";

function DataField({ label, value, onCommit, multiline = false }) {
  const [text, setText] = useState(String(value ?? ""));
  const Input = multiline ? "textarea" : "input";
  return <label>{label}<Input className="input" value={text} rows={1} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !multiline) { e.preventDefault(); e.currentTarget.blur(); } }} onBlur={() => { if (text !== String(value ?? "")) onCommit(text); }} /></label>;
}
export default function HotspotInspector({ store, scenes, design, onClose, onSelectSurface, onDelete, onUpload, onApplyDetail, onApplyStyle }) {
  const doc = useDesignState(s => s.design), data = doc.hotspotData, detail = sessionLayout(doc, "detail");
  const [pendingType, setPendingType] = useState(data.type);
  const [scope, setScope] = useState("this"), [styleScope, setStyleScope] = useState("this");
  const [uploadError, setUploadError] = useState(null), [uploading, setUploading] = useState(false);
  const style = resolveStyle(data.style || design?.hotspotPresets?.[pendingType] || FALLBACK_STYLE);
  const patch = value => store.patchLayout("detail", value);
  const field = (key, label, multiline) => <DataField key={`${data.id}-${key}-${data[key]}`} label={label} value={data[key]} multiline={multiline} onCommit={v => store.patchData({ [key]: v, ...(key === "price" && v.trim() ? { type:pendingType } : {}) })} />;
  return <FloatingWindow title="Hotspot" windowKey="hotspot-unified" onClose={onClose}>
    <div className="hs-inspector">
      <details open><summary>Datos</summary>
        <div className="hse-row"><strong>Tipo</strong><div className="hse-seg" role="group" aria-label="Tipo de hotspot">{[["info","Información",InfoIcon],["price","Precio",PriceTagIcon],["nav","Navegación",NavArrowIcon]].map(([type,label,Icon]) => <button type="button" key={type} title={label} aria-label={label} aria-pressed={pendingType === type} className={pendingType === type ? "hse-seg-active" : ""} onClick={() => { setPendingType(type); if (type === "info" || type === "price" && data.price || type === "nav" && data.targetSceneId) store.patchData({ type }); }}><Icon width={21} height={21} /></button>)}</div></div>
        {field("title", "Título")}{field("description", "Descripción", true)}
        {pendingType === "price" && field("price", "Precio")}
        {pendingType === "nav" && <label>Destino<select className="select" aria-label="Escena de destino" value={data.targetSceneId || ""} onChange={e => e.target.value && store.patchData({ type:pendingType, targetSceneId: e.target.value })}><option value="">Elige una escena</option>{scenes.filter(s => s.id !== data.sceneId).map(s => <option key={s.id} value={s.id}>{sceneLabel(s, scenes.indexOf(s))}</option>)}</select></label>}
        {pendingType !== data.type && <p className="sp-hint" role="status">Completa {pendingType === "price" ? "el precio" : "el destino"} para cambiar el tipo.</p>}
        <label>Imagen{data.image && <img className="hs-inspector-image" src={data.image} alt="Imagen del hotspot" />}<input aria-label="Imagen del hotspot" type="file" accept="image/*" disabled={uploading} onChange={async e => {
          const file = e.target.files?.[0]; if (!file) return;
          setUploading(true); setUploadError(null);
          try { const saved = await onUpload({ imageFile: file }); store.patchData({ imagePath: saved.imagePath, image: api.uploadUrl(saved.imagePath) }); }
          catch (err) { setUploadError(err.message); } finally { setUploading(false); }
        }} /></label>
        {data.image && <button type="button" className="btn btn-ghost btn-sm" onClick={async () => { try { await onUpload({ removeImage: true }); store.patchData({ imagePath: null, image: "" }); } catch(e) { setUploadError(e.message); } }}>Quitar imagen</button>}
        {uploading && <p role="status">Subiendo imagen…</p>}{uploadError && <p role="alert">{uploadError}</p>}
      </details>
      <details><summary>Aspecto del marcador</summary><HotspotStyleEditor type={data.type} value={style} onChange={style => store.patchData({ style })} hasOwnStyle={!!data.style} onReset={() => store.patchData({ style: null })} applyTo={styleScope} onApplyToChange={setStyleScope} allDisabled={!onApplyStyle} locked={data.locked} />
        {styleScope === "all" && <button type="button" className="btn btn-secondary" onClick={async () => { try { await store.flush(); await onApplyStyle(data.type, style); if (!data.locked) store.patchData({ style: null }); setStyleScope("this"); } catch (e) { setUploadError(e.message); } }}>Aplicar estilo al tipo</button>}
        <button type="button" className="btn btn-secondary" onClick={() => onSelectSurface("card")}>Seleccionar marcador</button>
      </details>
      <details open><summary>Detalle</summary>
        <label className="hs-inspector-check"><input type="checkbox" checked={detail.enabled} onChange={e => patch({ enabled: e.target.checked })} />Mostrar detalle</label>
        {detail.enabled && <>
          <label>Dónde aparece<select className="select" aria-label="Dónde aparece el detalle" value={detail.placement} onChange={e => patch({ placement: e.target.value })}><option value="inline">Dentro de la tarjeta</option><option value="screen">En una esquina</option></select></label>
          {detail.placement === "inline" && <label>Cuándo aparece<select className="select" aria-label="Cuándo aparece el detalle" value={detail.reveal} onChange={e => patch({ reveal: e.target.value })}><option value="click">Al pulsar</option><option value="always">Siempre visible</option></select></label>}
          {detail.placement === "screen" && ["desktop", "mobile"].map(device => <label key={device}>Posición {device === "mobile" ? "en móvil" : "en escritorio"}<select className="select" aria-label={`Posición del detalle ${device}`} value={detail.position[device]} onChange={e => patch({ position: { ...detail.position, [device]: e.target.value } })}>{["right", "left", "center", "bottom", "custom"].map(p => <option key={p} value={p}>{{right:"Derecha",left:"Izquierda",center:"Centro",bottom:"Abajo",custom:"Manual"}[p]}</option>)}</select></label>)}
          <div className="hs-detail-recipes">{DETAIL_TEMPLATES.map(t => <button type="button" className={`btn btn-sm ${detail.template === t.id ? "btn-primary" : "btn-secondary"}`} key={t.id} onClick={() => { const layout = replaceDetailTemplate(detail, t.id, data.type); layout.geometry = "outer"; store.patchLayout("detail", layout, true); onSelectSurface("detail"); }}>{t.name}</button>)}</div>
          <fieldset className="hs-detail-fields"><legend>Contenido visible</legend>{[["title","Título"],["image","Imagen"],["description","Descripción"],["price","Precio"]].map(([key,label]) => <label key={key}><input type="checkbox" checked={detail.fields[key] !== false} onChange={e => patch({ fields: { ...detail.fields, [key]: e.target.checked } })} />{label}</label>)}</fieldset>
          <button type="button" className="btn btn-secondary" onClick={() => onSelectSurface("detail")}>Seleccionar detalle</button>
        </>}
        <label>Aplicar detalle a<select className="select" value={scope} onChange={e => setScope(e.target.value)}><option value="this">Solo este hotspot</option><option value="type">Los de este tipo</option><option value="all">Todos los hotspots</option></select></label>
        {scope !== "this" && <button type="button" className="btn btn-secondary" onClick={() => onApplyDetail(scope)}>Aplicar a {scope === "type" ? "este tipo" : "todos"}</button>}
      </details>
      <button type="button" className="btn btn-ghost" onClick={onDelete}>Eliminar hotspot</button>
    </div>
  </FloatingWindow>;
}
