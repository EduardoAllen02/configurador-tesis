const { Router } = require("express");
const { requireAuth } = require("../middleware/auth");
const { requireTourRole } = require("../middleware/rbac");
const { list, create, update, remove } = require("../controllers/permissions.controller");

const router = Router({ mergeParams: true });

router.use(requireAuth, requireTourRole("admin_tour"));

router.get("/", list);
router.post("/", create);
router.patch("/:permissionId", update);
router.delete("/:permissionId", remove);

module.exports = router;
