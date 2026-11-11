# Editor unificado de hotspots — análisis y diseño

Fecha: 20 de octubre de 2026.
Estado: implementado localmente el 21 de octubre; ver QA_CDP_EDITOR_UNIFICADO_2026_10_21.md. Prioridad previa a continuar
Oleada 3.5. Este documento sustituye la dirección de UI del plan de detalle del
19 de octubre; conserva sus capacidades y la compatibilidad de datos.

## Resultado que debe percibir el usuario

Una panorámica, una ventana de configuración por hotspot y una selección que se
mantiene. Editar una imagen, texto, tarjeta, punto o detalle nunca abre otra mesa
de trabajo. Al soltar un arrastre terminado queda guardado automáticamente.
Cerrar herramientas o pulsar Escape no revierte una edición terminada.

Los errores comunicados el 20 de octubre impiden dar por aceptada la edición de
hotspots, aunque pasen pruebas unitarias o pruebas aisladas de gestos/HTTP.

## Diagnóstico comprobado

| Síntoma | Causa en el flujo actual |
| --- | --- |
| Al cerrar la ventana se pierde lo arrastrado | EditorViewer mantiene hotspotDraft/stylePreview y HotspotTypePopover mantiene estados locales; handleSave persiste, pero setPopover(null) limpia la previsualización. Con ventana abierta, los gestos se desvían al borrador; sin ella se guardan. |
| Escape cambia de aspecto y añade scroll | HotspotDetailDesigner usa un DraftDesignProvider y otro DesignCanvas/runtime. El visor monta después otro contenedor con padding añadido, ancho extra y restricciones propias. mountDetailContent fuerza autoFit:true y height:0 cuando detailFixedHeight está activo, mientras el diseñador usa la altura manual. |
| Doble clic en fondo e imagen abre contenido diferente | hotspotPieceRequest deduce surface por closest(.hs-detail-body). El fondo exterior se clasifica como card, la imagen interior como detail. editableHotspotCard puede generar una composición de resumen sin imagen. No es evidencia de que el archivo de imagen se haya borrado. |
| Barra de herramientas poco perceptible | Se inyecta en el encabezado de página junto a texto descriptivo; al desplazar la página puede salir de vista. El editor y el inspector conservan sus propias cabeceras y acciones. |
| Escape tiene efectos difíciles de anticipar | Ventanas anidadas, diseñador y editores registran manejadores independientes. FloatingWindow mantiene useEscape activo incluso al ocultarse. |

Comprobación CDP de solo lectura en la sesión actual: viewport 1278×697, dos
canvas y dos ventanas de configuración ocultas mientras el diseñador está
activo. No se ha recargado ni manipulado el borrador que el usuario dejó abierto.

Las comprobaciones anteriores no cubrieron suficientemente la equivalencia visual
antes/después de Escape, cierre y reapertura. Se debe corregir ese criterio de QA,
además del código. Que un JSON se guarde no demuestra que se pinte igual.

## Distribución de la interfaz

1. Cabecera común: nombre del tour, Contenido/Interfaz/Publicar, Deshacer/Rehacer,
   estado Guardando/Guardado/Error y Vista previa.
2. Herramientas contextuales y ruta de grupo superpuestas dentro de la panorámica.
   La última corrección del usuario elimina otra fila de acciones a todo lo ancho:
   acciones generales en la cabecera común; grupo alineado a la izquierda y opciones
   de texto/imagen dentro de la vista. En laptop se oculta el texto de Vista previa
   cuando hace falta espacio; se conserva su icono, etiqueta accesible y tooltip.
3. Título, botones Hotspots/Elementos 2D y escenas compactados en la columna izquierda;
   la panorámica ocupa la altura inmediatamente bajo la cabecera. No hay otro canvas.
4. Una sola ventana flotante «Hotspot», arrastrable y redimensionable. Reúne Datos,
   Aspecto y Detalle como secciones plegables. Sus botones seleccionan la superficie
   real sobre la misma panorámica, sin una segunda ventana de detalle.
5. Biblioteca de piezas superpuesta a la izquierda de la vista: ancho arrastrable
   de 170 a 440, recordado en la sesión; contenido responsivo y flecha para ocultar.
   Mantiene texto, formas, botones e imágenes compartidos con Interfaz.

