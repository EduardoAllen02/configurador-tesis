# Estado del proyecto — 20 de octubre de 2026

> Añadido — 21 de octubre: menú contextual opcional y configurable por tour,
> con pantalla completa, restablecer vista, enlaces y crédito Created by.
> Disponible en Contenido → Ajustes del recorrido. Ver
> [configuración, arquitectura y QA](MENU_CONTEXTUAL_TOUR.md).
> 486 pruebas frontend y 12 backend; app/runtime compilados y export v4 verificado en CDP.

> Actualización vigente — 21 de octubre: auditoría estructural y refactor de
> presentación/estado de hotspots implementados. Ver
> [decisiones y evidencia](AUDITORIA_HOTSPOTS_2026_10_21.md).476 pruebas frontend,
>10 backend; Chrome CDP, matriz12 casos, secuencia y export comparados.
> La aceptación manual de Oleada3.5 sigue pendiente.
>
> Implementación anterior — 21 de octubre: editor de hotspots unificado implementado
> localmente y verificado por Chrome CDP. Una panorámica, inspector único,
> persistencia al soltar, herramientas dentro de la vista y biblioteca ajustable.
> Ver [QA del refactor](QA_CDP_EDITOR_UNIFICADO_2026_10_21.md) y
> [contexto para agentes](CONTEXTO_PARA_AGENTES.md). Las notas de planificación
> y de borradores descartables de este archivo son históricas. Sin commit/push.


Rama comercial Andrea/Interiors3D, repositorio `tour-studio-web`, rama Git `master`.
Oleadas 0–3 integradas. Oleada 3.5 (A, B y C) implementada y pendiente de la
aceptación manual de Edd. Incluye el refactor del detalle por hotspot del 19 de
octubre. La Oleada 4 no se ha iniciado. No se ha hecho push.

## Histórico: refactor prioritario en diseño

Se reportaron discrepancias entre edición/visor, cambios descartados al cerrar y
entradas que abren marcador o detalle de forma ambigua. Se analizó la arquitectura;
la aceptación sigue pendiente. Plan: [editor unificado de hotspots](PLAN_EDITOR_HOTSPOTS_UNIFICADO.md).
Un lienzo/runtime, inspector único y commits automáticos al finalizar gestos.
Este turno documenta análisis y diseño; todavía no implementa el refactor.

## Entrega 3.5

Contexto vigente resumido en [CONTEXTO_PARA_AGENTES.md](CONTEXTO_PARA_AGENTES.md).

Último ajuste: tiradores del contenedor exterior visibles mientras se editan sus
piezas, para marcador y detalle de hotspots. Altura manual sin escalar piezas,
ancho y esquinas con los gestos compartidos. CDP real: cinco gestos, undo/redo,
Escape, guardado/recarga y controles en Info/Precio/Navegación. 448 pruebas y
builds app/runtime correctos. Oleada3.5 continúa pendiente de aceptación manual.


Último ajuste: corregido el salto de tamaño al arrastrar esquinas y el solapamiento
de sus zonas de clic con los laterales. Regla compartida por piezas de hotspots,
Interfaz y tarjeta del panorama. CDP real:18 casos en texto automático/explícito e
imágenes; esquinas, laterales y mover, con zoom125%/25%. 447pruebas/45archivos y
builds app/runtime correctos. No cambia la aceptación pendiente de Oleada3.5.


Último ajuste: sliders de tamaños de texto/imagen retirados de los pop-ups de
hotspots, edición manual por piezas. El pop-up del detalle ahora presenta una
vista previa viva, escalada completa sin scroll anidado. QA CDP real en dos anchos,
cambios de plantilla/contenido e imagen verificados, sin errores JS.


Último ajuste: barra contextual del editor de piezas de hotspots en el encabezado,
fuera de la panorámica y con espacio reservado. Controles de texto icónicos
compartidos con Interfaz y alineación rápida. QA CDP en cuatro ventanas reales
(1278, 1040, 884 y 764 px de viewport): controles dentro de pantalla, selección sin
mover el lienzo, guardado/recarga verificados en fixture propio. 444 pruebas y build
app correctos. No cambia la aceptación pendiente de Oleada3.5.


