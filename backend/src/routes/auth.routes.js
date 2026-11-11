const { Router } = require("express");
const { requireAuth } = require("../middleware/auth");
const { register, login, me, forgotPassword, resetPassword } = require("../controllers/auth.controller");

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/forgot-password", async (req, res, next) => { try { await forgotPassword(req, res); } catch (error) { next(error); } });
router.post("/reset-password", resetPassword);
router.get("/me", requireAuth, me);

module.exports = router;
