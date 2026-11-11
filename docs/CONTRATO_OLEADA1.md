# Contrato Oleada 1: Motor único (A1) ↔ Datos y export (A2)

> Lo escribe el arquitecto antes de lanzar A1 y A2. Lo que está aquí **no se cambia sin avisar al arquitecto**: es lo que permite que los dos trabajen en paralelo y luego encajen. Plan completo en `docs/PLAN_PERSONALIZACION_UI.md` (sección 3).

## 1. TourDocument (lo que produce A2 y consume A1)

Un único JSON describe el tour completo. Lo usan el visor de la app, el editor y el bundle exportado.

```jsonc
{
  "schema": 1,
  "tour": { "id": "uuid", "title": "string", "description": "string|null" },
  "design": { /* Design v1, ver sección 2. Nunca null: si Tour.design es null, se deriva de theme/customTexts */ },
  "scenes": [{
    "id": "uuid", "name": "string|null", "label": "string",          // label = name o "Escena N" (mismo criterio que frontend/src/editor/utils/sceneLabel.js)
    "origen": "video_frame|panorama_upload",
    "batchId": "string|null", "videoUploadId": "string|null",
    "orderIndex": 0, "initialYaw": 0, "initialPitch": 0,
    "image": { "webp": "URL", "tiles": null },                         // tiles: Oleada 2 (B4); en la Oleada 1 siempre null
    "groupId": null, "plan": null                                      // Oleada 4; en la Oleada 1 siempre null
  }],                                                                  // ordenadas por orderIndex
  "hotspots": [{
    "id": "uuid", "sceneId": "uuid", "type": "info|price|nav",
    "lon": 0, "lat": 0, "title": "string", "description": "string|null",
    "price": "string|null", "targetSceneId": "uuid|null",
    "image": "URL|null",
    "style": null, "locked": false, "segments": null, "content": null   // columnas nuevas (A2); el motor de la Oleada 1 solo lee `style` (ver 3)
  }],
  "groups": [],                                                        // Oleada 4
  "assets": {}                                                         // { [assetId]: { kind, url, mime, width, height } }; Oleada 2+
}
```

**URLs:** el serializador recibe una estrategia `resolveUrl(relPath)`.
- **App:** URL absoluta `http(s)://<backend>/uploads/...`.
- **Export:** ruta relativa `assets/...`.

El motor **nunca** arma URLs por su cuenta: usa las que vienen en el documento.

## 2. Design v1 (default derivado de lo que existe hoy)

Si `Tour.design` es null, `buildTourDocument` devuelve esto. `accent`, `radius`, `tone` y `subtitle` salen de `theme` y `customTexts`. Cuando `theme` es null, se usan los defaults entre paréntesis.

```jsonc
{
  "version": 1,
  "brand": { "colors": ["<accent>(#4da3ff)", "#ffffff", "#111111"], "radius": "<borderRadius>(8)",
             "fonts": { "heading": "Inter", "body": "Inter" } },
  "screens": {
    "intro": { "enabled": false, "background": null, "elements": [] },
    "tour":  { "elements": [
      { "id": "topbar",   "template": "basic-topbar",  "props": { "subtitle": "<welcomeMessage>('')", "showScenePicker": true },
        "frame": { "anchor": "stretch-top", "x": 0, "y": 0, "w": 0, "h": 56 }, "mobile": { "mode": "auto" }, "locked": false, "hidden": false, "z": 10 },
      { "id": "scrubber", "template": "frame-scrubber", "props": {},
        "frame": { "anchor": "stretch-bottom", "x": 16, "y": 16, "w": 0, "h": 32 }, "mobile": { "mode": "auto" }, "locked": false, "hidden": false, "z": 10 }
    ] }
  },
  "hotspotPresets": {
    "info":  { "template": "circle-icon", "props": { "size": 30, "fill": "<accent>",            "stroke": "rgba(255,255,255,.85)", "strokeWidth": 1.5, "glyph": "i", "iconColor": "#ffffff" } },
    "price": { "template": "circle-icon", "props": { "size": 30, "fill": "rgba(165,104,14,.88)", "stroke": "rgba(255,255,255,.85)", "strokeWidth": 1.5, "glyph": "$", "iconColor": "#ffffff" } },
    "nav":   { "template": "circle-icon", "props": { "size": 30, "fill": "rgba(47,111,237,.88)", "stroke": "rgba(255,255,255,.85)", "strokeWidth": 1.5, "glyph": "→", "iconColor": "#ffffff" } }
  },
  "detailPanel": { "template": "floating-card", "props": { "tone": "<tooltipStyle>(dark)" } },
  "nadir": { "mode": "none" },
  "panoramas": { "mode": "webp" },
  "languages": { "list": ["es"], "default": "es" }
}
```

