# Contrato Oleada 2: B1 (video + nadir) · B2 (hotspots) · B3 (layout + UI) · B4 (mosaicos)

> Lo escribe el arquitecto antes de lanzar los 4 agentes en paralelo. Plan completo: `docs/PLAN_PERSONALIZACION_UI.md` (§3.3–3.7, §3.10). Contrato anterior, que sigue vigente: `docs/CONTRATO_OLEADA1.md`.
> **Si algo de aquí te parece mal, no lo cambies: trabaja alrededor con el mínimo cambio y explícalo en tu reporte final.**

## 0. Qué ya está hecho (commit `b1f33d3`)

Cada función nueva tiene un módulo propio, ya conectado al motor con un stub. Tu trabajo es reemplazar el stub y construir alrededor. No hace falta tocar la "tubería".

| Módulo (stub) | Para | Qué hace hoy |
|---|---|---|
| `frontend/src/runtime/model/frameHotspots.js` → `hotspotsForFrame(model, batch, frameIndex)` | B1 | `[{hotspot, lon, lat}]`: solo los hotspots de la escena del cuadro, en su lon/lat |
| `frontend/src/runtime/core/nadir.js` → `createNadir` | B1 | No limita ni tapa nada |
| `frontend/src/runtime/hotspots/markerLayer.js` | B2 | Dibuja con la plantilla del estilo efectivo y mueve marcadores sin rehacer el DOM |
| `frontend/src/runtime/templates/hotspots/` y `templates/panels/` | B2 | Solo `circle-icon` y `floating-card` |
| `frontend/src/runtime/screens/hudLayer.js`, `layout/frame.js` | B3 | Posicionamiento mínimo (Oleada 1) |
| `frontend/src/runtime/screens/introScreen.js` | B3 | Nunca se muestra |
| `frontend/src/runtime/templates/elements/` | B3 | Solo `basic-topbar` y `frame-scrubber` |
| `frontend/src/runtime/core/tiledPanorama.js` | B4 | `canShow()` siempre es `false` |
| `frontend/src/editor/components/settings/NadirSettings.jsx` | B1 | "Próximamente" |
| `frontend/src/editor/components/settings/PanoramaQualitySettings.jsx` | B4 | "Próximamente" |

**Del editor, también ya hecho:**
- `useHotspotEditor` devuelve `allHotspots`, que son todos los del tour (usa el endpoint nuevo `GET /api/tours/:id/hotspots`). Al lienzo se le pasan todos. Editar y borrar usan la escena propia de cada hotspot. Los objetos (`style`, `segments`, `content`) viajan como JSON.
- `useTourDesign()` (con `TourDesignProvider` en `TourEditorPage`) da `{ design, saveDesign(prev => next) }`. Los guardados se encadenan, así que dos paneles no se pisan. El lienzo pinta con este diseño.
- `HotspotList` ya recibe `onCreate` y `onUpdate`.

**Backend, también ya hecho:**
- `TourDocument.assets = { [id]: { kind, url, mime, width, height, name } }`.
- El export copia `assets/media/<id>.<ext>` y **toda** la carpeta `frontend/dist-runtime/` a `runtime/`.

## 1. Archivos por dueño (no toques los de otro)

| Dueño | Archivos que puede crear o modificar |
|---|---|
| **B1** | `runtime/model/frameHotspots.js` (+test) · `runtime/model/segments.js` (nuevo) · `runtime/core/nadir.js` · `runtime/core/cameraControls.js` · `editor/components/SceneRail.jsx` · `editor/components/EditorViewer.jsx` · `editor/hooks/useEditorViewer.js` · `editor/components/FrameTimeline.jsx` (+`.css`, nuevos) · `editor/components/settings/NadirSettings.jsx` · `pages/TourEditorPage.jsx` |
| **B2** | `runtime/hotspots/markerLayer.js` · `runtime/templates/hotspots/**` · `runtime/templates/panels/**` · `runtime/icons/**` (nuevo) · `editor/components/HotspotTypePopover.jsx` · `editor/components/HotspotStyleEditor.jsx` (+`.css`, nuevos) · `editor/components/HotspotList.jsx` |
| **B3** | `runtime/layout/**` · `runtime/screens/hudLayer.js` · `runtime/screens/introScreen.js` · `runtime/templates/elements/**` · `runtime/fonts/**` (nuevo) · `frontend/vite.runtime.config.js` · `frontend/package.json` (si agrega dependencias) |
| **B4** | `runtime/core/tiledPanorama.js` · `editor/components/settings/PanoramaQualitySettings.jsx` · **todo `backend/`** (scenes controller y rutas, `services/tiling.js` nuevo, `tourDocument.js`, `exportBundle.js`, `backend/package.json`) |

