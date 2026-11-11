import { migrateDesignGroups } from "../../runtime/model/groupMigration.js";
import { panelIdOfScreen } from "../../runtime/model/interfaceModel.js";
// Almacén del editor de diseño (Oleada 3): el ÚNICO dueño del diseño mientras se edita.
// Sin React (se prueba en Node); los componentes lo leen con useDesignStore (designHooks.js).
//
//   const store = createDesignStore({ save: (design) => api.patch(…) });
//   store.load(design)                       diseño inicial (del documento del tour)
//   store.apply(updater, { label, mergeKey }) cambio con deshacer + guardado automático
//   store.beginGesture() / store.preview(updater) / store.endGesture(label) / store.cancelGesture()
//                                            arrastres y redimensiones: se ven en vivo y quedan
//                                            como UN solo paso de deshacer al soltar
//   store.undo() / store.redo()
//   store.select(ids) / setScreen(screen) / setDevice(device)
//   store.openPanel(name, data?) / closePanel()   panel lateral que reemplaza al cajón (C2 lo pinta;
//                                            el lienzo C1 lo abre desde la mini-barra): "color",
//                                            "position", "animate", "font", "drawer:<id>"…
//   store.setEditing({ id, key } | null)     texto que se edita en el lienzo (doble clic)
//   store.flush()                            guarda ya (Ctrl+S); promesa con el diseño guardado
//   store.getState() / store.subscribe(fn)
//
// Estado (inmutable; cada cambio crea un objeto nuevo):
//   { design, status: "loading"|"saved"|"dirty"|"saving"|"error", error, selection: [ids],
//     screen: "tour"|"intro", device: "desktop"|"tablet"|"mobile", canUndo, canRedo, label,
//     panel: null | { name, ...data }, editing: null | { id, key } }
//
// Reglas:
//   · apply con el mismo `mergeKey` en menos de MERGE_MS se junta en un paso de deshacer
//     (deslizar un control, escribir un texto).
//   · El guardado automático sale AUTOSAVE_MS después del último cambio. Si el diseño cambió
//     mientras se guardaba, se vuelve a guardar; la respuesta del servidor nunca pisa lo local.
//   · La selección se limpia sola de ids que ya no existen en la pantalla activa.
import { elementsOf, findElement, flattenElements, parentOf } from "./elementOps.js";

export const AUTOSAVE_MS = 800;
export const MERGE_MS = 700;
export const HISTORY_LIMIT = 100;

