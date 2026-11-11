// Reglas puras de gestión de accesos, separadas de los controladores para probarlas sin base.

// El sistema nunca debe quedarse sin superadministrador: nadie más puede devolver ese rol.
function removesLastSuperAdmin(currentRole, nextRole, superAdminCount) {
  return currentRole === "super_admin" && nextRole !== "super_admin" && superAdminCount <= 1;
}

function isValidTourRole(role) {
  return role === "cliente";
}

module.exports = { removesLastSuperAdmin, isValidTourRole };
