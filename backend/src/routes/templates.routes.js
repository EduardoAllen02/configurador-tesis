const { Router } = require("express");
const { requireAuth } = require("../middleware/auth");
const { requireTourAccess, requireGlobalRole } = require("../middleware/rbac");
const { list, create, importTemplate } = require("../controllers/templates.controller");
const router = Router();
router.get("/templates", requireAuth, list);
router.post("/tours/:tourId/templates", requireAuth, requireGlobalRole(["admin", "super_admin"]), create);
router.post("/tours/:tourId/templates/:templateId/import", requireAuth, requireTourAccess(), importTemplate);
module.exports = router;