El inspector y el catálogo se superponen al área de trabajo. Abrirlos, cerrarlos,
seleccionar una pieza o cambiar de sección no altera el tamaño del viewport,
zoom, cámara, posición de la tarjeta ni coordenadas del hotspot. Las acciones
«Editar tarjeta», «Editar piezas» y «Configurar detalle» convergen en esta misma
sesión; dejan de abrir modos con lienzos diferentes. Se elimina «Terminar» como
paso de aplicación; cerrar solo cierra herramientas.

## Selección y gestos

- Clic selecciona el hotspot o contenedor; doble clic entra en sus piezas en el
  mismo lugar. El fondo pertenece siempre a la superficie visible, igual que su
  imagen. Un siguiente doble clic sobre texto permite escribir en él.
- Cada raíz renderizada identifica explícitamente hotspotId, surfaceId y pieceId;
  ningún handler deduce marcador/detalle a partir de clases CSS o tamaño del DOM.
- Marcador y detalle siguen siendo estados visuales distintos cuando el resumen
  colapsado y el contenido expandido deben ser distintos. El inspector los nombra
  explícitamente; nunca cambia de uno a otro por pulsar una zona vacía.
- Al editar Detalle se muestra ese detalle en el mismo runtime, aunque su modo
  visitante sea «Al pulsar». Esta apertura de edición es temporal: no cambia reveal.
- Los controles internos y externos permanecen disponibles. Esquinas escalan el
  conjunto. Barras del contenedor cambian sus límites sin escalar ni recolocar
  piezas colocadas manualmente. Barras de texto cambian el ancho y su ajuste de
  líneas; mover conserva tamaño. No aplicar un auto-layout implícito al salir.
- En línea guía, arrastrar el punto mueve el conjunto; arrastrar la tarjeta cambia
  su desplazamiento; arrastrar una pieza solo cambia su frame local.
- Las acciones del visitante (navegar, comprar, abrir enlaces) se ejecutan en
  «Probar», no mientras se intenta seleccionar una pieza. Probar conserva la vista.

## Guardado e historial

Un almacén de edición por hotspot posee sus datos y composiciones, compartido
por el lienzo, el inspector y la cola de persistencia. Las ventanas no son dueñas
de copias del contenido. Se separa estado documental de selección, cámara,
sección abierta y detalle expandido, que son estado temporal de interfaz.

| Acción | Resultado |
| --- | --- |
| Durante el arrastre | Preview local de la transacción; sin PATCH por cada pixel. |
| Soltar | Una operación de historial, commit local inmediato y guardado automático. |
| Escape durante un arrastre | Cancela únicamente ese gesto hasta su estado inicial. |
| Escape después de soltar | Sale de texto/selección/nivel según foco; no descarta el commit. |
| Cerrar el inspector o cambiar de hotspot | No altera lo editado; los guardados pendientes continúan. |
| Deshacer/Rehacer | Nueva actualización local y persistencia ordenada. |
| Texto en un campo | Estado de entrada local mientras se escribe; commit validado al salir/Enter y debounce, sin obligar a vaciar título/precio en el servidor. |
| Fallo de red | Conservar la edición visible, indicar Error y permitir Reintentar; no recargar encima de cambios locales. |
| Abrir vista previa o salir de escena | Vaciar la cola de commits; no anunciar Guardado antes de confirmación HTTP. |

Se ordenan escrituras por hotspot y revisión, con respuesta antigua incapaz de
pisar una edición nueva. Se aprovecha hotspotUpdateQueue, pero se retira su
recover mediante reload destructivo. Una respuesta de guardado confirma una
revisión; no sustituye un snapshot posterior completo. Los commits deben mezclar
cambios por dominio y conservar content.card/content.detail/segments entre sí.
Las imágenes seleccionadas se suben y vinculan al hotspot como operación explícita,
con estado de carga y sin revocar URLs que aún pinta el editor.

Para hotspots nuevos todavía no persistidos, la sesión de creación es explícita;
no exigir a registros existentes que vuelvan a pasar por Guardar cambios. Aplicar
a otros hotspots y reemplazar plantilla son comandos explícitos con alcance e
historial; cerrar una ventana no constituye ninguno de esos comandos.

## Render y geometría: una definición

