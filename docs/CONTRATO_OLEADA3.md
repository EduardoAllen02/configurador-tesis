# Contrato Oleada 3: estudio de diseño tipo Canva · C1 (lienzo) · C2 (paneles)

Plan: `docs/PLAN_PERSONALIZACION_UI.md` §3.3, §3.4, §3.9 y Oleada 3. Referencia visual y de comportamiento: `docs/INVESTIGACION_CANVA.md` (medidas reales de Canva). Formatos de diseño y plantillas: `docs/CONTRATO_OLEADA2.md` §2 y §5.

**Prioridad de producto: simple y fácil de entender antes que muchas opciones.** El configurador es solo de escritorio (≥ 1100 px); lo que exporta es 100 % responsivo.

## 0. Qué ya está hecho (commits `2e6371c`, `79d92f5` y siguiente)

**Ruta y esqueleto.** `/tours/:tourId/design` → `pages/TourDesignPage.jsx` → `TourDesignProvider` + `StudioProvider` + `editor/design/DesignStudio.jsx`:
```
┌──────────────────────── StudioHeader (arquitecto) ─────────────────────────┐
├──────────┬──────────────────── ContextToolbar (C2) ────────────────────────┤
│ LeftRail │                     DesignCanvas (C1)                            │
│  (C2)    │          mesa de trabajo + selección + barra inferior            │
└──────────┴──────────────────────────────────────────────────────────────────┘
```
Pestañas Contenido (`/edit`) · Diseño (`/design`) · Publicar (`/publish`) en `editor/components/EditorTabs.jsx`. La cabecera ya tiene volver, título, pestañas, Deshacer/Rehacer, estado del guardado y Vista previa.

**Almacén** (`editor/design/designStore.js`, probado): único dueño del diseño mientras se edita.
- Lectura en React: `useDesignState(selector)`; acciones: `useDesignEditor()` (ambos en `editor/hooks/useTourDesign.jsx`).
- `apply(updater, { label, mergeKey })`: cambio con deshacer + guardado automático (800 ms). Mismo `mergeKey` en < 700 ms = un solo paso de deshacer (sliders, escribir).
- `beginGesture()` · `preview(updater)` · `endGesture(label)` · `cancelGesture()`: arrastres en vivo que quedan como UN paso al soltar; Escape a medio arrastre = `cancelGesture`.
- `undo()` · `redo()` · `flush()` (Ctrl+S) · `select(ids)` · `setScreen("tour"|"intro")` · `setDevice("desktop"|"tablet"|"mobile")`.
- `openPanel(name, data)` · `closePanel()` → `state.panel = { name, ...data }`: panel lateral que reemplaza al cajón (§4).
- `setEditing({ id, key } | null)` → `state.editing`: texto que se edita en el lienzo.
- Estado: `{ design, status, error, selection, screen, device, canUndo, canRedo, label, panel, editing }`.
- En desarrollo: `window.__designStore` y `window.__designRuntime` para verificar desde la consola.

**Operaciones puras** (`editor/design/elementOps.js`, probadas): `addElement`, `updateElement`, `updateProps` (valor `undefined` = volver al default), `setFrame(design, screen, id, frame, device)` (en `mobile` escribe `mobile = { mode: "custom", frame }`), `setMobileMode`, `removeElements` (respeta bloqueados), `duplicateElements` (+16 px), `reorder` (front/back/forward/backward), `setLayerOrder`, `elementsOf`, `findElement`.

**Acciones** (`editor/design/actions.js`): `insertElement(store, item, at?)` (anclaje automático, deja seleccionado), `deleteSelection`, `duplicateSelection`, `nudgeSelection(dx, dy)`, `setSelectionLocked`, `setSelectionHidden`, `arrangeSelection`.

**Geometría** (`editor/design/geometry.js`, probada): `DEVICES` (desktop 1440×900, tablet 1024×768, mobile 390×844), `frameFromRect(rect, { anchor, container, s, base, keepAutoSize })`, `autoAnchor(rect, container)`, `anchorAfterMove(frame, rect, container, { pinned })`, `reanchor(frame, anchor, { container, s, measured })`, `rectOfFrame`, `clampRect`.

