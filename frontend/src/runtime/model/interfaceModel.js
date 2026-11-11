// Reglas compartidas por Interfaz, Contenido y el visor/export. Sin DOM.
export const isGlobalInterface = (element) => ["basic-topbar", "frame-scrubber"].includes(element.template);
export function visibleInScene(element, sceneId) {
  if (isGlobalInterface(element)) return true;
  return element.showIn == null || element.showIn === "all" || (Array.isArray(element.showIn) && element.showIn.includes(sceneId));
}

export function sceneIdsForEntry(model, entry) {
  return model.batches.find((batch) => batch.key === entry.key)?.scenes.map((scene) => scene.id) ?? [];
}

export function toggleSceneEntry(showIn, sceneIds, checked, allSceneIds = []) {
  const next = new Set(showIn == null || showIn === "all" ? allSceneIds : showIn);
  sceneIds.forEach((id) => checked ? next.add(id) : next.delete(id));
  return [...next];
}

export function reusablePanel(design, hotspot) {
  const id = hotspot?.content?.panelId ?? design?.panelDefaults?.[hotspot?.type];
  return design?.panels?.find((panel) => panel.id === id) ?? null;
}

// Cada pieza conserva su estilo; el enlace reemplaza solo el valor de contenido.
export function bindPanelElements(elements, hotspot = {}) {
  return (elements ?? []).map((element) => {
    const next = { ...element, props: { ...(element.props ?? {}) } };
    if (["title", "description", "price", "image"].includes(element.bind)) {
      const key = element.bind === "image" ? "asset" : "text";
      next.props[key] = element.bind === "image" ? hotspot.image ?? "" : String(hotspot[element.bind] ?? "");
    }
    if (element.children) next.children = bindPanelElements(element.children, hotspot);
    return next;
  });
}

export const panelIdOfScreen = (screen) => typeof screen === "string" && screen.startsWith("panel:") ? screen.slice(6) : null;

export function screenElements(design, screen) {
  const panelId = panelIdOfScreen(screen);
  return panelId ? design?.panels?.find((panel) => panel.id === panelId)?.elements ?? [] : design?.screens?.[screen]?.elements ?? [];
}

export function withScreenElements(design, screen, elements) {
  const panelId = panelIdOfScreen(screen);
  if (panelId) return { ...design, panels: (design.panels ?? []).map((panel) => panel.id === panelId ? { ...panel, elements } : panel) };
  const screens = design.screens ?? {};
  const current = screens[screen] ?? (screen === "intro" ? { enabled: false, background: null } : {});
  return { ...design, screens: { ...screens, [screen]: { ...current, elements } } };
}
