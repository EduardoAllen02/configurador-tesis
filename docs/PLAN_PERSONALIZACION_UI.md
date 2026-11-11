# Plan: personalización total de tours (tipo Canva) + arreglos de video y visor

> Estado actualizado al **2026-10-19**: Oleadas 0–3 integradas. La Oleada 3.5 está
> implementada según [su contrato](CONTRATO_OLEADA3_5.md), pendiente de aceptación manual. La Oleada 4 espera
> la validación de Edd. Las secciones siguientes conservan el diseño original y
> deben leerse junto con ese contrato: 3.5 sustituye los paquetes que reemplazan
> elementos por temas de estilo, añade grupos editables y renombra Diseño a Interfaz.
> Este documento es también el **contrato** que leen los subagentes: cada tarea dice qué archivos toca, qué no toca y cómo se prueba.

---

## 0. Contexto y objetivo

Hoy la "personalización" es un panel diminuto de Apariencia (color de acento, radio, panel claro/oscuro, mensaje). El objetivo es que el configurador permita **diseñar la interfaz completa de un tour como en Canva**:

- plantillas de hotspots, botones, tarjetas, pantallas y componentes;
- cada plantilla editable: colores por parte, bordes, tamaños, textos, iconos;
- todo arrastrable y redimensionable sobre un lienzo;
- anclaje tipo Unity para que el diseño se adapte a cualquier pantalla;
- el tour exportado se ve **idéntico** al de la app y es 100 % responsivo en móvil.

El configurador en sí solo necesita funcionar en escritorio.

**Criterio de éxito final:** recrear sin escribir código el tour de Colombini (`3dvista3.s3…/Colombini-Rovereta-1 16.09/index.html`), comparable pixel a pixel en 1440×900, y que se vea bien en 768×1024 y 375×812.

**Regla de producto que manda sobre todo lo demás:** primero simple y obvio, luego completo. Si una opción confunde, va escondida en "Más opciones" o no va.

De paso se cierran los bugs y portes pendientes (video, scrubber, bundle, nadir, extras del prototipo).

---

## 1. Lo que pidió Edd, organizado

| # | Pedido | Dónde se resuelve |
|---|---|---|
| 1 | Hotspots de video aparecen en los 60 cuadros | Oleada 2 · B1 (rango de cuadros + keyframes) |
| 2 | La barra de cuadros se mueve sola al pasar el mouse | Oleada 0 · A0 |
| 3 | El bundle exportado no se ve igual que la app (marcadores, panel, etc.) | Oleada 1 · A1 (motor único) |
| 4 | Three.js dentro del bundle, sin CDN | Oleada 1 · A1 |
| 5 | "Exportar el primer tour": ver nota abajo | Oleada 0 · A0 |
| 6 | Rango de cuadros por hotspot (del prototipo) | Oleada 2 · B1 |
| 7 | Nadir: tapa inferior opcional y configurable | Oleada 2 · B1 |
| 8 | Extras del editor del prototipo (Ctrl+S, duplicar, bloquear, barras de cobertura, tooltip del timeline) | Oleadas 2 y 3 |
| 9 | Tamaño de hotspots configurable | Oleada 2 · B2 |
| 10 | Galería de plantillas de hotspots, editables como un elemento de Canva (color de icono/fondo/borde, grosor, tamaño); "aplicar a todos" / "solo este" / bloquear | Oleada 2 · B2 + Oleada 3 |
| 11 | Plantillas de UI (tarjetas de cristal, botones, listas, contadores…) editables y arrastrables | Oleadas 2 (B3) y 3 |
| 12 | Pantalla previa al tour con video de fondo | Oleada 2 · B3 |
| 13 | Anclaje tipo Unity, configurable | Oleada 2 · B3 + Oleada 3 · C1 |
| 14 | Tours exportados 100 % responsivos en móvil | Oleadas 1–3 (motor + reglas móviles) |
| 15 | Recrear Colombini pixel-perfect | Oleada 4 |
| 16 | Panorámicas en mosaicos AVIF de 6144 px, configurable entre WebP y mosaicos | Oleada 2 · B4 |

**Nota sobre el punto 5:** el botón Exportar de la app **siempre exporta el tour que tienes abierto**; eso funciona con cualquier tour. Lo que exportaba "el primero de la lista" es el script de pruebas automáticas (`backend/scripts/smoke-test.sh`). Toma el tour más nuevo y deja basura (usuarios, invitaciones, exports v1/v2/v3). Se arregla para que cree su propio tour de prueba y lo borre al terminar.

**Fuera de este plan** (ya acordado): código personalizado CSS/JS (5.3), chatbot, wishlist, IA (Track B), versión offline completa (Track C, salvo meter Three.js en el bundle).

---

## 2. Hallazgos que condicionan la arquitectura

1. **Bug del scrubber, causa raíz.** `cameraControls.js:40-45` captura el puntero en el contenedor del visor (`setPointerCapture`). La barra de cuadros vive dentro de ese contenedor, así que:
   - el `pointerup` de la barra nunca llega y `draggingRef` se queda en `true`;
   - desde ahí, pasar el mouse mueve la barra.
   Además, arrastrar la barra gira la cámara en vez de cambiar de cuadro. Lo mismo pasa sobre el panel de detalle.
   El bundle exportado no tiene este bug porque usa un `<input type=range>`.
