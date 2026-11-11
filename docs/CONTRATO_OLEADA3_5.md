# Contrato Oleada 3.5 — Interfaz y elementos compuestos

Fecha inicial: 2026-10-17. Revisión: 2026-10-19. Base: `b71059b` (Oleada 3).
Estado: rondas A, B y C implementadas; pendiente de aceptación manual de Edd.

El objetivo autorizado es completar las rondas A, B y C y entregar una checklist de
aceptación manual. La Oleada 4 espera la revisión de Edd. No se publica ni se hace push.

## Datos compatibles

Se conserva `design.version: 1` y se añaden `theme`, `panels` y `panelDefaults` al
validador del backend. Los diseños anteriores siguen abriendo.

- `design.theme = { id, tokens, styles }`: tokens de superficie, cristal, borde,
  sombra, textos, acento, esquinas y fuentes; estilos por rol. Un estilo automático
  toma el tema. `rgba(0,0,0,0)` es transparencia explícita.
- `Element.showIn = "all" | string[]`: ausencia equivale a todas las escenas.
  Un video es una entrada del selector; se guardan los ids de sus escenas.
  Las barras `basic-topbar` y `frame-scrubber` son globales y omiten este filtro.
- `Element.template = "group"`, `Element.children = Element[]`. Los frames de los
  hijos son relativos a la caja del grupo, con ancla superior izquierda. Se permite
  un grupo hijo dentro de un grupo raíz. En móvil se escala el conjunto completo.
- Cada pieza tiene id global único y estable. Las operaciones aceptan también
  rutas `parentId/childId`. Las cajas exponen `id`, `parentId`, `path` y escala
  acumulada; el DOM usa `data-el-id` y `data-el-path`. Duplicar un grupo renueva
  también los ids de sus descendientes.
- Las tarjetas anteriores se convierten mediante una función pura al cargar el
  editor. El editor mide su render anterior con las fuentes cargadas y aporta
  métricas a la conversión pura para respetar los saltos de línea. El runtime
  conserva las plantillas anteriores para compatibilidad.
- `design.panels[]`: paneles reutilizables editados con los mismos elementos.
  Los campos enlazables usan `bind: "title" | "description" | "price" | "image"`.
  Compatibilidad: `content.panelId`, `design.panelDefaults` y `detailPanel` conservan
  su render anterior. El flujo nuevo usa el detalle propio siguiente.

### Detalle propio del hotspot

`hotspot.content.detail = { version: 1, enabled, placement: "inline"|"screen",
reveal: "click"|"always", template, inheritAppearance, fields, position, elements }`.
`fields` controla título/imagen/descripción/precio; las piezas enlazan los valores
del hotspot mediante `bind`. `position` tiene variantes desktop/mobile; la posición
manual usa el frame del grupo raíz. No se cambia el schema de Prisma.

Las recetas crean grupos con piezas, ids nuevos y distribución automática inicial.
Al editar manualmente, `detailAutoLayout` se desactiva. El acabado se resuelve desde
el marcador; overrides del grupo/piezas se conservan, también al cambiar de receta.
En inline el grupo no dibuja un segundo fondo: su acabado se aplica a toda la carta.
El punto y la línea conservan su unión; dx/dy siguen siendo distancia del marcador.

Configuración en Contenido, ventana secundaria Detalle del hotspot y editor común
de piezas. Un borrador confirma contenido, estilo y posiciones conjuntamente. Escape
cierra la ventana superior; cancelar la principal descarta el borrador. Los gestos
fuera del popover siguen guardándose de inmediato.

POST/PATCH de hotspot aceptan `detailApplyTo: "this"|"type"|"all"`. El lote incluye
el hotspot actual y destinos en una transacción, omite destinatarios bloqueados,
renueva ids y conserva el resto de su contenido, imagen, datos y coordenadas.
Validación: versión/comportamiento, enlaces permitidos, máximo 50 raíces, 150 nodos,
profundidad 2 y 256 KiB. La lectura no migra ni escribe documentos antiguos; guardar
conserva instantánea `legacy`/`legacyPanel` hasta editar composición/apariencia.

Navegación: detalle apagado por defecto; activado ofrece Entrar dentro del detalle.
Siempre visible solo existe dentro de la tarjeta y sigue la presencia del marcador
en escena/segmento. Los detalles en pantalla abren al pulsar, uno a la vez; abrir
otro reemplaza al anterior. Leer screen/always antiguo equivale a screen/click sin
alterar contenido/composición; guardar normaliza reveal. Sin apilado ni scroll de
contenedores. Solo un detalle realmente largo desplaza su contenido, conservando
visible el cierre. Cámara y lienzo no capturan rueda/flechas de estos controles.
El runtime compartido sirve app, preview y export IIFE.

## Ronda A

- Más opciones: ventana única en portal de body, fija, arrastrable, con scroll,
  cierre X/Escape y posición de sesión. Al menos 48 px del título recuperables.
  Configuración de hotspots comparte esta ventana; tamaño actual 440×560.
  Etiquetas de configuración de 14 px y scroll de 5 px en Chromium.
