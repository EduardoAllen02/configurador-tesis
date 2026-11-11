// Nadir (polo sur de la esfera): límite de la cámara hacia abajo y tapa opcional con color o
// logo. Dueño en la Oleada 2: B1 (plan §3.7).
//
//   design.nadir = {
//     mode: "none" | "limit" | "cover",
//     limitDeg: -60,                       // mode "limit": lo más bajo que se deja ver (borde inferior de la vista)
//     cover: { kind: "color" | "image", color: "#000000", image: "asset:<id>" | null, sizePct: 20 },
//   }
//
//   none   Sin límite: la cámara baja hasta el tope duro (±85°).
//   limit  lat ≥ limitDeg + fov/2: el borde inferior de la vista nunca pasa de limitDeg. Como
//          depende del fov, al alejar el zoom la cámara sube sola (cameraControls re-acota).
//   cover  Disco 3D (CircleGeometry) pegado al polo sur: como una calcomanía en el suelo, así
//          conserva la perspectiva al hacer zoom. Color liso, o logo (asset del tour) sobre color.
//          sizePct = radio angular del disco en % de 90° (20 → 18° desde el polo).
import * as THREE from "three";

export const LAT_HARD_LIMIT = 85; // tope duro de la cámara: el polo exacto marea al lookAt
const DEFAULT_LIMIT_DEG = -60;
const DEFAULT_COVER = { kind: "color", color: "#000000", image: null, sizePct: 20 };
const RIM_RADIUS = 495; // distancia del borde del disco al centro (la esfera mide 500: el disco queda por dentro)
const TEXTURE_SIZE = 1024;

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const isNum = (v) => typeof v === "number" && Number.isFinite(v);

// Config tolerante: lo que falte o venga mal se reemplaza por el valor por defecto.
export function normalizeNadir(config) {
  const mode = config?.mode === "limit" || config?.mode === "cover" ? config.mode : "none";
  const cover = { ...DEFAULT_COVER, ...(config?.cover || {}) };
  return {
    mode,
    limitDeg: clamp(isNum(config?.limitDeg) ? config.limitDeg : DEFAULT_LIMIT_DEG, -LAT_HARD_LIMIT, 0),
    cover: {
      kind: cover.kind === "image" ? "image" : "color",
      color: typeof cover.color === "string" && cover.color ? cover.color : DEFAULT_COVER.color,
      image: typeof cover.image === "string" && cover.image ? cover.image : null,
      sizePct: clamp(isNum(cover.sizePct) ? cover.sizePct : DEFAULT_COVER.sizePct, 2, 70),
    },
  };
}

// Latitud mínima del centro de la cámara para este fov (vertical, grados).
export function minLatFor(config, fov) {
  if (config.mode !== "limit") return -LAT_HARD_LIMIT;
  return clamp(config.limitDeg + fov / 2, -LAT_HARD_LIMIT, LAT_HARD_LIMIT);
}

// "asset:<id>" → doc.assets[id].url (nunca se arma una URL por cuenta propia).
export function resolveAssetUrl(ref, doc) {
  if (typeof ref !== "string" || !ref.startsWith("asset:")) return null;
  return doc?.assets?.[ref.slice("asset:".length)]?.url ?? null;
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous"; // sin esto el canvas queda "manchado" y WebGL no lo acepta
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("No se pudo cargar la imagen del nadir"));
    img.src = url;
  });
}

// Logo sobre el color de fondo, en un canvas cuadrado: una imagen casi cuadrada llena el disco
// (suele ser una insignia redonda); una alargada se ajusta dentro, sin recortarse.
function composeTexture(img, color) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = TEXTURE_SIZE;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);
  const aspect = img.naturalWidth / img.naturalHeight;
  const squareish = aspect > 0.9 && aspect < 1.1;
  const box = squareish ? TEXTURE_SIZE : TEXTURE_SIZE * 0.72;
  const w = aspect >= 1 ? box : box * aspect;
  const h = aspect >= 1 ? box / aspect : box;
  ctx.drawImage(img, (TEXTURE_SIZE - w) / 2, (TEXTURE_SIZE - h) / 2, w, h);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export function createNadir({ scene, camera, onChange }) {
  void camera;
  let config = normalizeNadir(null);
  let coverSignature = null;
  let mesh = null;
  let token = 0; // una imagen que llega tarde no pisa a la configuración vigente
  let disposed = false;

  function disposeCover() {
    token++;
    if (!mesh) return;
    scene.remove(mesh);
    mesh.geometry.dispose();
    mesh.material.map?.dispose(); // la textura se libera al cambiar o quitar el disco
    mesh.material.dispose();
    mesh = null;
  }

  function buildCover(cover, imageUrl) {
    const theta = THREE.MathUtils.degToRad((cover.sizePct / 100) * 90);
    const distance = RIM_RADIUS * Math.cos(theta); // el borde del disco queda sobre RIM_RADIUS
    const radius = RIM_RADIUS * Math.sin(theta);
    const geometry = new THREE.CircleGeometry(1, 96);
    geometry.rotateX(-Math.PI / 2); // de mirar a +z a mirar a +y (hacia la cámara)
    geometry.rotateY(Math.PI); // arriba de la imagen = hacia lon 0
    const material = new THREE.MeshBasicMaterial({ color: new THREE.Color(cover.color), side: THREE.DoubleSide });
    mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = -distance;
    mesh.scale.set(radius, 1, radius);
    mesh.renderOrder = 1;
    scene.add(mesh);

    if (cover.kind === "image" && imageUrl) {
      const mine = ++token;
      loadImage(imageUrl)
        .then((img) => {
          if (disposed || mine !== token || !mesh) return;
          const texture = composeTexture(img, cover.color);
          mesh.material.map = texture;
          mesh.material.color.set(0xffffff);
          mesh.material.needsUpdate = true;
        })
        .catch((err) => console.warn("[TourRuntime]", err.message));
    }
  }

  return {
    // `doc` resuelve "asset:<id>" → URL. Aplicar la misma configuración dos veces no recrea nada.
    apply(rawConfig, doc) {
      if (disposed) return;
      const next = normalizeNadir(rawConfig);
      const limitChanged = next.mode !== config.mode || next.limitDeg !== config.limitDeg;
      config = next;

      let signature = null;
      let imageUrl = null;
      if (next.mode === "cover") {
        imageUrl = next.cover.kind === "image" ? resolveAssetUrl(next.cover.image, doc) : null;
        signature = JSON.stringify([next.cover.kind, next.cover.color, next.cover.sizePct, imageUrl]);
      }
      if (signature !== coverSignature) {
        coverSignature = signature;
        disposeCover();
        if (signature) buildCover(next.cover, imageUrl);
      }
      if (limitChanged) onChange?.();
    },
    // Latitud mínima (grados, negativa) a la que puede bajar el centro de la cámara con este fov.
    getMinLat(fov) {
      return minLatFor(config, fov);
    },
    dispose() {
      disposed = true;
      disposeCover();
    },
  };
}