Estilo efectivo de un hotspot:
- si `hotspot.style` no es null, se usa ese;
- si no, `design.hotspotPresets[hotspot.type]`.

## 3. Motor (A1): API pública

`frontend/src/runtime/index.js` exporta `createTourRuntime(container, doc, opts)`.

```js
opts = {
  mode: "view" | "edit" | "export",   // edit = editor (sin topbar ni scrubber del diseño; ver abajo)
  initialSceneId?: string,
  initialFrame?: number,
}
const rt = createTourRuntime(container, doc, opts);
rt.setDocument(doc)            // re-render sin recrear WebGL si no cambió la escena activa
rt.goToScene(sceneId)          // si la escena es un cuadro de video, abre el lote EN ESE cuadro (no en el 0)
rt.goToFrame(index)            // dentro del lote activo
rt.getState()                  // { sceneId, batchKey, frameIndex, frameCount, lon, lat, fov }
rt.focus(lon, lat, ms = 600)   // anima la cámara
rt.pickLonLat(clientX, clientY)// raycast → { lon, lat } | null
rt.on(evt, fn) / rt.off(evt, fn)
rt.destroy()
```

**Eventos:**

| Evento | Datos | Cuándo |
|---|---|---|
| `ready` | — | primera textura visible |
| `scenechange` | `{ sceneId }` | cambia la escena activa |
| `framechange` | `{ index, total, sceneId }` | cambia el cuadro; `sceneId` = el del cuadro actual |
| `hotspotopen` | `{ hotspot }` | modos view y export, hotspot que no es `nav`; el motor muestra su panel |
| `hotspotclick` | `{ hotspot, rect }` | modo edit: el editor decide qué hacer (popover o navegar) |
| `hotspotmove` | `{ id, lon, lat }` | modo edit, al soltar un arrastre; en view y export los hotspots no se arrastran |
| `contextmenu` | `{ lon, lat, clientX, clientY }` | modo edit, clic derecho sobre la esfera |

**Reglas de comportamiento** (arreglan bugs actuales):
- **Lotes de video:** los cuadros se agrupan por `batchId` (o `videoUploadId` si `batchId` es null) y se ordenan por `orderIndex`.
- **Visibilidad de hotspots (Oleada 1):** un hotspot se ve **solo en el cuadro de su `sceneId`**. Los marcadores se recalculan en cada cambio de cuadro. B1 agrega `segments` en la Oleada 2.
- **Puntero:** el scrubber y el panel no deben disparar la cámara. Hay que mantener el arreglo del commit `cee65e2` (`[data-ui]` y captura propia).
- **Modo `edit`:** no pinta los elementos de `screens.tour` (topbar ni scrubber del diseño) ni el panel de detalle. El editor tiene su propio chrome.
- **Modos `view` y `export`:** pintan topbar, scrubber (solo si el lote tiene más de 1 cuadro) y panel de detalle, y son **idénticos entre sí**. La diferencia es solo de dónde salen las URLs.

**Plantillas mínimas de la Oleada 1** (en `runtime/templates/`, cada una con `render(props, ctx)` y `update`):
- **`circle-icon` (hotspot):** reproduce el marcador actual (`index.css` `.hs-marker-btn` + clases por tipo), ahora desde `props`.
- **`floating-card` (panel):** reproduce `HotspotDetailPanel` (tono claro/oscuro, borde de acento, imagen, precio en acento).
- **`basic-topbar`:**
  - título del tour + subtítulo;
  - selector de escenas: panorámicas + **1 entrada por lote de video**, con `label`, nunca en blanco;
  - contador "n / N".
