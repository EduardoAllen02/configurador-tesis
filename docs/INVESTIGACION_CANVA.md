# Investigación del editor de Canva (referencia para el editor de Tour Studio)

Método: inspección en vivo del editor de Canva (cuenta del usuario, un diseño tipo Presentación 1920x1080; sólo se seleccionó, se abrieron paneles y se cerraron con Escape/X; no se cambió nada). Medidas reales del DOM (`getBoundingClientRect`, estilos computados). Viewport de la medición: 1249 px de ancho (todo en px CSS). Capturas en
`C:\Users\YEYIAN~1\AppData\Local\Temp\claude\C--Users-Yeyian-PC-Documents-VSCodeProjects\c4cd93cc-7ba9-47b3-b897-e728ba32960e\scratchpad\canva-research\` (fuera del repo).

Lo marcado **[no verificado]** viene de conocimiento previo de Canva y no se pudo comprobar sin modificar el diseño (arrastres, aplicar animaciones, editar texto). Las páginas de ayuda de Canva devolvieron 403/404 salvo `help/keyboard-shortcuts`, que sí se leyó (sección 13).

Tokens globales observados: fuente UI "Canva Sans" (400/600/700), texto principal `#0F1015`, morado de selección `#8B3DFF`, radios 10/12/14 px, sombras suaves azuladas. Botones 14 px/600, etiquetas del riel 10 px, etiquetas pequeñas 12 px.

---

## 1. Shell (estructura general)

Cabecera con degradado + riel vertical + cajón (drawer) + lienzo + barra inferior. Capturas: `01-topbar.png`, `02-rail.png`, `03-drawer-elementos.png`, `04-drawer-*.png`.

| Elemento | Medida / estilo |
|---|---|
| Cabecera | alto 57 px, ancho completo, `linear-gradient(90deg,#00C4CC,#7D2AE8)`, texto blanco 14/600 |
| Botones cabecera | alto 40 px, y=8: Inicio 40x40 (x=16), Archivo 85, Redimensionar 130, Editar (modo, menú) 117, icono "guardado" 40x40, título editable 253, … Compartir 102x40 (blanco 90 %, texto oscuro) a la derecha; Presentar 98 + flecha 40 |
| Orden cabecera | Inicio · Archivo · Redimensionar · Editar(modo: Editar/Comentar/Ver, `52-menu-editar.png`) · estado de guardado · título · (Pro) · avatar · estadísticas · comentarios · Presentar · Compartir |
| Riel izquierdo | ancho 72 px, ítems 72x72, icono 24-32 + etiqueta 10 px debajo, fondo = fondo del lienzo (sin borde) |
| Ítem activo del riel | "píldora" blanca 32x32 (x=20) radio 12 detrás del icono; icono coloreado (Elementos azul, Texto morado, Marca rojo, Subidos naranja, Herramientas verde) |
| Orden del riel | Plantillas, Elementos, Texto, Marca (corona Pro), Subidos, Herramientas, Proyectos, Apps |
| Cajón (drawer) | x 72→433, **ancho 361 px**, fondo blanco; contenido con padding 16 (328 px útiles) |
| Buscador del cajón | alto ~42, ancho 328, radio píldora, borde/fondo lila muy suave, lupa + placeholder (+ micrófono / filtros según pestaña) |
| Colapsar cajón | pestaña blanca redonda con "‹" pegada al borde derecho del cajón, centrada verticalmente; click = cerrar; el lienzo se reajusta (zoom "fit" recalcula) |
| Cajón Marca | más ancho (~565 px): 2 columnas (índice + contenido) |
| Herramientas | NO es cajón: barra flotante vertical (píldora blanca) con 7-8 herramientas de dibujo + X redonda |

Cajón Elementos (`03-drawer-elementos.png`): buscador → "Usado recién" (carrusel de 80x80, gap 8, flecha ">" 44x44) → "Recomendado para ti" → "Explora las categorías": rejilla de **3 columnas**, tarjeta 99x119 (icono 3D ~64 + etiqueta 12 px). Cada miniatura lleva un botón "…" 24x24 (fondo `rgba(19,22,32,.6)`, radio 6). Títulos de sección 14/700; "Ver todo" 14/600 a la derecha.

