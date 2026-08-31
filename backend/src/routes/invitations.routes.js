const { Router } = require("express");
const { requireAuth } = require("../middleware/auth");
const { requireTourRole } = require("../middleware/rbac");
const { list, create, remove, redeem } = require("../controllers/invitations.controller");

// Nido bajo /tours/:tourId/invitations — crear/listar/revocar requiere admin_tour.
const router = Router({ mergeParams: true });
router.use(requireAuth, requireTourRole("admin_tour"));
router.get("/", list);
router.post("/", create);
router.delete("/:invitationId", remove);

// Standalone en /invitations/:token/redeem — el token es la autorización, no el tour.
const redeemRouter = Router();
redeemRouter.post("/:token/redeem", requireAuth, redeem);

module.exports = router;
module.exports.redeemRouter = redeemRouter;