Último ajuste: corregido el parpadeo al soltar movimientos y resizes. Marcadores
reconciliados por id y confirmación del gesto sin reconstruir nodos. QA CDP real:
seis casos de guardado/recarga, 448 cuadros y los tres hotspots siempre visibles,
con identidad DOM conservada. Se mantiene la corrección anterior del temblor.
**444 pruebas frontend (45 archivos), builds app/runtime correctos.** Backend sin
cambios; servicio local sin --watch para evitar reinicios por archivos de prueba.
Fixture adicional `dc762a5e-36ff-4193-9ce3-db618241ef38` con archivos independientes.

Último ajuste: corregido el temblor al redimensionar hotspots. La altura del grupo
se mide conectado antes de posicionar tarjeta y selección; el contorno se sincroniza
incluso durante el gesto. QA CDP: seis tiradores y 519 cuadros, sin diferencias entre
caja y tarjeta ni oscilación al dejar quieto el ratón. Gestos cancelados sin guardar.
**439 pruebas frontend (44 archivos), builds app/runtime correctos.** Backend sin
cambios. Recargar la página para tomar el runtime actualizado.

Último ajuste: los textos e imágenes de hotspots ya se editan por piezas mediante
doble clic y el mismo lienzo/herramientas de Interfaz. La composición del marcador
se guarda aparte de su detalle opcional; editar una tarjeta sin detalle no lo activa.
Verificados tipografía, arrastre, inline text, undo/redo, borrador, guardado/recarga,
otros estilos con texto y export v2 en Chrome CDP real a 1278×697.
**438 pruebas frontend (43 archivos), 10 backend y builds app/runtime correctos.**
La documentación QA registra evidencia y límites. Servicios locales levantados.