**`tourRuntime.js`:** cada agente puede tocar **solo su región marcada** (`// ── [B1]`, `[B2]`, `[B3]`, `[B4]`) y las líneas sueltas que llevan su etiqueta. Si necesitas algo fuera de tu región, agrégalo como una opción de tu módulo; no edites otra región.

**Nadie toca:**
- `runtime/runtime.css`, `runtime/templates/dom.js`, `runtime/templates/index.js`;
- `runtime/model/tourModel.js` (solo B1 puede tocar sus tests de visibilidad si cambia el comportamiento);
- `runtime/adapters/legacyDoc.js`, `editor/hooks/useHotspotEditor.js`, `editor/hooks/useTourDesign.jsx`, `editor/components/TourSettingsPanel.jsx`;
- `src/index.css`, `docs/`.

**CSS:** cada quien pone su CSS en archivos propios importados desde su JS: `templates/hotspots/hotspots.css`, `layout/layout.css`, `FrameTimeline.css`, etc.

## 2. Interfaz de una plantilla (B2 y B3)

```js
export const miPlantilla = {
  id: "ring-sweep",                 // único, kebab-case, estable (se guarda en el diseño)
  kind: "hotspot" | "panel" | "element",
  name: "Anillo con barrido",       // español, lo verá el usuario en la galería
  category: "Hotspots",             // agrupa en la galería
  defaults: { ... },                // forma + colores predeterminados (como Canva)
  slots: [                          // qué se puede editar; el editor de la Oleada 3 arma la barra con esto
    { key: "fill", type: "color", label: "Fondo", toolbar: true },
    // tipos: color | text | number | range{min,max,step} | select{options} | toggle | icon | image(asset) | list{of} | action | animation | border
  ],
  mobile: "keep" | "stack" | "hide" | "dock-bottom",   // solo kind=element: comportamiento móvil por defecto
  render(props, ctx) → HTMLElement,  // props = { ...defaults, ...props guardados }
  update(el, props, ctx),
  isVisible?(ctx),
};
```

**Reglas:**
- Todo texto entra por `textContent`, **nunca `innerHTML`**: los datos del tour vienen del usuario y el bundle se abre en sitios ajenos. Los SVG se arman con `createElementNS`.
- **Sin dependencias de red:** nada de CDN ni Google Fonts en el motor.
- **Accesible:** botones con `aria-label`; con `prefers-reduced-motion` se apagan las animaciones.
- **Registro:** las plantillas se agregan al `index.js` de su carpeta, no al registro central.

## 3. B1: video (segmentos + keyframes) y nadir

**Modelo** (`Hotspot.segments`; ya existe la columna y la API lo acepta):
```jsonc
"segments": [{ "from": 10, "to": 20, "keys": { "10": { "lon": 30, "lat": -5 }, "18": { "lon": 42, "lat": -3 } } }]
```
- **Índices:** `from`, `to` y las claves de `keys` son **índices de cuadro dentro del lote** (0 = primer cuadro por `orderIndex`), inclusivos.
- **Anclaje:** `hotspot.sceneId` sigue siendo el cuadro donde se creó; sirve para saber a qué lote pertenece.
- **`segments == null`:** el hotspot se ve solo en su cuadro, en `lon`/`lat` (regla de la Oleada 1, compatible con lo que ya existe).
- **Posición en el cuadro `f`:**
  - si `f` está antes del primer keyframe, se usa el primero;
  - si está después del último, el último;
  - si está en medio, interpolación lineal por el **arco corto** en lon (`((b-a+540)%360)-180`).
  - Sin keys, se usa `lon`/`lat` del hotspot.
- **Validación:** `from ≤ to`, keys recortadas al segmento, segmentos sin enciman. Lo que esté mal se ignora sin romper el tour.

**Editor:**
- El **lote de video** es UNA tarjeta en el carril ("Video · 60 cuadros", con la miniatura del primer cuadro), no 60.
- Al elegirlo, el lienzo muestra **`FrameTimeline`** debajo, con:
  - scrubber de cuadros;
  - barras de cobertura por hotspot, una por color;
  - manijas de inicio y fin **arrastrables** del segmento del hotspot seleccionado;
  - rombos de keyframes;
  - tooltip al pasar el mouse ("Cuadro n · títulos activos").