2. **Bug de hotspots en video.**
   - `TourViewer.jsx:31` junta los hotspots de todos los cuadros.
   - `useTourViewer.js` construye los marcadores una sola vez y nunca los recalcula al cambiar de cuadro.
   - El bundle repite el mismo error.
   - El editor muestra cada cuadro como una escena suelta: 60 miniaturas en el carril.
3. **App y bundle son dos visores distintos.** `exportBundle.js` es otro visor escrito a mano: cámara, marcadores, panel y scrubber propios. Por eso divergen en:
   - marcadores: sin clase por tipo, el precio muestra "i", todos usan el color de acento;
   - tamaño de los marcadores: 28 px contra 30 px, sin borde ni hover;
   - panel, fuente (system-ui contra Inter) y yaw/pitch inicial.
   Mientras existan dos visores, **cada arreglo hay que hacerlo dos veces y siempre se van a desincronizar.**
4. **Three.js por CDN** (`unpkg … three@0.185.0` vía import map). El módulo de three depende de `three.core.js`. Además, los `type=module` no cargan desde `file://`.
5. **Inyección en el export.** El JSON del tour se mete en un `<script>` sin escapar `</script>`. Un título de hotspot con ese texto rompe el bundle.
6. **No hay pruebas automatizadas.** Hay cero tests; solo existe `smoke-test.sh`.

---

## 3. Arquitectura

### 3.1 Motor único del tour (la pieza que lo sostiene todo)

```
frontend/src/runtime/          ← JS puro, sin React. Lo usan los 3 lugares:
  index.js                     createTourRuntime(container, doc, opts) → API
  core/        (escena three, cámara + nadir, texturas, raycast)   ← se mueve desde viewer/core
  hotspots/    (capa de marcadores, plantillas de hotspot, segmentos de video)
  layout/      (anclaje tipo Unity, escalado, reglas móviles)
  templates/   (registro de plantillas de UI: render + "slots" editables)
  screens/     (pantalla de inicio, HUD del recorrido, panel de detalle)
  i18n/, icons/, fonts/
```

- **App (visor):** `TourViewer.jsx` queda como un envoltorio delgado que monta el motor.
- **Editor:** usa el mismo motor en `mode: "edit"`. El editor solo agrega encima la capa de selección, arrastre y manijas.
- **Export:** Vite compila el motor como **IIFE** con three incluido, en `frontend/dist-runtime/tour-runtime.js` + `.css`. El backend copia esos archivos al bundle y escribe:
  - `index.html` (cáscara mínima);
  - `tour-data.js` (`window.__TOUR__ = …`, con `<` escapado como `<`);
  - los assets.
  Así se va el CDN y los marcadores, panel y scrubber son **literalmente el mismo código**.
- **Datos:** un solo serializador en backend, `buildTourDocument(tourId)`. Lo usan:
  - el endpoint nuevo `GET /api/tours/:id/document`, que de paso reemplaza las N+1 peticiones del visor;
  - el export.
  Mismos datos en los dos lados.

**API pública del motor:**
- `setDocument(doc)`, `goToScene(id)`, `goToFrame(i)`
- `on("scenechange" | "framechange" | "hotspotopen" | "ready", fn)`
- `setDevice("desktop" | "tablet" | "mobile")` para la vista previa
- `destroy()`

### 3.2 Documento de diseño (`Tour.design`, JSON): el contrato central

```js
design = {
  version: 1,
  brand: {                       // = "Kit de marca" de Canva
    colors: ["#0e1728", "#f6f8fb", "#4da3ff"],
    fonts:  { heading: "Inter", body: "Inter", mono: "JetBrains Mono" },
    logo: "asset:<id>"
  },
  screens: {
    intro: {                     // pantalla previa (opcional)
      enabled: true,
      background: { kind: "video"|"image"|"color"|"panorama", asset, poster, color,
                    scrim: { from, to, angle, opacity }, grid: { on, size, opacity } },
      elements: [ Element… ]
    },
    tour:  { elements: [ Element… ] }   // HUD encima del 360
  },
  hotspotPresets: { info: Style, price: Style, nav: Style },  // lo que usan los hotspots sin estilo propio
  detailPanel: { template: "side-sheet"|"floating-card"|"bottom-sheet", props },
  nadir: { mode: "none"|"limit"|"cover", limitDeg: -60,
           cover: { kind: "color"|"image", color, asset, sizePct } },
  languages: { list: ["es"], default: "es" }
}

Element = {
  id, template: "glass-card", name,
  props:  { …lo que la plantilla declara como editable (textos, colores, iconos, lista, acción)… },
  frame:  { anchor: "top-left"|"top"|…|"stretch-x"|…, x, y, w, h },  // en px del lienzo 1440×900
  mobile: { mode: "auto"|"custom"|"hidden", frame? },
  locked: false, hidden: false, z: 3
}
Style = { template: "ring-sweep", props: { size: 44, fill, stroke, strokeWidth, icon, iconColor, … } }
```

