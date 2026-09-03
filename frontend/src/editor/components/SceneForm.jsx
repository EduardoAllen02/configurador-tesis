import { useState } from "react";
import FileDropzone from "../../components/ui/FileDropzone.jsx";
import { ImageIcon } from "../../components/ui/Icon.jsx";

// Alta de escenas en Fase 0: solo panorama_upload (video_frame requiere el pipeline de
// video de una fase posterior; esas escenas de prueba se insertan vía prisma/seed.js).
export default function SceneForm({ onUpload }) {
  const [name, setName] = useState("");
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    if (!file) return setError("Elige una imagen panorámica primero.");
    setUploading(true);
    try {
      await onUpload({ name, file });
      setName("");
      setFile(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card card-pad stack">
      <div className="row" style={{ fontWeight: 600, fontSize: 14.5 }}>
        <ImageIcon width={18} height={18} className="text-soft" />
        Panorámica
      </div>
      <p className="text-soft" style={{ fontSize: 13, marginTop: -8 }}>
        Sube una foto panorámica ya tomada. El visitante navega saltando entre escenas como
        esta vía hotspots.
      </p>

      <div className="field">
        <label className="field-label" htmlFor="pano-name">
          Nombre de la escena
        </label>
        <input
          id="pano-name"
          className="input"
          placeholder="Ej. Sala principal"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <FileDropzone
        icon={<ImageIcon width={20} height={20} />}
        title="Arrastra una imagen o haz clic"
        description="JPG o PNG panorámico (360°)"
        accept="image/*"
        file={file}
        onSelect={setFile}
      />

      {error && <p className="error-text">{error}</p>}

      <button type="submit" className="btn btn-primary" disabled={uploading}>
        {uploading ? "Subiendo…" : "Subir panorámica"}
      </button>
    </form>
  );
}
