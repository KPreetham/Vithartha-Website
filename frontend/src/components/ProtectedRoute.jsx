import { Navigate } from "react-router-dom";
import { hasCompletedOnboarding } from "../utils/onboardingFlow";
import {
  normalizeRole,
  getDashboardPathByRole,
  roleAllowed,
} from "../utils/roleRouting";

const ProtectedRoute = ({ children, adminOnly = false, allowedRoles = [] }) => {
  const userStr = localStorage.getItem("user");

  if (!userStr) {
    return <Navigate to="/login" replace />;
  }

  try {
    const user = JSON.parse(userStr);
    const userRole = normalizeRole(user.role);
    const fallbackPath = getDashboardPathByRole(userRole);

    if (adminOnly && userRole !== "admin") {
      return <Navigate to={fallbackPath} replace />;
    }

    if (!roleAllowed(userRole, allowedRoles)) {
      return <Navigate to={fallbackPath} replace />;
    }

    // New: Force onboarding only for standard users, skip for admin/PR/executor
    if (userRole === "user" && !hasCompletedOnboarding(user)) {
      return <Navigate to="/onboarding" replace />;
    }

    return children;
  } catch (error) {
    localStorage.removeItem("user");
    return <Navigate to="/login" replace />;
  }
};

export default ProtectedRoute;
