# QA del editor unificado — 21 de octubre de 2026

Estado: implementación local verificada. No se ha hecho commit/push ni se ha
avanzado a Oleada 4. El árbol contiene además cambios previos de Oleada 3.5.

## Entorno y criterio visual

Chrome real mediante CDP9222, sin emular dispositivo. Ventanas1294×792 y1056×792;
aceptación final en localhost5173 al100 %: viewport1278×697 y1040×697. La revisión
previa en127.0.0.1 heredaba zoom90 %; no se usó como única evidencia de laptop.
Las capturas se abrieron y revisaron, además de comparar medidas del DOM.
La comparación de scrollWidth por sí sola no detectó el solapamiento de Publicar
con las acciones; se corrigió y se añadió comparación de ambos rectángulos.

Tour independiente: QA · Editor unificado, ID6ab77289-3688-4920-9dd5-20fb52b6d691.
Panorámica e imagen copiadas a archivos independientes; no se sobrescribieron las
del tour original. Un hotspot temporal de creación/subida se eliminó después del
ensayo. Los scripts/evidencias locales están en backend/exports/qa-oleada35
(directorio generado, ignorado por Git).

## Resultados

| Flujo comprobado con entradas CDP | Resultado |
| --- | --- |
| Doble clic en imagen/texto de tarjeta existente | Mismo runtime; selección de pieza y contenedor exterior; un solo canvas |
| Arrastre de imagen y esquina de imagen | Posición y tamaño progresivos; fuente de otras piezas conservada; imagen cargada |
| Doble clic y escritura sobre título | Modifica el binding real, sin insertar otro cuadro de texto |
| Mover título | Conserva tamaño de letra |
| Detalle inline al pulsar | «Ver menos» dentro del borde; alto exterior y grupo372 coinciden |
| Barra inferior del contenedor | Cambia altura32 sin recolocar las piezas ni cambiar la fuente |
| Escape después del gesto, cerrar inspector y recargar | Mismas medidas de tarjeta, piezas, imagen y texto; sin scrollbar interno inesperado |
| Arrastrar borde de biblioteca y ocultarla | Ancho cambia; viewport, cámara y composición permanecen idénticos |
| Insertar texto en biblioteca y deshacer | Inserta dentro del hotspot y deshace sin perder sus datos |
| Probar / Volver a editar | Conserva geometría y la misma instancia WebGL |
| Cambiar a detalle esquinado y editar imagen | Un solo detalle; misma imagen DOM durante el arrastre; sin ventanas anidadas |
| Abrir detalle esquinado en Probar | Un panel a demanda, con contenido visible y cierre |
| Escape con un campo del inspector en edición | Confirma el campo al cerrar; Enter confirma entradas de una línea |
| PATCH con red desconectada y Reintentar | Edición visible retenida; error visible; última revisión guardada al recuperar red |
| Creación desde clic derecho y subida real de imagen | Registro creado; pasa al inspector unificado; imagen disponible en el detalle |
| Ventana real1040×697 al100 % | Sin recorte/solapamiento de Contenido/Interfaz/Publicar y acciones |
| Export estático generado con runtime compilado | Misma composición visible que el editor: frame300×372, offsets, wrapping, fuentes20/16 e imagen126×105 |

La igualdad de export excluye piezas ocultas (precio sin valor): su rectángulo es
cero y su coordenada global depende del viewport. Se comparan los elementos
visibles en coordenadas locales, con imagen cargada, no solo el JSON almacenado.

## Evidencias locales

- 154-escape-close-preserved.png,155-resized-collapsed-library.png,
  156-reloaded-authoring.png: salida/cierre/recarga y biblioteca.
- 157-native-pieces.png,158-laptop-1040.png: edición de piezas y laptop al100 %.
- 160-screen-edit.png,161-screen-visitor.png: detalle esquinado y Probar.
- 162-save-error-retained.png,163-retry-saved.png: fallo de guardado y recuperación.
- 165-export-detail-matches.png: export con composición equivalente.
- 168-final-unified-desktop.png: vista final1278×697 al100 %, ocho tiradores exteriores.
- 166-created-with-image.png: creación y subida de imagen en registro temporal.
- unified-flow-report.json y unified-export-comparison.json: mediciones.
- Scripts: unified_acceptance_qa.py,unified_matrix_qa.py,unified_screen_qa.py,
  unified_recovery_qa.py,unified_export_compare.py,unified_create_qa.py.

## Pruebas y límites

457 pruebas frontend en46 archivos correctas, incluidos9 casos de sesión para
entrada sin escritura, conversión idempotente, bindings, gestos, cancelación,
undo/redo, fallo/reintento, plantillas, legacy y movimiento del detalle esquinado.
Builds de app y runtime correctos; permanece el aviso existente de tamaño del
bundle. La matriz CDP usó una panorámica del fixture; no constituye una repetición
integral de todos los flujos de vídeo/exportaciones históricas de Oleada3.5.
Los segmentos/keyframes no se modificaron en el refactor y siguen cubiertos por
las pruebas existentes; no afirmar una nueva aceptación visual de todos los vídeos.

## Guía para futuras modificaciones

1. Mantener el único viewport durante inspector, selección y Probar.
2. Medir geometría antes/después de Escape, cierre, reapertura y recarga.
3. Separar tarjeta colapsada y detalle por data-hotspot-surface; no deducirlo del
   elemento clicado ni regenerar una composición editada desde una receta.
4. Compartir el almacén y el renderer. Nunca aplicar el resultado de un guardado
   anterior encima de la revisión local más reciente.
5. Revisar capturas con el navegador en primer plano y registrar zoom/viewport;
   Chrome puede suspender rAF/WebGL en pestañas de fondo.


