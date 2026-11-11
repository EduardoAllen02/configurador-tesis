const app = require("./app");
const { port } = require("./config/env");
const { resumePending } = require("./services/tiling");

app.listen(port, () => {
  console.log(`API escuchando en http://localhost:${port}`);
  // Mosaicos que quedaron a medias si el servidor se cerró: se reintentan.
  resumePending()
    .then((n) => n && console.log(`[mosaicos] reanudando ${n} escena(s) pendientes`))
    .catch((err) => console.error("[mosaicos] no se pudo reanudar la cola", err));
});
