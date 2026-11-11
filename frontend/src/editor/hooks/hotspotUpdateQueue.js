// Los gestos se ven inmediatamente. Sus escrituras se ordenan por hotspot y solo
// la respuesta más reciente puede sustituir el estado local completo.
export function createHotspotUpdateQueue({ preview, commit, recover }) {
  const pending = new Map();
  return async (id, patch, save) => {
    preview(id, patch);
    const previous = pending.get(id);
    const task = (previous ?? Promise.resolve()).catch(() => {}).then(save);
    pending.set(id, task);
    try {
      const row = await task;
      if (pending.get(id) === task) commit(id, row);
      return row;
    } catch (error) {
      if (pending.get(id) === task) await recover();
      throw error;
    } finally {
      if (pending.get(id) === task) pending.delete(id);
    }
  };
}