## Regresión posterior: imagen al reactivar detalle

La aceptación anterior no cubría desactivar y reactivar el detalle mientras se
editaba la composición del resumen. El usuario detectó que «Siempre visible»
mostraba solo la tarjeta sin imagen. La imagen y el layout seguían almacenados;
fallaba la reconciliación de superficies del runtime.

`markerLayer` aceptaba una actualización incremental cuando faltaba el controller
inline: interpretaba ausencia como actualización correcta y adoptaba la nueva
clave visual sin montar el detalle. Ahora verifica la presencia real de tarjeta y
detalle; los cambios de estructura reconstruyen únicamente ese hotspot. Las
ediciones posteriores conservan sus nodos. Un cambio de clave no es la única
razón para reparar una superficie que falte.

`visibleHotspotSurface` hace que una tarjeta con detalle inline siempre visible
seleccione ese detalle al editar, en lugar del resumen que está oculto. Desactivar
el detalle vuelve al resumen; click-to-open y detalle esquinado mantienen sus
estados distintos. No cambiar el archivo de imagen ni regenerar composiciones.

Verificación adicional mediante CDP, viewport1278×697 al100 %, copia independiente
`f2a70ea1-aa1b-4030-87fd-c9f075df7386`: desactivar/reactivar, esquina→inline,
click→siempre, seleccionar marcador, cerrar/Escape y recargar. La imagen vuelve
a estar visible; `content` completo antes/después es idéntico y los otros marcadores
conservan sus nodos. En la sesión del usuario también se comprobó equivalencia
de `content` y `style` con la copia de seguridad previa (tolerancia1e-9 por
redondeos numéricos de JSONB; diferencias observadas del orden1e-14): frame203,71×216,6,
imagen original y posiciones conservadas.

Evidencias locales:170-user-image-restored.png,171-detail-reenabled-image.png,
172-image-survives-reload.png,missing-image-report.json.461 pruebas/46 archivos,
app/runtime builds correctos. Los4 casos añadidos cubren montaje al reactivar,
esquina→inline y resolución de la superficie visible. El inspector de Aspecto
estaba plegado: las pruebas de sus botones deben abrirlo antes de medir/clicar.


## Regresión posterior: tarjeta bloqueada al arrastrar hacia abajo

Reproducido con el puntero nativo de Chrome CDP en la sesión del usuario:
la coordenada vertical persistida se alejaba miles de unidades del área visible,
pero el runtime sujetaba visualmente la tarjeta al borde superior. Un arrastre
vertical de 80 px apenas cambiaba su posición visible. El reanclaje de final de
resize estaba aplicando anclas del lienzo de Interfaz a un grupo local de hotspot.

El editor conserva ahora el ancla local al terminar resize. Al iniciar un gesto
del contenedor, captura la posición visible ya limitada por el runtime, consolida
los offsets anteriores y mide otra vez antes de calcular el movimiento. Todo
ocurre en la misma transacción: Escape cancela también esa consolidación, soltar
produce un solo paso de historial. Se identifica la superficie movida para que
un resumen con detalle al pulsar guarde también su desplazamiento. Los elementos
internos no se reubican ni regeneran; la lógica general de Interfaz no se rebasa.

CDP real, viewport1278×697: copia independiente con dy=-5000, cancelación del
primer arrastre, bajada de80px siguiendo cada paso de20px, resize real de esquina
con `data-handle=se`, otra bajada de40px y recarga con posición y ancho conservados.
Se verificó que los otros marcadores mantuvieran los mismos nodos y que los
arrastres no alteraran `content`. En el tour del usuario se bajó100px su tarjeta
con imagen, conservando dimensiones y toda la composición; `style` y `content`
coinciden con API guardada (tolerancia1e-9 para normalización JSONB de números).

Evidencias ignoradas: drag-regression-report.json, drag-user-final-report.json,
176-drag-after-resize.png,177-drag-reloaded.png,178-user-dragged-down.png.
464 pruebas/46 archivos correctos; builds de aplicación y runtime correctos.


## Regresión posterior: Siempre visible → Al pulsar

Reproducida con CDP en la sesión del usuario: tras cambiar reveal de always a
click, el editor mantenía seleccionado el detalle y continuaba forzando su
preview. Ahora esa transición vuelve al resumen, también mediante deshacer y
rehacer. Seleccionar detalle explícitamente sigue permitiendo abrirlo para editar
sus piezas cuando está configurado Al pulsar. El runtime elimina además una
expansión previa al pasar de always a click; el estado temporal no debe prevalecer
sobre el nuevo comportamiento configurado.

QA con Chrome CDP a1278×697, tour independiente f2a70ea1-aa1b-4030-87fd-c9f075df7386:
dos ciclos always→click, deshacer/rehacer, selección explícita del detalle, nueva
transición, Probar con apertura al pulsar la tarjeta y cierre con Ver menos,
y recarga conservando el detalle oculto. Imagen, posiciones, dimensiones y todo
el content se mantienen iguales, salvo reveal. Evidencias locales ignoradas:
reveal-cdp-report.json,183-reveal-click-collapsed.png,184-reveal-reloaded-collapsed.png.
466 pruebas/46 archivos y builds de aplicación/runtime correctos.


## Auditoría estructural posterior

La afirmación anterior de fidelidad completa no cubría el límite de composición
que una animación con fill-mode both creaba para backdrop-filter. El diagnóstico,
refactor y aceptación vigentes están en AUDITORIA_HOTSPOTS_2026_10_21.md. Incluyen
comparación del fondo con un control negativo que reproduce el fallo, además de
la comparación de medidas. No usar los resultados anteriores como prueba de
igualdad de acabado en la versión previa a esa auditoría.
