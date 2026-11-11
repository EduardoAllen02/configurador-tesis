# Tour Studio

Para retomar trabajo: [contexto condensado para agentes](docs/CONTEXTO_PARA_AGENTES.md).

Sistema web para configurar tours virtuales 360°, con dos modos de navegación
que comparten la misma base técnica:

- **Video 360° procesado**: navegación continua sobre una secuencia de frames
  extraídos de un video 360° (FFmpeg) y optimizados a WebP (Sharp).
- **Panorámicas subidas directo**: navegación discreta entre panorámicas
  estáticas, saltando de escena a escena vía hotspots.

## Stack

- **Backend**: Node.js + Express + PostgreSQL + Prisma, auth JWT + RBAC por tour.
- **Frontend**: React + Vite + Three.js.
- **Procesamiento de video**: FFmpeg (extracción de frames) + Sharp (WebP).

## Estructura

```
backend/    API REST (tours, escenas, hotspots, usuarios, permisos)
frontend/   Visor 360°, editor de contenido y estudio de interfaz
```

## Desarrollo local

### Base de datos

```bash
docker compose up -d db
```

Alternativa sin Docker: una instalación nativa de PostgreSQL 16+ funciona igual,
siempre que exista un rol/base que coincida con `DATABASE_URL` en `.env`
(por defecto usuario/clave `tours`, base `tour_studio`).

### Backend

```bash
cd backend
npm install
cp .env.example .env
npx prisma migrate dev --name init
node prisma/seed.js
npm run dev
```

API disponible en `http://localhost:4000`. `bash scripts/smoke-test.sh` corre un
smoke test manual de auth/RBAC/tours/escenas/hotspots contra el servidor local.

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

## Estado del proyecto

Rama comercial para Andrea/Interiors3D. Última revisión: **19 de octubre de 2026**.
Oleadas 0–3 integradas; Oleada 3.5 implementada y pendiente de aceptación de Edd.
Incluye detalle opcional por hotspot: tarjeta expandible o panel fijo, apertura al
pulsar o permanente, tres recetas y edición de piezas desde Contenido. Ver
[refactor del detalle](docs/PLAN_REFACTOR_DETALLE_HOTSPOT.md).
La Oleada 4 espera aceptación
manual. El nombre de la rama Git es `master`; no hay una rama Git llamada Andrea.

Ver [contrato 3.5](docs/CONTRATO_OLEADA3_5.md),
[checklist de aceptación](docs/CHECKLIST_OLEADA3_5.md) y
[estado y verificaciones](docs/ESTADO_PROYECTO.md). El [plan general](docs/PLAN_PERSONALIZACION_UI.md)
conserva las fases posteriores.

Base compartida + MVP: modelo de datos, API REST con auth/RBAC, visor +
editor de escenas/hotspots, subida de video 360° conectada al pipeline
FFmpeg+Sharp (crea una escena `video_frame` por frame extraído), compartición
por enlace (invitaciones con rol predefinido, canjeables por cualquier usuario
autenticado) y exportación como bundle web estático autocontenido
(`POST /api/tours/:id/exports`, servido en `/exports/:id/v:n/index.html`,
publicable en cualquier servidor de archivos estáticos). Visor, editor y export
usan el mismo motor JavaScript, con Three.js y fuentes incluidos en el bundle.

La personalización incluye plantillas de hotspots, segmentos/keyframes de video,
nadir, mosaicos AVIF, pantalla de inicio y un editor visual con biblioteca,
selección, arrastre, redimensionamiento, guías, capas, deshacer y guardado automático.
La Oleada 3.5 añade temas que conservan el diseño, ventana flotante, iconos por
categorías, acabado configurable, progreso real, grupos con piezas editables,
tipografía ampliada, visibilidad por escena, capa 2D en Contenido y paneles
reutilizables enlazados a los datos de los hotspots.

La revisión de aceptación añade arrastre independiente de tarjetas de hotspot,
ventanas de configuración compartidas de 440 px, Contenido al ancho disponible,
edición del título de barra y un único interruptor de Inicio. Las barras son
globales; la de cuadros solo se muestra a visitantes en videos 360°.

## Verificación

```bash
cd frontend
npm test
npm run build
npm run build:runtime
```

El export necesita `frontend/dist-runtime/`, generado por `build:runtime`.

```bash
cd backend
npm test
npx prisma migrate status
bash scripts/smoke-test.sh
```

El smoke test requiere la API y PostgreSQL activos; crea y elimina sus propios
datos de prueba. Las pruebas unitarias del frontend no sustituyen la checklist
visual de editor, móvil y export.

Pendiente de la Oleada 4: pisos/planos, editor de traducciones, piloto automático,
límites de cámara por escena, video 360° desde un hotspot y recreación Colombini.
Chatbot/wishlist, colaboración en tiempo real y edición asistida por IA pertenecen
a fases posteriores.