- **Al crear un hotspot en un cuadro de video**, nace con `segments: [{from: f, to: min(f+30, último), keys: {f: {lon, lat}}}]`.
- **Al arrastrar un hotspot** en un cuadro con segmento, se crea o actualiza `keys[f]`. El evento `hotspotmove` ya trae `frameIndex` y `sceneId`.
- Las panorámicas no cambian.

**Nadir:** `design.nadir = { mode: "none"|"limit"|"cover", limitDeg: -60, cover: { kind: "color"|"image", color: "#000000", image: "asset:<id>"|null, sizePct: 20 } }`.
- `none`: realmente sin límite.
- `limit`: aplica `lat ≥ limitDeg + fov/2` en arrastre, pellizco y rueda (cámara en `cameraControls.js`).
- `cover`: **disco 3D** en el polo sur (`CircleGeometry`), con color o imagen. La imagen se resuelve con `doc.assets[id].url`. Hay que pasarle `doc` a `nadir.apply`, desde tu región.

`NadirSettings`:
- 3 opciones simples ("Sin límite", "Limitar hacia abajo", "Tapar con color o logo");
- un slider de ángulo y tamaño;
- un color;
- subir el logo con `POST /api/tours/:id/assets` (`kind=image`);
- guarda con `saveDesign`.

## 4. B2: plantillas de hotspot, estilo por hotspot, bloquear y duplicar

**Vocabulario común de `props`** (todas las plantillas de hotspot lo respetan cuando aplica):
`size` (px), `fill`, `stroke`, `strokeWidth`, `iconColor`, `icon` (id del set interno), `glyph` (texto corto, alternativa a `icon`), `label` (texto visible), `showLabel` ("always"|"hover"|"never"), `opacity`, `radius`, `animate` (bool).

**12 plantillas** (plan §3.5): `circle-icon` (existe), `ring-sweep` (estilo Colombini: arco que gira + placa + disco + glifo; etiqueta al pasar el mouse), `pulse-dot`, `square-border`, `corner-brackets`, `pill-label`, `callout` (línea guía animada + tarjeta de cristal con kicker, título y "Entrar →"; `props.dx`/`dy`), `nav-arrow`, `price-tag`, `map-pin`, `icon-only`, `floating-card` (tarjeta visible sin clic: imagen, título, descripción, precio).

**Set de iconos** `runtime/icons/`: unos 60–80 iconos estilo Lucide (licencia ISC; deja el aviso de licencia) como datos de path, construidos con `createElementNS`.

**Tamaño:**
- **Mínimo táctil:** 36 px cuando el contenedor del motor mide menos de 720 px de ancho (móvil).
- **Por tour:** la escala la define cada plantilla con `props.size`.

**Paneles de detalle:**
- `floating-card` (existe), `side-sheet` (hoja lateral de alto completo, estilo Colombini) y `bottom-sheet`.
- En móvil (< 720 px) **cualquier panel se muestra como hoja inferior**.

**Bloquear:**
- **En el lienzo:** si `hotspot.locked`, en modo edit no se arrastra (el clic sigue abriendo el popover).
- **En "aplicar a todos":** no se toca.

**Editor:**
- `HotspotStyleEditor` dentro del popover, sección "Estilo":
  - galería de plantillas con miniaturas reales (render de la plantilla);
  - muestrarios por cada slot de color;
  - slider de tamaño;
  - **"Aplicar a: Solo este · Todos los de tipo X"**.
- **"Solo este"** guarda `style` en el hotspot.
- **"Todos"** guarda `design.hotspotPresets[type]` con `saveDesign` y limpia el `style` de los hotspots no bloqueados de ese tipo con `onUpdateHotspot`.
- En `HotspotList`: candado (bloquear o desbloquear con `onUpdate`) y "Duplicar" (`onCreate` con una copia: lon +8°, mismo estilo, título "… (copia)").
- **No toques `EditorViewer`.** El popover recibe `onSave` y su payload llega tal cual a `updateHotspot`.

## 5. B3: motor de layout, plantillas de UI y pantalla de inicio

**Frame** (en px del lienzo de diseño de 1440×900):
```jsonc
"frame": { "anchor": "top-left"|"top"|"top-right"|"left"|"center"|"right"|"bottom-left"|"bottom"|"bottom-right"
                     |"stretch-top"|"stretch-bottom"|"stretch-left"|"stretch-right"|"stretch-fill",
           "x": 0, "y": 0, "w": 300, "h": 120 }
```

**Anclas puntuales:**
- `x` e `y` son la distancia del **pivote** del elemento al punto de anclaje: positivo hacia la derecha y hacia abajo.
- El pivote es automático e igual al ancla (top-left → esquina superior izquierda; center → centro).

