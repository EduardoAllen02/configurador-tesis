const { Router } = require("express");
const { requireAuth } = require("../middleware/auth");
const { requireGlobalRole } = require("../middleware/rbac");
const { list, create, update, remove } = require("../controllers/permissions.controller");

const router = Router({ mergeParams: true });

// Gestionar quién tiene acceso a un tour (asignar/quitar cliente) es exclusivo de
// Admin/Superadmin en este modelo — Cliente no puede invitar a nadie a su propio
// tour (decisión explícita, ver PLAN_DESARROLLO_FASE2.md sección 3.3).
router.use(requireAuth, requireGlobalRole(["admin", "super_admin"]));

router.get("/", list);
router.post("/", create);
router.patch("/:permissionId", update);
router.delete("/:permissionId", remove);

module.exports = router;