**Motor en modo `design`** (`createTourRuntime(el, doc, { mode: "design", designScreen })`): igual que el visor pero quieto — sin animaciones de entrada, sin panel de detalle, marcadores que solo se ven.
- `setDesign(design)`: camino rápido; no rehace escenas ni texturas. Llamarlo en cada `preview`.
- `setDesignScreen("intro"|"tour")`: en "intro" muestra la pantalla de inicio aunque `enabled` sea false.
- `getElementBoxes()` → `{ screen, boxes: [{ id, left, top, width, height }] }` en **px de diseño del contenedor** (ya sin el zoom CSS de la mesa).
- Evento `layout` → `{ screen, W, H, mobile, scale, topInset }` tras cada recolocación: volver a leer las cajas. `scale` es la `--s` vigente (la necesitan `frameFromRect`/`reanchor`).
- La capa de elementos ya no rehace el DOM si solo cambian props o frames.
- Cada elemento es `.tour-rt-el[data-el-id][data-template]`.

**Datos** (`editor/design/StudioContext.jsx`): `useStudio()` → `{ tourId, tour, baseDoc, assets, reload }`. El diseño bueno es el del almacén; el motor recibe `{ ...baseDoc, design }`.

## 1. Archivos por dueño (no toques los de otro)

| Dueño | Archivos |
|---|---|
| **C1 · lienzo** | `frontend/src/editor/design/canvas/**` (reemplaza el stub `DesignCanvas.jsx`; nuevos: overlay de selección, manijas, mini-barra, guías + `snapping.js` con pruebas, editor de texto en el lugar, barra inferior, atajos `useShortcuts.js`, `canvas.css`) |
| **C2 · paneles** | `frontend/src/editor/design/panels/**` (reemplaza los stubs `LeftRail.jsx` y `ContextToolbar.jsx`; cajones, paneles laterales, controles por tipo de slot, `panels.css`), `frontend/src/editor/design/library.js` (catálogo de la biblioteca), `frontend/src/editor/design/packs/**` (paquetes de plantillas) |
| **Arquitecto** | todo lo demás: `runtime/**`, `designStore.js`, `elementOps.js`, `geometry.js`, `actions.js`, `StudioContext.jsx`, `DesignStudio.*`, `StudioHeader.jsx`, páginas, backend |

**Excepciones permitidas (aditivas, márcalas con `// [C1]` o `// [C2]`):**
- Agregar funciones **al final** de `actions.js` o `elementOps.js` (con su prueba en un archivo tuyo).
- **C1**: agregar el atributo `data-slot="<key>"` a los nodos de texto de las plantillas de `runtime/templates/elements/*.js` cuyo slot sea `inline: true`, sin cambiar nada más. Sirve para saber qué texto se editó con doble clic.
- Cualquier otro cambio en archivos del arquitecto: anótalo en tu informe final bajo "Pendiente para el arquitecto" y sigue con un rodeo local.

## 2. Costuras entre C1 y C2

| Qué | Cómo |
|---|---|
| Arrastrar de la biblioteca al lienzo | C2 pone en `dataTransfer` el tipo `application/x-tour-element` con JSON del ítem de `library.js`: `{ template, props, name, w, h }`. C1 acepta el drop, convierte el punto a px de diseño y llama `insertElement(store, item, { x, y })`. Clic en el ítem = C2 llama `insertElement(store, item)` (al centro). |
| Abrir un panel desde el lienzo | C1 (mini-barra "Más", doble clic en un color…) llama `store.openPanel("position")`, `openPanel("color", { id, key })`, `openPanel("animate")`. C2 pinta el panel que corresponde a `state.panel`. |
| Editar texto | Doble clic en un elemento con slot `inline: true` → C1 llama `setEditing({ id, key })` y muestra un editor sobre el texto. Cada tecla hace `apply(updateProps…, { mergeKey: "text:<id>.<key>" })`. Mientras `state.editing` no sea null, C2 muestra en la barra los controles de texto de ese elemento. Escape o clic fuera → `setEditing(null)`. |
| Selección | Ambos leen `state.selection`. C1 selecciona en el lienzo; C2 selecciona desde Capas. |
| Pantalla y dispositivo | C1 tiene en la barra inferior los conmutadores Inicio/Recorrido (`setScreen`), Escritorio/Tablet/Móvil (`setDevice`) y el zoom. |
| Atajos de teclado | Todos son de C1 (`useShortcuts.js`), en `window`, ignorados si el foco está en `input`/`textarea`/`select`/`[contenteditable]`. C2 no registra atajos globales; Escape dentro de un panel abierto lo cierra (C2) y no llega al lienzo (`stopPropagation`). |

## 3. C1 · Lienzo (`DesignCanvas`)

**Mesa de trabajo:**
- Un div de `DEVICES[device].W × H` px **reales**, escalado con `transform: scale(zoom)` (como el stub).
- El motor vive adentro con `mode: "design"`: así el layout es exactamente el del dispositivo y la vista previa es idéntica al export.
- Fondo del área `var(--studio-canvas-bg)` y sombra suave en la mesa.
- En "Recorrido" se ve el 360 real detrás; en "Inicio", el fondo de la pantalla de inicio.

