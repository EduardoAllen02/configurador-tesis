const { Router } = require("express");
const { requireAuth } = require("../middleware/auth");
const { requireGlobalRole } = require("../middleware/rbac");
const { list, create, remove, redeem } = require("../controllers/invitations.controller");

// Nido bajo /tours/:tourId/invitations — crear/listar/revocar es exclusivo de
// Admin/Superadmin, igual que permissions.routes.js (mismo criterio: gestionar acceso a
// un tour no es parte de lo que puede hacer su cliente).
const router = Router({ mergeParams: true });
router.use(requireAuth, requireGlobalRole(["admin", "super_admin"]));
router.get("/", list);
router.post("/", create);
router.delete("/:invitationId", remove);

// Standalone en /invitations/:token/redeem — el token es la autorización, no el tour.
const redeemRouter = Router();
redeemRouter.post("/:token/redeem", requireAuth, redeem);

module.exports = router;
module.exports.redeemRouter = redeemRouter;
