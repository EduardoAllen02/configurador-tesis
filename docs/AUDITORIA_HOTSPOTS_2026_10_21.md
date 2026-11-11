# Auditoría del sistema de hotspots

Solicitud: detener los parches aislados, identificar la raíz y decidir qué conservar.
Fecha: 21 de octubre de 2026. Diagnóstico y diseño escritos antes del código. Refactor implementado localmente; aceptación del usuario pendiente.

## Diagnóstico con evidencia

1. **La apariencia difiere aunque datos y estilos computados coincidan.** En CDP,
   el mismo detalle tiene fill rgba(20,37,68,.5), blur24, borde1 y las mismas piezas
   tanto en editor como en visitante. Sin embargo, el visor retiene la animación
   `hs-card-in` con fill-mode `both` en un ancestro. Su animación de opacidad crea
   un límite de composición para backdrop-filter. Quitar temporalmente esa
   animación recupera el cristal del editor sin cambiar un solo dato. Evidencia:
   audit-render-baseline.json y capturas188/189/190 en backend/exports/qa-oleada35.
   Comparar solamente JSON o getComputedStyle no detectaba este fallo.
2. **Dos propietarios del mismo contenedor.** attachInlineDetail y attachMarkerCard
   escriben acabado, ancho y clases sobre la misma tarjeta. La capa de marcadores
   debe conocer ambos mapas, comprobar superficies ausentes, recrearlos durante
   resize y decidir qué actualización incremental es válida. El orden de montaje
   pasa a formar parte del resultado visual.
3. **Estado temporal mezclado.** Un Set `expanded`, el booleano `open` del renderer
   y el preview derivado de la selección contienen versiones de la apertura.
   Cerrar un preview puede borrar una apertura del visitante; cambiar reveal exige
   correcciones en la UI y el runtime. Ninguno de esos estados debe guardarse.
4. **Dos caminos de render.** mountDetailContent calcula props de forma diferente
   al montar y actualizar (altura fija legacy, medición de grupos anidados).
   Existen además reglas CSS que borran acabados de grupos descendientes y
   supuestos de padding/alto de una generación anterior.
5. **Compatibilidad resuelta solo al editar.** exteriorLayout vive en editor,
   mientras el visitante todavía interpreta geometría anterior de otra manera.
   Un adaptador de lectura debe estar en el modelo compartido y ser idempotente.
6. **QA insuficiente.** El número de pruebas unitarias no mide la fidelidad visual.
   Faltaban capturas equivalentes tras terminar animaciones, comparación de
   acabados y el cruce editar → Probar → documento nuevo → export.

## Decisión

No rehacer el sistema desde cero. La proyección de anclas, los datos v1, los
bindings, las plantillas de elementos, el editor in situ y la cola de guardado
son reutilizables. Reemplazarlos añadiría migraciones y riesgo de perder trabajo
sin resolver el límite de composición que provocó esta captura.

Sí refactorizar la frontera entre documento, presentación e interacción:

| Se conserva | Se sustituye o elimina |
| --- | --- |
| content.card/content.detail, IDs, frames y bindings | Normalización de geometría exclusiva del editor |
| Plantillas group/text/image y acabado compartido | Props distintos entre montaje y actualización |
| Un runtime y overlay de selección sobre sus nodos | Dos controladores escribiendo la tarjeta exterior |
| Cola de PATCH e historial transaccional | Set de expansión más un booleano local de apertura |
| Ancla lon/lat, keyframes y segmentos | Preview de edición usado como apertura del visitante |
| Presets de marcador, estilos propios y legacy | CSS que borra acabados de grupos indiscriminadamente |
| Entrada animada del visitante | fill-mode que sigue alterando el cristal al terminar |

## Contrato del refactor

- Un presentador por hotspot posee el contenedor, las dos superficies, el ancho,
  el acabado exterior, la acción y su ciclo de vida. La capa de marcadores solo
  proyecta, reconcilia por ID y adapta gestos; no conoce dos renderers rivales.