- **Validación:** el backend valida forma y tamaño (`zod`, límite de KB) en `PATCH /api/tours/:id/design`.
- **Migración automática:** `theme.accentColor → brand.colors[0]`; `welcomeMessage → elemento de texto en el HUD`.
- **Retiro de lo viejo:** el panel viejo de Apariencia se retira. Las columnas `theme` y `customTexts` se quedan una versión más, por compatibilidad.
- **Hotspot gana:**
  - `style Json?` (null = usa el preset de su tipo);
  - `locked Boolean`;
  - `segments Json?` (ver 3.6).
- **Assets nuevos:** `TourAsset` (logo, video de fondo, póster, planos, audio, imágenes). Los videos MP4 se suben tal cual (con límite de tamaño) y las imágenes se pasan a WebP con sharp. **No se aceptan SVG subidos** (pueden llevar scripts); los iconos vienen del set interno.

### 3.3 Anclaje tipo Unity + escalado + móvil

Así funciona en Unity (RectTransform) y así lo replicamos:

- **Ancla puntual** (esquinas, bordes, centro). El elemento guarda su **distancia al punto de anclaje**, no a la esquina superior izquierda. Ejemplo: anclado abajo-derecha pero colocado al centro. Al agrandar la pantalla conserva su distancia a la esquina abajo-derecha, así que "se jala" hacia allá.
  - Fórmula por eje: `pos = ancla × tamañoPantalla + offset − pivote × tamañoElemento`.
- **Ancla estirada** (`stretch-x`, `stretch-y`, ambos). Guarda márgenes a los dos lados y el ancho crece con la pantalla. Sirve para barras.
- **Pivote.** Lo ponemos automático según el ancla (abajo-derecha → pivote abajo-derecha) para no exponer otro concepto.
- **Cambiar el ancla no mueve el elemento.** Se recalcula el offset, igual que Unity sin Alt.
- **CSS:** `left: calc(ax*100% + x*var(--s)px)` y `transform: translate(-px*100%,-py*100%) scale(var(--s))`, con `transform-origin` en el pivote.
- **Escalado (CanvasScaler "Scale With Screen Size"):**
  - se diseña sobre un lienzo de **1440×900**;
  - el motor calcula `--s = clamp(0.8, (w/1440)^0.5 · (h/900)^0.5, 1.25)`;
  - en 1440×900, `--s = 1`, así que el render es pixel-perfect.
- **Móvil (< 720 px de ancho)**, cada elemento sigue `mobile.mode`:
  - `auto` (por defecto): se apila por zona de anclaje (arriba, centro, abajo) a ancho completo con márgenes de 16 px. Cada plantilla declara su comportamiento móvil; por ejemplo, el panel lateral pasa a hoja inferior y el riel de pisos pasa a chips abajo. Es lo que hace Colombini: centra el texto y oculta la tarjeta "What you will see".
  - `custom`: Edd lo acomoda a mano en el lienzo de móvil (390×844).
  - `hidden`: no se muestra en móvil.
- **En la UI no se dice "anchor" ni "pivot".**
  - Control "Fijar a…": una cuadrícula de 3×3 más "Estirar a lo ancho/alto".
  - **Anclaje automático por defecto:** al soltar un elemento se ancla a la zona más cercana. Quien no sabe qué es anclar nunca lo necesita tocar.

### 3.4 Sistema de plantillas (escalable: una plantilla = un archivo)

```js
// runtime/templates/glass-card.js
export default {
  id: "glass-card", kind: "element", category: "Tarjetas", name: "Tarjeta de cristal",
  defaults: { … },                     // forma + color predeterminados (como Canva)
  slots: [                             // qué se puede editar → el editor arma la barra solo
    { key: "fill",   type: "color",  label: "Fondo",  toolbar: true },
    { key: "border", type: "border", label: "Borde",  toolbar: true },
    { key: "blur",   type: "range",  label: "Desenfoque", min: 0, max: 40 },
    { key: "title",  type: "text",   inline: true },
    { key: "items",  type: "list",   of: [{ key: "icon", type: "icon" }, { key: "text", type: "text" }] },
    { key: "action", type: "action" }, // Entrar al tour / Ir a escena / Ir a piso / Abrir enlace / Idioma
    { key: "animation", type: "animation", toolbar: true } // "Animar": ninguna / subir / aparecer / desenfoque + retraso
  ],
  mobile: "stack",                     // comportamiento móvil por defecto
  render(props, ctx) → HTMLElement, update(el, props)
}
```

- **Barra contextual automática:** el editor lee `slots`. Los marcados `toolbar: true` salen en la barra superior y el resto en "Más opciones". Agregar una plantilla nueva no requiere tocar el editor.
- **Paquetes de plantillas** (equivalente a las plantillas de diseño completas de Canva): "Cristal oscuro (estilo Colombini)", "Minimal claro" y "Audaz". Aplicar un paquete reemplaza el diseño completo y se puede deshacer.
- **Iconos:** set curado de unos 80 iconos estilo Lucide (licencia ISC), en línea dentro del motor, para que funcionen sin internet.
- **Fuentes:** lista curada, autoalojada con `@fontsource`, que se copia al export. Incluye Inter, Manrope, DM Sans, Playfair Display, JetBrains Mono y alguna más.

### 3.5 Hotspots: plantillas, tamaño, "aplicar a todos", bloqueo

**Plantillas iniciales (12):**

