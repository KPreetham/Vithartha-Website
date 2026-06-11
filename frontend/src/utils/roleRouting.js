export const normalizeRole = (role) => String(role || "").trim().toLowerCase();

export const getDashboardPathByRole = (role) => {
  const normalized = normalizeRole(role);

  if (normalized === "admin")    return "/admin";
  if (normalized === "pr")       return "/pr-dashboard";
  if (normalized === "executor" || /^executor\d+$/.test(normalized)) return "/executor-dashboard";
  return "/dashboard";
};

export const roleAllowed = (userRole, allowedRoles = []) => {
  if (!Array.isArray(allowedRoles) || allowedRoles.length === 0) return true;
  const normalizedUserRole = normalizeRole(userRole);
  const normalizedAllowedRoles = allowedRoles.map(normalizeRole);
  if (normalizedAllowedRoles.includes(normalizedUserRole)) return true;
  // "executorN" in allowedRoles acts as a wildcard for any executor\d+ role
  if (normalizedAllowedRoles.includes("executorn") && /^executor\d+$/.test(normalizedUserRole)) return true;
  return false;
};
