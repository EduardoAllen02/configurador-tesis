# Contexto operativo del configurador

> Añadido el 21 de octubre: [menú de clic derecho opcional por tour](MENU_CONTEXTUAL_TOUR.md).
> Contenido → Ajustes del recorrido; `design.contextMenu`, desactivado por defecto,
> hasta ocho acciones y crédito Created by. Un módulo runtime compartido por
> Probar/visitante/export; edición conserva Agregar hotspot. No incluir estos
> ajustes en plantillas compartidas. QA CDP real 1278×697/1040×697 y export v4;
> estado total vigente: 486 pruebas frontend/51 archivos y 12 backend, builds correctos.

> Estado vigente del 21 de octubre: implementado el editor unificado de hotspots.
> Referencia vigente: [auditoría estructural de hotspots](AUDITORIA_HOTSPOTS_2026_10_21.md).
> PLAN_EDITOR_HOTSPOTS_UNIFICADO.md y QA_CDP_EDITOR_UNIFICADO_2026_10_21.md conservan el historial.
> Las notas históricas de HotspotDetailDesigner, borrador descartable, «Terminar»
> o «Guardar cambios» para registros existentes quedan sustituidas por lo siguiente:
>
> - Un presentador cardPresenter por hotspot posee el host y ambas superficies.
>   detailState separa apertura del visitante y preview; no reintroducir Set expanded
>   ni un open local paralelo. hotspotSurface adapta geometría antigua en ambos lectores.
> - panels es la única fuente de piezas de la sesión; hotspotLayouts es metadato.
>   sessionLayout se usa para inspección y cambio de plantilla; no copiar elementos.
>   Mover preserva w/h autorales y solo cambia posición, nunca tamaños medidos del DOM.
> - La animación de entrada de un ancestro no puede retener opacidad/filter con
>   fill-mode forwards/both si contiene cristal: altera backdrop-filter aun al
>   terminar. Comparar editor/visitante/export sobre un fondo controlado.
> - Una panorámica/runtime; `HotspotInPlaceCanvas` solo añade controles sobre sus
>   nodos. `hotspotSession.js` es dueño de datos, content.card/content.detail e
>   historial por hotspot. No volver a crear una mesa independiente para piezas.
> - Soltar guarda automáticamente; cerrar/Escape posterior no revierte. Escape
>   durante el gesto cancela solo ese gesto. Error de red conserva el estado local;
>   Reintentar envía la última revisión. Antes de Vista previa/cambio de escena se
>   vacía la cola. Imagen enlazada y segmentos de vídeo se conservan por dominio.
> - Inspector único «Hotspot» (Datos/Aspecto/Detalle). Crear es la única operación
>   con botón explícito; después pasa al mismo inspector de registros existentes.
> - Título y modos compactos junto a escenas; vista alta desde la cabecera común.
>   Acciones generales en esa cabecera, sin otra fila. Grupo a izquierda y toolbar
>   sobre la panorámica. Biblioteca superpuesta, redimensionable 170–440 y ocultable.
> - Frame `geometry: "outer"` describe el exterior; no añadir padding/tamaño de
>   wrapper ni auto-fit implícito al salir. e/w del contenedor cambia límites sin
>   reordenar piezas manuales; esquinas escalan; n/s cambia altura. Actualizar nodos
>   existentes durante un gesto evita parpadeos. Identificar surface explícitamente.
> - Gestos del contenedor: partir del left/top visible del runtime, que puede
>   estar limitado al viewport y diferir mucho del offset guardado. Rebasar dentro
>   de beginGesture/preview, medir sincrónicamente y conservar top-left local al
>   terminar resize. Escape revierte también el rebase; no autoanclar al lienzo1440×900.
>   hotspotPlacementSurface decide qué root aporta el offset compartido del marcador.
> - Al pasar de Siempre visible a Al pulsar, seleccionar el resumen y retirar
>   el preview forzado del detalle; también en undo/redo. Seleccionar detalle
>   explícitamente puede abrirlo después para editarlo. El runtime limpia la
>   expansión anterior cuando cambia esa regla, sin alterar la composición.
> - Detalles esquinados: uno bajo demanda, o preview temporal mientras se edita;
>   Probar habilita acciones del visitante en la misma vista. Fijos permanentes
>   solo dentro de cada tarjeta. No reintroducir ventanas de detalle anidadas.
> - QA final CDP al 100 %, viewport1278×697 y1040×697. No basta scrollWidth:
>   comprobar también que los rectángulos de tabs y acciones no se solapan.
>   476 tests/49 archivos +10 backend, app/runtime build correctos. Export compara composición
>   y cristal después de las animaciones, no solo JSON. Evidencia y límites en el informe enlazado.