**Anclas estiradas:**
- `x` es el margen a izquierda y derecha (o `y` arriba y abajo, según el eje);
- se conserva el comportamiento actual de `stretch-top` y `stretch-bottom`.

**Compatibilidad:** los frames de la Oleada 1 siguen viéndose igual.

**Escala:**
- `--s = clamp(0.8, sqrt((W/1440)·(H/900)), 1.25)`, con W y H = tamaño del **contenedor del motor**, no de la ventana;
- cada elemento se escala con `transform: scale(var(--s))` desde su pivote;
- en 1440×900, `--s = 1`.

**Móvil** (contenedor < 720 px de ancho), según `el.mobile.mode`:
- `"auto"`:
  - apila por zona: arriba, centro y abajo, según la fila del ancla;
  - ancho = `min(w, 100% − 32px)`, márgenes de 16 px;
  - se respeta `template.mobile` (`hide`, `dock-bottom`…).
- `"custom"`: usa `el.mobile.frame` sobre un lienzo de 390×844.
- `"hidden"`: no se muestra.

**Plantillas** (kind `element`), las básicas de plan §3.4 y §4:
- Texto (variantes: título, párrafo, kicker), Botón (acción + icono), Imagen/Logo (asset), Forma (rect o círculo, cristal opcional), Tarjeta de cristal (contenedor);
- Lista de características (icono + texto);
- Contador rotativo "en números" (cuenta hacia arriba + ticks);
- Fila de cifras;
- Selector de idioma (por ahora solo visual con `languages.list`; la lógica de idiomas es de la Oleada 4);
- Indicador de carga.

`basic-topbar` y `frame-scrubber` siguen funcionando.

**Acciones de botón:** `{ type: "enter" | "goToScene" | "openUrl", target }`. Abrir un enlace usa `target="_blank" rel="noopener"` y **solo** acepta `http:` o `https:`.

**Animación** (`props.animation = { kind: "none"|"rise"|"fade"|"blur", delayMs }`): entrada al aparecer. Con `prefers-reduced-motion` no hay animación.

**Pantalla de inicio** (`design.screens.intro`):
- **Contenido:** `enabled`, `background: { kind: "video"|"image"|"color", asset: "asset:<id>", poster: "asset:<id>", color, scrim: {...}, grid: { on, size, opacity }, parallax: bool }` y `elements[]` con el mismo layout.
- **Comportamiento:**
  - tapa el recorrido mientras carga;
  - el botón con acción `enter` se habilita con `setReady(true)`;
  - "Entrar" la oculta con transición y emite `enter`.
- **Assets:** se resuelven con `doc.assets[id].url`.

**Fuentes:**
- `design.brand.fonts.heading` y `.body` se toman de una **lista curada**: Inter (ya incrustada), Manrope, DM Sans, Playfair Display, JetBrains Mono. Usa `@fontsource`, solo latin.
- Todo lo que necesite el motor en tiempo de ejecución va **dentro de `frontend/dist-runtime/`** (el export copia esa carpeta completa). En la app también debe funcionar.

**Para probar sin el editor de la Oleada 3:** guarda diseños de prueba con `PATCH /api/tours/:id/design` sobre un tour desechable tuyo.

## 6. B4: mosaicos AVIF (todo el backend de la Oleada 2 es tuyo)

**Generación (`services/tiling.js`, sharp):**
- **Entrada:** desde el original (desde ahora `upload-panorama` y `bulk-upload-panoramas` guardan el original en `uploads/panoramas/originals/` → `Scene.sourcePath`) o, si no hay, desde la WebP.
- **Salida en `uploads/tiles/<sceneId>/`:**
  - `base.avif`: mitad del ancho de trabajo, por ejemplo 3072×1536;
  - una cuadrícula de 8×4 `tile_<c>_<r>.avif`, cortada de 6144×3072 (o del tamaño real si el original es menor; nunca se agranda).
- **Ejecución:** corre en segundo plano después de responder, uno a la vez (cola en memoria basta).
- **Estado en `Scene.tiles`:** `{ status: "processing"|"ready"|"error", width, cols, rows, error? }`.

**Modo efectivo:** `scene.imageMode ?? design.panoramas.mode ?? "webp"`. Solo para `panorama_upload`; **los cuadros de video siempre son WebP**.

**Documento:** `image.tiles = { width, cols, rows, base: URL, tileUrl: URL con "{c}" y "{r}" }`, solo si el modo efectivo es `"tiles"` y `status === "ready"`; si no, `null`.

