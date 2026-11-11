import * as THREE from "three";
import { CSS2DRenderer } from "three/examples/jsm/renderers/CSS2DRenderer.js";

// Crea la escena base del visor: esfera invertida (se ve la textura desde adentro),
// cámara, y los dos renderers (WebGL para la esfera, CSS2D para los marcadores anclados en 3D).
export function createViewerScene(containerEl) {
  const width = containerEl.clientWidth;
  const height = containerEl.clientHeight;

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(width, height);
  renderer.domElement.style.position = "absolute";
  renderer.domElement.style.inset = "0";
  containerEl.appendChild(renderer.domElement);

  const labelRenderer = new CSS2DRenderer();
  labelRenderer.setSize(width, height);
  labelRenderer.domElement.style.position = "absolute";
  labelRenderer.domElement.style.inset = "0";
  labelRenderer.domElement.style.pointerEvents = "none";
  containerEl.appendChild(labelRenderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, width / height, 1, 1100);

  const geometry = new THREE.SphereGeometry(500, 64, 32).scale(-1, 1, 1);
  const material = new THREE.MeshBasicMaterial({ color: 0x111122 });
  const sphere = new THREE.Mesh(geometry, material);
  scene.add(sphere);

  function render() {
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
  }

  function setSize(w, h) {
    if (!(w > 0 && h > 0)) return; // contenedor oculto/aún sin layout: aspect NaN rompería la cámara
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    labelRenderer.setSize(w, h);
  }

  function dispose() {
    geometry.dispose();
    material.dispose();
    renderer.dispose();
    // Libera el contexto WebGL ya (el navegador limita los vivos); sin esto StrictMode/remontajes los acumulan.
    renderer.forceContextLoss();
    containerEl.removeChild(renderer.domElement);
    containerEl.removeChild(labelRenderer.domElement);
  }

  return { scene, camera, renderer, labelRenderer, sphere, render, setSize, dispose };
}
