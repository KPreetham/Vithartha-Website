// Numbered PR accounts (pr1, pr2, ...) all act as the "pr" role.
export const normalizeRole = (role) => {
  const normalized = String(role || "").trim().toLowerCase();
  return /^pr\d+$/.test(normalized) ? "pr" : normalized;
};

// Returns an error message when `role` is not assignable from the admin
// "Manage PR & Executor" form, or "" when it is valid (pr1, pr2, executor1, ...).
export const getAssignableRoleError = (role) => {
  const value = String(role || "").trim().toLowerCase();
  if (/^pr\d+$/.test(value) || /^executor\d+$/.test(value)) return "";
  if (value === "pr") return "PR role must include a number, e.g. pr1, pr2, pr3 …";
  if (value === "executor") return "Executor role must include a number, e.g. executor1, executor2, executor3 …";
  return "Invalid role. Enter \"pr1\", \"pr2\" … for PR role, or \"executor1\", \"executor2\" … for Executor role.";
};

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