Cajón Texto (`04-drawer-Texto.png`): buscador de fuentes → botón primario morado "Agregar caja de texto" (ancho completo, ~40 alto) → "Texto Mágico" (secundario con borde) → Kit de Marca → "Estilos de texto predeterminado" (3 tarjetas: Título grande/700, Subtítulo/700, Texto pequeño; borde 1 px, radio 12) → Texto dinámico → Apps → "Combinaciones de fuentes" (rejilla 2 col).

Cajón Subidos (`04-drawer-Subidos.png`): buscador → botón primario morado "Subir archivos" + botón "…" cuadrado → "Grabarme" (secundario) → pestañas subrayadas Imágenes | Diseños | Carpetas → lista de miniaturas ancho completo, radio ~8, tarjeta de promoción descartable (X).

Presentación para arrastre: miniaturas con fondo claro; click = agrega al centro de la página, arrastrar = soltar donde se quiera (**[no verificado]**, no se arrastró).

**Para Tour Studio**
- Riel 72 px + cajón ~360 px; un único cajón abierto a la vez; el lienzo se encoge al abrir y se reajusta al cerrar.
- Pocas pestañas en el riel (p. ej. Escenas, Elementos/Hotspots, Texto, Medios, Marca). Menos que Canva.
- Cada pestaña: buscador arriba, botón primario morado de ancho completo, secciones con título 14/700 y rejillas 2-3 columnas.
- Click en una miniatura inserta centrado (alternativa sencilla al arrastre); arrastrar como extra.
- Cabecera de 57 px; botones 40 px con texto 14/600.

---

## 2. Lienzo / artboard

| Elemento | Medida |
|---|---|
| Área de lienzo | x 72→ancho, y 57→ sobre la barra inferior; fondo gris azulado muy claro (~`#F1F2F6`) |
| Página | rectángulo con ratio del diseño, centrado, sin borde, sombra muy sutil. Ej.: 1129x636 a 59 % de un diseño 1920x1080 |
| Zoom inicial | "ajustar" a la ventana con margen; al abrir un cajón se recalcula (59 % → 29 % con el panel ancho de Marca) |
| Barra inferior | alto ~40, y≈1237; izquierda: Notas, Temporizador; derecha: slider de zoom (160x40), porcentaje (botón con menú), "Páginas" (alterna visor de miniaturas, 92x32), "1 de 13", vista de cuadrícula, pantalla completa, ayuda (?) — botones 32x32 14/600 |
| Slider de zoom | `input[type=range]` **logarítmico**: min=-2.304, max=1.61, valor=ln(zoom) (ej. -0.531 → 59 %) → ~10 %–500 % |
| Menú del % (`51-zoom-menu.png`) | 125, 100, 75, 50, 25, 10 % + "Reducir" (ajustar, con ✓) y "Ampliar" (rellenar) |
| Tira de páginas | miniaturas 114x64, gap 16, número en esquina, "…" de página 28x16, "+" 24x24 |

Scroll: rueda desplaza el lienzo; Ctrl+rueda = zoom **[no verificado]**; Archivo > "Visualización de la página" alterna Miniaturas / Desplazamiento / Cuadrícula.

**Para Tour Studio**
- Lienzo = vista del tour con la escena activa; fondo gris claro neutro y marco del viewport con sombra suave.
- Zoom logarítmico (slider + % + presets 25/50/75/100/125/fit). Ctrl+rueda zoom, rueda desplaza, espacio+arrastre desplaza.
- Barra inferior mínima: zoom, ajustar, pantalla completa.
- Como el tour exportado es responsive, el lienzo debe editar posiciones **relativas** (porcentajes y anclajes), no px fijos; mostrar marco 16:9 de referencia.

---

## 3. Selección

Capturas: `10-seleccion-texto.png`, `15-toolbar-imagen.png`, `16-multiseleccion.png`.

