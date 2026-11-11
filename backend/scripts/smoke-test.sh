#!/usr/bin/env bash
# Smoke test manual de la API: auth, RBAC, tours, escenas, hotspots, permisos, documento,
# diseño y export. Crea su PROPIO tour y sus usuarios, y al terminar los borra (aunque falle).
# Requiere el servidor corriendo y la base migrada + seedeada (usuario admin@admin.com).
#   BASE=http://localhost:4001/api bash scripts/smoke-test.sh
set -euo pipefail

BASE="${BASE:-http://localhost:4000/api}"
ORIGIN="${BASE%/api}"
RUN_ID=$(date +%s)$RANDOM

json() { node -e "const v=JSON.parse(process.argv[1]);const r=($2);console.log(typeof r==='object'?JSON.stringify(r):r)" "$1"; }
expect_status() { # esperado, obtenido, descripción
  [ "$1" = "$2" ] && echo "OK $2 ($3)" || { echo "FALLÓ ($3): esperaba $1, obtuve $2"; exit 1; }
}

TOKEN=""; TOUR_ID=""; USER2_ID=""; USER3_ID=""
cleanup() {
  code=$?
  set +e
  if [ -n "$TOKEN" ]; then
    [ -n "$TOUR_ID" ] && curl -s -o /dev/null -X DELETE "$BASE/tours/$TOUR_ID" -H "Authorization: Bearer $TOKEN"
    [ -n "$USER2_ID" ] && curl -s -o /dev/null -X DELETE "$BASE/users/$USER2_ID" -H "Authorization: Bearer $TOKEN"
    [ -n "$USER3_ID" ] && curl -s -o /dev/null -X DELETE "$BASE/users/$USER3_ID" -H "Authorization: Bearer $TOKEN"
    echo "(limpieza: tour y usuarios del smoke test borrados)"
  fi
  [ $code -ne 0 ] && echo "Smoke test FALLÓ"
  exit $code
}
trap cleanup EXIT

echo "== health =="
curl -sf "$BASE/health"; echo

echo "== login usuario seed =="
LOGIN=$(curl -sf -X POST "$BASE/auth/login" -H "Content-Type: application/json" \
  -d '{"email":"admin@admin.com","password":"admin123"}')
TOKEN=$(json "$LOGIN" "v.token")
AUTH="Authorization: Bearer $TOKEN"

echo "== /auth/me =="
curl -sf "$BASE/auth/me" -H "$AUTH"; echo

echo "== crear tour propio del smoke test =="
TOUR=$(curl -sf -X POST "$BASE/tours" -H "$AUTH" -H "Content-Type: application/json" \
  -d "{\"title\":\"Smoke $RUN_ID\"}")
TOUR_ID=$(json "$TOUR" "v.id")
echo "tour $TOUR_ID"

echo "== registrar segundo usuario sin permisos =="
REG2=$(curl -sf -X POST "$BASE/auth/register" -H "Content-Type: application/json" \
  -d "{\"email\":\"smoke-otro-$RUN_ID@tourstudio.local\",\"password\":\"otro1234\",\"fullName\":\"Otro\"}")
TOKEN2=$(json "$REG2" "v.token")
USER2_ID=$(json "$REG2" "v.user.id")

echo "== GET /tours (usuario seed) =="
curl -sf "$BASE/tours" -H "$AUTH" | head -c 300; echo

STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH "$BASE/tours/$TOUR_ID" \
  -H "Authorization: Bearer $TOKEN2" -H "Content-Type: application/json" -d '{"title":"hack"}')
expect_status 403 "$STATUS" "PATCH tour sin permiso"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/tours")
expect_status 401 "$STATUS" "GET /tours sin token"

echo "== GET tour con escenas =="
curl -sf "$BASE/tours/$TOUR_ID" -H "$AUTH"; echo

echo "== crear invitación role=cliente y canjearla con un tercer usuario =="
INV=$(curl -sf -X POST "$BASE/tours/$TOUR_ID/invitations" -H "$AUTH" \
  -H "Content-Type: application/json" -d '{"role":"cliente"}')
INV_TOKEN=$(json "$INV" "v.token")

