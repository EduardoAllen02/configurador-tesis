# Tour Studio

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
frontend/   Visor 360° y editor de escenas/hotspots
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

## Alcance actual

Este repositorio contiene la fundación compartida: modelo de datos, API REST
con auth/RBAC, y el visor + editor básico de escenas/hotspots. Fuera de este
alcance por ahora: canje de invitaciones, exportación como bundle web, subida
de video conectada al pipeline de procesamiento, y cualquier feature de
personalización avanzada.
