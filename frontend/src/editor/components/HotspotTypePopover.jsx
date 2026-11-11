import { sceneLabel } from "../utils/sceneLabel.js";
import { useEffect, useState } from "react";
import FloatingWindow from "../design/panels/FloatingWindow.jsx";
import { InfoIcon, PriceTagIcon, NavArrowIcon } from "../../components/ui/Icon.jsx";
import FileDropzone from "../../components/ui/FileDropzone.jsx";
import { createHotspotDetail } from "../../runtime/model/hotspotDetail.js";
import HotspotStyleEditor, { FALLBACK_STYLE } from "./HotspotStyleEditor.jsx";

// Creation is explicit. Once persisted, all further editing uses the single
// in-place session and inspector, never a second canvas or nested detail window.
export default function HotspotTypePopover({ scenes, currentSceneId, onSave, onClose, previewId, onPreviewDraft, onPreviewStyle }) {
  const [type, setType] = useState("info"), [title, setTitle] = useState(""), [description, setDescription] = useState("");
  const [price, setPrice] = useState(""), [targetSceneId, setTarget] = useState("");
  const [imageFile, setImage] = useState(null), [image, setImageUrl] = useState("");
  const [style, setStyle] = useState(FALLBACK_STYLE), [detail, setDetail] = useState(() => createHotspotDetail());
  const [saving, setSaving] = useState(false), [error, setError] = useState(null);
  useEffect(() => {
    const url = imageFile ? URL.createObjectURL(imageFile) : ""; setImageUrl(url);
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [imageFile]);
  useEffect(() => { onPreviewStyle?.(previewId, style); onPreviewDraft?.(previewId, { type, title, description, price, targetSceneId, image, content: { detail } }); }, [type,title,description,price,targetSceneId,image,style,detail]);
  const others = scenes.filter(s => s.id !== currentSceneId);
  const submit = async event => {
    event.preventDefault(); setError(null);
    if (type !== "nav" && !title.trim()) return setError("Ponle un título.");
    if (type === "price" && !price.trim()) return setError("Ponle un precio.");
    if (type === "nav" && !targetSceneId) return setError("Elige la escena de destino.");
    setSaving(true);
    try { await onSave({ type, title: title.trim() || `Ir a ${others.find(s => s.id === targetSceneId)?.nombre || "escena"}`, description, ...(type === "price" ? { price } : {}), ...(type === "nav" ? { targetSceneId } : {}), style, content: { detail }, imageFile }); }
    catch(e) { setError(e.message); setSaving(false); }
  };
  return <FloatingWindow title="Agregar hotspot" windowKey="hotspot-unified" onClose={onClose}>
    <form className="hotspot-popover-form hs-inspector" onSubmit={submit}>
      <div className="hse-row"><strong>Tipo</strong><div className="hse-seg">{[["info","Información",InfoIcon],["price","Precio",PriceTagIcon],["nav","Navegación",NavArrowIcon]].map(([value,label,Icon]) => <button type="button" key={value} title={label} aria-label={label} aria-pressed={type === value} className={type === value ? "hse-seg-active" : ""} onClick={() => setType(value)}><Icon width={21} height={21} /></button>)}</div></div>
      <label>Título<input className="input" value={title} onChange={e => setTitle(e.target.value)} autoFocus /></label>
      <label>Descripción<textarea className="input" rows={1} value={description} onChange={e => setDescription(e.target.value)} /></label>
      {type === "price" && <label>Precio<input className="input" value={price} onChange={e => setPrice(e.target.value)} /></label>}
      {type === "nav" && <label>Destino<select className="select" value={targetSceneId} onChange={e => setTarget(e.target.value)}><option value="">Elige una escena</option>{others.map(s => <option key={s.id} value={s.id}>{sceneLabel(s, scenes.indexOf(s))}</option>)}</select></label>}
      <FileDropzone accept="image/*" title="Imagen del hotspot" file={imageFile} onSelect={setImage} />
      {image && <img src={image} alt="Imagen elegida" className="hs-inspector-image" />}
      <label className="hs-inspector-check"><input type="checkbox" checked={detail.enabled} onChange={e => setDetail(d => ({ ...d, enabled:e.target.checked }))} />Mostrar detalle</label>
      <details><summary>Aspecto del marcador</summary><HotspotStyleEditor type={type} value={style} onChange={setStyle} hasOwnStyle={false} applyTo="this" onApplyToChange={() => {}} allDisabled /></details>
      {error && <p role="alert" className="error-text">{error}</p>}
      <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Creando…" : "Agregar hotspot"}</button>
    </form>
  </FloatingWindow>;
}