| # | Plantilla | Origen |
|---|---|---|
| 1 | Círculo con icono | el actual |
| 2 | Anillo con barrido animado | el "info" de Colombini |
| 3 | Punto con pulso | |
| 4 | Cuadrado con borde | |
| 5 | Esquinas (solo las orillas) | |
| 6 | Pastilla con texto | |
| 7 | Callout: línea guía animada + tarjeta de cristal con "kicker", título y "Entrar →" | el aéreo de Colombini |
| 8 | Flecha de navegación | |
| 9 | Etiqueta de precio | |
| 10 | Pin de mapa | |
| 11 | Solo icono | |
| 12 | Tarjeta flotante | la del prototipo: imagen, título, descripción y precio visibles sin clic |

**Partes editables de cada una:**
- color de fondo, de borde y de icono;
- grosor de trazo, tamaño, opacidad, radio;
- icono, texto y animación sí/no.

**Cómo se aplica un estilo:**
- Al elegir un estilo, la barra pregunta: **"Aplicar a: Solo este · Todos los de tipo Info"**.
- "Todos" escribe en `design.hotspotPresets.info` y limpia los estilos propios de los hotspots no bloqueados de ese tipo.
- **Bloquear** (`Hotspot.locked`): no se mueve por accidente y "aplicar a todos" no lo toca.

**Tamaño:**
- Va en px, con un mínimo táctil de 36 px en móvil.
- En móvil se escala ×0.9, salvo que sea más chico que el mínimo.

### 3.6 Video: rangos de cuadros + keyframes (tomado del prototipo, mejorado)

**Modelo de datos.**
- Un hotspot de video sigue colgado del cuadro donde se creó (`sceneId`), y se le agrega `segments: [{ from, to, keys: { [cuadro]: { lon, lat } } }]`.
- Los cuadros se cuentan por su posición dentro del lote (`orderIndex`).
- `segments = null` → **solo se ve en su propio cuadro**. Con eso, el bug queda arreglado incluso para los hotspots que ya existen.

**Posición.**
- Se interpola linealmente entre keyframes, por el arco corto en longitud. El prototipo solo saltaba de keyframe en keyframe.
- Los keyframes se recortan al rango del segmento.
- Se valida `from ≤ to` y que los segmentos no se encimen.

**El motor recalcula visibilidad y posición en cada cambio de cuadro**, no solo al montar.

**Editor.**
- El lote de video es **una sola tarjeta en el carril** ("Video · 60 cuadros"), no 60 miniaturas.
- El lienzo del editor trae:
  - una barra de tiempo;
  - las **barras de cobertura** de color por hotspot;
  - **manijas de inicio y fin arrastrables** (el prototipo solo tenía inputs numéricos);
  - un rombo por keyframe;
  - un **tooltip** con "Cuadro n + hotspots activos".
- Arrastrar un hotspot en un cuadro crea o actualiza el keyframe de ese cuadro.
- "Duplicar" desplaza el rango completo, no solo los keyframes (el prototipo tenía ese defecto).

### 3.7 Nadir (tapa inferior), opcional y configurable

- `none`: sin límite real. Se quita el clamp de `fov/2` que el prototipo aplicaba siempre.
- `limit`: la cámara no baja más de `limitDeg`, con la regla del prototipo `lat ≥ límite + fov/2`, aplicada en arrastre, pellizco y rueda.
- `cover`: un **disco 3D** en el polo sur, con color o logo subido.
  - Conserva la perspectiva y se ve bien al acercar. El overlay en pantalla del prototipo no escalaba con el FOV.
  - Tamaño en % y color o imagen desde el panel.
- En el editor queda en "Diseño › Ajustes del recorrido".

### 3.8 Componentes "inteligentes" y datos que necesita Colombini

Hay componentes que leen datos del tour en lugar de texto fijo. Siguen siendo plantillas editables en estilo, posición y textos.

**Datos nuevos:**
- `SceneGroup` (pisos o secciones): `code` ("F0"), `name`, `description`, `floorplanAsset`, `orderIndex`.
- `Scene` gana `groupId`, `planX`, `planY` y `planHeading`, para el minimapa con posición y cono de dirección.

**Componentes:**
- Selector de idioma.
- Botones "empezar en un piso".
- Riel de pisos (columna izquierda).
- Tarjeta del piso: descripción y lista de departamentos con miniatura.
- Barra de escena: anterior/siguiente, código, nombre y progreso.
- Minimapa con plano, punto en vivo y botón ampliar.
- Píldora de herramientas: idioma, sonido y pantalla completa.
- Hoja lateral de detalle con galería de fotos.
- Contador "en números" con ticks.
- Fila de cifras ("5 pisos / 12 salas").
- Indicador de carga.

**Idiomas** (confirmado por Edd, va en la Oleada 4): los textos pasan a ser `{ es, en, it }` donde haga falta, con selector de idioma en el editor.

**Audio ambiente:** un asset de audio y el botón de sonido con barras animadas.

### 3.9 Editor de diseño (UX tipo Canva)

**Navegación nueva del editor del tour (pestañas arriba):**
- **Contenido:** escenas, hotspots, pisos y video (lo de hoy, reorganizado).
- **Diseño:** nuevo.
- **Publicar:** exportar y compartir.

