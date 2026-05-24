import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Mail,
  Lock,
  LogIn,
  Eye,
  EyeOff,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "react-hot-toast";
import {
  hasCompletedOnboarding,
  markOnboardingCompleted,
} from "../utils/onboardingFlow";
import { getDashboardPathByRole, normalizeRole } from "../utils/roleRouting";

void motion;

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const accentColor = "#FB6A21";

  const handleRoleRedirection = async (data) => {
    const actualRole = normalizeRole(data.role);

    localStorage.setItem("user", JSON.stringify(data));
    window.dispatchEvent(new Event("storage"));

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

    if (actualRole !== "user") {
      sessionStorage.setItem("fin2line_auth_redirect", "true");
      navigate(getDashboardPathByRole(actualRole));
    } else {
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
          sessionStorage.setItem("fin2line_auth_redirect", "true");
          navigate("/dashboard");
        } else if (!onboardingDone) {
          navigate("/onboarding");
        } else {
          sessionStorage.setItem("fin2line_auth_redirect", "true");
          navigate("/services");
        }
      } catch (error) {
        console.error("Navigation check error:", error);
        sessionStorage.setItem("fin2line_auth_redirect", "true");
        navigate("/services");
      }
    }
  };

  const startGoogleOAuthRedirect = () => {
    try {
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      if (!clientId) {
        toast.error("Google client is not configured.");
        return;
      }

      setGoogleLoading(true);
      const state = crypto.randomUUID();
      sessionStorage.setItem("google_oauth_state", state);

      const configuredRedirectUri = import.meta.env.VITE_GOOGLE_REDIRECT_URI;
      const redirectUriRaw =
        configuredRedirectUri && String(configuredRedirectUri).trim().length > 0
          ? String(configuredRedirectUri).trim()
          : `${window.location.origin}/auth/google/callback`;
      const redirectUri = redirectUriRaw.endsWith("/")
        ? redirectUriRaw.slice(0, -1)
        : redirectUriRaw;

      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: "token",
        scope: "openid email profile",
        prompt: "select_account",
        include_granted_scopes: "true",
        state,
      });

      window.location.assign(
        `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
      );
    } catch (error) {
      console.error("Google redirect start failed:", error);
      toast.error("Unable to start Google sign in.");
      setGoogleLoading(false);
    }
  };

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/auth/login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        },
      );
      const data = await response.json();
      if (response.ok) {
        toast.success(
          data.role === "admin" ? "Welcome Admin!" : "Login Successful",
          { id: "auth-toast" }
        );
        await handleRoleRedirection(data);
      } else if (response.status === 404) {
        navigate("/register", {
          replace: true,
          state: {
            initialData: { email: formData.email },
            noticeMessage:
              "No account was found for that email. Create your account to continue to onboarding.",
          },
        });
      } else {
        toast.error(data.message || "Login failed");
      }
    } catch (error) {
      console.error("Login error:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    background: "#ffffff",
    border: "1px solid rgba(17,17,17,0.12)",
    borderRadius: "8px",
    padding: "0.85rem 1.1rem",
    transition: "border-color 0.2s ease",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f5f5f5",
        position: "relative",
        overflow: "hidden",
        padding: "4.5rem 1rem 1rem",
      }}
    >
      {/* Subtle theme glow */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse 50% 40% at 50% 0%, rgba(251,106,33,0.08) 0%, transparent 60%)`,
          pointerEvents: "none",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
        style={{ width: "100%", maxWidth: "500px", zIndex: 1 }}
      >
        <div
          className="auth-card"
          style={{
            background: "#ffffff",
            color: "#111111",
            borderRadius: "20px",
            border: "1px solid rgba(17,17,17,0.12)",
            padding: "1.5rem 2.2rem",
            boxShadow: "var(--shadow-lg)",
          }}
        >
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: "1rem" }}>
            <div style={{
              height: "90px",
              width: "90px",
              borderRadius: "50%",
              overflow: "hidden",
              margin: "0 auto 0.8rem",
              background: "rgba(127, 87, 251, 0.04)",
              border: "1px solid rgba(127, 87, 251, 0.18)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
              <img
                src="/logo2.png"
                alt="Logo"
                style={{
                  height: "100%",
                  width: "100%",
                  objectFit: "cover",
                  transform: "scale(1.1)",
                  display: "block",
                }}
              />
            </div>
            <h2
              style={{
                fontSize: "1.4rem",
                fontWeight: 500,
                color: "#111111",
                marginBottom: "0.15rem",
                letterSpacing: "-0.01em",
              }}
            >
              Welcome Back
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
              Sign in to continue to Fin2Line
            </p>
          </div>

          {/* Form */}
          <form
            onSubmit={handleSubmit}
            style={{ display: "flex", flexDirection: "column", gap: "0.7rem" }}
          >
            {/* Email */}
            <div
              style={inputStyle}
              onFocus={() => { }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.borderColor = "rgba(251,106,33,0.45)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.borderColor = "rgba(17,17,17,0.12)")
              }
            >
              <Mail size={15} color="var(--text-muted)" />
              <input
                className="auth-input"
                type="email"
                name="email"
                placeholder="Email Address"
                required
                value={formData.email}
                onChange={handleChange}
                style={{
                  background: "none",
                  border: "none",
                  outline: "none",
                  color: "#111111",
                  fontSize: "0.88rem",
                  width: "100%",
                }}
                onFocus={(e) =>
                  (e.currentTarget.parentElement.style.borderColor = accentColor)
                }
                onBlur={(e) =>
                (e.currentTarget.parentElement.style.borderColor =
                  "rgba(17,17,17,0.12)")
                }
              />
            </div>

            {/* Password */}
            <div style={inputStyle}>
              <Lock size={15} color="var(--text-muted)" />
              <input
                className="auth-input"
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Password"
                required
                value={formData.password}
                onChange={handleChange}
                style={{
                  background: "none",
                  border: "none",
                  outline: "none",
                  color: "#111111",
                  fontSize: "0.88rem",
                  flex: 1,
                }}
                onFocus={(e) =>
                  (e.currentTarget.parentElement.style.borderColor = accentColor)
                }
                onBlur={(e) =>
                (e.currentTarget.parentElement.style.borderColor =
                  "rgba(17,17,17,0.12)")
                }
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#111111",
                  padding: 0,
                  display: "flex",
                }}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            {/* Forgot password */}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginTop: "-0.4rem",
              }}
            >
              <button
                type="button"
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: accentColor,
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  padding: 0,
                }}
              >
                Forgot password?
              </button>
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "0.75rem",
                borderRadius: "8px",
                background: loading
                  ? "rgba(251,106,33,0.45)"
                  : "linear-gradient(135deg, #FB6A21 0%, #F55F18 100%)",
                color: "white",
                fontWeight: 800,
                border: "none",
                fontSize: "0.85rem",
                cursor: loading ? "not-allowed" : "pointer",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                boxShadow: "0 6px 20px rgba(251,106,33,0.3)",
                transition: "all 0.3s ease",
                marginTop: "0",
              }}
              onMouseEnter={(e) => {
                if (!loading)
                  e.currentTarget.style.boxShadow =
                    "0 12px 32px rgba(251,106,33,0.45)";
              }}
              onMouseLeave={(e) =>
              (e.currentTarget.style.boxShadow =
                "0 8px 24px rgba(251,106,33,0.3)")
              }
            >
              {loading ? (
                "Signing in..."
              ) : (
                <>
                  <span>Sign In</span> <LogIn size={15} />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div
            style={{
              position: "relative",
              margin: "0.9rem 0",
              textAlign: "center",
            }}
          >
            <div
              style={{
                height: "1px",
                background: "rgba(17,17,17,0.12)",
                position: "absolute",
                top: "50%",
                left: 0,
                right: 0,
              }}
            />
            <span
              style={{
                position: "relative",
                background: "#ffffff",
                padding: "0 0.9rem",
                color: "var(--text-muted)",
                fontSize: "0.72rem",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              or
            </span>
          </div>

          <button
            onClick={startGoogleOAuthRedirect}
            disabled={googleLoading}
            style={{
              width: "100%",
              padding: "0.7rem 1.2rem",
              borderRadius: "8px",
              background: "#ffffff",
              border: "1px solid rgba(17,17,17,0.12)",
              color: "#111111",
              fontSize: "0.88rem",
              fontWeight: 600,
              cursor: googleLoading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.75rem",
              transition: "all 0.25s ease",
              fontFamily: "var(--font-body)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#f5f5f5";
              e.currentTarget.style.borderColor = "rgba(17,17,17,0.2)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#ffffff";
              e.currentTarget.style.borderColor = "rgba(17,17,17,0.12)";
            }}
          >
            {/* Google Icon SVG */}
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {googleLoading ? "Connecting..." : "Continue with Google"}
          </button>

          {/* Sign Up Link */}
          <div style={{ marginTop: "0.9rem", textAlign: "center" }}>
            <p style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>
              New here?{" "}
              <Link
                to="/register"
                onClick={() =>
                  sessionStorage.setItem(
                    "fin2line_guest_walkthrough_seen_v5",
                    "true",
                  )
                }
                style={{
                  color: accentColor,
                  fontWeight: 700,
                  textDecoration: "none",
                }}
              >
                Create account
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
