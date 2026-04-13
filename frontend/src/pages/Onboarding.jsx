import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  ArrowLeft,
  Send,
  BarChart,
  Rocket,
  Building,
  CheckCircle,
  Zap,
  TrendingUp,
  FileText,
  PieChart,
  ChevronRight,
} from "lucide-react";
import axios from "axios";
import { toast } from "react-hot-toast";
import {
  hasCompletedOnboarding,
  markOnboardingCompleted,
} from "../utils/onboardingFlow";


const Question = ({ label, value, onChange }) => (
  <div>
    <p
      style={{
        fontSize: "0.82rem",
        fontWeight: 600,
        marginBottom: "0.55rem",
        color: "rgba(255,255,255,0.75)",
      }}
    >
      {label}
    </p>
    <div style={{ display: "flex", gap: "0.6rem" }}>
      {[true, false].map((bool) => (
        <button
          key={String(bool)}
          onClick={() => onChange(bool)}
          style={{
            flex: 1,
            padding: "0.6rem",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: 700,
            fontSize: "0.82rem",
            border:
              value === bool
                ? "1.5px solid #22c55e"
                : "1.5px solid rgba(255,255,255,0.1)",
            background:
              value === bool
                ? "rgba(34,197,94,0.12)"
                : "rgba(255,255,255,0.03)",
            color: value === bool ? "#22c55e" : "rgba(255,255,255,0.4)",
            transition: "all 0.2s ease",
          }}
        >
          {bool ? "Yes" : "No"}
        </button>
      ))}
    </div>
  </div>
);

const SelectQuestion = ({ label, options, value, onChange }) => (
  <div>
    <p
      style={{
        fontSize: "0.82rem",
        fontWeight: 600,
        marginBottom: "0.55rem",
        color: "rgba(255,255,255,0.75)",
      }}
    >
      {label}
    </p>
    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          style={{
            padding: "0.5rem 0.9rem",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: "0.78rem",
            border:
              value === opt
                ? "1.5px solid #22c55e"
                : "1.5px solid rgba(255,255,255,0.1)",
            background:
              value === opt ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.03)",
            color: value === opt ? "#22c55e" : "rgba(255,255,255,0.4)",
            transition: "all 0.2s ease",
          }}
        >
          {opt}
        </button>
      ))}
    </div>
  </div>
);

const InputQuestion = ({ label, placeholder, value, onChange }) => (
  <div>
    <p
      style={{
        fontSize: "0.82rem",
        fontWeight: 600,
        marginBottom: "0.55rem",
        color: "rgba(255,255,255,0.75)",
      }}
    >
      {label}
    </p>
    <div
      style={{
        display: "flex",
        background: "rgba(255,255,255,0.04)",
        border: "1.5px solid rgba(255,255,255,0.1)",
        padding: "0.65rem 0.9rem",
        borderRadius: "8px",
      }}
    >
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          background: "none",
          border: "none",
          color: "white",
          outline: "none",
          width: "100%",
          fontSize: "0.83rem",
        }}
        onFocus={(e) =>
          (e.currentTarget.parentElement.style.borderColor = "#22c55e")
        }
        onBlur={(e) =>
        (e.currentTarget.parentElement.style.borderColor =
          "rgba(255,255,255,0.1)")
        }
      />
    </div>
  </div>
);

/* ─── Main Component ─────────────────────────────────────────────────────── */