**Pantalla "Diseño":**
- **Barra izquierda de iconos**, cada uno abre un panel deslizable:
  - **Plantillas:** paquetes completos.
  - **Elementos:** tarjetas, botones, listas, contadores, navegación y fondos.
  - **Hotspots:** galería de las 12 plantillas.
  - **Texto:** Título, Subtítulo, Párrafo y Kicker.
  - **Subidos:** logo, videos, imágenes, planos y audio.
  - **Marca:** colores, fuentes y logo.
- **Lienzo central:**
  - mesa de trabajo de 1440×900 escalada a la ventana;
  - el 360 vivo detrás en la pantalla "Recorrido" y el video o imagen de fondo en "Inicio";
  - **abajo, como las páginas de Canva:** miniaturas de "Inicio" y "Recorrido", selector **Escritorio / Tablet / Móvil** y zoom.
- **Barra contextual superior** para el elemento seleccionado:
  - un muestrario por cada color de la plantilla (como los dos azules de tu captura);
  - borde, esquinas, transparencia y desenfoque de cristal;
  - "Posición" (Fijar a…, capas, alinear a la página);
  - bloquear, duplicar, eliminar, "Más".
- **Mini barra flotante sobre la selección:** bloquear, duplicar y eliminar, como en Canva.
- **Popover de color**, mismas secciones que Canva:
  - buscador de hex;
  - "Colores del diseño" (se juntan solos);
  - "Kit de marca";
  - colores sólidos predeterminados;
  - "+" con selector libre y cuentagotas (`EyeDropper`).
- **Interacción directa:**
  - arrastrar desde el panel al lienzo o clic para insertar al centro;
  - mover con **guías de alineación** (centro, bordes, otros elementos, márgenes seguros) y redimensionar con 8 manijas;
  - doble clic para editar texto en el lugar;
  - flechas para empujar, Supr, Ctrl+D, Ctrl+Z/Y, Ctrl+S, Esc.
- **Guardado automático** (cada 800 ms) con indicador "Guardado ✓". Ctrl+S fuerza el guardado. Todo se puede deshacer.

### 3.10 Calidad de panorámica: WebP o mosaicos AVIF de 6144 px

Hoy cada panorámica se guarda como **una sola WebP** al tamaño original, calidad 80. El original subido se descarta. Colombini usa mosaicos, que dan más nitidez al acercar y cargan más rápido la primera vista.

**Modos:**
- **Estándar (WebP):** una imagen, como hoy. Sigue siendo la base, la miniatura y el respaldo.
- **Alta definición (mosaicos AVIF):** el mismo esquema que Colombini:
  - una imagen base de 3072×1536;
  - una cuadrícula de **8 columnas × 4 filas de 768 px**, cortada de una versión de 6144×3072.
  - Si el original mide menos de 6144 px, se corta a su tamaño real; nunca se agranda.

**Configurable en dos niveles:**
- **por tour**, en "Diseño › Ajustes del recorrido › Calidad de panorámicas": Estándar / Alta definición;
- **por escena**, en "Más opciones": usar el valor del tour, forzar WebP o forzar mosaicos.

**Procesamiento (backend, sharp):**
- Corre en **segundo plano** después de subir, para no frenar la subida, y la miniatura muestra un estado "Generando alta definición…".
- Tarda unos segundos por escena (son 33 archivos AVIF).
- Desde ahora se **guarda el original** subido para poder regenerar.
- Las escenas que ya existen se cortan a partir de su WebP actual.

**Motor (`runtime/core/tiledPanorama.js`):**
- La esfera se divide en 8×4 parches.
- Primero se ve la base completa; luego se cargan solo los mosaicos visibles, empezando por el centro de la vista.
- Cada mosaico entra con fundido y los lejanos se liberan de memoria.
- Si el navegador no decodifica AVIF, cae a WebP.

**Datos:** se agrega `Scene.imageMode` (null = usa el del tour), `Scene.tiles` (`{ width, cols, rows, dir, status }`) y `Scene.sourcePath`. El modo por defecto del tour vive en `design.panoramas.mode`.

**Export:** copia `tiles/<escena>/` o la WebP, según el modo de cada escena.

**Límites:**
- Los **cuadros de video siguen en WebP**: al arrastrar la barra hay que cambiar de imagen al instante, y 60 escenas × 33 mosaicos no tendrían sentido.
- Los mosaicos solo aplican a panorámicas.

**Reglas de simplicidad:**
- La barra muestra como máximo unos 6 controles; lo demás va en "Más".
- Cada tour nuevo nace con el paquete "Cristal oscuro" aplicado: se ve bien sin tocar nada.
- Copy en español sin jerga.
- Vista previa siempre en vivo.

---

## 4. Inventario de Colombini → plantillas

Fuentes del análisis:
- **Tour en vivo:** build 16.09, que es la referencia de paridad.
- **Zip del freelancer:** build 04.09, de donde salen los assets y el CSS exacto.

**Tecnología del tour original:**
- Photo Sphere Viewer 5.14 sobre Three.js r184, con panorámicas en mosaico AVIF de 6144 px.
- El "tema JSON" del freelancer **casi no se usa**: el look real está fijo en `player/player.css`. Por eso su cliente no lo puede personalizar sin él. Nuestro sistema lo vuelve editable.