- **`frame-scrubber`:** el scrubber actual.

Variables CSS en el contenedor raíz:
- `--tour-accent` = `brand.colors[0]`;
- `--tour-radius` = `brand.radius` en px.

**CSS:** el motor trae su propio CSS (`runtime/runtime.css`, importado desde `index.js`). Las reglas `.hs-marker*` se mueven allí desde `index.css`.

## 4. Build del motor (A1) → lo copia el export (A2)

- `npm run build:runtime` (en `frontend/`) usa `vite.runtime.config.js` en modo librería, formato **IIFE**, `name: "TourRuntime"`, con **three y CSS2DRenderer incluidos** (sin CDN y sin import map).
- **Salida fija:** `frontend/dist-runtime/tour-runtime.iife.js` y `frontend/dist-runtime/tour-runtime.css`. `dist-runtime/` va en `.gitignore`.
- **Global:** `window.TourRuntime.createTourRuntime`.

## 5. Bundle exportado (A2)

```
exports/<tourId>/v<N>/
  index.html                 cáscara mínima (ver abajo)
  runtime/tour-runtime.iife.js
  runtime/tour-runtime.css
  tour-data.js               window.__TOUR__ = <TourDocument con resolveUrl relativo>
  assets/scenes/<sceneId>.webp
  assets/hotspots/<hotspotId>.webp
```

- **`tour-data.js`:** se escribe con `JSON.stringify` y después se reemplazan `<` → `<`, U+2028 → ` ` y U+2029 → ` `. Así un título con `</script>` no rompe nada.
- **`index.html`:**
  ```html
  <!doctype html><html lang="es"><head><meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>{título escapado}</title><link rel="stylesheet" href="runtime/tour-runtime.css">
  <style>html,body,#tour{margin:0;height:100%;background:#000}</style></head>
  <body><div id="tour"></div>
  <script src="runtime/tour-runtime.iife.js"></script><script src="tour-data.js"></script>
  <script>TourRuntime.createTourRuntime(document.getElementById("tour"), window.__TOUR__, { mode: "export" });</script>
  </body></html>
  ```
- **Origen del motor:** `RUNTIME_DIST_DIR` (env; default `../frontend/dist-runtime` relativo a `backend/`). Si falta `tour-runtime.iife.js`, el export responde 500 con `{ error: "Falta compilar el motor del tour: corre npm run build:runtime en frontend/" }`.

## 6. Endpoints nuevos (A2)

| Método y ruta | Acceso | Qué hace |
|---|---|---|
| `GET /api/tours/:tourId/document` | `requireTourAccess` | Devuelve el TourDocument con URLs absolutas |
| `PATCH /api/tours/:tourId/design` | `requireTourAccess` | Body = Design v1. Valida con zod: `version===1`, claves conocidas en el primer nivel, JSON ≤ 512 KB. Devuelve el design guardado |
| `POST /api/tours/:tourId/assets` | `requireTourAccess` | Multipart `file` + `kind` (`image\|video\|audio`), ver plan 3.2 |
| `GET /api/tours/:tourId/assets` | `requireTourAccess` | Lista los assets del tour |
| `DELETE /api/tours/:tourId/assets/:assetId` | `requireTourAccess` | Borra un asset |

Los endpoints de hotspots aceptan y devuelven `style`, `locked`, `segments` y `content`. Se valida que sean JSON u objeto/arreglo, o null.

## 7. Integración (la hace el arquitecto, no A1 ni A2)

- A1 construye el `doc` **en el cliente** a partir de los endpoints actuales (`buildDocFromLegacy` en `frontend/src/runtime/adapters/legacyDoc.js`), siguiendo exactamente este contrato, para poder probar sin A2.
- Al fusionar, el arquitecto cambia la carga a `GET /document` y borra el adaptador.
