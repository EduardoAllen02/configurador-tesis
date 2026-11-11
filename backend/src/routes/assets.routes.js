const { Router } = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { requireAuth } = require("../middleware/auth");
const { requireTourAccess } = require("../middleware/rbac");
const { uploadsDir } = require("../config/env");
const { list, create, remove } = require("../controllers/assets.controller");

// A disco (no memoria): un video puede pesar hasta 200 MB. El controller valida el tamaño
// real por tipo; este tope es solo el máximo absoluto.
const tmpDir = path.join(uploadsDir, "tmp");
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      fs.mkdirSync(tmpDir, { recursive: true });
      cb(null, tmpDir);
    },
    filename: (req, file, cb) => cb(null, `asset-${Date.now()}-${Math.round(Math.random() * 1e9)}`),
  }),
  limits: { fileSize: 200 * 1024 * 1024, files: 1 },
});

function uploadFile(req, res, next) {
  upload.single("file")(req, res, (err) => {
    if (!err) return next();
    if (err.code === "LIMIT_FILE_SIZE") return res.status(400).json({ error: "El archivo supera el tamaño máximo permitido" });
    if (err instanceof multer.MulterError) return res.status(400).json({ error: "Subida inválida" });
    next(err);
  });
}

const router = Router({ mergeParams: true });

router.use(requireAuth);

router.get("/", requireTourAccess(), list);
router.post("/", requireTourAccess(), uploadFile, create);
router.delete("/:assetId", requireTourAccess(), remove);

module.exports = router;
