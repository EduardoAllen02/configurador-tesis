import * as THREE from "three";
import { fetchBlobWithProgress } from "./loadProgress.js";

// Cache LRU de texturas en GPU para la secuencia de cuadros del lote activo (un lote de 1 =
// panorámica suelta). Carga bajo demanda y evita mantener más de `maxCache` texturas a la vez.
//
// La clave es la URL (no el índice): así `setFrames` puede cambiar la lista (el editor agrega o
// reordena escenas del lote) sin tirar las texturas ya cargadas, y las de un lote anterior
// quedan a "distancia infinita" y son las primeras en salir.
export function createTextureCache({ frames: initialFrames = [], maxCache = 20, ahead = 5, behind = 2 } = {}) {
  const cache = new Map(); // url -> THREE.Texture
  const inFlight = new Map(); // url -> Promise
  let frames = initialFrames;
  let disposed = false;

  function setFrames(next) {
    frames = next;
  }

  function loadTexture(idx, onProgress) {
    const url = frames[idx];
    if (!url) return Promise.reject(new Error(`Cuadro ${idx} inexistente`));
    if (cache.has(url)) { onProgress?.({ loaded: 1, total: 1 }); return Promise.resolve(cache.get(url)); }
    if (inFlight.has(url)) {
      const flight = inFlight.get(url);
      if (onProgress) { flight.listeners.add(onProgress); if (flight.progress) onProgress(flight.progress); }
      return flight.promise;
    }
    const flight = { controller: new AbortController(), listeners: new Set(onProgress ? [onProgress] : []), progress: null };
    const report = (progress) => { flight.progress = progress; flight.listeners.forEach(fn => fn(progress)); };
    flight.promise = fetchBlobWithProgress(url, { signal: flight.controller.signal, onProgress: report })
      .then(blob => new Promise((resolve, reject) => {
        const objectUrl = URL.createObjectURL(blob);
        const image = new Image();
        image.onload = () => { URL.revokeObjectURL(objectUrl); resolve(image); };
        image.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error("No se pudo decodificar la panorámica")); };
        image.src = objectUrl;
      }))
      .then(image => {
        if (disposed) throw new Error("Cache liberado");
        const tex = new THREE.Texture(image);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.minFilter = THREE.LinearFilter;
        tex.needsUpdate = true;
        cache.set(url, tex);
        return tex;
      }).finally(() => inFlight.delete(url));
    inFlight.set(url, flight);
    return flight.promise;
  }

  function evictFarTextures(centerIdx) {
    if (cache.size <= maxCache) return;
    const distance = (url) => {
      const i = frames.indexOf(url);
      return i === -1 ? Infinity : Math.abs(i - centerIdx);
    };
    const entries = [...cache.keys()].sort((a, b) => distance(b) - distance(a));
    while (cache.size > maxCache && entries.length) {
      const url = entries.shift();
      cache.get(url)?.dispose();
      cache.delete(url);
    }
  }

  function preloadGPU(centerIdx) {
    const start = Math.max(0, centerIdx - behind);
    const end = Math.min(frames.length - 1, centerIdx + ahead);
    for (let i = start; i <= end; i++) {
      loadTexture(i).catch(() => {});
    }
    evictFarTextures(centerIdx);
  }

  function dispose() {
    disposed = true;
    inFlight.forEach(flight => flight.controller.abort());
    cache.forEach((tex) => tex.dispose());
    cache.clear();
    inFlight.clear();
  }

  return { loadTexture, evictFarTextures, preloadGPU, setFrames, dispose };
}
