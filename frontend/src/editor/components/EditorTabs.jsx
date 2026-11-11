import { NavLink } from "react-router-dom";
import "./EditorTabs.css";

// Pestañas del editor de un tour (plan §3.9): Contenido (escenas, hotspots, video), Interfaz (el
// estudio tipo Canva) y Publicar (exportar y compartir).
export default function EditorTabs({ tourId, compact = false }) {
  const tabs = [
    { to: `/tours/${tourId}/edit`, label: "Contenido" },
    { to: `/tours/${tourId}/design`, label: "Interfaz" },
    { to: `/tours/${tourId}/publish`, label: "Publicar" },
  ];
  return (
    <nav className={`editor-tabs${compact ? " editor-tabs--compact" : ""}`} aria-label="Secciones del editor">
      {tabs.map((t) => (
        <NavLink key={t.to} to={t.to} className={({ isActive }) => `editor-tab${isActive ? " is-active" : ""}`}>
          {t.label}
        </NavLink>
      ))}
    </nav>
  );
}
