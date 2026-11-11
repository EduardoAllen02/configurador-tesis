// Copy only reusable interface sections; tour content/settings stay in the destination.
export function applySharedTemplate(design, snapshot) {
  const next = { ...design };
  for (const key of ["brand", "screens", "theme", "hotspotPresets", "detailPanel", "panels", "panelDefaults"]) {
    if (snapshot[key] !== undefined) next[key] = structuredClone(snapshot[key]);
    else if (["theme", "panels", "panelDefaults"].includes(key)) delete next[key];
  }
  return next;
}
