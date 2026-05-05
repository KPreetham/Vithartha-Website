import React, { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import {
  Check,
  Calendar,
  ChevronRight,
  ArrowRight,
  Star,
  Zap,
  Shield,
  BarChart3,
  FileCheck,
  Building,
  X,
  Users,
  ShieldAlert,
  CheckCircle,
  Clock,
  Search,
  AlertCircle,
  FileText,
  ArrowUpRight,
  Upload,
  ChevronDown,
  ChevronUp,
  Loader2,
  XCircle,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { formatInr, getServicePricing, parseFeeAmount } from "../utils/servicePricing";
import { viewDocument } from "../utils/documentViewer";

const iconMap = {
  "GST COMPLIANCE": Shield,
  "MCA & COMPANY COMPLIANCE": Building,
  "EPF, ESI & PAYROLL COMPLIANCE": Users,
  "INCOME TAX & ITR FILING": FileCheck,
  "TRUST & NGO COMPLIANCE": Star,
  "VIRTUAL CFO & ACCOUNTING SERVICES": BarChart3,
};

const categoryColors = {
  "GST COMPLIANCE": { color: "#10b981", bg: "rgba(16,185,129,0.08)" },
  "MCA & COMPANY COMPLIANCE": { color: "#f59e0b", bg: "rgba(245,158,11,0.08)" },
  "EPF, ESI & PAYROLL COMPLIANCE": { color: "#4361ee", bg: "rgba(67,97,238,0.08)" },
  "INCOME TAX & ITR FILING": { color: "#7c3aed", bg: "rgba(124,58,237,0.08)" },
  "TRUST & NGO COMPLIANCE": { color: "#f72585", bg: "rgba(247,37,133,0.08)" },
  "VIRTUAL CFO & ACCOUNTING SERVICES": { color: "#3b82f6", bg: "rgba(59,130,246,0.08)" },
  // Safe fallback used when a service has no category or an unknown category.
  Advisory: { color: "#22c55e", bg: "rgba(34,197,94,0.08)" },
};

const DOCUMENTS_REGISTRY = {
  common: [
    { name: "PAN Card", required: true, desc: "Copy of PAN card" },
    { name: "Aadhaar Card", required: true, desc: "Copy of Aadhaar card" },
    {
      name: "Bank Statements",
      required: true,
      desc: "All bank account statements for the financial year (April - March)",
    },
    {
      name: "Form 26AS / AIS / TIS",
      required: true,
      desc: "Download from Income Tax portal showing TDS credits",
    },
  ],
  salary: [
    {
      name: "Form 16 (Part A & B)",
      required: true,
      desc: "Issued by employer - mandatory for salaried individuals",
    },
    {
      name: "Salary Slips",
      required: false,
      desc: "Last 3 months salary slips (April, May, March)",
    },
    {
      name: "Previous Year IT Computation",
      required: false,
      desc: "Used for comparison and carry-forward losses",
    },
    {
      name: "Rent Receipts / HRA",
      required: false,
      desc: "Needed if HRA exemption claimed (landlord PAN required if rent > Rs. 1L/year)",
    },
    {
      name: "Section 80C Investment Proofs",
      required: false,
      desc: "LIC premium, PPF passbook, ELSS statements, home loan principal, school fees",
    },
    {
      name: "Medical Insurance Premium (80D)",
      required: false,
      desc: "Premium receipts for self, family, and parents",
    },
    {
      name: "NPS Contribution (80CCD)",
      required: false,
      desc: "NPS statement from NSDL / PRAN passbook",
    },
    {
      name: "Home Loan Interest Certificate",
      required: false,
      desc: "For deduction under section 24(b)",
    },
  ],
  capitalGains: [
    {
      name: "Demat Account Statement",
      required: true,
      desc: "Full-year statement showing buy/sell transactions",
    },
    {
      name: "Capital Gains Report from Broker",
      required: true,
      desc: "Zerodha Tax P&L / ICICI / HDFC report",
    },
    {
      name: "Mutual Fund Statement",
      required: true,
      desc: "CAMS or KFintech consolidated statement",
    },
    {
      name: "Sale Deed of Property",
      required: false,
      desc: "Registration copy if property sold",
    },
    {
      name: "Purchase Deed of Property Sold",
      required: false,
      desc: "Original purchase document for cost calculation",
    },
    {
      name: "Property Improvement Bills",
      required: false,
      desc: "Bills for renovations eligible for indexation",
    },
    {
      name: "Section 54/54F Investment Proof",
      required: false,
      desc: "New property purchase or CGAS deposit proof",
    },
  ],
  houseProperty: [
    {
      name: "Rental Agreement",
      required: true,
      desc: "Rent agreement with tenant details",
    },
    {
      name: "Rent Receipts / Rent Ledger",
      required: true,
      desc: "Month-wise rent received during the financial year",
    },
    {
      name: "Municipal Tax / Property Tax Receipt",
      required: true,
      desc: "Property tax paid during the year",
    },
    {
      name: "Home Loan Interest Certificate",
      required: false,
      desc: "Issued by bank/NBFC for interest deduction",
    },
    {
      name: "Property Registration Documents",
      required: false,
      desc: "Proof of ownership and ownership period",
    },
    {
      name: "Co-owner Details",
      required: false,
      desc: "PAN and ownership share of co-owners",
    },
  ],
  otherSources: [
    {
      name: "Bank Interest Certificates (Form 16A)",
      required: true,
      desc: "Certificates for FD or savings interest from banks",
    },
    {
      name: "Dividend Income Statement",
      required: true,
      desc: "DEMAT statement or Form 26AS showing dividend income",
    },
    {
      name: "Post Office Savings Passbook",
      required: false,
      desc: "If interest income from post office savings",
    },
    {
      name: "Lottery / Prize Winnings Proof",
      required: false,
      desc: "Form 16A for winnings above Rs. 10,000",
    },
    {
      name: "Family Pension Certificate",
      required: false,
      desc: "For family pension from a deceased government employee",
    },
  ],
};

// Fallback services in case API fails
const FALLBACK_SERVICES = [
  {
    title: "GST Registration",
    description:
      "Quick and compliant registration under GST with expert verification and documentation.",
    category: "Compliance",
    trigger: "GST Compliance",
  },
  {
    title: "GSTR 1 & 3B Filing",
    description:
      "From monthly compliance to reconciliation - we file your GST returns under one roof.",
    category: "Compliance",
    trigger: "GST Compliance",
  },
  {
    id: "itr-filing",
    title: "ITR Filing (Individuals)",
    description:
      "ITR Filing and expert consultation to ensure maximum refund and zero compliance errors.",
    category: "Tax",
    trigger: "Income Tax",
  },
  {
    id: "company-incorporation",
    title: "Company Incorporation",
    description:
      "Incorporation of Private Limited, Public Limited, OPC, or LLP with MCA compliance.",
    category: "Legal",
    trigger: "Registration",
  },
  {
    id: "mca-annual-filings",
    title: "MCA Annual Filings",
    description:
      "Annual filings compliance and management, including returns and necessary legal forms.",
    category: "Compliance",
    trigger: "Legal Advisory",
  },
];

/* 
   PREMIUM CARD 3D tilt + glow (reused from Admin)
*/
const PremiumCard = ({ children, style = {}, className = "", onClick }) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div
      className={className}
      onClick={onClick}
      style={{
        background: "var(--dashboard-card-bg)",
        borderRadius: isMobile ? "20px" : "24px",
        border: "1px solid var(--dashboard-card-border)",
        position: "relative",
        overflow: "hidden",
        backdropFilter: "blur(10px)",
        boxShadow: "var(--shadow-card)",
        padding: isMobile ? "1.25rem" : "1.5rem",
        ...style,
      }}
    >
      <div style={{ position: "relative", zIndex: 1 }}>{children}</div>
    </div>
  );
};

