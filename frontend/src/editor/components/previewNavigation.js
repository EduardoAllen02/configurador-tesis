// A new tab cannot inherit React Router state, so preview links also carry a
// small allowlist value. Never accept a URL or another tour as a return target.
export function previewHref(tourId, pathname) {
  const base = `/tours/${encodeURIComponent(tourId)}`;
  const editor = pathname === `${base}/design` ? "design" : "edit";
  return `${base}/view?editor=${editor}`;
}

export function previewEditorHref(tourId, { state, search = "" } = {}) {
  const base = `/tours/${encodeURIComponent(tourId)}`;
  if ([`${base}/edit`, `${base}/design`].includes(state?.editorOrigin)) return state.editorOrigin;
  const editor = new URLSearchParams(search).get("editor");
  return `${base}/${editor === "design" ? "design" : "edit"}`;
}
