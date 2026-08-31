import { useState } from "react";

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
    <form onSubmit={handleSubmit}>
      <select value={type} onChange={(e) => setType(e.target.value)}>
        <option value="info">info</option>
        <option value="price">price</option>
        <option value="nav">nav</option>
      </select>
      <input type="number" placeholder="lon" value={lon} onChange={(e) => setLon(e.target.value)} />
      <input type="number" placeholder="lat" value={lat} onChange={(e) => setLat(e.target.value)} />
      <input placeholder="Título" value={title} onChange={(e) => setTitle(e.target.value)} required />
      <input placeholder="Descripción" value={description} onChange={(e) => setDescription(e.target.value)} />
      {type === "price" && (
        <input placeholder="Precio" value={price} onChange={(e) => setPrice(e.target.value)} required />
      )}
      {type === "nav" && (
        <select value={targetSceneId} onChange={(e) => setTargetSceneId(e.target.value)} required>
          <option value="">Escena destino…</option>
          {otherScenes.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      )}
      <button type="submit">Agregar hotspot</button>
      {error && <p style={{ color: "salmon" }}>{error}</p>}
    </form>
  );
}