**Tokens de diseño** (pasan a ser el "Kit de marca" del paquete "Cristal oscuro"):
```css
--ink:#0e1728; --glass:rgba(20,37,68,.5); --glass-solid:rgba(17,31,57,.82);
--line:rgba(255,255,255,.15); --txt:#f6f8fb; --txt-2:rgba(246,248,251,.72); --txt-3:rgba(246,248,251,.48);
--accent:#fff; --on-accent:#101a2b; --map:#4c8dff; --r-sm:3px; --r:4px; --r-lg:5px; --gut:22px (14px ≤860);
--shadow:0 16px 44px -14px rgba(6,12,24,.6), 0 2px 8px rgba(6,12,24,.3); --glass-edge:inset 0 1px 0 rgba(255,255,255,.09);
--ease:cubic-bezier(.22,1,.36,1); --spring:cubic-bezier(.34,1.4,.5,1);
cristal = background var(--glass) + backdrop-filter: blur(24px) saturate(1.7) + border 1px var(--line) + radius 4–5px + sombra
```

**Tipografía:**
- Inter variable autoalojada.
- Mono del sistema para los "kickers": 10.5 px, mayúsculas, `.09em` de espaciado.
- Iconos estilo Lucide (stroke 1.9).

**Breakpoints:** 1080, 860 y 720 px, más `prefers-reduced-motion`.

**Animaciones que hay que poder reproducir** (van en el slot **"Animar"** de cada plantilla, como en Canva):
- **Entrada escalonada "subir + desenfoque":** 0.75 s, con un retraso de 180 + 85 ms por cada elemento.
- **Contador:** cuenta hacia arriba en 1.1 s y rota cada 4.2 s, con ticks de progreso.
- **Parallax del fondo:** sigue al mouse.
- **Marcador:** el arco gira, más lento cuando ya se leyó.
- **Línea guía del callout:** se dibuja sola.
- **Hojas:** se deslizan.
- **Paneles:** usan la curva tipo resorte.

| Componente de Colombini | Plantilla nuestra | Anclaje (escritorio) | En móvil |
|---|---|---|---|
| Video de fondo + degradado + cuadrícula + parallax | Fondo de Inicio (video/póster, scrim, grid, parallax) | pantalla completa | otro degradado |
| Logo + "VIRTUAL TOUR" | Imagen + Texto kicker | arriba-centro | logo más chico |
| Título, párrafo, selector EN/IT, "Enter the tour →" | Texto · Texto · Selector de idioma · Botón (acción Entrar; deshabilitado hasta que carga la 1.ª escena) | centro-izquierda | centrado, botón a lo ancho abajo |
| "5 FLOORS / 12 ROOMS / 2 LANGUAGES" | Fila de cifras (calculadas o manuales) | centro-izquierda | abajo |
| Tarjeta "What you will see" + "By the numbers" | Tarjeta de cristal con Lista de características + Contador rotativo | centro-derecha | **oculta** |
| "Or start on a floor" F0–F4 (con vista previa al pasar el mouse) | Botones de pisos (inteligente) | abajo-izquierda | **oculta** |
| "INITIALISING → READY" + barra | Indicador de carga | abajo-derecha | abajo-centro |
| Logo del HUD | Imagen | arriba-izquierda | 14 px |
| Píldora EN/IT · sonido (barras animadas) · pantalla completa | Píldora de herramientas + audio ambiente | arriba-derecha | el idioma pasa a pestañas |
| Riel AERIAL / FLOOR 4…0 con puntos por escena + "Info" | Riel de pisos (inteligente) | izquierda-centro | popover desde la barra |
| Tarjeta del piso: descripción + lista de departamentos con miniatura y ✓ visitado | Tarjeta de piso (inteligente) | izquierda | tarjeta inferior |
| Barra ‹ "F0 · Automated Storage…" › + progreso por segmentos | Barra de escena (inteligente) | abajo-centro | barra completa + 4 pestañas (Info, Pisos, Plano, Idioma) |
| Tira de miniaturas del piso | Tira de escenas | abajo-centro, sobre la barra | oculta |
| Minimapa "FLOOR 0" + plano a pantalla completa con zoom y pines | Minimapa + Visor de plano (inteligentes) | abajo-derecha | pestaña "Plano" |
| Pin de departamento: anillo con barrido + etiqueta al pasar el mouse | Hotspot "Anillo con barrido" (con etiqueta hover) | en el 360 | — |
| Callout aéreo: línea guía + tarjeta "Go inside →" | Hotspot "Callout" | en el 360 | — |
| Hoja de datos: título, lead, cifras, secciones con viñetas, galería + lightbox | Panel de detalle "Hoja lateral" + **contenido enriquecido del hotspot** | derecha, alto completo | hoja inferior 86vh |
| "DRAG TO LOOK · SCROLL TO ZOOM", viñeta, retícula al arrastrar | Aviso temporal, Viñeta, Retícula | centro/abajo | aviso oculto |

**Datos que pide la paridad (nuevos):**
- **Contenido enriquecido del hotspot:** `Hotspot.content` = `{ lead, stats:[{value,label}], sections:[{heading, items[]}], gallery:[asset] }`.
- **Pisos con plano:** `SceneGroup.floorplan` y la posición de cada escena en el plano (x, y).
- **Escenas visitadas:** se guardan en el navegador del visitante.
- **Idiomas:** EN/IT.