**API:**
- `PATCH` de la escena acepta `imageMode` (`"webp"|"tiles"|null`).
- Pasar a tiles sin mosaicos listos dispara la generación.
- `POST /api/tours/:tourId/scenes/:sceneId/tiles` regenera.
- El cambio de `design.panoramas.mode` lo hace `PanoramaQualitySettings` con `saveDesign` + POST por escena si faltan.

**Export:** copia `uploads/tiles/<sceneId>/` → `assets/tiles/<sceneId>/` y el documento lleva rutas relativas.

**Motor (`tiledPanorama.js`):**
- esfera dividida en `cols×rows` parches (`SphereGeometry` con `phiStart`, `phiLength`, `thetaStart`, `thetaLength`, mismo `scale(-1,1,1)` y radio un poco menor que 500);
- la base en la esfera principal primero;
- luego carga los mosaicos de los parches visibles (frustum), priorizados por cercanía al centro de la vista;
- entran con fundido; los lejanos se liberan;
- si no hay AVIF (prueba con `createImageBitmap` de un AVIF mínimo), `canShow()` devuelve `false`.

**`PanoramaQualitySettings`:**
- "Calidad de panorámicas: Estándar / Alta definición" (por tour);
- lista de escenas con "Usar la del tour / Siempre WebP / Siempre mosaicos" y el estado ("Generando alta definición…", "Lista", "Error").

**Tu base de datos es propia:** `tour_studio_b4`, backend en el puerto 4014. Nunca uses la principal `tour_studio`.

## 7. Entorno, datos de prueba y reglas comunes

| Agente | Worktree (rama) | Frontend | Backend |
|---|---|---|---|
| B1 | `RAMAS/tour-studio-web-b1` (`wave2/b1-video-nadir`) | `tour-studio-b1-frontend` :5174 | compartido `tour-studio-agents-backend` :4010 (código de master, BD principal) |
| B2 | `RAMAS/tour-studio-web-b2` (`wave2/b2-hotspots`) | `tour-studio-b2-frontend` :5175 | compartido :4010 |
| B3 | `RAMAS/tour-studio-web-b3` (`wave2/b3-layout-ui`) | `tour-studio-b3-frontend` :5176 | compartido :4010 |
| B4 | `RAMAS/tour-studio-web-b4` (`wave2/b4-tiles`) | `tour-studio-b4-frontend` :5177 | propio `tour-studio-b4-backend` :4014 (BD `tour_studio_b4`) |

- **Servidores:** se levantan con `preview_start` por nombre. El backend compartido puede estar ya corriendo; `preview_start` lo reutiliza. **No detengas el backend compartido** (lo usan otros agentes) ni los servidores de Edd (4000 y 5173).
- **Navegador:** usa **tu propia pestaña** (`tabs_create`). Si el panel está oculto, `requestAnimationFrame` se pausa y los marcadores no se pintan. Para inspeccionar, monta un segundo motor en la página después de reemplazar `window.requestAnimationFrame` por un `setTimeout` de 16 ms.
- **Login de desarrollo:** `admin@admin.com` / `admin123`.
- **Datos (B1–B3):** la BD es la de Edd. **Crea tus propios tours desechables y bórralos al terminar.** No modifiques ni borres "Recorrido Piran" ni "Tour de demostración".
  - Panorámicas de prueba: copia `.webp` de `RAMAS/tour-studio-web/backend/uploads/panoramas/`.
  - Video para B1: el único video guardado en `uploads/videos/` es mínimo (17 KB) y sirve solo para probar el flujo. Para probar segmentos de verdad usa el lote de 60 cuadros de **Piran** con hotspots **tuyos**, que creas y borras al terminar. No toques los 2 hotspots que Piran ya tiene.
- **Dependencias:** `npm ci` en tu worktree (`frontend/` y, B4, también `backend/`).
- **Tests y builds:** `npm test`, `npm run build` y `npm run build:runtime` deben pasar. Agrega tests unitarios de tu lógica pura.
- **Commits:**
  - en tu rama, mensajes en español con prefijo `[implementer]`, o `[tester]` para tests;
  - cada mensaje termina con `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`;
  - stage explícito de archivos;
  - nunca push, merge ni cambiar de rama.
- **Reporte final:**
  - qué construiste;
  - evidencia concreta de verificación;
  - desvíos del contrato y por qué;
  - pendientes;
  - `git log --oneline master..HEAD`.

## 8. Integración (la hace el arquitecto)

1. Fusiona en este orden: B4 (backend) → B1 → B2 → B3.
2. Resuelve los conflictos en `tourRuntime.js` (regiones separadas).
3. Recompila el motor y verifica la app y el export lado a lado.
4. Al final le pasa la checklist a Edd.