Actualizado: 2026-10-21. Rama comercial Andrea/Interiors3D, repositorio
`RAMAS/tour-studio-web`, Git `master`. Oleada 3.5 implementada y en aceptación de
Edd; Oleada 4 espera su validación. Hay cambios locales revisables sin push.

## Decisiones vigentes

- Ventanas flotantes: todas conservan su tamaño inicial de 440×560, incluidas las
  fuentes (se revirtió su estrechamiento por petición del usuario). Incluyen tirador inferior derecho para cambiar ancho/alto, también
  con flechas del teclado. Tamaño recordado por tipo de ventana durante la sesión;
  no guardar dimensiones en Design ni propagar el tamaño de fuentes a hotspots.
  Al abrir o reducir Chrome se recupera la ventana completa; arrastrar el título
  permite mantener parte fuera del área conservando el encabezado accesible.
- Responsividad del editor: sin mínimo de 1100 px. Cabecera común mantiene las
  pestañas centradas; hasta 1100 px deshacer/rehacer usan iconos. Bajo 900 px las
  pestañas ocupan una segunda fila en las tres secciones. Controles de páginas y
  pie se envuelven sin recortar. Verificar también la ventana REAL de Chrome con
  `Emulation.clearDeviceMetricsOverride` + `Browser.setWindowBounds`: fijar un
  viewport emulado no comprueba qué pasa al estrechar la ventana del usuario.

- Un solo diseño y motor: editor, preview y export IIFE usan el mismo runtime.
  Los estados de selección, pausa y prueba son temporales; nunca se guardan en Design.
- El lienzo conserva área, posición y zoom al seleccionar o entrar/salir de grupos.
  Las barras contextuales se superponen. El aviso de selección dura cinco segundos
  por apertura del estudio y luego desaparece; no vuelve con cada deselección.
  Editando grupo se alinea a izquierda. EditorHeader comparte geometría de pestañas
  entre Contenido, Interfaz y Publicar. Inicio/Recorrido es un selector segmentado.
- Tipografía UI: escala medida en la pestaña real de Canva por CDP, a petición
  posterior del usuario: controles/cuerpo 14 px con línea 22; títulos de panel y
  sección 14/20; etiquetas del rail 11/16; nombres de biblioteca 12/20; muestras de
  fuentes 16/24. Sustituye el mínimo uniforme anterior de 14 px. El editor debe
  declarar su base de 14 px para evitar heredar los 16 px del navegador. Conservar
  scroll fino y padding real. La tipografía diseñada dentro del tour es independiente.
  Contenido ocupa el ancho disponible; nombres de escenas editables por doble clic
  o lápiz, Enter/guardar/salir confirma y Escape cancela. Los selectores se sincronizan.
- Las barras superior/de cuadros son globales. Solo Usar página de inicio activa
  Inicio. La barra de cuadros tiene representación al diseñar y solo se muestra a
  visitantes en videos con varios cuadros. Título de barra y subtítulo son distintos.
- Grupos y piezas conservan identidad, frames, estilos y enlaces. Las recetas
  anteriores se convierten de manera compatible (`groupMigration`, medición real).
  Las funciones específicas de una receta deben sobrevivir a esa conversión.
- Hotspot Línea guía y tarjeta: arrastrar carta escribe dx/dy; arrastrar punto escribe
  lon/lat o keyframe y mueve el conjunto. Sliders y borrador se sincronizan; PATCH
  por hotspot se serializa. Con configuración abierta no se guarda ningún gesto
  hasta Guardar cambios; cerrar descarta el borrador completo.
- Detalle pertenece al hotspot (`content.detail.version=1`): opcional, dentro de la
  tarjeta al pulsar/siempre, o en pantalla exclusivamente al pulsar, tres recetas y
  editor común de piezas. Parte del acabado
  del marcador. Ventana secundaria arrastrable; Escape cierra la superior. Aplicar
  a tipo/todos copia configuración/enlaces, conserva datos y omite bloqueados en
  transacción. Referencias legacy se resuelven sin escribir al abrir.
