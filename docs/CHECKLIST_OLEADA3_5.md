# Revisión de Edd — Oleada 3.5

Usar el tour **Prueba Oleada 3.5** en la instancia local. Sus dos escenas y hotspots
son copias de prueba; los tours anteriores se conservan. El editor sigue en la ruta
`/tours/:id/design`, aunque su nombre visible pasa a ser Interfaz.

## A · Ventana, estilos y carga

- [ ] Abrir Más opciones y arrastrarla encima de la barra superior y de la biblioteca.
- [ ] Sacarla parcialmente por un borde, recuperarla por el título y cerrarla con X.
- [ ] Reabrirla: conserva posición. Escape la cierra.
- [ ] Cambiar un icono buscando por nombre y recorriendo categorías.
- [ ] Insertar cuatro elementos y acomodarlos. Aplicar Minimal claro a todo:
      conserva ids, textos y posiciones. Miniaturas e inserciones usan ese tema.
- [ ] Un color manual permanece. Activar quitar estilos manuales aplica el tema completo.
- [ ] Aplicar Audaz a un elemento y deshacer: los demás no cambian.
- [ ] Empezar desde ejemplo pide confirmación; deshacer recupera el diseño anterior.
- [ ] Tarjeta con cifras: Fondo transparente y Cristal No dejan ver la panorámica sin fondo.
- [ ] Ajustar tinte, borde, desenfoque y sombra desde Acabado.
- [ ] Con red lenta, Inicio muestra progreso real o barra indeterminada si falta total.
- [ ] Entrar espera a la primera panorámica. Entrada automática entra al terminar.
- [ ] En Recorrido, el indicador reaparece al cambiar de escena y se oculta al terminar.

## B · Grupos y texto

- [ ] Insertar Tarjeta con lista. Un clic selecciona el grupo; doble clic entra.
- [ ] Mover INCLUYE a la derecha, redimensionar una pieza y cambiar su icono.
- [ ] Doble clic sobre el texto permite escribir directamente.
- [ ] Cambiar fuente, tamaño, negrita, cursiva, subrayado, espaciado y color.
- [ ] Escape sale del grupo. Capas muestra hijos y permite seleccionarlos.
- [ ] Ctrl+Shift+G desagrupa, Ctrl+G agrupa y deshacer restaura el estado anterior.
- [ ] Un grupo anidado se edita y sus piezas mantienen coordenadas relativas.
- [ ] En Móvil, el grupo se escala completo. Acomodarlo a mano no cambia escritorio.
- [ ] Abrir un diseño anterior convierte sus tarjetas sin perder contenido.

## C · Escenas y paneles

- [ ] Encontrar Página de inicio, Recorrido y Paneles encima del lienzo.
- [ ] Activar y desactivar Usar página de inicio.
- [ ] Mostrar Datos clave solo en Sala 1; al ir a Sala 2 desaparece.
- [ ] En Contenido, agregar una pieza a la escena actual y moverla. El vacío gira la cámara.
- [ ] Diseñar un panel de producto y enlazar título, descripción, precio e imagen.
- [ ] Los paneles ya asignados a varios hotspots siguen mostrando sus propios datos.
- [ ] Probar cierre y posiciones lateral, central e inferior; en móvil, hoja inferior.

## App y export

- [ ] Exportar el tour de prueba y abrirlo desde su servidor estático.
- [ ] Comparar app/export en 1440×900, 1024×768 y 390×844.
- [ ] En móvil no hay scroll horizontal y el interior de los grupos conserva su disposición.
- [ ] Recargar el editor conserva las ediciones y los paneles.

## Correcciones de la revisión del 19 de octubre

- [ ] El aviso de selección desaparece tras cinco segundos y no vuelve al deseleccionar.
- [ ] Configurar contador/fila permite de una a ocho secciones, datos y orden.
- [ ] El contador seleccionado se pausa; doble clic abre su sección sin cuadro vacío.
- [ ] Cuenta ascendente/regresiva, duración cero, tiempos e indicadores funcionan.
- [ ] Añadir/quitar cifras reorganiza separadores; texto en lienzo y popup se sincroniza.
- [ ] Guardar/recargar, bloqueo, deshacer/rehacer y export conservan la configuración.