- Selector de iconos compartido con búsqueda y categorías.
- Fondo automático y transparente distinguibles. Acabado cristal configurable.
- Las plantillas cambian estilos sin reemplazar ni desplazar elementos. Aplicar a
  uno solo modifica su estilo. Empezar desde ejemplo es una acción separada y
  confirmada, con deshacer.
- El motor emite `loadprogress { sceneId, loaded, total }`. Total desconocido = 0.
  En WebP se cuentan bytes descargados; en mosaicos se mide la base y los mosaicos
  necesarios para la vista inicial, sin descargar toda la esfera solo por la barra.
  Inicio espera la carga real; no se marca listo por temporizador. Puede entrar
  automáticamente al terminar. En Recorrido el indicador se oculta al completar.

## Ronda B

- Texto, icono, forma e imagen independientes dentro de grupos; tipografía ampliada.
- Doble clic entra en grupo, Escape sale; mover/redimensionar hijos en coordenadas
  locales. Ctrl+G / Ctrl+Shift+G. Capas muestra jerarquía.
- Biblioteca y ejemplos nuevos usan grupos. Ajustar al contenido crece la caja.
- Mismo render recursivo para editor, visor y export.

## Ronda C

- Diseño pasa a llamarse Interfaz. Selector visible: Página de inicio, Recorrido,
  Paneles. Interruptor para activar Inicio.
- Mostrar en filtra los elementos según la escena activa.
  Las barras no ofrecen esta opción. La barra de cuadros se muestra como referencia
  en el editor, aunque la escena sea una panorámica; el visitante solo la ve en videos.
- Contenido comparte biblioteca, barra y selección para su capa 2D. Agregar ahí
  asigna la escena activa; el vacío sigue permitiendo girar el panorama.
- Paneles reutilizables con cierre, posición y enlaces a datos de cada hotspot.
  Conservados para compatibilidad. El detalle nuevo se configura y edita desde
  cada hotspot en Contenido; Interfaz → Hotspots conserva presets de marcadores.

## Ajustes de interacción durante la aceptación

- Elementos con comportamiento conservan su configuración semántica al convertirse
  en grupos. Contador/Fila de cifras tienen Configurar con 1–8 secciones; resolver
  desde la pieza, grupo o tarjeta contenedora (`numberSections.js`). La fila conserva
  sus textos como piezas, el contador su hoja funcional. Cambiar cantidad/orden
  redistribuye la fila; modificar contenido conserva frames. Cada operación participa
  de deshacer/rehacer y respeta bloqueo. Aplicar este patrón a futuras familias dinámicas.
- Selección y prueba de contador viajan por `runtime.setEditorState`, solo en diseño.
  Se pausa la sección visible; doble clic abre su configuración y no un slot oculto.
  `items[].direction = up|down` es comportamiento persistido; `countMs:0` es válido.
  Índice, pausa y prueba no se persisten ni cambian el comportamiento de visitantes.
- El aviso de selección dura cinco segundos por apertura; ocultarlo no cambia la
  geometría del lienzo ni vuelve a mostrarse al deseleccionar.

- La tipografía del configurador sigue la escala de Canva medida por CDP: 14 px
  para controles/cuerpo/títulos de sección, 11 px para etiquetas del rail, 12 px
  para nombres de biblioteca y 16 px para muestras de fuentes. Esta petición
  posterior sustituye el mínimo uniforme de 14 px; no cambia los textos del tour.
- Los nombres del rail de Contenido se editan con doble clic o lápiz: Enter/guardar/
  salir confirma, Escape cancela. La API PATCH de escenas existente conserva el
  nombre; los cuadros de un video toman como etiqueta el nombre del primero.

- Las barras contextuales y de grupo se superponen; seleccionar o entrar/salir de
  un grupo no cambia el viewport ni el zoom del lienzo.
- Contenido ocupa el ancho disponible, con herramientas en los bordes.
- En Línea guía y tarjeta, arrastrar la tarjeta escribe dx/dy, mientras arrastrar
  el punto escribe lon/lat (o el keyframe de video). La línea sigue uniendo ambos.
- La barra superior expone título y subtítulo separados. El título vacío hereda el
  nombre del tour. La edición en el lienzo oculta el texto del motor mientras dura.
- Inicio se activa únicamente con Usar página de inicio.

## Trabajo y verificación

Ventanas de configuración: ancho inicial de 440 px, incluidas las fuentes, sin
estrechamiento especial. Tirador inferior derecho para ancho/alto, tamaño por tipo
de ventana en sesión. Abrir/reducir Chrome recupera cierre y tirador visibles.
La cabecera común no impone ancho mínimo; sus pestañas pasan juntas a segunda
fila bajo 900 px. QA debe incluir ventana real sin emulación de viewport.

Plantillas de la organización: biblioteca global DesignTemplate; crear requiere
admin/superadmin y aplicar requiere acceso al tour destino. Guarda composición
de Inicio/Recorrido, marca, tema, presets y paneles; copia archivos utilizados de
forma independiente. Aplicar reemplaza esas secciones con undo, preservando
escenas, hotspots, nadir, calidad e idiomas. Referencias de escenas del origen se
retiran y se configuran nuevamente en destino. No se comparten tours completos.