| Elemento | Medida / estilo |
|---|---|
| Caja de selección | borde **2 px `#8B3DFF`**, sin relleno, halo exterior blanco 7 % 1 px |
| Hover (sin seleccionar) | contorno morado ~2 px del mismo color sobre el elemento bajo el cursor (visto en una tabla) |
| Handles de esquina | **círculos blancos 12x12**, sombra `0 0 4px 1px rgba(57,70,96,.14)` + `rgba(43,53,74,.3)` |
| Handles laterales | **píldoras blancas**: 6x18 (izq/der, radio 3) y 18x6 (arriba/abajo). El texto sólo muestra izq/der (cambia el ancho; el alto sigue al contenido); imagen y formas muestran los 8 |
| Rotación | botón circular blanco **24x24** con "↻", **33 px por debajo** del borde inferior, centrado |
| Mini-barra flotante | píldora blanca ~172x40, radio ~20, **sobre** la caja (~16 px de separación), centrada; 5 botones 32x32 (radio 36): Comentar, Bloquear (candado), Duplicar, Eliminar, Más "…" |
| Multi-selección | cada elemento conserva su caja morada + caja punteada gris envolvente con handles; icono "mover" (cruz) en el centro de cada elemento; mini-barra: **Agrupar** · Bloquear · Duplicar · Eliminar · Más |
| Cómo se multiselecciona | Shift+click (verificado), marquee **[no verificado]**, Ctrl+A |
| Bloqueado | la mini-barra muestra candado cerrado; sin handles/arrastre **[no verificado]** |

Comportamiento: click selecciona y aparece la barra contextual superior; click en vacío o Escape deselecciona; Tab/Shift+Tab recorren elementos.

**Para Tour Studio**
- Copiar tal cual: caja 2 px morada, 8 handles (círculos 12 px en esquinas, píldoras en lados), rotación 24 px a 33 px debajo, mini-barra con Duplicar/Eliminar/Bloquear/Más.
- Hotspots de tamaño fijo: sólo handles de esquina.
- Hit-area de handles ≥ 24 px aunque se vean de 12.

---

## 4. Barra de herramientas contextual (superior)

Capturas: `11-toolbar-texto.png`, `15-toolbar-imagen.png`.

Contenedor: píldora blanca **alto 40 px, y=65** (8 px bajo la cabecera), **radio 14**, padding 4, sombra `0 0 0 .5px rgba(64,79,109,.07), 0 2px 5px rgba(21,30,130,.12)…`, **centrada** en el área de lienzo, ancho = contenido (858 px texto, 950 px imagen). Botones **32x32**, radio 10, gap 4, icono 24; botones con texto: alto 32, 14/600. Estado activo (ej. "aA"): fondo `rgba(163,112,252,.15)`. Separadores verticales finos entre grupos.

| Tipo | Controles (izq. → der.) |
|---|---|
| Texto | Fuente (120x32, desplegable) · [− tamaño +] (grupo 96 px) · Color del texto (A con barra de color) · Negrita · Cursiva · Subrayar · Tachado · Mayúsculas (aA) · Alineación · Lista · Espaciado · Transparencia · **Efectos · Animar · Posición** · │ · Copiar estilo (pincel) |
| Imagen | Editar · Reemplazar · Quitafondos (Pro) · Borrador · colores de la imagen (si vectorial) · Estilo del trazo · Redondear esquinas · Recortar · Voltear · Transparencia · **Animar · Posición** · │ · Copiar estilo (con texto "Estilo") |
| Forma | Color de relleno · Estilo de trazo · Esquinas · Transparencia · Animar · Posición (por analogía con la imagen vectorial) |
| Multiselección | sólo los controles comunes (trazo, esquinas, fuente, tamaño, color…) + Animar · Posición |

Observaciones:
- Las acciones de **panel** (Efectos, Animar, Posición) son botones con **texto**, al final antes de "Copiar estilo"; los ajustes rápidos son **iconos**.
- Opciones simples → **popover** bajo el botón (Transparencia: 256x94, radio ~12, slider morado + caja numérica "100"; `14-popover-transparencia.png`). Opciones grandes → **panel lateral** que sustituye al cajón (Color, Fuente, Efectos, Posición, Animar).
- La barra no usa "…" de desbordamiento en estos tipos; se adapta al ancho. El "…" (Más) está en la **mini-barra flotante**.
- Tamaño de fuente: input numérico central con − y + (ej. 33.2).