**Zoom:**
- Ajustar al abrir y al cambiar el tamaño del área (también cuando C2 abre o cierra el cajón).
- Presets 25/50/75/100/125 % y "Ajustar" en la barra inferior.
- Ctrl+rueda hace zoom hacia el cursor; rueda o espacio+arrastre desplazan cuando la mesa no cabe.

**Capa de selección:** un overlay encima de la mesa (dentro del mismo contenedor escalado o calculado con `zoom`). Toma los rects de `getElementBoxes()` tras cada evento `layout`. Medidas de Canva (INVESTIGACION_CANVA §3):
- Caja de 2 px `var(--studio-select)`; manijas de esquina, círculos de 12 px; laterales, píldoras de 6×18; zona de toque de 24 px.
- Contorno al pasar el cursor.
- Mini-barra flotante 16 px arriba de la caja: Bloquear · Duplicar · Eliminar · Más (Más → `openPanel("position")`).
- Clic selecciona, Shift+clic suma, arrastre en vacío = rectángulo de selección. Clic en vacío o Escape deselecciona.
- Tab / Shift+Tab recorren los elementos.

**Mover y redimensionar:**
1. `beginGesture` al empezar.
2. En cada movimiento: rect nuevo → `frameFromRect(rect, { anchor, container: { W, H }, s: scale, base: frame, keepAutoSize })` → `preview(setFrame(…))` → `runtime.setDesign`.
3. Al soltar: `anchorAfterMove` (anclaje automático salvo que el ancla se haya fijado a mano; marca `frame.pinned = true` cuando C2 la fija con "Fijar a…") y `endGesture("Mover" | "Cambiar tamaño")`.

- Mover conserva el tamaño automático (`keepAutoSize: true`); redimensionar fija `w/h`. Las plantillas `fit: "content"` solo cambian el ancho (manijas izquierda y derecha, como el texto en Canva).
- Shift = proporción; Alt = desde el centro.
- Bloqueados: se seleccionan, pero no se mueven ni redimensionan (candado en la mini-barra).
- Anclas estiradas: solo el eje libre.

**Guías inteligentes** (`snapping.js`, pura y con pruebas):
- Imán de 5 px de pantalla a bordes y centro de la mesa, a bordes y centros de los demás elementos, y a un margen seguro de 24 px de diseño.
- Líneas de 1 px en `var(--studio-guide)`. Ctrl desactiva el imán.

**Móvil** (`device === "mobile"`):
- La mesa es de 390×844 y el motor apila solo (modo automático).
- Arrastrar o redimensionar un elemento en automático lo pasa a "a mano": el primer `preview` escribe `setFrame(…, "mobile")` partiendo de su caja actual.
- Elementos en "auto" con un distintivo pequeño "Auto" en su caja.

**Tablet:** se edita el mismo frame de escritorio, escalado. Aviso discreto en la barra inferior: "Tablet usa el diseño de escritorio, escalado".

**Texto en el lugar:** doble clic → `setEditing`. Sobre el nodo `[data-slot=key]` (o la caja si no hay) aparece un `textarea` transparente con la misma fuente, tamaño y color. Así se escribe "dentro" del elemento. Enter confirma en textos de una línea; Shift+Enter, salto de línea.

**Barra inferior** (40 px), de izquierda a derecha:
- Páginas "Inicio" y "Recorrido", como las miniaturas de páginas de Canva (pueden ser botones con nombre).
- Escritorio · Tablet · Móvil.
- Zoom: slider logarítmico de 10–500 %, el % con menú de presets y "Ajustar".

**Atajos** (`useShortcuts.js`):