- En pantalla solo se admite uno abierto, sin apilado. `screen/always` antiguo se
  interpreta como `screen/click`; guardar normaliza. El cierre permanece accesible;
  solo contenido que desborda genera un scroll fino. Cámara/lienzo no interceptan
  rueda ni flechas de UI. Tarjetas inline se acotan incluso en edición y móvil,
  compensando zoom sin interrumpir el arrastre ni cambiar dx/dy guardados.
- Fuentes: 15 familias variables autoalojadas mediante Fontsource. Dos controles
  compactos en Marca; FontSelector compartido con textos individuales, búsqueda
  fija, categorías, fuentes del diseño y seis recientes por sesión. Los ids previos
  se conservan; una fuente desconocida cae en Inter. Assets y licencias se incluyen
  en app/export, sin depender de Google Fonts/CDN en ejecución.

## Plantillas compartidas y roles

El sistema es de una sola organización; no hay modelo Organization ni separación
por empresas. `super_admin` y `admin` operan todos los tours; solo `super_admin`
escala roles y borra tours/cuentas. Un `member` necesita permiso por tour:
`cliente` y `dev` editan contenido/interfaz; `dev` añade código CSS/JS personalizado.

`DesignTemplate` / tabla `design_templates` es una biblioteca global, independiente
de Tour. Admin/superadmin crean desde Plantillas → Crear nueva plantilla. Cualquier
usuario autenticado consulta la biblioteca; para aplicarla necesita acceso al tour
destino. Esto no otorga acceso a otros tours. No se añadieron edición/borrado de
plantillas ni cambios al modelo de roles.

Guardar toma el diseño ya guardado (flush antes de POST): brand, screens, theme,
hotspotPresets, detailPanel, panels y panelDefaults. No incluye escenas/hotspots,
nadir, panoramas ni idiomas. `showIn` pasa a all; segmentos y destinos goToScene se
eliminan para que no apunten al tour de origen. Avisar que esos botones requieren
configurar destino en el nuevo tour. Los ids internos de grupos/paneles se conservan.

Los archivos `asset:<id>` usados se copian a `uploads/templates/<uuid>/` al crear.
Al aplicar se copian a TourAsset del destino con nuevos ids y se reescriben todas
las referencias. Borrar el archivo/tour de origen no rompe la plantilla. La copia
se aplica con deshacer/rehacer y autosave normal; importar no escribe Design por
su cuenta. Undo conserva los archivos importados en Subidos, igual que una subida.

API: GET /api/templates; POST /api/tours/:tourId/templates {name};
POST /api/tours/:tourId/templates/:templateId/import → {design}. Migración aditiva
`20261019180000_shared_templates` aplicada localmente; otros entornos requieren
`prisma migrate deploy` y `prisma generate`. Respaldar BD y uploads/templates.
Servicio/test backend `designTemplate`; frontend `sharedTemplates` y TemplatesTab.

## Elementos con comportamiento

Contador rotativo y Fila de cifras tienen un botón **Configurar** en su barra,
también al seleccionar una pieza de un grupo convertido. Una a ocho secciones,
cantidad/orden/valores/descripciones editables sin copiar piezas ni separadores.
El contador añade sufijo, sentido por sección (`direction: up|down`), duración de
cuenta, tiempo por sección y progreso. `countMs:0` es instantáneo.

Seleccionar un contador pausa su sección visible y muestra su valor configurado.
Doble clic en la cifra abre su ventana; no debe intentar editar un slot de texto
oculto. La fila estática admite doble clic sobre sus textos y refleja ese cambio
en Configurar. Cambiar cantidad u orden redistribuye sus piezas; editar solo texto
conserva la geometría. Bloqueo y deshacer/rehacer incluyen estructura y datos.

**Regla para nuevos elementos dinámicos:** exponer una configuración semántica
explícita, sencilla y junto al elemento; incluir cantidad/estados, datos y tiempos
que correspondan. Conservarla al componer/agrupar, duplicar, guardar y exportar.
Pausar durante la edición y ofrecer reproducción temporal. No sustituir funciones
por un conjunto de textos sin control. Investigar otras familias antes de extender:
tarjetas/listas ya tienen listas editables, botones tienen acción/destino, carga
responde a progreso real; no añadir contadores de secciones indiscriminadamente.

