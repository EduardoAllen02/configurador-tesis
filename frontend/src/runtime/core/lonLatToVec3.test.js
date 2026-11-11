import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { lonLatToVec3, vec3ToLonLat } from "./lonLatToVec3.js";

describe("lonLatToVec3 / vec3ToLonLat", () => {
  it("lon 0, lat 0 apunta a +Z (frente de la cámara)", () => {
    const v = lonLatToVec3(0, 0, 100);
    expect(v.x).toBeCloseTo(0);
    expect(v.y).toBeCloseTo(0);
    expect(v.z).toBeCloseTo(100);
  });

  it("lon 90 apunta a +X y lat 90 al cenit", () => {
    const east = lonLatToVec3(90, 0, 100);
    expect(east.x).toBeCloseTo(100);
    expect(east.z).toBeCloseTo(0);
    expect(lonLatToVec3(0, 90, 100).y).toBeCloseTo(100);
  });

  it("respeta el radio pedido", () => {
    expect(lonLatToVec3(33, -20, 250).length()).toBeCloseTo(250);
  });

  it.each([
    [0, 0],
    [30, 10],
    [-120, 45],
    [179, -80],
    [-179.5, 5],
  ])("ida y vuelta lon=%d lat=%d", (lon, lat) => {
    const back = vec3ToLonLat(lonLatToVec3(lon, lat));
    expect(back.lon).toBeCloseTo(lon, 6);
    expect(back.lat).toBeCloseTo(lat, 6);
  });

  it("vec3ToLonLat normaliza con el radio real del punto, no con la constante de los marcadores", () => {
    // Un punto de la esfera de la geometría (radio 500) y uno de los marcadores (490) en la misma dirección.
    const a = vec3ToLonLat(lonLatToVec3(40, 12, 500));
    const b = vec3ToLonLat(lonLatToVec3(40, 12, 490));
    expect(a.lon).toBeCloseTo(b.lon, 8);
    expect(a.lat).toBeCloseTo(b.lat, 8);
    expect(vec3ToLonLat(new THREE.Vector3(0, 0, 77)).lat).toBeCloseTo(0);
  });
});
