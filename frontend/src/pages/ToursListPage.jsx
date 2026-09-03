import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import AppShell from "../components/ui/AppShell.jsx";
import { EyeIcon, FolderIcon, PencilIcon, PlusIcon, TrashIcon } from "../components/ui/Icon.jsx";

const dateFormatter = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", year: "numeric" });

export default function ToursListPage() {
  const [tours, setTours] = useState(null);
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);
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
      setCreating(false);
      await loadTours();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(tour) {
    if (!confirm(`¿Eliminar "${tour.title}"? Esta acción no se puede deshacer.`)) return;
    try {
      await api.delete(`/api/tours/${tour.id}`);
      await loadTours();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <h1 className="page-title">Tus tours</h1>
          <p className="page-subtitle">Crea, edita y comparte tus tours virtuales 360°.</p>
        </div>
        {!creating && (
          <button className="btn btn-primary" onClick={() => setCreating(true)}>
            <PlusIcon />
            Crear tour
          </button>
        )}
      </div>

      {creating && (
        <div className="card card-pad" style={{ marginBottom: "var(--space-8)" }}>
          <form onSubmit={handleCreate} className="form-row">
            <div className="field">
              <label className="field-label" htmlFor="new-tour-title">
                Título del tour
              </label>
              <input
                id="new-tour-title"
                className="input"
                placeholder="Ej. Casa Roble 214"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
                required
              />
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary">
                Crear
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setCreating(false)}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {error && <p className="error-text" style={{ marginBottom: "var(--space-4)" }}>{error}</p>}

      {tours === null ? null : tours.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <FolderIcon />
            <p className="empty-state-title">Todavía no tienes tours</p>
            <p className="empty-state-body">
              Crea el primero para empezar a subir panorámicas o video 360° y armar tu recorrido.
            </p>
            <button className="btn btn-primary" onClick={() => setCreating(true)}>
              <PlusIcon />
              Crear tour
            </button>
          </div>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: "var(--space-4)",
          }}
        >
          {tours.map((tour) => (
            <div key={tour.id} className="card card-pad stack">
              <div>
                <div className="row" style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>
                  {tour.title}
                </div>
                <p className="text-soft" style={{ fontSize: 13, minHeight: 18 }}>
                  {tour.description || "Sin descripción"}
                </p>
                <p className="text-faint" style={{ fontSize: 12 }}>
                  Creado el {dateFormatter.format(new Date(tour.createdAt))}
                </p>
              </div>
              <div className="spread">
                <div className="row">
                  <Link to={`/tours/${tour.id}/view`} className="btn btn-secondary btn-sm">
                    <EyeIcon width={15} height={15} />
                    Ver
                  </Link>
                  <Link to={`/tours/${tour.id}/edit`} className="btn btn-secondary btn-sm">
                    <PencilIcon width={15} height={15} />
                    Editar
                  </Link>
                </div>
                <button
                  className="btn btn-ghost btn-icon"
                  onClick={() => handleDelete(tour)}
                  title="Eliminar tour"
                  aria-label="Eliminar tour"
                >
                  <TrashIcon width={16} height={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