Las listas de configuración usan campos breves de una línea. Descripción empieza
con la misma altura (38 px) y permite ampliar solo hacia abajo. Cada ítem se
pliega por separado mediante una flecha, conservando un resumen visible y sus
valores. El plegado es estado local del editor y sigue al ítem al reordenar.

## Puntos de entrada y comprobación

- `editor/design/numberSections.js`: resolución semántica y operaciones puras.
- `NumberSectionsWindow.jsx`, `ContextToolbar.jsx`: configuración y aviso temporal.
- `statsCounter.js`, `counterMath.js`: reproducción y cuenta regresiva compartidas.
- `DesignCanvas` → `runtime.setEditorState`: pausa/prueba sin persistir estado UI.
- `PLAN_REFACTOR_DETALLE_HOTSPOT.md`, `CONTRATO_OLEADA3_5.md`: contratos detallados.
- `ESTADO_PROYECTO.md`, `CHECKLIST_OLEADA3_5.md`: evidencia y aceptación pendiente.

Último resultado: 434 pruebas frontend (42 archivos), builds app/runtime correctos;
backend sin cambios en este ajuste (10 pruebas de la entrega anterior). QA visual y
funcional por Chrome CDP en ventana real 1278×697, sin viewport emulado; matriz en
`QA_CDP_OLEADA3_5_2026_10_19.md`. Aviso de bundle >500 kB conocido.
Fixture vigente: tour `9fd5a6ba-01f1-48e6-bfe0-8e415be32c96`; el anterior ae57 ya
no existe en la BD actual. Evidencia ignorada en `backend/exports/qa-oleada35/`.
No modificar tours originales del usuario para probar.

## Escala y ancho de tarjetas/hotspots

Esquinas = escala uniforme de todo; laterales = ancho con reflow y letra intacta.
Contorno morado/círculos/pastillas solo en modo edición; respetar bloqueos/stretch.
Los tamaños se configuran con sliders; no exigir introducir píxeles. Contenido
expone «Tamaño, textos e imagen» y «Editar tarjeta en el lienzo» en el hotspot.
No crear una segunda representación del detalle: controles, piezas y gestos usan
el mismo grupo canónico, conservando bindings, IDs y frames móviles personalizados.

`elementResize.js` comparte escala/reflow en UI; `resizeHotspot.js` adapta hotspots;
`resizeOverlay.js` contiene gesto/selección en Content. `hotspotDetailLayout.js`
y `HotspotDetailLayoutControls.jsx` unen sliders con el modelo. `markerLayer`
conserva selección al reconstruir y separa resize de arrastre de tarjeta/punto.
Con popup abierto se edita borrador hasta Guardar; cerrado se usa cola de guardado.
Escape envía `tour-studio:cancel-active-gesture` antes de cerrar la ventana.

Detalle: `detailFixedHeight` opcional en props del grupo crea un viewport con scroll;
automático elimina el alto fijo. `detailScale/detailGap` escalan espacio exterior.
Marcadores simples persisten `markerScale/markerWidth`; callouts sin detalle usan
`cardScale/cardWidth`. Compatible con JSON v1 existente, sin migración de BD.
Mediciones ResizeObserver se programan en RAF y se cancelan al destruir. Runtime y
export reproducen dimensiones guardadas, sin insertar controles de edición.

## Hotspots compuestos y doble clic — 20 de octubre

Tarjeta del marcador y detalle son superficies distintas del mismo hotspot. El
marcador guarda opcionalmente `content.card` (grupo/piezas v1, host de una lista
cerrada); el detalle conserva `content.detail`. Editar el marcador no debe activar
el detalle, cambiar inline/screen ni revelar contenido que estaba desactivado.
No guardar composición automáticamente por abrirla: es borrador hasta Guardar.

Doble clic nativo en texto/imagen abre HotspotDetailDesigner con la pieza pulsada
seleccionada. Usa el mismo DesignCanvas, herramientas, grupos, inline text, gestos
por pieza y undo/redo de Interfaz. «Editar piezas del marcador» es acceso alterno.
Soporta callout, tarjeta flotante, pastilla, precio y etiquetas visibles; el detalle
inline reutiliza sus piezas existentes. Los marcadores sin texto/tarjeta mantienen
su configuración de icono. Bloqueados no abren edición directa por doble clic.