El runtime original permanece montado. Se extrae una superficie editable común
para marcador y detalle, con sus matrices local/pantalla, caja exterior y piezas.
El overlay de selección se monta sobre esos nodos reales; no copia su imagen a
otra mesa ni reconstruye el grupo con una escala independiente.

Editor, miniatura opcional, visitante y export utilizan la misma resolución de
composición, datos enlazados, acabado, frame y medidas. El editor añade solamente
controles e identificación de selección. Mantener una sola instancia WebGL en
Contenido; reutilizar las matemáticas de gestos/texto de Interfaz, no su mesa entera.

- El frame canónico representa el borde exterior. Padding/borde se resuelven una
  sola vez; no añadir después 30 px ni un margen de detalle oculto.
- Alto automático solo mientras está elegido; un arrastre de altura lo convierte
  en manual. El renderer no vuelve a forzar autoFit ni a recalcular ese alto.
- Ningún cierre/Escape añade scroll, centra una pieza, cambia el fondo o aplica
  nuevamente una plantilla. Un frame manual no crea por sí solo una zona scroll.
- Una tarjeta en la panorámica conserva las piezas y el desbordamiento visible en
  ambos modos; no recortar ni ajustar la composición de forma silenciosa. Los
  detalles en esquina solo podrán usar un scroll de contenido si realmente exceden
  la pantalla del visitante, sin otro scroll anidado. Esto se verifica por separado.
- Texto automático conserva medida natural y wrapping real; una composición manual
  no se vuelve a ordenar al editar datos. Se mantienen escalado gradual y zonas de
  tiradores sin solapamiento ya corregidas.
- Mover/zoom solo ocurren por gesto del usuario o acción explícita de enfocar;
  abrir el inspector no llama a focus ni sustituye la cámara.

## Límites técnicos y compatibilidad

Almacén propuesto: hotspotEditorStore con comandos de selección, cambio de pieza,
resize, datos, comportamiento, historial y estado de guardado. HotspotInspector
sustituye el estado local de HotspotTypePopover y el pop-up anidado de
HotspotDetailSettings. Un adaptador de selección/gestos conecta el overlay con el
runtime edit existente, compartiendo utilidades con el editor de Interfaz.

HotspotDetailDesigner deja de montar DraftDesignProvider/DesignCanvas y termina
retirándose cuando todos sus comandos estén cubiertos por la edición in situ.
HotspotDetailPreview, si se mantiene una miniatura en plantillas, consume el mismo
render; deja de ser un render alternativo de validación. Los controles de tamaño
manual siguen en el lienzo, sin reintroducir sliders de texto/imagen.

Se conservan content.card y content.detail, enlaces a datos, imágenes, plantillas,
font, estilos propios, posición móvil y segmentos/keyframes de video. Crear un
adaptador de lectura para layouts antiguos; conversión determinista sin escribir
al abrir ni regenerar IDs. Si el frame exterior exige versión nueva, versionar el
layout JSON y mantener lectura v1; no cambiar columnas de BD por comodidad. Nunca
regenerar una tarjeta ya editada a partir de un snapshot DOM o una receta.

## Orden de implementación

1. **Fijar invariantes y capturar regresiones.** Fixtures independientes del tour
   del usuario para los cinco casos reportados, con estado/API y capturas antes y
   después. Registrar geometría, imagen, fuente, cámara, selección y scroll real.
2. **Almacén y persistencia.** Unificar estado/historial y commits al soltar;
   cambiar cierres/Escape; pruebas de cola, errores, undo/redo e imágenes. El
   guardado no debe depender de si el inspector está abierto.
3. **Geometría/render común.** Unificar frame exterior, auto/manual, padding y
   medición; etiquetar superficies/IDs. Validar edit/visitante con los mismos datos.
4. **Edición en la panorámica original.** Adaptador de matrices, selección,
   contenedor/piezas y texto in situ. Retirar el segundo runtime. Mantener cámara y
   zoom; resolver marcador/detail por identidad explícita.
5. **Inspector y barra persistentes.** Fusionar ambos pop-ups, secciones plegables,
   Agregar temporal y estado de guardado visible. Retirar rutas de UI duplicadas.
6. **Aceptación visual integral.** Activar el flujo completo solo cuando pasen los
   cruces de entrada/salida; no dejar mitad del flujo guardando y mitad descartando.
   Actualizar documentación vigente y retirar componentes muertos.

