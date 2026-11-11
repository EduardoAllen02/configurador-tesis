# QA visual y funcional — Oleada 3.5

Fecha: 19 de octubre de 2026. Chrome mediante CDP local (9222), viewport de laptop
**1366×768**, escala 1. También se revisaron Tablet/Móvil del editor y el export
a **390×844**. Esta ronda no usó el navegador embebido de Codex.

Tour aislado: `ae57f69c-2055-48a5-8823-3f666c6e53ff`, Prueba Detalle Hotspot — Refactor.
No se modificó el tour C del usuario. Las variaciones temporales de datos de las
pruebas de texto largo, aplicación en lote y combinación inline/esquina se restauraron.

Las capturas originales están en `backend/exports/qa-oleada35/`, ignorado por Git.
Los enlaces siguientes son evidencia local, no imágenes versionadas en el repositorio.
Los checks de aceptación de Edd siguen pendientes en CHECKLIST_OLEADA3_5.md.

## Resultados observados en Chrome

| Función / acción | Resultado | Captura local |
|---|---|---|
| Comparación con Canva: seleccionar texto y abrir Fuente, sin cambiar su diseño | Búsqueda fija, fuentes del documento, recientes y filtro; usados como referencia de interacción | [Canva](../backend/exports/qa-oleada35/canva-font-selector.png) |
| Cabecera Contenido → Interfaz → Publicar | Mismo componente; pestañas a x≈554,32, y=12, alto=31 en 1366 px; sin salto por el scroll de la página | [Contenido](../backend/exports/qa-oleada35/09-content-header.png), [Publicar](../backend/exports/qa-oleada35/31-publish-header.png) |
| Inicio / Recorrido | Control segmentado, dos estados distinguibles y aria-pressed correcto | [Inicio](../backend/exports/qa-oleada35/08-intro-toggle.png) |
| Entrar en un grupo | Indicador a izquierda; herramientas superpuestas, área del lienzo estable | [Grupo](../backend/exports/qa-oleada35/33-group-left-aligned.png) |
| Permanecer sin selección en Interfaz | El aviso inicial desaparece; no ocupa espacio permanente | [Sin aviso](../backend/exports/qa-oleada35/32-interface-idle.png) |
| Marca, dos fuentes | Dos controles compactos, logo y esquinas visibles sin dos listas enormes | [Marca](../backend/exports/qa-oleada35/03-brand-compact.png) |
| Buscar Montserrat y aplicar | Un resultado; aplicación inmediata y cambio conservado al navegar | [Búsqueda](../backend/exports/qa-oleada35/05-font-search.png), [Persistencia](../backend/exports/qa-oleada35/44-brand-font-persisted.png) |
| Filtrar Serif / buscar nombre inexistente | Cuatro familias Serif; estado vacío explicado sin controles rotos | [Serif](../backend/exports/qa-oleada35/07-font-serif-filter.png), [Vacío](../backend/exports/qa-oleada35/47-font-empty-search.png) |
| Elegir Roboto para texto y abrir fuentes de títulos | Roboto figura en recientes compartidos; foco inicial en Buscar fuente | [Recientes](../backend/exports/qa-oleada35/45-font-recents.png) |
| Rueda en catálogo | Scroll de 710 px; buscador permanece a y≈202,59 | [Búsqueda fija](../backend/exports/qa-oleada35/46-font-sticky-search.png) |
| Fuente de un texto individual | Mismo catálogo, con Automática y fuentes de marca además de familias | [Texto individual](../backend/exports/qa-oleada35/42-text-font-selector.png) |
| Carga de fuentes | document.fonts.load devuelve una familia por cada uno de los 15 ids; archivos locales | [Aplicación](../backend/exports/qa-oleada35/06-font-applied.png) |
| Cambiar nombre de escena con lápiz y guardar | Campo legible; nombre nuevo visible; nombre original restaurado | [Renombrar](../backend/exports/qa-oleada35/10-scene-rename-edit.png) |
| Arrastrar tarjeta y después ancla | dx/dy pasan a −157/−70; mover ancla cambia lon/lat y conserva ambos offsets al soltar y guardar | [Tarjeta](../backend/exports/qa-oleada35/12-card-drag.png), [Ancla](../backend/exports/qa-oleada35/13-anchor-drag.png) |
| Configuración del hotspot | Tipo precede iconos; texto y campos legibles | [Configuración](../backend/exports/qa-oleada35/14-hotspot-settings.png) |
| Arrastrar ventana por título | Ventana movida de (902,112) a (272,94), dentro del viewport | [Ventana](../backend/exports/qa-oleada35/15-popup-drag.png) |
| Tamaño del marcador de línea/tarjeta | De 34 a 70 cambia el ancla visible a 70×70; restaurado a 34 | [Tamaño](../backend/exports/qa-oleada35/17-marker-size.png) |
| Configurar detalle secundario | Conserva la principal; abre opciones y editor común de piezas | [Opciones](../backend/exports/qa-oleada35/18-detail-settings.png), [Editor](../backend/exports/qa-oleada35/21-detail-designer.png) |
| Elegir detalle en esquina | Desaparece Siempre visible; se explica reemplazo al abrir otro | [Detalle en esquina](../backend/exports/qa-oleada35/19-screen-detail-config.png) |
| Dentro de tarjeta: Al pulsar / Siempre visible | Expande imagen y descripción en la tarjeta; el permanente se muestra desde el inicio, sin overlay esquinado | [Expandido](../backend/exports/qa-oleada35/25-inline-expanded.png), [Siempre](../backend/exports/qa-oleada35/22-inline-always.png) |
| Desactivar detalle y cancelar borrador | Se oculta Ver detalle; cerrar sin guardar recupera configuración original | [Desactivado](../backend/exports/qa-oleada35/23-detail-disabled.png), [Visitante](../backend/exports/qa-oleada35/24-inline-visitor.png) |
| Escena con screen/always antiguo | Cero detalles al entrar; abrir A y luego B deja exactamente uno de B | [Inicio cerrado](../backend/exports/qa-oleada35/26-screen-initial-closed.png), [Reemplazo](../backend/exports/qa-oleada35/28-screen-replaced.png) |
| Tarjeta esquinada corta | scrollHeight igual a clientHeight, sin barras; cierre dentro de la tarjeta | [Export final](../backend/exports/qa-oleada35/56-export-single-detail.png) |
| Descripción larga: rueda | Un único scroll real (4137 px de contenido, 608 px visibles); rueda lo lleva a 900, no modifica cámara | [Texto largo](../backend/exports/qa-oleada35/48-long-detail-top.png), [Rueda](../backend/exports/qa-oleada35/49-long-detail-scrolled.png) |
| Descripción larga: arrastre de barra y cierre | Scroll a 2750; cierre sigue a y≈148 y limpia detalle y contenedores vacíos | [Arrastre](../backend/exports/qa-oleada35/50-long-detail-scrollbar-drag.png) |
| Aplicar detalle a todos desde UI | Cinco no bloqueados reciben configuración; datos, imágenes y coordenadas intactos; bloqueado sin cambios. Configuración inicial restaurada después | [Aplicar](../backend/exports/qa-oleada35/51-detail-apply-all.png) |
| Abrir inline cuando hay un esquinado abierto | Desaparece el esquinado y se expande la tarjeta; no queda un overlay ajeno | [Intercambio](../backend/exports/qa-oleada35/60-inline-closes-screen.png) |
| Opciones de contador | Valor/Sufijo inputs de 38 px; Descripción textarea de 38 px, ampliable verticalmente | [Campos](../backend/exports/qa-oleada35/34-compact-counter-options.png) |
| Plegar ítems del contador | Resumen visible, datos intactos, acciones y valores conservados al abrir | [Plegados](../backend/exports/qa-oleada35/35-counter-collapsed.png) |
| Contador 4→8, deshacer, rehacer y volver a 4 | Ocho pestañas y ticks; deshacer vuelve a cuatro, rehacer a ocho | [Ocho secciones](../backend/exports/qa-oleada35/37-counter-eight-sections.png) |
| Editar sección 4, sentido regresivo y reproducir | Selección pausa valor 17; prueba llega a 0. Se restauraron 9 y 4200 ms | [Edición pausada](../backend/exports/qa-oleada35/38-counter-paused-edit.png), [Cuenta](../backend/exports/qa-oleada35/39-counter-countdown-zero.png) |
| Doble clic en contador | Abre Configurar contador, cero editores de texto vacíos | [Configuración](../backend/exports/qa-oleada35/36-counter-config.png) |
| Fila de cifras 4→6→4 | Se agregan cifras y separadores y se redistribuyen; conserva cuatro valores originales al reducir | [Seis cifras](../backend/exports/qa-oleada35/40-row-six-sections.png) |
| Doble clic en cifra estática | Editor abre el 5 real; editado a 6 y restaurado a 5, sin texto añadido | [Edición directa](../backend/exports/qa-oleada35/41-row-inline-edit.png) |
| Doble clic en título de barra | Editor contiene título existente; subtítulo sigue oculto | [Título](../backend/exports/qa-oleada35/43-topbar-correct-title.png) |
| Tablet y Móvil en editor | Tablet usa escritorio escalado; tarjetas móviles dentro de los límites compensando zoom | [Tablet](../backend/exports/qa-oleada35/52-tablet-editor.png), [Móvil](../backend/exports/qa-oleada35/53-mobile-editor.png) |
| Export generado desde Publicar | IIFE y archivos locales de fuentes/licencias incluidos; familias Roboto/Montserrat cargadas desde el mismo hosting | [Export](../backend/exports/qa-oleada35/54-export-generated.png), [Fuentes](../backend/exports/qa-oleada35/55-export-local-fonts.png) |
| Export de esquina a 390×844 | Detalle de 320 px dentro de viewport, en posición móvil; sin scroll exterior | [Móvil real](../backend/exports/qa-oleada35/59-export-mobile.png) |
| Barra de cuadros del export | En video, clic/seek pasa de 1/2 con un hotspot a 2/2 sin hotspot/detalle; panorámicas no muestran scrubber | [Cuadro 1](../backend/exports/qa-oleada35/57-export-video-frame1.png), [Cuadro 2](../backend/exports/qa-oleada35/58-export-video-frame2.png) |

