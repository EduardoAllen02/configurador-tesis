const prisma = require("../config/prisma");

// Jerarquía de roles por tour: admin_tour > editor > viewer.
// requireTourRole("editor") deja pasar a admin_tour y a editor, pero no a viewer.
const TOUR_ROLE_RANK = { viewer: 0, editor: 1, admin_tour: 2 };

// Requiere que req.user tenga, como mínimo, `minRole` sobre el tour de req.params.tourId.
// super_admin (User.isSuperAdmin) siempre pasa.
function requireTourRole(minRole) {
  return async (req, res, next) => {
    try {
      const user = await prisma.user.findUnique({ where: { id: req.user.id } });
      if (user?.isSuperAdmin) return next();

      const { tourId } = req.params;
      const permission = await prisma.tourPermission.findUnique({
        where: { tourId_userId: { tourId, userId: req.user.id } },
      });

      if (!permission || TOUR_ROLE_RANK[permission.role] < TOUR_ROLE_RANK[minRole]) {
        return res.status(403).json({ error: "No tienes permisos suficientes sobre este tour" });
      }
      req.tourRole = permission.role;
      next();
    } catch (err) {
      next(err);
    }
  };
}

// Requiere que req.user sea super_admin.
function requireSuperAdmin(req, res, next) {
  prisma.user
    .findUnique({ where: { id: req.user.id } })
    .then((user) => {
      if (!user?.isSuperAdmin) {
        return res.status(403).json({ error: "Requiere privilegios de administrador del sistema" });
      }
      next();
    })
    .catch(next);
}

module.exports = { requireTourRole, requireSuperAdmin };
