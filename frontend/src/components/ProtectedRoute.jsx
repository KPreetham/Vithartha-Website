import { Navigate } from "react-router-dom";
import { hasCompletedOnboarding } from "../utils/onboardingFlow";

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const userStr = localStorage.getItem("user");

  if (!userStr) {
    return <Navigate to="/login" replace />;
  }

  try {
    const user = JSON.parse(userStr);

    if (adminOnly && user.role !== "admin") {
      // If it's an admin only route and user is not admin, redirect to dashboard or home
      return <Navigate to="/dashboard" replace />;
    }

    // New: Force onboarding if not completed (and not admin)
    if (user.role !== "admin" && !hasCompletedOnboarding(user)) {
      return <Navigate to="/onboarding" replace />;
    }

    return children;
  } catch (error) {
    localStorage.removeItem("user");
    return <Navigate to="/login" replace />;
  }
};

export default ProtectedRoute;