**Para Tour Studio**
- Una barra superior contextual flotante, centrada, misma geometría (40 alto, radio 14, botones 32).
- Mínimo por tipo: **Texto**: fuente, tamaño, color, negrita, cursiva, alineación, Posición. **Forma/botón/hotspot**: relleno, borde, esquinas, transparencia, Animar, Posición. **Imagen/logo**: reemplazar, recortar, esquinas, transparencia, Posición. **Multi**: comunes + Alinear.
- Paneles laterales para lo "grande"; popovers sólo para un valor (transparencia).

---

## 5. Panel de color

Capturas: `20-color-panel-texto.png`, `21-color-picker-custom.png`.

Se abre **sustituyendo el cajón** (mismo ancho 360, y=57, tarjeta blanca con sombra); título "Color del texto" 16/700, botón vista lista (32x32) y **X** (40x40) arriba. Cierra con X (Escape cierra primero el selector personalizado).

| Elemento | Medida |
|---|---|
| Buscador | 328x38, placeholder `Prueba con "azul" o "#00c4cc"` |
| Swatch | **círculo 40x40**, **gap 8**, **7 por fila** (x 88→416) |
| Seleccionado | anillo morado 2 px con separación blanca alrededor del swatch |
| Fila 1 "Colores del texto" | [+ personalizado (arcoíris)] [cuentagotas] + colores usados por el elemento |
| "Colores del diseño" | 7 colores usados en el documento (subtítulo gris 12 px) |
| "Kit de Marca" (+ Editar) | paleta de marca (swatches 40) |
| "Paleta de colores de las fotos" | extraída de las imágenes (miniatura + 4-5 colores) + "Ver todo" |
| "Colores sólidos predeterminados" | 4 filas x 7: grises/blanco/negro, rojos-rosas-morados, azules-cian, verdes-amarillos-naranjas |
| "Colores degradados" | filas de degradados lineales |
| Selector personalizado ("+") | popover 328 px bajo la fila: pestañas **Color sólido / Degradado** (subrayado morado), cuadro saturación/brillo ~296x112 con puntero circular, slider de matiz (arcoíris 306x16), campo **hex** (195x30 con muestra circular) y cuentagotas 40x40 |

El elemento sigue seleccionado y los cambios se ven en vivo.

**Para Tour Studio**
- Panel lateral: buscador (hex/nombre) · "Colores del tour" · "Marca" · predeterminados (rejilla 7 col, swatches 40, gap 8) · "+" con selector y hex.
- Sin degradados en V1.
- Seleccionado = anillo morado 2 px; swatch blanco con borde gris fino.
- Aplicar en vivo; Ctrl+Z revierte.

---

## 6. Panel de Posición

Capturas: `30-posicion-organizar.png`, `31-posicion-capas-cabecera.png`.

Panel lateral 360 px, título "Posición" 16/700 + X. Pestañas **Organizar | Capas** (16 px, alto 40, subrayado morado bajo la activa).

**Organizar** (botones 160x40, radio 12, borde fino, icono + texto 14/600, rejilla 2 col gap 8, x=88 y x=256):
- Delante · Detrás · Al frente · Al fondo (2x2).
- "Alinear a la página" (14/700): Arriba · Izquierda / En medio · Centro / Abajo · Derecha. Los que ya se cumplen quedan **deshabilitados** (gris; p. ej. "Centro" ya centrado). Con multiselección se alinea entre sí **[no verificado]**.
- "Avanzados": rejilla de 3 columnas, etiqueta 12 px sobre campo 78x38 (radio 8, borde gris, unidad en el valor: "1024.5 px", "0°"). Fila 1: **Ancho · Alto · Relación** (candado 104x40 que bloquea proporción; Alto deshabilitado en texto). Fila 2: **X · Y · Rotar**.

**Capas**: conmutador segmentado **Todas | Superposición** (alto 32, fondo gris claro, activa blanca); filas 328x56, radio 8, fondo gris `rgba(53,65,90,.2)`, **asa de arrastre** (6 puntos) a la izquierda y vista previa del elemento; la capa seleccionada con borde morado 2 px; arrastrar filas reordena; el fondo aparece al final.

**Para Tour Studio**
- Reproducir: Organizar (z-order + alinear 6 + Avanzado Ancho/Alto/X/Y/Rotar + candado) y Capas.
- Mostrar valores en % (y px de referencia), por el tour responsive.
- Capas: asa de arrastre, selección sincronizada con el lienzo, ojo/candado por fila.

