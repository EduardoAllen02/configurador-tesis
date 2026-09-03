const { Router } = require("express");
const { requireAuth } = require("../middleware/auth");
const { requireTourRole } = require("../middleware/rbac");
const { list, create, update, remove, reorder } = require("../controllers/menuItems.controller");

const router = Router({ mergeParams: true });

router.use(requireAuth);

router.get("/", requireTourRole("viewer"), list);
router.post("/", requireTourRole("editor"), create);
router.patch("/reorder", requireTourRole("editor"), reorder);
router.patch("/:menuItemId", requireTourRole("editor"), update);
router.delete("/:menuItemId", requireTourRole("editor"), remove);

module.exports = router;