export function createDesignStore({ save, autosaveMs = AUTOSAVE_MS, now = () => Date.now(), schedule = setTimeout, cancel = clearTimeout } = {}) {
  let state = {
    design: null,
    status: "loading",
    error: null,
    selection: [],
    screen: "tour",
    device: "desktop",
    previewSceneId: null,
    canUndo: false,
    canRedo: false,
    label: null,
    panel: null,
    editing: null,
    activeGroupId: null,
    insertionSceneId: null,
    insertionGroupId: null,
    elementPreview: null,
  };
  const listeners = new Set();
  let past = []; // [{ design, label }]
  let future = [];
  let lastMerge = { key: null, at: 0 };
  let gesture = null; // { before }
  let timer = null;
  let version = 0; // sube con cada cambio local
  let savedVersion = 0;
  let saving = null; // promesa en curso

  function set(patch) {
    state = { ...state, ...patch, canUndo: past.length > 0, canRedo: future.length > 0 };
    if (patch.design || patch.screen) {
      state.selection = pruneSelection(state.selection);
      if (state.activeGroupId && !findElement(state.design, state.screen, state.activeGroupId)?.children) state.activeGroupId = null;
      if (state.editing && !state.selection.includes(state.editing.id)) state.editing = null;
    }
    listeners.forEach((fn) => fn(state));
  }

  function pruneSelection(selection) {
    const ids = new Set(flattenElements(elementsOf(state.design, state.screen)).map((el) => el.id));
    const next = selection.filter((id) => ids.has(id));
    return next.length === selection.length ? selection : next;
  }

  function scheduleSave() {
    if (!save) return;
    cancel(timer);
    timer = schedule(() => {
      timer = null;
      runSave().catch(() => {});
    }, autosaveMs);
  }

  function runSave() {
    if (!save || !state.design) return Promise.resolve(state.design);
    if (saving) return saving.then(() => (version !== savedVersion ? runSave() : state.design));
    const sentVersion = version;
    const sent = state.design;
    set({ status: "saving" });
    saving = Promise.resolve()
      .then(() => save(sent))
      .then(
        (saved) => {
          saving = null;
          savedVersion = sentVersion;
          if (version === sentVersion) set({ status: "saved", error: null });
          else {
            set({ status: "dirty" });
            scheduleSave();
          }
          return saved ?? sent;
        },
        (err) => {
          saving = null;
          set({ status: "error", error: err?.message || "No se pudo guardar" });
          throw err;
        }
      );
    return saving;
  }

  function changed(design, label) {
    version += 1;
    set({ design, status: "dirty", label });
    scheduleSave();
  }

  function pushHistory(before, label) {
    past.push({ design: before, label });
    if (past.length > HISTORY_LIMIT) past.shift();
    future = [];
  }

  const api = {
    getState: () => state,
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },

    load(design) {
      design = migrateDesignGroups(design);
      past = [];
      future = [];
      gesture = null;
      version = savedVersion = 0;
      set({ design, status: "saved", error: null, selection: [], label: null, activeGroupId: null });
    },

    apply(updater, { label = "Cambio", mergeKey = null } = {}) {
      if (!state.design) return;
      const base = gesture ? gesture.before : state.design;
      const next = updater(state.design);
      if (!next || next === state.design) return;
      if (gesture) {
        // Dentro de un gesto, apply se comporta como preview.
        set({ design: next });
        return;
      }
      const t = now();
      const merge = mergeKey && lastMerge.key === mergeKey && t - lastMerge.at < MERGE_MS && past.length > 0;
      if (!merge) pushHistory(base, label);
      else future = [];
      lastMerge = { key: mergeKey, at: t };
      changed(next, label);
    },

    beginGesture() {
      if (!state.design || gesture) return;
      gesture = { before: state.design };
    },
    preview(updater) {
      if (!gesture) api.beginGesture();
      const next = updater(state.design);
      if (next && next !== state.design) set({ design: next });
    },
    endGesture(label = "Mover") {
      if (!gesture) return;
      const { before } = gesture;
      gesture = null;
      if (state.design === before) return;
      pushHistory(before, label);
      lastMerge = { key: null, at: 0 };
      changed(state.design, label);
    },
    cancelGesture() {
      if (!gesture) return;
      const { before } = gesture;
      gesture = null;
      set({ design: before });
    },

    undo() {
      if (gesture || past.length === 0) return;
      const prev = past.pop();
      future.push({ design: state.design, label: prev.label });
      lastMerge = { key: null, at: 0 };
      changed(prev.design, prev.label);
    },
    redo() {
      if (gesture || future.length === 0) return;
      const next = future.pop();
      past.push({ design: state.design, label: next.label });
      lastMerge = { key: null, at: 0 };
      changed(next.design, next.label);
    },

    select(ids) {
      const list = (Array.isArray(ids) ? ids : ids == null ? [] : [ids]).filter(Boolean);
      set({ selection: pruneSelection(list) });
    },
    setScreen(screen) {
      if (screen !== "tour" && screen !== "intro" && !panelIdOfScreen(screen)) return;
      set({ screen, selection: [], editing: null, activeGroupId: null });
    },
    enterGroup(id) {
      if (!id) { set({ activeGroupId: null, selection: [], editing: null }); return; }
      const element = findElement(state.design, state.screen, id);
      if (!element || element.locked || element.template !== "group") return;
      set({ activeGroupId: element.id, selection: [], editing: null });
    },
    exitGroup() {
      if (!state.activeGroupId) return;
      const id = state.activeGroupId;
      const parent = parentOf(state.design, state.screen, id);
      set({ activeGroupId: parent?.id ?? null, selection: pruneSelection([id]), editing: null });
    },
    setInsertionScene(sceneId) {
      set({ insertionSceneId: sceneId ?? null });
    },
    setInsertionGroup(id) { set({ insertionGroupId: id ?? null }); },
    setElementPreview(value) { set({ elementPreview: value }); },
    openPanel(name, data = {}) {
      set({ panel: name ? { ...data, name } : null });
    },
    closePanel() {
      set({ panel: null });
    },
    setEditing(editing) {
      set({ editing: editing && editing.id && editing.key ? { id: editing.id, key: editing.key } : null });
    },
    setPreviewScene(sceneId) {
      set({ previewSceneId: sceneId || null, selection: [], editing: null });
    },
    setDevice(device) {
      if (!["desktop", "tablet", "mobile"].includes(device)) return;
      set({ device });
    },

    flush() {
      cancel(timer);
      timer = null;
      if (version === savedVersion && !saving) return Promise.resolve(state.design);
      return runSave();
    },
    hasUnsavedChanges: () => version !== savedVersion || !!saving,
  };
  return api;
}