**Ojo:**
- **Calidad de imagen.** Colombini usa mosaicos AVIF de 6144 px. Ahora entra en el plan (3.10, Oleada 2 · B4), así que la nitidez al acercar también se puede igualar.
- **Seguridad del freelancer.** Su `player.js` trae la contraseña de su editor de textos en texto plano.

---

## 5. Oleadas y subagentes

Cómo vamos a trabajar:
- **Yo** hago de arquitecto, integrador y tester: escribo los contratos, reviso, fusiono y pruebo en el navegador.
- **Los subagentes** implementan, cada uno en su propio **git worktree**, con archivos asignados para no pisarse.
- **Modelos** (pedido de Edd): yo en Opus 5.5 como arquitecto; los subagentes en **Sonnet 5.5 con esfuerzo medio**, ajustado en cada lanzamiento.
- **Al final de cada oleada:** te dejo la app levantada con una checklist de prueba manual y esperamos tu OK antes de la siguiente.

### Oleada 0 — Arreglos inmediatos (1 subagente, chico)
**A0:**
- **Scrubber:** `cameraControls` ignora los elementos de UI (`[data-ui]`); la barra captura su propio puntero.
- **Panel de detalle:** deja de girar la cámara y su texto se puede seleccionar.
- **Script de pruebas:** `smoke-test.sh` crea y borra su propio tour y limpia lo que deja.
- **Export:** se escapa `</script>` en el JSON.

✔ Prueba: en Piran, pasar el mouse sobre la barra no la mueve; arrastrarla cambia de cuadro y no gira la cámara.

### Oleada 1 — Cimientos (2 subagentes en paralelo)
**A1 · Motor único (frontend):**
- mueve `viewer/core` a `runtime/`;
- crea `createTourRuntime` con la API de 3.1;
- `TourViewer.jsx` y `EditorViewer.jsx` pasan a usar el motor;
- build IIFE `vite.runtime.config.js` (three incluido).
Se toman del prototipo la caché de texturas con descarte de cargas viejas y la precarga en 2 fases con progreso.

**A2 · Datos y export (backend):**
- migración Prisma, toda junta para no migrar 4 veces:
  - `Tour.design`;
  - `Hotspot.style/locked/segments/content`;
  - `TourAsset`;
  - `SceneGroup` y `Scene.groupId/planX/planY/planHeading`;
  - `Scene.imageMode/tiles/sourcePath` (mosaicos, ver 3.10);
- `buildTourDocument` + `GET /document`;
- `PATCH /design` validado;
- subida de assets;
- `exportBundle.js` reescrito para copiar el motor compilado y los datos;
- migración `theme → design`.

**Contrato entre A1 y A2:** la forma de `doc` (3.2) y la ruta `frontend/dist-runtime/`. Ese contrato lo escribo yo antes de lanzarlos.

✔ Prueba:
- la app y el bundle se ven idénticos, con capturas lado a lado;
- el bundle funciona sin internet desde `localhost`;
- los hotspots de precio muestran "$" en ambos.

### Oleada 2 — Funciones sobre el motor (4 subagentes en paralelo)
**B1 · Video + nadir:**
- segmentos y keyframes en el motor;
- el lote de video como una sola tarjeta en el carril;
- barra de tiempo del editor con cobertura, manijas, keyframes y tooltip;
- duplicar y bloquear hotspot;
- nadir (none / limit / cover) en motor y editor.

**B2 · Plantillas de hotspot:**
- las 12 plantillas;
- set de iconos;
- tamaño;
- presets por tipo;
- "aplicar a: solo este / todos los de este tipo";
- plantillas del panel de detalle (hoja lateral, tarjeta flotante, hoja inferior en móvil).

**B3 · Layout + plantillas de UI:**
- motor de anclaje y escalado y reglas móviles (3.3), con tests unitarios de la matemática;
- plantillas básicas: Texto, Botón, Imagen, Forma, Tarjeta de cristal, Lista, Contador, Fila de cifras, Selector de idioma, Indicador de carga;
- pantalla de Inicio con fondo de video, imagen o color más degradado y cuadrícula, con el flujo "Entrar al tour".

**B4 · Mosaicos AVIF:**
- generación en segundo plano con sharp (base + 8×4), guardando el original;
- `tiledPanorama.js` en el motor, con carga por visibilidad y respaldo WebP;
- selector Estándar / Alta definición por tour y por escena;
- el export copia los mosaicos.

✔ Prueba:
- en Piran, un hotspot puesto en los cuadros 10–20 sigue al objeto y desaparece fuera del rango;
- con una panorámica de 6144 px en Alta definición, al acercar al máximo se ve más nítida que en WebP; la primera vista solo descarga la base y los mosaicos visibles; el bundle exportado se ve igual;
- cambiar el preset de Info recolorea todos los no bloqueados;
- un diseño de prueba escrito a mano en JSON se ve bien en las 3 resoluciones.

### Oleada 3 — Editor tipo Canva (1 investigación + 2 subagentes en paralelo)
**R1 · Investigación de Canva en vivo** (antes de C1 y C2; Edd abre un CDP con Canva logueado). Un agente recorre la interfaz en modo solo lectura:
- panel lateral;
- barra contextual por tipo de elemento;
- popover de color;
- posición y capas;
- animar;
- manijas y guías;
- atajos.

