const { Router } = require("express");
const { requireAuth } = require("../middleware/auth");
const { requireTourAccess } = require("../middleware/rbac");
const { list, create, update, remove, reorder } = require("../controllers/menuItems.controller");

const router = Router({ mergeParams: true });

router.use(requireAuth);

router.get("/", requireTourAccess(), list);
router.post("/", requireTourAccess(), create);
router.patch("/reorder", requireTourAccess(), reorder);
router.patch("/:menuItemId", requireTourAccess(), update);
router.delete("/:menuItemId", requireTourAccess(), remove);

module.exports = router;