`hotspotCard.js` captura una vez las medidas locales y roles del marcador antiguo,
conserva enlaces title/price/description/image y estilos tipográficos. La conversión
es lazy; textos como etiqueta/acción son piezas estáticas propias. Render común
`mountDetailContent`/`attachMarkerCard` en detalle/visor/export. Backend valida
`content.card` con los mismos límites de elementos, enlaces y profundidad del detalle.
No hay nueva tabla ni migración. Importante: no usar el target nativo del doble clic
para escoger la pieza: pointer capture lo redirige al wrapper. `pieceAtPoint` busca
la menor caja visible bajo las coordenadas. Se demora 350 ms el clic de configuración
para no destruir el DOM antes del doble clic y se cancelan temporizadores al limpiar.

QA CDP real 1278×697: editar fuente/mover etiqueta, undo/redo, borrador, guardado,
recarga y título inline, sin mover lon/lat ni habilitar detalle. También tarjeta
flotante, pastilla y precio; resize lateral de tarjeta flotante tras convertir.
Export v2 del fixture 9fd conserva composición y tiene cero tiradores. Fixtures
transitorios eliminados; solo se modificó el tour QA. Tras el ensayo se reacomodaron
las piezas del fixture para dejarlo legible. 438 pruebas frontend/43 archivos,
10 backend y ambos builds correctos; aceptación manual pendiente.

## Redimensionado sin saltos de altura — 20 de octubre

Al reconstruir una tarjeta durante resize, el grupo recién renderizado estaba
calculado aún sin conexión al DOM: los textos con alto automático medían cero.
ResizeObserver corregía la altura en otro frame, después de posicionar la tarjeta
y el contorno, generando temblor y una proporción transitoria falsa. En
`mountDetailContent`, medir grupos conectados desde los descendientes al raíz antes
de medir el host. Mantener ResizeObserver para cambios posteriores reales. En
`markerLayer.constrainDetails`, omitir solo el clamp durante arrastre, nunca el sync
del contorno. No fijar una altura artificial ni impedir el reflow de los laterales.

QA CDP con ratón y muestreo RAF: seis tiradores, 519 cuadros a 1278×697. Antes hasta
57 px de diferencia; después cero en left/top/width/height y altura estable cuando
el cursor se detiene. Gestos cancelados con Escape, sin guardar cambios del fixture.
439 pruebas frontend (44 archivos) y builds app/runtime correctos; backend sin
cambios. Regresión en `runtime/hotspots/detailView.test.js`. Evidencia en QA CDP.
Tras cambios en módulos imperativos del runtime hacer recarga completa antes de
probar: HMR puede conservar controladores del motor creados antes del cambio.

## Guardado de hotspots sin parpadeo — 20 de octubre

`markerLayer` ya NO vacía la escena cuando cambia un hotspot. Mantiene registros
por id con objeto CSS2D, clave visual y callbacks que leen los datos actuales.
Reordena/conserva ids presentes, elimina solo los ausentes y reconstruye solo un
id cuya apariencia haya cambiado. Lon/lat, segmentos y metadatos no son apariencia.
No reubicar un objeto desde el documento mientras su gesto sigue activo.

Antes de emitir stylechange/resize, `record.adopt` acepta la geometría ya pintada y
su clave visual. Así la actualización optimista y el eco del servidor conservan
wrapper, contenido, tarjeta, carga de imagen y animaciones. Actualizar referencias
sin conservar closures con el estilo anterior: un segundo gesto parte del último
valor guardado. Al reemplazar por una edición visual real, disponer controladores
del id ANTES de construir los nuevos e insertar el reemplazo en el mismo turno DOM.

`markerVisualKey` ordena claves JSON e ignora ruido de números a seis decimales
SOLO al comparar. JSONB reordena propiedades y puede devolver diferencias de ~1e-13;
no deben disparar otro render. No redondear los datos guardados. La apariencia del
contexto (diseño/assets) se calcula una vez por referencia para evitar serializarla
por cada marcador al recorrer video. Theme/preset/breakpoint/texto sí invalidan.