- Un estado temporal por hotspot distingue apertura del visitante y preview del
  editor. El comportamiento guardado decide si el detalle puede aparecer y si
  es permanente. Cambiar de política limpia la apertura anterior; retirar un
  preview no modifica una apertura independiente del visitante.
- Un adaptador de lectura compartido transforma geometría anterior sin escribir
  en BD ni regenerar IDs. Editor, visitante y export usan el mismo adaptador.
- El grupo raíz posee su propio acabado y medidas. El host de una composición
  exterior es transparente y no añade padding, borde, altura ni escala.
- Montar y actualizar utilizan el mismo cálculo de props y medición. Las
  diferencias de modo se limitan a controles, interacción y animación temporal.
- El detalle esquinado conserva exclusividad y un único scroll útil. No se
  convierte en otra composición ni se reutiliza su desplazamiento como frame.
- No cambiar datos del tour del usuario para hacer pasar una prueba. Trabajar
  sobre copias y verificar invariantes del documento antes/después.

## Aceptación

CDP con Chrome real a100%, viewport1278×697 y variante estrecha. Comparar medidas,
tipografía, imágenes y píxeles del acabado después de terminar las animaciones;
usar un fondo/cámara controlados cuando se compare cristal. Matriz: info/precio/
navegación, detalle apagado/al pulsar/siempre/esquina, legacy y outer, creación y
actualización, arrastre/resize/cancelar/deshacer/recargar. Los nodos de otros
hotspots deben permanecer. Verificar documento del visitante y bundle exportado,
no dar por suficiente que compilen o que el JSON sea igual.

Este informe reemplaza la afirmación anterior de equivalencia visual completa:
la prueba anterior de export verificaba principalmente geometría, no la
composición real de backdrop-filter después de una animación.


## Hallazgos adicionales y cierre de implementación

- **Composiciones duplicadas en la sesión:** hotspotLayouts guardaba elementos
  originales mientras panels contenía los editados. Reemplazar una plantilla
  podía recuperar acabados antiguos. Ahora hotspotLayouts solo contiene metadatos,
  panels es la fuente de los elementos y sessionLayout construye la lectura actual.
  El ancla histórica de pantalla se conserva aparte; no es otra copia de piezas.
- **Mover modificaba dimensiones:** moveFrame volvía a calcular w/h desde el DOM,
  incorporando sus redondeos después de un resize. Mover ahora solo escribe
  posición y conserva dimensiones de diseño, también en el editor de Interfaz.
  Hay una regresión de20 movimientos con dimensiones fraccionarias.
- **Medidas de superficies ocultas:** el montaje y la actualización comparten props
  y medición; el presentador vuelve a medir después de aplicar ancho y visibilidad,
  antes de que los gestos lean la geometría. No depende de esperar otro resize.
- **Cambios del marcador:** desplazar dx/dy y editar piezas conservan el nodo;
  cambiar tipo/acabado del marcador reconstruye únicamente su tallo cuando lo
  requiere la plantilla. No adoptar una clave nueva dejando variables CSS viejas.

Implementación vigente:

| Responsabilidad | Dueño |
| --- | --- |
| Elementos editables, historial y serialización | hotspotSession.js: panels + sessionLayout |
| Compatibilidad de geometría integrada | runtime/model/hotspotSurface.js |
| Apertura del visitante / preview temporal | runtime/hotspots/detailState.js |
| Host, superficies, acabado exterior y acción | runtime/hotspots/cardPresenter.js |
| Props y medidas idénticos al montar/actualizar | runtime/hotspots/detailView.js |
| Proyección, reconciliación y adaptación de gestos | runtime/hotspots/markerLayer.js |
| Un detalle exclusivo en esquina | runtime/hotspots/screenDetails.js |

Se retiraron attachInlineDetail y attachMarkerCard, sus dos mapas de controladores,
el Set expanded y el booleano open duplicado. También se retiraron el reset CSS
indiscriminado del acabado de grupos y el scroll automático de tarjetas inline.
Los tiradores anteriores para plantillas sin edición de piezas quedan como
adaptador de gestos que utiliza el mismo presentador; no tienen otro renderer.