- [ ] Renombrar una escena con doble clic o lápiz; Enter guarda y Escape cancela.
- [ ] El nombre se conserva tras recargar y se actualiza en selectores y ajustes.
- [ ] Etiquetas/ayudas legibles en Contenido, Interfaz, ventanas, video y Publicar.
- [ ] Apariencia tiene padding en los cuatro lados; campos y biblioteca no se ven apretados.

- [ ] Seleccionar texto y entrar/salir de grupos conserva posición y zoom del lienzo.
- [ ] En Contenido, Hotspots y Elementos 2D ocupan el ancho disponible.
- [ ] En Línea guía y tarjeta, Tamaño cambia el punto y el anillo visibles.
- [ ] Arrastrar la tarjeta mueve solo la tarjeta y la línea; al recargar permanece.
- [ ] Arrastrar el punto mueve todo y conserva las distancias de la tarjeta.
- [ ] Con configuración abierta: arrastrar tarjeta a derecha e izquierda actualiza
      los sliders; mover el punto y guardar conserva esas mismas distancias.
- [ ] El selector de tipo muestra «Tipo» antes de los tres iconos más grandes.
- [ ] Abrir configuración del hotspot y arrastrarla por su título sobre la página.
- [ ] Más opciones en Interfaz usa la misma anchura y conserva su posición.
- [ ] Etiquetas de configuración más grandes y scroll fino con rueda y arrastre.
- [ ] Doble clic en el título de la barra edita ese título sin abrir el subtítulo.
- [ ] Solo Usar página de inicio activa Inicio; Entrada automática sigue independiente.
- [ ] Las barras no muestran selección por escena y la barra de cuadros es visible al editar.
- [ ] En Vista previa, la barra de cuadros se oculta en panorámicas y aparece en videos.
- [ ] Los paneles anteriores conservan su aspecto hasta personalizar el detalle del hotspot.

## Detalle propio del hotspot

- [ ] Abrir Configurar detalle sin cerrar la principal; mover ambas ventanas y cerrar
      la secundaria con Escape. Reabrir conserva sus posiciones independientes.
- [ ] Apagar Mostrar detalle elimina Ver detalle sin eliminar el marcador.
- [ ] En el hotspot + Al pulsar expande la misma tarjeta con imagen y Ver menos.
- [ ] En el hotspot + Siempre visible muestra contenido desde el inicio, sin CTA.
- [ ] En esquina abre al pulsar y reemplaza al anterior; no permite Siempre visible.
      Tours antiguos screen/always también empiezan cerrados, conservando su contenido.
- [ ] Tarjeta corta sin scroll; detalle largo con un único scroll de contenido,
      rueda y arrastre operativos, cierre visible y cámara inmóvil durante el scroll.
- [ ] Cambiar receta conserva datos y acabado. Editar elementos permite mover
      piezas, texto, color, imagen y tamaño del conjunto; deshacer/restaurar funciona.
- [ ] Terminar recupera las ventanas. Guardar y recargar conserva todas las ediciones.
- [ ] Cerrar la principal sin guardar descarta contenido, detalle y gestos del marcador.
- [ ] Aplicar al tipo/todos conserva datos, imágenes y coordenadas propias de cada
      destino; los bloqueados no cambian. Apagar detalle también se puede aplicar al resto.
- [ ] Mover punto después de mover tarjeta conserva dx/dy; expandir no separa la línea.
- [ ] Navegación con detalle apagado salta; con detalle activo ofrece Entrar explícito.
- [ ] Móvil mantiene las tarjetas dentro de la vista; fijo tiene posición móvil propia.
- [ ] Cambiar escena/cuadro retira detalles de hotspots que ya no están presentes.
- [ ] Preview y export coinciden en contenido, aspecto, apertura y navegación.

Los checks de aceptación quedan deliberadamente sin marcar hasta la prueba de Edd.
Las verificaciones técnicas del agente se registran en ESTADO_PROYECTO.md.

## Navegación y fuentes tras QA CDP

- [ ] Contenido/Interfaz/Publicar conservan posición y tamaño en la barra superior.
- [ ] Inicio/Recorrido es un selector segmentado; Editando grupo se alinea a izquierda.
- [ ] Marca presenta dos controles de fuente compactos; buscar, filtrar y elegir
      fuentes muestra una vista previa y conserva el cambio al recargar/exportar.
- [ ] El catálogo comparte fuentes del diseño y recientes, mantiene fija la búsqueda
      y aparece también al cambiar la fuente de un texto individual.

Matriz técnica y capturas: [QA CDP del 19 de octubre](QA_CDP_OLEADA3_5_2026_10_19.md).

