import { resolveFrame } from "../layout/engine.js";
import { scaleElement } from "./elementResize.js";

// Old inline wrappers added padding outside the authored group. Convert once to
// an exterior frame, retaining IDs, bindings, fonts and manual piece positions.
export function exteriorLayout(layout, surface) {
  const next = structuredClone(layout);
  if (next.geometry === "outer" || !next.elements?.length) return next;
  if (next.legacy || next.legacyPanel) {
    if (next.elements.length !== 1 || next.elements[0].template !== "group") {
      const rects = next.elements.map(row => resolveFrame(row.frame, {W:320,H:400}, 1, {w:320,h:80}).rect);
      const left = Math.min(...rects.map(r=>r.left)), top = Math.min(...rects.map(r=>r.top));
      const width = Math.max(120,...rects.map(r=>r.left+r.width-left));
      next.elements = [{id:`hotspot-detail-${next.elements[0]?.id || "root"}`,template:"group",name:"Detalle del hotspot",
        frame:{anchor:"top-left",x:0,y:0,w:width,h:0},props:{autoFit:true,contentWidth:width,detailAutoLayout:false},
        children:next.elements.map((row,i)=>({...row,frame:{...row.frame,anchor:"top-left",x:rects[i].left-left,y:rects[i].top-top}}))}];
    }
    delete next.legacy; delete next.legacyPanel;
  }
  const root = next.elements[0];
  root.frame = { anchor: "top-left", x: 0, y: 0, w: 320, h: 0, ...root.frame };
  if (surface === "detail" && next.placement === "inline") {
    const k = root.props?.detailScale || 1, w = root.frame.w;
    const ratio = w / (root.props?.contentWidth || w);
    root.children = (root.children || []).map(child => {
      const scaled = scaleElement(child, ratio);
      scaled.frame.x = (child.frame.x || 0) * ratio + 15 * k;
      scaled.frame.y = (child.frame.y || 0) * ratio + 21 * k;
      return scaled;
    });
    root.frame.w += 30 * k;
    root.props = { ...root.props, contentWidth: root.frame.w, contentHeight: 0,
      padding: (root.props?.padding || 0) * ratio + 12 * k, detailAutoLayout: false };
  }
  next.geometry = "outer";
  return next;
}
