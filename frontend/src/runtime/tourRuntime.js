import { createViewerScene } from "./core/sceneSetup.js";
import { attachCameraControls } from "./core/cameraControls.js";
import { createTextureCache } from "./core/textureCache.js";
import { createHotspotRaycaster } from "./core/hotspotEditingRaycaster.js";
import { createMarkerLayer } from "./hotspots/markerLayer.js";
import { createNadir } from "./core/nadir.js";
import { createTiledPanorama } from "./core/tiledPanorama.js";
import { createHudLayer } from "./screens/hudLayer.js";
import { createIntroScreen } from "./screens/introScreen.js";
import { createContextMenu } from "./screens/contextMenu.js";
import { createReusablePanelLayer } from "./screens/reusablePanel.js";
import { reusablePanel, panelIdOfScreen } from "./model/interfaceModel.js";
import { detailOf } from "./model/hotspotDetail.js";
import { createScreenDetails } from "./hotspots/screenDetails.js";
import { getTemplate } from "./templates/index.js";
import { buildModel, buildPickerEntries, effectiveHotspotStyle, resolveInitial } from "./model/tourModel.js";
import { hotspotsForFrame } from "./model/frameHotspots.js";
import { applyFonts } from "./fonts/fonts.js"; // [B3]
import { applyTheme } from "./theme/index.js";

const DEFAULT_ACCENT = "#4da3ff";
const MSG_LOADING = "Cargando…";
const MSG_ERROR = "No pudimos cargar esta panorámica.";
const MSG_EMPTY = "Este tour aún no tiene escenas.";

