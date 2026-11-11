// Panorámicas en mosaicos AVIF (plan §3.10). Dueño en la Oleada 2: B4.
// scene.image.tiles = { width, cols, rows, base: URL, tileUrl: "…/tile_{c}_{r}.avif" }.
//
// Contrato con tourRuntime.js:
//   canShow(sceneDoc) → true si esta escena debe pintarse con mosaicos (tiles listos y el
//                       navegador decodifica AVIF); si es false el motor usa la WebP de siempre.
//   show(sceneDoc)    → Promise que resuelve cuando ya se ve algo (la base). Pinta la base en la
//                       esfera principal y cuelga sus parches de mosaicos; carga el resto sola.
//   hide()            → deja de mostrar mosaicos (la escena activa pasó a WebP o a otra escena).
//   isProbing()       → true mientras no se sabe si el navegador decodifica AVIF (dura milisegundos;
//                       al terminar llama a opts.onSupport(ok)).
//   update()          → se llama en cada frame del render loop: prioriza los mosaicos visibles.
//   dispose()
//
// Cómo encaja con la esfera principal (sceneSetup.js): SphereGeometry(500, 64, 32) con
// scale(-1, 1, 1). Cada mosaico es un parche de una esfera de radio 498 con la MISMA teselación
// (64×32 segmentos repartidos entre cols×rows) y el mismo scale(-1,1,1); como la cámara está en
// el centro, escalar la esfera no mueve los rayos: los parches caen exactamente sobre la base.
//
// Pruebas / depuración: `globalThis.__TOUR_DISABLE_TILES__ = true` simula un navegador sin AVIF.
import * as THREE from "three";
import { fillTileUrl, pickReleases, tileKey, visiblePatches } from "./tileMath.js";

const PATCH_RADIUS = 498; // un poco menos que la esfera principal (500): se dibuja al frente de la base
const MAX_PARALLEL = 4; // descargas simultáneas de mosaicos
const FADE_MS = 400;
const VIEW_MARGIN_DEG = 10; // se precargan los mosaicos un poco más allá del borde de la pantalla
const KEEP_EXTRA = 8; // mosaicos fuera de pantalla que se conservan (los más cercanos al centro)
const MAX_ATTEMPTS = 3;
const RETRY_MS = 2500;
const DECODE_TIMEOUT_MS = 400;
const BASE_SEGMENTS = { w: 64, h: 32 }; // = SphereGeometry de sceneSetup.js

// AVIF mínimo (16×16) para probar si el navegador sabe decodificarlo.
const TINY_AVIF =
  "AAAAHGZ0eXBhdmlmAAAAAG1pZjFhdmlmbWlhZgAAANZtZXRhAAAAAAAAACFoZGxyAAAAAAAAAABwaWN0AAAAAAAAAAAAAAAAAAAAACJpbG9jAAAAAERAAAEAAQAAAAAA+gABAAAAAAAAACQAAAAjaWluZgAAAAAAAQAAABVpbmZlAgAAAAABAABhdjAxAAAAAA5waXRtAAAAAAABAAAAVmlwcnAAAAA4aXBjbwAAAAxhdjFDgSACAAAAABRpc3BlAAAAAAAAABAAAAAQAAAAEHBpeGkAAAAAAwgICAAAABZpcG1hAAAAAAAAAAEAAQOBAgMAAAAsbWRhdBIACgg4DP/aQENBpDIWHEJi5OmmmmFjYAB1fc4kfm2ilWF4fA==";

// La prueba es asíncrona y se comparte entre motores: la primera vez `avifSupported` es null.
let avifSupported = null;
let avifProbe = null;
function probeAvif() {
  if (!avifProbe) {
    avifProbe = (async () => {
      try {
        if (typeof createImageBitmap !== "function" || typeof atob !== "function") return false;
        const bytes = Uint8Array.from(atob(TINY_AVIF), (ch) => ch.charCodeAt(0));
        const bitmap = await createImageBitmap(new Blob([bytes], { type: "image/avif" }));
        bitmap.close?.();
        return true;
      } catch {
        return false;
      }
    })().then((ok) => (avifSupported = ok));
  }
  return avifProbe;
}
if (typeof window !== "undefined") probeAvif(); // se adelanta al primer motor