Ronda A1 y A2/A3 se trabajan en worktrees separados; luego se integra B y C con
contratos compartidos. Root integra carga y backend. Cada entrega tiene commits
pequeños con rol y pruebas de sus operaciones puras.

Se ejecutan `npm test`, `npm run build` y `npm run build:runtime`, validación del
backend y revisión en navegador a 1440×900, 1024×768 y 390×844 cuando sea posible.
La entrega distingue verificaciones automáticas, visuales y pendientes de Edd.

## Tamaño directo de tarjetas y hotspots

La selección usa contorno morado, cuatro círculos en las esquinas y tiradores
laterales. Las esquinas escalan proporcionalmente geometría, textos, imagen,
padding y separaciones; los laterales redistribuyen el ancho sin cambiar la letra.
Se aplica al lienzo de Interfaz, al editor por piezas y a hotspots de Contenido.
Se respetan bloqueo y restricciones de elementos estirados. Los controles de tamaño
son sliders; las coordenadas avanzadas X/Y pueden seguir siendo numéricas.

Contenido expone «Tamaño, textos e imagen» en la configuración del hotspot y acceso
directo a «Editar tarjeta en el lienzo». Ambos editan el mismo grupo y piezas del
detalle: ancho, alto automático/fijo, tipografía, dimensiones y ajuste de imagen.
El alto fijo crea un único viewport desplazable; automático vuelve al contenido.
Arrastrar la tarjeta conserva su función de separar tarjeta/punto, y mover el punto
mantiene el conjunto. Redimensionar no altera la coordenada panorámica del hotspot.

Con configuración abierta los cambios son borrador hasta Guardar cambios; cerrada,
el redimensionado directo usa el guardado serializado existente. Escape durante
un gesto lo cancela antes de cerrar la ventana. Visor y export conservan el tamaño
pero no incluyen tiradores ni contornos de edición.

## Edición de piezas en hotspots

Doble clic sobre una pieza visible del hotspot abre el editor compartido y la
selecciona; allí se arrastra/redimensiona, cambia tipografía, color e imagen o se
edita texto con otro doble clic, como en un grupo de Interfaz. Existe también
«Editar piezas del marcador». La composición del marcador `content.card` es
independiente de `content.detail`: convertir/editar una tarjeta sin detalle no lo
activa. Ambos usan grupos/piezas canónicos v1, no controles tipográficos paralelos.
Los valores enlazados siguen al hotspot, mientras que etiqueta y acción pueden
personalizarse como textos estáticos. Los cambios se confirman con Terminar y
Guardar cambios; cerrar el formulario descarta el borrador. Visor/export renderizan
las piezas guardadas sin herramientas de edición.

## Barra de piezas fuera de la panorámica (20 de octubre)

Al editar piezas del marcador o detalle desde Contenido, las opciones se alojan
junto al encabezado de la página. Se reservan 80 px (indicador de grupo alineado
izquierda + controles), aunque cambie la selección. Texto, imagen y conjunto no
deben desplazar el lienzo. En ventanas estrechas la barra pasa debajo del título.

Los controles de texto compartidos con Interfaz usan A con muestra de color,
tamaño numérico editable sin unidad px, B para elegir grosor, alineación, Aa para
fuente, cursiva y subrayado. Texto y variante permanecen en Más opciones. Al faltar
espacio se ocultan nombres secundarios; Animar y Posición también están accesibles
desde Más opciones. Los botones conservan etiquetas accesibles y ayudas al pasar
el cursor. No se cambia el ancho inicial del selector de fuentes ni la tipografía
general del configurador.

## Configuración visual del detalle

Tamaños de texto e imagen se ajustan manualmente en el editor de piezas; no se
duplican como sliders en las ventanas de configuración. El pop-up del detalle
incluye una muestra viva del borrador, completa y reducida para caber sin scroll
interno, y «Editar piezas». Plantilla, contenido visible e imagen se reflejan
inmediatamente. Guardar/descartar sigue siendo responsabilidad del formulario
principal. La geometría del conjunto permanece en «Tamaño de tarjeta».

## Continuidad del escalado

Esquinas de piezas UI/hotspot y del hotspot completo escalan proporcionalmente
según la proyección del movimiento sobre la diagonal inicial. Un pequeño movimiento
en el eje corto no debe amplificar el tamaño. Los laterales no cambian la fuente;
mover no cambia dimensiones. Tiradores adyacentes no comparten sus zonas de clic,
incluso en una sola línea pequeña o con zoom reducido.

## Contenedor y piezas visibles simultáneamente

En el editor de piezas de cualquier hotspot se muestran también los tiradores del
grupo activo, conservando la selección interna. Esquinas escalan todo, laterales
ajustan ancho y barras superior/inferior ajustan alto sin escalar sus piezas. El
cambio se puede deshacer/rehacer o cancelar sin salir de Piezas. Se aplica tanto
al marcador editable como al detalle, independientemente del tipo del hotspot.
