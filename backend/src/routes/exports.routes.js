const { Router } = require("express");
const { requireAuth } = require("../middleware/auth");
const { requireTourRole } = require("../middleware/rbac");
const { list, create } = require("../controllers/exports.controller");

const router = Router({ mergeParams: true });

router.use(requireAuth);

router.get("/", requireTourRole("viewer"), list);
router.post("/", requireTourRole("editor"), create);

module.exports = router;
