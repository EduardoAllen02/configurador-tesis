// La barra de escenas pinta cada tarjeta a 52x40 px. Pedir la panorámica completa (6144 px)
// obligaba al navegador a decodificar ~72 MB por tarjeta y el scroll se trababa al crecer el
// tour; el backend genera y guarda en caché una miniatura de 320 px junto a cada WebP.
const THUMB_SUFFIX = ".thumb.webp";
const DERIVED = /\.(?:preview|thumb)\.webp$/i;

export function sceneThumbPath(webpPath) {
  if (typeof webpPath !== "string" || !/^\/uploads\/.+\.webp$/i.test(webpPath) || DERIVED.test(webpPath)) return webpPath;
  return webpPath.slice(0, -5) + THUMB_SUFFIX;
}
