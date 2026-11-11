# Menú de clic derecho por tour

Implementado el 21 de octubre de 2026. Se configura en **Contenido → Ajustes del
recorrido → Menú de clic derecho**. Está desactivado por defecto, tanto en tours
nuevos como en documentos anteriores que no contienen esta sección.

## Comportamiento y configuración

- Hasta ocho opciones, con texto editable, orden, agregar y quitar.
- Acciones: entrar/salir de pantalla completa, restablecer la orientación inicial
  de la escena y zoom a 75°, y abrir un enlace en otra pestaña.
- Crédito opcional `Created by {nombre}`, con enlace opcional. Sin nombre no se
  presenta una fila vacía. El crédito no cuenta como una de las ocho opciones.
- El navegador debe permitir pantalla completa; si no, se omite esa acción.
  Los enlaces incompletos no se presentan. Un menú sin opciones ni crédito
  conserva el menú nativo del navegador.
- Guardado automático en el almacén Design del tour, con historial y reintento
  ante error de red. Direcciones incompletas se mantienen localmente en el campo
  hasta corregirlas y salir de él; no sustituyen la última dirección válida.
- La configuración no se incluye al guardar/aplicar plantillas compartidas.

```json
{
  "contextMenu": {
    "enabled": true,
    "items": [
      { "id": "fullscreen", "type": "fullscreen", "label": "" },
      { "id": "reset-view", "type": "reset-view", "label": "" },
      { "id": "website", "type": "link", "label": "Nuestro sitio", "url": "https://example.com/" }
    ],
    "credit": { "enabled": true, "name": "Organización", "url": "https://example.com/" }
  }
}
```

`label` vacío usa la etiqueta estándar. Solo se aceptan enlaces absolutos HTTP/S.
La API valida tipos, identificadores únicos, longitudes y el límite de opciones.
El runtime vuelve a filtrar documentos externos antes de crear enlaces y siempre
usa `textContent`, `noopener` y `noreferrer`.

## Integración

`runtime/model/contextMenu.js` concentra valores por defecto, acciones disponibles,
enlaces y posición. `runtime/screens/contextMenu.js` posee únicamente presentación,
foco y apertura temporal; no guarda configuración ni modifica el documento.
`tourRuntime.js` lo conecta con cámara, documento, escenas y ciclo de vida.
`ContextMenuSettings.jsx` escribe en el almacén Design existente.

El menú se limita al fondo de la panorámica; no captura clic derecho sobre
hotspots, controles, formularios ni la pantalla de inicio. En edición el clic
derecho sigue abriendo **Agregar hotspot**. En **Probar**, vista previa y exportado
usa el mismo menú del visitante. Cambios de documento/escena/modo, resize,
desplazamiento exterior, clic fuera y Escape lo cierran. Admite flechas, Home/End,
Enter, espacio y Tab; el clic derecho no captura ni gira la cámara.

Las futuras acciones deben conectarse a una capacidad real del visor. Este cambio
no incorpora un sistema de audio del recorrido ni un nuevo modo de control de
cámara; por tanto no presenta botones de sonido o control sin funcionamiento.

## Verificación

- 486 pruebas frontend en 51 archivos y 12 pruebas backend correctas.
- Builds app y runtime correctos. Permanece el aviso previo de tamaño del bundle.
- Chrome real mediante la skill `browser-cdp`, sin emular viewport: 1278×697 y
  1040×697 al 100 %; capturas inspeccionadas visualmente.
- Activación, campos, validación de URL, ordenar, quitar, límite de ocho, guardado
  y recarga operados desde la UI en un tour independiente de QA. Configuración
  de otro tour comprobada sin cambios.
- Vista previa: cuatro esquinas, teclado/Escape, arrastre normal, clic derecho sin
  giro, restablecer cámara/zoom, pantalla completa y salir, enlaces de opción y
  crédito en pestañas nuevas, cierre por escena y resize. Sin errores JS capturados.
- Desactivar restaura el menú nativo; edición conserva Agregar hotspot sin crear
  un registro; Probar presenta el menú del visitante.
- Exportado local v4 del tour QA `3eec977d-ede6-4f9b-ae10-2e990c579d66` comprobado
  en CDP. JS y CSS del bundle coinciden por SHA-256 con el build vigente.

Evidencia local, ignorada por Git, en `backend/exports/qa-oleada35/`:
`202-context-menu-settings.png`, `203-context-menu-preview.png`,
`204-context-menu-laptop-1040.png`, `205-context-menu-probar.png`,
`206-context-menu-export.png`, `context-menu-runtime-report.json` y
`context-menu-export-report.json`. No se publicó externamente ni se hizo push.
