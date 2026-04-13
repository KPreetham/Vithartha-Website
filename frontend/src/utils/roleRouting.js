export const normalizeRole = (role) => String(role || "").trim().toLowerCase();

export const getDashboardPathByRole = (role) => {
  const normalized = normalizeRole(role);

  if (normalized === "admin") return "/admin";
  if (normalized === "pr") return "/pr-dashboard";
  if (normalized === "executor") return "/executor-dashboard";
  return "/dashboard";
};

export const roleAllowed = (userRole, allowedRoles = []) => {
  if (!Array.isArray(allowedRoles) || allowedRoles.length === 0) return true;
  const normalizedUserRole = normalizeRole(userRole);
  const normalizedAllowedRoles = allowedRoles.map(normalizeRole);
  return normalizedAllowedRoles.includes(normalizedUserRole);
};
