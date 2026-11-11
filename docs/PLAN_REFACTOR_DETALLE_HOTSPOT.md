# Refactor — detalle integrado al hotspot

Fecha: 2026-10-19. Estado: implementado; pendiente de aceptación manual de Edd.
Este ajuste precede a la siguiente etapa del plan general.

## 1. Modelo de uso

El hotspot comprende marcador, tarjeta/resumen cuando exista y detalle opcional.
Se configura desde Contenido, sin tener que buscar su detalle en Interfaz.
Marcador y detalle comparten la apariencia del hotspot: colores, acabado, borde,
radio y tipografía. Las piezas del detalle siguen admitiendo cambios particulares.
Las plantillas de detalle cambian su composición, conservando datos y apariencia.

Se separan tres decisiones, con controles dependientes:

- Mostrar detalle: sí/no. Apagado oculta el resto de controles y Ver detalle.
- Dónde: En el hotspot / Fijo en pantalla.
- Cuándo: Al pulsar / Siempre visible, únicamente dentro de la tarjeta. La opción
  en pantalla abre al pulsar y reemplaza el detalle esquinado anterior.

| Dónde | Cuándo | Comportamiento |
|---|---|---|
| En el hotspot | Al pulsar | Ver detalle expande la misma tarjeta; Ver menos la contrae. |
| En el hotspot | Siempre visible | La tarjeta incluye imagen y contenido desde su primera aparición. |
| Fijo en pantalla | Al pulsar | El detalle abre en su posición configurada, con cierre. |
| Fijo en pantalla | Siempre visible | Retirado tras QA: documentos anteriores se interpretan como Al pulsar. |

En marcadores sin tarjeta, En el hotspot añade una tarjeta asociada al marcador;
no inserta imagen y descripción dentro de un icono circular. En Línea guía y
tarjeta se expande la tarjeta existente, sin crear una segunda carta.
Siempre visible significa mientras el hotspot sea visible en su escena/segmento;
no espera un clic, tampoco mantiene información de escenas que ya se abandonaron.

## 2. Flujo de configuración

La ventana principal conserva Tipo, contenido y apariencia del marcador. Añade
una sección **Detalle**, con interruptor, resumen de comportamiento y botón
**Configurar detalle**. Se retiran los accesos de este flujo que llevan a otra página.

El botón abre una segunda ventana arrastrable, titulada Detalle del hotspot:

1. Dónde y Cuándo.
2. Plantilla: Imagen y texto, Ficha de producto y Texto sencillo como recetas iniciales.
3. Contenido visible: título, imagen, descripción y precio, sin duplicar sus valores.
4. Editar elementos: activa selección y edición del grupo sobre la panorámica real.
5. Aplicar a: Solo este / Los de este tipo / Todos los hotspots.

La secundaria no cierra la principal. Escape cierra primero la ventana superior y
devuelve el foco; cada ventana recuerda su propia posición. Los selectores auxiliares
se muestran dentro de la secundaria para no acumular más ventanas.
Un único borrador del hotspot alimenta ambas ventanas, sliders y lienzo. Cerrar la
secundaria conserva el borrador; Guardar cambios en la principal confirma el conjunto.
Salir sin guardar descarta los cambios de ambas, sin dejar modificaciones parciales.
Esta transacción aplica mientras la configuración está abierta; los gestos realizados
fuera de ella mantienen su guardado inmediato actual.

## 3. Edición y render compartidos

Reutilizar el motor de grupos, piezas, selección, resize y enlaces a datos. El detalle
es un grupo compuesto de imagen, textos, formas y botones; no un nuevo editor paralelo.
Las piezas enlazan título, descripción, precio e imagen del propio hotspot.

- Arrastrar una pieza la mueve dentro del detalle. Arrastrar el grupo mueve el detalle
  dentro de su espacio: la tarjeta o la pantalla según el modo elegido.
- En línea guía: arrastrar la tarjeta modifica dx/dy; el punto mueve el conjunto.
  La expansión conserva el punto de unión de la línea y las distancias guardadas.
- En modo fijo, mover el marcador no desplaza el detalle fijado a la pantalla.
- Imagen con espacio reservado y tamaño adaptable; texto e imagen no se recortan
  al aumentar el contenido. En móvil se mantienen dentro de la vista y admiten scroll.
- Los detalles en pantalla mantienen uno abierto a la vez, en la posición configurada.
  No hay detalles esquinados permanentes ni apilado. Siempre visible solo se admite
  dentro de la tarjeta del propio hotspot.
