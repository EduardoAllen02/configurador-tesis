import { useRef } from "react";
import { useDesignEditor, useDesignState } from "../../hooks/useTourDesign.jsx";
import { ColorChip, ImageGrid, RangeEditor } from "./controls.jsx";
import { useAssets, useUpload } from "./hooks.js";
import { setIntroBackground } from "./logic.js";
import { Ico, PopButton, Segmented, Switch } from "./ui.jsx";

// Controles de la pantalla de inicio cuando no hay nada seleccionado en "Inicio":
// entrada automática, fondo (video, imagen o color) con póster opcional, oscurecer,
// cuadrícula y parallax. Todo se escribe en design.screens.intro.

function VideoList({ value, onPick, close }) {
  const videos = useAssets("video");
  const { busy, progress, error, upload } = useUpload();
  const fileRef = useRef(null);
  const pick = (id) => {
    onPick(`asset:${id}`);
    close?.();
  };
  return (
    <div className="sp-pop-body">
      <div className="sp-row">
        <button type="button" className="sp-btn" disabled={busy} onClick={() => fileRef.current?.click()}>
          <Ico name="upload" size={16} /> {busy ? `Subiendo ${Math.round(progress * 100)} %` : "Subir video"}
        </button>
        <input ref={fileRef} type="file" accept="video/mp4,video/webm" hidden onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) { const a = await upload(f); if (a?.id) pick(a.id); } }} />
      </div>
      {error && <p className="sp-error">{error}</p>}
      {videos.length === 0 ? (
        <p className="sp-hint">Aún no hay videos subidos (MP4 o WebM, hasta 200 MB).</p>
      ) : (
        <div className="sp-list">
          {videos.map((v) => (
            <button key={v.id} type="button" className={`sp-asset-row${value === `asset:${v.id}` ? " is-active" : ""}`} onClick={() => pick(v.id)}>
              <Ico name="video" size={18} />
              <span>{v.name || "Video"}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function IntroBar() {
  const store = useDesignEditor();
  const intro = useDesignState((s) => s.design?.screens?.intro);
  const bg = intro?.background ?? {};
  const kind = bg.kind ?? "color";
  const assets = useAssets();
  const setBg = (patch, label, mergeKey) => store.apply((d) => setIntroBackground(d, patch), { label, mergeKey });
  const assetName = (ref) => assets.find((a) => ref === `asset:${a.id}`)?.name;
  const grid = bg.grid ?? {};
  const gridOn = grid.on !== false;
  const scrimOpacity = Number.isFinite(bg.scrim?.opacity) ? bg.scrim.opacity : 1;

  return (
    <>
      <label className="sp-tb-group" title="Entra al recorrido cuando termina de cargar la primera panorámica">
        <span className="sp-tb-text">Entrar solo al terminar</span>
        <Switch checked={!!intro?.autoEnter} label="Entrar solo al terminar" onChange={(autoEnter) => store.apply((d) => setIntro(d, { autoEnter }), { label: "Entrada automática" })} />
      </label>
      <span className="sp-tb-sep" />
      <span className="sp-tb-group">
        <span className="sp-tb-text sp-tb-long">Fondo</span>
        <Segmented
          label="Tipo de fondo"
          value={kind}
          options={[
            { value: "video", label: "Video" },
            { value: "image", label: "Imagen" },
            { value: "color", label: "Color" },
          ]}
          onChange={(v) => setBg({ kind: v }, "Fondo de inicio")}
        />
        {kind === "video" && (
          <>
            <PopButton buttonClass="sp-tb-btn" title="Elegir video" width={300} content={({ close }) => <VideoList value={bg.asset} onPick={(ref) => setBg({ asset: ref }, "Video de inicio")} close={close} />}>
              <Ico name="video" size={16} />
              <span className="sp-tb-text sp-clip">{assetName(bg.asset) || "Elegir video"}</span>
            </PopButton>
            <PopButton buttonClass="sp-tb-btn" title="Imagen que se ve mientras carga el video" width={300} content={({ close }) => <ImageGrid value={bg.poster} onChange={(ref) => setBg({ poster: ref ?? undefined }, "Póster de inicio")} close={close} />}>
              <Ico name="image" size={16} />
              <span className="sp-tb-text">{bg.poster ? "Póster" : "Agregar póster"}</span>
            </PopButton>
          </>
        )}
        {kind === "image" && (
          <PopButton buttonClass="sp-tb-btn" title="Elegir imagen" width={300} content={({ close }) => <ImageGrid value={bg.asset} onChange={(ref) => setBg({ asset: ref ?? undefined }, "Imagen de inicio")} close={close} />}>
            <Ico name="image" size={16} />
            <span className="sp-tb-text sp-clip">{assetName(bg.asset) || "Elegir imagen"}</span>
          </PopButton>
        )}
        {kind === "color" && (
          <button type="button" className="sp-tb-btn sp-tb-color" title="Color de fondo" aria-label="Color de fondo: cambiar" onClick={() => store.openPanel("color", { target: "intro-bg" })}>
            <ColorChip value={bg.color} />
            <span className="sp-tb-text">Color</span>
          </button>
        )}
      </span>
      <span className="sp-tb-sep" />
      <PopButton buttonClass="sp-tb-btn" title="Oscurecer el fondo" width={260} content={<div className="sp-pop-body"><div className="sp-field-label">Oscurecer el fondo</div><RangeEditor value={Math.round(scrimOpacity * 100)} min={0} max={100} step={5} unit="%" label="Oscurecer" onChange={(v) => setBg({ scrim: { ...(bg.scrim ?? {}), opacity: v / 100 } }, "Oscurecer", "intro.scrim")} /></div>}>
        <span className="sp-tb-text">Oscurecer</span>
        <b className="sp-tb-value">{Math.round(scrimOpacity * 100)}%</b>
      </PopButton>
      <button type="button" className={`sp-tb-btn${gridOn ? " is-active" : ""}`} aria-pressed={gridOn} onClick={() => setBg({ grid: { ...grid, on: !gridOn } }, "Cuadrícula")}>
        <span className="sp-tb-text">Cuadrícula</span>
      </button>
      <button type="button" className={`sp-tb-btn${bg.parallax ? " is-active" : ""}`} aria-pressed={!!bg.parallax} title="El fondo sigue al mouse" onClick={() => setBg({ parallax: !bg.parallax }, "Parallax")}>
        <span className="sp-tb-text">Parallax</span>
      </button>
    </>
  );
}
