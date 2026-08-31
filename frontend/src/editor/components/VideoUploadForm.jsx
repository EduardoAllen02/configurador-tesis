import { useState } from "react";

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
    if (!file) return setError("Selecciona un archivo de video");
    setProcessing(true);
    try {
      const { scenes } = await onUpload({ file, frameInterval });
      setResult(`${scenes.length} escenas creadas.`);
      setFile(null);
      e.target.reset();
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input type="file" accept="video/*" onChange={(e) => setFile(e.target.files[0])} required />
      <input
        type="number"
        min="1"
        value={frameInterval}
        onChange={(e) => setFrameInterval(e.target.value)}
        title="Extraer 1 de cada N frames"
      />
      <button type="submit" disabled={processing}>
        {processing ? "Procesando video…" : "Subir video 360°"}
      </button>
      {result && <p style={{ color: "lightgreen" }}>{result}</p>}
      {error && <p style={{ color: "salmon" }}>{error}</p>}
    </form>
  );
}
