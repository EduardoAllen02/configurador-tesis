// Cámara orbital manual (no usa OrbitControls de three/examples): estado lon/lat/fov,
// pointer events con soporte multitouch (1 dedo = rotar, 2 dedos = pinch-zoom), rueda
// para zoom, flechas de teclado delegadas a `onArrowKey` (la app decide si aplica).
import * as THREE from "three";

const FOV_MIN = 30;
const FOV_MAX = 100;
const LAT_MAX = 85;

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function attachCameraControls({ containerEl, camera, getNadirLat = () => LAT_MAX, onArrowKey }) {
  let lon = 0;
  let lat = 0;
  let fov = 75;
  const pointers = new Map();
  let lastPinchDist = null;
  let animationFrameId = null;

  function clampLat(value) {
    const max = Math.min(LAT_MAX, getNadirLat());
    return Math.max(-max, Math.min(max, value));
  }

  function updateCamera() {
    camera.fov = fov;
    camera.updateProjectionMatrix();
    const theta = THREE.MathUtils.degToRad(lon);
    const phiRad = THREE.MathUtils.degToRad(90 - lat);
    const target = new THREE.Vector3(
      500 * Math.sin(phiRad) * Math.sin(theta),
      500 * Math.cos(phiRad),
      500 * Math.sin(phiRad) * Math.cos(theta)
    );
    camera.lookAt(target);
  }

  function onPointerDown(e) {
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    containerEl.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e) {
    const prev = pointers.get(e.pointerId);
    if (!prev) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.size === 1) {
      const dx = e.clientX - prev.x;
      const dy = e.clientY - prev.y;
      lon -= dx * 0.1;
      lat = clampLat(lat + dy * 0.1);
      updateCamera();
    } else if (pointers.size === 2) {
      const pts = [...pointers.values()];
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      if (lastPinchDist != null) {
        const delta = lastPinchDist - dist;
        fov = Math.max(FOV_MIN, Math.min(FOV_MAX, fov + delta * 0.1));
        updateCamera();
      }
      lastPinchDist = dist;
    }
  }

  function onPointerUp(e) {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) lastPinchDist = null;
  }

  function onWheel(e) {
    e.preventDefault();
    fov = Math.max(FOV_MIN, Math.min(FOV_MAX, fov + e.deltaY * 0.05));
    updateCamera();
  }

  function onKeyDown(e) {
    if (e.key === "ArrowLeft") onArrowKey?.(-1);
    else if (e.key === "ArrowRight") onArrowKey?.(1);
  }

  containerEl.addEventListener("pointerdown", onPointerDown);
  containerEl.addEventListener("pointermove", onPointerMove);
  containerEl.addEventListener("pointerup", onPointerUp);
  containerEl.addEventListener("pointercancel", onPointerUp);
  containerEl.addEventListener("wheel", onWheel, { passive: false });
  window.addEventListener("keydown", onKeyDown);

  updateCamera();

  function animateCameraTo(targetLon, targetLat, duration = 600) {
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    const startLon = lon;
    const startLat = lat;
    const startTime = performance.now();

    function step(now) {
      const t = Math.min(1, (now - startTime) / duration);
      const eased = easeInOutCubic(t);
      lon = startLon + (targetLon - startLon) * eased;
      lat = clampLat(startLat + (targetLat - startLat) * eased);
      updateCamera();
      if (t < 1) animationFrameId = requestAnimationFrame(step);
    }
    animationFrameId = requestAnimationFrame(step);
  }

  function getCurrentLonLat() {
    return { lon, lat };
  }

  function dispose() {
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    containerEl.removeEventListener("pointerdown", onPointerDown);
    containerEl.removeEventListener("pointermove", onPointerMove);
    containerEl.removeEventListener("pointerup", onPointerUp);
    containerEl.removeEventListener("pointercancel", onPointerUp);
    containerEl.removeEventListener("wheel", onWheel);
    window.removeEventListener("keydown", onKeyDown);
  }

  return { animateCameraTo, getCurrentLonLat, dispose };
}
