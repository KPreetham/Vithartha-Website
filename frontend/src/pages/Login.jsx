import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Mail,
  Lock,
  LogIn,
  Eye,
  EyeOff,
  User,
  ShieldCheck,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "react-hot-toast";
import { useGoogleLogin } from "@react-oauth/google";
import {
  hasCompletedOnboarding,
  markOnboardingCompleted,
} from "../utils/onboardingFlow";

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginRole, setLoginRole] = useState("user");
  const [googleLoading, setGoogleLoading] = useState(false);

  // ── Process Google OAuth token (shared logic) ─────────────────────
  const processGoogleToken = async (accessToken) => {
    try {
      // 1. Fetch user info from Google
      const userInfoRes = await fetch(
        "https://www.googleapis.com/oauth2/v3/userinfo",
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (!userInfoRes.ok) {
        throw new Error("Failed to fetch Google user info");
      }
      const userInfo = await userInfoRes.json();

      // 2. Send to our backend for login/registration
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/auth/google-login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken: accessToken, userInfo }),
        },
      );
      const data = await response.json();

      if (data.needsRegistration) {
        toast.success("Welcome! Please complete your registration.");
        navigate("/register", { state: { initialData: data.user } });
      } else if (response.ok) {
        toast.success("Login Successful");
        localStorage.setItem("user", JSON.stringify(data));
        window.dispatchEvent(new Event("storage"));
        if (data.role === "admin") {
          navigate("/admin");
        } else {
          const onboardingDone = hasCompletedOnboarding(data);
          const userId = data._id || data.id;
          const leadsRes = await fetch(
            `${import.meta.env.VITE_API_URL}/leads?userId=${userId}`,
            {
              headers: { Authorization: `Bearer ${data.token}` },
            },
          );
          const leads = await leadsRes.json();
          if (leads && leads.length > 0) {
            markOnboardingCompleted(data);
            navigate("/dashboard");
          } else if (!onboardingDone) {
            navigate("/onboarding");
          } else {
            navigate("/services");
          }
        }
      } else {
        toast.error(data.message || "Google Login failed");
      }
    } catch (err) {
      console.error("Google Auth Error:", err);
      toast.error("Authentication failed. Please try again.");
    } finally {
      setGoogleLoading(false);
    }
  };

  // ── Google OAuth via popup (using Google Identity Services) ────────
  const googleLogin = useGoogleLogin({
    onSuccess: (tokenResponse) => {
      setGoogleLoading(true);
      processGoogleToken(tokenResponse.access_token);
    },
    onError: (error) => {
      console.error("Google Login Error:", error);
      toast.error("Google sign-in failed. Please try again.");
      setGoogleLoading(false);
    },
    onNonOAuthError: (error) => {
      // Popup closed or blocked
      console.warn("Google popup closed:", error);
      setGoogleLoading(false);
    },
  });

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
        );
        localStorage.setItem("user", JSON.stringify(data));
        window.dispatchEvent(new Event("storage"));
        if (data.role === "admin") {
          navigate("/admin");
        } else {
          const onboardingDone = hasCompletedOnboarding(data);
          const userId = data._id || data.id;
          const leadsResponse = await fetch(
            `${import.meta.env.VITE_API_URL}/leads?userId=${userId}`,
            {
              headers: { Authorization: `Bearer ${data.token}` },
            },
          );
          const leads = await leadsResponse.json();
          if (leads && leads.length > 0) {
            markOnboardingCompleted(data);
            navigate("/dashboard");
          } else if (!onboardingDone) {
            navigate("/onboarding");
          } else {
            navigate("/services");
          }
        }
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
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
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
        background: "var(--bg)",
        position: "relative",
        overflow: "hidden",
        padding: "4.5rem 1rem 1rem",
      }}
    >
      {/* Subtle green glow */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse 50% 40% at 50% 0%, rgba(34,197,94,0.06) 0%, transparent 60%)`,
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
          style={{
            background: "var(--modal-gradient)",
            borderRadius: "20px",
            border: "1px solid var(--border)",
            padding: "1.5rem 2.2rem",
            boxShadow: "var(--shadow-lg)",
          }}
        >
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: "1rem" }}>
            <img
              src="/vithartha-logo.png"
              alt="Logo"
              style={{ height: "22px", marginBottom: "0.5rem" }}
            />
            <h2
              style={{
                fontSize: "1.4rem",
                fontWeight: 500,
                color: "var(--text)",
                marginBottom: "0.15rem",
                letterSpacing: "-0.01em",
              }}
            >
              Welcome Back
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
              Sign in to continue to Vithartha
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
              onFocus={() => {}}
              onMouseEnter={(e) =>
                (e.currentTarget.style.borderColor = "rgba(34,197,94,0.4)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")
              }
            >
              <Mail size={15} color="var(--text-muted)" />
              <input
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
                  color: "var(--text)",
                  fontSize: "0.88rem",
                  width: "100%",
                }}
                onFocus={(e) =>
                  (e.currentTarget.parentElement.style.borderColor = "#22c55e")
                }
                onBlur={(e) =>
                  (e.currentTarget.parentElement.style.borderColor =
                    "var(--border)")
                }
              />
            </div>

            {/* Password */}
            <div style={inputStyle}>
              <Lock size={15} color="var(--text-muted)" />
              <input
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
                  color: "var(--text)",
                  fontSize: "0.88rem",
                  flex: 1,
                }}
                onFocus={(e) =>
                  (e.currentTarget.parentElement.style.borderColor = "#22c55e")
                }
                onBlur={(e) =>
                  (e.currentTarget.parentElement.style.borderColor =
                    "var(--border)")
                }
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-muted)",
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
                  color: "#22c55e",
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
                  ? "rgba(34,197,94,0.5)"
                  : "linear-gradient(135deg, #16a34a 0%, #22c55e 100%)",
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
                boxShadow: "0 6px 20px rgba(34,197,94,0.3)",
                transition: "all 0.3s ease",
                marginTop: "0",
              }}
              onMouseEnter={(e) => {
                if (!loading)
                  e.currentTarget.style.boxShadow =
                    "0 12px 32px rgba(34,197,94,0.45)";
              }}
              onMouseLeave={(e) =>
                (e.currentTarget.style.boxShadow =
                  "0 8px 24px rgba(34,197,94,0.3)")
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
                background: "var(--border)",
                position: "absolute",
                top: "50%",
                left: 0,
                right: 0,
              }}
            />
            <span
              style={{
                position: "relative",
                background: "var(--card-bg)",
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
            onClick={() => googleLogin()}
            disabled={googleLoading}
            style={{
              width: "100%",
              padding: "0.7rem 1.2rem",
              borderRadius: "8px",
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              color: "var(--text)",
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
              e.currentTarget.style.background = "rgba(255,255,255,0.08)";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--bg-card)";
              e.currentTarget.style.borderColor = "var(--border)";
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
                    "vithartha_guest_walkthrough_seen_v5",
                    "true",
                  )
                }
                style={{
                  color: "#22c55e",
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