QA adicional aislado: tour `dc762a5e-36ff-4193-9ce3-db618241ef38`, «QA · Guardado
sin parpadeos», con copia independiente de panorama/imagen y tres hotspots.
Chrome CDP 1278×697, seis casos con guardado HTTP real + recarga, 448 cuadros:
ningún marcador eliminado/recreado ni ocultado al soltar. Tres resizes verifican
que el ancho de BD cambió realmente. Regresión previa del temblor también pasa.
444 pruebas frontend (45 archivos), builds app/runtime correctos; backend sin
cambios. Servicios arriba; API arrancada con `node src/server.js`, SIN --watch,
para que archivos de uploads/exports/QA no reinicien el servidor durante la prueba.
Recargar la página para sustituir controladores que pueda conservar HMR.

## Barra contextual de piezas en el encabezado — 20 de octubre

TourEditorPage mantiene un host DOM estable por ref y lo pasa por EditorViewer /
HotspotTypePopover a HotspotDetailDesigner. Dos portales hermanos comparten los
mismos DraftDesignProvider y StudioProvider: herramientas en el encabezado y
lienzo en la panorámica. No crear un segundo store para la barra. Reserva fija de
80 px, filas 26/44 px, para evitar saltos al seleccionar texto, imagen o conjunto.
Fallback local si no hay host. El contenedor content-studio exige sobreescribir
su min-height y overflow en el dock. Canvas min-width:0 y cajón más compacto bajo
1100 px evitan desbordamientos en ventanas estrechas del editor de piezas.

ContextToolbar comparte controles icónicos con Interfaz: color A, tamaño directo,
B conserva todos los grosores (no es un simple toggle), alineación, Aa, I y U.
Texto/variante van en Más opciones. Breakpoints de contenedor ocultan primero
nombre de fuente y etiquetas secundarias; acciones secundarias también en Más
opciones. FontSelector sigue midiendo 440 px inicialmente. No reducir las fuentes.

QA Chrome CDP con ventanas reales, sin emulación: viewports 1278×697, 1040×697,
884×697 y 764×697. Barra dentro de pantalla y fuera de panorámica; selección de
texto/imagen/conjunto conserva exactamente la caja del viewport en cada tamaño.
Guardado HTTP y recarga en fixture dc762a5e: título Manrope, tamaño20, grosor700,
centrado, cursiva/subrayado. Interfaz: texto temporal tamaño26, derecha, I/U,
Más opciones; eliminado tras probar. 444 pruebas/45 archivos y build app correctos.
Sin cambios backend/runtime por este ajuste; aceptación manual de Oleada3.5 sigue
pendiente. Evidencia detallada en QA_CDP_OLEADA3_5_2026_10_19.md.

## Detalle: vista previa y edición manual — 20 de octubre

Los pop-ups de hotspot/detalle ya no incluyen sliders para tamaños de textos ni
ancho/alto/ajuste de imagen. Esos ajustes se realizan seleccionando las piezas en
el editor compartido. El desplegable restante se llama «Tamaño de tarjeta» y solo
conserva geometría del conjunto y acomodado automático.

«Detalle del hotspot» muestra una vista previa del borrador desde que se abre,
con acceso directo «Editar piezas». HotspotDetailPreview reutiliza
mountDetailContent/getTemplate, datos enlazados, tema, fuentes y assets del tour.
No guardar capturas ni inventar un render paralelo. Ajusta ambas dimensiones al
recuadro para mostrar detalles altos completos sin un scroll adicional. Cambiar
plantilla o contenido visible actualiza la muestra; el guardado sigue en la
ventana principal y cerrar conserva la semántica de descartar el borrador.

QA CDP real en fixture dc762a5e: imagen cargada, cambios de plantilla, ocultar y
mostrar título, colocación en pantalla, acceso al editor; sliders retirados en
ambos pop-ups. Viewports 1278×697 y 1040×697, capturas revisadas y sin errores JS.
La prueba se descartó sin guardar cambios en el tour.

## Escalado gradual y tiradores sin superposición — 20 de octubre

