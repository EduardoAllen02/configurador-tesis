const { Router } = require("express");
const multer = require("multer");
const path = require("path");
const { requireAuth } = require("../middleware/auth");
const { requireTourRole } = require("../middleware/rbac");
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

router.get("/", requireTourRole("viewer"), list);
router.post("/", requireTourRole("editor"), create);
router.post("/upload-panorama", requireTourRole("editor"), upload.single("panorama"), uploadPanorama);
router.post(
  "/bulk-upload-panoramas",
  requireTourRole("editor"),
  uploadBulk.array("panoramas", 20),
  bulkUploadPanoramas
);
router.patch("/reorder", requireTourRole("editor"), reorder);
router.get("/:sceneId", requireTourRole("viewer"), getOne);
router.patch("/:sceneId", requireTourRole("editor"), update);
router.delete("/:sceneId", requireTourRole("editor"), remove);

module.exports = router;
