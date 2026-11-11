const path = require("path");
require("dotenv").config();

module.exports = {
  port: process.env.PORT || 4000,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  uploadsDir: process.env.UPLOADS_DIR || "./uploads",
  exportsDir: process.env.EXPORTS_DIR || "./exports",
  // Motor del tour ya compilado (npm run build:runtime en frontend/); lo copia el export.
  runtimeDistDir: process.env.RUNTIME_DIST_DIR || path.resolve(__dirname, "../../../frontend/dist-runtime"),
};
