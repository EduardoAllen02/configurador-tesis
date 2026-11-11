// Matemática pura de los mosaicos (sin three ni DOM, para poder probarla en Node).
//
// Convenciones, las mismas del motor (lonLatToVec3.js / cameraControls.js):
//   lon 0 → +Z, lon 90 → +X; lat 90 → cenit.
// La textura equirectangular de la esfera principal (SphereGeometry + scale(-1,1,1)) tiene
// u=0 en phi=0 → dirección (x=cos phi, z=sin phi), de modo que  u = (90 − lon) / 360  (módulo 1)
// y  v = 0.5 + lat / 180. La columna 0 de mosaicos es la de u∈[0, 1/cols]; la fila 0, la de arriba.

const DEG = Math.PI / 180;

export const tileKey = (c, r) => `${c}_${r}`;

// "…/tile_{c}_{r}.avif" → URL concreta del mosaico.
export function fillTileUrl(template, c, r) {
  return String(template).replaceAll("{c}", String(c)).replaceAll("{r}", String(r));
}

// Centro (lon/lat en grados) del mosaico (c, r) de una cuadrícula cols×rows.
export function patchCenter(c, r, cols, rows) {
  const phi = ((c + 0.5) / cols) * 360;
  const theta = ((r + 0.5) / rows) * 180;
  return { lon: normalizeLon(90 - phi), lat: 90 - theta };
}

export function normalizeLon(lon) {
  return ((((lon + 180) % 360) + 360) % 360) - 180;
}

// Vector unitario [x, y, z] de una dirección lon/lat.
export function lonLatToDir(lon, lat) {
  const cl = Math.cos(lat * DEG);
  return [cl * Math.sin(lon * DEG), Math.sin(lat * DEG), cl * Math.cos(lon * DEG)];
}

// Distancia angular (grados) entre dos direcciones lon/lat.
export function angularDistance(lon1, lat1, lon2, lat2) {
  const a = lonLatToDir(lon1, lat1);
  const b = lonLatToDir(lon2, lat2);
  const dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  return Math.acos(Math.max(-1, Math.min(1, dot))) / DEG;
}

// Base ortonormal de la cámara (sin giro sobre su eje, como cameraControls: lookAt con +Y arriba).
export function cameraBasis(lon, lat) {
  const f = lonLatToDir(lon, lat);
  // right = normalize(f × up), con up = (0, 1, 0); en los polos se usa el eje de lon.
  let right = [f[2], 0, -f[0]];
  let len = Math.hypot(right[0], right[2]);
  if (len < 1e-6) {
    right = [Math.cos(lon * DEG), 0, -Math.sin(lon * DEG)];
    len = 1;
  }
  right = right.map((v) => v / len);
  const up = [
    right[1] * f[2] - right[2] * f[1],
    right[2] * f[0] - right[0] * f[2],
    right[0] * f[1] - right[1] * f[0],
  ];
  return { forward: f, right, up };
}

const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

// Puntos de muestra sobre un mosaico: rejilla n×n que incluye esquinas y bordes.
function patchSamples(c, r, cols, rows, n = 5) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const phi = ((c + i / (n - 1)) / cols) * 360;
      const theta = ((r + j / (n - 1)) / rows) * 180;
      pts.push(lonLatToDir(90 - phi, 90 - theta));
    }
  }
  return pts;
}

// ¿El mosaico queda (aunque sea en parte) dentro de la pirámide de visión?
// Un mosaico está fuera si TODAS sus muestras caen del lado de afuera de un mismo plano.
function patchIntersectsView(samples, basis, tanH, tanV) {
  const cam = samples.map((p) => [dot3(p, basis.right), dot3(p, basis.up), dot3(p, basis.forward)]);
  const outsideAll = (test) => cam.every((p) => test(p) < 0);
  if (outsideAll(([, , z]) => z)) return false; // detrás de la cámara
  if (outsideAll(([x, , z]) => x + z * tanH)) return false; // izquierda
  if (outsideAll(([x, , z]) => -x + z * tanH)) return false; // derecha
  if (outsideAll(([, y, z]) => y + z * tanV)) return false; // abajo
  if (outsideAll(([, y, z]) => -y + z * tanV)) return false; // arriba
  return true;
}

// Mosaicos que se ven desde (lon, lat) con `fov` vertical (grados) y `aspect` = ancho/alto,
// ampliando el campo `marginDeg` por cada lado para precargar un poco más allá del borde.
// Devuelve [{ c, r, key, dist }] ordenado por cercanía angular al centro de la vista.
export function visiblePatches({ cols, rows, lon, lat, fov, aspect, marginDeg = 8 }) {
  const basis = cameraBasis(lon, lat);
  const halfV = Math.min(89, (fov / 2) * 1 + marginDeg);
  const halfH = Math.min(89, (Math.atan(Math.tan((fov / 2) * DEG) * aspect) / DEG) + marginDeg);
  const tanV = Math.tan(halfV * DEG);
  const tanH = Math.tan(halfH * DEG);

  const out = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!patchIntersectsView(patchSamples(c, r, cols, rows), basis, tanH, tanV)) continue;
      const center = patchCenter(c, r, cols, rows);
      out.push({ c, r, key: tileKey(c, r), dist: angularDistance(lon, lat, center.lon, center.lat) });
    }
  }
  return out.sort((a, b) => a.dist - b.dist || a.r - b.r || a.c - b.c);
}

// Qué mosaicos cargados se liberan: nunca los visibles; de los demás se conservan los
// `keepExtra` más cercanos al centro de la vista y se liberan el resto.
// `loaded`: [{ key, dist }]; `visibleKeys`: Set de claves visibles.
export function pickReleases(loaded, visibleKeys, keepExtra = 8) {
  const hidden = loaded.filter((t) => !visibleKeys.has(t.key)).sort((a, b) => a.dist - b.dist);
  return hidden.slice(keepExtra).map((t) => t.key);
}
