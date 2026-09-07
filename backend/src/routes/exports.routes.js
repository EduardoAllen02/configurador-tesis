const { Router } = require("express");
const { requireAuth } = require("../middleware/auth");
const { requireTourAccess } = require("../middleware/rbac");
const { list, create } = require("../controllers/exports.controller");

const router = Router({ mergeParams: true });

router.use(requireAuth);

router.get("/", requireTourAccess(), list);
router.post("/", requireTourAccess(), create);

module.exports = router;