const Onboarding = () => {
  const [path, setPath] = useState(null);
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState({
    path: "",
    salaried: null,
    capitalGains: null,
    houseProperty: null,
    otherSources: null,
    expectedRevenue: "",
    registered: null,
    industry: "",
    currentRevenue: "",
    employeeCount: "",
    needs: [],
    urgency: "",
  });

  const navigate = useNavigate();

  React.useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (user?.role === "admin") {
      navigate("/admin");
      return;
    }
    if (user) {
      const userId = user._id || user.id;
      axios
        .get(`${import.meta.env.VITE_API_URL}/leads?userId=${userId}`, {
          headers: { Authorization: `Bearer ${user.token}` },
        })
        .then((response) => {
          const leads = response.data;
          if (leads?.length > 0) {
            markOnboardingCompleted(user);
            navigate("/dashboard");
            return;
          }
          if (hasCompletedOnboarding(user)) {
            navigate("/services");
          }
        })
        .catch(() => {
          if (hasCompletedOnboarding(user)) {
            navigate("/services");
          }
        });
    }
  }, [navigate]);

  const handlePathSelect = (selectedPath) => {
    setPath(selectedPath);
    setFormData({ ...formData, path: selectedPath });
    setStep(1);
  };

  const handleNext = () => setStep((s) => s + 1);
  const handleBack = () => {
    if (step === 1) {
      setStep(0);
      setPath(null);
    } else setStep((s) => s - 1);
  };

  const toggleNeed = (need) => {
    setFormData((prev) => ({
      ...prev,
      needs: prev.needs.includes(need)
        ? prev.needs.filter((n) => n !== need)
        : [...prev.needs, need],
    }));
  };

  const handleSubmit = async () => {

    const needsSet = new Set(formData.needs);

    // ── PATH: Filing Returns ──────────────────────────────────────────────
    if (path === "filing") {
      // Add granular flags based on Yes answers
      if (formData.salaried === true) needsSet.add("salaried");
      if (formData.capitalGains === true) needsSet.add("capitalGains");
      if (formData.houseProperty === true) needsSet.add("houseProperty");
      if (formData.otherSources === true) needsSet.add("otherSources");
      // If no specific sub-type was selected, default to basic ITR filing only
      const hasAnyFlag =
        formData.salaried === true ||
        formData.capitalGains === true ||
        formData.houseProperty === true ||
        formData.otherSources === true;
      if (!hasAnyFlag) needsSet.add("itrFiling");
    }

    // ── PATH: Capital Gains ───────────────────────────────────────────────
    if (path === "capital") {
      // Always capital gains; add other flags based on Yes answers
      needsSet.add("capitalGains");
      if (formData.houseProperty === true) needsSet.add("houseProperty");
      if (formData.otherSources === true) needsSet.add("otherSources");
    }

    // ── PATH: Starting a Business ─────────────────────────────────────────
    if (path === "starting") {
      const hasExplicitNeeds = formData.needs.length > 0;

      if (!hasExplicitNeeds) {
        // No specific services selected → fall back to generic startup bundle
        needsSet.add("startingBusiness");
      }
      // Note: We no longer infer needs from the industry text field for startups
      // to ensure we only display what the user explicitly selected.
    }

    // ── PATH: Have a Business ─────────────────────────────────────────────

    if (path === "having") {
      // needsSet already seeded with formData.needs selections (GST Compliance, Income Tax, etc.)
    }

    // ── Explicit needs checkbox "Capital Gains" maps to capital gains service ──
    if (formData.needs.includes("Capital Gains")) {
      needsSet.add("capitalGains");
    }

    const finalData = {
      ...formData,
      needs: [...needsSet],
      businessStage:
        path === "starting"
          ? "Startup"
          : path === "having"
            ? "Established"
            : "Individual",
      capitalGains:
        path === "capital" ||
        formData.capitalGains === true ||
        formData.needs.includes("Capital Gains"),
      salaried: formData.salaried === true,
      houseProperty: formData.houseProperty === true,
      otherSources: formData.otherSources === true,
    };

    try {
      const userObj = JSON.parse(localStorage.getItem("user"));
      if (userObj) {
        userObj.profile = { ...(userObj.profile || {}), ...finalData };
        userObj.onboardingCompleted = true;
        localStorage.setItem("user", JSON.stringify(userObj));
        markOnboardingCompleted(userObj);
        window.dispatchEvent(new Event("storage"));
      }

      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/onboarding/recommend`,
        finalData,
        {
          headers: { Authorization: `Bearer ${userObj?.token}` },
        },
      );
      if (response.data.success)
        navigate("/services", {
          state: { recommendations: response.data.data, userData: finalData },
        });
    } catch {
      toast.error("Using smart defaults for your roadmap.");
      navigate("/services", { state: { fallback: true, userData: finalData } });
    }
  };

  const mainPaths = [
    {
      id: "filing",
      label: "Filing Returns",
      icon: FileText,
      desc: "Salary, Property, or NRI taxation",
      color: "#4361ee",
    },
    {
      id: "capital",
      label: "Capital Gains",
      icon: TrendingUp,
      desc: "Stocks, Crypto, or Property transactions",
      color: "#f59e0b",
    },
    {
      id: "starting",
      label: "Starting a Business",
      icon: Rocket,
      desc: "Fresh registration, setup, and legal foundations",
      color: "#7c3aed",
    },
    {
      id: "having",
      label: "Have a Business",
      icon: Building,
      desc: "Ongoing compliance, GST, Payroll, and growth",
      color: "#10b981",
    },
  ];

  const needsOptions = [
    { value: "GST Compliance", icon: CheckCircle, color: "#4361ee" },
    { value: "Income Tax", icon: BarChart, color: "#7c3aed" },
    { value: "Capital Gains", icon: TrendingUp, color: "#f59e0b" },
    { value: "Virtual CFO", icon: TrendingUp, color: "#f72585" },
    { value: "Registration", icon: Building, color: "#10b981" },
    { value: "Legal Advisory", icon: Zap, color: "#f59e0b" },
    { value: "Payroll", icon: CheckCircle, color: "#3b82f6" },
  ];

  const urgencyOptions = [
    {
      id: "Immediate",
      label: "As soon as possible",
      icon: Zap,
      color: "#ef4444",
    },
    {
      id: "Planning",
      label: "In the next 1–3 months",
      icon: PieChart,
      color: "#f59e0b",
    },
    {
      id: "Exploring",
      label: "Just exploring for now",
      icon: BarChart,
      color: "#10b981",
    },
  ];

  /* Progress: 3 steps → 0,1,2 */
  const progressPct = ((step + 1) / 3) * 100;

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg)",
        padding: "1.5rem 1rem",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Ambient glow */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(ellipse 50% 40% at 50% 0%, rgba(34,197,94,0.05) 0%, transparent 60%)",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
        style={{ width: "100%", maxWidth: "520px", zIndex: 1 }}
      >
        {/* Progress bar */}
        <div style={{ marginBottom: "1rem" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "0.4rem",
            }}
          >
            <span
              style={{
                fontSize: "0.72rem",
                color: "rgba(255,255,255,0.3)",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Step {step + 1} of 3
            </span>
            <span
              style={{ fontSize: "0.72rem", color: "#22c55e", fontWeight: 600 }}
            >
              {Math.round(progressPct)}%
            </span>
          </div>
          <div
            style={{
              height: "4px",
              background: "rgba(255,255,255,0.07)",
              borderRadius: "99px",
              overflow: "hidden",
            }}
          >
            <motion.div
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              style={{
                height: "100%",
                background: "linear-gradient(90deg, #16a34a, #22c55e)",
                borderRadius: "99px",
              }}
            />
          </div>
        </div>

        {/* Card */}
        <div
          style={{
            background:
              "linear-gradient(145deg, #0f0f12 0%, #111318 50%, #0d0f13 100%)",
            borderRadius: "20px",
            border: "1px solid rgba(255,255,255,0.08)",
            padding: "1.6rem 2rem",
            boxShadow: "0 32px 80px rgba(0,0,0,0.6)",
          }}
        >
          {/* Logo */}
          <div style={{ textAlign: "center", marginBottom: "1.4rem" }}>
            <div style={{
              height: "80px",
              width: "80px",
              borderRadius: "50%",
              overflow: "hidden",
              margin: "0 auto",
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
              <img
                src="/logo2.png"
                alt="Fin2Line Logo"
                style={{
                  height: "100%",
                  width: "100%",
                  objectFit: "cover",
                  objectPosition: "center",
                  display: "block",
                }}
              />
            </div>
          </div>

          <AnimatePresence mode="wait">
            {/* ── Step 0: Path Selection ─────────────────────────── */}
            {step === 0 && (
              <motion.div
                key="s0"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.3 }}
              >
                <div style={{ marginBottom: "1.1rem" }}>
                  <h2
                    style={{
                      fontSize: "1.25rem",
                      fontWeight: 600,
                      color: "white",
                      marginBottom: "0.2rem",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    What brings you to Fin2Line?
                  </h2>
                  <p
                    style={{
                      color: "rgba(255,255,255,0.35)",
                      fontSize: "0.8rem",
                    }}
                  >
                    Choose an option to tailor your experience.
                  </p>
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.55rem",
                  }}
                >
                  {mainPaths.map(({ id, icon: Icon, label, desc, color }) => (
                    <motion.button
                      key={id}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => handlePathSelect(id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "1rem",
                        padding: "0.9rem 1rem",
                        borderRadius: "12px",
                        border: "1px solid rgba(255,255,255,0.08)",
                        background: "rgba(255,255,255,0.03)",
                        cursor: "pointer",
                        textAlign: "left",
                        width: "100%",
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.borderColor = `${color}60`)
                      }
                      onMouseLeave={(e) =>
                      (e.currentTarget.style.borderColor =
                        "rgba(255,255,255,0.08)")
                      }
                    >
                      <div
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: "10px",
                          background: `${color}18`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <Icon size={17} color={color} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <p
                          style={{
                            fontWeight: 700,
                            color: "white",
                            margin: "0 0 0.1rem",
                            fontSize: "0.88rem",
                          }}
                        >
                          {label}
                        </p>
                        <p
                          style={{
                            color: "rgba(255,255,255,0.35)",
                            fontSize: "0.74rem",
                            margin: 0,
                          }}
                        >
                          {desc}
                        </p>
                      </div>
                      <ChevronRight size={15} color="rgba(255,255,255,0.2)" />
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ── Step 1: Conditional Questions ─────────────────── */}
            {step === 1 && (
              <motion.div
                key="s1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <div style={{ marginBottom: "1.1rem" }}>
                  <h2
                    style={{
                      fontSize: "1.2rem",
                      fontWeight: 600,
                      color: "white",
                      marginBottom: "0.2rem",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {path === "filing"
                      ? "Tax Filing Details"
                      : path === "starting"
                        ? "Tell us about your Startup"
                        : "Business Insights"}
                  </h2>
                  <p
                    style={{
                      color: "rgba(255,255,255,0.35)",
                      fontSize: "0.78rem",
                    }}
                  >
                    A few details to provide expert recommendations.
                  </p>
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "1rem",
                  }}
                >
                  {path === "filing" && (
                    <>
                      <Question
                        label="Are you a salaried employee?"
                        value={formData.salaried}
                        onChange={(v) =>
                          setFormData({ ...formData, salaried: v })
                        }
                      />
                      <Question
                        label="Do you have Capital Gains (Stocks / Property)?"
                        value={formData.capitalGains}
                        onChange={(v) =>
                          setFormData({ ...formData, capitalGains: v })
                        }
                      />
                      <Question
                        label="Have House Property / Rental Income?"
                        value={formData.houseProperty}
                        onChange={(v) =>
                          setFormData({ ...formData, houseProperty: v })
                        }
                      />
                      <Question
                        label="Other Sources (Interest / Dividends / Misc)?"
                        value={formData.otherSources}
                        onChange={(v) =>
                          setFormData({ ...formData, otherSources: v })
                        }
                      />
                    </>
                  )}

                  {path === "capital" && (
                    <>
                      <Question
                        label="Stocks, Mutual Funds or Crypto?"
                        value={formData.capitalGains}
                        onChange={(v) =>
                          setFormData({ ...formData, capitalGains: v })
                        }
                      />
                      <Question
                        label="Sold property (Flat, Land, House)?"
                        value={formData.houseProperty}
                        onChange={(v) =>
                          setFormData({ ...formData, houseProperty: v })
                        }
                      />
                      <Question
                        label="Other income (Dividends / Interest)?"
                        value={formData.otherSources}
                        onChange={(v) =>
                          setFormData({ ...formData, otherSources: v })
                        }
                      />
                    </>
                  )}

                  {path === "starting" && (
                    <>
                      <SelectQuestion
                        label="Expected annual revenue?"
                        options={[
                          "< 20 Lakhs",
                          "20 Lakhs - 1 Crore",
                          "> 1 Crore",
                        ]}
                        value={formData.expectedRevenue}
                        onChange={(v) =>
                          setFormData({ ...formData, expectedRevenue: v })
                        }
                      />
                      <Question
                        label="Have you registered the entity yet?"
                        value={formData.registered}
                        onChange={(v) =>
                          setFormData({ ...formData, registered: v })
                        }
                      />
                      <InputQuestion
                        label="Which industry are you in?"
                        placeholder="e.g. Tech, Retail, Service"
                        value={formData.industry}
                        onChange={(v) =>
                          setFormData({ ...formData, industry: v })
                        }
                      />
                      {/* Service needs selection for Starting a Business */}
                      <div>
                        <p
                          style={{
                            fontSize: "0.82rem",
                            fontWeight: 600,
                            marginBottom: "0.55rem",
                            color: "rgba(255,255,255,0.75)",
                          }}
                        >
                          Which services do you need?
                        </p>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: "0.45rem",
                          }}
                        >
                          {needsOptions.map(({ value, icon: Icon, color }) => {
                            const selected = formData.needs.includes(value);
                            return (
                              <button
                                key={value}
                                onClick={() => toggleNeed(value)}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "0.5rem",
                                  padding: "0.55rem 0.75rem",
                                  borderRadius: "8px",
                                  border: selected
                                    ? `1.5px solid ${color}`
                                    : "1.5px solid rgba(255,255,255,0.08)",
                                  background: selected
                                    ? `${color}12`
                                    : "rgba(255,255,255,0.03)",
                                  color: selected
                                    ? color
                                    : "rgba(255,255,255,0.35)",
                                  fontSize: "0.74rem",
                                  fontWeight: 600,
                                  cursor: "pointer",
                                  transition: "0.2s",
                                }}
                              >
                                <Icon size={12} /> {value}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}

                  {path === "having" && (
                    <>
                      <SelectQuestion
                        label="Current annual revenue?"
                        options={[
                          "< 40 Lakhs",
                          "40 Lakhs - 1.5 Crore",
                          "> 1.5 Crore",
                        ]}
                        value={formData.currentRevenue}
                        onChange={(v) =>
                          setFormData({ ...formData, currentRevenue: v })
                        }
                      />
                      <SelectQuestion
                        label="Team size?"
                        options={[
                          "1–5 Employees",
                          "5–20 Employees",
                          "20+ Employees",
                        ]}
                        value={formData.employeeCount}
                        onChange={(v) =>
                          setFormData({ ...formData, employeeCount: v })
                        }
                      />
                      <div>
                        <p
                          style={{
                            fontSize: "0.82rem",
                            fontWeight: 600,
                            marginBottom: "0.55rem",
                            color: "rgba(255,255,255,0.75)",
                          }}
                        >
                          Looking for specific services?
                        </p>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: "0.45rem",
                          }}
                        >
                          {needsOptions.map(({ value, icon: Icon, color }) => {
                            const selected = formData.needs.includes(value);
                            return (
                              <button
                                key={value}
                                onClick={() => toggleNeed(value)}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "0.5rem",
                                  padding: "0.55rem 0.75rem",
                                  borderRadius: "8px",
                                  border: selected
                                    ? `1.5px solid ${color}`
                                    : "1.5px solid rgba(255,255,255,0.08)",
                                  background: selected
                                    ? `${color}12`
                                    : "rgba(255,255,255,0.03)",
                                  color: selected
                                    ? color
                                    : "rgba(255,255,255,0.35)",
                                  fontSize: "0.74rem",
                                  fontWeight: 600,
                                  cursor: "pointer",
                                  transition: "0.2s",
                                }}
                              >
                                <Icon size={12} /> {value}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div
                  style={{
                    marginTop: "1.2rem",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <button
                    onClick={handleBack}
                    style={{
                      background: "none",
                      border: "none",
                      color: "rgba(255,255,255,0.35)",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.4rem",
                      cursor: "pointer",
                      fontWeight: 600,
                      fontSize: "0.82rem",
                      padding: 0,
                    }}
                  >
                    <ArrowLeft size={14} /> Back
                  </button>
                  <button
                    onClick={handleNext}
                    style={{
                      padding: "0.65rem 1.6rem",
                      borderRadius: "8px",
                      background: "linear-gradient(135deg, #16a34a, #22c55e)",
                      color: "white",
                      fontWeight: 700,
                      border: "none",
                      fontSize: "0.84rem",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.4rem",
                      boxShadow: "0 6px 20px rgba(34,197,94,0.25)",
                    }}
                  >
                    Continue <ArrowRight size={14} />
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── Step 2: Urgency ────────────────────────────────── */}
            {step === 2 && (
              <motion.div
                key="s2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <div style={{ marginBottom: "1.1rem" }}>
                  <h2
                    style={{
                      fontSize: "1.2rem",
                      fontWeight: 600,
                      color: "white",
                      marginBottom: "0.2rem",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    One last thing...
                  </h2>
                  <p
                    style={{
                      color: "rgba(255,255,255,0.35)",
                      fontSize: "0.78rem",
                    }}
                  >
                    When would you like to get started?
                  </p>
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.55rem",
                  }}
                >
                  {urgencyOptions.map(({ id, label, icon: Icon, color }) => {
                    const selected = formData.urgency === id;
                    return (
                      <button
                        key={id}
                        onClick={() =>
                          setFormData({ ...formData, urgency: id })
                        }
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.9rem",
                          padding: "0.85rem 1rem",
                          borderRadius: "12px",
                          border: selected
                            ? `1.5px solid ${color}`
                            : "1px solid rgba(255,255,255,0.08)",
                          background: selected
                            ? `${color}10`
                            : "rgba(255,255,255,0.03)",
                          cursor: "pointer",
                          textAlign: "left",
                          width: "100%",
                          transition: "all 0.2s",
                        }}
                      >
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: "9px",
                            background: `${color}18`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <Icon size={16} color={color} />
                        </div>
                        <span
                          style={{
                            fontWeight: 600,
                            fontSize: "0.86rem",
                            color: selected ? color : "rgba(255,255,255,0.6)",
                          }}
                        >
                          {label}
                        </span>
                        {selected && (
                          <CheckCircle
                            size={15}
                            color={color}
                            style={{ marginLeft: "auto" }}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>

                <div
                  style={{
                    marginTop: "1.2rem",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <button
                    onClick={handleBack}
                    style={{
                      background: "none",
                      border: "none",
                      color: "rgba(255,255,255,0.35)",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.4rem",
                      cursor: "pointer",
                      fontWeight: 600,
                      fontSize: "0.82rem",
                      padding: 0,
                    }}
                  >
                    <ArrowLeft size={14} /> Back
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={!formData.urgency}
                    style={{
                      padding: "0.65rem 1.6rem",
                      borderRadius: "8px",
                      background: formData.urgency
                        ? "linear-gradient(135deg, #16a34a, #22c55e)"
                        : "rgba(34,197,94,0.25)",
                      color: "white",
                      fontWeight: 700,
                      border: "none",
                      fontSize: "0.84rem",
                      cursor: formData.urgency ? "pointer" : "not-allowed",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.4rem",
                      boxShadow: formData.urgency
                        ? "0 6px 20px rgba(34,197,94,0.25)"
                        : "none",
                      transition: "all 0.3s ease",
                    }}
                  >
                    Generate Roadmap <Send size={13} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

export default Onboarding;