| Atajo | Acción |
|---|---|
| Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z | Deshacer / rehacer |
| Ctrl+S | `flush` |
| Supr / Retroceso | Eliminar |
| Ctrl+D | Duplicar |
| Ctrl+C / Ctrl+V | Copiar / pegar elementos (portapapeles en memoria; pega +16 px) |
| Ctrl+A | Seleccionar todo |
| Flechas / Shift+Flechas | Mover 1 / 10 px de diseño (`nudgeSelection`) |
| Alt+Shift+L | Bloquear |
| Ctrl+] / Ctrl+[ · Ctrl+Alt+] / Ctrl+Alt+[ | Adelante / atrás · al frente / al fondo |
| Ctrl++ / Ctrl+- / Ctrl+0 / Ctrl+Alt+0 | Zoom: acercar / alejar / 100 % / ajustar |
| Escape | Cancela el gesto, sale de la edición de texto, deselecciona |

**No en esta versión:** rotar, agrupar, reglas.

## 4. C2 · Paneles

**Barra izquierda** (`LeftRail`, 72 px; ítems de 72×72 con icono y etiqueta de 10 px) más **un solo cajón de 360 px** (padding 16), que se cierra con la pestaña "‹". Pestañas, en este orden:

1. **Plantillas**: paquetes completos (§4.4). Aplicar uno = `apply(…, { label: "Aplicar plantilla" })`, reemplaza brand, screens, hotspotPresets y detailPanel, y conserva nadir, panoramas y languages. Se puede deshacer. Pide confirmación si ya hay elementos.
2. **Elementos**: catálogo de `library.js` agrupado por `category` de la plantilla (Tarjetas, Botones, Cifras, Formas, Imagen, Barras), en rejilla de 2 columnas con una **miniatura real**: la plantilla renderizada con `template.render(props, ctx)` dentro de un contenedor escalado. Clic = insertar al centro; arrastrar = soltar en el lienzo (§2).
3. **Texto**: botón primario "Agregar texto" y estilos predefinidos (Título, Subtítulo, Párrafo, Etiqueta pequeña) como ítems de la biblioteca con la plantilla `text`.
4. **Hotspots**: para cada tipo (Info, Precio, Navegación), la galería de plantillas de hotspot (puedes reutilizar `editor/components/HotspotStyleEditor.jsx`).
   - Elegir y editar escribe `design.hotspotPresets[tipo]` con `apply`.
   - Abajo, "Panel de información": `design.detailPanel.template` (Tarjeta flotante / Panel lateral / Hoja inferior).
   - En el lienzo ya se ven los marcadores reales de la escena.
5. **Subidos**: botón "Subir archivo" con `POST /api/tours/:id/assets`, multipart con `file` y `kind` = `image`|`video`|`audio`; luego `useStudio().reload()`. Debajo, la cuadrícula de assets en 2 columnas.
   - Clic en una imagen = insertar una plantilla `image` con `props.asset = "asset:<id>"`.
   - Eliminar con confirmación: `DELETE /api/tours/:id/assets/:assetId`.
6. **Marca**: hasta 5 colores de marca (`design.brand.colors`; el primero es el acento), fuentes de título y texto (lista curada de `runtime/fonts/fontList.js`, cada nombre escrito en su tipografía), logo (`design.brand.logo = "asset:<id>"`) y redondeo de esquinas (`design.brand.radius`).

**4.1 Barra contextual** (`ContextToolbar`): una píldora de 40 px de alto, radio 14, centrada, con botones de 32 px y separación de 4 (INVESTIGACION_CANVA §4). Su contenido depende del estado:
- **Nada seleccionado en "Inicio":** controles de la pantalla de inicio.
  - "Mostrar a los visitantes" (`intro.enabled`).
  - Fondo: Video / Imagen / Color, eligiendo el asset de Subidos; un póster opcional.
  - Oscurecer (scrim), Cuadrícula, Parallax.
- **Nada seleccionado en "Recorrido":** texto de ayuda: "Selecciona un elemento o agrega uno desde la izquierda".
- **Un elemento:** se genera **desde `slots`**. Los `toolbar: true` aparecen como controles rápidos; el resto, en "Más opciones" (popover o panel). Al final, botones de texto: **Animar · Posición**.
- **Varios elementos:** solo Posición (alinear), Duplicar y Eliminar.
- **Editando texto** (`state.editing`): los slots de ese texto más los de color y tamaño de la plantilla.

**4.2 Controles por tipo de slot** (`panels/slots/`), los que usan las plantillas:

| Tipo | Control |
|---|---|
| `color` | Swatch → `openPanel("color", { id, key })` |
| `text` | Campo (multilínea si el slot lo pide) |
| `number`, `range` | Stepper o slider con número |
| `select` | Menú |
| `toggle` | Interruptor |
| `icon` | Rejilla del set `runtime/icons` |
| `image` | Elegir de Subidos |
| `list` | Filas editables con agregar, quitar y reordenar; cada fila usa sus propios slots `of` |
| `action` | Entrar al tour / Ir a escena (escenas con `buildPickerEntries`: un video cuenta como una sola entrada) / Abrir enlace (solo http/https) |
| `animation` | → `openPanel("animate")` |
| `border` | Color y grosor |

Cada cambio: `apply(updateProps(…), { mergeKey: "<id>.<key>" })`.

**4.3 Paneles laterales** (reemplazan al cajón, mismo ancho, título + X; Escape cierra):
- **Color** (INVESTIGACION_CANVA §5):
  - buscador hex;
  - "Colores del tour" (los que ya usa el diseño, únicos);
  - "Marca";
  - predeterminados en rejilla de 7 columnas, swatches de 40 px con separación de 8;
  - "+" con selector y hex, y `EyeDropper` si el navegador lo tiene;
  - transparencia para colores con alfa.
  - Vista previa en vivo y anillo morado en el activo. Sin degradados.
- **Posición:** pestañas Organizar | Capas.
  - **Organizar:** z-order (4 botones); alinear a la página en 6 direcciones (los que ya se cumplen, deshabilitados); **"Fijar a…"** en una cuadrícula de 3×3 más "Estirar a lo ancho/alto" (`reanchor`, no mueve el elemento; marca `pinned`); Ancho, Alto, X e Y en px de diseño.
  - **En móvil:** Automático / A mano / Oculto (`setMobileMode`).
  - **Capas:** filas con asa de arrastre (`setLayerOrder`), ojo (oculto) y candado; selección sincronizada.
- **Animar:** rejilla de 3 columnas con las animaciones que soporta el motor (`none`, `rise`, `fade`, `blur`; ver `runtime/layout/util.js` `ANIM_KINDS`). La miniatura se anima al pasar el cursor; debajo, retraso en ms.
- **Fuente:** se abre desde la barra cuando una plantilla tenga un slot de fuente; si ninguna lo tiene, las fuentes viven solo en Marca.

**4.4 Paquetes de plantillas** (`packs/`, uno por archivo): "Cristal oscuro" (estilo Colombini: tarjeta de cristal, kicker, cifras y botón Entrar; intro con fondo y degradado), "Minimal claro" y "Audaz". Cada uno es un fragmento de diseño válido que usa **solo plantillas existentes**. Cuenta con una miniatura simple (CSS) en el cajón.

## 5. Entorno, datos de prueba y reglas comunes

| | C1 | C2 |
|---|---|---|
| Worktree | `../tour-studio-web-c1` (rama `wave3/c1-canvas`) | `../tour-studio-web-c2` (rama `wave3/c2-panels`) |
| Frontend | `preview_start` "tour-studio-c1-frontend" (5174) | "tour-studio-c2-frontend" (5175) |
| Backend compartido | 4010 (`tour-studio-agents-backend`; no lo reinicies) | igual |
| Tour de prueba | "Prueba diseño C1 (Oleada 3)" `ba35f830-cd50-44db-bf40-951775ee482a` | "Prueba diseño C2 (Oleada 3)" `8813fc17-bd50-46be-915d-6d30bb27748b` |

- **Solo edita el diseño de TU tour de prueba.** El guardado automático escribe en la base real.
- Inicio de sesión: usuario y contraseña del seed (`backend/prisma/seed.js`), con `POST /api/auth/login`; el token va en `localStorage.tour_studio_token` del origen de tu frontend.
- Antes de nada: `npm install` en `frontend/` de tu worktree.
- **Verifica en el navegador:**
  - Usa `read_page`, `javascript_tool` (`window.__designStore`, `window.__designRuntime`), arrastres reales con `computer` y capturas.
  - Si el panel del navegador está oculto, `requestAnimationFrame` se pausa: una captura lo despierta, o reemplaza `window.requestAnimationFrame` por un `setTimeout` de 16 ms para medir.
  - Pasa siempre `tabId` explícito; nunca actúes en una pestaña que no abriste.
- Pruebas: `npm test` · `npm run build` · `npm run build:runtime` deben pasar. Agrega pruebas a la lógica pura (snapping, conversión de slots, paquetes válidos).
- Español en toda la UI. Sin dependencias nuevas salvo que sea imprescindible (dilo en el informe).
- Haz commits pequeños con prefijo `[implementer]` o `[tester]`. No hagas `push`.
- **Informe final:** qué hiciste, cómo lo verificaste (con números), desviaciones del contrato y "Pendiente para el arquitecto".

## 6. Integración (arquitecto)

1. Fusionar C1 y luego C2.
2. Reemplazar el panel viejo de Apariencia de Contenido por un enlace a Diseño.
3. Probar de punta a punta:
   - arrastrar una tarjeta, centrarla, achicarla y cambiarle texto y colores;
   - deshacer;
   - Móvil;
   - exportar y comparar app contra export a 1440×900, 1024×768 y 390×844.
4. Pasarle la checklist a Edd.
