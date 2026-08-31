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