// Motor único del tour: pinta un TourDocument en tres modos que comparten TODO el código.
//   view / export: topbar + scrubber del diseño + panel de detalle (idénticos entre sí; la
//                  única diferencia es de dónde vienen las URLs del documento).
//   edit:          solo la esfera y los marcadores (arrastrables); el editor pone su propio chrome.
//   design:        lo mismo que view pero quieto, para el editor de diseño (Oleada 3): sin
//                  animaciones de entrada, sin panel de detalle, la pantalla de inicio se muestra
//                  según setDesignScreen("intro"|"tour") y nunca se cierra sola. El editor pone su
//                  capa de selección encima y lee los rects con getElementBoxes() tras "layout".
// Un único renderer WebGL vive de principio a fin: cambiar de escena/cuadro solo cambia la
// textura y los marcadores, nunca recrea el contexto.
//
// Oleada 2: cada función nueva vive en su propio módulo (nadir, tiledPanorama, hudLayer,
// introScreen, frameHotspots, markerLayer) y este archivo solo los conecta. Las regiones
// marcadas [B1]…[B4] son las únicas que cada agente puede tocar aquí (docs/CONTRATO_OLEADA2.md).
export function createTourRuntime(container, initialDoc, opts = {}) {
  const mode = opts.mode || "view";
  const isEdit = mode === "edit";
  const isDesign = mode === "design";
  let editorState = null;
  let designScreen = opts.designScreen === "intro" || panelIdOfScreen(opts.designScreen) ? opts.designScreen : "tour";

  // ── Eventos ──────────────────────────────────────────────────────────
  const listeners = new Map();
  let booting = true; // los eventos del arranque se difieren a un microtask, para que quien creó el motor alcance a suscribirse
  const bootQueue = [];
  function dispatch(evt, data) {
    listeners.get(evt)?.forEach((fn) => {
      try {
        fn(data);
      } catch (err) {
        console.error(`[TourRuntime] error en el manejador de "${evt}"`, err);
      }
    });
  }
  function emit(evt, data) {
    if (booting) bootQueue.push([evt, data]);
    else dispatch(evt, data);
  }
  function on(evt, fn) {
    if (!listeners.has(evt)) listeners.set(evt, new Set());
    listeners.get(evt).add(fn);
  }
  function off(evt, fn) {
    listeners.get(evt)?.delete(fn);
  }

  // ── DOM base ─────────────────────────────────────────────────────────
  const root = document.createElement("div");
  root.className = "tour-rt-root";
  container.appendChild(root);

  const sceneApi = createViewerScene(root);
  const raycaster = createHotspotRaycaster({ camera: sceneApi.camera, sphere: sceneApi.sphere });
  const textures = createTextureCache({ frames: [] });

  // Detrás de la UI: el mensaje de carga/error no tapa el topbar ni el scrubber.
  const statusEl = document.createElement("div");
  statusEl.className = "tour-rt-status";
  statusEl.hidden = true;
  const uiLayer = document.createElement("div");
  uiLayer.className = "tour-rt-ui";
  root.append(statusEl, uiLayer);

  // ── Estado ───────────────────────────────────────────────────────────
  let doc = initialDoc;
  let model = buildModel(doc);
  let entries = buildPickerEntries(model);
  let activeBatch = null;
  let frameIndex = 0;
  let shownUrl = null; // URL de la textura puesta en la esfera
  let loadToken = 0; // guard anti-seek: una textura que llega tarde no pisa al cuadro vigente
  let readyEmitted = false;
  let destroyed = false;
  let openPanel = null; // { hotspot, el, template }
  let animationId = null;
  let loading = { sceneId: null, loaded: 0, total: 0, ready: false };

  const currentScene = () => activeBatch?.scenes[frameIndex] ?? null;
  const frameUrls = (batch) => batch.scenes.map((s) => s.image?.webp);

  function getState() {
    return {
      sceneId: currentScene()?.id ?? null,
      batchKey: activeBatch?.key ?? null,
      frameIndex,
      frameCount: activeBatch?.scenes.length ?? 0,
      ...controls.getViewState(),
    };
  }

  // ── Estado visual del motor (carga / error) ──────────────────────────
  function showStatus(text, kind) {
    if (isEdit) return; // el editor pinta su propio estado de carga/error
    statusEl.textContent = text;
    statusEl.className = `tour-rt-status tour-rt-status--${kind}`;
    statusEl.hidden = false;
  }
  function hideStatus() {
    statusEl.hidden = true;
  }

  // ── Diseño (variables CSS en la raíz) ────────────────────────────────
  function applyBrand() {
    const brand = doc?.design?.brand || {};
    root.style.setProperty("--tour-accent", brand.colors?.[0] || DEFAULT_ACCENT);
    const radius = brand.radius ?? 8;
    root.style.setProperty("--tour-radius", typeof radius === "number" ? `${radius}px` : String(radius));
    applyFonts(root, brand.fonts); // [B3] fuentes curadas de la marca
    applyTheme(root, doc?.design?.theme);
    nadir.apply(doc?.design?.nadir, doc); // [B1] doc resuelve "asset:<id>" → URL del logo
  }

  // ── [B1] Cámara + nadir ──────────────────────────────────────────────
  // Si cambia el límite del nadir, la vista actual se vuelve a acotar al instante.
  const nadir = createNadir({ scene: sceneApi.scene, camera: sceneApi.camera, onChange: () => controls.reclamp() });
  const controls = attachCameraControls({
    containerEl: root,
    camera: sceneApi.camera,
    getMinLat: (fov) => nadir.getMinLat(fov),
    onArrowKey: (dir) => {
      if (!isEdit) goToFrame(frameIndex + dir);
    },
  });
  const contextMenu = createContextMenu({
    root,
    getConfig: () => doc?.design?.contextMenu,
    resetView: () => controls.resetView(currentScene()?.initialYaw || 0, currentScene()?.initialPitch || 0),
    reportError: message => emit("actionerror", { message }),
  });

  // ── [B4] Mosaicos AVIF ───────────────────────────────────────────────
  // onSupport: la prueba de AVIF es asíncrona; si termina después del primer loadFrame, se reevalúa.
  const tiled = createTiledPanorama({
    scene: sceneApi.scene,
    camera: sceneApi.camera,
    sphere: sceneApi.sphere,
    onProgress: (progress) => {
      if (!destroyed && progress.sceneId === currentScene()?.id) reportProgress(progress);
    },
    onSupport: () => {
      if (!destroyed && activeBatch) loadFrame();
    },
  });

  function pickLonLat(clientX, clientY) {
    return raycaster.pointToLonLat(clientX, clientY, root.getBoundingClientRect());
  }

  // ── [B2] Marcadores ──────────────────────────────────────────────────
  // hotspotmove lleva el cuadro donde se soltó: con keyframes (B1) el editor guarda la posición
  // de ESE cuadro, no la lon/lat base del hotspot.
  const markers = createMarkerLayer({
    scene: sceneApi.scene,
    mode: isDesign ? "view" : mode,
    container: root,
    pick: pickLonLat,
    getContext: uiCtx,
    onOpen: handleHotspotOpen,
    onClick: (hotspot, rect) => emit("hotspotclick", { hotspot, rect }),
    onEditPiece: (hotspot, piece, rect) => emit("hotspoteditpiece", { hotspot, piece, rect }),
    onMove: (id, { lon, lat }) =>
      emit("hotspotmove", { id, lon, lat, sceneId: currentScene()?.id ?? null, frameIndex }),
    onStyleMove: (id, style) => emit("hotspotstylechange", { id, style }),
    onResize: (id, patch) => emit("hotspotresize", { id, patch }),
  });
  let hotspotTesting = false;
  const details = createScreenDetails(root, () => ({ ...uiCtx(), mode: hotspotTesting ? "view" : mode, getTemplate,
    onEditPiece: isEdit ? (hotspot,piece,rect) => { if (!hotspotTesting) emit("hotspoteditpiece", {hotspot,piece,rect}); } : null }));

  // [B1] qué hotspots y en qué posición (hotspotsForFrame); [B2] cómo se ven (estilo efectivo).
  function refreshMarkers() {
    const placed = activeBatch ? hotspotsForFrame(model, activeBatch, frameIndex) : [];
    const rows = placed.map(({ hotspot, lon, lat }) => ({ hotspot, lon, lat, style: effectiveHotspotStyle(hotspot, doc.design) }));
    markers.setEntries(rows);
    details.sync(rows);
  }

  function handleHotspotOpen(hotspot) {
    if (isDesign) return; // en el editor de diseño los marcadores solo se ven
    const detail = detailOf(hotspot);
      if (!detail?.enabled || detail.placement !== "screen") details.close();
      if (detail?.placement === "inline") closePanel();
    if (detail) {
      if (detail.enabled) { if (detail.placement === "screen") { closePanel(); details.open(hotspot); } }
      else if (hotspot.type === "nav" && hotspot.targetSceneId) goToScene(hotspot.targetSceneId);
      return;
    }
    if (hotspot.type === "nav") {
      if (hotspot.targetSceneId) goToScene(hotspot.targetSceneId);
      return;
    }
    showPanel(hotspot);
    emit("hotspotopen", { hotspot });
  }

  // ── Panel de detalle ─────────────────────────────────────────────────
  function panelSpec(hotspot) {
    const panel = reusablePanel(doc?.design, hotspot);
    if (panel) return { panel };
    const spec = doc?.design?.detailPanel;
    return { template: getTemplate(spec?.template) || getTemplate("floating-card"), props: spec?.props || {} };
  }
  function showPanel(hotspot) {
    closePanel();
    if (isDesign) return;
    const { template, props, panel } = panelSpec(hotspot);
    if (panel) {
      const layer = createReusablePanelLayer({ root: uiLayer, getTemplate, onClose: closePanel });
      layer.update(panel, { ...uiCtx(), hotspot });
      openPanel = { hotspot, el: layer.el, layer };
      return;
    }
    const el = template.render(props, { hotspot, mode, onClose: closePanel });
    uiLayer.appendChild(el);
    openPanel = { hotspot, el, template };
  }
  function closePanel() {
    if (!openPanel) return;
    if (openPanel.layer) openPanel.layer.dispose();
    else { openPanel.template?.dispose?.(openPanel.el); openPanel.el.remove(); }
    openPanel = null;
  }
  function refreshPanel() {
    if (!openPanel) return;
    const fresh = (model.hotspotsByScene.get(openPanel.hotspot.sceneId) || []).find((h) => h.id === openPanel.hotspot.id);
    if (!fresh) {
      closePanel();
      return;
    }
    // Cambiar un panel asignado o sus datos actualiza también su estructura.
    showPanel(fresh);
  }

  // ── [B3] UI del diseño: HUD del recorrido + pantalla de inicio ───────
  const emitLayout = (screen) => (info) => emit("layout", { screen, ...info });
  const hud = createHudLayer({ uiLayer, getTemplate, animate: !isDesign, onLayout: emitLayout("tour") });
  const intro = createIntroScreen();

  function uiCtx() {
    return { mode, doc, state: getState(), loading, entries, goToScene, goToFrame, seek: goToFrame, ...(isDesign ? { editorState } : {}) };
  }

  function reportProgress(progress) {
    loading = { ...loading, ...progress };
    emit("loadprogress", { sceneId: loading.sceneId, loaded: loading.loaded, total: loading.total });
    updateUI();
    intro.refreshProgress();
  }

  function rebuildUI() {
    if (isEdit) return; // el editor tiene su propio chrome: sin elementos de screens.tour
    const defs = (doc?.design?.screens?.tour?.elements || []).filter((def) => !def.hidden);
    hud.rebuild(defs, uiCtx());
    // El panel de detalle se ancla bajo la barra superior si la hay.
    root.style.setProperty("--tour-rt-top", `${hud.getTopInset() + 16}px`);
    if (isDesign) refreshDesignIntro();
  }

  function updateUI() {
    if (isEdit) return;
    hud.update(uiCtx());
  }

  function showIntro() {
    if (isEdit) return;
    if (isDesign) {
      refreshDesignIntro();
      return;
    }
    intro.show(doc, {
      root,
      getTemplate,
      getCtx: uiCtx,
      enter: () => {
        intro.hide();
        emit("enter");
      },
    });
  }

  // Modo diseño: la pantalla de inicio se ve cuando el editor está en "Inicio" (aunque aún no
  // esté activada para los visitantes) y se actualiza en su lugar con cada cambio del diseño.
  let designIntroShown = false;
  let designPanel = null;
  function designIntroDoc() {
    const introDef = doc?.design?.screens?.intro || {};
    return { ...doc, design: { ...doc.design, screens: { ...doc.design.screens, intro: { ...introDef, enabled: true } } } };
  }
  function refreshDesignIntro() {
    const panelId = panelIdOfScreen(designScreen);
    const panel = doc?.design?.panels?.find((p) => p.id === panelId);
    if (panel) {
      if (!designPanel) designPanel = createReusablePanelLayer({ root: uiLayer, getTemplate, design: true, onLayout: (info) => emit("layout", { screen: designScreen, ...info }) });
      designPanel.update(panel, uiCtx());
    } else { designPanel?.dispose(); designPanel = null; }
    uiLayer.querySelectorAll(":scope > .tour-rt-el").forEach((el) => { el.hidden = !!panelId || designScreen === "intro"; });
    if (designScreen !== "intro") {
      if (designIntroShown) intro.dispose();
      designIntroShown = false;
      return;
    }
    const d = designIntroDoc();
    if (designIntroShown) intro.refresh(d);
    else {
      intro.show(d, { root, getTemplate, getCtx: uiCtx, enter: () => {}, design: true, onLayout: emitLayout("intro") });
      designIntroShown = true;
    }
  }
  function setDesignScreen(screen) {
    if (!isDesign) return;
    const next = screen === "intro" || panelIdOfScreen(screen) ? screen : "tour";
    if (next === designScreen) return;
    designScreen = next;
    refreshDesignIntro();
    emit("layout", { screen: designScreen });
  }
  // Rects visuales (px del contenedor del motor) de los elementos de la pantalla que se ve.
  function getElementBoxes() {
    const screen = isDesign ? designScreen : "tour";
    return { screen, boxes: screen === "intro" ? intro.getBoxes(root) : panelIdOfScreen(screen) ? designPanel?.getBoxes(root) ?? [] : hud.getBoxes(root) };
  }

  // ── Navegación ───────────────────────────────────────────────────────
  function loadFrame() {
    const batch = activeBatch;
    const idx = frameIndex;
    const scene = currentScene();
    const url = batch?.scenes[idx]?.image?.webp;
    const token = ++loadToken;
    reportProgress({ sceneId: scene?.id ?? null, loaded: 0, total: 0, ready: false });
    if (!url) {
      showStatus(MSG_ERROR, "error");
      emit("loaderror", { sceneId: scene?.id ?? null, index: idx });
      return;
    }
    // [B4] Si la prueba de AVIF aún corre, se espera: onSupport vuelve a llamar a loadFrame.
    if (scene?.image?.tiles && tiled.isProbing()) return;
    // [B4] Una escena con mosaicos listos se pinta con ellos; `shownUrl` lleva una clave propia
    // para que volver a la misma escena no la recargue.
    const useTiles = tiled.canShow(scene);
    const shownKey = useTiles ? `tiles:${scene.id}` : url;
    if (shownKey === shownUrl) {
      hideStatus();
      reportProgress({ loaded: 1, total: 1, ready: true });
      if (!isEdit && !useTiles) textures.preloadGPU(idx);
      return;
    }

    function onShown() {
      shownUrl = shownKey;
      hideStatus();
      reportProgress({ loaded: loading.total || loading.loaded || 1, total: loading.total || loading.loaded || 1, ready: true });
      if (!readyEmitted) {
        readyEmitted = true;
        emit("ready");
      }
      intro.setReady(true); // [B3] "Entrar al tour" se habilita cuando ya hay algo que ver
      emit("sceneready", { sceneId: scene.id });
    }
    function onFailed() {
      if (destroyed || token !== loadToken) return;
      showStatus(MSG_ERROR, "error");
      emit("loaderror", { sceneId: scene.id, index: idx });
    }

    if (useTiles) {
      tiled
        .show(scene)
        .then(() => {
          if (destroyed || token !== loadToken) return;
          onShown();
        })
        .catch(() => {
          if (destroyed || token !== loadToken) return;
          // [B4] Si los mosaicos no cargaron, `canShow` ya dice false para esta escena: se usa la WebP.
          if (!tiled.canShow(scene)) loadFrame();
          else onFailed();
        });
      return;
    }
    tiled.hide();
    textures
      .loadTexture(idx, (progress) => {
        if (!destroyed && token === loadToken) reportProgress(progress);
      })
      .then((texture) => {
        if (destroyed || token !== loadToken) return;
        const material = sceneApi.sphere.material;
        material.map = texture;
        material.color.set(0xffffff);
        material.needsUpdate = true;
        onShown();
        if (!isEdit) textures.preloadGPU(idx); // en edición se carga solo el cuadro activo
      })
      .catch(onFailed);
  }

  // Cambia al cuadro `index` del lote activo. `batchChanged` = acabamos de entrar a otro lote
  // (se vacía la esfera hasta que llegue su textura; entre cuadros del mismo lote se conserva la
  // anterior para que el scrubber no parpadee).
  function setFrame(index, { resetCamera = false, batchChanged = false } = {}) {
    contextMenu.close();
    const prevSceneId = currentScene()?.id ?? null;
    frameIndex = Math.max(0, Math.min(activeBatch.scenes.length - 1, index));
    const scene = currentScene();

    if (resetCamera) controls.setLonLat(scene.initialYaw || 0, scene.initialPitch || 0);
    if (batchChanged) {
      const material = sceneApi.sphere.material;
      material.map = null;
      material.color.set(0x111122);
      material.needsUpdate = true;
      shownUrl = null;
      showStatus(MSG_LOADING, "loading");
    }
    // Un hotspot de video con segmento sigue visible en otros cuadros: su panel se cierra solo
    // cuando deja de estar en el cuadro actual (o al cambiar de lote).
    if (openPanel) {
      const stillVisible =
        !batchChanged && hotspotsForFrame(model, activeBatch, frameIndex).some((p) => p.hotspot.id === openPanel.hotspot.id);
      if (!stillVisible) closePanel();
    }

    loadFrame();
    refreshMarkers();
    if (batchChanged) emit("scenechange", { sceneId: scene.id });
    if (batchChanged || prevSceneId !== scene.id) {
      emit("framechange", { index: frameIndex, total: activeBatch.scenes.length, sceneId: scene.id });
    }
    updateUI();
  }

  function activateBatch(batch, index, { resetCamera }) {
    activeBatch = batch;
    textures.setFrames(frameUrls(batch));
    setFrame(index, { resetCamera, batchChanged: true });
  }

  function goToFrame(index) {
    if (!activeBatch || !Number.isFinite(index)) return;
    const clamped = Math.max(0, Math.min(activeBatch.scenes.length - 1, Math.round(index)));
    if (clamped === frameIndex) return;
    setFrame(clamped);
  }

  function goToScene(sceneId) {
    const target = model.batchByScene.get(sceneId);
    if (!target) return;
    if (activeBatch && target.batch.key === activeBatch.key) {
      if (target.index === frameIndex) return;
      // Entre cuadros de un video la vista se conserva (es continuo); entre panorámicas de un
      // mismo lote, cada una abre en su orientación inicial.
      const scene = target.batch.scenes[target.index];
      setFrame(target.index, { resetCamera: scene.origen !== "video_frame" });
    } else {
      activateBatch(target.batch, target.index, { resetCamera: true });
    }
  }

  function clearToEmpty() {
    contextMenu.close();
    activeBatch = null;
    frameIndex = 0;
    loadToken++;
    shownUrl = null;
    const material = sceneApi.sphere.material;
    material.map = null;
    material.color.set(0x111122);
    material.needsUpdate = true;
    tiled.hide();
    markers.setEntries([]);
    details.sync([]);
    closePanel();
    showStatus(MSG_EMPTY, "error");
    updateUI();
  }

  // Re-renderiza con un documento nuevo SIN recrear WebGL: se conserva la cámara y, si la
  // escena activa sigue existiendo, también su textura.
  function setDocument(nextDoc) {
    if (destroyed) return;
    contextMenu.close();
    const prevScene = currentScene();
    const prevKey = activeBatch?.key ?? null;
    doc = nextDoc;
    model = buildModel(doc);
    entries = buildPickerEntries(model);
    applyBrand();

    let target = prevScene ? model.batchByScene.get(prevScene.id) : null;
    if (!target && prevKey) {
      const batch = model.batches.find((b) => b.key === prevKey);
      if (batch) target = { batch, index: Math.min(frameIndex, batch.scenes.length - 1) };
    }
    let resetCamera = false;
    if (!target) {
      const initial = resolveInitial(model, {});
      target = initial && { batch: initial.batch, index: initial.frameIndex };
      resetCamera = true;
    }

    if (!target) {
      clearToEmpty();
    } else if (target.batch.key === prevKey) {
      activeBatch = target.batch;
      textures.setFrames(frameUrls(activeBatch));
      frameIndex = target.index;
      const scene = currentScene();
      // [B4] la clave incluye si la escena se pinta con mosaicos (el modo de calidad pudo cambiar)
      if ((tiled.canShow(scene) ? `tiles:${scene.id}` : scene.image?.webp) !== shownUrl) loadFrame();
      refreshMarkers();
      if (prevScene?.id !== scene.id) {
        emit("framechange", { index: frameIndex, total: activeBatch.scenes.length, sceneId: scene.id });
      }
    } else {
      activateBatch(target.batch, target.index, { resetCamera });
    }
    refreshPanel();
    rebuildUI();
  }


  // Solo cambió el diseño (el editor de diseño lo llama en cada arrastre): sin rehacer el modelo
  // de escenas ni recargar texturas; marca, marcadores, panel y elementos se actualizan en su lugar.
  function setDesign(design) {
    if (destroyed || !doc) return;
    contextMenu.close();
    doc = { ...doc, design };
    applyBrand();
    refreshMarkers();
    refreshPanel();
    rebuildUI();
  }

  // Editor: agregar un hotspot. Visitante/Probar: menú opcional del tour.
  function handleContextMenu(e) {
    if (e.target.closest?.("[data-ui], button, a, input, textarea, select, .hs-marker, .tour-rt-intro")) return;
    if (isEdit && !hotspotTesting) {
      e.preventDefault();
      const lonLat = pickLonLat(e.clientX, e.clientY);
      if (lonLat) emit("contextmenu", { ...lonLat, clientX: e.clientX, clientY: e.clientY });
    } else if (!isDesign && currentScene() && contextMenu.open(e.clientX, e.clientY)) e.preventDefault();
  }
  root.addEventListener("contextmenu", handleContextMenu);

  // ── Render loop y tamaño ─────────────────────────────────────────────
  function animate() {
    tiled.update(); // [B4]
    sceneApi.render();
    markers.constrainDetails();
    animationId = requestAnimationFrame(animate);
  }
  animate();

  const resizeObserver = new ResizeObserver(() => sceneApi.setSize(root.clientWidth, root.clientHeight));
  resizeObserver.observe(root);

  // ── Arranque ─────────────────────────────────────────────────────────
  applyBrand();
  showIntro(); // [B3] si el diseño tiene pantalla de inicio, tapa el recorrido mientras carga
  const initial = resolveInitial(model, opts);
  if (initial) activateBatch(initial.batch, initial.frameIndex, { resetCamera: true });
  else clearToEmpty();
  rebuildUI();

  booting = false;
  queueMicrotask(() => bootQueue.splice(0).forEach(([evt, data]) => dispatch(evt, data)));

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    cancelAnimationFrame(animationId);
    resizeObserver.disconnect();
    root.removeEventListener("contextmenu", handleContextMenu);
    contextMenu.dispose();
    controls.dispose();
    closePanel();
    markers.dispose();
    details.dispose();
    designPanel?.dispose();
    hud.dispose();
    intro.dispose();
    nadir.dispose();
    tiled.dispose();
    textures.dispose();
    sceneApi.dispose();
    listeners.clear();
    root.remove();
  }

  return {
    setEditorState(value) { if (!isDesign) return; editorState = value; updateUI(); if (designScreen !== "tour") refreshDesignIntro(); },
    setHotspotTesting(value) { if (isEdit) { contextMenu.close(); hotspotTesting = value; details.close(); markers.setMode(value ? "view" : "edit"); } },
    previewHotspotDetail(id, show) { markers.previewDetail(id, show); details.preview(id, show); },
    selectHotspot(id) { if (mode === "edit") markers.select(id); },
    setDocument,
    setDesign,
    goToScene,
    goToFrame,
    getState,
    focus: (lon, lat, ms = 600) => controls.animateCameraTo(lon, lat, ms),
    pickLonLat,
    setDesignScreen,
    getElementBoxes,
    on,
    off,
    destroy,
  };
}
