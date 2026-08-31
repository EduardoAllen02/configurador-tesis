import * as THREE from "three";

// Cache LRU de texturas en GPU para una secuencia de frames (escenas origen=video_frame).
// Carga bajo demanda, evita mantener más de `maxCache` texturas cargadas a la vez.
export function createTextureCache({ frames, maxCache = 20, ahead = 5, behind = 2 }) {
  const loader = new THREE.TextureLoader();
  const cache = new Map(); // idx -> THREE.Texture
  const inFlight = new Map(); // idx -> Promise

  function loadTexture(idx) {
    if (cache.has(idx)) return Promise.resolve(cache.get(idx));
    if (inFlight.has(idx)) return inFlight.get(idx);

    const url = frames[idx];
    const promise = new Promise((resolve, reject) => {
      loader.load(
        url,
        (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.minFilter = THREE.LinearFilter;
          cache.set(idx, tex);
          inFlight.delete(idx);
          resolve(tex);
        },
        undefined,
        (err) => {
          inFlight.delete(idx);
          reject(err);
        }
      );
    });
    inFlight.set(idx, promise);
    return promise;
  }

  function evictFarTextures(centerIdx) {
    if (cache.size <= maxCache) return;
    const entries = [...cache.keys()].sort((a, b) => Math.abs(b - centerIdx) - Math.abs(a - centerIdx));
    while (cache.size > maxCache && entries.length) {
      const idx = entries.shift();
      cache.get(idx)?.dispose();
      cache.delete(idx);
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
    cache.forEach((tex) => tex.dispose());
    cache.clear();
    inFlight.clear();
  }

  return { loadTexture, evictFarTextures, preloadGPU, dispose };
}
