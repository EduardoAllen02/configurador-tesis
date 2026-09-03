import * as THREE from "three";

// Convierte coordenadas esféricas (lon/lat en grados) a un punto sobre la esfera del
// visor (radio fijo, un poco menor al de la geometría para que el marcador quede al frente).
const RADIUS = 490;

export function lonLatToVec3(lon, lat, radius = RADIUS) {
  const phi = THREE.MathUtils.degToRad(90 - lat);
  const theta = THREE.MathUtils.degToRad(lon);

  return new THREE.Vector3(
    radius * Math.sin(phi) * Math.sin(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.cos(theta)
  );
}

// Inversa de lonLatToVec3 — usada por el raycaster del editor para convertir un punto de
// impacto sobre la esfera de vuelta a lon/lat. OJO: normaliza con point.length() (el radio
// real del punto recibido), NUNCA con la constante RADIUS de arriba — esa es cosmética
// (evita z-fighting de los marcadores contra la textura) y no coincide con el radio real
// de la geometría de la esfera (500, ver sceneSetup.js). Usar RADIUS aquí desalinearía
// sutilmente el hotspot respecto al punto donde el usuario hizo clic.
export function vec3ToLonLat(point) {
  const radius = point.length();
  const phi = Math.acos(THREE.MathUtils.clamp(point.y / radius, -1, 1));
  const theta = Math.atan2(point.x, point.z);

  return {
    lat: 90 - THREE.MathUtils.radToDeg(phi),
    lon: THREE.MathUtils.radToDeg(theta),
  };
}
