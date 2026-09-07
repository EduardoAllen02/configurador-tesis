const { Router } = require("express");
const { requireAuth } = require("../middleware/auth");
const { requireGlobalRole } = require("../middleware/rbac");
const { list, getOne, update, remove, updateRole } = require("../controllers/users.controller");

const router = Router();

router.use(requireAuth);

router.get("/", requireGlobalRole(["admin", "super_admin"]), list);
router.get("/:id", getOne);
router.patch("/:id", update);
router.patch("/:id/role", requireGlobalRole(["super_admin"]), updateRole);
router.delete("/:id", requireGlobalRole(["super_admin"]), remove);

module.exports = router;
