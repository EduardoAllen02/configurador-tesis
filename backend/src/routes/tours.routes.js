const { Router } = require("express");
const { requireAuth } = require("../middleware/auth");
const { requireGlobalRole, requireTourAccess, requireDevAccess } = require("../middleware/rbac");
const { list, create, getOne, update, remove, updateCustomCode } = require("../controllers/tours.controller");

const router = Router();

router.use(requireAuth);

router.get("/", list);
router.post("/", requireGlobalRole(["admin", "super_admin"]), create);
router.get("/:tourId", requireTourAccess(), getOne);
router.patch("/:tourId", requireTourAccess(), update);
router.patch("/:tourId/custom-code", requireDevAccess(), updateCustomCode);
// Borrado de un tour es irreversible — solo Superadmin (Admin puede editar cualquier
// tour pero no puede destruir datos de forma permanente, ver PLAN_DESARROLLO_FASE2.md).
router.delete("/:tourId", requireGlobalRole(["super_admin"]), remove);

module.exports = router;