Entrega un documento con capturas y patrones que C1 y C2 usan como referencia. No crea, edita ni borra nada en la cuenta.

Antes de lanzar C1 y C2 escribo el **almacén del editor**: documento + selección + historial + guardado.

**C1 · Lienzo:**
- mesa de trabajo;
- seleccionar, mover y redimensionar con guías;
- "Fijar a…" con anclaje automático;
- Escritorio / Tablet / Móvil con ajustes por dispositivo;
- deshacer y rehacer;
- atajos;
- guardado automático.

**C2 · Paneles:**
- barra izquierda con la biblioteca (arrastrar al lienzo);
- barra contextual generada desde `slots`;
- popover de color con kit de marca;
- edición de texto en el lugar;
- panel de Subidos;
- paquetes de plantillas;
- pestañas Contenido / Diseño / Publicar.

✔ Prueba (tu checklist tipo Canva):
- arrastrar una tarjeta, moverla al centro, achicarla y cambiarle texto y colores;
- deshacer;
- ver en Móvil;
- exportar y comparar.

### Oleada 4 — Componentes inteligentes + paridad Colombini (3 subagentes + yo)
**Ajuste chico (pedido de Andrea): recorte de zenit y nadir.** Además del límite hacia abajo de la Oleada 2, el mismo límite hacia arriba, y poder ajustarlo por escena además de para todo el tour (`scene.view = { minLat, maxLat }` sobre el `design.nadir` general).

**D1 · Pisos y navegación:**
- `SceneGroup` en Contenido: crear pisos, subir el plano y colocar cada escena en el plano con un clic;
- riel de pisos, tarjeta de piso, barra de escena con pestañas en móvil, tira de miniaturas, minimapa y visor de plano a pantalla completa;
- píldora de herramientas, audio ambiente, aviso temporal, viñeta y retícula;
- "visitado" guardado en el navegador del visitante.

- **Piloto automático** (pedido de Andrea, 2026-10-13):
  - botón de iniciar/detener en el tour;
  - secuencia configurable de escenas: orden, segundos en cada una, giro de cámara;
  - tipo de transición: fundido, corte o zoom;
  - se detiene en cuanto el visitante toca o arrastra.

**D2 · Idiomas:** textos multilenguaje en diseño, escenas, hotspots y pisos, con selector de idioma en el editor y en el tour.
- Cada proyecto elige sus idiomas y uno por defecto; si falta una traducción, se muestra el idioma por defecto.
- **Editor de traducciones estilo 3DVista** (pedido de Andrea): una tabla con una fila por texto, que dice a qué pertenece (hotspot, botón, título, descripción, menú, popup, ficha) y muestra el original junto a una columna por idioma, con filtro "solo pendientes".
- El enlace puede abrir el tour directo en un idioma (`?lang=en`).

**D3 · Contenido enriquecido del hotspot:**
- **Video 360° desde una foto 360°** (pedido de Andrea): un hotspot o botón que abre un video 360° dentro del mismo tour. Falta confirmar con ella si es un video que se reproduce (play/pausa, sonido; nuevo: textura de video en la esfera) o si le basta el recorrido por cuadros que ya existe;
- editor de lead, cifras, secciones con viñetas y galería;
- plantilla "Hoja lateral" completa;
- lightbox.

**Yo · Recreación de Colombini:**
- construir el paquete "Cristal oscuro" y recrear Rovereta 1 desde el configurador;
- usar los assets del zip del freelancer solo localmente, como prueba interna;
- comparar con capturas en 1440×900, 768×1024 y 375×812.

✔ Prueba final: el tour exportado de Colombini se ve igual al original y funciona en el celular.

---

## 6. Verificación (cómo se prueba cada cosa)

- **Tests unitarios (Vitest, nuevo):**
  - matemática de anclaje y escalado;
  - interpolación de segmentos;
  - validación y migración de `design`;
  - serializador del documento.
- **Navegador (yo, en cada oleada):**
  - app y bundle exportado lado a lado en 1440×900, 768×1024 y 375×812;
  - consola sin errores;
  - capturas como evidencia.
- **Paridad Colombini:** capturas superpuestas del original y la recreación por pantalla (portada, aéreo, interior de piso, hoja de detalle, móvil).
- **Regresión:** se mantienen `smoke-test.sh` (ya sin basura) y la matriz de permisos.
- **Rendimiento:** el bundle con three incluido debe pesar menos de ~800 KB gzip en JS. Se mide en la Oleada 1.

## 7. Riesgos y decisiones

- **El motor único es la ruta crítica.** Si sale mal, todo lo demás se retrasa. Por eso va solo en la Oleada 1 y se prueba a fondo antes de seguir.
- **`backdrop-filter` en móviles viejos** puede ir lento. Si no hay soporte, se usa un fondo sólido semitransparente.
- **Video de fondo pesado en móvil:** se usa el póster en conexiones lentas y `playsinline muted` (autoplay).
- **Peso del diseño:** las imágenes nunca van en base64 dentro del JSON (el prototipo sí lo hacía); siempre como assets.
- **El modo `file://` (doble clic al `index.html`)** sigue fuera: es Track C. El bundle funcionará servido por cualquier servidor local, sin internet.
