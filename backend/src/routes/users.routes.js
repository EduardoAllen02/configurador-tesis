const { Router } = require("express");
const { requireAuth } = require("../middleware/auth");
const { requireSuperAdmin } = require("../middleware/rbac");
const { list, getOne, update, remove } = require("../controllers/users.controller");

const router = Router();

router.use(requireAuth);

router.get("/", requireSuperAdmin, list);
router.get("/:id", getOne);
router.patch("/:id", update);
router.delete("/:id", requireSuperAdmin, remove);

module.exports = router;
