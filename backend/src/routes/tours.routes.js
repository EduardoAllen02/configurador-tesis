const { Router } = require("express");
const { requireAuth } = require("../middleware/auth");
const { requireTourRole } = require("../middleware/rbac");
const { list, create, getOne, update, remove } = require("../controllers/tours.controller");

const router = Router();

router.use(requireAuth);

router.get("/", list);
router.post("/", create);
router.get("/:tourId", requireTourRole("viewer"), getOne);
router.patch("/:tourId", requireTourRole("editor"), update);
router.delete("/:tourId", requireTourRole("admin_tour"), remove);

module.exports = router;