Último ajuste: redimensionado directo con cuatro esquinas para escala proporcional
y laterales para ancho sin cambiar letra, en tarjetas UI y hotspots de Contenido.
Tamaños mediante sliders; sección «Tamaño, textos e imagen» y acceso directo al
editor de piezas del detalle. Alto automático/fijo, borrador y Escape coherentes.
Verificado con gestos reales por Chrome CDP a 1278×697, guardado/recarga y export.
**434 pruebas frontend (42 archivos), builds app/runtime correctos.** Detalles y
capturas en [QA CDP](QA_CDP_OLEADA3_5_2026_10_19.md#tiradores-sliders-y-tamaño-del-detalle--revisión-final).

Ajuste tipográfico posterior: comparación directa con Canva abierto en CDP.
Base del editor y cabecera a 14 px (antes heredaban 16), títulos de panel a 14,
etiquetas laterales a 11 y nombres de biblioteca a 12. Muestras de fuentes a 16,
como el render del catálogo de Canva. Interlineados 22/20/16/24 por función.
Ventana de fuentes conserva 440 px y no cambia la tipografía diseñada del tour.
Build app correcto y comprobación visual en Chrome; evidencia en la matriz QA.

Último ajuste: ventanas redimensionables con tirador (ancho inicial de 440 px,
también en fuentes; estrechamiento revertido a petición del usuario), cabecera sin mínimo de 1100 px y controles que se envuelven
al estrechar Chrome. Biblioteca común de plantillas persistida en BD, con copias
independientes de archivos, importación entre tours y deshacer/rehacer. Admin y
superadmin crean; usuarios con permiso en el destino aplican. Migración aditiva
`20261019180000_shared_templates` aplicada localmente. **425 pruebas frontend y
10 backend; build app correcto.** QA CDP con ventana real, sin viewport emulado:
896×800, 1040×800, 1280×800 y 1366×864 en las tres secciones, sin recorte ni overflow.
Ver [evidencia y límites](QA_CDP_OLEADA3_5_2026_10_19.md#ventanas-reales-redimensionado-y-biblioteca-compartida).

Ajuste anterior: cabecera común Contenido/Interfaz/Publicar, Inicio/Recorrido segmentado,
indicador de grupo a izquierda, catálogo compacto/buscable de 15 fuentes y detalle
esquinado exclusivamente al pulsar, uno abierto a la vez. Corregidos scrolls falsos,
captura de rueda por la cámara, cierre fuera de la tarjeta y recorte de inline en móvil.
**422 pruebas frontend, 7 backend, builds app/runtime correctos.** QA visual/funcional
en Chrome CDP a 1366×768; [matriz y evidencia](QA_CDP_OLEADA3_5_2026_10_19.md).

Ajuste anterior: listas de opciones con ítems plegables y resumen visible; Sufijo
y demás campos breves en una línea, Descripción a 38 px y ampliable verticalmente.
También se compactó Descripción en Configurar contador/cifras. Verificados en
navegador el plegado sin pérdida de datos, el reordenado y el arrastre del tamaño.
Frontend: 415 pruebas y compilación correctas; evidencia
`backend/exports/qa-oleada35/compact-counter-items.png` (ignorada por Git).

- A: ventana flotante recuperable sobre todo el editor; iconos con categorías;
  fondo automático distinto de transparente; acabado cristal/borde/sombra;
  temas que preservan elementos y estilos manuales; aplicar a uno o a todos;
  ejemplo completo como acción separada confirmada; progreso real de carga.
- B: grupos y piezas de texto/icono/forma/imagen, edición de hijos, arrastre y
  tamaño relativo, tipografía ampliada, Ctrl+G/desagrupar, capas en árbol,
  portapapeles recursivo, conversión compatible y escalado conjunto en móvil.
- C: Interfaz con Inicio/Recorrido/Paneles, interruptor de Inicio, `showIn`,
  elementos 2D en Contenido y paneles reutilizables con datos de cada hotspot.
- Backend: admite `theme`, `panels` y `panelDefaults` en Design v1 sin migración
  destructiva. Hay pruebas de compatibilidad y de límites del documento.
- Revisión: barra de texto en varias filas, tokens compartidos en Contenido,
  acceso directo a iconos dentro de subgrupos, medición de tarjetas anteriores
  antes de convertir y guardado pendiente completado antes de abrir Vista previa.

## Legibilidad y nombres de escenas — 19 de octubre

- Contenido permite renombrar panorámicas con doble clic en el nombre o mediante
  el lápiz. Enter, el botón de guardar o salir del campo confirman; Escape y Cancelar
  descartan. Hay estado de guardado y error. Nombre vacío recupera el identificador
  automático. El nombre del video se edita desde su tarjeta y se guarda en su primer
  cuadro, igual que la etiqueta del selector del runtime.
- Renombrar actualiza las opciones del hotspot, ajustes de calidad por escena y
  documento de Contenido 2D sin recargar la página. El rail tiene 240 px, nombres
  en dos líneas, acciones accesibles y edición del campo a todo el ancho de la tarjeta.
- Base mínima de texto UI de 14 px (`--ui-font-size`) propagada por Contenido,
  Interfaz, ventanas, biblioteca, Marca, línea de tiempo, ajustes y Publicar; también
  ayudas de acceso y listado de tours. Las miniaturas y textos del tour conservan
  su diseño propio. Se mejoró el contraste de etiquetas secundarias del configurador.
- Apariencia usa padding 16×20 px y permite envolver texto/botón. Se ampliaron
  campos, etiquetas de biblioteca y separación de etiquetas/controles. La ayuda
  superpuesta del panorama puede partirse en líneas en espacios estrechos.

Verificación: 404 pruebas frontend y build aprobados. Capturas revisadas en navegador
de Contenido, ajustes inferiores, Marca/biblioteca, ventana del hotspot, video y
Publicar; sin desbordamiento horizontal en la página de Contenido. Auditoría DOM
de etiquetas visibles del estudio sin textos de UI menores de 14 px. Renombrado
comprobado con doble clic, lápiz, Enter, Cancelar, guardado, recarga y sincronización
del selector de calidad; nombre de video probado y restaurado en el tour QA.
Evidencia local en `backend/exports/qa-oleada35/ui-spacing-content.png`,
`ui-readability-interface.png` y `ui-scene-rename.png`.
La revisión se asignó al subagente solicitado, que no pudo arrancar por límite de
uso; el agente principal completó la inspección visual y los ajustes.

## Configuración de cifras y aviso temporal — 19 de octubre

- El aviso de selección desaparece a los cinco segundos de abrir el estudio.
- Contador y Fila de cifras exponen Configurar desde su selección, incluidas piezas
  de recetas convertidas y tarjetas contenedoras. Cantidad de una a ocho, valores,
  descripción y orden; el contador añade sufijo, dirección por sección, tiempos en
  segundos e indicadores. Las altas/bajas de la fila reorganizan sus separadores.
- Selección pausa el contador en la sección visible. Doble clic en la cifra abre
  su configuración en esa sección, evitando editar el heading oculto. Prueba de
  reproducción temporal; ni selección ni índice/pausa se guardan en el documento.
- La fila conserva edición de texto en el lienzo sincronizada con su configuración;
  los cambios de texto no alteran frames/estilos. Operaciones estructurales respetan
  identidades/estilos, bloqueo y deshacer/rehacer. Duración cero ya es instantánea.
- Revisadas otras familias: tarjetas/listas usan sus piezas/listas; botones tienen
  acción; el indicador de carga usa progreso real. La ampliación estructural de esta
  entrega se aplica a las dos familias de cifras. El criterio para futuras familias
  dinámicas queda en el contexto condensado.

Verificación: **415 pruebas frontend, 36 archivos**, builds app/runtime correctos.
Navegador: cuarta sección, límite ocho, cuenta regresiva 9→0, pausa/prueba,
doble clic sin editor vacío y texto de fila 24→25 reflejado en Configurar.
Export IIFE y módulo comprobados con una cuenta regresiva aislada que termina en
cero en ambos; la pausa de editor no viaja al export. El aviso desaparece al vencer
su tiempo. La revisión manual del usuario sigue pendiente. Captura: `counter-sections.png`
en la carpeta QA local.

## Detalle integrado al hotspot — 19 de octubre

- Contenido → configurar hotspot → Detalle es la ruta de edición. Ventana secundaria
  arrastrable con posición propia y cierre por Escape sin cerrar la principal.
- Detalle opcional; en el hotspot admite Al pulsar/Siempre visible, en pantalla solo Al pulsar.
  La tarjeta con línea se expande con imagen y descripción; los iconos sin tarjeta
  reciben una tarjeta asociada. Los detalles esquinados se reemplazan, sin apilado.
- Tres recetas de grupo: Imagen y texto, Ficha de producto y Texto sencillo.
  Reutilizan el editor de piezas y sus operaciones de texto, color, posición,
  tamaño y deshacer. El acabado parte del marcador y permite ajustes explícitos.
- Borrador único: contenido, detalle, posición y distancias de tarjeta se confirman
  con Guardar cambios. Cerrar sin guardar los descarta. Fuera de configuración,
  los gestos de marcador mantienen su guardado inmediato.
- Aplicar a este/tipo/todos copia únicamente detalle/composición/enlaces en una
  transacción; conserva datos, imágenes y coordenadas de destino y omite bloqueados.
- Navegación nace sin detalle; al habilitarlo, Entrar realiza el salto explícito.
  Paneles anteriores compatibles, sin migración de columnas ni cambio visual al abrir.

Verificado: **404 pruebas frontend (35 archivos), 6 backend**, builds app/runtime
correctos. API local: lote atómico, datos propios, bloqueados e inválidos. Navegador:
cuatro modos, imágenes, guardar/recargar, cancelación, ventanas, pieza/deshacer y
resize. App módulo/IIFE comparados a 390×844, 1024×768 y 1440×900; salida del segmento
de video y navegación Entrar funcionan en ambos. Persiste el aviso de bundle >500 kB.

Tour aislado para probar: **Prueba Detalle Hotspot — Refactor**,
`ae57f69c-2055-48a5-8823-3f666c6e53ff`, con panorámicas, imágenes propias y video de
dos cuadros. Export: `backend/exports/qa-oleada35/detail-refactor-export/`.
Código y documentación permanecen como cambios locales revisables, sin commit/push
de esta revisión. Los checks manuales siguen reservados para Edd.

## Verificación técnica anterior

### Correcciones de aceptación del 19 de octubre

- Línea guía y tarjeta: el tamaño del anillo y el punto responde a Tamaño. Arrastrar
  la tarjeta cambia `style.props.dx/dy` y actualiza la línea sin cambiar lon/lat;
  arrastrar el punto mueve todo conservando esas distancias. Se respetan bloqueo,
  escala del lienzo y cancelación del gesto. El arrastre guarda solo el estilo de
  ese hotspot y conserva el resto de sus propiedades.
- Contenido usa el ancho disponible, con escenas y biblioteca a la izquierda y
  controles superpuestos en el lienzo. Se eliminaron los márgenes exteriores amplios.
- Configuración de hotspots y Más opciones comparten una ventana de 440×560,
  arrastrable por el título, no modal, con posición de sesión. Las etiquetas de
  configuración se aumentaron a 14 px; las barras de scroll en Chromium son de
  5 px y mantienen rueda y arrastre. Firefox usa su variante fina nativa.
- El título de la barra superior tiene su propio slot editable. Vacío hereda el
  nombre del tour; un título personalizado cambia la barra sin renombrar el tour.
  El texto original se oculta correctamente durante la edición en el lienzo.
- Solo «Usar página de inicio» activa Inicio. Se eliminó el duplicado «Mostrar a
  los visitantes»; «Entrar solo al terminar» controla otra cosa: la entrada automática.
- Las barras superior y de cuadros son globales: ignoran filtros `showIn` antiguos
  y ya no ofrecen selección por escena. En el editor la barra de cuadros tiene una
  representación visible; en visor/export solo aparece en videos con varios cuadros.
- La primera revisión ofrecía paneles independientes desde Interfaz. Ese flujo fue
  sustituido por el detalle propio descrito arriba; sus documentos se mantienen compatibles.

Verificación de esta revisión: **391 pruebas frontend (33 archivos), 3 backend,
build de app y build de runtime aprobados**. En navegador a 1280×720: arrastre de
tarjeta y punto, persistencia tras recarga, tamaño de punto de 38 a 100, ventana
movida al lado izquierdo, etiquetas de 14 px, scrollbar de 5 px, edición y deshacer
del título, acceso al panel desde el hotspot, creación/deshacer de panel por tipo,
un único interruptor de Inicio y Contenido 2D sin desbordamiento horizontal.
Las pruebas de esta revisión no sustituyen la aceptación manual de Edd.

Segunda corrección del mismo día: con la configuración abierta, arrastrar la tarjeta
actualiza también su borrador y los sliders dx/dy antes de pintar. El movimiento
posterior del punto y Guardar ya no reaplican las distancias antiguas. Los PATCH se
ordenan por hotspot, con actualización local inmediata y descarte de respuestas
anteriores al último gesto pendiente. El selector añade «Tipo», botones de 36 px e
iconos de 20 px. Verificado con tarjeta a derecha/izquierda, luego punto, guardado
y recarga; pruebas frontend actualizadas: **394 en 34 archivos**, build correcto.

Corrección durante la aceptación 3.5: la barra contextual, el aviso de edición
de grupo y el selector de datos del hotspot se superponen sobre el lienzo en
Interfaz y Contenido. Seleccionar texto, entrar en un grupo y salir de él ya no
cambia el área disponible, la posición ni el zoom de la mesa. Verificado en
navegador comparando los rectángulos de viewport, stage y board antes y después.

Resultado del 18 de octubre:

| Comprobación | Resultado |
|---|---|
| Frontend `npm test` | 386 pruebas, 32 archivos, aprobadas |
| Backend `npm test` | 3 pruebas aprobadas |
| `npm run build` | Correcto |
| `npm run build:runtime` | Correcto |
| `npx prisma migrate status` | 5 migraciones al día |
| `scripts/smoke-test.sh` | Correcto; auth, permisos, documento, diseño y export |
| Motor módulo vs IIFE, 1440×900 | Geometría de 11 elementos idéntica |
| Motor módulo vs IIFE, 1024×768 | Geometría de 11 elementos idéntica |
| Motor módulo vs IIFE, 390×844 | Geometría de 11 elementos idéntica |

Las compilaciones mantienen el aviso de tamaño de bundle (>500 kB); no impide
compilar. La comparación usa contenedores con esas dimensiones y animaciones
desactivadas para comparar geometría estable, no una certificación de todos los
flujos en dispositivos físicos.

## Pruebas realizadas en navegador

- Abrir/arrastrar/cerrar Más opciones por encima de las barras del editor.
- Aplicar Minimal claro, guardar y recargar conservando los elementos.
- Entrar a una tarjeta, mover una etiqueta y editarla directamente.
- Abrir iconos con un clic dentro de una tarjeta y filtrar Casa e interiores.
- Crear Ficha de producto, posicionarla y verla como hoja inferior en Móvil.
- Abrir la misma ficha desde hotspots Info y Precio: cambia título/descripción/precio.
- Crear texto desde Contenido: queda solo en Sala 1 y desaparece en Sala 2.
- Arrastrar el vacío en Contenido gira la cámara sin mover la interfaz.
- Descarga WebP limitada: porcentaje real, Entrar deshabilitado durante la carga
  y habilitado al completar. Se retiró el temporizador que fingía estar listo.
- Export del tour de revisión generado y abierto con sus imágenes y grupos.
- Comparación de tarjetas legacy y convertidas: la medición real corrige las
  diferencias de saltos de línea; pueden quedar diferencias de redondeo de 1 px.

## Datos y evidencia local

Tour creado para esta entrega: **Prueba Oleada 3.5**,
`f3d61ccf-30d1-419f-b43b-1c001ff77b74`, con dos panorámicas copiadas a sus propias
rutas, dos hotspots, tarjetas editables y una ficha reutilizable. Se ordenó su
diseño de demostración después de las pruebas. Los tours anteriores no se editaron.

- Editor: `/tours/f3d61ccf-30d1-419f-b43b-1c001ff77b74/design`.
- Export final: `backend/exports/f3d61ccf-30d1-419f-b43b-1c001ff77b74/v2/`.
- Capturas y resultados: `backend/exports/qa-oleada35/` (datos ignorados por Git).

Los tres worktrees `wave35-a1`, `wave35-a2` y `wave35-c` quedaron conservados:
la revisión automática bloqueó su eliminación. Sus commits están integrados en
`master`; las correcciones posteriores sí permanecen pendientes en el árbol principal.

## Revisión pendiente de Edd

Usar [CHECKLIST_OLEADA3_5.md](CHECKLIST_OLEADA3_5.md). Los checks de aceptación
siguen sin marcar. Conviene dar especial atención a textos largos y diseños
legacy con fuentes/tamaños poco habituales, gestos de agrupar/desagrupar y ajustes
móviles propios. La carga AVIF por mosaicos y la entrada automática están
implementadas, pero no se certificó en navegador una panorámica AVIF real con
red lenta durante esta entrega.

El tour de demostración anterior ya tenía dos imágenes ausentes; no se reparó
ni se modificó ese dato ajeno a 3.5. La bifurcación de tesis sigue pendiente de
decisión. Tras la aceptación de Edd continúa la Oleada 4: pisos, traducciones,
piloto automático, cámara por escena, video 360 y recreación Colombini.
