const { Router } = require("express");
const multer = require("multer");
const path = require("path");
const { requireAuth } = require("../middleware/auth");
const { requireTourAccess } = require("../middleware/rbac");
const { uploadsDir } = require("../config/env");
const {
  list,
  create,
  uploadPanorama,
  bulkUploadPanoramas,
  getOne,
  update,
  remove,
  reorder,
} = require("../controllers/scenes.controller");

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

// La subida masiva pasa por disco, no memoria: 20 archivos de hasta 20MB cada uno en RAM
// a la vez sería excesivo. Se procesan uno por uno y se borran del tmp tras convertir a WebP.
const bulkStorage = multer.diskStorage({
  destination: path.join(uploadsDir, "tmp"),
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e6)}${path.extname(file.originalname)}`);
  },
});
const uploadBulk = multer({ storage: bulkStorage, limits: { fileSize: 20 * 1024 * 1024, files: 20 } });

const router = Router({ mergeParams: true });

router.use(requireAuth);

router.get("/", requireTourAccess(), list);
router.post("/", requireTourAccess(), create);
router.post("/upload-panorama", requireTourAccess(), upload.single("panorama"), uploadPanorama);
router.post(
  "/bulk-upload-panoramas",
  requireTourAccess(),
  uploadBulk.array("panoramas", 20),
  bulkUploadPanoramas
);
router.patch("/reorder", requireTourAccess(), reorder);
router.get("/:sceneId", requireTourAccess(), getOne);
router.patch("/:sceneId", requireTourAccess(), update);
router.delete("/:sceneId", requireTourAccess(), remove);

module.exports = router;