No mezclar aquí Oleada 4, catálogo de nuevas plantillas ni un rediseño completo de
Interfaz. El refactor sí reutiliza sus componentes y conserva su comportamiento.

## Pruebas que deciden si está listo

CDP obligatorio con ventanas reales, al menos 1366×768 y 1280×720 de viewport si
la pantalla física lo permite, más la ventana real disponible 1278×697 y una
variante estrecha1040×697. Anotar siempre viewport y tamaño exterior por separado.
Revisar capturas de cada transición, no solo la captura final ni solo JSON.

1. Replicar las cinco capturas: cambiar tamaño/posición de imagen, texto y
   contenedor; soltar; Escape; cerrar inspector; reabrir; recargar; visitante.
   La apariencia y datos se conservan, sin aparición de un scroll nuevo.
2. Entrar por imagen, texto, hueco y fondo de la misma tarjeta: idéntico surfaceId
   y misma composición; imagen nunca desaparece por elegir otra ruta.
3. Seleccionar una pieza, cambiar contenedor y volver a la pieza; undo/redo,
   Escape durante el gesto y después de soltar. No perder cámara ni selección
   por un cierre; no reconstruir otros hotspots ni repetir animaciones.
4. Info, precio y navegación; estilos con y sin tarjeta; detalle apagado,
   inline al pulsar, inline siempre y esquinado. Mantener el comportamiento del
   visitante existente, incluidos casos sin imagen/datos opcionales.
5. Editar con inspector abierto/cerrado, cambiar de escena y alternar Probar;
   misma persistencia. Video: ancla/keyframes en el cuadro correcto, sin modificar
   otros segmentos ni reposicionar un detalle fijado a pantalla.
6. Red lenta, respuesta fuera de orden y fallo HTTP: edición local intacta,
   Reintentar funcional y estado Guardado verdadero. Cerrar o cambiar selección
   durante un upload no pierde la imagen ni deja URLs temporales rotas.
7. Comparar cajas/tipografía/padding y pixels de tarjeta a igual cámara/escala en
   edición y visitante, admitiendo únicamente diferencias de controles/selección.
   Verificar scrollbar con scrollHeight/clientHeight y con el ratón.
8. Móvil/tablet: comprobar todos los gestos ofrecidos, sus coordenadas y tamaños
   guardados. No mostrar un tirador que el contexto geométrico no pueda aplicar.

Los fixtures de QA anteriores que ahora tienen composiciones solapadas se conservan
para regresión, no se corrigen a mano para que la captura pase. Primero comparar
contra el resultado compuesto que el usuario dejó editado y su estado documental.


## Implementación y evidencia — 21 de octubre

- `hotspotSession.js` usa el almacén compartido con Interfaz, dos superficies con
  identidad propia y una cola de guardado por revisión. La sesión se conserva al
  reabrir un hotspot; abrir/seleccionar no guarda. Las composiciones se serializan
  con bindings, sin duplicar valores ni perder imágenes.
- `HotspotInPlaceCanvas` mide los nodos reales y monta solo selección, texto y
  gestos. `UnifiedHotspotEditor` reúne biblioteca, toolbar e inspector sin otro
  runtime. Los cuatro componentes del diseñador/detalle anterior se retiraron.
- `geometry: "outer"` identifica el borde exterior canónico; ya no se añade el
  wrapper de 30 px ni se fuerza altura automática al cerrar. El adaptador anterior
  se aplica sin mutar el registro leído y conserva los IDs. `offset` del detalle
  esquinado conserva desplazamientos manuales separados de sus piezas.
- El renderer actualiza las piezas existentes durante los gestos. La captura de
  puntero distingue controles del editor, piezas y cámara. Probar conmuta acciones
  de visitante dentro del mismo WebGL; volver conserva la composición y cámara.
- QA Chrome CDP: ventana real de 1294×792 (viewport1278×697 al 100 %) y
  1056×792 (viewport1040×697). Hubo una revisión previa al 90 %; la aceptación
  final se repitió al 100 %, incluyendo captura para detectar solapamiento de tabs.
- 457 pruebas de frontend/46 archivos, builds de app y runtime correctos.
  El export v3 del fixture igualó frame, offsets, tamaños de imagen, fuente y
  wrapping visibles del editor; el fallo de red conservó la edición y Reintentar
  guardó la revisión pendiente. Ver el informe para alcance y evidencias locales.
