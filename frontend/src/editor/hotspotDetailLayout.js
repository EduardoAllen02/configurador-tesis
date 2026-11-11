// These controls edit the same group/pieces used by the canvas, never a second
// style document. Scene data/bindings and custom mobile geometry are preserved.
const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value)));
export const detailPieces = (elements) => (elements ?? []).flatMap((el) => [el, ...detailPieces(el.children)]);
export function detailLayout(detail) {
  const root = detail.elements?.[0];
  const pieces = detailPieces(root?.children);
  return { root, width: root?.frame?.w || 320, height: root?.props?.detailFixedHeight ? root.frame?.h : 0,
    automatic: root?.props?.detailAutoLayout === true,
    texts: pieces.filter((el) => el.template === "text"), images: pieces.filter((el) => el.template === "image") };
}
function editRoot(detail, edit) {
  if (detail.elements?.[0]?.template !== "group") return detail;
  return { ...detail, legacy: undefined, legacyPanel: undefined, elements: [edit(structuredClone(detail.elements[0])), ...detail.elements.slice(1)] };
}
export function resizeDetailWidth(detail, value) {
  if (!Number.isFinite(Number(value))) return detail;
  return editRoot(detail, (root) => {
    const width = clamp(value, 40, 900), old = root.frame?.w || 320, padding = root.props?.padding ?? 16;
    const ratio = Math.max(1, width - padding * 2) / Math.max(1, old - padding * 2);
    root.frame = { ...root.frame, w: width };
    root.props = { ...root.props, contentWidth: width };
    root.children = (root.children ?? []).map((child) => ({ ...child, frame: { ...child.frame,
      x: padding + ((child.frame?.x ?? padding) - padding) * ratio,
      w: Math.max(1, (child.frame?.w || old - padding * 2) * ratio) } }));
    return root;
  });
}
export function resizeDetailHeight(detail, value) {
  if (!Number.isFinite(Number(value))) return detail;
  return editRoot(detail, (root) => {
    const height = Number(value) > 0 ? clamp(value, 120, 1200) : 0;
    root.frame = { ...root.frame, h: height };
    root.props = { ...root.props, detailFixedHeight: height > 0, contentHeight: 0, autoFit: true };
    return root;
  });
}
export function setDetailAutoLayout(detail, automatic) {
  return editRoot(detail, (root) => {
    root.props = { ...root.props, detailAutoLayout: automatic };
    if (automatic) root.children = (root.children ?? []).map((child) => child.template === "text" ? { ...child, frame: { ...child.frame, h: 0 } } : child);
    return root;
  });
}
export function editDetailPiece(detail, id, change) {
  return editRoot(detail, (root) => {
    const visit = (rows) => rows.map((row) => {
      let next = row.id === id ? { ...row, props: { ...row.props, ...change.props }, frame: { ...row.frame, ...change.frame } } : row;
      if (row.id === id && row.template === "text" && root.props?.detailAutoLayout) next.frame.h = 0;
      if (next.children) next = { ...next, children: visit(next.children) };
      return next;
    });
    root.children = visit(root.children ?? []);
    return root;
  });
}
