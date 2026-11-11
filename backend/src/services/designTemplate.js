const path = require("path");

// Share interface sections only. Scene links belong to the destination tour and
// must be configured there; IDs of panels/elements remain internal to the snapshot.
function templateDesign(design) {
  const keys = ["brand", "screens", "theme", "hotspotPresets", "detailPanel", "panels", "panelDefaults"];
  const snapshot = { version: 1 };
  for (const key of keys) if (design[key] !== undefined) snapshot[key] = structuredClone(design[key]);
  function clean(value) {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) { value.forEach(clean); return; }
    if ("showIn" in value) value.showIn = "all";
    delete value.segments;
    delete value.targetSceneId;
    if (value.action?.type === "goToScene") value.action = { type: "none", target: null };
    Object.values(value).forEach(clean);
  }
  clean(snapshot);
  return snapshot;
}

function mapAssetReferences(value, resolve) {
  if (typeof value === "string" && value.startsWith("asset:")) return `asset:${resolve(value.slice(6))}`;
  if (Array.isArray(value)) return value.map((item) => mapAssetReferences(item, resolve));
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, mapAssetReferences(item, resolve)]));
  return value;
}

function assetFile(root, publicPath) {
  if (typeof publicPath !== "string" || !publicPath.startsWith("/uploads/")) throw new Error("Ruta de archivo no válida");
  const resolvedRoot = path.resolve(root);
  const file = path.resolve(resolvedRoot, publicPath.slice("/uploads/".length));
  if (!file.startsWith(`${resolvedRoot}${path.sep}`)) throw new Error("Ruta de archivo fuera de uploads");
  return file;
}

module.exports = { templateDesign, mapAssetReferences, assetFile };
