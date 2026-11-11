export const WINDOW_WIDTH = 440;
export const WINDOW_HEIGHT = 560;
export const TITLE_HEIGHT = 48;

export function clampWindowSize(size, viewport, position = { x: 0, y: 0 }) {
  const maxWidth = Math.max(Math.min(280, viewport.width - 16), viewport.width - Math.max(8, position.x) - 8, 1);
  const maxHeight = Math.max(Math.min(180, viewport.height - 16), viewport.height - Math.max(8, position.y) - 8, 1);
  return {
    width: Math.min(maxWidth, Math.max(280, Number.isFinite(size?.width) ? size.width : WINDOW_WIDTH)),
    height: Math.min(maxHeight, Math.max(180, Number.isFinite(size?.height) ? size.height : WINDOW_HEIGHT)),
  };
}

// Opening a window or resizing Chrome brings the whole window back into view;
// an intentional title drag may still place it partly outside the workspace.
export function fitWindowPosition(position, viewport, size) {
  return {
    x: Math.max(8, Math.min(position.x, viewport.width - Math.min(size.width, viewport.width - 16) - 8)),
    y: Math.max(8, Math.min(position.y, viewport.height - Math.min(size.height, viewport.height - 16) - 8)),
  };
}

// Leave 48 px of the draggable title (excluding the close button) reachable.
// The body may extend beyond any viewport edge; the title cannot disappear.
export function clampWindowPosition(position, viewport, width = WINDOW_WIDTH) {
  const reachable = Math.min(48, viewport.width);
  const grabWidth = Math.max(reachable, width - 48);
  const x = Number.isFinite(position?.x) ? position.x : viewport.width - width - 24;
  const y = Number.isFinite(position?.y) ? position.y : 112;
  return {
    x: Math.max(reachable - grabWidth, Math.min(x, viewport.width - reachable)),
    y: Math.max(0, Math.min(y, Math.max(0, viewport.height - TITLE_HEIGHT))),
  };
}
