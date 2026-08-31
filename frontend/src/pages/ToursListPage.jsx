import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../auth/useAuth.js";

export default function ToursListPage() {
  const { user, logout } = useAuth();
  const [tours, setTours] = useState([]);
  const [title, setTitle] = useState("");
  const [error, setError] = useState(null);

  async function loadTours() {
    try {
      setTours(await api.get("/api/tours"));
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    loadTours();
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setError(null);
    try {
      await api.post("/api/tours", { title });
      setTitle("");
      await loadTours();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div style={{ maxWidth: 640, margin: "2rem auto" }}>
      <header style={{ display: "flex", justifyContent: "space-between" }}>
        <h1>Tours</h1>
        <div>
          <span>{user?.fullName}</span>{" "}
          <button onClick={logout}>Salir</button>
        </div>
      </header>

      <form onSubmit={handleCreate} style={{ marginBottom: "1.5rem" }}>
        <input placeholder="Título del tour" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <button type="submit">Crear tour</button>
      </form>
      {error && <p style={{ color: "salmon" }}>{error}</p>}

      <ul>
        {tours.map((tour) => (
          <li key={tour.id}>
            {tour.title} — <Link to={`/tours/${tour.id}/view`}>ver</Link> ·{" "}
            <Link to={`/tours/${tour.id}/edit`}>editar</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