---

## 7. Panel de Animar

Capturas: `40-animar-texto.png`, `41-animar-pagina.png`.

Panel lateral 360, título "Animar" + X, pestañas **Página | [tipo del elemento: Texto/Imagen/…]**.

- **Página**: banner "Animación Mágica" (IA, Pro); "Destacado" (Simple, Elegante, Divertida, Fiesta, Corporativo, Relax) y "General" (Subir, Paneo, Fundir, Pop, Diagonal, Aparecer…).
- **Elemento (Texto)**: "Configuración de la presentación" con interruptor "Aparece al hacer clic"; "Personalizar" (tarjeta "Crear una animación"); "Sugerencias": rejilla **3 columnas**, tarjetas ~99x99 (borde 1 px, radio 12) con ilustración morada y etiqueta 12 px debajo (A máquina, Ascender, Deslizar, Combinar, Bloque, Explosión, Rebotar, Rodar, Patineta, Extender, Enfoque…).
- **Hover**: borde gris oscuro 2 px y la miniatura se anima en bucle.
- **Tras elegir** **[no verificado]** (no se aplicó por la regla de sólo lectura): cabecera con el efecto elegido y "Quitar", slider de velocidad, dirección, y modo entrada/salida.

**Para Tour Studio**
- Animar = **entrada** (y salida opcional) del elemento. 6-8 presets (Aparecer, Deslizar, Subir, Zoom, Rebote, Pulso para hotspots) en rejilla 3 col con miniatura animada en hover.
- Opciones mínimas: duración (rápido/normal/lento), dirección, disparador (al cargar | al mirar | al clic).

---

## 8. Guías inteligentes y snapping

No se arrastró nada (regla). **[no verificado en vivo; conocimiento previo]**:
- Al mover/redimensionar aparecen **líneas guía magenta/rosa** de 1 px que cruzan la página cuando borde o centro del elemento coincide con los de la página, márgenes u otros elementos; imán a ~5-6 px.
- Indicadores de **espaciado** igual entre elementos con etiqueta de distancia rosa.
- Rotación: imán a 0/45/90° con etiqueta de grados.
- Archivo > Reglas y guías (`50-menu-reglas-guias.png`, verificado): "Mostrar reglas y guías" (**Shift+R**), "Agregar guías", "Mostrar márgenes", "Mostrar sangrado". Atajo oficial "Bloquear guías": Alt+Ctrl+;.

**Para Tour Studio**
- Imán a centro/bordes del viewport, centro/bordes de otros elementos y equidistancia; líneas magenta 1 px, umbral 5 px, etiqueta de distancia opcional; Ctrl para desactivar.
- Overlay opcional de "zona segura" (márgenes), útil para responsive.

---

## 9. Edición de texto

- Doble clic entra a edición en el sitio **[no verificado]**; con el elemento seleccionado la barra ofrece todo el formato.
- Selector de fuente (`12-selector-fuente.png`): panel lateral con pestañas **Fuente | Estilo**, buscador con filtros, chips de categorías (alto 40, radio 12), listas "Fuentes del documento" (✓ la actual), "Fuentes recomendadas", "Usado recién"; cada fila muestra el nombre en su tipografía + "AaBbCc" gris y un chevrón.
- Tamaño: stepper − valor +.
- Efectos (`13-efectos-texto.png`): rejilla 3 col de tarjetas "Ag" (Soltar, Brillo, Eco, Contorno, Fondo, Desalineado, Sin relleno, Neón, Distorsión) + "Forma" (Curvar).

**Para Tour Studio**: doble clic para editar; barra mínima fuente (lista corta), tamaño, color, negrita, alineación; efectos en V2.

---

## 10. Kit de marca ("Marca")

`04-drawer-Marca.png`: panel ancho (~565 px) con índice izquierdo (Todos los recursos, Pautas, Plantillas de la marca, Logos, Colores, Fuentes, Voz de la marca, Fotos, Elementos gráficos, Íconos, Gráficas) y vista derecha con previa de marca, "Paleta de colores" (barra de bloques), gestión (Cambiar nombre, Eliminar). En los paneles de Color y Texto la marca aparece como sección propia: "Kit de Marca" + "Editar" con swatches de marca y "Agrega las fuentes de tu marca".

