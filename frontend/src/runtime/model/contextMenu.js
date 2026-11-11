export const CONTEXT_MENU_LIMIT = 8;
export const CONTEXT_ACTIONS = {
  fullscreen: "Pantalla completa",
  "reset-view": "Restablecer la vista",
  link: "Abrir enlace",
};

// A tour without this section keeps the browser's normal context menu.
export function safeContextUrl(value) {
  if (typeof value !== "string" || value.length > 2048 || !/^https?:\/\//i.test(value.trim())) return "";
  try {
    const url = new URL(value.trim());
    return ["https:", "http:"].includes(url.protocol) ? url.href : "";
  } catch { return ""; }
}

export function contextMenuOf(value) {
  const source = value && typeof value === "object" ? value : {};
  const items = Array.isArray(source.items) ? source.items : [
    { id: "fullscreen", type: "fullscreen", label: "" },
    { id: "reset-view", type: "reset-view", label: "" },
  ];
  const ids = new Set();
  return {
    enabled: source.enabled === true,
    items: items.filter(item => item && Object.hasOwn(CONTEXT_ACTIONS, item.type) && typeof item.id === "string" && !ids.has(item.id) && ids.add(item.id))
      .slice(0, CONTEXT_MENU_LIMIT).map(item => ({ id: item.id, type: item.type, label: String(item.label ?? "").slice(0, 100), url: safeContextUrl(item.url) })),
    credit: {
      enabled: source.credit?.enabled !== false,
      name: String(source.credit?.name ?? "").slice(0, 100),
      url: safeContextUrl(source.credit?.url),
    },
  };
}

export function contextMenuEntries(config, { fullscreenSupported = true, fullscreen = false } = {}) {
  if (!config.enabled) return [];
  return config.items.filter(item => (item.type !== "fullscreen" || fullscreenSupported) && (item.type !== "link" || item.url))
    .map(item => ({ ...item, label: item.label.trim() || (item.type === "fullscreen" && fullscreen ? "Salir de pantalla completa" : CONTEXT_ACTIONS[item.type]) }));
}

export function contextMenuPosition(x, y, width, height, bounds) {
  const margin = 6;
  return {
    x: Math.max(margin, Math.min(x, bounds.width - width - margin)),
    y: Math.max(margin, Math.min(y, bounds.height - height - margin)),
  };
}
