const { Router } = require("express");
const multer = require("multer");
const { requireAuth } = require("../middleware/auth");
const { requireTourAccess } = require("../middleware/rbac");
const { list, create, update, remove } = require("../controllers/hotspots.controller");

// Imagen opcional de hotspot: un solo archivo, chico — memoria basta (mismo patrón que
// upload-panorama). Multer solo intercepta requests multipart/form-data; una request JSON
// normal (sin imagen) pasa de largo sin efecto, así que esto no rompe el flujo existente.
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

const router = Router({ mergeParams: true });

router.use(requireAuth);

router.get("/", requireTourAccess(), list);
router.post("/", requireTourAccess(), upload.single("image"), create);
router.patch("/:hotspotId", requireTourAccess(), upload.single("image"), update);
router.delete("/:hotspotId", requireTourAccess(), remove);

module.exports = router;
