import { useRef, useState } from "react";

// Zona de subida con drag-and-drop, ícono y descripción propios — reemplaza el
// <input type="file"> crudo del navegador, que se ve idéntico sin importar qué
// archivo espera (por eso dos de ellos lado a lado eran indistinguibles).
export default function FileDropzone({ icon, title, description, accept, file, onSelect }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  function handleFiles(fileList) {
    const picked = fileList?.[0];
    if (picked) onSelect(picked);
  }

  return (
    <div
      className={`dropzone${dragOver ? " dropzone-active" : ""}`}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        handleFiles(e.dataTransfer.files);
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        hidden
        onChange={(e) => handleFiles(e.target.files)}
      />
      <div className="dropzone-icon">{icon}</div>
      <div className="dropzone-title">{title}</div>
      <div className="dropzone-desc">{description}</div>
      <div className={`dropzone-file${file ? " dropzone-file-set" : ""}`}>
        {file ? file.name : "Ningún archivo seleccionado"}
      </div>
    </div>
  );
}
