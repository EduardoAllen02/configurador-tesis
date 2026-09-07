// Genera un bundle web estático (HTML + assets) de un tour: autocontenido, publicable
// en cualquier servidor de archivos estáticos. No depende del backend en tiempo de
// ejecución — el HTML embebe los datos del tour como JSON y carga Three.js vía CDN.
const fs = require("fs/promises");
const path = require("path");
const prisma = require("../config/prisma");
const { uploadsDir } = require("../config/env");

function buildViewerHtml(tourJson) {
  const accent = tourJson.theme?.accentColor || "#4da3ff";
  const radius = tourJson.theme?.borderRadius ?? 8;
  const isLight = tourJson.theme?.tooltipStyle === "light";
  const panelBg = isLight ? "rgba(255,255,255,.96)" : "rgba(20,20,20,.92)";
  const panelColor = isLight ? "#1a1a18" : "#eee";
  const welcomeMessage = tourJson.customTexts?.welcomeMessage;

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${tourJson.title.replace(/</g, "&lt;")}</title>
<style>
  :root{--tour-accent:${accent};--tour-radius:${radius}px}
  html,body{margin:0;height:100%;background:#111;color:#eee;font-family:system-ui,sans-serif;overflow:hidden}
  #app{position:relative;width:100vw;height:100vh}
  header{position:absolute;top:0;left:0;right:0;z-index:2;display:flex;justify-content:space-between;align-items:center;padding:.5rem 1rem;background:rgba(0,0,0,.5);gap:.75rem}
  #welcome{font-size:.85rem;opacity:.8;flex:1}
  select{font-size:1rem}
  .hs-marker-btn{width:28px;height:28px;border-radius:50%;border:none;background:var(--tour-accent);color:#fff;font-weight:bold;cursor:pointer;pointer-events:auto}
  #scrubber{position:absolute;left:16px;right:16px;bottom:16px;z-index:2}
  #scrubber input{width:100%}
  #scrubber input{accent-color:var(--tour-accent)}
  #panel{position:absolute;right:16px;top:56px;width:260px;background:${panelBg};color:${panelColor};border-radius:var(--tour-radius);border-left:4px solid var(--tour-accent);padding:1rem;z-index:2;display:none}
  #panel button{float:right;color:inherit;background:none;border:none;cursor:pointer}
  #panel strong{color:var(--tour-accent)}
</style>
</head>
<body>
<div id="app">
  <header>
    <strong>${tourJson.title.replace(/</g, "&lt;")}</strong>
    ${welcomeMessage ? `<span id="welcome">${welcomeMessage.replace(/</g, "&lt;")}</span>` : ""}
    <select id="scene-select"></select>
  </header>
  <div id="scrubber" style="display:none"><input type="range" id="frame-range" min="0" max="0" value="0" /><div id="frame-label"></div></div>
  <div id="panel"><button onclick="document.getElementById('panel').style.display='none'">×</button><h3 id="panel-title"></h3><img id="panel-img" style="display:none;width:100%;border-radius:6px;margin-bottom:.5rem" /><p id="panel-desc"></p></div>
</div>
<script type="importmap">
{ "imports": {
  "three": "https://unpkg.com/three@0.185.0/build/three.module.js",
  "three/addons/": "https://unpkg.com/three@0.185.0/examples/jsm/"
} }
</script>
<script type="module">
import * as THREE from "three";
import { CSS2DRenderer, CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";

const TOUR = ${JSON.stringify(tourJson)};

const app = document.getElementById("app");
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
app.prepend(renderer.domElement);

const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(window.innerWidth, window.innerHeight);
labelRenderer.domElement.style.position = "absolute";
labelRenderer.domElement.style.inset = "0";
labelRenderer.domElement.style.pointerEvents = "none";
app.appendChild(labelRenderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 1100);
const geometry = new THREE.SphereGeometry(500, 64, 32).scale(-1, 1, 1);
const material = new THREE.MeshBasicMaterial({ color: 0x111122 });
const sphere = new THREE.Mesh(geometry, material);
scene.add(sphere);

let lon = 0, lat = 0, fov = 75;
const pointers = new Map();
let lastPinchDist = null;

function updateCamera() {
  camera.fov = fov;
  camera.updateProjectionMatrix();
  const theta = THREE.MathUtils.degToRad(lon);
  const phi = THREE.MathUtils.degToRad(90 - lat);
  camera.lookAt(new THREE.Vector3(
    500 * Math.sin(phi) * Math.sin(theta),
    500 * Math.cos(phi),
    500 * Math.sin(phi) * Math.cos(theta)
  ));
}
updateCamera();

renderer.domElement.addEventListener("pointerdown", (e) => {
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
});
renderer.domElement.addEventListener("pointermove", (e) => {
  const prev = pointers.get(e.pointerId);
  if (!prev) return;
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 1) {
    lon += (e.clientX - prev.x) * 0.1;
    lat = Math.max(-85, Math.min(85, lat + (e.clientY - prev.y) * 0.1));
    updateCamera();
  } else if (pointers.size === 2) {
    const pts = [...pointers.values()];
    const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
    if (lastPinchDist != null) {
      fov = Math.max(30, Math.min(100, fov + (lastPinchDist - dist) * 0.1));
      updateCamera();
    }
    lastPinchDist = dist;
  }
});
window.addEventListener("pointerup", (e) => { pointers.delete(e.pointerId); if (pointers.size < 2) lastPinchDist = null; });
renderer.domElement.addEventListener("wheel", (e) => {
  e.preventDefault();
  fov = Math.max(30, Math.min(100, fov + e.deltaY * 0.05));
  updateCamera();
}, { passive: false });

function lonLatToVec3(lonDeg, latDeg, radius = 490) {
  const phi = THREE.MathUtils.degToRad(90 - latDeg);
  const theta = THREE.MathUtils.degToRad(lonDeg);
  return new THREE.Vector3(radius * Math.sin(phi) * Math.sin(theta), radius * Math.cos(phi), radius * Math.sin(phi) * Math.cos(theta));
}

const select = document.getElementById("scene-select");
TOUR.scenes.forEach((s) => {
  const opt = document.createElement("option");
  opt.value = s.id; opt.textContent = s.name;
  select.appendChild(opt);
});

const scrubberEl = document.getElementById("scrubber");
const rangeEl = document.getElementById("frame-range");
const frameLabelEl = document.getElementById("frame-label");
const panelEl = document.getElementById("panel");
const panelTitleEl = document.getElementById("panel-title");
const panelImgEl = document.getElementById("panel-img");
const panelDescEl = document.getElementById("panel-desc");

let markers = [];
let siblingScenes = [];
let seekTarget = 0;
const textureLoader = new THREE.TextureLoader();

function openHotspot(hotspot) {
  if (hotspot.type === "nav") { select.value = hotspot.targetSceneId; loadScene(hotspot.targetSceneId); return; }
  panelTitleEl.textContent = hotspot.title;
  if (hotspot.imagePath) { panelImgEl.src = hotspot.imagePath; panelImgEl.style.display = "block"; }
  else { panelImgEl.style.display = "none"; }
  // DOM en vez de innerHTML/template: title/price/description son texto editable por
  // cliente/dev, no confiable como HTML — construir nodos evita inyección.
  panelDescEl.textContent = "";
  if (hotspot.type === "price" && hotspot.price) {
    const priceEl = document.createElement("strong");
    priceEl.textContent = hotspot.price;
    panelDescEl.appendChild(priceEl);
    if (hotspot.description) panelDescEl.appendChild(document.createTextNode(" — " + hotspot.description));
  } else if (hotspot.description) {
    panelDescEl.textContent = hotspot.description;
  }
  panelEl.style.display = "block";
}

function renderHotspots(hotspots) {
  markers.forEach((m) => scene.remove(m));
  markers = [];
  (hotspots || []).forEach((hotspot) => {
    const btn = document.createElement("button");
    btn.className = "hs-marker-btn";
    btn.textContent = hotspot.type === "nav" ? "\\u2192" : "i";
    btn.addEventListener("click", (e) => { e.stopPropagation(); openHotspot(hotspot); });
    const obj = new CSS2DObject(btn);
    obj.position.copy(lonLatToVec3(hotspot.lon, hotspot.lat));
    scene.add(obj);
    markers.push(obj);
  });
}

function goToFrame(idx) {
  const clamped = Math.max(0, Math.min(siblingScenes.length - 1, idx));
  seekTarget = clamped;
  rangeEl.value = clamped;
  frameLabelEl.textContent = (clamped + 1) + " / " + siblingScenes.length;
  textureLoader.load(siblingScenes[clamped].webpPath, (tex) => {
    if (seekTarget !== clamped) return;
    tex.colorSpace = THREE.SRGBColorSpace;
    material.map = tex; material.color.set(0xffffff); material.needsUpdate = true;
  });
}

function loadScene(sceneId) {
  const active = TOUR.scenes.find((s) => s.id === sceneId);
  if (!active) return;
  siblingScenes = active.origen === "video_frame" && active.videoUploadId
    ? TOUR.scenes.filter((s) => s.origen === "video_frame" && s.videoUploadId === active.videoUploadId).sort((a, b) => a.orderIndex - b.orderIndex)
    : [active];

  rangeEl.max = String(siblingScenes.length - 1);
  scrubberEl.style.display = siblingScenes.length > 1 ? "block" : "none";
  renderHotspots(siblingScenes.flatMap((s) => s.hotspots || []));
  goToFrame(0);
}

select.addEventListener("change", () => loadScene(select.value));
rangeEl.addEventListener("input", () => goToFrame(Number(rangeEl.value)));

if (TOUR.scenes[0]) { select.value = TOUR.scenes[0].id; loadScene(TOUR.scenes[0].id); }

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  labelRenderer.setSize(window.innerWidth, window.innerHeight);
});

function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
}
animate();
</script>
</body>
</html>
`;
}

// Copia los assets (WebP) de las escenas y de las imágenes de hotspot a `outDir/assets`,
// devolviendo el tour con `webpPath`/`imagePath` reescritos a rutas relativas dentro del
// bundle — el HTML standalone no tiene backend detrás, así que no puede servir /uploads/...
async function copyAssets(scenes, outDir) {
  const assetsDir = path.join(outDir, "assets");
  await fs.mkdir(assetsDir, { recursive: true });

  async function copyOne(sourceRelPath, filename) {
    const sourcePath = path.join(uploadsDir, sourceRelPath.replace(/^\/uploads\//, ""));
    try {
      await fs.copyFile(sourcePath, path.join(assetsDir, filename));
    } catch {
      // El asset de prueba/seed puede no existir en disco; el bundle igual se genera.
    }
    return `assets/${filename}`;
  }

  const rewritten = [];
  for (const scene of scenes) {
    const webpFilename = `${scene.id}${path.extname(scene.webpPath) || ".webp"}`;
    const webpPath = await copyOne(scene.webpPath, webpFilename);

    const hotspots = [];
    for (const hotspot of scene.hotspots || []) {
      if (!hotspot.imagePath) {
        hotspots.push(hotspot);
        continue;
      }
      const imgFilename = `hotspot-${hotspot.id}${path.extname(hotspot.imagePath) || ".webp"}`;
      hotspots.push({ ...hotspot, imagePath: await copyOne(hotspot.imagePath, imgFilename) });
    }

    rewritten.push({ ...scene, webpPath, hotspots });
  }
  return rewritten;
}

async function generateBundle({ tourId, outDir }) {
  const tour = await prisma.tour.findUnique({
    where: { id: tourId },
    include: { scenes: { orderBy: { orderIndex: "asc" }, include: { hotspots: true } } },
  });
  if (!tour) throw new Error("Tour no encontrado");

  await fs.mkdir(outDir, { recursive: true });
  const scenesWithLocalAssets = await copyAssets(tour.scenes, outDir);

  const html = buildViewerHtml({
    title: tour.title,
    scenes: scenesWithLocalAssets,
    theme: tour.theme,
    customTexts: tour.customTexts,
  });
  await fs.writeFile(path.join(outDir, "index.html"), html, "utf-8");
}

module.exports = { generateBundle };
