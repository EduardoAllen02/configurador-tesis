import { useState } from "react";
import { PlusIcon } from "../../components/ui/Icon.jsx";
import { sceneLabel } from "../utils/sceneLabel.js";

export default function HotspotForm({ scenes, currentSceneId, onCreate }) {
  const [type, setType] = useState("info");
  const [lon, setLon] = useState(0);
  const [lat, setLat] = useState(0);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [targetSceneId, setTargetSceneId] = useState("");
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    try {
      await onCreate({
        type,
        lon: Number(lon),
        lat: Number(lat),
        title,
        description: description || undefined,
        price: type === "price" ? price : undefined,
        targetSceneId: type === "nav" ? targetSceneId : undefined,
      });
      setTitle("");
      setDescription("");
      setPrice("");
      setTargetSceneId("");
    } catch (err) {
      setError(err.message);
    }
  }

  const otherScenes = scenes.filter((s) => s.id !== currentSceneId);

  return (
    <form onSubmit={handleSubmit} className="card card-pad stack">
      <div className="form-row">
        <div className="field" style={{ maxWidth: 140 }}>
          <label className="field-label">Tipo</label>
          <select className="select" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="info">Info</option>
            <option value="price">Precio</option>
            <option value="nav">Navegación</option>
          </select>
        </div>
        <div className="field" style={{ maxWidth: 100 }}>
          <label className="field-label">Longitud</label>
          <input className="input" type="number" value={lon} onChange={(e) => setLon(e.target.value)} />
        </div>
        <div className="field" style={{ maxWidth: 100 }}>
          <label className="field-label">Latitud</label>
          <input className="input" type="number" value={lat} onChange={(e) => setLat(e.target.value)} />
        </div>
      </div>

      <div className="field">
        <label className="field-label">Título</label>
        <input className="input" placeholder="Ej. Cocina remodelada" value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>

      <div className="field">
        <label className="field-label">Descripción (opcional)</label>
        <input className="input" placeholder="Detalles que verá el visitante" value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>

      {type === "price" && (
        <div className="field">
          <label className="field-label">Precio</label>
          <input className="input" placeholder="Ej. $2,500,000" value={price} onChange={(e) => setPrice(e.target.value)} required />
        </div>
      )}

      {type === "nav" && (
        <div className="field">
          <label className="field-label">Escena destino</label>
          <select className="select" value={targetSceneId} onChange={(e) => setTargetSceneId(e.target.value)} required>
            <option value="">Elige a dónde salta…</option>
            {otherScenes.map((s) => (
              <option key={s.id} value={s.id}>
                {sceneLabel(s, scenes.indexOf(s))}
              </option>
            ))}
          </select>
        </div>
      )}

      {error && <p className="error-text">{error}</p>}

      <button type="submit" className="btn btn-primary" style={{ alignSelf: "flex-start" }}>
        <PlusIcon width={16} height={16} />
        Agregar hotspot
      </button>
    </form>
  );
}
