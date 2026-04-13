import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  hasCompletedOnboarding,
  markOnboardingCompleted,
} from "../utils/onboardingFlow";
import { getDashboardPathByRole, normalizeRole } from "../utils/roleRouting";

const GoogleOAuthCallback = () => {
  const navigate = useNavigate();

  const handleRoleRedirection = async (data) => {
    localStorage.setItem("user", JSON.stringify(data));
    window.dispatchEvent(new Event("storage"));

    const role = normalizeRole(data.role);

    try {
      if (data.token) {
        const profileRes = await fetch(
          `${import.meta.env.VITE_API_URL}/auth/profile`,
          {
            headers: { Authorization: `Bearer ${data.token}` },
          },
        );
        if (profileRes.ok) {
          const profileData = await profileRes.json();
          const mergedUser = { ...data, ...profileData };
          localStorage.setItem("user", JSON.stringify(mergedUser));
          window.dispatchEvent(new Event("storage"));
        }
      }
    } catch (error) {
      console.warn("Profile hydration skipped:", error);
    }

    if (role !== "user") {
      navigate(getDashboardPathByRole(role), { replace: true });
      return;
    }

    const onboardingDone = hasCompletedOnboarding(data);
    const userId = data._id || data.id;

    try {
      const leadsRes = await fetch(
        `${import.meta.env.VITE_API_URL}/leads?userId=${userId}`,
        {
          headers: { Authorization: `Bearer ${data.token}` },
        },
      );
      const leads = await leadsRes.json();

      if (leads && leads.length > 0) {
        markOnboardingCompleted(data);
        navigate("/dashboard", { replace: true });
      } else if (!onboardingDone) {
        navigate("/onboarding", { replace: true });
      } else {
        navigate("/services", { replace: true });
      }
    } catch (error) {
      console.error("Navigation check error:", error);
      navigate("/services", { replace: true });
    }
  };

  useEffect(() => {
    const completeGoogleLogin = async () => {
      try {
        const hash = window.location.hash.startsWith("#")
          ? window.location.hash.slice(1)
          : "";
        const hashParams = new URLSearchParams(hash);

        const accessToken = hashParams.get("access_token");
        const returnedState = hashParams.get("state");
        const oauthError = hashParams.get("error");

        const expectedState = sessionStorage.getItem("google_oauth_state");
        sessionStorage.removeItem("google_oauth_state");

        if (oauthError) {
          throw new Error("Google sign in was cancelled or denied.");
        }

        if (!accessToken) {
          throw new Error("Google did not return an access token.");
        }

        if (expectedState && returnedState && expectedState !== returnedState) {
          throw new Error("Google sign in validation failed. Please try again.");
        }

        const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const userInfo = userInfoRes.ok ? await userInfoRes.json() : null;

        const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/google-login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accessToken, userInfo }),
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data.detail || data.message || "Google authentication failed.");
        }

        if (data.needsRegistration) {
          toast.success("Set your password to complete account setup.");
          navigate("/register", {
            replace: true,
            state: {
              initialData: data.user,
              googleSignupToken: data.googleSignupToken,
              fromGoogle: true,
            },
          });
          return;
        }

        toast.success("Login Successful", { id: "auth-toast" });
        await handleRoleRedirection(data);
      } catch (error) {
        console.error("Google OAuth callback error:", error);
        toast.error(error.message || "Google sign in failed.");
        navigate("/login", { replace: true });
      }
    };

    completeGoogleLogin();
  }, [navigate]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg)",
        color: "var(--text)",
      }}
    >
      Completing Google sign in...
    </div>
  );
};

export default GoogleOAuthCallback;
