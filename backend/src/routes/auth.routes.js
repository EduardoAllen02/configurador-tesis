const { Router } = require("express");
const { requireAuth } = require("../middleware/auth");
const { register, login, me } = require("../controllers/auth.controller");

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", requireAuth, me);

module.exports = router;