## Tamaño de ventanas y plantillas compartidas

- [ ] Selector de fuentes, hotspot y demás ventanas mantienen su ancho inicial de 440 px.
- [ ] Tirador inferior derecho cambia ancho/alto; recuerda tamaño por tipo de ventana
      durante la sesión y sigue accesible al reducir Chrome. Flechas también funcionan.
- [ ] Cabecera, selectores y pie no se recortan al estrechar la ventana real. Bajo
      900 px las tres secciones presentan las mismas dos filas de cabecera.
- [ ] Crear nueva plantilla guarda el diseño y sus archivos para todos los tours.
- [ ] Usar plantilla conserva escenas/hotspots y ajustes del destino; reemplaza Inicio,
      Recorrido y paneles con deshacer/rehacer. Configurar de nuevo destinos de escenas.
- [ ] La plantilla funciona después de eliminar archivos del tour original. Admin y
      superadmin crean; cliente/dev solo pueden aplicar en sus tours autorizados.

## Escalado directo y tamaño del detalle

- [ ] Esquinas escalan proporcionalmente toda la tarjeta, texto e imagen; laterales
      cambian ancho y conservan tamaño de letra en Interfaz y Contenido.
- [ ] Hotspot circular y tarjeta sin detalle también muestran tiradores al seleccionar.
- [ ] Arrastrar tarjeta/punto conserva sus funciones y no se confunde con redimensionar.
- [ ] Tamaño, textos e imagen ofrece sliders y acceso al editor de piezas; seleccionar
      la imagen permite redimensionarla directamente.
- [ ] Alto automático ajusta contenido; alto fijo permite scroll real sin recortes.
- [ ] Guardar y recargar conserva tamaños; cerrar descarta borrador; Escape cancela
      el gesto sin cerrar primero la configuración. Deshacer/rehacer funciona en UI.
- [ ] Export conserva tamaños y no muestra controles de edición.

## Piezas del marcador de hotspot

- [ ] Doble clic en Información, título, descripción e imagen selecciona la pieza
      correcta; no crea una caja de texto ni mueve el ancla del hotspot.
- [ ] Cada pieza admite posición, tamaño, letra y color con las herramientas de UI;
      otro doble clic edita su texto y deshacer/rehacer conserva el conjunto.
- [ ] Editar tarjeta sin detalle mantiene desactivado su detalle opcional.
- [ ] Terminar + Guardar persiste la composición; cerrar descarta; recarga y export
      conservan las piezas, sus datos enlazados y sus tamaños.
- [ ] Tarjeta flotante, pastilla, etiqueta de precio y etiquetas visibles permiten
      editar sus textos; los iconos conservan su configuración habitual.

- [ ] Durante el arrastre de cualquiera de los seis tiradores, tarjeta y contorno
      mantienen la misma caja; al detener el cursor no hay saltos de altura.

- [ ] Soltar punto/tarjeta o tiradores conserva visibles todos los hotspots mientras
      guarda; repetir el gesto parte del valor anterior y recargar lo conserva.

## Barra contextual de piezas (aceptación manual)

- [ ] Al editar piezas de un hotspot, opciones arriba y panorámica despejada;
      cambiar entre texto, imagen y conjunto conserva la posición del lienzo.
- [ ] A/color, tamaño, B/grosor, alineación, Aa/fuente, I/U resultan reconocibles;
      Texto/variante y acciones secundarias siguen accesibles en Más opciones.
- [ ] En ventana de laptop y al estrecharla, la barra cabe; los desplegables abren
      correctamente y Terminar + Guardar conserva los cambios tras recargar.

- [ ] Configurar detalle muestra inmediatamente una vista previa completa que
      responde a plantilla/contenido; Editar piezas abre el editor manual.
- [ ] No hay sliders de tamaños de textos/imágenes en ninguno de los dos pop-ups.

- [ ] Arrastrar esquinas de texto/imagen en hotspots e Interfaz escala gradualmente,
      sin salto inicial; laterales conservan la letra y mover conserva dimensiones.
- [ ] Con zoom reducido, la barrita lateral activa ancho, nunca una esquina.

- [ ] Al seleccionar texto/imagen de un hotspot aparecen también los ocho tiradores
      del contenedor; ajustar alto/ancho/escala conserva la selección interna.
- [ ] Alto manual, undo/redo y guardado/recarga funcionan en marcador y detalle.
