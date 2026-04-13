import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  User,
  Mail,
  Shield,
  Building,
  Edit2,
  Save,
  X,
  Phone,
  Globe,
  Hash,
  Briefcase,
  Zap,
} from "lucide-react";
import axios from "axios";
import { toast } from "react-hot-toast";
import Loader from "../components/Loader";

const Profile = () => {
  const [user, setUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    profile: {
      companyName: "",
      phone: "",
      businessStage: "",
      industry: "",
    },
  });
  const [isLightMode, setIsLightMode] = useState(() => {
    if (typeof document !== "undefined" && document.body) {
      return document.body.classList.contains("light-mode");
    }
    return localStorage.getItem("theme") === "light";
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const storedUser = JSON.parse(localStorage.getItem("user"));
        if (storedUser) {
          const response = await axios.get(
            `${import.meta.env.VITE_API_URL}/auth/profile`,
            {
              headers: { Authorization: `Bearer ${storedUser.token}` },
            },
          );
          setUser(response.data);
          setFormData({
            name: response.data.name,
            email: response.data.email,
            profile: {
              companyName: response.data.profile?.companyName || "",
              phone: response.data.profile?.phone || "",
              businessStage: response.data.profile?.businessStage || "",
              industry: response.data.profile?.industry || "",
            },
          });
        }
      } catch (error) {
        toast.error("Failed to load profile");
      }
    };
    fetchProfile();
  }, []);

  useEffect(() => {
    const syncThemeState = () => {
      const fromBody =
        typeof document !== "undefined" && document.body
          ? document.body.classList.contains("light-mode")
          : false;
      const fromStorage = localStorage.getItem("theme") === "light";
      setIsLightMode(fromBody || fromStorage);
    };

    syncThemeState();

    const observer = new MutationObserver(syncThemeState);
    if (document.body) {
      observer.observe(document.body, {
        attributes: true,
        attributeFilter: ["class"],
      });
    }

    window.addEventListener("storage", syncThemeState);
    return () => {
      observer.disconnect();
      window.removeEventListener("storage", syncThemeState);
    };
  }, []);

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const storedUser = JSON.parse(localStorage.getItem("user"));
      const response = await axios.put(
        `${import.meta.env.VITE_API_URL}/auth/profile`,
        formData,
        {
          headers: { Authorization: `Bearer ${storedUser.token}` },
        },
      );
      if (response.data) {
        // Ensure we don't overwrite the token with undefined if it's not in the response
        const userData = { ...response.data };
        if (!userData.token) {
          userData.token = storedUser.token;
        }
        localStorage.setItem("user", JSON.stringify(userData));
        setUser(userData);
        setIsEditing(false);
        toast.success("Profile updated successfully!");
        // Dispatch storage event to update navbar
        window.dispatchEvent(new Event("storage"));
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Update failed");
    }
  };

  if (!user) return <Loader />;

  const inputStyle = (editable) => ({
    width: "100%",
    padding: "12px 16px",
    borderRadius: "12px",
    border: editable
      ? "1px solid #22c55e"
      : isLightMode
        ? "1px solid rgba(0, 0, 0, 0.15)"
        : "1px solid rgba(255, 255, 255, 0.1)",
    background: editable
      ? isLightMode
        ? "#ffffff"
        : "rgba(34, 197, 94, 0.03)"
      : isLightMode
        ? "rgba(0, 0, 0, 0.02)"
        : "rgba(255, 255, 255, 0.02)",
    color: editable
      ? isLightMode
        ? "#111111"
        : "#ffffff"
      : isLightMode
        ? "rgba(0, 0, 0, 0.6)"
        : "rgba(255, 255, 255, 0.5)",
    fontSize: "0.9rem",
    outline: "none",
    transition: "all 0.2s ease",
    cursor: editable ? "text" : "not-allowed",
    marginTop: "6px",
  });

  const labelStyle = {
    fontSize: "0.75rem",
    fontWeight: 600,
    color: isLightMode ? "rgba(0, 0, 0, 0.5)" : "rgba(255, 255, 255, 0.4)",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    marginLeft: "4px",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: isLightMode ? "#f3f4f6" : "#070708",
        padding: "100px 20px 40px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background Effect */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "600px",
          height: "600px",
          background: isLightMode
            ? "radial-gradient(circle, rgba(34, 197, 94, 0.08) 0%, transparent 70%)"
            : "radial-gradient(circle, rgba(34, 197, 94, 0.05) 0%, transparent 70%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      <style>{`
                .profile-input {
                    -webkit-appearance: none;
                    appearance: none;
                    background-clip: padding-box;
                }

                body:not(.light-mode) .profile-input {
                    color-scheme: dark;
                }

                body.light-mode .profile-input {
                    color-scheme: light;
                }

                body:not(.light-mode) .profile-input:-webkit-autofill,
                body:not(.light-mode) .profile-input:-webkit-autofill:hover,
                body:not(.light-mode) .profile-input:-webkit-autofill:focus,
                body:not(.light-mode) .profile-input:-webkit-autofill:active {
                    -webkit-text-fill-color: white !important;
                    -webkit-box-shadow: 0 0 0 1000px rgba(34, 197, 94, 0.03) inset !important;
                    box-shadow: 0 0 0 1000px rgba(34, 197, 94, 0.03) inset !important;
                    border: 1px solid #22c55e !important;
                    caret-color: white;
                    transition: background-color 9999s ease-in-out 0s;
                }

                body:not(.light-mode) .profile-input:autofill {
                    -webkit-text-fill-color: white !important;
                    box-shadow: 0 0 0 1000px #111114 inset !important;
                    caret-color: white;
                }

                body.light-mode .profile-input:-webkit-autofill,
                body.light-mode .profile-input:-webkit-autofill:hover,
                body.light-mode .profile-input:-webkit-autofill:focus,
                body.light-mode .profile-input:-webkit-autofill:active {
                    -webkit-text-fill-color: #111111 !important;
                    -webkit-box-shadow: 0 0 0 1000px #ffffff inset !important;
                    box-shadow: 0 0 0 1000px #ffffff inset !important;
                    border: 1px solid #22c55e !important;
                    caret-color: #111111;
                    transition: background-color 9999s ease-in-out 0s;
                }

                body.light-mode .profile-input:autofill {
                    -webkit-text-fill-color: #111111 !important;
                    box-shadow: 0 0 0 1000px #ffffff inset !important;
                    caret-color: #111111;
                }

                @media (max-width: 768px) {
                    .profile-card {
                        padding: 1.5rem !important;
                    }
                    .profile-header {
                        flex-direction: column !important;
                        align-items: flex-start !important;
                        gap: 1rem !important;
                    }
                    .profile-header-title {
                        font-size: 1.6rem !important;
                        flex-wrap: wrap !important;
                    }
                    .profile-edit-btn {
                        margin-left: 0 !important;
                        width: 100% !important;
                        justify-content: center !important;
                        margin-top: 1rem !important;
                    }
                    .profile-form-grid {
                        grid-template-columns: 1fr !important;
                        gap: 1.5rem !important;
                    }
                    .profile-industry-stage-grid {
                        grid-template-columns: 1fr !important;
                        gap: 1rem !important;
                    }
                    .profile-actions {
                        flex-direction: column !important;
                        gap: 1rem !important;
                    }
                    .profile-actions button {
                        width: 100% !important;
                        justify-content: center !important;
                    }
                }
            `}</style>

      <motion.div
        className="profile-card"
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{
          width: "100%",
          maxWidth: "850px",
          background: isLightMode
            ? "linear-gradient(165deg, #ffffff 0%, #f7f7fa 100%)"
            : "linear-gradient(165deg, #111114 0%, #0a0a0c 100%)",
          borderRadius: "30px",
          border: isLightMode
            ? "1px solid rgba(0, 0, 0, 0.1)"
            : "1px solid rgba(255, 255, 255, 0.08)",
          boxShadow: isLightMode
            ? "0 20px 60px -20px rgba(0, 0, 0, 0.25)"
            : "0 40px 100px -20px rgba(0, 0, 0, 0.8)",
          padding: "3rem",
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Header with Square Avatar and Email */}
        <div
          className="profile-header"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "1.5rem",
            marginBottom: "3rem",
            borderBottom: isLightMode
              ? "1px solid rgba(0, 0, 0, 0.08)"
              : "1px solid rgba(255, 255, 255, 0.06)",
            paddingBottom: "2.5rem",
          }}
        >
          <div
            style={{
              position: "relative",
              width: "72px",
              height: "72px",
              background: isLightMode ? "#f3f4f6" : "#1a1a1e",
              borderRadius: "18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: isLightMode
                ? "1px solid rgba(0, 0, 0, 0.1)"
                : "1px solid rgba(255, 255, 255, 0.1)",
              flexShrink: 0,
            }}
          >
            {user.role === "admin" ? (
              <Shield
                size={36}
                color={isLightMode ? "#22c55e" : "#22c55e"}
                strokeWidth={2.5}
              />
            ) : user.role === "PR" ? (
              <Briefcase
                size={36}
                color={isLightMode ? "#3b82f6" : "#3b82f6"}
                strokeWidth={2.5}
              />
            ) : user.role === "executor" ? (
              <Zap
                size={36}
                color={isLightMode ? "#f59e0b" : "#f59e0b"}
                strokeWidth={2.5}
              />
            ) : (
              <User
                size={36}
                color={isLightMode ? "#111111" : "white"}
                strokeWidth={2.5}
              />
            )}
            {/* Green Dot */}
            <div
              style={{
                position: "absolute",
                bottom: "-5px",
                right: "-5px",
                width: "16px",
                height: "16px",
                backgroundColor: "#22c55e",
                borderRadius: "50%",
                border: isLightMode ? "3px solid #ffffff" : "3px solid #111114",
                boxShadow: "0 0 15px rgba(34, 197, 94, 0.5)",
              }}
            ></div>
          </div>
          <div>
            <h1
              className="profile-header-title"
              style={{
                fontSize: "2.2rem",
                fontWeight: 800,
                margin: 0,
                color: isLightMode ? "#111111" : "white",
                letterSpacing: "-0.02em",
                lineHeight: 1.1,
                display: "flex",
                alignItems: "center",
                gap: "12px",
              }}
            >
              {user.name}
              <span
                style={{
                  fontSize: "0.7rem",
                  padding: "4px 10px",
                  background:
                    user.role === "admin"
                      ? "rgba(34, 197, 94, 0.1)"
                      : user.role === "PR"
                        ? "rgba(59, 130, 246, 0.1)"
                        : user.role === "executor"
                          ? "rgba(245, 158, 11, 0.1)"
                          : "rgba(255, 255, 255, 0.05)",
                  color:
                    user.role === "admin"
                      ? "#22c55e"
                      : user.role === "PR"
                        ? "#3b82f6"
                        : user.role === "executor"
                          ? "#f59e0b"
                          : isLightMode
                            ? "rgba(0, 0, 0, 0.55)"
                            : "rgba(255, 255, 255, 0.6)",
                  borderRadius: "8px",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  fontWeight: 800,
                  alignSelf: "center",
                }}
              >
                {user.role === "admin"
                  ? "Admin"
                  : user.role === "PR"
                    ? "PR Professional"
                    : user.role === "executor"
                      ? "Service Executor"
                      : "Client"}
              </span>
            </h1>
            <p
              style={{
                fontSize: "1rem",
                color: isLightMode
                  ? "rgba(0, 0, 0, 0.55)"
                  : "rgba(255, 255, 255, 0.4)",
                margin: "4px 0 0",
                fontWeight: 500,
              }}
            >
              {user.email}
            </p>
          </div>

          {!isEditing && (
            <button
              className="profile-edit-btn"
              onClick={() => setIsEditing(true)}
              style={{
                marginLeft: "auto",
                background: isLightMode
                  ? "rgba(0, 0, 0, 0.05)"
                  : "rgba(255, 255, 255, 0.05)",
                border: isLightMode
                  ? "1px solid rgba(0, 0, 0, 0.12)"
                  : "1px solid rgba(255, 255, 255, 0.1)",
                color: isLightMode ? "#111111" : "white",
                padding: "10px 20px",
                borderRadius: "12px",
                fontSize: "0.85rem",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = isLightMode
                  ? "rgba(0, 0, 0, 0.09)"
                  : "rgba(255, 255, 255, 0.1)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = isLightMode
                  ? "rgba(0, 0, 0, 0.05)"
                  : "rgba(255, 255, 255, 0.05)")
              }
            >
              <Edit2 size={16} /> Edit Profile
            </button>
          )}
        </div>

        {/* Form Content */}
        <form onSubmit={handleUpdate} autoComplete="off">
          <div
            className="profile-form-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: "2.5rem",
            }}
          >
            {/* Left Column: Personal */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1.5rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "4px",
                }}
              >
                <User size={14} color="#22c55e" />
                <span
                  style={{
                    color: "#22c55e",
                    fontSize: "0.8rem",
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                  }}
                >
                  Personal
                </span>
              </div>

              <div>
                <label style={labelStyle}>Full Name</label>
                <input
                  className="profile-input"
                  autoComplete="off"
                  name="profile_full_name"
                  disabled={!isEditing}
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  style={inputStyle(isEditing)}
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label style={labelStyle}>Phone Number</label>
                <input
                  className="profile-input"
                  autoComplete="off"
                  name="profile_phone"
                  disabled={!isEditing}
                  value={formData.profile.phone}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      profile: { ...formData.profile, phone: e.target.value },
                    })
                  }
                  style={inputStyle(isEditing)}
                  placeholder="+91 00000 00000"
                />
              </div>
            </div>

            {/* Right Column: Business */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1.5rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "4px",
                }}
              >
                <Building size={14} color="#22c55e" />
                <span
                  style={{
                    color: "#22c55e",
                    fontSize: "0.8rem",
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                  }}
                >
                  {user.role === "PR" || user.role === "executor"
                    ? "Professional"
                    : "Business"}
                </span>
              </div>

              <div>
                <label style={labelStyle}>
                  {user.role === "PR" || user.role === "executor"
                    ? "Organization / Firm"
                    : "Company Name"}
                </label>
                <input
                  className="profile-input"
                  autoComplete="off"
                  name="profile_company"
                  disabled={!isEditing}
                  value={formData.profile.companyName}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      profile: {
                        ...formData.profile,
                        companyName: e.target.value,
                      },
                    })
                  }
                  style={inputStyle(isEditing)}
                  placeholder="Company Ltd."
                />
              </div>

              <div
                className="profile-industry-stage-grid"
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "1rem",
                }}
              >
                <div>
                  <label style={labelStyle}>
                    {user.role === "PR" || user.role === "executor"
                      ? "Specialization"
                      : "Industry"}
                  </label>
                  <input
                    className="profile-input"
                    autoComplete="off"
                    name="profile_industry"
                    disabled={!isEditing}
                    value={formData.profile.industry}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        profile: {
                          ...formData.profile,
                          industry: e.target.value,
                        },
                      })
                    }
                    style={inputStyle(isEditing)}
                    placeholder="Tech"
                  />
                </div>
                <div>
                  <label style={labelStyle}>
                    {user.role === "PR" || user.role === "executor"
                      ? "Expertise Level"
                      : "Stage"}
                  </label>
                  <input
                    className="profile-input"
                    autoComplete="off"
                    name="profile_stage"
                    disabled={!isEditing}
                    value={formData.profile.businessStage}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        profile: {
                          ...formData.profile,
                          businessStage: e.target.value,
                        },
                      })
                    }
                    style={inputStyle(isEditing)}
                    placeholder="Growth"
                  />
                </div>
              </div>
            </div>
          </div>

          {isEditing && (
            <div
              className="profile-actions"
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "1rem",
                marginTop: "3.5rem",
                borderTop: isLightMode
                  ? "1px solid rgba(0, 0, 0, 0.08)"
                  : "1px solid rgba(255, 255, 255, 0.06)",
                paddingTop: "2rem",
              }}
            >
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                style={{
                  padding: "12px 24px",
                  borderRadius: "14px",
                  background: "transparent",
                  border: isLightMode
                    ? "1px solid rgba(0, 0, 0, 0.15)"
                    : "1px solid rgba(255, 255, 255, 0.1)",
                  color: isLightMode ? "#111111" : "white",
                  fontWeight: 700,
                  cursor: "pointer",
                  fontSize: "0.9rem",
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{
                  padding: "12px 36px",
                  borderRadius: "14px",
                  background:
                    "linear-gradient(135deg, #16a34a 0%, #22c55e 100%)",
                  border: "none",
                  color: "white",
                  fontWeight: 800,
                  cursor: "pointer",
                  fontSize: "0.9rem",
                  boxShadow: "0 10px 25px -5px rgba(34, 197, 94, 0.4)",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <Save size={18} /> Save Profile
              </button>
            </div>
          )}
        </form>
      </motion.div>
    </div>
  );
};

export default Profile;
