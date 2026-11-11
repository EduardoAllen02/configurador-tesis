import { contextMenuOf, contextMenuEntries, contextMenuPosition } from "../model/contextMenu.js";
import "./contextMenu.css";

// Presentation and transient interaction only; the tour document owns configuration.
export function createContextMenu({ root, getConfig, resetView, reportError }) {
  let menu = null;
  let previousFocus = null;
  let returnFocusToRoot = false;
  let notice = null;
  let noticeTimer = null;
  const hadTabIndex = root.hasAttribute("tabindex");
  if (!hadTabIndex) root.tabIndex = -1;

  function showError(message) {
    clearTimeout(noticeTimer); notice?.remove();
    notice = document.createElement("div");
    notice.className = "tour-context-menu-notice";
    notice.dataset.ui = "context-menu-notice";
    notice.setAttribute("role", "alert"); notice.textContent = message;
    root.append(notice);
    noticeTimer = setTimeout(() => { notice?.remove(); notice = null; }, 5000);
    reportError?.(message);
  }

  function close({ restoreFocus = false } = {}) {
    if (!menu) return;
    const heldFocus = menu.contains(document.activeElement);
    menu.remove(); menu = null;
    if (restoreFocus && heldFocus) {
      (returnFocusToRoot ? root : previousFocus?.isConnected ? previousFocus : root).focus({ preventScroll: true });
    }
    previousFocus = null;
  }

  function canOpen() {
    const config = contextMenuOf(getConfig());
    const entries = contextMenuEntries(config, { fullscreenSupported: !!document.fullscreenEnabled && !!root.requestFullscreen, fullscreen: document.fullscreenElement === root });
    return { config, entries, credit: config.enabled && config.credit.enabled && !!config.credit.name.trim() };
  }

  function open(clientX, clientY) {
    close();
    const { config, entries, credit } = canOpen();
    if (!config.enabled || (!entries.length && !credit)) return false;
    previousFocus = document.activeElement;
    returnFocusToRoot = !root.contains(previousFocus);
    menu = document.createElement("div");
    menu.className = "tour-context-menu";
    menu.dataset.ui = "context-menu";
    menu.setAttribute("role", "menu");
    menu.setAttribute("aria-label", "Opciones del recorrido");
    menu.tabIndex = -1;
    for (const item of entries) {
      const node = document.createElement(item.type === "link" ? "a" : "button");
      node.className = "tour-context-menu-item";
      node.dataset.action = item.type;
      node.setAttribute("role", "menuitem");
      node.tabIndex = -1;
      node.textContent = item.label;
      if (item.type === "link") {
        node.href = item.url; node.target = "_blank"; node.rel = "noopener noreferrer";
        node.addEventListener("click", () => close({ restoreFocus: true }));
      } else {
        node.type = "button";
        node.addEventListener("click", async () => {
          close({ restoreFocus: true });
          try {
            if (item.type === "reset-view") resetView();
            else if (document.fullscreenElement === root) await document.exitFullscreen();
            else await root.requestFullscreen();
          } catch { showError("No se pudo cambiar a pantalla completa en este navegador."); }
        });
      }
      menu.append(node);
    }
    if (credit) {
      const node = document.createElement(config.credit.url ? "a" : "div");
      node.className = "tour-context-menu-credit";
      node.textContent = `Created by ${config.credit.name.trim()}`;
      if (entries.length) node.classList.add("tour-context-menu-credit--divider");
      if (config.credit.url) {
        node.href = config.credit.url; node.target = "_blank"; node.rel = "noopener noreferrer";
        node.setAttribute("role", "menuitem"); node.tabIndex = -1;
        node.addEventListener("click", () => close({ restoreFocus: true }));
      }
      menu.append(node);
    }
    root.append(menu);
    const bounds = root.getBoundingClientRect();
    const pos = contextMenuPosition(clientX - bounds.left, clientY - bounds.top, menu.offsetWidth, menu.offsetHeight, bounds);
    menu.style.left = `${pos.x}px`; menu.style.top = `${pos.y}px`;
    (menu.querySelector('[role="menuitem"]') || menu).focus({ preventScroll: true });
    return true;
  }

  function onPointerDown(event) { if (menu && !menu.contains(event.target)) close(); }
  function onKeyDown(event) {
    if (!menu) return;
    if (event.key === "Escape" || event.key === "Tab") {
      if (event.key === "Escape") event.preventDefault();
      event.stopPropagation(); close({ restoreFocus: true }); return;
    }
    if (!menu.contains(event.target)) return;
    const nodes = [...menu.querySelectorAll('[role="menuitem"]')];
    const index = nodes.indexOf(document.activeElement);
    let next;
    if (event.key === "ArrowDown") next = (index + 1) % nodes.length;
    else if (event.key === "ArrowUp") next = (index - 1 + nodes.length) % nodes.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = nodes.length - 1;
    else if (event.key === " " && document.activeElement.tagName === "A") { event.preventDefault(); document.activeElement.click(); return; }
    else return;
    event.preventDefault(); event.stopPropagation(); nodes[next]?.focus();
  }
  const dismiss = () => close();
  const onScroll = event => { if (!menu?.contains(event.target)) close(); };
  document.addEventListener("pointerdown", onPointerDown, true);
  document.addEventListener("keydown", onKeyDown, true);
  window.addEventListener("resize", dismiss);
  window.addEventListener("blur", dismiss);
  document.addEventListener("scroll", onScroll, true);
  const observer = new ResizeObserver(dismiss);
  observer.observe(root);
  return { open, close, dispose() {
    close(); observer.disconnect();
    clearTimeout(noticeTimer); notice?.remove();
    document.removeEventListener("pointerdown", onPointerDown, true);
    document.removeEventListener("keydown", onKeyDown, true);
    window.removeEventListener("resize", dismiss);
    window.removeEventListener("blur", dismiss);
    document.removeEventListener("scroll", onScroll, true);
    if (!hadTabIndex) root.removeAttribute("tabindex");
  } };
}