/*
  ADMIN SERVICES VIEW
*/
const AdminServicesView = () => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLead, setSelectedLead] = useState(null);
  const [expandedUser, setExpandedUser] = useState(null);
  const [expandedServiceId, setExpandedServiceId] = useState(null);
  const navigate = useNavigate();
  const isLightMode =
    typeof document !== "undefined" && document.body
      ? document.body.classList.contains("light-mode")
      : false;

  const fetchLeads = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const response = await axios.get(`${apiUrl}/leads`);
      console.log("[AdminServicesView] Fetched leads:", response.data);
      setLeads(response.data);
    } catch (error) {
      console.error("[AdminServicesView] Error fetching leads:", error);
      if (error.response) {
        console.error("[AdminServicesView] Response status:", error.response.status);
        console.error("[AdminServicesView] Response data:", error.response.data);
      }
      if (error.response?.status !== 404) {
        // toast.error("Failed to load service data"); // Removed as per user request
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const handleApprove = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const response = await axios.patch(`${apiUrl}/leads/${id}`, {
        status: "InProgress",
      });
      if (response.data) {
        toast.success("Service accepted and moved to In-Progress");
        fetchLeads();
        if (selectedLead?._id === id) setSelectedLead(null);
      }
    } catch (error) {
      toast.error("Failed to move to In-Progress");
    }
  };

  // Group leads by user
  const groupedByUser = leads.reduce((acc, lead) => {
    const key = lead.email || "Unknown";
    if (!acc[key]) {
      acc[key] = {
        name: lead.name,
        email: lead.email,
        userId: lead.user?._id,
        industry: lead.user?.profile?.industry,
        services: [],
      };
    }
    acc[key].services.push(lead);
    return acc;
  }, {});

  const userGroups = Object.values(groupedByUser).filter(
    (group) =>
      !searchQuery.trim() ||
      group.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      group.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      group.services.some((s) =>
        s.serviceName?.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
  );

  // Auto-expand users that match search
  useEffect(() => {
    if (searchQuery.trim()) {
      const matchingEmails = userGroups
        .filter(
          (g) =>
            g.services.some((s) =>
              s.serviceName?.toLowerCase().includes(searchQuery.toLowerCase()),
            ) || g.name?.toLowerCase().includes(searchQuery.toLowerCase()),
        )
        .map((g) => g.email);
      if (matchingEmails.length === 1) {
        setExpandedUser(matchingEmails[0]);
      }
    }
  }, [searchQuery]);

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      toast.error("Enter a name, email, or service to search");
      return;
    }
    if (userGroups.length === 0) {
      toast.error("No matching users or services found");
    } else {
      toast.success(
        `Found ${userGroups.length} user(s) matching "${searchQuery}"`,
      );
      if (userGroups.length === 1) {
        setExpandedUser(userGroups[0].email);
      }
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
    setExpandedUser(null);
  };

  const stats = {
    totalUsers: Object.keys(groupedByUser).length,
    totalServices: leads.length,
    pending: leads.filter((l) => l.status === "Open").length,
    completed: leads.filter((l) => l.status === "Completed").length,
  };

  if (loading)
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg)",
        }}
      >
        <div
          style={{
            width: "40px",
            height: "40px",
            border: "3px solid rgba(67,97,238,0.1)",
            borderTopColor: "#4361ee",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
          }}
        />
      </div>
    );

  return (
    <div
      className="admin-services-shell"
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        color: "var(--text)",
        paddingTop: "clamp(140px, 16vw, 180px)",
        paddingBottom: "80px",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 50% 0%, rgba(139, 92, 246, 0.06) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "0 clamp(1rem, 5vw, 2rem)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "4rem" }}>
          <h1
            style={{
              fontSize: "clamp(2rem, 5vw, 3rem)",
              fontWeight: 500,
              letterSpacing: "-0.03em",
              margin: 0,
              color: "var(--text)",
            }}
          >
            User Services.
          </h1>

          <p
            className="rec-subtext"
            style={{
              color: "var(--text-secondary)",
              fontSize: "1.1rem",
              marginTop: "0.6rem",
              maxWidth: "600px",
              margin: "0.6rem auto 2.5rem",
              lineHeight: 1.6,
            }}
          >
            View services chosen by each user and manage approvals with
            precision
          </p>

          {/* Centered Search Bar below heading */}
          <div
            className="admin-search-wrap"
            style={{
              display: "flex",
              gap: "1rem",
              justifyContent: "center",
              maxWidth: "600px",
              margin: "0 auto",
            }}
          >
            <div
              className="admin-search-input-shell"
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                gap: "12px",
                background: "transparent",
                border: "1px solid var(--border)",
                padding: "0.8rem 1.2rem",
                borderRadius: "18px",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              <Search size={18} color="var(--text-muted)" />
              <input
                type="text"
                placeholder="Search by name, email or service..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text)",
                  outline: "none",
                  width: "100%",
                  fontSize: "0.9rem",
                }}
              />
              {searchQuery && (
                <button
                  onClick={clearSearch}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--text-muted)",
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  <X size={16} />
                </button>
              )}
            </div>
            <button
              className="admin-search-btn"
              onClick={handleSearch}
              style={{
                background: "linear-gradient(135deg, #8b5cf6, #6d4dff)",
                border: "1px solid rgba(255,255,255,0.85)",
                color: "white",
                padding: "0.8rem 2rem",
                borderRadius: "18px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                fontWeight: 700,
                boxShadow: "0 10px 24px rgba(126, 87, 251, 0.22)",
                transition: "all 0.3s",
              }}
            >
              <Search size={18} /> Search
            </button>
          </div>
        </div>

        {/* User Groups */}
        <PremiumCard
          className="admin-services-card"
          style={{
            background: "var(--dashboard-card-bg)",
            border: "1px solid var(--dashboard-card-border)",
            padding: "clamp(1rem, 4vw, 2.5rem)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <div
            className="admin-services-head"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1.5rem",
            }}
          >
            <h2
              style={{
                fontSize: "1.15rem",
                fontWeight: 700,
                margin: 0,
                color: "var(--text)",
              }}
            >
              Services by User
            </h2>
            <span
              style={{
                fontSize: "0.75rem",
                color: "var(--text-muted)",
                fontWeight: 600,
              }}
            >
              {searchQuery.trim()
                ? `${userGroups.length} result(s)`
                : `${userGroups.length} users`}
            </span>
          </div>

          <div
            style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
          >
            {userGroups.length > 0 ? (
              userGroups.map((group, gi) => (
                <motion.div
                  key={group.email}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: gi * 0.05 }}
                  style={{
                    background: "var(--dashboard-row-bg)",
                    borderRadius: "20px",
                    border:
                      expandedUser === group.email
                        ? "1px solid rgba(255,255,255,0.95)"
                        : "1px solid var(--dashboard-card-border)",
                    overflow: "hidden",
                    transition: "border-color 0.3s",
                  }}
                >
                  {/* User Header */}
                  <div
                    onClick={() =>
                      setExpandedUser(
                        expandedUser === group.email ? null : group.email,
                      )
                    }
                    className="admin-user-header"
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "1.2rem 1.8rem",
                      cursor: "pointer",
                      transition: "background 0.2s",
                    }}
                    onMouseEnter={(e) =>
                    (e.currentTarget.style.background =
                      "var(--dashboard-highlight-bg)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.9rem",
                      }}
                    >
                      <div
                        style={{
                          width: "38px",
                          height: "38px",
                          borderRadius: "10px",
                          background: "linear-gradient(135deg, rgba(124,58,237,0.12), rgba(255,255,255,0.96))",
                          border: "1px solid rgba(255,255,255,0.95)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "0.9rem",
                          fontWeight: 800,
                          color: "#6d4dff",
                        }}
                      >
                        {group.name?.[0]?.toUpperCase() || "?"}
                      </div>
                      <div>
                        <div
                          style={{
                            fontWeight: 700,
                            fontSize: "0.95rem",
                            color: "var(--text)",
                          }}
                        >
                          {group.name}
                        </div>
                        <div
                          style={{
                            fontSize: "0.72rem",
                            color: "var(--text-muted)",
                          }}
                        >
                          {group.email}
                        </div>
                      </div>
                    </div>
                    <div
                      className="admin-user-right"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "1.2rem",
                      }}
                    >
                      <div
                        className="admin-user-stat-pills"
                        style={{
                          display: "flex",
                          gap: "1rem",
                          fontSize: "0.72rem",
                          fontWeight: 700,
                        }}
                      >
                        <span style={{ color: "#f59e0b" }}>
                          {
                            group.services.filter((s) => s.status === "Open")
                              .length
                          }{" "}
                          pending
                        </span>
                        <span style={{ color: "#10b981" }}>
                          {
                            group.services.filter(
                              (s) => s.status === "Completed",
                            ).length
                          }{" "}
                          done
                        </span>
                      </div>
                      {expandedUser === group.email ? (
                        <ChevronUp size={18} color="var(--text-muted)" />
                      ) : (
                        <ChevronDown size={18} color="var(--text-muted)" />
                      )}
                    </div>
                  </div>

                  {/* Expandable Services List */}
                  <AnimatePresence>
                    {expandedUser === group.email && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        style={{ overflow: "hidden" }}
                      >
                        <div
                          className="admin-expand-services"
                          style={{
                            padding: "0 2rem 1.5rem",
                            display: "flex",
                            flexDirection: "column",
                            gap: "0.8rem",
                          }}
                        >
                          <div
                            style={{
                              height: "1px",
                              background: "var(--border)",
                              marginBottom: "0.5rem",
                            }}
                          />
                          {group.services.map((lead, si) => (
                            <React.Fragment key={lead._id}>
                              <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: si * 0.05 }}
                                className="admin-service-subrow"
                                onClick={() =>
                                  setExpandedServiceId(
                                    expandedServiceId === lead._id
                                      ? null
                                      : lead._id,
                                  )
                                }
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  padding: "0.9rem 1.4rem",
                                  paddingTop: "1.15rem",
                                  background: "var(--dashboard-row-bg)",
                                  position: "relative",
                                  borderRadius:
                                    expandedServiceId === lead._id
                                      ? "14px 14px 0 0"
                                      : "14px",
                                  border:
                                    "1px solid " +
                                    (expandedServiceId === lead._id
                                      ? "rgba(34, 197, 94, 0.2)"
                                      : "var(--dashboard-card-border)"),
                                  cursor: "pointer",
                                  transition: "all 0.3s",
                                }}
                              >
                                {(() => {
                                  const status = String(lead.status || "").trim();
                                  const isRejected = status === "Rejected";
                                  const isAccepted = ["Completed", "InProgress", "AssignedToExecutor", "ExecutionFinished", "DraftAccepted", "UserAccepted", "PR_Accepted"].includes(status);
                                  const statusColor = isRejected ? "#ef4444" : "#10b981";
                                  const statusBg = isRejected ? "rgba(239,68,68,0.14)" : "rgba(16,185,129,0.14)";
                                  const StatusIcon = isRejected ? XCircle : CheckCircle;
                                  const statusLabel = isRejected
                                    ? "Rejected"
                                    : isAccepted
                                      ? "Active"
                                      : "Pending";
                                  return (
                                    <div
                                      style={{
                                        position: "absolute",
                                        top: "-12px",
                                        right: "16px",
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "6px",
                                        padding: "0.4rem 0.7rem",
                                        borderRadius: "999px",
                                        background: statusBg,
                                        border: `1px solid ${statusColor}33`,
                                        color: statusColor,
                                        fontSize: "0.68rem",
                                        fontWeight: 800,
                                        textTransform: "uppercase",
                                        letterSpacing: "0.06em",
                                        boxShadow: "0 10px 24px rgba(0,0,0,0.18)",
                                        zIndex: 2,
                                      }}
                                    >
                                      <StatusIcon size={13} />
                                      {statusLabel}
                                    </div>
                                  );
                                })()}
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "1rem",
                                    flex: 1,
                                  }}
                                >
                                  <div>
                                    <div
                                      style={{
                                        fontWeight: 700,
                                        fontSize: "0.9rem",
                                        color: "var(--text)",
                                      }}
                                    >
                                      {lead.serviceName}
                                    </div>
                                    <div
                                      style={{
                                        fontSize: "0.7rem",
                                        color: "var(--text-muted)",
                                        marginTop: "2px",
                                      }}
                                    >
                                      {new Date(
                                        lead.createdAt,
                                      ).toLocaleDateString("en-IN", {
                                        day: "numeric",
                                        month: "short",
                                        year: "numeric",
                                      })}
                                    </div>
                                  </div>
                                </div>

                                <div
                                  className="admin-service-subrow-actions"
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.8rem",
                                  }}
                                >
                                  {expandedServiceId === lead._id ? (
                                    <ChevronUp
                                      size={15}
                                      color="var(--text-muted)"
                                    />
                                  ) : (
                                    <ChevronDown
                                      size={15}
                                      color="var(--text-muted)"
                                    />
                                  )}
                                </div>
                              </motion.div>

                              <AnimatePresence>
                                {expandedServiceId === lead._id && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    style={{
                                      background: "var(--dashboard-row-bg)",
                                      border:
                                        "1px solid var(--dashboard-card-border)",
                                      borderTop: "none",
                                      borderRadius: "0 0 14px 14px",
                                      padding: "1rem 1.4rem",
                                      overflow: "hidden",
                                    }}
                                  >
                                    {/* Info Grid */}
                                    <div
                                      className="admin-service-meta-grid"
                                      style={{
                                        display: "grid",
                                        gridTemplateColumns: "1fr 1fr 1fr",
                                        gap: "0.8rem",
                                        marginBottom: "1rem",
                                      }}
                                    >
                                      <div>
                                        <div
                                          style={{
                                            fontSize: "0.6rem",
                                            color: "var(--text-muted)",
                                            textTransform: "uppercase",
                                            fontWeight: 700,
                                            letterSpacing: "0.05em",
                                            marginBottom: "3px",
                                          }}
                                        >
                                          Status
                                        </div>
                                        <div
                                          style={{
                                            fontSize: "0.82rem",
                                            fontWeight: 700,
                                            color: "var(--text)",
                                          }}
                                        >
                                          {lead.status === "Open"
                                            ? "Pending"
                                            : lead.status}
                                        </div>
                                      </div>
                                      <div>
                                        <div
                                          style={{
                                            fontSize: "0.6rem",
                                            color: "var(--text-muted)",
                                            textTransform: "uppercase",
                                            fontWeight: 700,
                                            letterSpacing: "0.05em",
                                            marginBottom: "3px",
                                          }}
                                        >
                                          Industry
                                        </div>
                                        <div
                                          style={{
                                            fontSize: "0.82rem",
                                            fontWeight: 700,
                                            color: "var(--text)",
                                          }}
                                        >
                                          {group.industry || "General"}
                                        </div>
                                      </div>
                                      <div>
                                        <div
                                          style={{
                                            fontSize: "0.6rem",
                                            color: "var(--text-muted)",
                                            textTransform: "uppercase",
                                            fontWeight: 700,
                                            letterSpacing: "0.05em",
                                            marginBottom: "3px",
                                          }}
                                        >
                                          Documents
                                        </div>
                                        <div
                                          style={{
                                            fontSize: "0.82rem",
                                            fontWeight: 700,
                                            color: "var(--text)",
                                          }}
                                        >
                                          {lead.documents?.length || 0} files
                                        </div>
                                      </div>
                                    </div>

                                    {/* User Message */}
                                    {lead.userMessage && (
                                      <div
                                        style={{
                                          marginBottom: "1rem",
                                          padding: "1rem 1.25rem",
                                          background:
                                            "rgba(16, 185, 129, 0.08)",
                                          borderRadius: "10px",
                                          border:
                                            "1px solid rgba(16, 185, 129, 0.15)",
                                        }}
                                      >
                                        <div
                                          style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "8px",
                                            marginBottom: "8px",
                                          }}
                                        >
                                          <span
                                            style={{
                                              fontSize: "0.7rem",
                                              fontWeight: 800,
                                              color: "#10b981",
                                              textTransform: "uppercase",
                                              letterSpacing: "0.05em",
                                            }}
                                          >
                                            User Message
                                          </span>
                                        </div>
                                        <p
                                          style={{
                                            fontSize: "0.85rem",
                                            color: "var(--text)",
                                            lineHeight: "1.5",
                                            margin: 0,
                                          }}
                                        >
                                          {lead.userMessage}
                                        </p>
                                      </div>
                                    )}
                                    {/* Document List - Vertical Rows */}
                                    {lead.documents?.length > 0 && (
                                      <div
                                        style={{
                                          display: "flex",
                                          flexDirection: "column",
                                          gap: "6px",
                                          marginBottom: "1rem",
                                        }}
                                      >
                                        {lead.documents.map((doc, idx) => (
                                          <div
                                            key={idx}
                                            className="admin-service-doc-row"
                                            style={{
                                              display: "flex",
                                              alignItems: "center",
                                              justifyContent: "space-between",
                                              padding: "8px 12px",
                                              background: "var(--bg-card)",
                                              border: "1px solid var(--border)",
                                              borderRadius: "10px",
                                            }}
                                          >
                                            <span
                                              style={{
                                                fontSize: "0.78rem",
                                                color: "var(--text)",
                                                fontWeight: 600,
                                              }}
                                            >
                                              {doc.name}
                                            </span>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                viewDocument(doc.publicId, doc.url, lead._id);
                                              }}
                                              style={{
                                                padding: "4px 12px",
                                                background:
                                                  "rgba(34, 197, 94, 0.1)",
                                                border:
                                                  "1px solid rgba(34, 197, 94, 0.2)",
                                                color: "#22c55e",
                                                borderRadius: "8px",
                                                fontSize: "0.7rem",
                                                fontWeight: 700,
                                                cursor: "pointer",
                                                transition: "all 0.2s",
                                                whiteSpace: "nowrap",
                                              }}
                                            >
                                              View
                                            </button>
                                          </div>
                                        ))}
                                      </div>
                                    )}

                                    {/* Action Buttons - Equal Width */}
                                    <div
                                      className="admin-service-actions-grid"
                                      style={{
                                        display: "grid",
                                        gridTemplateColumns: "1fr 1fr",
                                        gap: "0.5rem",
                                      }}
                                    >
                                      {lead.status === "Open" && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            navigate(
                                              `/admin/review/${lead._id}`,
                                            );
                                          }}
                                          style={{
                                            padding: "8px",
                                            background: "#22c55e",
                                            border: "none",
                                            color: "white",
                                            borderRadius: "10px",
                                            fontWeight: 700,
                                            cursor: "pointer",
                                            fontSize: "0.78rem",
                                            transition: "all 0.3s",
                                          }}
                                        >
                                          Accept & Review
                                        </button>
                                      )}
                                      {(lead.status === "Open" ||
                                        lead.status === "InProgress") && (
                                          <button
                                            onClick={async (e) => {
                                              e.stopPropagation();
                                              if (
                                                window.confirm(
                                                  "Reject this service request?",
                                                )
                                              ) {
                                                try {
                                                  const apiUrl = import.meta.env
                                                    .VITE_API_URL;
                                                  await axios.patch(
                                                    `${apiUrl}/leads/${lead._id}`,
                                                    { status: "Rejected" },
                                                  );
                                                  toast.success(
                                                    "Service rejected",
                                                  );
                                                  fetchLeads();
                                                } catch (err) {
                                                  toast.error("Failed to reject");
                                                }
                                              }
                                            }}
                                            style={{
                                              padding: "8px",
                                              background:
                                                "rgba(239, 68, 68, 0.08)",
                                              border:
                                                "1px solid rgba(239, 68, 68, 0.2)",
                                              color: "#ef4444",
                                              borderRadius: "10px",
                                              fontWeight: 700,
                                              cursor: "pointer",
                                              fontSize: "0.78rem",
                                              transition: "all 0.3s",
                                            }}
                                          >
                                            Reject
                                          </button>
                                        )}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </React.Fragment>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))
            ) : (
              <div
                style={{
                  textAlign: "center",
                  padding: "4rem",
                  background: "var(--dashboard-row-bg)",
                  borderRadius: "24px",
                  border: "1px dashed var(--dashboard-card-border)",
                }}
              >
                <AlertCircle
                  size={40}
                  color="var(--text-muted)"
                  style={{ marginBottom: "1rem" }}
                />
                <div style={{ color: "var(--text-muted)", fontWeight: 600 }}>
                  No user services found
                </div>
              </div>
            )}
          </div>
        </PremiumCard>
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedLead && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 1000,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(0,0,0,0.85)",
              backdropFilter: "blur(8px)",
              padding: "1rem",
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 14 }}
              className="rec-modal-content"
              style={{
                width: "100%",
                maxWidth: "500px",
                background: isLightMode
                  ? "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(244,238,255,0.98) 100%)"
                  : "var(--secondary)",
                border: isLightMode
                  ? "1px solid rgba(255,255,255,0.95)"
                  : "1px solid rgba(34, 197, 94, 0.2)",
                position: "relative",
                padding: "1.5rem 2rem",
                borderRadius: "28px",
                boxShadow: isLightMode
                  ? "0 30px 60px rgba(126, 87, 251, 0.12)"
                  : "0 30px 60px rgba(0,0,0,0.5)",
              }}
            >
              <button
                onClick={() => setSelectedLead(null)}
                style={{
                  position: "absolute",
                  top: "1.5rem",
                  right: "1.5rem",
                  background: "none",
                  border: "none",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                }}
              >
                <X size={22} />
              </button>

              <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
                <div
                  style={{
                    width: "60px",
                    height: "60px",
                    borderRadius: "18px",
                    background: isLightMode
                      ? "linear-gradient(135deg, #8b5cf6, #6d4dff)"
                      : "linear-gradient(135deg, #22c55e, #16a34a)",
                    margin: "0 auto 1rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.5rem",
                    fontWeight: 900,
                    color: "white",
                    boxShadow: isLightMode
                      ? "0 12px 28px rgba(126, 87, 251, 0.22)"
                      : "0 10px 25px rgba(34, 197, 94, 0.3)",
                  }}
                >
                  {selectedLead.name?.[0]}
                </div>
                <h3
                  style={{
                    fontSize: "1.5rem",
                    fontWeight: 800,
                    margin: 0,
                    color: "var(--text)",
                  }}
                >
                  {selectedLead.name}
                </h3>
                <p
                  style={{
                    color: "var(--text-muted)",
                    marginTop: "0.4rem",
                    fontSize: "0.85rem",
                    fontWeight: 500,
                  }}
                >
                  Lead Service Details
                </p>
              </div>

              <div
                className="admin-grid"
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "1rem",
                  marginBottom: "1.5rem",
                  padding: "1.2rem",
                  background: "var(--dashboard-row-bg)",
                  borderRadius: "20px",
                  border: "1px solid var(--dashboard-card-border)",
                }}
              >
                {[
                  {
                    label: "Service Engagement",
                    value: selectedLead.serviceName,
                  },
                  {
                    label: "Industry Context",
                    value: selectedLead.user?.profile?.industry || "N/A",
                  },
                  {
                    label: "Process Status",
                    value:
                      selectedLead.status === "Open"
                        ? "Pending Approval"
                        : selectedLead.status,
                  },
                  { label: "Contact Email", value: selectedLead.email },
                  {
                    label: "Business Type",
                    value: selectedLead.user?.profile?.businessType || "N/A",
                  },
                  {
                    label: "Annual Revenue",
                    value: selectedLead.user?.profile?.revenue || "N/A",
                  },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.6rem",
                    }}
                  >
                    <label
                      style={{
                        fontSize: "0.65rem",
                        fontWeight: 800,
                        color: isLightMode ? "#6d4dff" : "#22c55e",
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                      }}
                    >
                      {item.label}
                    </label>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: "0.8rem",
                        color: "var(--text)",
                        lineHeight: 1.4,
                      }}
                    >
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>

              {selectedLead.userMessage && (
                <div
                  style={{
                    marginBottom: "1.2rem",
                    padding: "1rem 1.25rem",
                    background: isLightMode
                      ? "linear-gradient(135deg, rgba(124,58,237,0.08), rgba(255,255,255,0.96))"
                      : "rgba(16, 185, 129, 0.08)",
                    borderRadius: "16px",
                    border: isLightMode
                      ? "1px solid rgba(255,255,255,0.95)"
                      : "1px solid rgba(16, 185, 129, 0.15)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      marginBottom: "8px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.7rem",
                        fontWeight: 800,
                        color: isLightMode ? "#6d4dff" : "#10b981",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      Message from User
                    </span>
                  </div>
                  <p
                    style={{
                      fontSize: "0.9rem",
                      color: "var(--text)",
                      lineHeight: "1.5",
                      margin: 0,
                    }}
                  >
                    {selectedLead.userMessage}
                  </p>
                </div>
              )}

              <div style={{ marginBottom: "1.2rem" }}>
                <label
                  style={{
                    fontSize: "0.62rem",
                    fontWeight: 800,
                    color: isLightMode ? "#6d4dff" : "#22c55e",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    marginBottom: "0.6rem",
                  }}
                >
                  <FileText size={12} /> Documents
                </label>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                  }}
                >
                  {selectedLead.documents?.length > 0 ? (
                    selectedLead.documents.map((doc, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          padding: "8px 10px",
                          background: isLightMode
                            ? "rgba(255,255,255,0.9)"
                            : "var(--dashboard-row-bg)",
                          borderRadius: "10px",
                          border: isLightMode
                            ? "1px solid rgba(255,255,255,0.95)"
                            : "1px solid var(--dashboard-card-border)",
                        }}
                      >
                        <FileText size={13} color={isLightMode ? "#6d4dff" : "#10b981"} />
                        <span
                          style={{
                            fontSize: "0.78rem",
                            flex: 1,
                            color: "var(--text)",
                          }}
                        >
                          {doc.name}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div
                      style={{
                        padding: "1rem",
                        textAlign: "center",
                        borderRadius: "12px",
                        background: "var(--dashboard-row-bg)",
                        border: "1px dashed var(--dashboard-card-border)",
                        color: "var(--text-muted)",
                        fontSize: "0.75rem",
                      }}
                    >
                      No documents uploaded yet.
                    </div>
                  )}
                </div>
              </div>

              {selectedLead.status === "Open" ? (
                <button
                  onClick={() => navigate(`/admin/review/${selectedLead._id}`)}
                  style={{
                    width: "100%",
                    padding: "1.2rem",
                    background: isLightMode
                      ? "linear-gradient(135deg, #8b5cf6, #6d4dff)"
                      : "#22c55e",
                    border: "1px solid rgba(255,255,255,0.85)",
                    color: "white",
                    borderRadius: "18px",
                    fontWeight: 800,
                    fontSize: "1rem",
                    cursor: "pointer",
                    boxShadow: isLightMode
                      ? "0 12px 28px rgba(126, 87, 251, 0.22)"
                      : "0 8px 24px rgba(34, 197, 94, 0.3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "10px",
                    transition: "all 0.3s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.transform = "translateY(-2px)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.transform = "translateY(0)")
                  }
                >
                  <FileText size={20} /> Review Documentation
                </button>
              ) : selectedLead.status !== "Completed" ? (
                <button
                  onClick={() => handleApprove(selectedLead._id)}
                  style={{
                    width: "100%",
                    padding: "1.2rem",
                    background: isLightMode
                      ? "linear-gradient(135deg, #8b5cf6, #6d4dff)"
                      : "#22c55e",
                    border: "1px solid rgba(255,255,255,0.85)",
                    color: "white",
                    borderRadius: "18px",
                    fontWeight: 800,
                    fontSize: "1rem",
                    cursor: "pointer",
                    boxShadow: isLightMode
                      ? "0 12px 28px rgba(126, 87, 251, 0.22)"
                      : "0 8px 24px rgba(34, 197, 94, 0.3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "10px",
                    transition: "all 0.3s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.transform = "translateY(-2px)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.transform = "translateY(0)")
                  }
                >
                  <CheckCircle size={20} /> Mark as In-Progress
                </button>
              ) : (
                <div
                  style={{
                    width: "100%",
                    padding: "1.2rem",
                    background: isLightMode
                      ? "linear-gradient(135deg, rgba(124,58,237,0.08), rgba(255,255,255,0.96))"
                      : "rgba(34, 197, 94, 0.08)",
                    border: isLightMode
                      ? "1px solid rgba(255,255,255,0.95)"
                      : "1px solid rgba(34, 197, 94, 0.2)",
                    color: isLightMode ? "#6d4dff" : "#22c55e",
                    borderRadius: "18px",
                    fontWeight: 800,
                    fontSize: "1rem",
                    textAlign: "center",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "10px",
                  }}
                >
                  <CheckCircle size={20} /> Service Completed
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

/* --------------------------------------------------
   MAIN RECOMMENDATIONS COMPONENT
-------------------------------------------------- */
/* --------------------------------------------------
   HELPER COMPONENTS
   -------------------------------------------------- */
const ServiceCard = ({
  service,
  idx,
  onClick,
  isLightMode = false,
  isMobile = false,
  topBadge = null,
}) => {
  const cat = service.category || "Advisory";
  const Icon = iconMap[cat] || Zap;

  return (
    <div key={idx} style={{ position: "relative", display: "flex", flexDirection: "column" }}>
      <div
        onClick={() => onClick(service)}
        style={{
          background: isLightMode
            ? "linear-gradient(180deg, rgba(227,230,236,0.98) 0%, rgba(211,216,223,0.98) 100%)"
            : "linear-gradient(180deg, rgba(38, 42, 50, 0.98) 0%, rgba(24, 28, 35, 0.98) 100%)",
          borderRadius: isMobile ? "20px" : "24px",
          border: isLightMode
            ? "1px solid rgba(198,205,214,0.98)"
            : "1px solid rgba(110,118,132,0.22)",
          display: "flex",
          flexDirection: "column",
          cursor: "pointer",
          height: "100%",
          transition: "all 0.2s ease",
          position: "relative",
          overflow: "hidden",
          minHeight: isMobile ? "unset" : "360px",
          boxShadow: isLightMode
            ? "0 18px 42px rgba(31, 41, 55, 0.07)"
            : "0 18px 42px rgba(31, 41, 55, 0.08)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = isLightMode
            ? "rgba(214,219,227,1)"
            : "rgba(110, 118, 132, 0.34)";
          e.currentTarget.style.transform = "translateY(-4px)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = isLightMode
            ? "rgba(214,219,227,0.98)"
            : "rgba(110,118,132,0.22)";
          e.currentTarget.style.transform = "none";
        }}
      >
        {topBadge && (
          <div
            style={{
              position: "absolute",
              top: 12,
              right: 12,
              zIndex: 3,
            }}
          >
            {topBadge}
          </div>
        )}
        <div
          style={{
            height: 4,
            background: "linear-gradient(90deg, rgba(148,163,184,0.22), rgba(203,213,225,0.62))",
          }}
        />
        <div
          style={{
            padding: isMobile
              ? "2.8rem 1.25rem 1.25rem"
              : "3.4rem 2rem 1.8rem",
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: isMobile ? "0.8rem" : "1.2rem",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "flex-start",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <div
              style={{
                width: isMobile ? 40 : 44,
                height: isMobile ? 40 : 44,
                borderRadius: "12px",
                background: isLightMode
                  ? "rgba(223,227,233,0.98)"
                  : "rgba(55, 60, 70, 0.92)",
                border: isLightMode
                  ? "1px solid rgba(198,205,214,0.98)"
                  : "1px solid rgba(110,118,132,0.24)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon size={isMobile ? 18 : 20} color={isLightMode ? "#111827" : "#d1d5db"} />
            </div>
            <span
              style={{
                background: isLightMode
                  ? "rgba(223,227,233,0.98)"
                  : "rgba(55, 60, 70, 0.92)",
                border: isLightMode
                  ? "1px solid rgba(198,205,214,0.98)"
                  : "1px solid rgba(110,118,132,0.24)",
                color: isLightMode ? "#111827" : "#ffffff",
                padding: "0.35rem 0.8rem",
                borderRadius: "99px",
                fontSize: isMobile ? "0.68rem" : "0.78rem",
                fontWeight: 600,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              {service.category}
            </span>
          </div>
          <div>
            <h3
              style={{
                fontSize: isMobile ? "1.1rem" : "1.25rem",
                fontWeight: 600,
                color: isLightMode ? "#111827" : "#ffffff",
                marginBottom: "0.5rem",
                letterSpacing: "-0.01em",
              }}
            >
              {service.title}
            </h3>
            <p
              style={{
                color: isLightMode ? "#111827" : "#ffffff",
                fontSize: isMobile ? "0.82rem" : "0.88rem",
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              {service.description}
            </p>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              marginTop: "auto",
              paddingTop: "1rem",
            }}
          >
            <span
              style={{
                fontSize: isMobile ? "0.75rem" : "0.8rem",
                color: isLightMode ? "#111827" : "#ffffff",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              Learn More <ArrowRight size={14} />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

const NoServicesFound = ({ onClear, isLightMode = false }) => (
  <div
    style={{
      textAlign: "center",
      padding: "4rem 1rem",
      background: isLightMode ? "linear-gradient(180deg, rgba(227,230,236,0.98) 0%, rgba(211,216,223,0.98) 100%)" : "linear-gradient(180deg, rgba(38, 42, 50, 0.98) 0%, rgba(24, 28, 35, 0.98) 100%)",
      borderRadius: "24px",
      border: "1px solid rgba(198,205,214,0.98)",
      boxShadow: "0 18px 40px rgba(31, 41, 55, 0.08)",
    }}
  >
    <Search
      size={48}
      color="#6b7280"
      style={{ marginBottom: "1rem" }}
    />
    <h3 style={{ fontSize: "1.2rem", color: "#111827", marginBottom: "0.5rem" }}>
      No services found
    </h3>
    <p style={{ color: "#111827" }}>
      We couldn't find any services matching your search.
    </p>
    <button
      onClick={onClear}
      className="btn btn-primary"
      style={{
        marginTop: "1rem",
        background: "linear-gradient(135deg, #8b5cf6, #6d4dff)",
        border: "1px solid rgba(255,255,255,0.85)",
        borderRadius: "12px",
        boxShadow: "0 12px 24px rgba(126, 87, 251, 0.18)",
      }}
    >
      Clear Search
    </button>
  </div>
);

const Recommendations = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { recommendations, userData, fallback } = location.state || {
    recommendations: [],
    userData: null,
    fallback: false,
  };

  const [selectedService, setSelectedService] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [interestData, setInterestData] = useState({ name: "", email: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [userLeads, setUserLeads] = useState([]);
  const [allDbServices, setAllDbServices] = useState([]);
  const storedUser = JSON.parse(localStorage.getItem("user"));

  const [uploadedDocs, setUploadedDocs] = useState(() => {
    const saved = localStorage.getItem("pending_uploads");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Check if it belongs to the current user to avoid cross-user data leaks
        if (parsed.userId === (storedUser?._id || storedUser?.id)) {
          return parsed.docs || {};
        }
      } catch (e) {
        console.error("Error parsing saved uploads", e);
      }
    }
    return {};
  }); // { [serviceTitle]: { [docName]: Array<{ name, url }> | { name, url } } }
  const isAdmin = storedUser?.role === "admin";
  const [dismissedServiceRejectionSignatures, setDismissedServiceRejectionSignatures] = useState({});
  const [isEditingService, setIsEditingService] = useState(false);
  const [editedService, setEditedService] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [isLightMode, setIsLightMode] = useState(() => {
    if (typeof document !== "undefined" && document.body) {
      return document.body.classList.contains("light-mode");
    }
    return localStorage.getItem("theme") === "light";
  });
  const mobileNavbarOffset = "calc(env(safe-area-inset-top, 0px) + 5.6rem)";
  const selectedServicePricing = selectedService
    ? getServicePricing(selectedService.title)
    : null;
  const selectedServiceRecommendedFeeAmount = selectedService
    ? (parseFeeAmount(selectedService.recommendedFees) ??
      selectedServicePricing?.amount ??
      1000)
    : 1000;

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
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

    const bodyObserver = new MutationObserver(syncThemeState);
    if (document.body) {
      bodyObserver.observe(document.body, {
        attributes: true,
        attributeFilter: ["class"],
      });
    }

    window.addEventListener("storage", syncThemeState);

    return () => {
      bodyObserver.disconnect();
      window.removeEventListener("storage", syncThemeState);
    };
  }, []);

  useEffect(() => {
    const checkUser = () => {
      const user = JSON.parse(localStorage.getItem("user"));
      if (user) {
        setIsLoggedIn(true);
        setInterestData({ name: user.name || "", email: user.email || "" });
      } else {
        setIsLoggedIn(false);
        setInterestData({ name: "", email: "" });
      }
    };
    checkUser();
    window.addEventListener("storage", checkUser);
    return () => window.removeEventListener("storage", checkUser);
  }, [selectedService]);

  // Persist uploaded docs to localStorage whenever they change
  useEffect(() => {
    const userId = storedUser?._id || storedUser?.id;
    if (userId) {
      localStorage.setItem(
        "pending_uploads",
        JSON.stringify({
          userId,
          docs: uploadedDocs,
        }),
      );
    }
  }, [uploadedDocs, storedUser?._id, storedUser?.id]);

  // Memoized document filtering logic
  const getActiveDocs = useCallback(
    (service) => {
      if (!service) return [];

      // If the service has documentsRequired from DB, use them
      if (Array.isArray(service.documentsRequired) && service.documentsRequired.length > 0) {
        return service.documentsRequired
          .filter((docName) => normalizeText(docName) !== "gross annual value data")
          .map(docName => ({
            name: docName,
            required: true, // Assuming all listed docs are required for simplicity
            desc: `Please upload your ${docName}`
          }));
      }

      // Fallback to registry logic
      let list = [...DOCUMENTS_REGISTRY.common];

      // Use userData from location state if available, else fallback to storedUser profile
      const profile = userData || storedUser?.profile || {};

      // Income Tax specific documents
      if (service.trigger === "Income Tax") {
        if (
          profile.salaried ||
          service.title?.toLowerCase().includes("salary")
        ) {
          list = [...list, ...DOCUMENTS_REGISTRY.salary];
        }
        if (
          profile.capitalGains ||
          service.title?.toLowerCase().includes("capital gains")
        ) {
          list = [...list, ...DOCUMENTS_REGISTRY.capitalGains];
        }
        if (
          profile.houseProperty ||
          service.title?.toLowerCase().includes("house property") ||
          service.title?.toLowerCase().includes("rental")
        ) {
          list = [...list, ...DOCUMENTS_REGISTRY.houseProperty];
        }
        if (
          profile.otherSources ||
          service.title?.toLowerCase().includes("dividend") ||
          service.title?.toLowerCase().includes("interest")
        ) {
          list = [...list, ...DOCUMENTS_REGISTRY.otherSources];
        }
      }

      return list;
    },
    [userData, storedUser?.profile],
  );

  useEffect(() => {
    const fetchAllServices = async () => {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL}/services`,
        );
        setAllDbServices(response.data);
      } catch (error) {
        console.error("Error fetching services from DB:", error);
        setAllDbServices(FALLBACK_SERVICES);
      }
    };
    fetchAllServices();
  }, []);

  const ALL_SERVICES = (allDbServices.length > 0 ? allDbServices : FALLBACK_SERVICES);

  useEffect(() => {
    const fetchUserLeads = async () => {
      const userId = storedUser?._id || storedUser?.id;
      if (isLoggedIn && userId) {
        try {
          const apiUrl = import.meta.env.VITE_API_URL;

          // For admin/PR/executor - fetch ALL leads without userId filter
          // For regular users - fetch only their own leads
          let url = `${apiUrl}/leads`;
          if (storedUser?.role === "user") {
            url += `?userId=${userId}`;
          }

          const response = await axios.get(url, {
            headers: { Authorization: `Bearer ${storedUser.token}` },
          });
          setUserLeads(response.data);
          console.log("[Recommendations] Fetched userLeads:", response.data);
        } catch (error) {
          console.error("Error fetching user leads:", error);
        }
      }
    };

    fetchUserLeads();

    const refreshTimer = setInterval(fetchUserLeads, 15000);
    const handleFocus = () => fetchUserLeads();
    window.addEventListener("focus", handleFocus);

    return () => {
      clearInterval(refreshTimer);
      window.removeEventListener("focus", handleFocus);
    };
  }, [isLoggedIn, storedUser?._id, storedUser?.id, storedUser?.role]);

  function normalizeText(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  const getExecutorRejectionReason = useCallback((lead) => {
    const rawMessage = String(lead?.executorMessage || lead?.prFeedback || "").trim();
    if (!rawMessage) return "";

    const cleaned = rawMessage
      .replace(/^assignment rejected by executor:\s*/i, "")
      .replace(/^rejected by executor:\s*/i, "")
      .trim();

    return cleaned || rawMessage;
  }, []);

  const serviceNamesMatch = useCallback((serviceTitleA, serviceTitleB) => {
    const a = normalizeText(serviceTitleA);
    const b = normalizeText(serviceTitleB);
    if (!a || !b) return false;
    return a === b || a.includes(b) || b.includes(a);
  }, []);

  const isExecutorRejectedLead = useCallback(
    (lead) => {
      if (!lead || lead?.status !== "Rejected") return false;
      const execMsg = String(lead?.executorMessage || "").trim();
      const prMsg = String(lead?.prFeedback || "").toLowerCase();
      const adminMsg = String(lead?.adminMessage || "").toLowerCase();

      return (
        execMsg.length > 0 ||
        prMsg.includes("executor") ||
        prMsg.includes("assignment") ||
        adminMsg.includes("executor") ||
        adminMsg.includes("assignment") ||
        prMsg.includes("rejected by executor")
      );
    },
    [],
  );

  const isPrRejectedLead = useCallback(
    (lead) => {
      if (!lead || lead?.status !== "Rejected") return false;
      return !isExecutorRejectedLead(lead);
    },
    [isExecutorRejectedLead],
  );

  const getLatestLeadForService = useCallback(
    (serviceTitle) => {
      const sorted = [...userLeads].sort((a, b) => {
        const aTime = new Date(a?.updatedAt || a?.createdAt || 0).getTime();
        const bTime = new Date(b?.updatedAt || b?.createdAt || 0).getTime();
        return bTime - aTime;
      });

      return (
        sorted.find(
          (lead) =>
            serviceNamesMatch(lead?.serviceName, serviceTitle),
        ) || null
      );
    },
    [userLeads, serviceNamesMatch],
  );

  const getRejectedLeadForService = useCallback(
    (serviceTitle) => {
      const sorted = [...userLeads].sort((a, b) => {
        const aTime = new Date(a?.updatedAt || a?.createdAt || 0).getTime();
        const bTime = new Date(b?.updatedAt || b?.createdAt || 0).getTime();
        return bTime - aTime;
      });

      return (
        sorted.find(
          (lead) =>
            serviceNamesMatch(lead?.serviceName, serviceTitle) &&
            isPrRejectedLead(lead),
        ) ||
        sorted.find(
          (lead) =>
            serviceNamesMatch(lead?.serviceName, serviceTitle) &&
            isExecutorRejectedLead(lead),
        ) ||
        null
      );
    },
    [userLeads, isExecutorRejectedLead, isPrRejectedLead, serviceNamesMatch],
  );

  const getDocumentState = useCallback(
    (serviceTitle, docName) => {
      const lead = getLatestLeadForService(serviceTitle);
      const serviceRejectionState = getServiceRejectionState(serviceTitle);
      const serverDocs = Array.isArray(lead?.documents)
        ? lead.documents.filter(
          (doc) =>
            normalizeText(doc?.name) === normalizeText(docName),
        )
        : [];
      const localDoc = uploadedDocs?.[serviceTitle]?.[docName];
      const localDocsArr = Array.isArray(localDoc)
        ? localDoc
        : localDoc
          ? [localDoc]
          : [];
      const serverDocsArr = Array.isArray(serverDocs) ? serverDocs : [];

      if (serviceRejectionState) {
        if (localDocsArr.length > 0) {
          const first = localDocsArr[0];
          return {
            uploaded: true,
            reuploadRequired: false,
            message: "Reuploaded. Ready to submit.",
            uploadedName: first?.name || docName,
            uploadedUrl: first?.url || "",
            publicId: first?.publicId || "",
            uploadedNames: localDocsArr.map((d) => d?.name).filter(Boolean),
            uploadedUrls: localDocsArr.map((d) => d?.url).filter(Boolean),
            fullDocs: localDocsArr,
          };
        }

        return {
          uploaded: false,
          reuploadRequired: true,
          message: "Please reupload the corrected file below.",
          uploadedName: docName,
          uploadedUrl: "",
          publicId: "",
          uploadedNames: localDocsArr.map((d) => d?.name).filter(Boolean),
          uploadedUrls: localDocsArr.map((d) => d?.url).filter(Boolean),
          fullDocs: localDocsArr,
        };
      }

      // If user already uploaded a replacement locally, treat it as the latest state.
      if (localDocsArr.length > 0) {
        const first = localDocsArr[0];
        return {
          uploaded: true,
          reuploadRequired: false,
          message: "",
          uploadedName: first?.name || docName,
          uploadedUrl: first?.url || "",
          publicId: first?.publicId || "",
          uploadedNames: localDocsArr.map((d) => d?.name).filter(Boolean),
          uploadedUrls: localDocsArr.map((d) => d?.url).filter(Boolean),
          fullDocs: localDocsArr,
        };
      }

      if (serverDocsArr.length > 0) {
        const nonRejected = [...serverDocsArr]
          .sort((a, b) => {
            const aTime = new Date(a?.uploadedAt || a?.createdAt || 0).getTime();
            const bTime = new Date(b?.uploadedAt || b?.createdAt || 0).getTime();
            return bTime - aTime;
          })
          .find((d) => d?.status !== "Rejected");
        const latest =
          [...serverDocsArr].sort((a, b) => {
            const aTime = new Date(a?.uploadedAt || a?.createdAt || 0).getTime();
            const bTime = new Date(b?.uploadedAt || b?.createdAt || 0).getTime();
            return bTime - aTime;
          })[0] || null;

        const selectedDoc = nonRejected || latest;
        return {
          uploaded: true,
          reuploadRequired: !nonRejected && latest?.status === "Rejected",
          message:
            String(latest?.rejectionMessage || "").trim() ||
            "This document was rejected. Please reupload the corrected file.",
          uploadedName: selectedDoc?.name || docName,
          uploadedUrl: selectedDoc?.url || "",
          publicId: selectedDoc?.publicId || "",
          uploadedNames: serverDocsArr.map((d) => d?.name).filter(Boolean),
          uploadedUrls: serverDocsArr.map((d) => d?.url).filter(Boolean),
          fullDocs: serverDocsArr,
        };
      }

      return {
        uploaded: false,
        reuploadRequired: false,
        message: "",
        uploadedName: docName,
        uploadedUrl: "",
        uploadedNames: [],
        uploadedUrls: [],
      };
    },
    [getLatestLeadForService, uploadedDocs],
  );

  const getServiceRejectionState = useCallback(
    (serviceTitle) => {
      const lead =
        getRejectedLeadForService(serviceTitle) ||
        getLatestLeadForService(serviceTitle);
      if (!lead || String(lead?.status || "").trim().toLowerCase() !== "rejected") {
        return null;
      }

      if (isExecutorRejectedLead(lead)) {
        const reason = getExecutorRejectionReason(lead);
        return {
          lead,
          type: "executor",
          status: "Rejected by Executor",
          message: reason || "The executor rejected this service.",
        };
      }

      const prReason = String(lead?.prFeedback || "").trim();
      const adminReason = String(lead?.adminMessage || "").trim();
      const displayReason = prReason || adminReason;

      return {
        lead,
        type: "pr",
        status: "Rejected by PR",
        message: displayReason || "The PR rejected this service.",
      };
    },
    [
      getLatestLeadForService,
      getRejectedLeadForService,
      getExecutorRejectionReason,
      isExecutorRejectedLead,
    ],
  );

  const getServiceRejectionSignature = useCallback(
    (serviceTitle) => {
      const serviceRejectionState = getServiceRejectionState(serviceTitle);
      if (!serviceRejectionState) return "";

      return [
        normalizeText(serviceTitle),
        normalizeText(serviceRejectionState.message),
        String(serviceRejectionState.lead?._id || serviceRejectionState.lead?.id || ""),
      ].join("::");
    },
    [getServiceRejectionState],
  );

  const renderServiceCardBadge = useCallback(
    (serviceTitle) => {
      const serviceRejectionState = getServiceRejectionState(serviceTitle);
      if (serviceRejectionState) {
        const dismissed =
          dismissedServiceRejectionSignatures[normalizeText(serviceTitle)] ===
          getServiceRejectionSignature(serviceTitle);
        if (dismissed) return null;

        return (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "0.38rem 0.72rem",
              borderRadius: "999px",
              background: "rgba(239, 68, 68, 0.14)",
              border: "1px solid rgba(239, 68, 68, 0.32)",
              color: "#ef4444",
              fontWeight: 800,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              fontSize: "0.7rem",
              whiteSpace: "nowrap",
              boxShadow: "0 10px 24px rgba(0,0,0,0.14)",
            }}
          >
            {serviceRejectionState.status}
          </div>
        );
      }

      const latestLead = getLatestLeadForService(serviceTitle);
      if (String(latestLead?.status || "").trim() !== "Completed") return null;

      return (
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "0.38rem 0.72rem",
            borderRadius: "999px",
            background: "rgba(16, 185, 129, 0.14)",
            border: "1px solid rgba(16, 185, 129, 0.32)",
            color: "#10b981",
            fontWeight: 800,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            fontSize: "0.7rem",
            whiteSpace: "nowrap",
            boxShadow: "0 10px 24px rgba(0,0,0,0.14)",
          }}
        >
          Completed
        </div>
      );
    },
    [
      dismissedServiceRejectionSignatures,
      getLatestLeadForService,
      getServiceRejectionSignature,
      getServiceRejectionState,
    ],
  );

  const dismissServiceRejectionMessage = useCallback(
    (serviceTitle) => {
      const signature = getServiceRejectionSignature(serviceTitle);
      if (!signature) return;

      const key = normalizeText(serviceTitle);
      setDismissedServiceRejectionSignatures((prev) => ({
        ...prev,
        [key]: signature,
      }));
    },
    [getServiceRejectionSignature],
  );

  // If admin - don't return early, let them see the same User Services and Other Services view
  // Admin will have a view-only mode with no upload buttons
  // if (isAdmin) {
  //   return <AdminServicesView />;
  // }

  // -- Section separator - clean, rule-based personalised service engine ---
  // Maps each need/flag from the user's onboarding profile to exact service titles.
  // This is the single source of truth for what goes under "Your Personalised Services".

  // Merge userData (fresh from onboarding redirect) with stored user profile
  const activeProfile = { ...(storedUser?.profile || {}), ...(userData || {}) };
  const userNeeds = Array.isArray(activeProfile.needs)
    ? activeProfile.needs
    : [];
  const hasOnboardingProfile = !!(
    userData ||
    userNeeds.length > 0 ||
    activeProfile.path ||
    activeProfile.businessStage
  );

  const personalisedTitles = new Set();

  // Aliases are written in business language, but we always resolve them to a
  // title that actually exists in ALL_SERVICES (DB or fallback) to avoid
  // "matched but not displayable" situations.
  const SERVICE_ALIASES = {
    "GST Registration": ["gst registration"],
    "GSTR 1 & 3B Filing": [
      "gstr 1 filing",
      "gstr 1 & 3b filing",
      "gstr 1 and 3b filing",
      "gstr1 filing",
    ],
    "ITR Filing (Individuals)": ["itr filing", "income tax filing"],
    "Company Incorporation": [
      "company incorporation",
      "private limited",
      "llp",
      "company incorporation pvt ltd llp",
    ],
    "Virtual CFO Service": ["virtual cfo", "virtual cfo service"],
    "Accounts Bookkeeping": ["accounts bookkeeping", "bookkeeping", "accounts"],
    "MCA Annual Filings": ["mca annual filings", "roc filings"],
    "Legal & Secretarial Services": ["legal secretarial services", "legal advisory"],
    "EPF & ESI Management": ["epf esi management", "epf esi", "payroll"],
    "TDS Filing": ["tds filing", "tds payment returns", "tds payroll compliance"],
    "Capital Gains": ["capital gains", "capital gains tax filing", "sale of property"],
    "MSME (Udyam) Registration": ["msme registration", "udyam registration"],
  };

  const resolveBestServiceTitleForAlias = (aliasNormalized) => {
    if (!aliasNormalized) return null;

    const candidates = ALL_SERVICES
      .map((service) => ({
        title: service.title,
        normalized: normalizeText(service.title),
      }))
      .filter((item) => item.normalized);

    // Prefer exact normalized title matches first
    const exact = candidates.find((c) => c.normalized === aliasNormalized);
    if (exact) return exact.title;

    // Next: require all alias tokens to exist in the service title tokens.
    const tokens = aliasNormalized.split(" ").filter(Boolean);
    if (tokens.length === 0) return null;

    const tokenMatches = candidates.filter((c) =>
      tokens.every((t) => c.normalized.includes(t)),
    );
    if (tokenMatches.length === 0) return null;

    // Choose the most specific (shortest title) among matches.
    tokenMatches.sort((a, b) => a.normalized.length - b.normalized.length);
    return tokenMatches[0].title;
  };

  const SERVICE_LOOKUP = (() => {
    const lookup = new Map();

    const register = (title, aliases = []) => {
      [title, ...aliases].forEach((label) => {
        const normalized = normalizeText(label);
        if (normalized && !lookup.has(normalized)) {
          lookup.set(normalized, title);
        }
      });
    };

    ALL_SERVICES.forEach((service) => {
      register(service.title);
    });

    Object.entries(SERVICE_ALIASES).forEach(([preferredTitle, aliases]) => {
      // Try to resolve the preferred title to an existing service title first.
      const preferredResolved =
        resolveBestServiceTitleForAlias(normalizeText(preferredTitle)) ||
        preferredTitle;

      // Only register the preferred title if it actually exists in ALL_SERVICES.
      const preferredExists = ALL_SERVICES.some(
        (s) => normalizeText(s?.title) === normalizeText(preferredResolved),
      );
      if (preferredExists) {
        register(preferredResolved);
      }

      // Register each alias directly to the best-matching existing title.
      (aliases || []).forEach((alias) => {
        const resolved = resolveBestServiceTitleForAlias(normalizeText(alias));
        if (resolved) {
          register(resolved, [alias]);
        }
      });
    });

    return lookup;
  })();

  const splitManualNeed = (input) =>
    String(input || "")
      .split(/[,;\n/]/g)
      .flatMap((chunk) => chunk.split(/\s+and\s+/gi))
      .map((part) => part.replace(/\s+/g, " ").trim())
      .filter(Boolean);

  const SERVICE_PHRASES = Array.from(SERVICE_LOOKUP.entries())
    .sort((a, b) => b[0].length - a[0].length);

  const findServiceTitles = (input) => {
    const entries = splitManualNeed(input);
    const matchedTitles = new Set();
    const normalizedInput = normalizeText(input);

    entries.forEach((entry) => {
      const normalizedEntry = normalizeText(entry);
      if (!normalizedEntry) return;
      const matchedTitle = SERVICE_LOOKUP.get(normalizedEntry);
      if (matchedTitle) {
        matchedTitles.add(matchedTitle);
      }
    });

    SERVICE_PHRASES.forEach(([phrase, title]) => {
      if (!phrase || !title) return;
      if (matchedTitles.has(title)) return;
      if (normalizedInput.includes(phrase)) {
        matchedTitles.add(title);
      }
    });

    return matchedTitles;
  };

  const getManualNeedServices = (input) => {
    const entries = splitManualNeed(input);
    const normalizedEntries = entries
      .map((raw) => ({ raw, normalized: normalizeText(raw) }))
      .filter((e) => e.normalized);

    const matchedTitles = findServiceTitles(input);
    const matchedServices = ALL_SERVICES.filter((s) => matchedTitles.has(s.title));

    const matchedNormalizedTitles = new Set(
      matchedServices.map((s) => normalizeText(s.title)),
    );

    const customServices = normalizedEntries
      .filter((e) => {
        const resolvedTitle = SERVICE_LOOKUP.get(e.normalized);
        if (resolvedTitle) return false;
        if (matchedNormalizedTitles.has(e.normalized)) return false;
        return true;
      })
      .map((e) => ({
        title: e.raw,
        description:
          "This is a service you requested during onboarding. Open it to share details and documents with our team.",
        category: "Advisory",
        trigger: "Requested",
      }));

    // Preserve the user's order as much as possible:
    // 1) catalog matches resolved from entries (in entry order)
    // 2) any remaining catalog matches (from phrase scan)
    // 3) custom requested cards for unmatched entries
    const orderedMatched = [];
    const usedTitles = new Set();

    normalizedEntries.forEach((e) => {
      const resolvedTitle = SERVICE_LOOKUP.get(e.normalized);
      if (!resolvedTitle) return;

      const svc = ALL_SERVICES.find(
        (s) => normalizeText(s.title) === normalizeText(resolvedTitle),
      );
      if (svc && !usedTitles.has(svc.title)) {
        orderedMatched.push(svc);
        usedTitles.add(svc.title);
      }
    });

    matchedServices.forEach((svc) => {
      if (!usedTitles.has(svc.title)) {
        orderedMatched.push(svc);
        usedTitles.add(svc.title);
      }
    });

    return [...orderedMatched, ...customServices];
  };

  const selectedPathRules = {
    filing: {
      flags: {
        // Each entry is a user-facing alias; we resolve it to an existing
        // ALL_SERVICES title via SERVICE_LOOKUP / resolver.
        salaried: ["itr filing", "income tax filing"],
        capitalGains: ["capital gains", "capital gains tax filing"],
        houseProperty: ["house property", "rental income"],
        otherSources: ["other income", "interest income", "dividend income"],
      },
      // Exactly 2 services when user selected "No" for all flags
      fallback: ["itr filing", "tds filing"],
    },
    capital: {
      flags: {
        capitalGains: ["capital gains", "capital gains tax filing"],
        houseProperty: ["sale of property", "house property"],
        otherSources: ["other income", "interest income", "dividend income"],
      },
      fallback: ["capital gains", "sale of property"],
    },
  };

  const addManualNeedMatches = (targetSet, input) => {
    findServiceTitles(input).forEach((title) => targetSet.add(title));
  };

  if (activeProfile.path === "filing" || activeProfile.path === "capital") {
    const pathRules = selectedPathRules[activeProfile.path];
    const hasAnyYes = Object.keys(pathRules.flags).some(
      (flagKey) => activeProfile[flagKey] === true,
    );

    if (hasAnyYes) {
      // If the user said "Yes" to any option, include ALL services implied by
      // every "Yes" answer (no limiting).
      Object.keys(pathRules.flags).forEach((flagKey) => {
        if (activeProfile[flagKey] === true) {
          pathRules.flags[flagKey].forEach((alias) => {
            // Resolve alias to an existing catalog service title
            const normalizedAlias = normalizeText(alias);
            const direct = SERVICE_LOOKUP.get(normalizedAlias);
            if (direct) {
              personalisedTitles.add(direct);
              return;
            }
            const resolved = resolveBestServiceTitleForAlias(normalizedAlias);
            if (resolved) personalisedTitles.add(resolved);
          });
        }
      });
    } else {
      // If the user selected "No" for all options, show exactly 2 services
      // for the chosen path (filing vs capital).
      const two = [];
      const used = new Set();

      const addUpToTwoFromAlias = (alias) => {
        if (two.length >= 2) return;
        const normalizedAlias = normalizeText(alias);
        const direct = SERVICE_LOOKUP.get(normalizedAlias);
        const resolved = direct || resolveBestServiceTitleForAlias(normalizedAlias);
        if (resolved && !used.has(resolved)) {
          used.add(resolved);
          two.push(resolved);
        }
      };

      // Primary defaults based on the path
      pathRules.fallback.forEach((alias) => addUpToTwoFromAlias(alias));

      // Safety net: if matching yields < 2 (e.g., DB service names differ),
      // pick two obvious services from the catalog by keyword.
      if (two.length < 2) {
        const keyword =
          activeProfile.path === "capital" ? "capital gains" : "itr filing";
        ALL_SERVICES.forEach((svc) => {
          if (two.length >= 2) return;
          const text = normalizeText(
            [svc.title, svc.description, svc.trigger, svc.category]
              .filter(Boolean)
              .join(" "),
          );
          if (text.includes(keyword)) {
            const t = svc.title;
            if (!used.has(t)) {
              used.add(t);
              two.push(t);
            }
          }
        });
      }

      two.slice(0, 2).forEach((t) => personalisedTitles.add(t));
    }

  } else if (
    activeProfile.path === "starting" ||
    activeProfile.path === "having"
  ) {
    // Starting/Having now rely only on the typed "required services" field.
    addManualNeedMatches(personalisedTitles, activeProfile.manualNeed);
  }

  // Path-specific defaults to ensure "Personalised Services" is not empty
  if (personalisedTitles.size === 0 && activeProfile.path) {
    // Leave empty when the user hasn't typed any required services.
    // This keeps the personalised section strictly user-driven.
  }

  // Apply search filter
  const filterFn = (s) => {
    const query = searchQuery.toLowerCase().trim();
    if (query === "") return true;
    return (
      s.title.toLowerCase().includes(query) ||
      (s.description && s.description.toLowerCase().includes(query)) ||
      (s.category && s.category.toLowerCase().includes(query)) ||
      (s.trigger && s.trigger.toLowerCase().includes(query))
    );
  };

  const personalisedServices =
    activeProfile.path === "starting" || activeProfile.path === "having"
      ? getManualNeedServices(activeProfile.manualNeed)
      : ALL_SERVICES.filter((s) => personalisedTitles.has(s.title));

  const submittedServiceLeads = (() => {
    const sorted = [...userLeads].sort((a, b) => {
      const aTime = new Date(a?.updatedAt || a?.createdAt || 0).getTime();
      const bTime = new Date(b?.updatedAt || b?.createdAt || 0).getTime();
      return bTime - aTime;
    });

    const map = new Map();
    sorted.forEach((lead) => {
      const key = String(lead?.serviceName || "").trim().toLowerCase();
      if (key && !map.has(key)) {
        map.set(key, lead);
      }
    });

    return Array.from(map.values());
  })();

  const submittedServices = submittedServiceLeads
    .map((lead) => {
      const serviceName = String(lead?.serviceName || "").trim();
      const normalizedLead = normalizeText(serviceName);

      const matchedService =
        // 1) Exact match by normalized title
        ALL_SERVICES.find(
          (service) =>
            normalizeText(String(service?.title || "")) === normalizedLead,
        ) ||
        // 2) Alias-based match (so "TDS Filing" maps to the real catalog entry)
        (() => {
          const resolved =
            SERVICE_LOOKUP.get(normalizedLead) ||
            resolveBestServiceTitleForAlias(normalizedLead);
          if (!resolved) return null;
          return ALL_SERVICES.find(
            (service) =>
              normalizeText(String(service?.title || "")) ===
              normalizeText(resolved),
          );
        })() ||
        // 3) Token containment as a last resort
        ALL_SERVICES.find((service) => {
          const normalizedTitle = normalizeText(String(service?.title || ""));
          if (!normalizedTitle) return false;
          const tokens = normalizedLead.split(" ").filter(Boolean);
          return tokens.length > 0 && tokens.every((t) => normalizedTitle.includes(t));
        });

      if (matchedService) return matchedService;

      return {
        title: serviceName,
        description:
          "This service was already submitted by you and is being tracked in your workflow.",
        category: "Advisory",
        trigger: "Submitted",
      };
    })
    .filter((service) => !!service?.title);

  const hasSubmittedServices = isLoggedIn && submittedServices.length > 0;

  // Strict onboarding behavior: if profile exists, top section shows only profile-related services.
  // No fallback-to-generic inside personalised section for onboarded users.
  let myServices;
  const isSearching = searchQuery.trim() !== "";

  if (isSearching) {
    // When searching, look through ALL available services + any custom submitted ones
    const searchPool = new Map();
    ALL_SERVICES.forEach(s => searchPool.set(s.title, s));
    submittedServices.forEach(s => {
      if (!searchPool.has(s.title)) searchPool.set(s.title, s);
    });
    myServices = Array.from(searchPool.values()).filter(filterFn);
  } else if (hasSubmittedServices) {
    // Priority 1: If logged in and has active services, show them first
    myServices = submittedServices;
  } else if (hasOnboardingProfile) {
    // Priority 2: Personalised services from onboarding
    myServices = personalisedServices;
  } else if (recommendations && recommendations.length > 0) {
    // Priority 3: Recommendations from state
    const recTitles = new Set(recommendations.map((r) => r.title));
    myServices = ALL_SERVICES.filter((s) => recTitles.has(s.title));
  } else {
    // Default fallback
    myServices = ALL_SERVICES.filter((s) =>
      [
        "ITR Filing (Individuals)",
        "GST Registration",
        "Virtual CFO Service",
        "Company Incorporation",
      ].includes(s.title),
    );
  }

  // Moved above for reference scope

  // isSearching is already defined above
  // The redundant submittedServices filtering block is removed as it's now handled in the main myServices logic.

  const displayedMyServiceTitles = new Set(myServices.map((s) => s.title));

  // Everything else goes to "Other Services"
  const otherServices = isSearching
    ? []
    : ALL_SERVICES.filter((s) => !displayedMyServiceTitles.has(s.title));

  const CATEGORY_ORDER = [
    "GST COMPLIANCE",
    "MCA & COMPANY COMPLIANCE",
    "EPF, ESI & PAYROLL COMPLIANCE",
    "INCOME TAX & ITR FILING",
    "TRUST & NGO COMPLIANCE",
    "VIRTUAL CFO & ACCOUNTING SERVICES"
  ];

  const groupedOtherServices = otherServices.reduce((acc, s) => {
    const cat = s.category || "VIRTUAL CFO & ACCOUNTING SERVICES";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(s);
    return acc;
  }, {});

  const ALL_OTHER_CATS = Object.keys(groupedOtherServices).filter(
    (cat) => !CATEGORY_ORDER.includes(cat)
  );
  const FINAL_CATEGORY_ORDER = [...CATEGORY_ORDER, ...ALL_OTHER_CATS];

  const handleSearch = () => {
    // Search updates live as the user types.
  };

  const isFreshOnboarding =
    !!location.state?.recommendations || !!location.state?.fallback;

  return (
    <div
      className="home-page-shell"
      style={{
        background: "var(--bg)",
        minHeight: "100vh",
        paddingTop: "clamp(110px, 12vw, 140px)",
        transition: "background 0.3s ease",
      }}
    >
      <div className="home-page-backdrop" aria-hidden="true" />
      {/* Show background elements ONLY if not logged in or fresh onboarding */}
      {(!isLoggedIn || isFreshOnboarding) && (
        <div className="page-gradient-accent" style={{ opacity: 0.4 }} />
      )}

      {/* Header */}
      <section
        style={{
          background: "transparent",
          padding: "clamp(2rem, 8vw, 4rem) clamp(1rem, 5vw, 2rem) 3.5rem",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div className="container" style={{ textAlign: "center" }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(2rem, 4vw, 3rem)",
                fontWeight: 500,
                letterSpacing: "0.05em",
                marginBottom: "1.2rem",
                color: "var(--text)",
              }}
            >
              {searchQuery.trim() !== "" ? (
                "Search Results"
              ) : hasSubmittedServices ? (
                <>
                  Your Services
                </>
              ) : hasOnboardingProfile || (recommendations?.length > 0) ? (
                <>
                  Your Personalised Services
                </>
              ) : (
                <>
                  Your Service Roadmap
                </>
              )}
            </h1>
            <p
              className="rec-subtext"
              style={{
                color: "var(--text-secondary)",
                fontSize: "1rem",
                maxWidth: "600px",
                margin: "0 auto",
                marginBottom: "2.5rem",
                lineHeight: 1.6,
              }}
            >
              {searchQuery.trim() !== ""
                ? `Showing services matching "${searchQuery}"`
                : hasSubmittedServices
                  ? "These are the services you already submitted. Open any service to track and update documents."
                  : hasOnboardingProfile
                    ? "Based on your onboarding answers, we've curated only the services that match your selected path and follow-up responses."
                    : "Based on your business profile, we've curated the most impactful services to accelerate your growth and ensure compliance."}
            </p>

            <div
              style={{
                display: "flex",
                justifyContent: "center",
                maxWidth: "500px",
                margin: "0 auto",
              }}
            >
              <div
                style={{
                  display: "flex",
                  width: "100%",
                  alignItems: "center",
                  gap: "10px",
                  background: isLightMode
                    ? "linear-gradient(180deg, rgba(214,219,227,0.98) 0%, rgba(198,205,214,0.98) 100%)"
                    : "transparent",
                  border: isLightMode
                    ? "1px solid rgba(181,189,199,0.98)"
                    : "1px solid rgba(110,118,132,0.22)",
                  padding: "0.65rem 0.65rem 0.65rem 1.15rem",
                  borderRadius: "16px",
                  boxShadow: isLightMode
                    ? "0 16px 32px rgba(31, 41, 55, 0.06)"
                    : "0 16px 32px rgba(31, 41, 55, 0.08)",
                }}
              >
                <Search size={18} color={isLightMode ? "#111827" : "#6b7280"} />
                <input
                  type="text"
                  className="service-search-input"
                  placeholder="Search specific services..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: isLightMode ? "#111827" : "#ffffff",
                    outline: "none",
                    width: "100%",
                    fontSize: "0.95rem",
                    fontWeight: 600,
                  }}
                />
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery("");
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      color: isLightMode ? "#111827" : "rgba(17,24,39,0.55)",
                      cursor: "pointer",
                      padding: "0.5rem",
                      display: "flex",
                    }}
                  >
                    <X size={16} />
                  </button>
                )}
                <button
                  onClick={handleSearch}
                  style={{
                    background: isLightMode
                      ? "linear-gradient(135deg, #d3d8e0, #bcc4ce)"
                      : "linear-gradient(135deg, #4b5563, #374151)",
                    border: isLightMode
                      ? "1px solid rgba(148,163,184,0.48)"
                      : "1px solid rgba(255,255,255,0.12)",
                    color: isLightMode ? "#111827" : "#ffffff",
                    padding: "0.6rem 1.2rem",
                    borderRadius: "12px",
                    cursor: "pointer",
                    fontWeight: 700,
                    fontSize: "0.85rem",
                    transition: "all 0.2s",
                    boxShadow: isLightMode
                      ? "0 10px 24px rgba(31, 41, 55, 0.10)"
                      : "0 10px 24px rgba(0, 0, 0, 0.25)",
                  }}
                >
                  Search
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Cards */}
      <section
        className="section-sm"
        style={{ position: "relative", zIndex: 1 }}
      >
        <div className="container recommendations-container">
          <div
            style={{ display: "flex", flexDirection: "column", gap: "4rem" }}
          >
            {/* Your Personalized Services Section */}
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "1rem",
                  marginBottom: isMobile ? "1.5rem" : "2rem",
                }}
              >
                <h2
                  style={{
                    fontSize: isMobile ? "1.4rem" : "1.75rem",
                    fontWeight: 500,
                    color: "var(--text)",
                    margin: 0,
                    letterSpacing: "-0.01em",
                  }}
                >
                  {isSearching
                    ? "Matched Services"
                    : hasSubmittedServices
                      ? "User Services"
                      : hasOnboardingProfile || recommendations?.length > 0
                        ? "Your Personalised Services"
                        : "Recommended Services"}
                </h2>
              </div>
              <div
                className="recommendations-grid"
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile
                    ? "1fr"
                    : "repeat(auto-fill, minmax(320px, 1fr))",
                  gap: isMobile ? "1.25rem" : "2rem",
                  justifyContent: "center",
                }}
              >
                {myServices.map((service, idx) => (
                  <ServiceCard
                    key={`my-${idx}`}
                    service={service}
                    idx={idx}
                    onClick={setSelectedService}
                    isLightMode={isLightMode}
                    isMobile={isMobile}
                    topBadge={renderServiceCardBadge(service.title)}
                  />
                ))}
              </div>
            </div>

            {!isSearching && (
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "1rem",
                    marginBottom: isMobile ? "2rem" : "3rem",
                    borderBottom: `1px solid ${isLightMode ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.06)"}`,
                    paddingBottom: "1.5rem"
                  }}
                >
                  <h2
                    style={{
                      fontSize: isMobile ? "1.5rem" : "2rem",
                      fontWeight: 500,
                      color: "var(--text)",
                      margin: 0,
                      letterSpacing: "-0.02em",
                    }}
                  >
                    Explore All Other Services
                  </h2>
                </div>

                {/* Grouped Grid */}
                <div style={{ display: "flex", flexDirection: "column", gap: "4rem" }}>
                  {FINAL_CATEGORY_ORDER.map((category) => {
                    const services = groupedOtherServices[category];
                    if (!services || services.length === 0) return null;

                    return (
                      <div key={category}>
                        <div style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "1rem",
                          marginBottom: "1.5rem"
                        }}>
                          <h3 style={{
                            fontSize: isMobile ? "1rem" : "1.2rem",
                            color: "var(--text)",
                            margin: 0,
                            textTransform: "uppercase",
                            letterSpacing: "0.1em",
                            fontWeight: 600,
                            display: "inline-block"
                          }}>
                            {category}
                          </h3>
                        </div>

                        <div
                          className="recommendations-grid"
                          style={{
                            display: "grid",
                            gridTemplateColumns: isMobile
                              ? "1fr"
                              : "repeat(auto-fill, minmax(320px, 1fr))",
                            gap: isMobile ? "1.25rem" : "2rem",
                            justifyContent: "center",
                          }}
                        >
                          {services.map((service, idx) => (
                            <ServiceCard
                              key={`${category}-${idx}`}
                              service={service}
                              idx={idx}
                              onClick={setSelectedService}
                              isLightMode={isLightMode}
                              isMobile={isMobile}
                              topBadge={renderServiceCardBadge(service.title)}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {myServices.length === 0 && otherServices.length === 0 && (
              <NoServicesFound
                onClear={() => setSearchQuery("")}
                isLightMode={isLightMode}
              />
            )}
          </div>
        </div>
      </section>



      {/* Service Detail Modal/Form */}
      <AnimatePresence>
        {selectedService && (() => {
          const cat = selectedService.category || "Advisory";
          const CatIcon = iconMap[cat] || Zap;
          const serviceRejectionState = getServiceRejectionState(selectedService.title);
          const serviceRejectionSignature = getServiceRejectionSignature(selectedService.title);
          const serviceRejectionDismissed =
            dismissedServiceRejectionSignatures[normalizeText(selectedService.title)] ===
            serviceRejectionSignature;
          const docs = getActiveDocs(selectedService);
          const required = docs.filter((d) => d.required);
          const localUploadsForService = uploadedDocs[selectedService.title] || {};
          const hasAnyReuploadedDocs = Object.values(localUploadsForService).some((value) => {
            const arr = Array.isArray(value) ? value : value ? [value] : [];
            return arr.filter(Boolean).length > 0;
          });
          const hasAllRequiredDocsReuploaded =
            serviceRejectionState &&
            required.length > 0 &&
            required.every((doc) => {
              const value = localUploadsForService[doc.name];
              const arr = Array.isArray(value) ? value : value ? [value] : [];
              return arr.filter(Boolean).length > 0;
            });
          const serviceReuploadReady =
            !!serviceRejectionState && hasAllRequiredDocsReuploaded;
          const showServiceRejectionBanner = serviceRejectionState && !serviceRejectionDismissed;
          const showReadyForReviewBanner =
            serviceReuploadReady && !serviceRejectionDismissed;
          const uploadedCount = required.filter(
            (d) => getDocumentState(selectedService.title, d.name).uploaded
          ).length;
          const isComplete = required.every((d) => {
            const state = getDocumentState(selectedService.title, d.name);
            return state.uploaded && !state.reuploadRequired;
          });
          const progressPct = required.length > 0
            ? Math.round((uploadedCount / required.length) * 100)
            : 100;

          const fees = (() => {
            const marketFeesRaw = String(selectedService.marketFees || "").trim();
            const recommendedFeesRaw = String(
              selectedService.recommendedFees || "",
            ).trim();
            if (marketFeesRaw || recommendedFeesRaw) {
              return {
                market: marketFeesRaw,
                recommended: recommendedFeesRaw,
              };
            }

            const pricing = getServicePricing(selectedService.title);
            const amount = Number(pricing?.amount || 0);
            const recommended = String(pricing?.displayPrice || "").trim();
            const market =
              Number.isFinite(amount) && amount > 0
                ? formatInr(Math.round(amount * 1.4))
                : "";

            return { market, recommended };
          })();

          return (
            <motion.div
              key="modal-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="rec-detail-modal"
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 2000,
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "center",
                padding: isMobile
                  ? `${mobileNavbarOffset} 0 0`
                  : "clamp(5.5rem, 9vh, 6.5rem) 1.5rem 1.5rem",
                background: "rgba(0,0,0,0.75)",
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
                overflowY: "auto",
              }}
              onClick={(e) => { if (e.target === e.currentTarget) setSelectedService(null); }}
            >
              <motion.div
                initial={{ opacity: 0, y: 24, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 24, scale: 0.97 }}
                transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}
                className="rec-modal-content"
                style={{
                  width: "100%",
                  maxWidth: "720px",
                  maxHeight: isMobile
                    ? `calc(100dvh - ${mobileNavbarOffset})`
                    : "calc(100vh - clamp(7rem, 12vh, 8.5rem))",
                  borderRadius: isMobile ? "24px 24px 0 0" : "28px",
                  border: isLightMode ? "1px solid rgba(181,189,199,0.98)" : "1px solid rgba(255,255,255,0.08)",
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                  boxShadow: "0 32px 80px rgba(31,41,55,0.18)",
                  background: isLightMode
                    ? "linear-gradient(180deg, rgba(214,219,227,0.99) 0%, rgba(198,205,214,0.99) 100%)"
                    : "linear-gradient(180deg, rgba(38, 42, 50, 0.99) 0%, rgba(24, 28, 35, 0.99) 100%)",
                }}
              >
                {/* -- HEADER -- */}
                <div
                  style={{
                    padding: isMobile ? "1.25rem 1.25rem 1rem" : "1.6rem 2rem 1.25rem",
                    borderBottom: isLightMode ? "1px solid rgba(181,189,199,0.98)" : "1px solid rgba(255,255,255,0.06)",
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: "1rem",
                    flexShrink: 0,
                    background: "transparent",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: isMobile ? "0.85rem" : "1rem", flex: 1, minWidth: 0 }}>
                    {/* Category Icon */}
                    <div
                      style={{
                        width: isMobile ? 42 : 50,
                        height: isMobile ? 42 : 50,
                        borderRadius: "14px",
                        background: isLightMode
                          ? "rgba(210,215,222,0.98)"
                          : "rgba(55,60,70,0.92)",
                        border: isLightMode
                          ? "1px solid rgba(181,189,199,0.98)"
                          : "1px solid rgba(110,118,132,0.24)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <CatIcon size={isMobile ? 18 : 22} color={isLightMode ? "#111827" : "#d1d5db"} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          padding: "0",
                          color: isLightMode ? "#111827" : "#ffffff",
                          borderRadius: "0",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                          marginBottom: "6px",
                        }}
                      >
                        {selectedService.category}
                      </div>
                      <h2
                        style={{
                          fontSize: isMobile ? "1.05rem" : "1.35rem",
                          fontWeight: 700,
                          color: isLightMode ? "#111827" : "#ffffff",
                          margin: 0,
                          letterSpacing: "-0.02em",
                          lineHeight: 1.2,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: isMobile ? "normal" : "nowrap",
                        }}
                      >
                        {selectedService.title}
                      </h2>
                      {showServiceRejectionBanner && (
                        <div style={{ marginTop: "0.55rem", display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                          <div
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              padding: "0.3rem 0.65rem",
                              borderRadius: "999px",
                              background: "rgba(239, 68, 68, 0.12)",
                              border: "1px solid rgba(239, 68, 68, 0.26)",
                              color: "#ef4444",
                              fontSize: "0.72rem",
                              fontWeight: 900,
                              letterSpacing: "0.04em",
                              textTransform: "uppercase",
                              width: "fit-content",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {serviceRejectionState.status}
                          </div>
                          <div
                            style={{
                              color: isLightMode ? "#7f1d1d" : "#fecaca",
                              fontSize: "0.78rem",
                              lineHeight: 1.45,
                              fontWeight: 500,
                            }}
                          >
                            {serviceRejectionState.message}
                          </div>
                        </div>
                      )}
                      {showReadyForReviewBanner && (
                        <span
                          style={{
                            marginTop: "0.5rem",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            padding: "0.4rem 0.75rem",
                            borderRadius: "999px",
                            background: "rgba(245,158,11,0.12)",
                            border: "1px solid rgba(245,158,11,0.22)",
                            color: "#fbbf24",
                            fontSize: "0.72rem",
                            fontWeight: 800,
                            letterSpacing: "0.04em",
                            textTransform: "uppercase",
                            width: "fit-content",
                          }}
                        >
                          <Clock size={12} />
                          Ready for Review
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedService(null)}
                    style={{
                      background: isLightMode
                        ? "rgba(210,215,222,0.98)"
                        : "rgba(55,60,70,0.92)",
                      border: isLightMode
                        ? "1px solid rgba(181,189,199,0.98)"
                        : "1px solid rgba(110,118,132,0.24)",
                      color: isLightMode ? "#111827" : "#ffffff",
                      cursor: "pointer",
                      width: "34px",
                      height: "34px",
                      borderRadius: "10px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = isLightMode
                        ? "rgba(223,227,233,0.98)"
                        : "rgba(66,72,82,0.95)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = isLightMode
                        ? "rgba(210,215,222,0.98)"
                        : "rgba(55,60,70,0.92)";
                    }}
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* -- SCROLLABLE BODY -- */}
                <div
                  style={{
                    padding: isMobile ? "1.25rem" : "1.75rem 2rem",
                    overflowY: "auto",
                    flex: 1,
                  }}
                  className="custom-scrollbar"
                >

                  {/* Description */}
                  {isAdmin && isEditingService ? (
                    <div style={{ marginBottom: "1.5rem" }}>
                      <label style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text-muted)", display: "block", marginBottom: "8px" }}>Service Description</label>
                      <textarea
                        value={editedService?.description || ""}
                        onChange={(e) => setEditedService({ ...editedService, description: e.target.value })}
                        style={{
                          width: "100%",
                          padding: "0.8rem",
                          background: "var(--bg-card)",
                          border: "1px solid var(--border)",
                          borderRadius: "12px",
                          color: "var(--text)",
                          fontSize: "0.9rem",
                          minHeight: "100px",
                          outline: "none"
                        }}
                      />
                    </div>
                  ) : (
                    <p
                      style={{
                        color: isLightMode ? "#4b5563" : "#ffffff",
                        fontSize: isMobile ? "0.88rem" : "0.92rem",
                        lineHeight: 1.7,
                        margin: "0 0 1.5rem",
                      }}
                    >
                      {selectedService.description}
                    </p>
                  )}

                  {showServiceRejectionBanner ? (
                    <div
                      style={{
                        marginBottom: "1rem",
                        padding: isMobile ? "0.95rem 1rem" : "1rem 1.15rem",
                        borderRadius: "16px",
                        background: "rgba(239,68,68,0.08)",
                        border: "1px solid rgba(239,68,68,0.2)",
                        color: "#fecaca",
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.35rem",
                        position: "relative",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => dismissServiceRejectionMessage(selectedService.title)}
                        aria-label="Dismiss rejection message"
                        style={{
                          position: "absolute",
                          top: "0.7rem",
                          right: "0.7rem",
                          width: "30px",
                          height: "30px",
                          borderRadius: "999px",
                          border: "1px solid rgba(239,68,68,0.35)",
                          background: "rgba(0,0,0,0.14)",
                          color: "#fecaca",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          padding: 0,
                        }}
                      >
                        <X size={14} />
                      </button>
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          padding: "0.32rem 0.7rem",
                          borderRadius: "999px",
                          background: "rgba(239, 68, 68, 0.12)",
                          border: "1px solid rgba(239, 68, 68, 0.26)",
                          color: "#ef4444",
                          fontWeight: 800,
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          fontSize: "0.72rem",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {serviceRejectionState.status}
                      </div>
                      <div
                        style={{
                          color: isLightMode ? "#7f1d1d" : "#fecaca",
                          fontSize: "0.88rem",
                          lineHeight: 1.6,
                          fontWeight: 500,
                        }}
                      >
                        <div style={{ marginBottom: "0.35rem" }}>
                          {hasAllRequiredDocsReuploaded
                            ? "All required documents have been reuploaded. Submit them for review."
                            : hasAnyReuploadedDocs
                              ? "Some documents have been reuploaded. Please complete the remaining files."
                              : "Please reupload the corrected documents below to resubmit."}
                        </div>
                        <div style={{ color: isLightMode ? "#991b1b" : "#fca5a5" }}>
                          Message: {serviceRejectionState.message}
                        </div>
                      </div>
                    </div>
                  ) : showReadyForReviewBanner ? (
                    <div
                      style={{
                        marginBottom: "1rem",
                        padding: "1rem 1.1rem",
                        borderRadius: "16px",
                        background: isLightMode
                          ? "rgba(245,158,11,0.08)"
                          : "rgba(245,158,11,0.08)",
                        border: "1px solid rgba(245,158,11,0.22)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          color: "#fbbf24",
                          fontWeight: 800,
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          fontSize: "0.72rem",
                        }}
                      >
                        <Clock size={16} />
                        Ready for Review
                      </div>
                      <div
                        style={{
                          color: isLightMode ? "#92400e" : "#fde68a",
                          fontSize: "0.88rem",
                          lineHeight: 1.6,
                          fontWeight: 500,
                          marginTop: "0.35rem",
                        }}
                      >
                        All required documents have been reuploaded. Submit them for review.
                        <div style={{ color: isLightMode ? "#b45309" : "#fcd34d", marginTop: "0.35rem" }}>
                          Message: {serviceRejectionState.message}
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {/* -- Turnaround Bar -- */}
                  <div
                    style={{
                      padding: isMobile ? "1rem" : "1.1rem 1.25rem",
                      background: isLightMode
                        ? "linear-gradient(180deg, rgba(242,244,248,0.98) 0%, rgba(226,230,236,0.98) 100%)"
                        : "rgba(255,255,255,0.03)",
                      border: `1px solid ${isLightMode ? "rgba(214,219,227,0.98)" : "rgba(255,255,255,0.07)"}`,
                      borderRadius: "16px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px",
                      marginBottom: "1rem",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.62rem",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        color: isLightMode ? "#111827" : "#ffffff",
                      }}
                    >
                      Turnaround
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <Clock size={14} color="#10b981" />
                      <span
                        style={{
                          fontSize: isMobile ? "1.1rem" : "1.2rem",
                          fontWeight: 600,
                          color: isLightMode ? "#111827" : "#fff",
                          letterSpacing: "-0.01em",
                        }}
                      >
                        2 Working Days
                      </span>
                    </div>
                  </div>

                  {/* -- Market & Recommended Fees -- */}
                  {isAdmin && isEditingService ? (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "0.75rem",
                        marginBottom: "1.75rem",
                      }}
                    >
                      <div>
                        <label style={{ fontSize: "0.65rem", fontWeight: 700, color: "#d97706", display: "block", marginBottom: "4px" }}>Market Fees</label>
                        <input
                          type="text"
                          value={editedService?.marketFees || ""}
                          onChange={(e) => setEditedService({ ...editedService, marketFees: e.target.value })}
                          style={{
                            width: "100%",
                            padding: "0.6rem",
                            background: "var(--bg-card)",
                            border: "1px solid var(--border)",
                            borderRadius: "10px",
                            color: "var(--text)",
                            fontSize: "0.8rem",
                            outline: "none"
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: "0.65rem", fontWeight: 700, color: "#059669", display: "block", marginBottom: "4px" }}>Recommended Fees</label>
                        <input
                          type="text"
                          value={editedService?.recommendedFees || ""}
                          onChange={(e) => setEditedService({ ...editedService, recommendedFees: e.target.value })}
                          style={{
                            width: "100%",
                            padding: "0.6rem",
                            background: "var(--bg-card)",
                            border: "1px solid var(--border)",
                            borderRadius: "10px",
                            color: "var(--text)",
                            fontSize: "0.8rem",
                            outline: "none"
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    (fees.market || fees.recommended) && (
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: "0.75rem",
                          marginBottom: "1.75rem",
                        }}
                      >
                        {fees.market && (
                          <div
                            style={{
                              padding: "0.8rem 1rem",
                              background: isLightMode
                                ? "linear-gradient(180deg, rgba(242,244,248,0.98) 0%, rgba(226,230,236,0.98) 100%)"
                                : "rgba(245, 158, 11, 0.05)",
                              border: isLightMode
                                ? "1px solid rgba(214,219,227,0.98)"
                                : "1px solid rgba(245, 158, 11, 0.1)",
                              borderRadius: "14px",
                            }}
                          >
                            <span style={{ fontSize: "0.6rem", fontWeight: 600, color: isLightMode ? "#111827" : "#d97706", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "4px" }}>Market Fees</span>
                            <span style={{ fontSize: "0.95rem", fontWeight: 500, color: "var(--text)" }}>{fees.market}</span>
                          </div>
                        )}
                        {fees.recommended && (
                          <div
                            style={{
                              padding: "0.8rem 1rem",
                              background: isLightMode
                                ? "linear-gradient(180deg, rgba(242,244,248,0.98) 0%, rgba(226,230,236,0.98) 100%)"
                                : "rgba(16, 185, 129, 0.05)",
                              border: isLightMode
                                ? "1px solid rgba(214,219,227,0.98)"
                                : "1px solid rgba(16, 185, 129, 0.1)",
                              borderRadius: "14px",
                            }}
                          >
                            <span style={{ fontSize: "0.6rem", fontWeight: 600, color: isLightMode ? "#111827" : "#059669", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "4px" }}>Recommended Fees</span>
                            <span style={{ fontSize: "0.95rem", fontWeight: 500, color: "var(--text)" }}>{fees.recommended}</span>
                          </div>
                        )}
                      </div>
                    )
                  )}

                  {/* -- Admin Management Bar -- */}
                  {false && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "10px",
                        padding: "1rem",
                        background: isLightMode
                          ? "linear-gradient(180deg, rgba(242,244,248,0.98) 0%, rgba(226,230,236,0.98) 100%)"
                          : "rgba(67, 97, 238, 0.08)",
                        border: isLightMode
                          ? "1px solid rgba(214,219,227,0.98)"
                          : "1px solid rgba(67, 97, 238, 0.2)",
                        borderRadius: "12px",
                        marginBottom: "1.5rem",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <ShieldAlert size={16} color={isLightMode ? "#111827" : "#4361ee"} style={{ flexShrink: 0 }} />
                        <span
                          style={{
                            fontSize: "0.8rem",
                            fontWeight: 700,
                            color: isLightMode ? "#111827" : "#4361ee",
                          }}
                        >
                          Service Management
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: "8px" }}>
                        {isEditingService ? (
                          <>
                            <button
                              onClick={async () => {
                                try {
                                  const apiUrl = import.meta.env.VITE_API_URL;
                                  const token = JSON.parse(localStorage.getItem("user"))?.token;
                                  await axios.patch(`${apiUrl}/services/${selectedService._id}`, editedService, {
                                    headers: { Authorization: `Bearer ${token}` }
                                  });
                                  toast.success("Service updated successfully");
                                  setIsEditingService(false);
                                  setSelectedService({ ...selectedService, ...editedService });
                                  // Refresh all services
                                  const refreshRes = await axios.get(`${apiUrl}/services`);
                                  setAllDbServices(refreshRes.data);
                                } catch (err) {
                                  toast.error("Failed to update service");
                                }
                              }}
                              style={{ padding: "6px 14px", background: "#10b981", border: "none", color: "#fff", borderRadius: "8px", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer" }}
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setIsEditingService(false)}
                              style={{ padding: "6px 14px", background: "rgba(0,0,0,0.05)", border: "1px solid rgba(0,0,0,0.1)", color: "var(--text)", borderRadius: "8px", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer" }}
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => {
                              setEditedService({ ...selectedService });
                              setIsEditingService(true);
                            }}
                            style={{ padding: "6px 14px", background: "#4361ee", border: "none", color: "#fff", borderRadius: "8px", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer" }}
                          >
                            Edit Service
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* -- Documents Section -- */}
                  <div
                    style={{
                      marginBottom: "0.5rem",
                    }}
                  >
                    {/* Section Header */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: "1rem",
                        flexWrap: "wrap",
                        gap: "0.5rem",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: "0.68rem",
                            fontWeight: 600,
                            textTransform: "uppercase",
                            letterSpacing: "0.1em",
                            color: isLightMode ? "#94a3b8" : "#ffffff",
                            marginBottom: "2px",
                          }}
                        >
                          Required Documents
                        </div>
                        <div
                          style={{
                            fontSize: isMobile ? "0.95rem" : "1.1rem",
                            fontWeight: 600,
                            color: isLightMode ? "#1f1147" : "#fff",
                          }}
                        >
                          {uploadedCount}/{required.length} Uploaded
                        </div>
                      </div>
                      {/* Progress */}
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div
                          style={{
                            width: isMobile ? "80px" : "100px",
                            height: "5px",
                            background: isLightMode ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.08)",
                            borderRadius: "99px",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              width: `${progressPct}%`,
                              height: "100%",
                              background: progressPct === 100
                                ? (isLightMode ? "#6d4dff" : "#10b981")
                                : (isLightMode ? "#8b5cf6" : "#4361ee"),
                              borderRadius: "99px",
                              transition: "width 0.4s ease",
                            }}
                          />
                        </div>
                        <span
                          style={{
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            color: progressPct === 100
                              ? (isLightMode ? "#6d4dff" : "#10b981")
                              : (isLightMode ? "#6d4dff" : "rgba(255,255,255,0.4)"),
                          }}
                        >
                          {progressPct}%
                        </span>
                      </div>
                    </div>

                    {/* PDF Notice */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "0.6rem 0.9rem",
                        background: isLightMode ? "#fffbeb" : "rgba(245,158,11,0.06)",
                        border: `1px solid ${isLightMode ? "#fde68a" : "rgba(245,158,11,0.15)"}`,
                        borderRadius: "10px",
                        marginBottom: "1rem",
                      }}
                    >
                      <FileText size={13} color="#f59e0b" style={{ flexShrink: 0 }} />
                      <span
                        style={{
                          fontSize: "0.72rem",
                          fontWeight: 600,
                          color: "#d97706",
                          lineHeight: 1.4,
                        }}
                      >
                        Only PDF documents are accepted for upload
                      </span>
                    </div>

                    {/* Document List */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                      {(() => {
                        return docs.map((doc, idx) => {
                          const state = getDocumentState(selectedService.title, doc.name);
                          const cardBg = state.reuploadRequired
                            ? isLightMode ? "#fef2f2" : "rgba(239,68,68,0.05)"
                            : state.uploaded
                              ? isLightMode ? "#f0fdf4" : "rgba(16,185,129,0.04)"
                              : isLightMode ? "#f8fafc" : "rgba(255,255,255,0.02)";
                          const cardBorder = state.reuploadRequired
                            ? isLightMode ? "#fca5a5" : "rgba(239,68,68,0.18)"
                            : state.uploaded
                              ? isLightMode ? "#86efac" : "rgba(16,185,129,0.15)"
                              : isLightMode ? "#e2e8f0" : "rgba(255,255,255,0.03)";

                          return (
                            <div
                              key={idx}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.9rem",
                                padding: isMobile ? "0.8rem 0.9rem" : "0.9rem 1rem",
                                background: cardBg,
                                border: `1px solid ${cardBorder}`,
                                borderRadius: "14px",
                                transition: "all 0.2s",
                                opacity: !doc.required && !state.uploaded ? 0.65 : 1,
                              }}
                            >
                              {/* Status Icon */}
                              <div
                                style={{
                                  width: 34,
                                  height: 34,
                                  borderRadius: "9px",
                                  background: state.reuploadRequired
                                    ? "rgba(239,68,68,0.08)"
                                    : state.uploaded
                                      ? "rgba(16,185,129,0.08)"
                                      : isLightMode
                                        ? "rgba(214,219,227,0.22)"
                                        : "rgba(255,255,255,0.04)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  flexShrink: 0,
                                }}
                              >
                                {state.reuploadRequired ? (
                                  <AlertCircle size={15} color="#ef4444" />
                                ) : state.uploaded ? (
                                  <Check size={15} color="#10b981" />
                                ) : (
                                  <FileText size={15} color={isLightMode ? "#111827" : "#ffffff"} />
                                )}
                              </div>

                              {/* Doc Info */}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                                  <p
                                    style={{
                                      margin: 0,
                                      fontSize: isMobile ? "0.8rem" : "0.84rem",
                                      fontWeight: 700,
                                      color: isLightMode ? "#111827" : "#fff",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    {doc.name}
                                  </p>
                                  <span
                                    style={{
                                      fontSize: "0.55rem",
                                      padding: "2px 6px",
                                      background: doc.required
                                        ? "rgba(239,68,68,0.1)"
                                        : isLightMode ? "rgba(214,219,227,0.22)" : "rgba(255,255,255,0.06)",
                                      color: doc.required
                                        ? "#ef4444"
                                        : isLightMode ? "#111827" : "#ffffff",
                                      borderRadius: "5px",
                                      fontWeight: 800,
                                      textTransform: "uppercase",
                                      letterSpacing: "0.05em",
                                      flexShrink: 0,
                                    }}
                                  >
                                    {doc.required ? "Required" : "Optional"}
                                  </span>
                                </div>
                                <p
                                  style={{
                                    margin: "2px 0 0",
                                    fontSize: "0.67rem",
                                    color: state.reuploadRequired
                                      ? "#ef4444"
                                      : state.uploaded
                                        ? "#10b981"
                                        : isLightMode ? "#111827" : "#ffffff",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                    lineHeight: 1.4,
                                  }}
                                >
                                  {state.reuploadRequired
                                    ? state.message
                                    : state.uploaded
                                      ? `✓ ${state.uploadedName}`
                                      : doc.desc || "Upload this document to proceed"}
                                </p>
                              </div>

                              {/* Upload Button - Only Visible to Users */}
                              {true && (
                                <label
                                  style={{
                                    cursor: uploadingDoc ? "not-allowed" : "pointer",
                                    padding: isMobile ? "6px 12px" : "7px 14px",
                                    background: state.reuploadRequired
                                      ? "#ef4444"
                                      : state.uploaded
                                        ? isLightMode ? "rgba(232,236,242,0.96)" : "rgba(255,255,255,0.03)"
                                        : "#10b981",
                                    color: state.uploaded && !state.reuploadRequired
                                      ? isLightMode ? "#111827" : "rgba(255,255,255,0.7)"
                                      : "#fff",
                                    borderRadius: "9px",
                                    fontSize: "0.72rem",
                                    fontWeight: 700,
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "5px",
                                    transition: "all 0.2s",
                                    flexShrink: 0,
                                    border: state.uploaded && !state.reuploadRequired
                                      ? `1px solid ${isLightMode ? "rgba(214,219,227,0.98)" : "rgba(255,255,255,0.04)"}`
                                      : "1px solid transparent",
                                    opacity: (uploadingDoc && uploadingDoc !== doc.name) ? 0.4 : 1,
                                    pointerEvents: uploadingDoc ? "none" : "auto",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {uploadingDoc === doc.name ? (
                                    <Loader2 size={11} className="animate-spin" />
                                  ) : (
                                    <Upload size={11} />
                                  )}
                                  {uploadingDoc === doc.name
                                    ? "Uploading"
                                    : state.reuploadRequired
                                      ? "Reupload"
                                      : state.uploaded
                                        ? "Change"
                                        : "Upload"}
                                  <input
                                    type="file"
                                    accept=".pdf"
                                    multiple
                                    hidden
                                    disabled={!!uploadingDoc}
                                    onChange={async (e) => {
                                      const files = Array.from(e.target.files || []);
                                      // Allow selecting the same file again later
                                      e.target.value = "";
                                      if (files.length === 0) return;

                                      const nonPdf = files.find(
                                        (f) => f?.type !== "application/pdf",
                                      );
                                      if (nonPdf) {
                                        toast.error("Please upload only PDF documents");
                                        return;
                                      }

                                      setUploadingDoc(doc.name);
                                      const loadingToast = toast.loading(
                                        `Uploading ${doc.name}...`,
                                      );

                                      try {
                                        const apiUrl = import.meta.env.VITE_API_URL;
                                        const user = JSON.parse(
                                          localStorage.getItem("user"),
                                        );
                                        const token = user?.token;
                                        if (!token) {
                                          toast.error(
                                            "Please log in to upload documents",
                                            { id: loadingToast },
                                          );
                                          return;
                                        }

                                        for (const file of files) {
                                          const formData = new FormData();
                                          formData.append("file", file);
                                          const uploadRes = await axios.post(
                                            `${apiUrl}/leads/upload`,
                                            formData,
                                            {
                                              headers: {
                                                Authorization: `Bearer ${token}`,
                                              },
                                            },
                                          );

                                          if (uploadRes.data.success) {
                                            setUploadedDocs((prev) => {
                                              const prevSvc =
                                                prev[selectedService.title] ||
                                                {};
                                              const existing =
                                                prevSvc[doc.name] || [];
                                              const existingArr = Array.isArray(
                                                existing,
                                              )
                                                ? existing
                                                : [existing];

                                              return {
                                                ...prev,
                                                [selectedService.title]: {
                                                  ...prevSvc,
                                                  [doc.name]: [
                                                    ...existingArr,
                                                    {
                                                      name: file.name,
                                                      url: uploadRes.data.url,
                                                      publicId: uploadRes.data.filename,
                                                    },
                                                  ],
                                                },
                                              };
                                            });
                                          }
                                        }

                                        toast.success(
                                          `Uploaded ${files.length} file(s) for ${doc.name}`,
                                          { id: loadingToast },
                                        );
                                      } catch (error) {
                                        console.error("Upload error:", error);
                                        toast.error(`Upload failed for ${doc.name}`, {
                                          id: loadingToast,
                                        });
                                      } finally {
                                        setUploadingDoc(null);
                                      }
                                    }}
                                  />
                                </label>
                              )}
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                </div>

                {/* -- STICKY FOOTER -- */}
                {(!storedUser?.role || storedUser?.role === "user") && (
                  <div
                    style={{
                      padding: isMobile ? "1rem 1.25rem" : "1.25rem 2rem",
                      borderTop: `1px solid ${isLightMode ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.06)"}`,
                      background: isLightMode ? "#f8fafc" : "rgba(255,255,255,0.015)",
                      flexShrink: 0,
                    }}
                  >
                    <button
                      onClick={async () => {
                        if (!isComplete) {
                          toast.error("Complete all required uploads to proceed.");
                          return;
                        }
                        setIsSubmitting(true);
                        try {
                          const user = JSON.parse(localStorage.getItem("user"));
                          const apiUrl = import.meta.env.VITE_API_URL;
                          const existingLead = getLatestLeadForService(selectedService.title);
                          const docList = docs
                            .flatMap((doc) => {
                              const state = getDocumentState(
                                selectedService.title,
                                doc.name,
                              );

                              // Use the full document objects if available, otherwise fallback to the single url
                              const sources = (Array.isArray(state.fullDocs) && state.fullDocs.length > 0)
                                ? state.fullDocs
                                : state.uploadedUrl
                                  ? [{ url: state.uploadedUrl, name: state.uploadedName, publicId: state.publicId }]
                                  : [];

                              return sources
                                .filter(s => !!s?.url)
                                .map((item) => ({
                                  name: doc.name,
                                  url: item.url,
                                  publicId: item.publicId,
                                  status: "Pending",
                                  uploadedAt: new Date(),
                                }));
                            })
                            .filter((d) => !!d?.url);

                          if (existingLead?._id) {
                            const localUploadsForService = uploadedDocs[selectedService.title] || {};
                            const updatedDocuments = Object.entries(localUploadsForService)
                              .flatMap(([docName, value]) => {
                                const arr = Array.isArray(value)
                                  ? value
                                  : value
                                    ? [value]
                                    : [];
                                return arr
                                  .filter(Boolean)
                                  .map((v) => ({
                                    name: docName,
                                    url: v?.url,
                                    publicId: v?.publicId,
                                    type: "Client",
                                    status: "Pending",
                                    uploadedAt: new Date(),
                                  }));
                              })
                              .filter((d) => !!d?.url);
                            const isServiceRejected = String(existingLead.status || "").toLowerCase() === "rejected";
                            const rejectedDocNames = new Set(
                              (existingLead.documents || []).filter((d) => d?.status === "Rejected").map((d) => String(d?.name || "").trim())
                            );
                            const reuploadedDocumentNames = Object.keys(localUploadsForService).filter((n) => rejectedDocNames.has(String(n || "").trim()));

                            const patchPayload = {
                              reuploadedDocumentNames,
                              // If it was rejected (by PR or Executor), move back to PendingReview
                              ...(isServiceRejected ? {
                                status: "PendingReview",
                                executorMessage: "",
                                prFeedback: ""
                              } : {})
                            };
                            if (updatedDocuments.length > 0) {
                              patchPayload.$push = { documents: { $each: updatedDocuments } };
                            }
                            await axios.patch(`${apiUrl}/leads/${existingLead._id}`, patchPayload, { headers: { Authorization: `Bearer ${user.token}` } });
                          } else {
                            await axios.post(
                              `${apiUrl}/leads`,
                              {
                                user: user?._id || user?.id || null,
                                name: user?.name,
                                email: user?.email,
                                serviceName: selectedService.title,
                                cost: selectedServiceRecommendedFeeAmount,
                                recommendedFeeAmount: selectedServiceRecommendedFeeAmount,
                                recommendedFees: selectedService.recommendedFees || "",
                                documents: docList,
                                status: docList.length > 0 ? "PendingReview" : "Open",
                              },
                              { headers: { Authorization: `Bearer ${user.token}` } }
                            );
                          }
                          const refreshedLeads = await axios.get(`${apiUrl}/leads?userId=${user?._id || user?.id}`, { headers: { Authorization: `Bearer ${user.token}` } });
                          setUserLeads(refreshedLeads.data || []);
                          setUploadedDocs((prev) => { const n = { ...prev }; delete n[selectedService.title]; return n; });
                          const refreshStamp = String(Date.now());
                          localStorage.setItem("pr-dashboard-refresh", refreshStamp);
                          window.dispatchEvent(new Event("pr-dashboard-refresh"));
                          toast.success(existingLead?._id ? "Documents resubmitted for PR review." : "Interest recorded! Check your dashboard for updates.", { id: "service-confirmation" });
                          setSelectedService(null);
                          navigate("/dashboard");
                        } catch (error) {
                          toast.error("Submission failed. Try again later.");
                        } finally {
                          setIsSubmitting(false);
                        }
                      }}
                      disabled={(() => {
                        if (!isComplete || isSubmitting) return true;
                        const existingLead = getLatestLeadForService(selectedService.title);
                        if (!existingLead?._id) return false;
                        const localUploadsForService = uploadedDocs[selectedService.title] || {};
                        return Object.keys(localUploadsForService).length === 0;
                      })()}
                      style={{
                        width: "100%",
                        padding: isMobile ? "0.9rem" : "1rem",
                        background: isComplete
                          ? "linear-gradient(135deg, #059669, #10b981)"
                          : isLightMode
                            ? "linear-gradient(180deg, rgba(242,244,248,0.98) 0%, rgba(226,230,236,0.98) 100%)"
                            : "rgba(255,255,255,0.04)",
                        color: isComplete ? "#fff" : isLightMode ? "#111827" : "rgba(255,255,255,0.2)",
                        border: isComplete ? "none" : `1px solid ${isLightMode ? "rgba(214,219,227,0.98)" : "rgba(255,255,255,0.06)"}`,
                        borderRadius: "12px",
                        fontWeight: 700,
                        fontSize: "0.92rem",
                        cursor: (() => {
                          const disabled = (() => {
                            if (!isComplete || isSubmitting) return true;
                            const existingLead = getLatestLeadForService(selectedService.title);
                            if (!existingLead?._id) return false;
                            const localUploadsForService = uploadedDocs[selectedService.title] || {};
                            return Object.keys(localUploadsForService).length === 0;
                          })();
                          return disabled ? "not-allowed" : "pointer";
                        })(),
                        transition: "all 0.3s",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px",
                        boxShadow: isComplete ? "0 4px 20px rgba(16,185,129,0.3)" : "none",
                        letterSpacing: "-0.01em",
                      }}
                      onMouseEnter={(e) => {
                        if (isComplete) e.currentTarget.style.transform = "translateY(-1px)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "none";
                      }}
                    >
                      {isSubmitting ? (
                        <><Loader2 size={16} className="animate-spin" /> Submitting...</>
                      ) : !isComplete ? (
                        <>Upload Required Files to Unlock</>
                      ) : (() => {
                        const existingLead = getLatestLeadForService(selectedService.title);
                        const localUploadsForService = uploadedDocs[selectedService.title] || {};
                        const hasLocalReupload = Object.keys(localUploadsForService).length > 0;
                        if (existingLead?._id && !hasLocalReupload) {
                          return <>Submitted <ArrowRight size={16} /></>;
                        }
                        return <>Confirm & Submit <ArrowRight size={16} /></>;
                      })()}
                    </button>
                  </div>
                )}
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
};

export default Recommendations;




