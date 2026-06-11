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
import { normalizeRole } from "../utils/roleRouting";

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
  const isLightMode = true;

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
        ? "1px solid rgba(0, 0, 0, 0.2)"
        : "1px solid rgba(255, 255, 255, 0.1)",
    background: "#ffffff",
    color: editable
      ? isLightMode
        ? "#111111"
        : "#ffffff"
      : isLightMode
        ? "#111111"
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
    color: isLightMode ? "#111111" : "rgba(255, 255, 255, 0.4)",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    marginLeft: "4px",
  };

  const roleKey = normalizeRole(user?.role);
  const isExecutorRole = roleKey === "executor" || /^executor\d+$/.test(roleKey);
  const executorNumMatch = roleKey.match(/^executor(\d+)$/);
  const roleLabel =
    roleKey === "admin"
      ? "Admin"
      : roleKey === "pr"
        ? "PR"
        : executorNumMatch
          ? `Executor ${executorNumMatch[1]}`
          : roleKey === "executor"
            ? "Service Executor"
            : "Client";

  const roleAccent =
    roleKey === "admin"
      ? "#22c55e"
      : roleKey === "pr"
        ? "#3b82f6"
        : isExecutorRole
          ? "#f59e0b"
          : isLightMode
            ? "rgba(0, 0, 0, 0.72)"
            : "rgba(255, 255, 255, 0.6)";

  return (
    <div
      className="profile-container"
      style={{
        minHeight: "100vh",
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#ffffff",
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
            ? "radial-gradient(circle, rgba(0, 0, 0, 0.04) 0%, transparent 70%)"
            : "radial-gradient(circle, rgba(34, 197, 94, 0.05) 0%, transparent 70%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      <style>{`
                .profile-form,
                .profile-card,
                .profile-container {
                  color-scheme: light;
                }

                .profile-input {
                    -webkit-appearance: none;
                    appearance: none;
                    background-clip: padding-box;
                    background-color: #ffffff !important;
                    background-image: none !important;
                    box-shadow: none;
                    color-scheme: light;
                }

                .profile-form .profile-input,
                .profile-form .profile-input:focus,
                .profile-form .profile-input:hover,
                .profile-form .profile-input:active {
                    background-color: #ffffff !important;
                    background-image: none !important;
                }

                .profile-form .profile-input:-webkit-autofill,
                .profile-form .profile-input:-webkit-autofill:hover,
                .profile-form .profile-input:-webkit-autofill:focus,
                .profile-form .profile-input:-webkit-autofill:active,
                .profile-form .profile-input:autofill {
                    -webkit-text-fill-color: #111111 !important;
                    -webkit-box-shadow: 0 0 0 1000px #ffffff inset !important;
                    box-shadow: 0 0 0 1000px #ffffff inset !important;
                    background-color: #ffffff !important;
                    background-image: none !important;
                    caret-color: #111111;
                    transition: background-color 9999s ease-in-out 0s;
                }

                body:not(.light-mode) .profile-input {
                    color-scheme: light;
                }

                body.light-mode .profile-input {
                    color-scheme: light;
                }

                .profile-input.profile-phone-input:-webkit-autofill,
                .profile-input.profile-phone-input:-webkit-autofill:hover,
                .profile-input.profile-phone-input:-webkit-autofill:focus,
                .profile-input.profile-phone-input:-webkit-autofill:active,
                .profile-input.profile-phone-input:autofill {
                  -webkit-text-fill-color: #111111 !important;
                  -webkit-box-shadow: 0 0 0 1000px #ffffff inset !important;
                  box-shadow: 0 0 0 1000px #ffffff inset !important;
                  background-color: #ffffff !important;
                  background-image: none !important;
                  caret-color: #111111;
                }

                @media (max-width: 768px) {
                    .profile-container {
                        align-items: flex-start !important;
                        padding: 84px 16px 28px !important;
                    }
                    .profile-card {
                        padding: 1.4rem !important;
                        border-radius: 24px !important;
                    }
                    .profile-header {
                        flex-direction: column !important;
                        align-items: center !important;
                        text-align: center !important;
                        gap: 0.9rem !important;
                        margin-bottom: 1.8rem !important;
                        padding-bottom: 1.5rem !important;
                    }
                    .profile-header-title {
                        font-size: 1.55rem !important;
                        flex-wrap: wrap !important;
                        justify-content: center !important;
                    }
                    .profile-edit-btn {
                        margin-left: 0 !important;
                        width: 100% !important;
                        justify-content: center !important;
                        margin-top: 0.75rem !important;
                    }
                    .profile-form-grid {
                        grid-template-columns: 1fr !important;
                        gap: 1.25rem !important;
                    }
                    .profile-industry-stage-grid {
                        grid-template-columns: 1fr !important;
                        gap: 0.9rem !important;
                    }
                    .profile-actions {
                        flex-direction: column !important;
                        gap: 0.75rem !important;
                        margin-top: 2rem !important;
                        padding-top: 1.25rem !important;
                    }
                    .profile-actions button {
                        width: 100% !important;
                        justify-content: center !important;
                    }
                }

                @media (max-width: 480px) {
                    .profile-container {
                        padding: 72px 12px 20px !important;
                    }

                    .profile-card {
                        padding: 1rem !important;
                        border-radius: 20px !important;
                    }

                    .profile-header {
                        margin-bottom: 1.4rem !important;
                        padding-bottom: 1.1rem !important;
                    }

                    .profile-header > div:first-child {
                        width: 60px !important;
                        height: 60px !important;
                        border-radius: 16px !important;
                    }

                    .profile-header-title {
                        font-size: 1.25rem !important;
                        gap: 0.35rem !important;
                    }

                    .profile-header-title span {
                        font-size: 0.6rem !important;
                        padding: 4px 8px !important;
                        border-radius: 7px !important;
                    }

                    .profile-header p {
                        font-size: 0.85rem !important;
                        word-break: break-word !important;
                    }

                    .profile-form-grid {
                        gap: 1rem !important;
                    }

                    .profile-form-grid > div,
                    .profile-actions {
                        min-width: 0 !important;
                    }

                    .profile-input {
                        font-size: 0.92rem !important;
                        padding: 11px 14px !important;
                        border-radius: 10px !important;
                    }

                    .profile-actions button {
                        font-size: 0.84rem !important;
                        padding: 11px 18px !important;
                    }
                }

                @media (max-width: 360px) {
                    .profile-container {
                        padding: 68px 10px 16px !important;
                    }

                    .profile-card {
                        padding: 0.9rem !important;
                        border-radius: 18px !important;
                    }

                    .profile-header-title {
                        font-size: 1.15rem !important;
                    }

                    .profile-header p {
                        font-size: 0.8rem !important;
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
          background: "whitesmoke",
          borderRadius: "30px",
          border: isLightMode
            ? "1px solid rgba(0, 0, 0, 0.06)"
            : "1px solid rgba(255, 255, 255, 0.08)",
          boxShadow: isLightMode
            ? "0 10px 40px -10px rgba(0, 0, 0, 0.1)"
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
              ? "1px solid rgba(0, 0, 0, 0.06)"
              : "1px solid rgba(255, 255, 255, 0.06)",
            paddingBottom: "2.5rem",
          }}
        >
          <div
            style={{
              position: "relative",
              width: "72px",
              height: "72px",
              background: isLightMode ? "#ffffff" : "#1a1a1e",
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
            {roleKey === "admin" ? (
              <Shield
                size={36}
                color={isLightMode ? "#22c55e" : "#22c55e"}
                strokeWidth={2.5}
              />
            ) : roleKey === "pr" ? (
              <User
                size={36}
                color={isLightMode ? "#3b82f6" : "#3b82f6"}
                strokeWidth={2.5}
              />
            ) : isExecutorRole ? (
              <User
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
                flexWrap: "wrap",
                justifyContent: "center",
                textAlign: "center",
              }}
            >
              {user.name}
              <span
                style={{
                  fontSize: roleKey === "pr" || isExecutorRole ? "0.85rem" : "0.7rem",
                  padding: roleKey === "pr" || isExecutorRole ? "0" : "4px 10px",
                  background:
                    roleKey === "admin"
                      ? "rgba(34, 197, 94, 0.15)"
                      : roleKey === "pr" || isExecutorRole
                        ? "transparent"
                        : "rgba(0, 0, 0, 0.05)",
                  color: roleAccent,
                  borderRadius: "8px",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  fontWeight: 800,
                  alignSelf: "center",
                }}
              >
                {roleLabel}
              </span>
            </h1>
            <p
              style={{
                fontSize: "1rem",
                color: isLightMode
                  ? "rgba(0, 0, 0, 0.72)"
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
        <form className="profile-form" onSubmit={handleUpdate} autoComplete="off">
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
                  className="profile-input profile-phone-input"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel-national"
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
                  {roleKey === "pr" || isExecutorRole
                    ? "Professional"
                    : "Business"}
                </span>
              </div>

              <div>
                <label style={labelStyle}>
                  {roleKey === "pr" || isExecutorRole
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
                    {roleKey === "pr" || isExecutorRole
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
                    {roleKey === "pr" || isExecutorRole
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