function loadImage(url, holder) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    holder.img = img;
    img.crossOrigin = "anonymous"; // igual que TextureLoader
    img.decoding = "async";
    img.onload = () => {
      // Decodificar antes de subirla a la GPU evita tirones en el hilo principal. Con tope de tiempo:
      // en una pestaña oculta decode() puede quedarse esperando, y no por eso se deja de mostrar.
      const decoded = img.decode ? img.decode().catch(() => {}) : Promise.resolve();
      Promise.race([decoded, new Promise((r) => setTimeout(r, DECODE_TIMEOUT_MS))]).then(() => resolve(img));
    };
    img.onerror = () => reject(new Error(`No se pudo cargar ${url}`));
    img.src = url;
  });
}

function cancelImage(holder) {
  const img = holder.img;
  if (!img) return;
  img.onload = img.onerror = null;
  img.src = "";
  holder.img = null;
}

function makeTexture(img, { mipmaps }) {
  const texture = new THREE.Texture(img);
  texture.colorSpace = THREE.SRGBColorSpace; // igual que textureCache.js
  if (!mipmaps) {
    texture.minFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
  }
  texture.needsUpdate = true;
  return texture;
}

export function createTiledPanorama({ scene, camera, sphere, onSupport, onProgress } = {}) {
  const group = new THREE.Group();
  group.renderOrder = 1;
  scene.add(group);

  let active = null; // { id, tiles: {width, cols, rows, base, tileUrl}, token }
  let token = 0;
  let baseTexture = null;
  let baseLoad = null; // { img } de la descarga de la base en curso
  const geometries = new Map(); // key → BufferGeometry (se crean al primer uso)
  const states = new Map(); // key → { c, r, status, attempts, img holder, texture, material, mesh, fadeStart, retryAt }
  const failedScenes = new Set(); // escenas cuya base no cargó: se pintan con la WebP
  let disposed = false;

  function reportInitial() {
    if (!active) return;
    const loaded = (active.ready ? 1 : 0) + active.initial.filter(p => states.get(p.key)?.status === "ready").length;
    const total = 1 + active.initial.length;
    onProgress?.({ sceneId: active.id, loaded, total });
    if (loaded === total && active.resolve) { const resolve = active.resolve; active.resolve = null; resolve(); }
  }

  // Última vista con la que se calculó el conjunto visible.
  let lastView = null;
  let dirty = true;
  let nextRetryAt = 0;
  const dirScratch = new THREE.Vector3();

  if (avifSupported === null) {
    probeAvif().then((ok) => {
      if (!disposed) onSupport?.(ok);
    });
  }

  function canShow(sceneDoc) {
    if (disposed || globalThis.__TOUR_DISABLE_TILES__ === true) return false;
    if (avifSupported !== true) return false;
    const t = sceneDoc?.image?.tiles;
    if (!t || !t.base || !t.tileUrl || !(t.cols > 0) || !(t.rows > 0)) return false;
    return !failedScenes.has(sceneDoc.id);
  }

  // Parche (c, r) con la misma teselación que la esfera principal.
  function geometryFor(c, r, cols, rows) {
    const key = tileKey(c, r);
    let g = geometries.get(key);
    if (!g) {
      const segW = Math.max(2, Math.round(BASE_SEGMENTS.w / cols));
      const segH = Math.max(2, Math.round(BASE_SEGMENTS.h / rows));
      g = new THREE.SphereGeometry(
        PATCH_RADIUS,
        segW,
        segH,
        (c / cols) * Math.PI * 2,
        (Math.PI * 2) / cols,
        (r / rows) * Math.PI,
        Math.PI / rows
      ).scale(-1, 1, 1);
      geometries.set(key, g);
    }
    return g;
  }

  function releaseTile(key) {
    const st = states.get(key);
    if (!st) return;
    cancelImage(st.holder);
    if (st.mesh) group.remove(st.mesh);
    st.material?.dispose();
    st.texture?.dispose();
    states.delete(key);
  }

  function releaseAllTiles() {
    for (const key of [...states.keys()]) releaseTile(key);
    for (const g of geometries.values()) g.dispose();
    geometries.clear();
  }

  function releaseBase() {
    if (baseLoad) {
      cancelImage(baseLoad);
      baseLoad = null;
    }
    if (baseTexture && sphere.material.map !== baseTexture) {
      baseTexture.dispose();
      baseTexture = null;
    }
  }

  function startTile(st, tiles, myToken) {
    st.status = "loading";
    st.attempts++;
    st.holder = {};
    const url = fillTileUrl(tiles.tileUrl, st.c, st.r);
    loadImage(url, st.holder).then(
      (img) => {
        if (disposed || !active || active.token !== myToken || states.get(tileKey(st.c, st.r)) !== st) return;
        st.holder.img = null;
        st.texture = makeTexture(img, { mipmaps: true });
        st.material = new THREE.MeshBasicMaterial({ map: st.texture, transparent: true, opacity: 0 });
        st.mesh = new THREE.Mesh(geometryFor(st.c, st.r, tiles.cols, tiles.rows), st.material);
        st.mesh.renderOrder = 1;
        st.fadeStart = performance.now();
        st.status = "ready";
        group.add(st.mesh);
        dirty = true;
        reportInitial();
      },
      () => {
        if (disposed || !active || active.token !== myToken || states.get(tileKey(st.c, st.r)) !== st) return;
        st.status = "failed";
        st.retryAt = performance.now() + RETRY_MS;
        dirty = true;
        if (st.attempts >= MAX_ATTEMPTS && active.initial.some(p => p.key === tileKey(st.c, st.r)) && active.reject) {
          failedScenes.add(active.id);
          const reject = active.reject; active.reject = null;
          reject(new Error("No se pudo completar la vista inicial en alta definición"));
        }
      }
    );
  }

  // Vista actual de la cámara: dirección (lon/lat), fov y aspecto.
  function readView() {
    camera.getWorldDirection(dirScratch);
    return {
      lon: THREE.MathUtils.radToDeg(Math.atan2(dirScratch.x, dirScratch.z)),
      lat: THREE.MathUtils.radToDeg(Math.asin(THREE.MathUtils.clamp(dirScratch.y, -1, 1))),
      fov: camera.fov,
      aspect: camera.aspect,
    };
  }

  function viewChanged(v) {
    return (
      !lastView ||
      Math.abs(v.lon - lastView.lon) > 0.25 ||
      Math.abs(v.lat - lastView.lat) > 0.25 ||
      v.fov !== lastView.fov ||
      v.aspect !== lastView.aspect
    );
  }

  // Decide qué cargar y qué liberar con la vista actual.
  function schedule(view) {
    const { tiles } = active;
    const current = visiblePatches({ cols: tiles.cols, rows: tiles.rows, ...view, marginDeg: VIEW_MARGIN_DEG });
    const visible = [...new Map([...(active.resolve ? active.initial : []), ...current].map(p => [p.key, p])).values()];
    const visibleKeys = new Set(visible.map((p) => p.key));
    const now = performance.now();

    // Descargas en curso que ya no se ven: se cancelan para dejar lugar a las que sí.
    for (const [key, st] of states) {
      if (st.status === "loading" && !visibleKeys.has(key)) releaseTile(key);
    }

    // Se liberan los lejanos (nunca los visibles).
    const loaded = [];
    for (const [key, st] of states) {
      if (st.status === "ready") loaded.push({ key, dist: distanceToView(st.c, st.r, view, tiles) });
    }
    for (const key of pickReleases(loaded, visibleKeys, KEEP_EXTRA)) releaseTile(key);

    // Descargas nuevas, de la más cercana al centro a la más lejana.
    let inFlight = 0;
    for (const st of states.values()) if (st.status === "loading") inFlight++;
    nextRetryAt = 0;
    for (const p of visible) {
      if (inFlight >= MAX_PARALLEL) break;
      let st = states.get(p.key);
      if (st && st.status !== "failed") continue;
      if (st && (st.attempts >= MAX_ATTEMPTS || now < st.retryAt)) {
        if (st.attempts < MAX_ATTEMPTS) nextRetryAt = nextRetryAt ? Math.min(nextRetryAt, st.retryAt) : st.retryAt;
        continue;
      }
      if (!st) {
        st = { c: p.c, r: p.r, status: "idle", attempts: 0, holder: {} };
        states.set(p.key, st);
      }
      startTile(st, tiles, active.token);
      inFlight++;
    }
    // Los pendientes (cupo lleno) arrancan cuando termina una descarga (dirty); los reintentos, a su hora.
    dirty = false;
  }

  function update() {
    if (disposed) return;
    if (!active) {
      if (baseTexture) releaseBase();
      return;
    }
    const now = performance.now();

    // Fundido de entrada.
    for (const st of states.values()) {
      if (st.status !== "ready" || st.fadeStart == null) continue;
      const k = Math.min(1, (now - st.fadeStart) / FADE_MS);
      st.material.opacity = k;
      if (k >= 1) {
        st.material.transparent = false; // ya opaco: entra al pase opaco, sin mezcla
        st.material.needsUpdate = true;
        st.fadeStart = null;
      }
    }

    if (!active.ready) return; // aún no hay base: no se piden mosaicos
    if (nextRetryAt && now >= nextRetryAt) dirty = true;
    const view = readView();
    if (dirty || viewChanged(view)) {
      lastView = view;
      schedule(view);
    }
  }

  function distanceToView(c, r, view, tiles) {
    // Distancia angular del centro del mosaico al centro de la vista.
    const phi = ((c + 0.5) / tiles.cols) * 360;
    const theta = ((r + 0.5) / tiles.rows) * 180;
    const lon = 90 - phi;
    const lat = 90 - theta;
    const toRad = Math.PI / 180;
    const a = [Math.cos(lat * toRad) * Math.sin(lon * toRad), Math.sin(lat * toRad), Math.cos(lat * toRad) * Math.cos(lon * toRad)];
    const b = [
      Math.cos(view.lat * toRad) * Math.sin(view.lon * toRad),
      Math.sin(view.lat * toRad),
      Math.cos(view.lat * toRad) * Math.cos(view.lon * toRad),
    ];
    const dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    return Math.acos(Math.max(-1, Math.min(1, dot))) / toRad;
  }

  function reset() {
    token++;
    active?.reject?.(new Error("Mosaicos reemplazados"));
    active = null;
    lastView = null;
    dirty = true;
    nextRetryAt = 0;
    releaseAllTiles();
  }

  function show(sceneDoc) {
    reset();
    if (baseLoad) cancelImage(baseLoad);
    const tiles = sceneDoc.image.tiles;
    const myToken = token;
    let resolveInitial, rejectInitial;
    const initialReady = new Promise((resolve, reject) => { resolveInitial = resolve; rejectInitial = reject; });
    // El consumidor recibe esta promesa después de la base; marcarla atendida evita rechazos
    // sin manejar si se cambia de escena mientras todavía se descarga la base.
    initialReady.catch(() => {});
    active = { id: sceneDoc.id, tiles, token: myToken, ready: false,
      initial: visiblePatches({ cols: tiles.cols, rows: tiles.rows, ...readView(), marginDeg: VIEW_MARGIN_DEG }),
      resolve: resolveInitial, reject: rejectInitial };
    reportInitial();
    const holder = {};
    baseLoad = holder;
    return loadImage(tiles.base, holder).then(
      (img) => {
        if (disposed || !active || active.token !== myToken) throw new Error("Mosaicos reemplazados");
        baseLoad = null;
        const previous = baseTexture;
        baseTexture = makeTexture(img, { mipmaps: false });
        const material = sphere.material;
        material.map = baseTexture;
        material.color.set(0xffffff);
        material.needsUpdate = true;
        if (previous && previous !== baseTexture) previous.dispose();
        active.ready = true;
        dirty = true;
        reportInitial();
        return initialReady;
      },
      (err) => {
        if (active && active.token === myToken) {
          // La base no cargó (mosaicos borrados, red…): esta escena se pinta con la WebP.
          failedScenes.add(sceneDoc.id);
          active.reject?.(err);
          active = null;
          baseLoad = null;
        }
        throw err;
      }
    );
  }

  function hide() {
    if (!active && states.size === 0) return;
    reset();
    if (baseLoad) {
      cancelImage(baseLoad);
      baseLoad = null;
    }
    // La base puede seguir en la esfera hasta que llegue la textura WebP; update() la libera luego.
  }

  function dispose() {
    if (disposed) return;
    reset();
    disposed = true;
    if (baseLoad) cancelImage(baseLoad);
    baseTexture?.dispose();
    baseTexture = null;
    scene.remove(group);
  }

  // La prueba de AVIF tarda milisegundos y solo corre una vez por página: mientras tanto el motor
  // espera (onSupport) en vez de bajar la WebP completa para nada.
  const isProbing = () => avifSupported === null && globalThis.__TOUR_DISABLE_TILES__ !== true;

  return { canShow, isProbing, show, hide, update, dispose };
}
