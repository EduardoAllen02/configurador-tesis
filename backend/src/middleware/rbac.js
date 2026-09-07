const prisma = require("../config/prisma");

// Requiere que req.user tenga uno de los roles globales dados (User.globalRole).
// Uso: requireGlobalRole(["super_admin"]) o requireGlobalRole(["admin", "super_admin"]).
function requireGlobalRole(roles) {
  return async (req, res, next) => {
    try {
      const user = await prisma.user.findUnique({ where: { id: req.user.id } });
      if (!user || !roles.includes(user.globalRole)) {
        return res.status(403).json({ error: "No tienes privilegios suficientes" });
      }
      req.globalRole = user.globalRole;
      next();
    } catch (err) {
      next(err);
    }
  };
}

// Acceso a un tour puntual (req.params.tourId): pasa si el usuario es cliente o dev en
// ESE tour, o si es Admin/Superadmin global (que operan sobre cualquier tour sin
// necesitar una fila de TourPermission). Cliente y Dev ven y editan igual — no hay tier
// de solo lectura por tour en este modelo (a diferencia del admin_tour/editor/viewer de
// Fase 0); la única distinción entre ambos es el acceso a código personalizado, ver
// requireDevAccess.
function requireTourAccess() {
  return async (req, res, next) => {
    try {
      const user = await prisma.user.findUnique({ where: { id: req.user.id } });
      if (user?.globalRole === "admin" || user?.globalRole === "super_admin") {
        req.globalRole = user.globalRole;
        return next();
      }

      const { tourId } = req.params;
      const permission = await prisma.tourPermission.findUnique({
        where: { tourId_userId: { tourId, userId: req.user.id } },
      });
      if (!permission) {
        return res.status(403).json({ error: "No tienes permisos suficientes sobre este tour" });
      }
      req.tourRole = permission.role;
      next();
    } catch (err) {
      next(err);
    }
  };
}

// Como requireTourAccess, pero solo deja pasar a dev (o Admin/Superadmin global) — para
// los endpoints de código personalizado (Tour.customCss/customJs).
function requireDevAccess() {
  return async (req, res, next) => {
    try {
      const user = await prisma.user.findUnique({ where: { id: req.user.id } });
      if (user?.globalRole === "admin" || user?.globalRole === "super_admin") {
        req.globalRole = user.globalRole;
        return next();
      }

      const { tourId } = req.params;
      const permission = await prisma.tourPermission.findUnique({
        where: { tourId_userId: { tourId, userId: req.user.id } },
      });
      if (permission?.role !== "dev") {
        return res.status(403).json({ error: "Requiere rol dev sobre este tour" });
      }
      req.tourRole = permission.role;
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = { requireGlobalRole, requireTourAccess, requireDevAccess };
