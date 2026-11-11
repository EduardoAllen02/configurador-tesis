import { Link, useLocation } from "react-router-dom";
import { previewHref } from "./previewNavigation.js";
import { ArrowLeftIcon, EyeIcon } from "../../components/ui/Icon.jsx";
import EditorTabs from "./EditorTabs.jsx";
import "./EditorHeader.css";

// Shared geometry keeps navigation in the same place in all three editor sections.
export default function EditorHeader({ tourId, title, children, onPreview, previewTarget }) {
  const location = useLocation();
  return <header className="editor-header">
    <div className="editor-header-left">
      <Link to="/tours" className="btn btn-ghost btn-icon" title="Volver a mis tours" aria-label="Volver a mis tours"><ArrowLeftIcon width={16} height={16} /></Link>
      <span className="editor-header-title">{title || "Tour Studio"}</span>
    </div>
    <EditorTabs tourId={tourId} compact />
    <div className="editor-header-right">
      {children}
      <Link to={previewHref(tourId, location.pathname)} state={{ editorOrigin: location.pathname }} onClick={onPreview} target={previewTarget} rel={previewTarget ? "noopener noreferrer" : undefined} title="Vista previa" aria-label="Vista previa" className="btn btn-secondary btn-sm"><EyeIcon width={15} height={15} /><span className="editor-preview-label">Vista previa</span></Link>
    </div>
  </header>;
}
