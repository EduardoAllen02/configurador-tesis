import { useCallback, useMemo, useState } from "react";
import { api } from "../../../api/client";
import { useDesignEditor, useDesignState } from "../../hooks/useTourDesign.jsx";
import { useStudio } from "../StudioContext.jsx";
import { elementsOf, findElement, updateProps } from "../elementOps.js";
import { buildModel, buildPickerEntries } from "../../../runtime/model/tourModel.js";
import { getTemplate } from "../../../runtime/templates/index.js";

// Elementos de la pantalla activa, ordenados de abajo hacia arriba (capas).
export function useScreenElements() {
  const design = useDesignState((s) => s.design);
  const screen = useDesignState((s) => s.screen);
  return useMemo(() => ({ design, screen, elements: [...elementsOf(design, screen)].sort((a, b) => (a.z ?? 0) - (b.z ?? 0)) }), [design, screen]);
}

// Un elemento con su plantilla y sus props efectivas (defaults + guardadas).
export function useElement(id) {
  const { tour } = useStudio();
  const design = useDesignState((s) => s.design);
  const screen = useDesignState((s) => s.screen);
  return useMemo(() => {
    const element = id ? findElement(design, screen, id) : null;
    const template = element ? getTemplate(element.template === "group" && element.props?.legacyTemplate === "button" ? "button" : element.template) : null;
    const props = element && template ? { ...template.defaults, ...(element.props ?? {}) } : {};
    if (element?.props?.legacyTemplate === "button") props.label = element.children?.find(child => child.role === "button-label")?.props?.text ?? props.label;
    if (element?.template === "basic-topbar" && !props.title) props.title = tour?.title || "";
    return { element, template, props, screen };
  }, [design, screen, id, tour?.title]);
}

// Escribe props del elemento por el almacén: un paso de deshacer por control mientras se desliza o escribe.
export function useWriteProps(id) {
  const store = useDesignEditor();
  return useCallback(
    (patch, label = "Editar") => {
      const { screen } = store.getState();
      const mergeKey = `${id}.${Object.keys(patch).join("+")}`;
      store.apply((d) => updateProps(d, screen, [id], patch), { label, mergeKey });
    },
    [store, id]
  );
}

// Entradas del selector de escenas: una por panorámica y UNA por lote de video.
export function useSceneEntries() {
  const { baseDoc } = useStudio();
  return useMemo(() => (baseDoc ? buildPickerEntries(buildModel(baseDoc)) : []), [baseDoc]);
}

export function useAssets(kind) {
  const { assets } = useStudio();
  return useMemo(
    () =>
      Object.entries(assets ?? {})
        .map(([id, a]) => ({ id, ...a }))
        .filter((a) => !kind || a.kind === kind),
    [assets, kind]
  );
}

const LIMITS = { image: 25, video: 200, audio: 30 };

export function kindOfFile(file) {
  const t = file?.type || "";
  if (t.startsWith("image/")) return "image";
  if (t.startsWith("video/")) return "video";
  if (t.startsWith("audio/")) return "audio";
  return null;
}

// Sube un archivo a los assets del tour (POST /api/tours/:id/assets) y recarga el documento.
// Devuelve el asset creado o null (el motivo queda en `error`).
export function useUpload() {
  const { tourId, reload } = useStudio();
  const [state, setState] = useState({ busy: false, progress: 0, error: null });
  const upload = useCallback(
    async (file) => {
      const kind = kindOfFile(file);
      if (!kind) {
        setState({ busy: false, progress: 0, error: "Formato no admitido. Usa imagen, video o audio." });
        return null;
      }
      if (file.size > LIMITS[kind] * 1024 * 1024) {
        setState({ busy: false, progress: 0, error: `El archivo supera ${LIMITS[kind]} MB.` });
        return null;
      }
      setState({ busy: true, progress: 0, error: null });
      try {
        const form = new FormData();
        form.append("kind", kind);
        form.append("file", file);
        const asset = await api.uploadWithProgress(`/api/tours/${tourId}/assets`, form, (p) => setState((s) => ({ ...s, progress: p })));
        await reload();
        setState({ busy: false, progress: 1, error: null });
        return asset;
      } catch (err) {
        setState({ busy: false, progress: 0, error: err.message || "No se pudo subir el archivo." });
        return null;
      }
    },
    [tourId, reload]
  );
  return { ...state, upload };
}