- En modo edición, una acción Probar abrir/cerrar permite revisar la interacción sin
  confundir el arrastre de diseño con un clic del visitante.

El mismo render del grupo funciona en editor, vista previa y export. La expansión
es estado temporal del visor; el documento guarda únicamente la configuración inicial.

## 4. Estructura y compatibilidad

Almacenamiento: `hotspot.content.detail`, con `version: 1`, `enabled`, `placement`
(`inline`/`screen`), `reveal` (`click`/`always`), plantilla, grupo de elementos y
posición adaptable cuando sea fijo. Los datos del hotspot siguen teniendo un solo dueño.
La apariencia se resuelve desde el hotspot y el tema; no se duplica como otro tema
desconectado del marcador. No hace falta añadir columnas para los campos JSON existentes.

Las plantillas son recetas que se copian al hotspot. Editar una instancia no modifica
otros hotspots a través de un panel compartido oculto. Aplicar al resto es una acción
explícita: copia configuración/composición y enlaces, conserva los datos, la imagen y
las coordenadas del marcador de cada destinatario. Se respeta su bloqueo y se informa
del alcance antes de aplicar. La aplicación por lote debe guardarse de forma atómica.

Migrar `content.panelId`, `panelDefaults` y `detailPanel` sin pérdida visual: resolver
el detalle efectivo anterior y convertirlo en la configuración del hotspot. Conservar
el render compatible para documentos/exportaciones antiguos. La migración no cambia
colores de tours existentes al abrirlos; esos overrides se conservan hasta que el
usuario aplique la apariencia compartida. Los detalles nuevos nacen vinculados.
El apartado Paneles deja de ser la ruta principal de edición de detalles de hotspots;
los recursos antiguos se mantienen hasta finalizar su migración y referencias.

Navegación mantiene su acción actual y detalle desactivado por defecto. Si se habilita
un detalle en ese tipo, el salto se conserva en un botón Entrar explícito dentro de él;
un mismo clic no debe intentar abrir información y cambiar de escena simultáneamente.

## 5. Orden de implementación y aceptación

1. Contrato, resolución de configuración y migración compatible, con validación backend.
2. Ventanas principal/secundaria y único borrador; activar/desactivar y aplicar por lote.
3. Grupo editable, tres plantillas iniciales y apariencia común con el marcador.
4. Expansión en la misma tarjeta, apertura fija y Siempre visible.
5. Verificación de app/export, móvil y regresiones de arrastre/guardado.

Casos de aceptación: las cuatro combinaciones de ubicación y apertura; desactivado sin
Ver detalle; imagen visible dentro de la tarjeta; crecer/contraer sin mover ancla ni
línea; sliders sincronizados; edición del grupo y sus piezas; guardar/deshacer/reabrir;
aplicar a otros conserva sus propios datos; escena y segmentos de video correctos;
varios siempre visibles; migración anterior; paridad entre app y export.

## 6. Entrega y verificación

Implementados los cinco pasos. La configuración principal abre una secundaria con
posición independiente. Editar elementos oculta temporalmente ambas ventanas y abre
el editor de grupos sobre el panorama; Terminar recupera las ventanas y su borrador.
El acabado del grupo se aplica a la tarjeta completa, tanto contraída como abierta.
Mover el conjunto en modo inline actualiza dx/dy; el tamaño se guarda en su frame.

La compatibilidad es perezosa: abrir la configuración resuelve y copia el panel
anterior en memoria; solo Guardar escribe el detalle integrado. Se conserva una
instantánea del render anterior hasta que se cambia su composición o apariencia.
Los paneles antiguos de Interfaz siguen disponibles para documentos existentes.

Verificación técnica: 404 pruebas frontend y 6 backend; builds de app y runtime.
Pruebas de API con base local: aplicación por lote, bloqueo, datos propios y rechazo
de detalle inválido. Navegador: cuatro combinaciones, imagen, guardar/recargar,
cancelar, Escape de ventana secundaria, arrastre/deshacer de pieza y resize del
conjunto. Comparación módulo/IIFE en contenedores 390×844, 1024×768 y 1440×900;
navegación con Entrar y salida de segmento de video en ambos motores.

Tour de prueba: `ae57f69c-2055-48a5-8823-3f666c6e53ff`.
La siguiente oleada continúa esperando la revisión del usuario.