Reproducido por CDP: texto16.68 →24.055 con solo3px de movimiento diagonal.
El escalado proporcional tomaba el mayor cambio RELATIVO entre ancho y alto;
en una línea ancha/baja amplificaba cualquier desviación vertical. Ahora
proportionalScale (runtime/model/elementResize.js) proyecta el desplazamiento
sobre la diagonal inicial: 1+(w*dx+h*dy)/(w²+h²). La usan resizeRect del lienzo
y hotspotResizeBox del panorama. Mantener signos según esquina, Alt desde centro,
mínimos y relación de aspecto. Laterales siguen cambiando solo ancho.

Segundo fallo: zonas de clic24×24 de esquinas y laterales se solapaban en textos
bajos (también imágenes pequeñas/zoom reducido), por lo que la barrita podía
activar una esquina. SelectionOverlay limita cada área a la mitad del ancho/alto
visible y sus símbolos no interceptan eventos fuera del área. No aumentar estas
zonas sin comprobar líneas pequeñas. El gesto parte siempre del rect inicial.

QA CDP real1278×697: 6 casos en piezas de hotspot (texto explícito16.68 e imagen)
y12 en Interfaz (texto automático, explícito a125% y25%, e imagen). Cada uno:
esquina, lateral, mover; muestras3/4/6/12/20px y Escape restaura el tamaño.
Barrita e comprobada por elementFromPoint a25%. Fontsize constante en mover y
lateral; cambio gradual acorde al rect en esquinas. Activos/textos temporales de
Interfaz eliminados; borrador hotspot descartado. 447tests/45archivos, builds
app/runtime correctos. Backend sin cambios. No es necesario revisar Canva para
este fallo matemático reproducido localmente. Recargar para tomar los cambios.

## Tiradores del contenedor al editar piezas — 20 de octubre

HotspotDetailDesigner activa showGroupHandles en DesignCanvas para ambas
superficies: marcador y detalle. SelectionOverlay presenta ocho tiradores del
grupo activo junto a los de su pieza seleccionada; data-group-handle los separa
de data-handle. El borde del grupo queda alineado con sus tiradores. No activar
este comportamiento globalmente en Interfaz sin evaluar su navegación de grupos.

useCanvasPointer.startResize acepta un targetId opcional. Obtiene el contexto
geométrico del padre del objetivo, no el del grupo que se está editando. Conserva
activeGroupId y la selección de la pieza durante el gesto. No simular salir del
grupo/seleccionar el contenedor para redimensionarlo: perdería el contexto y el
historial de selección. Los tiradores de la pieza se ocultan solo durante el
resize del contenedor para evitar controles competidores.

Esquinas escalan el conjunto; e/w reacomodan el ancho sin cambiar fuente; n/s
ajustan el viewport del grupo sin modificar piezas. resizeGroupHeight conserva
hijos y fija frame.h, autoFit:false, detailFixedHeight:true y contentHeight:0.
Esto evita que la medición natural deshaga el alto manual y permite al visor
respetar el alto fijo. Deshacer/rehacer y Escape usan el gesto compartido.

QA Chrome CDP real 1278×697: resize n/s/e/w/se con imagen seleccionada, ocho
controles exteriores y ocho interiores; letra sin cambios en ajustes de alto/ancho,
selección conservada, undo/redo/cancel correctos. Guardado HTTP de alto225 y
recarga exacta, ocho controles reaparecen. Verificado para Info, Precio y Navegación
y editor del marcador sin detalle; borradores descartados y fixture restaurado
tras validar persistencia. 448 tests/45 archivos, builds app/runtime correctos.


## Imagen ausente al reactivar detalle — corrección del21 de octubre

No confundir archivo perdido con superficie no montada. La optimización incremental
`markerLayer` debe comprobar que existan los controllers requeridos por la nueva
configuración; omitir un controller ausente no equivale a actualizarlo. Cambiar
`enabled` o `placement` puede requerir reconstruir solo ese marcador. Comprobar
también el caso de clave ya adoptada con superficie ausente.

Al editar una tarjeta cuyo detalle inline es siempre visible, resolver la selección
hacia el detalle (`visibleHotspotSurface`); el resumen oculto no es una superficie
editable visible. No sustituir su composición ni copiarle arbitrariamente la imagen.
QA CDP de toggles/ubicación/reapertura/recarga con comparación del content completo,
y comprobación de nodos de otros hotspots.461 pruebas/46 archivos y ambos builds
correctos. La aceptación457 anterior no cubría esta secuencia; ver informe ampliado.
