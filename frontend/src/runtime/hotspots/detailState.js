// Runtime-only intent. Neither visitor expansion nor editor preview is document data.
export function createDetailState() {
  let policy, visitorOpen = false, editorPreview = false;
  return {
    configure(detail) {
      const next = `${!!detail?.enabled}:${detail?.placement}:${detail?.reveal}`;
      if (next !== policy) visitorOpen = false;
      policy = next;
      this.detail = detail;
    },
    preview(show) { editorPreview = !!show; },
    resetVisitor() { visitorOpen = false; },
    toggle() { visitorOpen = !visitorOpen; },
    get open() {
      return !!this.detail?.enabled && this.detail.placement === "inline" &&
        (this.detail.reveal === "always" || editorPreview || visitorOpen);
    },
    get previewing() { return editorPreview; },
  };
}
