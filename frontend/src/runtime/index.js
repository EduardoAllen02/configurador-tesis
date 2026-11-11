import "./runtime.css";

// Punto de entrada del motor. En la app lo importan TourViewer (modo view) y el editor (modo
// edit); `vite.runtime.config.js` lo compila como IIFE (window.TourRuntime) para el export.
export { createTourRuntime } from "./tourRuntime.js";
