import { useState } from "react";

// Alta de escenas en Fase 0: solo panorama_upload (video_frame requiere el pipeline de
// video de una fase posterior; esas escenas de prueba se insertan vía prisma/seed.js).
export default function SceneForm({ onUpload }) {
  const [name, setName] = useState("");
  const [file, setFile] = useState(null);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    if (!file) return setError("Selecciona una imagen panorámica");
    try {
      await onUpload({ name, file });
      setName("");
      setFile(null);
      e.target.reset();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input placeholder="Nombre de la escena" value={name} onChange={(e) => setName(e.target.value)} required />
      <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files[0])} required />
      <button type="submit">Subir panorámica</button>
      {error && <p style={{ color: "salmon" }}>{error}</p>}
    </form>
  );
}
