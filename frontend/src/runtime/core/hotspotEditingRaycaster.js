import * as THREE from "three";
import { vec3ToLonLat } from "./lonLatToVec3.js";

// Adaptado de getSpherePoint del prototipo (virtual-tour-360-img/editor/editor.js):
// convierte una posición de puntero en pantalla a lon/lat sobre la esfera del visor,
// vía raycasting NDC contra la geometría real (no contra un plano ni una aproximación).
export function createHotspotRaycaster({ camera, sphere }) {
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();

  // clientX/clientY en coordenadas de viewport; rect = getBoundingClientRect() del contenedor.
  function pointToLonLat(clientX, clientY, rect) {
    ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(ndc, camera);
    const [hit] = raycaster.intersectObject(sphere);
    if (!hit) return null;

    return vec3ToLonLat(hit.point);
  }

  return { pointToLonLat };
}