El inventario local consultado durante la auditoría tenía18 hotspots:6 anteriores
al detalle integrado,8 integrados de geometría interna y4 exteriores. Incluye los
tours de pruebas. Se conservan los adaptadores de paneles anteriores a v1 para
leer sus registros; no se realiza una migración masiva ni se borra contenido.
Los paneles legacy incluidos dentro de v1 sí pasan por el adaptador común y se
comprobó su equivalencia. Los nuevos flujos no crean otro diseñador ni otro
sistema de renderizado.

## Evidencia de aceptación técnica

Tour independiente de auditoría:3eec977d-ede6-4f9b-ae10-2e990c579d66. Se copiaron
panorámicas e imagen a archivos propios; el tour del usuario no se modificó para
conseguir las capturas. Fixture y scripts están ignorados en
backend/exports/qa-oleada35.

- Chrome CDP real,100%, viewport1278×697; revisión adicional1040×697. Capturas
  completas observadas y mediciones de controles de cabecera. No emulación IAB.
- Matriz info/precio/navegación × apagado/al pulsar/siempre/esquina:12 cruces con
  comparación exacta de las métricas locales de composición, fuentes, imágenes y
  acabado entre editor activo y documento recién cargado del visitante.
- Geometría integrada interna anterior y panel v1 legacy: mismo grupo, IDs,
  medidas y acabado después del adaptador en ambos lectores.
- Repetir always→click, undo/redo, seleccionar detalle explícitamente, Probar,
  cerrar con Ver menos y recargar. El detalle vuelve oculto cuando corresponde.
- Desactivar y reactivar con composición activa: la imagen reaparece sin sustituir
  el nodo del marcador. Sin regenerar elementos ni perder el archivo enlazado.
- Arrastre desde un offset fuera de pantalla, cancelar, soltar, resize de esquina,
  segundo arrastre y recarga: conservar composición y nodos de otros hotspots.
- Secuencia de dos cuadros con keyframes (panorámicas de fixture que simulan
  cuadros extraídos): mismo nodo entre cuadros y cambio solo de la key activa al
  arrastrar. No se ejecutó un nuevo proceso de transcodificación de vídeo.
- Comparación de cristal sobre patrón controlado: diferencia media del fondo
  editor/visor0,374 por canal en escala0–255; reactivar la animación defectuosa
  como control produce30,200. El resto del recorte incluye diferencias subpíxel
  de rasterizado del texto; no se afirma igualdad de todos los píxeles.
- Bundle local v3 generado con el runtime compilado actual: misma medida e imagen,
  diferencia de fondo editor/export0,0 sobre el patrón. SHA256 del runtime del
  bundle coincide con el build. No se publicó en un servicio externo.
- 476 pruebas frontend en49 archivos;10 backend; builds de app/runtime correctos.

Artefactos: audit-matrix-report.json, audit-legacy-panel-report.json,
audit-video-report.json, audit-pixel-report.json, audit-reenable-report.json y
audit-export-report.json. Capturas191/193/196 documentan el contraste con el
control;199/200/201 el export;197 la secuencia;198 la ventana estrecha.

## Límites y mantenimiento

Esta aceptación se hizo en Chrome/Windows con ratón y teclado. No certifica
Safari/Firefox ni gestos táctiles. Los paneles anteriores a v1 conservan su lector
histórico; no se afirma una conversión global de todas sus variantes. No se
cambió el esquema, la cola HTTP, los permisos ni el procesamiento de medios.

Una futura incidencia de fidelidad debe añadir un caso que atraviese montaje,
actualización, modo visitante y export. No añadir un segundo dueño de estilos,
una copia de elementos en el inspector o un estado de apertura documental para
hacer pasar un caso aislado. La cantidad de pruebas unitarias por sí sola no
sustituye una captura comparada después de completar las animaciones.
