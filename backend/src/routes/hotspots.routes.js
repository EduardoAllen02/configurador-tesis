const { Router } = require("express");
const { requireAuth } = require("../middleware/auth");
const { requireTourRole } = require("../middleware/rbac");
const { list, create, update, remove } = require("../controllers/hotspots.controller");

const router = Router({ mergeParams: true });

router.use(requireAuth);

router.get("/", requireTourRole("viewer"), list);
router.post("/", requireTourRole("editor"), create);
router.patch("/:hotspotId", requireTourRole("editor"), update);
router.delete("/:hotspotId", requireTourRole("editor"), remove);

module.exports = router;