**Para Tour Studio**: sección "Marca" con logo, 3-5 colores y 1-2 fuentes del cliente, y esas mismas aparecen **arriba** en los selectores de color y fuente.

---

## 11. Subidos

Ver sección 1 (`04-drawer-Subidos.png`). Arrastrar o clic para insertar. No se subió nada.

**Para Tour Studio**: Subidos = logos/imágenes/íconos del cliente; botón primario "Subir", cuadrícula 2 col, clic = insertar.

---

## 12. Responsive / vistas previas por dispositivo

En el editor de Presentación no hay vista móvil/escritorio: sólo Presentar, pantalla completa y Redimensionar (Magic Switch, Pro), que *duplica* el diseño a otro tamaño. Canva Sitios web tiene vista previa con conmutador escritorio/móvil **[no verificado: no se abrió un sitio]**. No hay layout relativo en el lienzo de Presentación.

**Para Tour Studio**: editor sólo de escritorio, pero el tour exportado es responsive. Añadir conmutador "Vista previa: Escritorio / Tablet / Móvil" que **simule** el viewport y reubique por anclajes; sin edición separada por dispositivo en V1.

---

## 13. Atajos de teclado (oficiales, Windows; fuente: Canva help/keyboard-shortcuts)

| Acción | Atajo |
|---|---|
| Deshacer / Rehacer | Ctrl+Z / Ctrl+Y (o Ctrl+Shift+Z) |
| Guardar | Ctrl+S |
| Seleccionar todo | Ctrl+A |
| Panel lateral abrir/cerrar | Ctrl+/ |
| Agregar texto / rectángulo / línea / círculo / nota | T / R / L / C / S |
| Eliminar | Supr o Retroceso |
| Duplicar | Ctrl+D |
| Agrupar / Desagrupar | Ctrl+G / Ctrl+Shift+G |
| Bloquear | Alt+Shift+L |
| Adelante / Atrás | Ctrl+] / Ctrl+[ |
| Al frente / Al fondo | Alt+Ctrl+] / Alt+Ctrl+[ |
| Mostrar capas | Alt+1 |
| Siguiente/anterior elemento | Tab / Shift+Tab |
| Mover pequeño / grande | Flechas / Shift+Flechas (en Canva 1 px / 10 px **[valor no verificado]**) |
| Redimensionar con teclado | Ctrl+Flechas / Shift+Ctrl+Flechas |
| Rotar | Alt+, / Alt+. (pequeño); Alt+Shift+, / . (grande) |
| Alternar proporción | F2 |
| Multi-selección vecino | Shift+W/A/S/D; Shift+click |
| Copiar / pegar estilo | Alt+Ctrl+C / Alt+Ctrl+V |
| Zoom + / − | Ctrl++ / Ctrl+- |
| Tamaño real / ajustar a ventana | Ctrl+0 / Alt+Ctrl+0 |
| Reglas y guías | Shift+R; bloquear guías Alt+Ctrl+; |
| Negrita/cursiva/subrayado/tachado | Ctrl+B / Ctrl+I / Ctrl+U / Shift+Ctrl+S |
| Alinear texto izq/centro/der | Shift+Ctrl+L / C / R |
| Tamaño de fuente +/- | Shift+Ctrl+. / Shift+Ctrl+, |
| Menú de fuentes | Shift+Ctrl+F |
| Presentar | Alt+Ctrl+P |

(La traducción automática de la ayuda escribe "Deslizar" donde significa "Shift".) Ctrl+/ desde un evento sintético no abrió nada; el panel de atajos no se pudo capturar.

---

## 14. Deshacer/rehacer y autoguardado

- Icono de nube con check a la izquierda del título (40x40), `aria-label="Se guardaron todos los cambios"`; Archivo > Guardar repite el estado ("Se guardaron los cambios"). Historial de versiones en Archivo.
- En la cabecera de Presentación no hay botones de deshacer/rehacer visibles (sólo teclado/menú).
- Todo se guarda solo, sin botón.

**Para Tour Studio**: indicador nube/check junto al título con 3 estados (guardado / guardando / error), botones ↶ ↷ visibles + Ctrl+Z/Y, autoguardado con debounce ~1 s.

---

## Lo imprescindible para C1 (lienzo)

1. Selección: caja 2 px `#8B3DFF`, 8 handles (círculos 12 px y píldoras 6x18/18x6), rotación 24 px a 33 px bajo la caja, cursores correctos, hit-area ≥ 24 px.
2. Mover/redimensionar/rotar: Shift = proporción, Alt = desde el centro, Shift al rotar = pasos de 15°.
3. Mini-barra flotante sobre la selección (Duplicar, Eliminar, Bloquear, Más) y contorno morado en hover.
4. Smart guides magenta 1 px con imán 5 px (centro/bordes del viewport y otros elementos), etiqueta de distancia, Ctrl desactiva.
5. Multi-selección (Shift+click y marquee) con caja envolvente punteada y "Agrupar".
6. Zoom logarítmico 10-500 % (Ctrl+rueda, presets, ajustar), espacio+arrastre para desplazar; lienzo gris + marco del viewport 16:9 con sombra.
7. Atajos de elemento: flechas 1 px / Shift 10 px, Supr, Ctrl+D, Ctrl+G, Ctrl+Z/Y, Tab, Escape, Ctrl+A.
8. Coordenadas relativas (% del viewport + anclaje) por el tour responsive.
9. Edición de texto en el sitio con doble clic.
10. Arrastrar desde el cajón al lienzo; clic = insertar centrado.

## Lo imprescindible para C2 (paneles)

1. Shell: riel 72 px + cajón 360 px (padding 16, uno solo), cabecera 57 px, barra inferior con zoom.
2. Barra contextual flotante 40 px (radio 14, botones 32) por tipo (texto / forma-hotspot / imagen / multi) con Efectos · Animar · Posición como botones de texto al final.
3. Panel de color: buscador, colores del tour, marca, predeterminados 7 col con swatches 40 px gap 8, "+" con hex, anillo morado en el activo, vista previa en vivo, X/Escape cierra.
4. Panel Posición: Organizar (z-order, alinear 6, Avanzado W/H/X/Y/Rotar + candado) y Capas (asa de arrastre, selección sincronizada).
5. Panel Animar: rejilla 3 col con miniatura animada en hover; opciones mínimas (duración, dirección, disparador).
6. Selector de fuente con "del proyecto", "marca" y recientes; stepper de tamaño.
7. Popover de transparencia (slider morado + caja numérica).
8. Indicador de guardado + botones deshacer/rehacer.
9. Estados: hover gris claro, activo `rgba(163,112,252,.15)`, deshabilitado gris (p. ej. "Centro" ya centrado), foco morado.
10. Conmutador de vista previa Escritorio/Tablet/Móvil (simulación) para el export responsive.

## Atajos a replicar (prioridad)

Ctrl+Z, Ctrl+Y / Ctrl+Shift+Z, Ctrl+S, Ctrl+A, Supr/Retroceso, Ctrl+D, Ctrl+G, Ctrl+Shift+G, Alt+Shift+L (bloquear), Ctrl+] / Ctrl+[ (z-order), Alt+Ctrl+] / [ (frente/fondo), Flechas (1 px) y Shift+Flechas (10 px), Tab/Shift+Tab, Escape, Ctrl+C/V, Alt+Ctrl+C/V (copiar estilo), Ctrl+B/I/U, T (texto), Ctrl++/Ctrl+-/Ctrl+0 (zoom), Alt+Ctrl+0 (ajustar), Shift+R (reglas/guías), Ctrl+/ (cajón), Alt+1 (capas).

## Índice de capturas

`01-topbar`, `02-rail`, `03-drawer-elementos`, `04-drawer-Texto/Marca/Subidos/Apps/Herramientas`, `10-seleccion-texto`, `11-toolbar-texto`, `12-selector-fuente`, `13-efectos-texto`, `14-popover-transparencia`, `15-toolbar-imagen`, `16-multiseleccion`, `20-color-panel-texto`, `21-color-picker-custom`, `30-posicion-organizar`, `31-posicion-capas-cabecera`, `40-animar-texto`, `41-animar-pagina`, `50-menu-reglas-guias`, `51-zoom-menu`, `52-menu-editar`. Las capturas `10`, `15` y `16` incluyen fragmentos del diseño del usuario: no usarlas fuera del scratchpad.