## Correcciones surgidas de la observación

- La cámara hacía preventDefault de toda rueda y anulaba el scroll del detalle:
  ahora cede a controles/UI; el lienzo también cede a tarjetas expandidas.
- El tamaño fijo de la página de preview suponía una cabecera de 53 px: generaba
  scroll exterior inútil. Ahora se distribuye con flex y 100dvh.
- La envoltura de 380 px y el contenido de 320 dejaban el cierre fuera de la tarjeta.
  Ahora el panel usa su ancho real, con cierre independiente de su único scroll.
- Las tarjetas podían salir de la vista en Contenido y en el móvil del editor:
  ahora sus límites compensan escala y los gestos mantienen sus offsets guardados.
- El selector genérico de dirección aparecía vacío para datos antiguos sin direction:
  ahora muestra el mismo valor por defecto up que ya utiliza el runtime.
- Dos efectos de foco competían al abrir ventanas: el buscador recibe foco inicial
  y se recupera el foco anterior al cerrar.

## Validación y límites

422 pruebas frontend, 38 archivos; 7 pruebas backend. Build de app y build IIFE
correctos. `git diff --check` sin errores. Continúa el aviso previo de bundle >500 kB.
No se ha hecho commit/push ni iniciado Oleada 4.

Export final comprobado: versión **V2**, generado desde Publicar, disponible en
`http://localhost:4000/exports/ae57f69c-2055-48a5-8823-3f666c6e53ff/v2/index.html`.
El SHA-256 de su IIFE coincide con `frontend/dist-runtime/tour-runtime.iife.js`;
contiene las 15 licencias y su nota de procedencia. Se volvió a comprobar en V2
la carga de fuentes locales, la sustitución de detalles y la ausencia de overflow.

