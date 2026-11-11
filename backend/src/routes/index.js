const { Router } = require("express");

const health = require("./health");
const auth = require("./auth.routes");
const users = require("./users.routes");
const tours = require("./tours.routes");
const scenes = require("./scenes.routes");
const hotspots = require("./hotspots.routes");
const permissions = require("./permissions.routes");
const videoUploads = require("./videoUploads.routes");
const invitations = require("./invitations.routes");
const exports_ = require("./exports.routes");
const menuItems = require("./menuItems.routes");
const assets = require("./assets.routes");

const router = Router();
router.use(require("./templates.routes"));

router.use("/health", health);
router.use("/auth", auth);
router.use("/users", users);
router.use("/tours", tours);
// Anidadas bajo /tours/:tourId para heredar el chequeo de rol por tour.
router.use("/tours/:tourId/scenes", scenes);
router.use("/tours/:tourId/scenes/:sceneId/hotspots", hotspots);
router.use("/tours/:tourId/permissions", permissions);
router.use("/tours/:tourId/video-uploads", videoUploads);
router.use("/tours/:tourId/invitations", invitations);
router.use("/tours/:tourId/exports", exports_);
router.use("/tours/:tourId/menu-items", menuItems);
router.use("/tours/:tourId/assets", assets);
// Canje de invitación: no cuelga de un tour conocido de antemano (el token lo resuelve).
router.use("/invitations", invitations.redeemRouter);

module.exports = router;
