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
  if (!value) return "Please enter a role, e.g. pr1 or executor1.";
  if (value === "pr") return "PR role must include a number, e.g. pr1, pr2, pr3 …";
  if (value === "executor") return "Executor role must include a number, e.g. executor1, executor2, executor3 …";
  if (/^pr/.test(value)) return `Invalid PR role "${value}". The correct format is "pr" followed by a number with no spaces or symbols, e.g. pr1, pr2, pr3.`;
  if (/^executor/.test(value)) return `Invalid Executor role "${value}". The correct format is "executor" followed by a number with no spaces or symbols, e.g. executor1, executor2.`;
  return `Invalid role "${value}". Use "pr" + number (pr1, pr2 …) for PR or "executor" + number (executor1, executor2 …) for Executor.`;
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
