import { useState } from "react";
import FileDropzone from "../../components/ui/FileDropzone.jsx";
import { VideoIcon } from "../../components/ui/Icon.jsx";

// Sube un video 360° y dispara el pipeline FFmpeg+Sharp en el backend (síncrono):
// crea una escena origen=video_frame por frame extraído. Puede tardar según la
// duración del video y el frameInterval elegido (más alto = menos frames).
export default function VideoUploadForm({ onUpload }) {
  const [file, setFile] = useState(null);
  const [frameInterval, setFrameInterval] = useState(30);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setResult(null);
    if (!file) return setError("Elige un video primero.");
    setProcessing(true);
    try {
      const { scenes } = await onUpload({ file, frameInterval });
      setResult(`Listo — se crearon ${scenes.length} escenas.`);
      setFile(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card card-pad stack">
      <div className="row" style={{ fontWeight: 600, fontSize: 14.5 }}>
        <VideoIcon width={18} height={18} className="text-soft" />
        Video 360°
      </div>
      <p className="text-soft" style={{ fontSize: 14, lineHeight: 1.5 }}>
        Sube un recorrido en video. Se procesa automáticamente: extraemos frames y cada uno
        se vuelve una escena navegable en secuencia, como avanzar por el recorrido.
      </p>

      <FileDropzone
        icon={<VideoIcon width={20} height={20} />}
        title="Arrastra un video o haz clic"
        description="MP4, MOV — grabado en 360°"
        accept="video/*"
        file={file}
        onSelect={setFile}
      />

      <div className="field">
        <label className="field-label" htmlFor="frame-interval">
          Densidad de frames
        </label>
        <input
          id="frame-interval"
          className="input"
          type="number"
          min="1"
          value={frameInterval}
          onChange={(e) => setFrameInterval(e.target.value)}
        />
        <span className="helper-text">Se guarda 1 de cada {frameInterval || "N"} frames — más alto es más rápido de procesar, más bajo es más fluido.</span>
      </div>

      {result && <p style={{ fontSize: 14, color: "var(--success)" }}>{result}</p>}
      {error && <p className="error-text">{error}</p>}

      <button type="submit" className="btn btn-primary" disabled={processing}>
        {processing ? "Procesando video…" : "Subir video 360°"}
      </button>
    </form>
  );
}
