const { Router } = require("express");

const health = require("./health");
const auth = require("./auth.routes");
const users = require("./users.routes");
const tours = require("./tours.routes");
const scenes = require("./scenes.routes");
const hotspots = require("./hotspots.routes");
const permissions = require("./permissions.routes");

const router = Router();

router.use("/health", health);
router.use("/auth", auth);
router.use("/users", users);
router.use("/tours", tours);
// Anidadas bajo /tours/:tourId para heredar el chequeo de rol por tour.
router.use("/tours/:tourId/scenes", scenes);
router.use("/tours/:tourId/scenes/:sceneId/hotspots", hotspots);
router.use("/tours/:tourId/permissions", permissions);

module.exports = router;
