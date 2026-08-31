const { Router } = require("express");
const multer = require("multer");
const { requireAuth } = require("../middleware/auth");
const { requireTourRole } = require("../middleware/rbac");
const {
  list,
  create,
  uploadPanorama,
  getOne,
  update,
  remove,
  reorder,
} = require("../controllers/scenes.controller");

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

const router = Router({ mergeParams: true });

router.use(requireAuth);

router.get("/", requireTourRole("viewer"), list);
router.post("/", requireTourRole("editor"), create);
router.post("/upload-panorama", requireTourRole("editor"), upload.single("panorama"), uploadPanorama);
router.patch("/reorder", requireTourRole("editor"), reorder);
router.get("/:sceneId", requireTourRole("viewer"), getOne);
router.patch("/:sceneId", requireTourRole("editor"), update);
router.delete("/:sceneId", requireTourRole("editor"), remove);

module.exports = router;