REG3=$(curl -sf -X POST "$BASE/auth/register" -H "Content-Type: application/json" \
  -d "{\"email\":\"smoke-invitado-$RUN_ID@tourstudio.local\",\"password\":\"invitado123\",\"fullName\":\"Invitado\"}")
TOKEN3=$(json "$REG3" "v.token")
USER3_ID=$(json "$REG3" "v.user.id")

curl -sf -X POST "$BASE/invitations/$INV_TOKEN/redeem" -H "Authorization: Bearer $TOKEN3"; echo

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/tours/$TOUR_ID" -H "Authorization: Bearer $TOKEN3")
expect_status 200 "$STATUS" "invitado ahora tiene acceso"

echo "== escena + hotspots (uno con título hostil) =="
SCENE=$(curl -sf -X POST "$BASE/tours/$TOUR_ID/scenes" -H "$AUTH" -H "Content-Type: application/json" \
  -d '{"name":"Sala","origen":"panorama_upload","webpPath":"/uploads/panoramas/no-existe.webp"}')
SCENE_ID=$(json "$SCENE" "v.id")
HS=$(curl -sf -X POST "$BASE/tours/$TOUR_ID/scenes/$SCENE_ID/hotspots" -H "$AUTH" -H "Content-Type: application/json" \
  -d '{"type":"info","lon":10,"lat":5,"title":"</script><b>x","style":{"template":"circle-icon","props":{"size":40}},"locked":true,"segments":[[0,3]]}')
HS_ID=$(json "$HS" "v.id")
[ "$(json "$HS" "v.locked")" = "true" ] && echo "OK hotspot guarda locked/style/segments" || { echo "FALLÓ: locked"; exit 1; }

STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH "$BASE/tours/$TOUR_ID/scenes/$SCENE_ID/hotspots/$HS_ID" \
  -H "$AUTH" -H "Content-Type: application/json" -d '{"style":"no-es-json"}')
expect_status 400 "$STATUS" "hotspot style inválido"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$BASE/tours/$TOUR_ID/scenes/$SCENE_ID/hotspots/00000000-0000-0000-0000-000000000000" -H "$AUTH")
expect_status 404 "$STATUS" "borrar hotspot inexistente"

echo "== GET /document =="
DOC=$(curl -sf "$BASE/tours/$TOUR_ID/document" -H "$AUTH")
[ "$(json "$DOC" "v.schema")" = "1" ] && echo "OK schema 1" || { echo "FALLÓ: schema"; exit 1; }
[ "$(json "$DOC" "v.design.version")" = "1" ] && echo "OK design presente" || { echo "FALLÓ: design"; exit 1; }
[ "$(json "$DOC" "v.scenes[0].label")" = "Sala" ] && echo "OK scenes[0].label" || { echo "FALLÓ: label"; exit 1; }
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/tours/$TOUR_ID/document" -H "Authorization: Bearer $TOKEN2")
expect_status 403 "$STATUS" "document sin permiso"

echo "== PATCH /design =="
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH "$BASE/tours/$TOUR_ID/design" -H "$AUTH" \
  -H "Content-Type: application/json" -d '{"version":2,"cosa":1}')
expect_status 400 "$STATUS" "design inválido"
SAVED=$(curl -sf -X PATCH "$BASE/tours/$TOUR_ID/design" -H "$AUTH" -H "Content-Type: application/json" \
  -d '{"version":1,"brand":{"colors":["#ff0000","#ffffff","#111111"],"radius":12}}')
[ "$(json "$SAVED" "v.brand.colors[0]")" = "#ff0000" ] && echo "OK design guardado" || { echo "FALLÓ: design guardado"; exit 1; }

echo "== generar export del tour =="
EXP=$(curl -sf -X POST "$BASE/tours/$TOUR_ID/exports" -H "$AUTH")
echo "$EXP"
BUNDLE=$(json "$EXP" "v.bundlePath")
for f in index.html tour-data.js; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$ORIGIN$BUNDLE/$f")
  expect_status 200 "$STATUS" "bundle contiene $f"
done
TOUR_DATA=$(curl -sf "$ORIGIN$BUNDLE/tour-data.js")
echo "$TOUR_DATA" | grep -qF "u003c/script>" && echo "OK título hostil escapado en tour-data.js" || { echo "FALLÓ: escape de </script>: $TOUR_DATA"; exit 1; }

echo "Smoke test OK"
