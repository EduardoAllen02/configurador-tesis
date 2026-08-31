const app = require("./app");
const { port } = require("./config/env");

app.listen(port, () => {
  console.log(`API escuchando en http://localhost:${port}`);
});
