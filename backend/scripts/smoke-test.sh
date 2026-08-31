#!/usr/bin/env bash
# Smoke test manual de la API: auth, RBAC, tours, escenas, hotspots, permisos.
# Requiere el servidor corriendo (npm run dev) y la base de datos migrada + seedeada.
set -euo pipefail

BASE="${API_URL:-http://localhost:4000}/api"

echo "== health =="
curl -sf "$BASE/health"; echo

echo "== login usuario seed =="
LOGIN=$(curl -sf -X POST "$BASE/auth/login" -H "Content-Type: application/json" \
  -d '{"email":"demo@tourstudio.local","password":"demo1234"}')
TOKEN=$(node -e "console.log(JSON.parse(process.argv[1]).token)" "$LOGIN")

echo "== /auth/me =="
curl -sf "$BASE/auth/me" -H "Authorization: Bearer $TOKEN"; echo

echo "== registrar segundo usuario sin permisos =="
REG2=$(curl -sf -X POST "$BASE/auth/register" -H "Content-Type: application/json" \
  -d '{"email":"smoke-otro@tourstudio.local","password":"otro1234","fullName":"Otro"}')
TOKEN2=$(node -e "console.log(JSON.parse(process.argv[1]).token)" "$REG2")

echo "== GET /tours (usuario seed) =="
TOURS=$(curl -sf "$BASE/tours" -H "Authorization: Bearer $TOKEN")
echo "$TOURS"
TOUR_ID=$(node -e "console.log(JSON.parse(process.argv[1])[0].id)" "$TOURS")

echo "== PATCH tour sin permiso -> se espera 403 =="
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH "$BASE/tours/$TOUR_ID" \
  -H "Authorization: Bearer $TOKEN2" -H "Content-Type: application/json" -d '{"title":"hack"}')
[ "$STATUS" = "403" ] && echo "OK 403" || { echo "FALLÓ: esperaba 403, obtuve $STATUS"; exit 1; }

echo "== GET /tours sin token -> se espera 401 =="
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/tours")
[ "$STATUS" = "401" ] && echo "OK 401" || { echo "FALLÓ: esperaba 401, obtuve $STATUS"; exit 1; }

echo "== GET tour con escenas =="
curl -sf "$BASE/tours/$TOUR_ID" -H "Authorization: Bearer $TOKEN"; echo

echo "Smoke test OK"
