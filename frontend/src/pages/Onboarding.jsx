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
  <div style={{ marginBottom: "0.4rem" }}>
    <p
      style={{
        fontSize: "0.82rem",
        fontWeight: 700,
        marginBottom: "0.5rem",
        color: "#111111",
      }}
    >
      {label}
    </p>
    <div style={{ display: "flex", gap: "0.6rem" }}>
      {[true, false].map((bool) => (
        <motion.button
          key={String(bool)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onChange(bool)}
          style={{
            flex: 1,
            padding: "0.65rem",
            borderRadius: "12px",
            cursor: "pointer",
            fontWeight: 700,
            fontSize: "0.82rem",
            border:
              value === bool
                ? "2px solid #16a34a"
                : "1px solid rgba(17,24,39,0.08)",
            background:
              value === bool
                ? "rgba(22,163,74,0.05)"
                : "#ffffff",
            color: value === bool ? "#16a34a" : "#4b5563",
            transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
            boxShadow: value === bool ? "0 4px 12px rgba(22,163,74,0.08)" : "none",
          }}
        >
          {bool ? "Yes" : "No"}
        </motion.button>
      ))}
    </div>
  </div>
);

const SelectQuestion = ({ label, options, value, onChange }) => (
  <div style={{ marginBottom: "0.4rem" }}>
    <p
      style={{
        fontSize: "0.82rem",
        fontWeight: 700,
        marginBottom: "0.5rem",
        color: "#111111",
      }}
    >
      {label}
    </p>
    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
      {options.map((opt) => (
        <motion.button
          key={opt}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onChange(opt)}
          style={{
            padding: "0.55rem 1rem",
            borderRadius: "10px",
            cursor: "pointer",
            fontWeight: 700,
            fontSize: "0.78rem",
            border:
              value === opt
                ? "2px solid #16a34a"
                : "1px solid rgba(17,24,39,0.08)",
            background:
              value === opt ? "rgba(22,163,74,0.05)" : "#ffffff",
            color: value === opt ? "#16a34a" : "#4b5563",
            transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
            boxShadow: value === opt ? "0 4px 12px rgba(22,163,74,0.08)" : "none",
          }}
        >
          {opt}
        </motion.button>
      ))}
    </div>
  </div>
);

