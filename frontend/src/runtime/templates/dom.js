// Helper mínimo para armar DOM a mano. Todo texto entra por textContent (nunca innerHTML):
// los datos del tour son del usuario y el bundle exportado se abre en sitios ajenos.
export function h(tag, props = {}, children = []) {
  const el = document.createElement(tag);
  Object.entries(props).forEach(([key, value]) => {
    if (value == null || value === false) return;
    if (key === "className") el.className = value;
    else if (key === "text") el.textContent = value;
    else if (key === "style") Object.assign(el.style, value);
    else if (key.startsWith("on") && typeof value === "function") el.addEventListener(key.slice(2).toLowerCase(), value);
    else el.setAttribute(key, value === true ? "" : value);
  });
  [].concat(children).forEach((child) => {
    if (child != null && child !== false) el.append(child);
  });
  return el;
}
