const { Router } = require("express");
const multer = require("multer");
const path = require("path");
const { requireAuth } = require("../middleware/auth");
const { requireTourAccess } = require("../middleware/rbac");
const { uploadsDir } = require("../config/env");
const { list, create } = require("../controllers/videoUploads.controller");

const storage = multer.diskStorage({
  destination: path.join(uploadsDir, "videos"),
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e6)}${path.extname(file.originalname)}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 500 * 1024 * 1024 } });

const router = Router({ mergeParams: true });

router.use(requireAuth);

router.get("/", requireTourAccess(), list);
router.post("/", requireTourAccess(), upload.single("video"), create);

module.exports = router;