La matriz describe acciones realizadas, no una aprobación de diseño por el usuario.
No sustituye pruebas exhaustivas de todos los temas, geometrías personalizadas,
idiomas, dispositivos físicos o redes. Los cambios de aparición son compatibles
con documentos anteriores, sin migración destructiva ni pérdida de composición.

«Hotspot bloqueado» es el nombre de un caso del fixture que comprueba la exclusión
de cambios en lote. El bloqueo protege edición/arrastre y aplicación masiva; no
impide al visitante abrir su detalle. «Detalle fijo siempre» es otro nombre histórico
del fixture; su comportamiento vigente es Al pulsar.

Fuentes añadidas mediante [Fontsource](https://fontsource.org/docs/getting-started/install),
autoalojadas; licencias conservadas en `frontend/public/font-licenses/` y copiadas
al export. La comparación de Canva solo abrió controles de su documento existente.

## Ventanas reales, redimensionado y biblioteca compartida

Se retiró la emulación con `Emulation.clearDeviceMetricsOverride`. Se cambió el
ancho REAL con `Browser.setWindowBounds`, sin forzar el viewport con CDP.

| Ventana Chrome | Área web medida | Contenido / Interfaz / Publicar |
| --- | --- | --- |
| 896×800 | 880×705 | Cabecera común de 88 px, pestañas en segunda fila; sin recorte |
| 1040×800 | 1024×705 | Cabecera de 56 px; selectores y pie se envuelven sin recorte |
| 1280×800 | 1264×705 | Cabecera de 56 px; sin recorte |
| 1366×864 | 1350×769 | Cabecera de 56 px; sin recorte |

En las doce combinaciones: `document.scrollWidth == clientWidth` y ningún enlace,
botón de cabecera/pie, selector o etiqueta superior fuera del ancho visible.
Se observaron las capturas tras esperar carga/animación del visor. Evidencia:
[880 px](../backend/exports/qa-oleada35/74-responsive-896-design.png),
[1024 px](../backend/exports/qa-oleada35/74-responsive-1040-design.png),
[Contenido](../backend/exports/qa-oleada35/74-responsive-1040-edit.png),
[laptop](../backend/exports/qa-oleada35/74-responsive-1366-design.png).
Mediciones detalladas: `backend/exports/qa-oleada35/real-window-matrix.json` (ignorado).

- Fuentes: ancho inicial 370 px, frente a 440 del hotspot. Arrastre nativo CDP del
  tirador redujo fuentes a 310×480, sin scroll horizontal interno; cerrar y abrir
  Fuente de texto mantuvo esas dimensiones. Se restableció la preferencia de QA
  al terminar. [Tirador](../backend/exports/qa-oleada35/65-resize-font-grip.png),
  [ancho final](../backend/exports/qa-oleada35/75-font-default-final.png).
- Hotspot: antes de tocar tirador seguía a 440×560; arrastre lo llevó a 380×490.
  Se descartó el formulario y se quitó solo su preferencia de tamaño de QA,
  conservando todos los datos del hotspot.
  [Original](../backend/exports/qa-oleada35/72-hotspot-default-width.png),
  [redimensionado](../backend/exports/qa-oleada35/73-hotspot-resize.png).
- Se creó desde la UI «QA · Biblioteca compartida», con un archivo subido y usado
  como logo, después de flush. Visible al entrar a un segundo tour y persistida
  tras recarga. Confirmar Usar esta plantilla importó composición, un panel y logo
  con un NUEVO id/path de TourAsset; se verificaron undo/redo y guardado por GET.
  [Crear](../backend/exports/qa-oleada35/66-create-template.png),
  [guardada](../backend/exports/qa-oleada35/67-shared-template-saved.png),
  [otro tour](../backend/exports/qa-oleada35/68-template-applied-other-tour.png).
- Se eliminó exclusivamente el archivo temporal creado para esta prueba del tour
  fuente: DELETE 204. La imagen del destino siguió respondiendo 200 y una segunda
  importación desde biblioteca, posterior al borrado, devolvió 200 con archivo 200.
  El diseño original del tour fuente se restauró antes de borrar ese archivo.
- Roles comprobados por HTTP con usuario member temporal + permiso cliente:
  anónimo lee 401; member lee 200; crear plantilla 403; importar en tour sin permiso
  403; importar en tour autorizado 200. Usuario temporal eliminado al terminar.
  Nombre vacío rechazado 400. No se modificaron permisos de usuarios reales.
- Tour destino de QA: `31bb9fc9-6003-4478-b49d-bd15cc983fb7` (sin escenas; el aviso
  «Este tour aún no tiene escenas» es esperado). Plantilla y destino quedan como
  fixtures revisables. Sin edición de los tours originales del usuario.

Validación actual: **425 pruebas frontend en 39 archivos, 10 backend y build app
correctos**. El build avisa del tamaño >500 kB ya registrado. `git diff --check`
sin errores de whitespace, con avisos CRLF de archivos anteriores. Migración
aditiva `20261019180000_shared_templates` aplicada y Prisma Client regenerado.
El runtime exportado no cambió en este ajuste: estas funciones son del editor/API.
La validación manual del usuario sigue pendiente; no se inicia Oleada 4.

Además, con la ventana real a 896×500 (área web 880×405), el selector de fuentes
se recuperó a x=502, y=8, 370×389; cierre y tirador quedaron dentro de pantalla.
[Ventana baja](../backend/exports/qa-oleada35/76-short-real-window.png).
Chrome queda abierto a 1040×800 para probar el caso original, sin emulación.

Corrección posterior solicitada por el usuario: se revirtió el ancho especial de
370 px del selector de fuentes; vuelve al ancho inicial común de 440 px. Se conserva
la responsividad de las barras y el tirador manual. Las mediciones anteriores de
370 px documentan la prueba histórica, no el ancho vigente.

## Escala tipográfica comparada con Canva

Petición posterior del usuario: utilizar los mismos tamaños de letra que Canva.
Se inspeccionó su pestaña real abierta por el usuario mediante Chrome CDP, con
escala del viewport 1 y devicePixelRatio 1. Solo se abrió su selector de fuentes;
no se editaron elementos del documento de Canva.

| Función | Canva medido | Tour Studio aplicado |
| --- | --- | --- |
| Controles/cabecera | 14 px / línea 22 px | 14/22; se elimina la herencia de 16 px |
| Títulos de sección/panel | 14/20, peso 700 | 14/20, peso 700 |
| Etiquetas del rail | 11/16, peso 600 | 11/16, peso 600 |
| Nombres de biblioteca | 12/20, peso 400 | 12/20, peso 400 |
| Muestras del catálogo de fuentes | 16 px; imágenes de 24 px de alto | 16/24 |

Los 16 px de las muestras de Canva se confirmaron en sus URLs de render
`fontsizepx:16`, además de la captura. No se redujeron esas muestras ni el ancho
de la ventana de fuentes (440 px). Contenido, Interfaz, ventanas flotantes y
Publicar tienen base UI explícita de 14 px. Runtime y documento Design no cambian.
Los formularios conservan padding y tamaños de controles; la escala por función
sustituye el mínimo uniforme de 14 px anterior por decisión explícita del usuario.

Evidencia: [Canva](../backend/exports/qa-oleada35/78-canva-reference.png),
[selector de Canva](../backend/exports/qa-oleada35/83-canva-font-loaded.png),
[editor ajustado](../backend/exports/qa-oleada35/81-studio-canva-type.png),
[fuentes ajustadas](../backend/exports/qa-oleada35/82-font-canva-type.png).
Build de la aplicación correcto. Se revisa de nuevo el recorte en las tres
secciones con la matriz de ventanas reales; capturas `84-type-responsive-*` y
mediciones `typography-real-window-matrix.json` en la misma carpeta de QA.

## Tiradores, sliders y tamaño del detalle — revisión final

Chrome CDP en ventana real con área web **1278×697**, sin viewport emulado.
Fixture independiente: **QA · Tamaño de tarjeta hotspot**, tour
`9fd5a6ba-01f1-48e6-bfe0-8e415be32c96`, escena
`cc7a3aa5-5f49-439d-a103-2ff61ff5d4ca`. Se copiaron panorama e imagen a archivos
independientes; no se modificó el tour original del usuario. El antiguo fixture
`ae57f69c-2055-48a5-8823-3f666c6e53ff` ya no está en la BD actual.

Las pruebas utilizaron eventos nativos de ratón por CDP, capturas y comprobación de
API después de guardar/recargar. Los informes están en la carpeta ignorada de QA.

| Caso | Resultado observado |
| --- | --- |
| Esquina del detalle inline | Escala 0,8 en caja, texto e imagen; lon/lat intactos |
| Lateral del detalle | +64 de ancho visible, tipografía idéntica |
| Borrador | API sin cambios hasta Guardar; cierre descarta |
| Persistencia | Recarga conserva valores; gesto sin diálogo guarda automáticamente |
| Escape | Restaura geometría anterior y mantiene abierta la configuración |
| Grupo de tarjeta UI | Marco 360→288, textos 10,5/20/14→8,4/16/11,2 |
| Lateral UI | Ancho posterior 397,76; conserva las fuentes; undo/redo correctos |
| Marcador circular | 40×40→32×32, escala completa del marcador |
| Tarjeta sin detalle | 210×65,875→168×52,7 |
| Imagen por piezas | Selección real de imagen, cuatro esquinas y laterales |
| Configuración | Tamaños con range; coordenadas X/Y siguen numéricas |
| Alto fijo 120 | Rueda mueve scrollTop a 38, contenido 156 / viewport 118 |
| Export v1 | Tres hotspots, geometría persistida y cero tiradores |

No aparecieron errores durante la prueba final de altura/rueda. Se programaron
mediciones de ResizeObserver mediante RAF para evitar bucles durante el gesto.
El export se generó desde Publicar en Chrome sobre este fixture independiente.

Evidencia: [esquina Content](../backend/exports/qa-oleada35/102-content-corner.png),
[esquina UI](../backend/exports/qa-oleada35/105-ui-corner-scale.png),
[lateral UI](../backend/exports/qa-oleada35/106-ui-width-reflow.png),
[imagen seleccionada](../backend/exports/qa-oleada35/109-image-selected.png),
[otros hotspots](../backend/exports/qa-oleada35/110-plain-hotspots-resize.png),
[export](../backend/exports/qa-oleada35/112-export-resized-hotspots.png),
[sliders Posición](../backend/exports/qa-oleada35/113-position-size-sliders.png),
[sliders hotspot](../backend/exports/qa-oleada35/114-hotspot-slider-controls.png),
[alto fijo](../backend/exports/qa-oleada35/115-fixed-height-wheel.png).
Informes: `hotspot-resize-qa.json`, `ui-resize-qa.json`,
`plain-hotspot-resize-qa.json`, `height-slider-wheel-qa.json` en esa misma carpeta.

**434 pruebas frontend en 42 archivos; builds app y runtime correctos.** Backend
sin cambios en este ajuste (10 pruebas de la entrega anterior). Aviso de bundle
>500 kB conocido. La aceptación manual de Edd sigue pendiente; Oleada 4 no iniciada.

## Piezas de hotspots — continuación del 20 de octubre

Chrome CDP real **1278×697**, eventos nativos de ratón/teclado. Se reanudaron los
servicios locales y la conexión dedicada CDP. Se utilizó únicamente el fixture
`9fd5a6ba-01f1-48e6-bfe0-8e415be32c96`; no se modificaron tours originales.

- Doble clic en Descripción de detalle: selecciona su pieza, ofrece Tamaño/Posición
  y permite arrastrarla. Se cambió fuente a 18 y posición mediante controles/gestos;
  guardar conservó esos valores. No apareció una caja de texto independiente.
- Doble clic en Información de tarjeta SIN detalle: selecciona Etiqueta del grupo
  del marcador. Fuente a 16 por teclado del slider y movimiento por ratón, con
  undo/redo. GET anterior a Guardar seguía intacto. Tras Guardar/recargar se conserva
  `content.card`, lon/lat idénticos y `content.detail.enabled:false`.
- Doble clic en el título compuesto selecciona ese hijo; un segundo doble clic abre
  el textarea inline existente. Input.insertText + Enter cambió el título enlazado
  a «QA tarjeta editable», confirmado con Guardar y visible en el runtime.
- Fixtures temporales separados de tarjeta flotante, pastilla y precio: doble clic,
  fuente 13 mediante slider, Guardar y recarga correctos. La tarjeta flotante también
  cambió +25 de ancho por tirador lateral conservando el texto. Se eliminaron solo
  estos fixtures al terminar, mediante finally.
- Export **v2**, generado desde Publicar con ratón CDP: tres hotspots, composición
  «Información / QA tarjeta editable», tipografías persistidas y **cero tiradores**.
  Se regresó a Contenido y se dejaron los servicios arriba para la prueba manual.
- El ensayo de mover y agrandar piezas produjo intencionalmente solapamientos en
  el fixture; al terminar se reacomodaron y redujeron sus textos para dejarlo legible.
  Los informes numéricos reflejan el ensayo previo a esa limpieza del fixture.

Evidencia: [Descripción seleccionada](../backend/exports/qa-oleada35/118-detail-selected.png),
[etiqueta seleccionada](../backend/exports/qa-oleada35/120-marker-label-selected.png),
[título seleccionado](../backend/exports/qa-oleada35/123-marker-title-selected.png),
[tarjeta flotante](../backend/exports/qa-oleada35/124-pieces-hotspot-card.png),
[pastilla](../backend/exports/qa-oleada35/124-pieces-pill-label.png),
[precio](../backend/exports/qa-oleada35/124-pieces-price-tag.png),
[título inline](../backend/exports/qa-oleada35/125-marker-title-inline.png),
[fixture al terminar](../backend/exports/qa-oleada35/126-hotspot-compositions-final.png),
[export v2](../backend/exports/qa-oleada35/127-export-composed-marker.png).
Informes: `hotspot-pieces-qa.json`, `other-hotspot-pieces-qa.json` en esa carpeta
ignorada. La captura 116 es diagnóstica previa a corregir el target de pointer capture.

**438 pruebas frontend, 43 archivos; 10 backend; builds app/runtime correctos.**
`git diff --check` sin errores (avisos CRLF previos). Aviso de bundle >500 kB
conocido. La aceptación del usuario y el avance a Oleada 4 siguen pendientes.

## Corrección del temblor de resize — 20 de octubre

Se reprodujo el bug reportado en el hotspot inline del fixture 9fd, sin guardar
cambios. Chrome CDP real a **1278×697**, arrastre gradual y captura por cada RAF.
Antes, esquinas/laterales alternaban la altura natural con una medida incompleta:
contorno y tarjeta diferían hasta **57,28 px**. El grupo se calculaba desconectado,
con textos de alto cero, y ResizeObserver terminaba de medirlo después del contorno.

Ahora se miden los grupos conectados, de dentro afuera, antes del host y de
posicionar la selección. El contorno se sincroniza también durante un gesto; solo
el clamp de posición queda suspendido. No se bloquea el reflow legítimo de texto
cuando cambia el ancho ni se altera la semántica de los tiradores.

| Tirador | Cuadros RAF | Diferencia máxima tarjeta/contorno |
| --- | ---: | ---: |
| NW | 78 | 0 px |
| NE | 93 | 0 px |
| SE | 87 | 0 px |
| SW | 89 | 0 px |
| E | 83 | 0 px |
| W | 89 | 0 px |

Comparadas left/top/width/height en los 519 cuadros. Al detener el ratón, todos los
casos mantienen la altura estable. Los laterales pueden cambiar naturalmente el
alto al envolver texto; las esquinas conservan escala proporcional con el redondeo
normal de texto/bordes. Escape restaura el gesto; se cerró el formulario sin guardar.
No se modificaron datos del tour durante esta regresión.

Informes ignorados: `resize-jitter-before.json`, `resize-jitter-after-final.json`.
Capturas durante el gesto: `128-resize-held-nw/ne/se/sw/e/w.png` en la misma carpeta.
Se confirmó visualmente que el recuadro coincide con toda la tarjeta.
**439 pruebas frontend en 44 archivos; builds app/runtime correctos.** Backend sin
cambios. Aviso de bundle >500 kB previo. Recargar la página para sustituir los
controladores imperativos que puede conservar HMR. Aceptación manual pendiente.

## Parpadeo al soltar y guardar — 20 de octubre

Causa: la capa borraba todos los objetos CSS2D ante cualquier cambio del documento,
incluidos posición y metadatos de la respuesta HTTP. El marcador editado también
se reconstruía después de pintar el gesto. Se sustituyó por reconciliación por id
y adopción del gesto antes de guardar. La comparación visual ignora orden JSONB
y diferencias numéricas imperceptibles del round-trip; los valores se guardan
completos. Una edición visual real invalida únicamente el id correspondiente.

Prueba aislada **QA · Guardado sin parpadeos**, tour
`dc762a5e-36ff-4193-9ce3-db618241ef38`, escena
`e4e32005-8073-4c48-955c-15bb7facf65d`. Panorama e imagen copiados a archivos nuevos.
No se modificó el tour fuente del usuario. Se deja el fixture para revisión.

Chrome CDP en ventana real **1278×697**. Eventos nativos de ratón, MutationObserver,
identidad de wrapper/contenido/tarjeta y muestreo RAF durante el guardado optimista
y la respuesta HTTP. En TODOS los casos: cero marcadores eliminados, identidad
conservada en los tres hotspots, conectados, sin display:none ni pérdida de opacidad.

| Caso | Cuadros observados | Persistencia comprobada |
| --- | ---: | --- |
| Mover punto | 73 | Cambia lon/lat en API |
| Mover tarjeta principal | 73 | Guardado real de estilo |
| Mover tarjeta secundaria | 75 | Guardado real de estilo |
| Esquina SE | 77 | Ancho 276,09→296,78 |
| Lateral E | 76 | Ancho 296,78→312,78 |
| Esquina NW | 74 | Ancho 312,78→304,08 |

Los 448 cuadros comprueban también los hotspots que NO se están arrastrando.
Recarga final: filas API idénticas a las guardadas. Se revisó además la regresión
del temblor en los seis tiradores: diferencia de alto tarjeta/contorno 0 y sin
oscilación al dejar quieto el ratón (`resize-jitter-after-reconcile.json`).

Informe/script ignorados: `no-blink-qa.json` y `no_blink_qa.py` en la carpeta QA.
[Captura del guardado](../backend/exports/qa-oleada35/130-save-no-blink.png).
La primera pasada de automatización no alcanzó los tiradores ocultos: se corrigió
la selección y se exige ahora verificar el cambio numérico persistido; la matriz
anterior corresponde a la pasada completa con resizes efectivos.

También se detectó que el proceso API con --watch se reiniciaba al escribir archivos
del ensayo y podía producir Failed to fetch. Se reinició únicamente ese proceso
como `node src/server.js`; salud HTTP 200 y log sin errores al concluir. No hubo
cambios de código backend ni de credenciales. Frontend/API/CDP quedan levantados.

**444 pruebas frontend en 45 archivos, builds app/runtime correctos.** Regresiones
cubren posiciones/metadatos, orden, cambio/eliminación de un id, adopción de un gesto,
segundo gesto con datos actuales y precisión JSONB. Bundle >500 kB ya conocido.
Validación manual pendiente; sin iniciar Oleada 4 ni hacer commit/push.

## Continuación 20 de octubre: barra contextual en encabezado

Chrome CDP real, target 1437571094B77994BF925F1B8A65E4CF, fixture propio
«QA · Guardado sin parpadeos» dc762a5e-36ff-4193-9ce3-db618241ef38.
Ventanas redimensionadas mediante Browser.setWindowBounds, SIN emulación.

| Viewport real | Barra | Texto → imagen → conjunto → texto |
| --- | --- | --- |
| 1278×697 | Dentro del encabezado | Caja del lienzo idéntica |
| 1040×697 | Etiquetas compactadas | Caja del lienzo idéntica |
| 884×697 | Etiquetas compactadas | Caja del lienzo idéntica |
| 764×697 | Bajo el título, sin desbordar | Caja del lienzo idéntica |

Verificado mediante Input nativo y capturas: tamaño20, Manrope, grosor700,
alineación centrada, cursiva y subrayado; Más opciones conserva texto/variante y
accesos Animar/Posición. Terminar + Guardar persistió por HTTP; recarga sin errores.
En Interfaz se añadió texto de prueba, se aplicó tamaño26, derecha, cursiva y
subrayado, se comprobó Más opciones y se eliminó el texto temporal al terminar.
No se modificaron tours del usuario. Se restauraron las dimensiones de Chrome.

Evidencia local ignorada en backend/exports/qa-oleada35/: toolbar-dock-qa.json,
134-docked-{1294,1056,900,780}.png, 135-text-more.png,
136-saved-text-format.png, 137-interface-text-more.png, 138-interface-text-icons.png.
Los números de archivos corresponden al ancho exterior; tabla = viewport real.
Cero errores en la auditoría CDP del dock. 444 tests / 45 archivos y build app
correctos. Runtime y backend sin cambios en esta entrega. Aceptación manual pendiente.

## Continuación 20 de octubre: vista previa del detalle

Fixture dc762a5e, misma sesión CDP real. Revisadas capturas 140-detail-preview.png
y 141-detail-preview-{1294,1056}.png en backend/exports/qa-oleada35 (ignoradas).
Viewports 1278×697 y 1040×697; detalle completo en muestra sin scroll propio.
Prueba Input nativo: ocultar/mostrar título, Texto sencillo elimina imagen,
Imagen y texto vuelve a cargarla, colocación screen muestra sus posiciones,
Editar piezas abre el diseñador con barra superior. Confirmada ausencia de rangos
de texto/imagen en ambos formularios. Cero errores JS; prueba descartada sin guardar.
444 tests frontend / 45 archivos y build app correctos. Backend/runtime sin cambios.

## Continuación 20 de octubre: salto de fuente al redimensionar

Reproducido en fixture dc762a5e con Input CDP: una esquina diagonal3px transformó
16.68 en24.055 por usar el eje relativo más sensible. Tras la proyección diagonal,
el mismo desplazamiento pasa gradualmente a17.1679 (el texto medía108.54px en
pantalla). No se modificó ningún tour del usuario.

18casos con ventanas reales1278×697 y capturas revisadas: hotspot texto/imagen,
Interfaz texto con tamaño automático, texto16.68 a125% y25%, imagen. Esquina,
lateral y mover en cada uno, muestreo3/4/6/12/20px y cancelación. Detectado y
corregido además el solapamiento de tiradores24×24: elementFromPoint del lateral
resolvía se; ahora resuelve e incluso con zoom25%. Fuente constante al mover y
estirar ancho, proporción conservada en esquinas, cancelación restaura geometría.
Textos/imagen de prueba y su asset temporal eliminados; borrador hotspot descartado.

Evidencia ignorada: piece-scaling-qa.json, ui-scaling-qa.json,
142-hotspot-pieces-smooth.png, 143-interface-text-smooth.png,
144-interface-image-smooth.png, scripts text_jump_probe.py / piece_scaling_qa.py /
ui_scaling_qa.py. Cero errores JS en auditoría Interfaz. 447tests/45archivos,
builds app/runtime correctos y diff sin errores de whitespace.

## Continuación 20 de octubre: contenedor exterior con una pieza seleccionada

Chrome CDP real 1278×697, fixture propio dc762a5e, zoom125%. Se verificaron n/s/e/w
más esquina se: alto/ancho varían con el cursor, fuente interna estable en lados,
esquina escala todo; ocho tiradores exteriores e interiores, selección conservada.
Undo por cada gesto, redo de altura y cancelación de otro arrastre correctos.
Guardado HTTP de alto225, recarga exacta y reapertura con ocho tiradores. Verificado
además para Info, Precio, Navegación y edición del marcador sin detalle. Fixture
restaurado tras probar persistencia; ningún tour del usuario modificado.

Evidencia ignorada en backend/exports/qa-oleada35: parent-container-qa.json,
146-container-height.png, 147-container-reloaded.png, 148-marker-container-handles.png;
scripts parent_container_qa.py / parent_container_save_qa.py / parent_types_qa.py.
Cero errores JS. 448 tests/45 archivos, builds app/runtime correctos.