const InputQuestion = ({ label, placeholder, value, onChange }) => (
  <div style={{ marginBottom: "0.4rem" }}>
    <p
      style={{
        fontSize: "0.82rem",
        fontWeight: 700,
        marginBottom: "0.5rem",
        color: "#111111",
      }}
    >
      {label}
    </p>
    <div
      style={{
        display: "flex",
        background: "#ffffff",
        border: "1px solid rgba(17,24,39,0.12)",
        padding: "0.7rem 1rem",
        borderRadius: "12px",
        transition: "all 0.2s ease",
      }}
      className="onboarding-input-container"
    >
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          background: "none",
          border: "none",
          color: "#111111",
          outline: "none",
          width: "100%",
          fontSize: "0.85rem",
          fontWeight: 500,
        }}
        onFocus={(e) => {
          e.currentTarget.parentElement.style.borderColor = "#16a34a";
          e.currentTarget.parentElement.style.boxShadow = "0 0 0 3px rgba(22,163,74,0.08)";
        }}
        onBlur={(e) => {
          e.currentTarget.parentElement.style.borderColor = "rgba(17,24,39,0.12)";
          e.currentTarget.parentElement.style.boxShadow = "none";
        }}
      />
    </div>
  </div>
);

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
    manualNeed: "",
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

  const handleSubmit = async () => {
    const needsSet = new Set(formData.needs);

    if (path === "filing") {
      if (formData.salaried === true) needsSet.add("salaried");
      if (formData.capitalGains === true) needsSet.add("capitalGains");
      if (formData.houseProperty === true) needsSet.add("houseProperty");
      if (formData.otherSources === true) needsSet.add("otherSources");
      const hasAnyFlag =
        formData.salaried === true ||
        formData.capitalGains === true ||
        formData.houseProperty === true ||
        formData.otherSources === true;
      if (!hasAnyFlag) needsSet.add("itrFiling");
    }

    if (path === "capital") {
      needsSet.add("capitalGains");
      if (formData.houseProperty === true) needsSet.add("houseProperty");
      if (formData.otherSources === true) needsSet.add("otherSources");
    }

    if (path === "starting") {
      const hasExplicitNeeds = formData.needs.length > 0;
      if (!hasExplicitNeeds) needsSet.add("startingBusiness");
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
      color: "#16a34a",
    },
    {
      id: "capital",
      label: "Capital Gains",
      icon: TrendingUp,
      desc: "Stocks, Crypto, or Property transactions",
      color: "#16a34a",
    },
    {
      id: "starting",
      label: "Starting a Business",
      icon: Rocket,
      desc: "Fresh registration, setup, and legal foundations",
      color: "#16a34a",
    },
    {
      id: "having",
      label: "Have a Business",
      icon: Building,
      desc: "Ongoing compliance, GST, Payroll, and growth",
      color: "#16a34a",
    },
  ];

  const urgencyOptions = [
    { id: "Immediate", label: "As soon as possible", icon: Zap, color: "#16a34a" },
    { id: "Planning", label: "In the next 1–3 months", icon: PieChart, color: "#16a34a" },
    { id: "Exploring", label: "Just exploring for now", icon: BarChart, color: "#16a34a" },
  ];

  const hasTextValue = (value) => typeof value === "string" && value.trim().length > 0;
  const hasSelectedBoolean = (value) => value === true || value === false;

  const canProceedFromStep1 =
    path === "filing"
      ? hasSelectedBoolean(formData.salaried) &&
        hasSelectedBoolean(formData.capitalGains) &&
        hasSelectedBoolean(formData.houseProperty)
      : path === "capital"
        ? hasSelectedBoolean(formData.capitalGains) && hasSelectedBoolean(formData.houseProperty)
        : path === "starting"
          ? hasTextValue(formData.expectedRevenue) &&
            hasSelectedBoolean(formData.registered) &&
              hasTextValue(formData.industry) &&
              hasTextValue(formData.manualNeed)
          : path === "having"
              ? hasTextValue(formData.currentRevenue) &&
                hasTextValue(formData.employeeCount) &&
                hasTextValue(formData.manualNeed)
            : false;

  const progressPct = ((step + 1) / 3) * 100;

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "radial-gradient(circle at 50% 0%, #f8fafc 0%, #ffffff 100%)",
        padding: "1.5rem 1rem",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Ambient glow */}
      <div
        style={{
          position: "absolute",
          top: "-10%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "100%",
          maxWidth: "1000px",
          height: "600px",
          background: "radial-gradient(circle, rgba(22,163,74,0.03) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        style={{ width: "100%", maxWidth: "520px", zIndex: 1 }}
      >
        {/* Progress bar */}
        <div style={{ marginBottom: "1.2rem", padding: "0 10px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.7rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Step {step + 1} / 3
            </span>
            <span style={{ fontSize: "0.7rem", color: "#16a34a", fontWeight: 800 }}>
              {Math.round(progressPct)}%
            </span>
          </div>
          <div style={{ height: "4px", background: "rgba(17,24,39,0.06)", borderRadius: "99px", overflow: "hidden" }}>
            <motion.div
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              style={{ height: "100%", background: "#16a34a", borderRadius: "99px" }}
            />
          </div>
        </div>

        {/* Card */}
        <div
          style={{
            background: "whitesmoke",
            borderRadius: "28px",
            border: "1px solid rgba(17,24,39,0.06)",
            padding: "1.8rem 2.2rem",
            boxShadow: "0 20px 40px -10px rgba(0, 0, 0, 0.05)",
            position: "relative",
          }}
        >
          {/* Logo */}
          <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
            <div style={{
              height: "60px",
              width: "60px",
              borderRadius: "16px",
              overflow: "hidden",
              margin: "0 auto",
              background: "#ffffff",
              border: "1px solid rgba(17,24,39,0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "8px",
              boxShadow: "0 4px 10px -2px rgba(0,0,0,0.03)"
            }}>
              <img
                src="/logo2.png"
                alt="Fin2Line Logo"
                style={{ height: "100%", width: "100%", objectFit: "contain" }}
              />
            </div>
          </div>

          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div
                key="s0"
                initial={{ opacity: 0, scale: 0.99, y: 5 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.99, y: -5 }}
                transition={{ duration: 0.25 }}
              >
                <div style={{ marginBottom: "1.5rem", textAlign: "center" }}>
                  <h2 style={{ fontSize: "1.45rem", fontWeight: 800, color: "#111111", marginBottom: "0.3rem", letterSpacing: "-0.02em" }}>
                    Welcome to <span style={{ color: "#16a34a" }}>Fin2Line</span>
                  </h2>
                  <p style={{ color: "#64748b", fontSize: "0.88rem", fontWeight: 500 }}>
                    Tailor your professional journey.
                  </p>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                  {mainPaths.map(({ id, icon: Icon, label, desc }) => (
                    <motion.button
                      key={id}
                      whileHover={{ scale: 1.01, backgroundColor: "#ffffff" }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => handlePathSelect(id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "1rem",
                        padding: "0.95rem",
                        borderRadius: "18px",
                        border: "1px solid rgba(17,24,39,0.06)",
                        background: "rgba(255,255,255,0.6)",
                        cursor: "pointer",
                        textAlign: "left",
                        width: "100%",
                        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                      }}
                    >
                      <div style={{
                        width: 42,
                        height: 42,
                        borderRadius: "12px",
                        background: "rgba(22,163,74,0.08)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}>
                        <Icon size={18} color="#16a34a" />
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: 800, color: "#111111", margin: "0 0 0.1rem", fontSize: "0.92rem" }}>
                          {label}
                        </p>
                        <p style={{ color: "#64748b", fontSize: "0.8rem", margin: 0, fontWeight: 500 }}>
                          {desc}
                        </p>
                      </div>
                      <ChevronRight size={16} color="rgba(17,24,39,0.2)" />
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 1 && (
              <motion.div
                key="s1"
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
                transition={{ duration: 0.3 }}
              >
                <div style={{ marginBottom: "1.4rem" }}>
                  <h2 style={{ fontSize: "1.35rem", fontWeight: 800, color: "#111111", marginBottom: "0.2rem", letterSpacing: "-0.02em" }}>
                    {path === "filing" ? "Tax Details" : path === "starting" ? "Startup Info" : "Business Insights"}
                  </h2>
                  <p style={{ color: "#94a3b8", fontSize: "0.78rem", fontWeight: 500, margin: 0 }}>
                    All fields in this step are required.
                  </p>
                  <p style={{ color: "#64748b", fontSize: "0.85rem", fontWeight: 500 }}>
                    Customize your expert roadmap.
                  </p>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
                  {path === "filing" && (
                    <>
                      <Question label="Are you a salaried employee?" value={formData.salaried} onChange={(v) => setFormData({ ...formData, salaried: v })} />
                      <Question label="Do you have Capital Gains?" value={formData.capitalGains} onChange={(v) => setFormData({ ...formData, capitalGains: v })} />
                      <Question label="Have House Property Income?" value={formData.houseProperty} onChange={(v) => setFormData({ ...formData, houseProperty: v })} />
                    </>
                  )}

                  {path === "capital" && (
                    <>
                      <Question label="Stocks or Crypto Gains?" value={formData.capitalGains} onChange={(v) => setFormData({ ...formData, capitalGains: v })} />
                      <Question label="Sold Real Estate / Property?" value={formData.houseProperty} onChange={(v) => setFormData({ ...formData, houseProperty: v })} />
                    </>
                  )}

                  {path === "starting" && (
                    <>
                      <SelectQuestion
                        label="Expected annual revenue?"
                        options={["< 20 Lakhs", "20 Lakhs - 1 Crore", "> 1 Crore"]}
                        value={formData.expectedRevenue}
                        onChange={(v) => setFormData({ ...formData, expectedRevenue: v })}
                      />
                      <Question label="Registered the entity yet?" value={formData.registered} onChange={(v) => setFormData({ ...formData, registered: v })} />
                      <InputQuestion label="Primary Industry" placeholder="e.g. Technology" value={formData.industry} onChange={(v) => setFormData({ ...formData, industry: v })} />
                      <InputQuestion
                        label="Enter Required services"
                        placeholder="e.g. GST Registration, Company Incorporation"
                        value={formData.manualNeed}
                        onChange={(v) => setFormData({ ...formData, manualNeed: v })}
                      />
                    </>
                  )}

                  {path === "having" && (
                    <>
                      <SelectQuestion
                        label="Current annual revenue?"
                        options={["< 40 Lakhs", "40 Lakhs - 1.5 Crore", "> 1.5 Crore"]}
                        value={formData.currentRevenue}
                        onChange={(v) => setFormData({ ...formData, currentRevenue: v })}
                      />
                      <SelectQuestion
                        label="Team size?"
                        options={["1–5 Employees", "5–20 Employees", "20+ Employees"]}
                        value={formData.employeeCount}
                        onChange={(v) => setFormData({ ...formData, employeeCount: v })}
                      />
                      <InputQuestion
                        label="Enter Required services"
                        placeholder="e.g. GST Filing, Payroll, ROC Filings"
                        value={formData.manualNeed}
                        onChange={(v) => setFormData({ ...formData, manualNeed: v })}
                      />
                    </>
                  )}
                </div>

                <div style={{ marginTop: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <motion.button whileHover={{ x: -2 }} onClick={handleBack} style={{ background: "none", border: "none", color: "#64748b", display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer", fontWeight: 700, fontSize: "0.85rem" }}>
                    <ArrowLeft size={14} /> Back
                  </motion.button>
                  <motion.button
                    whileHover={canProceedFromStep1 ? { scale: 1.02 } : {}}
                    whileTap={canProceedFromStep1 ? { scale: 0.98 } : {}}
                    onClick={handleNext}
                    disabled={!canProceedFromStep1}
                    style={{
                      padding: "0.7rem 1.5rem",
                      borderRadius: "12px",
                      background: canProceedFromStep1 ? "#111111" : "rgba(17,24,39,0.1)",
                      color: canProceedFromStep1 ? "white" : "#94a3b8",
                      fontWeight: 700,
                      border: "none",
                      fontSize: "0.85rem",
                      cursor: canProceedFromStep1 ? "pointer" : "not-allowed",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      transition: "all 0.2s",
                      boxShadow: "none",
                    }}
                  >
                    Next <ArrowRight size={14} />
                  </motion.button>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="s2"
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
                transition={{ duration: 0.3 }}
              >
                <div style={{ marginBottom: "1.4rem" }}>
                  <h2 style={{ fontSize: "1.35rem", fontWeight: 800, color: "#111111", marginBottom: "0.2rem", letterSpacing: "-0.02em" }}>
                    Timeline
                  </h2>
                  <p style={{ color: "#64748b", fontSize: "0.85rem", fontWeight: 500 }}>
                    When would you like to begin?
                  </p>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                  {urgencyOptions.map(({ id, label, icon: Icon }) => {
                    const selected = formData.urgency === id;
                    return (
                      <motion.button
                        key={id}
                        whileHover={{ scale: 1.01, backgroundColor: selected ? "rgba(22,163,74,0.06)" : "#ffffff" }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => setFormData({ ...formData, urgency: id })}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "1rem",
                          padding: "0.95rem",
                          borderRadius: "18px",
                          border: selected ? "2px solid #16a34a" : "1px solid rgba(17,24,39,0.06)",
                          background: selected ? "rgba(22,163,74,0.04)" : "rgba(255,255,255,0.6)",
                          cursor: "pointer",
                          textAlign: "left",
                          width: "100%",
                          transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                        }}
                      >
                        <div style={{
                          width: 38,
                          height: 38,
                          borderRadius: "10px",
                          background: selected ? "rgba(22,163,74,0.12)" : "rgba(17,24,39,0.04)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}>
                          <Icon size={16} color={selected ? "#16a34a" : "#64748b"} />
                        </div>
                        <span style={{ fontWeight: 700, fontSize: "0.9rem", color: selected ? "#111111" : "#4b5563", flex: 1 }}>
                          {label}
                        </span>
                        {selected && <CheckCircle size={16} color="#16a34a" />}
                      </motion.button>
                    );
                  })}
                </div>

                <div style={{ marginTop: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <motion.button whileHover={{ x: -2 }} onClick={handleBack} style={{ background: "none", border: "none", color: "#64748b", display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer", fontWeight: 700, fontSize: "0.85rem" }}>
                    <ArrowLeft size={14} /> Back
                  </motion.button>
                  <motion.button
                    whileHover={formData.urgency ? { scale: 1.02 } : {}}
                    whileTap={formData.urgency ? { scale: 0.98 } : {}}
                    onClick={handleSubmit}
                    disabled={!formData.urgency}
                    style={{
                      padding: "0.75rem 1.8rem",
                      borderRadius: "12px",
                      background: formData.urgency ? "#16a34a" : "rgba(17,24,39,0.1)",
                      color: "white",
                      fontWeight: 800,
                      border: "none",
                      fontSize: "0.9rem",
                      cursor: formData.urgency ? "pointer" : "not-allowed",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.6rem",
                      boxShadow: formData.urgency ? "0 8px 20px -4px rgba(22,163,74,0.3)" : "none",
                      transition: "all 0.3s ease",
                    }}
                  >
                    Finish <Send size={14} />
                  </motion.button>
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
