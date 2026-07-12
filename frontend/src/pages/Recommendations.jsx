import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import {
  Check,
  Calendar,
  ChevronRight,
  ArrowRight,
  X,
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
  Edit,
  Trash2,
  RefreshCw,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { formatInr, getServicePricing, parseFeeAmount } from "../utils/servicePricing";
import { viewDocument } from "../utils/documentViewer";
import { payForLead } from "../utils/razorpay";
import { normalizeRole } from "../utils/roleRouting";
import { hasAdminRejectedDocuments } from "../utils/statusLabels";
import ConfirmationModal from "../components/ConfirmationModal";

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

// Note: role checks are computed inside the component to reflect runtime login state

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
  const [isCompactMobile, setIsCompactMobile] = useState(window.innerWidth <= 480);
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
      setIsCompactMobile(window.innerWidth <= 480);
    };
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

  // Prevent body scroll when service detail modal is open
  useEffect(() => {
    if (selectedService) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [selectedService]);

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
        paddingTop: "clamp(105px, 13vw, 145px)",
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
              color: "#000000",
            }}
          >
            User Services.
          </h1>

          <p
            className="rec-subtext"
            style={{
              color: "var(--text-muted)",
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
                background: "#ffffff",
                border: "1px solid var(--border)",
                padding: "0.8rem 1.2rem",
                borderRadius: "18px",
                boxShadow: "var(--shadow-sm)",
                transition: "all 0.3s ease",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "#f97316";
                e.currentTarget.style.boxShadow = "0 0 0 4px rgba(249, 115, 22, 0.1)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "var(--border)";
                e.currentTarget.style.boxShadow = "var(--shadow-sm)";
              }}
            >
              <Search size={18} color="#000000" />
              <input
                type="text"
                className="service-search-input"
                placeholder="Search by name, email or service..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                style={{
                  background: "none",
                  border: "none",
                  color: "#000000",
                  outline: "none",
                  width: "100%",
                  fontSize: "0.9rem",
                  fontWeight: 200,
                }}
              />
              {searchQuery && (
                <button
                  onClick={clearSearch}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#000000",
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
                background: "linear-gradient(135deg, #f97316, #ea580c)",
                border: "1px solid rgba(255,255,255,0.14)",
                color: "white",
                padding: "0.8rem 2rem",
                borderRadius: "18px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                fontWeight: 700,
                boxShadow: "0 10px 24px rgba(249, 115, 22, 0.2)",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow = "0 12px 28px rgba(249, 115, 22, 0.3)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 10px 24px rgba(249, 115, 22, 0.2)";
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
                                                viewDocument(doc.publicId, doc.url || doc.secure_url || doc.uploadedUrl || doc.viewUrl, lead._id);
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
  isAdmin = false,
  onDelete,
  isLightMode = false,
  isMobile = false,
  topBadge = null,
}) => {

  return (
    <div
      key={idx}
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        overflow: "visible",
        zIndex: topBadge ? 3 : 1,
      }}
    >
      {isAdmin && (service?._id || service?.id) && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete && onDelete(service);
          }}
          title="Delete service"
          style={{
            position: "absolute",
            top: "8px",
            right: "8px",
            zIndex: 10,
            width: "32px",
            height: "32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "1px solid #cbd5e1",
            borderRadius: "50%",
            background: "#f1f5f9",
            color: "#64748b",
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
        >
          <X size={16} />
        </button>
      )}
      <div
        onClick={() => onClick(service)}
        style={{
          background: "#e2e8f0",
          borderRadius: "12px",
          border: "1px solid #cbd5e1",
          display: "flex",
          flexDirection: "column",
          cursor: "pointer",
          height: "100%",
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          position: "relative",
          overflow: "hidden",
          minHeight: isMobile ? "unset" : "360px",
          boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "#cbd5e1";
          e.currentTarget.style.transform = "translateY(-4px)";
          e.currentTarget.style.boxShadow = "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "#e2e8f0";
          e.currentTarget.style.transform = "none";
          e.currentTarget.style.boxShadow = "0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05)";
        }}
      >
        {topBadge && (
          <div
            style={{
              position: "absolute",
              top: isMobile ? "1rem" : "1.1rem",
              right: isMobile ? "1rem" : "1.1rem",
              zIndex: 5,
              pointerEvents: "none",
            }}
          >
            {topBadge}
          </div>
        )}
        <div
          style={{
            padding: isMobile
              ? "2.25rem 1.25rem 1.25rem"
              : "2.35rem 2rem 1.8rem",
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: isMobile ? "0.8rem" : "1.2rem",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.4rem",
            }}
          >
            <h3
              style={{
                fontSize: isMobile ? "1.15rem" : "1.35rem",
                fontWeight: 700,
                color: "#0f172a",
                margin: 0,
                lineHeight: 1.3,
                letterSpacing: "-0.02em",
              }}
            >
              {service.title}
            </h3>
          </div>
          <p
            style={{
              color: "#475569",
              fontSize: isMobile ? "0.82rem" : "0.88rem",
              lineHeight: 1.6,
              margin: 0,
              marginTop: "0.5rem",
            }}
          >
            {service.description}
          </p>

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
                color: "#64748b",
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

const calculateMarketAverage = (marketFeesStr) => {
  if (!marketFeesStr) return null;
  const cleanStr = String(marketFeesStr).replace(/,/g, "");
  const numbers = cleanStr.match(/\d+/g);
  if (numbers && numbers.length >= 2) {
    const num1 = parseFloat(numbers[0]);
    const num2 = parseFloat(numbers[1]);
    return (num1 + num2) / 2;
  } else if (numbers && numbers.length === 1) {
    return parseFloat(numbers[0]);
  }
  return null;
};

const getFormattedMarketAverage = (marketFeesStr) => {
  if (!marketFeesStr) return "—";
  const avg = calculateMarketAverage(marketFeesStr);
  let result = marketFeesStr;
  if (avg !== null) {
    result = formatInr(avg);
  }
  
  if (String(marketFeesStr).toLowerCase().includes("/month")) {
    result += "/month";
  } else if (String(marketFeesStr).toLowerCase().includes("/year")) {
    result += "/year";
  }
  return result;
};

const getOnlyDigitsAndCommas = (val) => {
  const raw = String(val || "").trim();
  const clean = raw.replace(/^rs\.?\s*/i, "");
  const digits = clean.replace(/[^\d,]/g, "");
  return digits;
};

const formatOnlyDigits = (val) => {
  const digits = String(val || "").replace(/\D/g, "");
  if (!digits) return "";
  const num = parseInt(digits, 10);
  return num.toLocaleString("en-IN");
};

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
  const [searchQuery, setSearchQuery] = useState("");
  const [userLeads, setUserLeads] = useState([]);
  const [allDbServices, setAllDbServices] = useState([]);
  // Initial-submission payment gate: keyed by lead id so each service's
  // "confirm payment" toggle is independent of any other.
  const [paymentConfirmedByLead, setPaymentConfirmedByLead] = useState({});
  const [payingLeadId, setPayingLeadId] = useState(null);
  const storedUser = JSON.parse(localStorage.getItem("user"));
  const isUserRole = normalizeRole(storedUser?.role) === "user";

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
  const isAdmin = normalizeRole(storedUser?.role) === "admin";
  const [dismissedServiceRejectionSignatures, setDismissedServiceRejectionSignatures] = useState({});
  const [overriddenOurFees, setOverriddenOurFees] = useState({});
  const [ourFeeInputValue, setOurFeeInputValue] = useState("");
  const [isEditingService, setIsEditingService] = useState(false);
  const [editedService, setEditedService] = useState(null);
  const [editedWorkingDays, setEditedWorkingDays] = useState(2);
  const [isEditingAbout, setIsEditingAbout] = useState(false);
  const [editedAbout, setEditedAbout] = useState("");
  const [isEditingTopDescription, setIsEditingTopDescription] = useState(false);
  const [editedTopDescription, setEditedTopDescription] = useState("");
  const openedServiceKeyRef = useRef(null);
  const [serviceToDelete, setServiceToDelete] = useState(null);
  const [isServiceDeleteConfirmOpen, setIsServiceDeleteConfirmOpen] = useState(false);
  const [isServiceDeleting, setIsServiceDeleting] = useState(false);
  const [isAddingService, setIsAddingService] = useState(false);
  const [newServiceForm, setNewServiceForm] = useState({
    title: "",
    description: "",
    aboutInfo: "",
    marketFees: "",
    recommendedFees: "",
  });
  const [uploadingDocKey, setUploadingDocKey] = useState(null);
  const [isAddingServiceRequiredDoc, setIsAddingServiceRequiredDoc] = useState(false);
  const [newServiceRequiredDocName, setNewServiceRequiredDocName] = useState("");
  const [isSavingServiceRequiredDocs, setIsSavingServiceRequiredDocs] = useState(false);
  const [editingServiceDocRowKey, setEditingServiceDocRowKey] = useState(null);
  const [editingServiceDocRowValue, setEditingServiceDocRowValue] = useState("");
  // Admin/PR/Executor browse the Services page without any specific-user context,
  // so when a service has more than one user's lead, they must explicitly pick
  // which lead the "Documents Required" edits below apply to — otherwise edits
  // would land on whichever lead happened to update most recently, and (via the
  // shared Service catalog) leak into every other user's view of that service.
  const [selectedDocsLeadId, setSelectedDocsLeadId] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [isCompactMobile, setIsCompactMobile] = useState(window.innerWidth <= 480);
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
    ? (parseFeeAmount(overriddenOurFees[selectedService?._id || selectedService?.id]) ??
      parseFeeAmount(selectedService?.recommendedFees) ??
      selectedServicePricing?.amount ??
      1)
    : 1;
  const serviceSearchPlaceholder = isCompactMobile
    ? "Search services..."
    : "Search for any financial or legal service...";

  useEffect(() => {
    if (!selectedService) {
      setIsEditingService(false);
      setEditedService(null);
      setOurFeeInputValue("");
      openedServiceKeyRef.current = null;
      return;
    }
    const serviceKey = selectedService._id || selectedService.id || selectedService.title;
    if (openedServiceKeyRef.current !== serviceKey) {
      setIsEditingAbout(false);
      setEditedAbout("");
      setIsEditingTopDescription(false);
      setEditedTopDescription("");
      setSelectedDocsLeadId(null);
      openedServiceKeyRef.current = serviceKey;
    }
  }, [selectedService]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
      setIsCompactMobile(window.innerWidth <= 480);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const styleId = "rec-custom-global-styles";
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.innerHTML = `
        .rec-modal-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .rec-modal-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .rec-modal-scrollbar::-webkit-scrollbar-thumb {
          background: #334155;
          border-radius: 10px;
        }
        .rec-modal-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #0f172a;
        }
        .service-search-input::placeholder {
          color: #888888 !important;
          opacity: 1 !important;
        }
      `;
      document.head.appendChild(style);
    } else {
      const style = document.getElementById(styleId);
      style.innerHTML = `
        .rec-modal-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .rec-modal-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .rec-modal-scrollbar::-webkit-scrollbar-thumb {
          background: #334155;
          border-radius: 10px;
        }
        .rec-modal-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #0f172a;
        }
        .service-search-input::placeholder {
          color: #888888 !important;
          opacity: 1 !important;
        }
      `;
    }
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


  const handleDeleteService = async (service) => {
    if (!service) return;
    const serviceId = service?._id || service?.id;
    if (!serviceId) {
      toast.error("Cannot delete: service has no identifier");
      setIsServiceDeleteConfirmOpen(false);
      setServiceToDelete(null);
      return;
    }
    setIsServiceDeleting(true);

    const apiUrl = import.meta.env.VITE_API_URL;
    const token = storedUser?.token;
    const deletedTitle = String(service?.title || "").trim().toLowerCase();

    try {
      await axios.delete(
        `${apiUrl}/services/${serviceId}`,
        token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
      );

      setAllDbServices((prev) =>
        prev.filter((s) => String(s?._id) !== String(serviceId) && String(s?.id) !== String(serviceId))
      );

      setUserLeads((prev) => {
        if (!Array.isArray(prev)) return prev;
        if (!deletedTitle) return prev;
        return prev.filter(
          (lead) => String(lead?.serviceName || "").trim().toLowerCase() !== deletedTitle
        );
      });

      if (selectedService && (String(selectedService?._id) === String(serviceId) || String(selectedService?.id) === String(serviceId))) {
        setSelectedService(null);
      }

      try {
        const refreshRes = await axios.get(`${apiUrl}/services`);
        if (Array.isArray(refreshRes.data)) {
          setAllDbServices(refreshRes.data);
        }
      } catch (refreshErr) {
        console.error("Error refreshing services after delete:", refreshErr);
      }

      try {
        const leadsRes = await axios.get(
          `${apiUrl}/leads${storedUser?.role === "user" ? `?userId=${storedUser?._id || storedUser?.id}` : ""}`,
          token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
        );
        if (Array.isArray(leadsRes.data)) {
          setUserLeads(leadsRes.data);
        }
      } catch (leadsErr) {
        console.error("Error refreshing leads after delete:", leadsErr);
      }

      try {
        window.dispatchEvent(new CustomEvent("service-deleted", {
          detail: {
            serviceId,
            serviceTitle: service?.title || "",
            deletedLeads: true,
          }
        }));
      } catch (evtErr) {
        console.error("Error dispatching service-deleted event:", evtErr);
      }

      toast.success(`"${service.title}" deleted successfully`);
      setIsServiceDeleteConfirmOpen(false);
      setServiceToDelete(null);
    } catch (error) {
      const apiMessage = error?.response?.data?.message;
      toast.error(apiMessage || "Failed to delete service");
      setIsServiceDeleteConfirmOpen(false);
      setServiceToDelete(null);
    } finally {
      setIsServiceDeleting(false);
    }
  };

  const handleCreateService = async () => {
    const { title, description, aboutInfo, marketFees, recommendedFees } = newServiceForm;
    if (!title.trim() || !description.trim() || !aboutInfo.trim()) {
      toast.error("Service name, description, and about the service are required");
      return;
    }

    const apiUrl = import.meta.env.VITE_API_URL;
    const token = storedUser?.token;

    try {
      await axios.post(
        `${apiUrl}/services`,
        {
          title: title.trim(),
          description: description.trim(),
          aboutInfo: aboutInfo ? aboutInfo.trim() : "",
          marketFees: marketFees ? `Rs. ${formatOnlyDigits(marketFees)}` : "",
          recommendedFees: recommendedFees ? `Rs. ${formatOnlyDigits(recommendedFees)}` : "",
        },
        token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
      );

      const refreshRes = await axios.get(`${apiUrl}/services`);
      setAllDbServices(Array.isArray(refreshRes.data) ? refreshRes.data : []);
      toast.success(`"${title}" added successfully`);
      setIsAddingService(false);
    } catch (error) {
      const apiMessage = error?.response?.data?.message;
      toast.error(apiMessage || "Failed to add service");
    }
  };

  const handleRequiredDocumentUpload = async (leadId, docName, files) => {
    const fileArray = Array.from(files || []);
    if (fileArray.length === 0) return;
    if (fileArray.some((file) => file.type !== "application/pdf")) {
      toast.error("Only PDF documents are accepted");
      return;
    }
    setUploadingDocKey(docName);
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const formData = new FormData();
      fileArray.forEach((file) => formData.append("files", file));
      const uploadRes = await axios.post(`${apiUrl}/leads/upload`, formData, {
        headers: { Authorization: `Bearer ${storedUser.token}` },
      });
      const uploadedFiles = Array.isArray(uploadRes.data?.files) ? uploadRes.data.files : [];
      if (uploadedFiles.length !== fileArray.length) throw new Error("Upload failed");

      await axios.patch(
        `${apiUrl}/leads/${leadId}`,
        {
          // Any new upload/reupload invalidates a prior submission confirmation
          // so the Submit button re-enables to let the client confirm again.
          initialSubmissionConfirmed: false,
          $push: {
            documents: {
              $each: uploadedFiles.map((uploaded) => ({
                name: docName,
                url: uploaded.url,
                publicId: uploaded.filename,
                type: "Client",
                status: "Pending",
                uploadedAt: new Date(),
              })),
            },
          },
        },
        { headers: { Authorization: `Bearer ${storedUser.token}` } },
      );

      toast.success(`"${docName}" uploaded successfully`);
      const userId = storedUser?._id || storedUser?.id;
      const refreshed = await axios.get(`${apiUrl}/leads?userId=${userId}`, {
        headers: { Authorization: `Bearer ${storedUser.token}` },
      });
      setUserLeads(refreshed.data || []);
    } catch (error) {
      toast.error("Failed to upload document");
    } finally {
      setUploadingDocKey(null);
    }
  };

  const refreshUserLeadsList = async () => {
    const apiUrl = import.meta.env.VITE_API_URL;
    const userId = storedUser?._id || storedUser?.id;
    const url = storedUser?.role === "user" ? `${apiUrl}/leads?userId=${userId}` : `${apiUrl}/leads`;
    const refreshed = await axios.get(url, { headers: { Authorization: `Bearer ${storedUser.token}` } });
    setUserLeads(refreshed.data || []);
  };

  // Persist a required-documents change from the Services page. When a specific
  // user's lead is targeted, the change is written ONLY to that lead — never to
  // the shared Service catalog — so a document requested for one user (e.g. a
  // PR follow-up request) never shows up on every other user who picked the
  // same service. The Service catalog is only touched when there is no lead
  // yet (pure template editing before any user has taken up the service).
  const persistServiceRequiredDocs = async (service, lead, nextNames, { notify = false } = {}) => {
    const apiUrl = import.meta.env.VITE_API_URL;
    const token = storedUser.token;
    if (lead?._id) {
      await axios.patch(`${apiUrl}/leads/${lead._id}/documents-required`, { documentsRequired: nextNames }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (notify) {
        await axios.patch(`${apiUrl}/leads/${lead._id}/send-documents`, {}, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } else if (service?._id) {
      await axios.patch(`${apiUrl}/services/${service._id}`, { documentsRequired: nextNames }, {
        headers: { Authorization: `Bearer ${token}` },
      });
    }
    const svcRes = await axios.get(`${apiUrl}/services`);
    setAllDbServices(Array.isArray(svcRes.data) ? svcRes.data : []);
    await refreshUserLeadsList();
    if (!lead?._id) {
      setSelectedService((prev) => (prev ? { ...prev, documentsRequired: nextNames } : prev));
    }
  };

  const handleAddServiceRequiredDoc = async (service, lead, currentNames, docName) => {
    const trimmedName = String(docName || "").trim();
    if (!trimmedName) return;
    if ((currentNames || []).some((n) => String(n).trim().toLowerCase() === trimmedName.toLowerCase())) {
      setNewServiceRequiredDocName("");
      return;
    }
    setIsSavingServiceRequiredDocs(true);
    try {
      const nextNames = [...(currentNames || []), trimmedName];
      await persistServiceRequiredDocs(service, lead, nextNames, { notify: true });
      setNewServiceRequiredDocName("");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to add document");
    } finally {
      setIsSavingServiceRequiredDocs(false);
    }
  };

  const handleRemoveServiceRequiredDoc = async (service, lead, currentNames, docName) => {
    setIsSavingServiceRequiredDocs(true);
    try {
      const nextNames = (currentNames || []).filter((n) => n !== docName);
      await persistServiceRequiredDocs(service, lead, nextNames);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to remove document");
    } finally {
      setIsSavingServiceRequiredDocs(false);
    }
  };

  const handleRenameServiceRequiredDoc = async (service, lead, currentNames, oldName, newNameRaw) => {
    const newName = String(newNameRaw || "").trim();
    if (!newName || newName === oldName) {
      setEditingServiceDocRowKey(null);
      return;
    }
    if ((currentNames || []).some((n) => n !== oldName && n.trim().toLowerCase() === newName.toLowerCase())) {
      toast.error("A document with that name already exists");
      return;
    }
    setIsSavingServiceRequiredDocs(true);
    try {
      const nextNames = (currentNames || []).map((n) => (n === oldName ? newName : n));
      await persistServiceRequiredDocs(service, lead, nextNames, { notify: true });
      setEditingServiceDocRowKey(null);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to rename document");
    } finally {
      setIsSavingServiceRequiredDocs(false);
    }
  };

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

        } catch (error) {
          console.error("Error fetching user leads:", error);
        }
      }
    };

    fetchUserLeads();

    const refreshTimer = setInterval(fetchUserLeads, 15000);
    const handleFocus = () => fetchUserLeads();
    const handleServiceDocumentAdded = () => fetchUserLeads();
    const handleServiceDeleted = () => fetchUserLeads();
    window.addEventListener("focus", handleFocus);
    window.addEventListener("service-document-added", handleServiceDocumentAdded);
    window.addEventListener("service-deleted", handleServiceDeleted);

    return () => {
      clearInterval(refreshTimer);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("service-document-added", handleServiceDocumentAdded);
      window.removeEventListener("service-deleted", handleServiceDeleted);
    };
  }, [isLoggedIn, storedUser?._id, storedUser?.id, storedUser?.role]);

  // Once a lead's payment is verified server-side, keep its "Confirm Payment"
  // toggle permanently on — driven by the persisted paymentStatus rather than
  // the local click, so it survives refreshes, resubmission, and re-logins
  // instead of resetting to off.
  useEffect(() => {
    if (!Array.isArray(userLeads) || userLeads.length === 0) return;
    setPaymentConfirmedByLead((prev) => {
      let changed = false;
      const next = { ...prev };
      userLeads.forEach((lead) => {
        if (lead?.paymentStatus === "Paid" && lead?._id && !next[lead._id]) {
          next[lead._id] = true;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [userLeads]);

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
      const status = String(lead?.status || "").trim().toLowerCase();
      if (!lead || (status !== "rejected" && status !== "informationrequired")) return false;

      // Service-level executor rejection that PR has already notified the client about
      if (lead?.executorServiceRejected === true && lead?.prNotifiedClientServiceRejection === true) return true;

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
      const status = String(lead?.status || "").trim().toLowerCase();
      if (!lead || (status !== "rejected" && status !== "informationrequired")) return false;
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

      const leadStatus = String(lead?.status || "").trim().toLowerCase();
      const isFullRejection = leadStatus === "rejected" || isExecutorRejectedLead(lead);

      // Check if this specific document needs reupload:
      // Only docs explicitly notified by PR (prNotifiedClient = true) need reupload.
      // If no per-doc flags exist (old-style full rejection), fall back to all docs.
      const leadDocs = Array.isArray(lead?.documents) ? lead.documents : [];
      const hasPerDocRejection = leadDocs.some(d => d?.executorRejected);
      // Service-level executor rejection notified by PR — ALL docs need reupload,
      // even if individual docs still have prNotifiedClient=false staged flags.
      const isServiceLevelRejectionNotified =
        lead?.executorServiceRejected === true && lead?.prNotifiedClientServiceRejection === true;
      const thisDocNeedsReupload = isServiceLevelRejectionNotified || (hasPerDocRejection
        ? leadDocs.some(d =>
            normalizeText(d?.name) === normalizeText(docName) &&
            d?.executorRejected && d?.prNotifiedClient
          )
        : isFullRejection); // fallback for old-style full rejections

      if (serviceRejectionState && (thisDocNeedsReupload || (!hasPerDocRejection && isFullRejection))) {
        // Check if the user already reuploaded this specific doc on the server.
        // For service-level executor rejection, do NOT use the uploadedAt+url heuristic —
        // it would match the originally-uploaded docs and hide the reupload button.
        // When the entire service is rejected (leadStatus === "rejected") or executor
        // service-level rejection is notified, the uploadedAt+url heuristic must NOT
        // be used — the original pre-rejection upload would falsely match and hide
        // the Reupload button, showing "Change" instead.
        // When leadStatus === "rejected" (entire service rejected), ignore all server-side
        // reupload flags — d.reuploaded may be set from a previous InformationRequired cycle
        // and would falsely show "Change" for docs not yet reuploaded in this rejection.
        // Only local session uploads (localDocsArr) count as "already reuploaded" here.
        // If this specific doc has an active executor rejection (prNotifiedClient = true),
        // a previous d.reuploaded flag from an earlier cycle must NOT count — the executor
        // rejected it again, so the user must reupload fresh. Without this guard a stale
        // reuploaded=true flag makes the button show "Change" instead of "Reupload".
        const hasActiveExecutorRejection = leadDocs.some(d =>
          normalizeText(d?.name) === normalizeText(docName) &&
          d?.executorRejected === true && d?.prNotifiedClient === true
        );
        const alreadyReuploaded = !hasActiveExecutorRejection && leadStatus !== "rejected" && leadDocs.some(d =>
          normalizeText(d?.name) === normalizeText(docName) &&
          (!!d?.reuploaded || String(d?.status || "").trim().toLowerCase() === "reuploaded" ||
           (!isServiceLevelRejectionNotified && d?.uploadedAt && d?.url && !d?.executorRejected))
        );
        // Also check local upload state
        if (localDocsArr.length > 0 || alreadyReuploaded) {
          const first = localDocsArr[0];
          return {
            uploaded: true,
            reuploadRequired: false,
            message: alreadyReuploaded && !localDocsArr.length ? "Reuploaded. Awaiting review." : "Reuploaded. Ready to submit.",
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
        // Treat admin-added placeholder entries (adminAdded: true and no URL) as not yet uploaded
        const realServerDocs = serverDocsArr.filter((d) => {
          const isPlaceholder = d?.adminAdded === true && !d?.url && !d?.publicId && !d?.secure_url && !d?.uploadedUrl;
          return !isPlaceholder;
        });

        if (realServerDocs.length === 0) {
          return {
            uploaded: false,
            reuploadRequired: false,
            message: "",
            uploadedName: docName,
            uploadedUrl: "",
            publicId: "",
            uploadedNames: [],
            uploadedUrls: [],
            fullDocs: [],
            adminAdded: true,
          };
        }

        const latest =
          [...realServerDocs].sort((a, b) => {
            const aTime = new Date(a?.uploadedAt || a?.createdAt || 0).getTime();
            const bTime = new Date(b?.uploadedAt || b?.createdAt || 0).getTime();
            return bTime - aTime;
          })[0] || null;

        const latestStatus = String(latest?.status || "").trim().toLowerCase();
        return {
          uploaded: true,
          reuploadRequired: latestStatus === "rejected",
          message:
            String(latest?.rejectionMessage || "").trim() ||
            "This document was rejected. Please reupload the corrected file.",
          uploadedName: latest?.name || docName,
          uploadedUrl: latest?.url || "",
          publicId: latest?.publicId || "",
          uploadedNames: realServerDocs.map((d) => d?.name).filter(Boolean),
          uploadedUrls: realServerDocs.map((d) => d?.url).filter(Boolean),
          fullDocs: realServerDocs,
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

  const isDocumentAdminAdded = useCallback(
    (serviceTitle, docName) => {
      if (!isUserRole) return false;
      const lead = getLatestLeadForService(serviceTitle);
      if (!lead) return false;
      const docs = Array.isArray(lead.documents) ? lead.documents : [];
      const target = normalizeText(docName);
      return docs.some(
        (d) => normalizeText(d?.name) === target && (
          d?.adminAdded === true ||
          (d?.adminAdded === undefined && !d?.url && !d?.publicId && !d?.secure_url && !d?.uploadedUrl && d?.type === "Client" && d?.status === "Pending")
        ),
      );
    },
    [getLatestLeadForService, isUserRole],
  );

  const getServiceRejectionState = useCallback(
    (serviceTitle) => {
      const lead =
        getRejectedLeadForService(serviceTitle) ||
        getLatestLeadForService(serviceTitle);
      if (!lead) return null;

      const status = String(lead?.status || "").trim().toLowerCase();
      if (status !== "rejected" && status !== "informationrequired") {
        return null;
      }

      // If lead has moved back to PendingReview (user already reuploaded + submitted),
      // suppress the rejection state entirely — no banner, no reupload button
      if (status === "pendingreview") return null;

      if (isExecutorRejectedLead(lead)) {
        // Service-level executor rejection — PR has clicked "Notify Client"
        if (lead?.executorServiceRejected === true && lead?.prNotifiedClientServiceRejection === true) {
          const reason = getExecutorRejectionReason(lead) || String(lead?.prFeedback || "").trim();
          return {
            lead,
            type: "executor",
            status: "Rejected by Executor",
            message: reason || "The executor has rejected this service. Please reupload all required documents.",
          };
        }
        // If lead is InformationRequired and has prNotifiedClient docs, the PR is
        // forwarding the executor's rejection to the client — show as "Rejected by PR"
        const hasClientNotifiedDocs = Array.isArray(lead?.documents) &&
          lead.documents.some(d => d?.executorRejected && d?.prNotifiedClient);
        if (hasClientNotifiedDocs || String(lead?.status || "").trim().toLowerCase() === "informationrequired") {
          const prReason = String(lead?.prFeedback || "").trim();
          return {
            lead,
            type: "pr",
            status: "Rejected by PR",
            message: prReason || "Some documents were rejected. Please reupload the required documents.",
          };
        }
        const reason = getExecutorRejectionReason(lead);
        return {
          lead,
          type: "executor",
          status: "Rejected by PR",
          message: reason || "The service requires document corrections.",
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
      const trimmedTitle = String(serviceTitle || "").trim();
      const lead = getLatestLeadForService(trimmedTitle);
      if (!lead) return null;

      const status = String(lead?.status || "").trim().toLowerCase();
      const hasFinalDocument = Array.isArray(lead?.documents)
        ? lead.documents.some((doc) => {
            const docType = String(doc?.type || "").trim().toLowerCase();
            const docName = String(doc?.name || "").trim().toLowerCase();
            return docType === "final" || docName.startsWith("final");
          })
        : false;
      const effectiveStatus = hasFinalDocument && !["rejected", "informationrequired"].includes(status)
        ? "completed"
        : status;
      // Once the client has reuploaded every document and explicitly clicked
      // Submit, the rejection banner must clear immediately even if the status
      // field hasn't finished propagating everywhere yet.
      const isRejected =
        (effectiveStatus === "rejected" || effectiveStatus === "informationrequired") &&
        !lead?.initialSubmissionConfirmed;
      const isCompleted = effectiveStatus === "completed";
      // Admin rejected one or more of the client's uploaded documents while the
      // lead is still in the admin's own "Open" pre-review stage — the lead
      // itself never leaves "Open" for this, so it needs its own badge check.
      const isRejectedByAdmin = effectiveStatus === "open" && hasAdminRejectedDocuments(lead);

      if (!isRejected && !isCompleted && !isRejectedByAdmin) return null;

      if (isRejectedByAdmin) {
        return (
          <span
            style={{
              color: "#ef4444",
              fontWeight: 900,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              fontSize: "0.85rem",
              whiteSpace: "normal",
              wordBreak: "break-word",
              lineHeight: 1.2,
              textAlign: "right",
              display: "inline-block",
              padding: "4px 0",
            }}
          >
            Rejected by Admin
          </span>
        );
      }

      if (isRejected) {
        const serviceRejectionState = getServiceRejectionState(trimmedTitle);
        const statusText = serviceRejectionState?.status || "Rejected";

        return (
          <span
            style={{
              color: "#ef4444",
              fontWeight: 900,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              fontSize: "0.85rem",
              whiteSpace: "normal",
              wordBreak: "break-word",
              lineHeight: 1.2,
              textAlign: "right",
              display: "inline-block",
              padding: "4px 0",
            }}
          >
            {statusText}
          </span>
        );
      }

      if (isCompleted) {
        return (
          <span
            style={{
              color: "#10b981",
              fontWeight: 900,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              fontSize: "0.82rem",
              whiteSpace: "normal",
              wordBreak: "break-word",
              lineHeight: 1.2,
              textAlign: "right",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "flex-end",
              padding: 0,
            }}
          >
            Completed
          </span>
        );
      }

      return null;
    },
    [
      getLatestLeadForService,
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

  const getServiceSearchText = (service) =>
    normalizeText(
      [service?.title, service?.description, service?.category, service?.trigger]
        .filter(Boolean)
        .join(" "),
    );

  const resolveManualNeedEntry = (entry) => {
    const normalizedEntry = normalizeText(entry);
    if (!normalizedEntry) return null;

    const directTitle = SERVICE_LOOKUP.get(normalizedEntry);
    if (directTitle) {
      return ALL_SERVICES.find(
        (service) => normalizeText(service?.title) === normalizeText(directTitle),
      ) || null;
    }

    const aliasResolved = resolveBestServiceTitleForAlias(normalizedEntry);
    if (aliasResolved) {
      const aliasMatch = ALL_SERVICES.find(
        (service) => normalizeText(service?.title) === normalizeText(aliasResolved),
      );
      if (aliasMatch) return aliasMatch;
    }

    const tokens = normalizedEntry.split(" ").filter((token) => token.length > 2);
    if (tokens.length === 0) return null;

    let bestMatch = null;
    let bestScore = 0;

    ALL_SERVICES.forEach((service) => {
      const serviceText = getServiceSearchText(service);
      if (!serviceText) return;

      let score = 0;
      tokens.forEach((token) => {
        if (!serviceText.includes(token)) return;
        score += token.length >= 5 ? 2 : 1;
      });

      if (normalizedEntry.includes(serviceText) || serviceText.includes(normalizedEntry)) {
        score += 3;
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = service;
      }
    });

    return bestScore >= 2 ? bestMatch : null;
  };

  const getRelatedFallbackServices = (input) => {
    const normalizedInput = normalizeText(input);
    const tokens = splitManualNeed(input)
      .join(" ")
      .toLowerCase()
      .split(/[^a-z0-9]+/g)
      .map((token) => token.trim())
      .filter((token) => token && token.length > 2);

    const candidates = ALL_SERVICES.map((service) => {
      const serviceText = getServiceSearchText(service);
      let score = 0;

      tokens.forEach((token) => {
        if (!serviceText.includes(token)) return;
        score += token.length >= 6 ? 3 : 1;
      });

      if (normalizedInput && serviceText.includes(normalizedInput)) {
        score += 10;
      }

      return { service, score };
    }).sort((a, b) => b.score - a.score || a.service.title.localeCompare(b.service.title));

    const positiveMatches = candidates
      .filter((item) => item.score > 0)
      .map((item) => item.service)
      .slice(0, 2);

    if (positiveMatches.length > 0) {
      return positiveMatches;
    }

    const pathFallbackAliases =
      activeProfile.path === "having"
        ? ["Virtual CFO Service", "Accounts Bookkeeping"]
        : ["Company Incorporation", "GST Registration"];

    const fallback = [];
    const usedTitles = new Set();

    pathFallbackAliases.forEach((alias) => {
      const normalizedAlias = normalizeText(alias);
      const resolved =
        SERVICE_LOOKUP.get(normalizedAlias) ||
        resolveBestServiceTitleForAlias(normalizedAlias);
      const service = ALL_SERVICES.find(
        (item) => normalizeText(item.title) === normalizeText(resolved),
      );

      if (service && !usedTitles.has(service.title)) {
        usedTitles.add(service.title);
        fallback.push(service);
      }
    });

    if (fallback.length < 2) {
      candidates.forEach(({ service }) => {
        if (fallback.length >= 2) return;
        if (usedTitles.has(service.title)) return;
        usedTitles.add(service.title);
        fallback.push(service);
      });
    }

    return fallback.slice(0, 2);
  };

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

    const orderedServices = [];
    const usedTitles = new Set();

    normalizedEntries.forEach((entry) => {
      const resolvedService = resolveManualNeedEntry(entry.raw);
      if (resolvedService && !usedTitles.has(resolvedService.title)) {
        orderedServices.push(resolvedService);
        usedTitles.add(resolvedService.title);
        return;
      }

      if (usedTitles.has(entry.raw)) return;
      orderedServices.push({
        title: entry.raw,
        description:
          "This is a service you requested during onboarding. Open it to share details and documents with our team.",
        category: "Advisory",
        trigger: "Requested",
      });
      usedTitles.add(entry.raw);
    });

    const hasAnyResolvedService = orderedServices.some(
      (service) => ALL_SERVICES.some((catalogService) => service.title === catalogService.title),
    );

    if (hasAnyResolvedService) {
      return orderedServices;
    }

    return getRelatedFallbackServices(input);
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
        const normalizedLead = normalizeText(String(lead?.serviceName || "").trim());
        const serviceStillExists =
          ALL_SERVICES.some(
            (service) =>
              normalizeText(String(service?.title || "")) === normalizedLead,
          ) ||
          SERVICE_LOOKUP.has(normalizedLead) ||
          !!resolveBestServiceTitleForAlias(normalizedLead) ||
          ALL_SERVICES.some((service) => {
            const normalizedTitle = normalizeText(String(service?.title || ""));
            if (!normalizedTitle) return false;
            const tokens = normalizedLead.split(" ").filter(Boolean);
            return tokens.length > 0 && tokens.every((t) => normalizedTitle.includes(t));
          });
        if (serviceStillExists) {
          map.set(key, lead);
        }
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

  // Prevent body scroll when the add-service modal is open. The service
  // detail modal intentionally leaves page scroll enabled (see below) — it
  // stays pinned in front of the footer via position:fixed + z-index instead.
  useEffect(() => {
    if (isAddingService) {
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    };
  }, [isAddingService]);

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
                color: "#000000",
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
                color: "var(--text-muted)",
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
                  ? "Explore available services, review requirements and manage your documents from one place."
                  : hasOnboardingProfile
                    ? "Based on your onboarding answers, we've curated only the services that match your selected path and follow-up responses."
                    : "Based on your business profile, we've curated the most impactful services to accelerate your growth and ensure compliance."}
            </p>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                width: "100%",
                position: "relative",
                minHeight: "42px",
                margin: "0 auto",
                marginBottom: isAdmin ? "0" : "1rem",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: "50%",
                  transform: "translateX(-50%)",
                  display: "flex",
                  alignItems: "center",
                  width: "100%",
                  maxWidth: "500px",
                }}
              >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  maxWidth: "500px",
                  width: "100%",
                  background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
                  border: isLightMode
                    ? "1px solid rgba(181,189,199,0.98)"
                    : "1px solid rgba(110,118,132,0.22)",
                  padding: "0.65rem 0.65rem 0.65rem 1.15rem",
                  transition: "all 0.3s ease",
                  borderRadius: "16px",
                  boxShadow: isLightMode
                    ? "0 16px 32px rgba(31, 41, 55, 0.06)"
                    : "0 16px 32px rgba(31, 41, 55, 0.08)",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "#f97316";
                  e.currentTarget.style.boxShadow = "0 0 0 4px rgba(249, 115, 22, 0.1)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = isLightMode ? "rgba(181,189,199,0.98)" : "rgba(110,118,132,0.22)";
                  e.currentTarget.style.boxShadow = isLightMode ? "0 16px 32px rgba(31, 41, 55, 0.06)" : "0 16px 32px rgba(31, 41, 55, 0.08)";
                }}
              >
                <Search size={18} color="#000000" />
                <input
                  type="text"
                  className="service-search-input"
                  placeholder={serviceSearchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#000000",
                    outline: "none",
                    width: "100%",
                    fontSize: "0.95rem",
                    fontWeight: 400,
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
                      color: "#000000",
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
                    background: "linear-gradient(135deg, #f97316, #ea580c)",
                    border: "1px solid rgba(255,255,255,0.14)",
                    color: "#ffffff",
                    padding: "0.6rem 1.2rem",
                    borderRadius: "12px",
                    cursor: "pointer",
                    fontWeight: 700,
                    fontSize: "0.85rem",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    boxShadow: "0 10px 24px rgba(249, 115, 22, 0.15)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-1px)";
                    e.currentTarget.style.boxShadow = "0 12px 28px rgba(249, 115, 22, 0.25)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 10px 24px rgba(249, 115, 22, 0.15)";
                  }}
                >
                  Search
                </button>
              </div>
              </div>
              {isAdmin && (
                <button
                  onClick={() => {
                    setNewServiceForm({
                      title: "",
                      description: "",
                      aboutInfo: "",
                      marketFees: "",
                      recommendedFees: "",
                    });
                    setIsAddingService(true);
                  }}
                  title="Add new service"
                  style={{
                    padding: "8px 18px",
                    background: "#10b981",
                    border: "none",
                    color: "#fff",
                    borderRadius: "10px",
                    fontSize: "0.8rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    transition: "all 0.2s ease",
                    boxShadow: "0 4px 12px rgba(16,185,129,0.25)",
                    height: "42px",
                    marginLeft: "auto",
                    flexShrink: 0,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#059669";
                    e.currentTarget.style.transform = "translateY(-1px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#10b981";
                    e.currentTarget.style.transform = "none";
                  }}
                >
                  + Add Service
                </button>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* -- Services list: shows every service (including ones just added) as a card -- */}
      <section className="section-sm" style={{ position: "relative", zIndex: 1 }}>
        <div className="container recommendations-container">
          <h2
            style={{
              fontSize: isMobile ? "1.4rem" : "1.75rem",
              fontWeight: 500,
              color: "#0f172a",
              margin: "0 0 1.5rem",
              letterSpacing: "-0.01em",
              textAlign: "left",
            }}
          >
            Services
          </h2>
          {allDbServices.length === 0 ? (
            <NoServicesFound onClear={() => setSearchQuery("")} isLightMode={isLightMode} />
          ) : (
            <div
              className="recommendations-grid"
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(320px, 1fr))",
                gap: isMobile ? "1.25rem" : "2rem",
                justifyContent: "center",
              }}
            >
              {allDbServices.map((service, idx) => (
                <ServiceCard
                  key={service._id || service.id || idx}
                  service={service}
                  idx={idx}
                  onClick={setSelectedService}
                  isAdmin={isAdmin}
                  onDelete={(svc) => {
                    setServiceToDelete(svc);
                    setIsServiceDeleteConfirmOpen(true);
                  }}
                  isLightMode={isLightMode}
                  isMobile={isMobile}
                  topBadge={renderServiceCardBadge(service.title)}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Cards - commented out to remove services cards from the site, code preserved below */}
      {false && (
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
                    color: "#0f172a",
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
                    isAdmin={isAdmin}
                    onDelete={(svc) => {
                      setServiceToDelete(svc);
                      setIsServiceDeleteConfirmOpen(true);
                    }}
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
                      color: "#0f172a",
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
                            color: "#0f172a",
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
                              isAdmin={isAdmin}
                              onDelete={(svc) => {
                                setServiceToDelete(svc);
                                setIsServiceDeleteConfirmOpen(true);
                              }}
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
      )}



      {/* Service Detail Modal/Form */}
      {selectedService && (() => {
          const serviceRejectionState = getServiceRejectionState(selectedService.title);
          const serviceRejectionSignature = getServiceRejectionSignature(selectedService.title);
          const serviceRejectionDismissed =
            dismissedServiceRejectionSignatures[normalizeText(selectedService.title)] ===
            serviceRejectionSignature;
          const docs = [];
          const required = docs.filter((d) => d.required);
          const localUploadsForService = uploadedDocs[selectedService.title] || {};
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
          const showReadyForReviewBanner =
            serviceReuploadReady && !serviceRejectionDismissed;
          const isComplete = required.every((d) => {
            const state = getDocumentState(selectedService.title, d.name);
            return state.uploaded && !state.reuploadRequired;
          });

          // Documents the admin has explicitly requested for this lead (see the
          // "Documents Required" section below) — used both to render that list
          // and to gate the Confirm & Submit button until all are uploaded.
          // Admin/PR/Executor can have several different users' leads for the same
          // service title, so they must explicitly pick which one "Documents
          // Required" applies to (see the selector rendered below) rather than
          // silently falling on whichever lead happened to update most recently.
          const leadsForThisService = isUserRole
            ? []
            : userLeads
                .filter((l) => serviceNamesMatch(l?.serviceName, selectedService.title))
                .sort((a, b) => new Date(b?.updatedAt || b?.createdAt || 0) - new Date(a?.updatedAt || a?.createdAt || 0));
          const currentLeadForRequiredDocs = isUserRole
            ? getLatestLeadForService(selectedService.title)
            : (leadsForThisService.find((l) => l._id === selectedDocsLeadId) || leadsForThisService[0] || null);
          const adminRequiredDocRows = (() => {
            const allDocs = Array.isArray(currentLeadForRequiredDocs?.documents)
              ? currentLeadForRequiredDocs.documents
              : [];
            const isUploaded = (name) => {
              const key = String(name || "").trim().toLowerCase();
              return allDocs.some((d) => {
                const docNameKey = String(d?.name || "").trim().toLowerCase();
                return docNameKey === key && !!(d?.url || d?.publicId || d?.secure_url || d?.uploadedUrl);
              });
            };
            // A whole-service rejection (lead.status === "Rejected") only ever sets the
            // lead-level status — it never touches each document's own `status`, so
            // checking individual document status alone would miss every document and
            // hide the Reupload button entirely. Treat a whole-service rejection as
            // requiring reupload of every required document that hasn't been freshly
            // reuploaded yet in THIS rejection cycle. The backend resets every
            // document's `reuploaded` flag to false at the moment PR rejects the whole
            // service (see leadController.js's isDirectServiceRejectionByReviewer) and
            // sets it back to true on the specific document that gets reuploaded — so
            // checking that flag here tells apart "still needs reupload" from "already
            // reuploaded, awaiting the user's explicit Submit" per document, without
            // the lead-level status needing to change (submission is manual).
            const isWholeServiceRejected = String(currentLeadForRequiredDocs?.status || "").trim().toLowerCase() === "rejected";
            const hasFreshReupload = (name) => {
              const key = String(name || "").trim().toLowerCase();
              return allDocs.some((d) => {
                const docNameKey = String(d?.name || "").trim().toLowerCase();
                return docNameKey === key && !!d?.reuploaded && !!(d?.url || d?.publicId || d?.secure_url || d?.uploadedUrl);
              });
            };
            const isRejectedByAdmin = (name) => {
              // Once the client has explicitly resubmitted (all documents reuploaded
              // and Submit clicked), every document reads as reuploaded — never show
              // "Reupload" again for this cycle regardless of any other stale signal.
              if (currentLeadForRequiredDocs?.initialSubmissionConfirmed) return false;
              if (isWholeServiceRejected) return !hasFreshReupload(name);
              const key = String(name || "").trim().toLowerCase();
              return allDocs.some((d) => {
                const docNameKey = String(d?.name || "").trim().toLowerCase();
                const type = String(d?.type || "").trim().toLowerCase();
                if (type === "draft" || type === "final") return false;
                return docNameKey === key && String(d?.status || "").trim().toLowerCase() === "rejected";
              });
            };
            // Identify who actually rejected this document so the reupload prompt
            // names the right reviewer instead of always saying "Admin" — a document
            // carries executorRejected=true when the executor (not PR/admin) flagged
            // it, and the lead only stays "Open" while it's still in admin's own
            // pre-PR intake stage; anything past that is a PR-stage rejection.
            const getRejectedByLabel = (name) => {
              const key = String(name || "").trim().toLowerCase();
              const rejectedDoc = allDocs.find((d) => {
                const docNameKey = String(d?.name || "").trim().toLowerCase();
                const type = String(d?.type || "").trim().toLowerCase();
                if (type === "draft" || type === "final") return false;
                return docNameKey === key && String(d?.status || "").trim().toLowerCase() === "rejected";
              });
              if (rejectedDoc?.executorRejected) return "Executor";
              if (rejectedDoc) {
                const leadStatus = String(currentLeadForRequiredDocs?.status || "").trim().toLowerCase();
                return leadStatus === "open" ? "Admin" : "PR";
              }
              if (isWholeServiceRejected) {
                // No specific document carries a rejected status — this is a
                // whole-service rejection, so infer who rejected it from the
                // same message-origin signals getServiceRejectionState uses.
                const execMsg = String(currentLeadForRequiredDocs?.executorMessage || "").toLowerCase();
                const prMsg = String(currentLeadForRequiredDocs?.prFeedback || "").toLowerCase();
                const adminMsg = String(currentLeadForRequiredDocs?.adminMessage || "").toLowerCase();
                const executorIndicators = ["executor", "assignment rejected", "rejected by executor"];
                const isExecutorOrigin =
                  execMsg.length > 0 ||
                  executorIndicators.some((ind) => prMsg.includes(ind) || adminMsg.includes(ind));
                return isExecutorOrigin ? "Executor" : "PR";
              }
              return "PR";
            };

            let names = [];
            if (isUserRole) {
              // The client only ever sees documents requested on THEIR OWN lead
              // (sourced from stable, admin-controlled per-lead fields rather than
              // the "adminAdded" flag, which reuploads replace).
              if (!currentLeadForRequiredDocs?.documentsSentToUser) return [];
              names = Array.isArray(currentLeadForRequiredDocs?.documentsRequired)
                ? currentLeadForRequiredDocs.documentsRequired
                : [];
            } else if (currentLeadForRequiredDocs) {
              // A specific user's lead is selected — show ONLY that lead's own
              // required-documents list, exactly what that one user sees. Never
              // mix in the shared Service catalog list here, otherwise a document
              // requested for this user would appear to leak onto every other
              // user who picked the same service.
              names = Array.isArray(currentLeadForRequiredDocs.documentsRequired)
                ? currentLeadForRequiredDocs.documentsRequired
                : [];
            } else {
              // No lead exists yet for this service (pure template editing before
              // any user has taken it up) — fall back to the shared catalog list.
              names = Array.isArray(selectedService?.documentsRequired)
                ? selectedService.documentsRequired
                : [];
            }

            return names
              .map((name) => String(name || "").trim())
              .filter(Boolean)
              .map((name) => ({ key: name.toLowerCase(), name, uploaded: isUploaded(name), rejected: isRejectedByAdmin(name), rejectedBy: getRejectedByLabel(name) }));
          })();
          const allAdminRequiredDocsUploaded = adminRequiredDocRows.every((r) => r.uploaded);
          const hasRejectedRequiredDocs = adminRequiredDocRows.some((r) => r.rejected);
          // The payment gate only applies to the user's very first submission for
          // this lead (status still "Open") — later reupload/resubmit cycles after
          // a rejection never require paying again.
          const isInitialPaymentGateActive =
            isUserRole &&
            adminRequiredDocRows.length > 0 &&
            String(currentLeadForRequiredDocs?.status || "").trim().toLowerCase() === "open";
          // The Payment Confirmation container itself, however, must stay visible
          // for the lifetime of this lead once admin-required docs exist — even
          // after PR/executor/admin rejects the whole service — so the client can
          // always see their payment status. Only the submit-blocking gate above
          // is scoped to the initial "Open" stage.
          const showPaymentConfirmationContainer =
            isUserRole && adminRequiredDocRows.length > 0;
          const isConfirmDisabled = (() => {
            if (!isComplete || isSubmitting) return true;
            if (adminRequiredDocRows.length > 0) {
              if (!allAdminRequiredDocsUploaded || hasRejectedRequiredDocs) return true;
              if (isInitialPaymentGateActive && !paymentConfirmedByLead[currentLeadForRequiredDocs?._id]) return true;
              // Already submitted with this exact set of documents — stay disabled
              // until a new upload/reupload resets the confirmation flag.
              if (currentLeadForRequiredDocs?.initialSubmissionConfirmed) return true;
              return false;
            }
            const existingLead = getLatestLeadForService(selectedService.title);
            if (!existingLead?._id) return false;
            const localUploadsForService = uploadedDocs[selectedService.title] || {};
            return Object.keys(localUploadsForService).length === 0;
          })();

          const fees = (() => {
            const marketFeesRaw = String(selectedService.marketFees || "").trim();
            const sid = selectedService?._id || selectedService?.id;
            const overriddenFee = overriddenOurFees[sid];
            const storedFee = (() => {
              const raw = String(selectedService.recommendedFees || "").trim();
              if (!raw) return null;
              const parts = raw.split(/[;|\n]+/).map((s) => s.trim()).filter(Boolean);
              return parts.length > 0 ? parts[0] : raw;
            })();
            const recommended = overriddenFee || storedFee || String(getServicePricing(selectedService.title).displayPrice || "").trim();
            const market = marketFeesRaw || (
              Number.isFinite(Number(getServicePricing(selectedService.title).amount)) && Number(getServicePricing(selectedService.title).amount) > 0
                ? formatInr(Math.round(Number(getServicePricing(selectedService.title).amount) * 1.4))
                : ""
            );

            return { market, recommended };
          })();

          // Working Days lives on the specific user's lead and only makes sense
          // once admin has actually set the documents required for that user's
          // request — a freshly added service (or one with no per-user documents
          // configured yet) has no meaningful working-days figure to show.
          const hasWorkingDaysContext =
            Array.isArray(currentLeadForRequiredDocs?.documentsRequired) &&
            currentLeadForRequiredDocs.documentsRequired.length > 0;

          return createPortal(
            <>
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
                  ? isCompactMobile
                    ? `${mobileNavbarOffset} 0 0.75rem`
                    : `${mobileNavbarOffset} 0 0`
                  : "clamp(5.5rem, 9vh, 6.5rem) 1.5rem 1.5rem",
                background: "rgba(0,0,0,0.85)",
                overflow: "hidden",
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
                  maxHeight: "100%",
                  overflowY: "auto",
                  overscrollBehavior: "contain",
                  borderRadius: isMobile ? "16px 16px 0 0" : "12px",
                  border: "1px solid #e2e8f0",
                  display: "flex",
                  flexDirection: "column",
                  boxShadow: "0 32px 80px rgba(31,41,55,0.18)",
                  background: "#f1f5f9",
                }}
              >
                {/* -- HEADER -- */}
                <div
                  style={{
                    padding: isCompactMobile ? "0.55rem 0.95rem 0.65rem" : isMobile ? "0.8rem 1.25rem" : "1rem 2rem",
                    borderBottom: "1px solid #e2e8f0",
                    display: "flex",
                    alignItems: isCompactMobile ? "stretch" : "flex-start",
                    justifyContent: "space-between",
                    gap: isCompactMobile ? "0.65rem" : "1rem",
                    flexShrink: 0,
                    background: "transparent",
                    flexDirection: isCompactMobile ? "column" : "row",
                    position: "relative",
                    paddingRight: isCompactMobile ? "3rem" : undefined,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: isMobile ? "0.85rem" : "1rem", flex: 1, minWidth: 0 }}>
                    <div style={{ minWidth: 0 }}>
                      {isAdmin && isEditingService ? (
                        <input
                          type="text"
                          value={editedService?.title ?? selectedService.title ?? ""}
                          onChange={(e) => setEditedService({ ...editedService, title: e.target.value })}
                          placeholder="Service name"
                          style={{
                            fontSize: isMobile ? "1rem" : "1.15rem",
                            fontWeight: 700,
                            color: "#0f172a",
                            margin: 0,
                            letterSpacing: "-0.01em",
                            lineHeight: 1.2,
                            width: "100%",
                            padding: "4px 8px",
                            background: "#ffffff",
                            border: "1px solid #cbd5e1",
                            borderRadius: "8px",
                            outline: "none",
                          }}
                        />
                      ) : (
                        <h2
                          style={{
                            fontSize: isMobile ? "1rem" : "1.15rem",
                            fontWeight: 700,
                            color: "#0f172a",
                            margin: 0,
                            letterSpacing: "-0.01em",
                            lineHeight: 1.2,
                          }}
                        >
                          {selectedService.title}
                        </h2>
                      )}
                      {showReadyForReviewBanner && !isCompactMobile && (
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
                  <div
                    style={{
                      display: "flex",
                      alignItems: isCompactMobile ? "flex-end" : "center",
                      justifyContent: isCompactMobile ? "space-between" : "flex-end",
                      gap: isCompactMobile ? "0.5rem" : "1rem",
                      width: isCompactMobile ? "100%" : "auto",
                    }}
                  >
                    {(() => {
                      if (serviceRejectionState) {
                        const leadForRej = serviceRejectionState.lead;
                        const leadStatusLower = String(leadForRej?.status || "").trim().toLowerCase();

                        // If lead has moved back to PendingReview, user already submitted — hide label
                        if (leadStatusLower === "pendingreview") return null;

                        // Service-level executor rejection: even if individual doc.status isn't "Rejected",
                        // the service is still in a rejected state if executorServiceRejected is set.
                        const isServiceLevelRej =
                          leadForRej?.executorServiceRejected === true &&
                          leadForRej?.prNotifiedClientServiceRejection === true;
                        const hasRejectedDocs = isServiceLevelRej || (Array.isArray(leadForRej?.documents)
                          ? leadForRej.documents.some((d) => {
                              // Only count docs that are still awaiting reupload (not yet reuploaded)
                              const docStatus = String(d?.status || "").trim().toLowerCase();
                              const isRejected = docStatus === "rejected";
                              const wasReuploaded = !!d?.reuploaded || docStatus === "reuploaded";
                              return isRejected && !wasReuploaded;
                            })
                          : false);

                        if (hasRejectedDocs) {
                          return (
                            <span style={{ color: "#ef4444", fontSize: isCompactMobile ? "0.7rem" : "0.78rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "right" }}>
                              {serviceRejectionState.status}
                            </span>
                          );
                        }
                        // If no rejected docs remain, fallthrough and let other banners render (e.g. Ready for Review)
                      }

                      const latestLead = getLatestLeadForService(selectedService.title);
                      if (String(latestLead?.status || "").trim().toLowerCase() === "completed") {
                        return (
                          <span style={{ color: "#10b981", fontSize: isCompactMobile ? "0.7rem" : "0.78rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "right" }}>
                            Completed
                          </span>
                        );
                      }

                      return null;
                    })()}
                    <button
                      onClick={() => setSelectedService(null)}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "#64748b",
                        cursor: "pointer",
                        width: isCompactMobile ? "28px" : "32px",
                        height: isCompactMobile ? "28px" : "32px",
                        borderRadius: "8px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        transition: "all 0.2s",
                        position: isCompactMobile ? "absolute" : "static",
                        top: isCompactMobile ? "0.55rem" : "auto",
                        right: isCompactMobile ? "0.65rem" : "auto",
                        transform: isCompactMobile ? "none" : "translateX(-4px)",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "rgba(0,0,0,0.05)";
                        e.currentTarget.style.color = "#0f172a";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.color = "#64748b";
                      }}
                    >
                      <X size={20} />
                    </button>
                  </div>
                </div>

                {/* -- SCROLLABLE BODY -- */}
                <div
                  className="rec-modal-scrollbar"
                  style={{
                    flex: 1,
                    overflowY: "auto",
                    overscrollBehavior: "contain",
                    padding: isCompactMobile
                      ? "0.9rem 0.9rem 1.2rem"
                      : isMobile
                        ? "1.25rem 1.25rem 2rem"
                        : "1.75rem 2.5rem 2rem",
                    position: "relative",
                    color: "#000000",
                  }}
                >

                  {/* -- Top Description (with admin-only Edit Description toggle) -- */}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: isMobile ? "column" : "row",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: isMobile ? "0.8rem" : "1.5rem",
                      marginBottom: isEditingTopDescription ? "1rem" : "0.5rem",
                    }}
                  >
                    {isEditingTopDescription ? (
                      <div style={{ flex: 1, width: "100%" }}>
                        <textarea
                          value={editedTopDescription}
                          onChange={(e) => setEditedTopDescription(e.target.value)}
                          rows={4}
                          placeholder="Describe this service..."
                          style={{
                            width: "100%",
                            padding: "0.65rem 0.85rem",
                            border: "1px solid #cbd5e1",
                            borderRadius: "10px",
                            fontSize: isMobile ? "0.88rem" : "0.95rem",
                            color: "#0f172a",
                            resize: "vertical",
                            outline: "none",
                            fontFamily: "inherit",
                            lineHeight: 1.6,
                            boxSizing: "border-box",
                          }}
                        />
                        <div style={{ display: "flex", gap: "8px", marginTop: "0.6rem", justifyContent: "flex-end" }}>
                          <button
                            onClick={() => {
                              setIsEditingTopDescription(false);
                              setEditedTopDescription("");
                            }}
                            style={{ padding: "6px 14px", background: "transparent", border: "1px solid #10b981", color: "#10b981", borderRadius: "8px", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer" }}
                          >
                            Cancel
                          </button>
                          <button
                            onClick={async () => {
                              const trimmedDesc = String(editedTopDescription || "").trim();
                              if (!trimmedDesc) {
                                toast.error("Please enter a service description");
                                return;
                              }
                              try {
                                const apiUrl = import.meta.env.VITE_API_URL;
                                const token = JSON.parse(localStorage.getItem("user"))?.token;
                                await axios.patch(`${apiUrl}/services/${selectedService._id}`, { description: trimmedDesc }, {
                                  headers: { Authorization: `Bearer ${token}` }
                                });
                                toast.success("Service description updated successfully");
                                setIsEditingTopDescription(false);
                                setSelectedService({ ...selectedService, description: trimmedDesc });
                                const refreshRes = await axios.get(`${apiUrl}/services`);
                                setAllDbServices(refreshRes.data);
                              } catch (err) {
                                console.error("Update service description error:", err.response?.data || err.message);
                                toast.error(err.response?.data?.message || "Failed to update service description");
                              }
                            }}
                            style={{ padding: "6px 14px", background: "#10b981", border: "none", color: "#fff", borderRadius: "8px", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer" }}
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p
                          style={{
                            color: "#000000",
                            fontSize: isMobile ? "0.88rem" : "0.95rem",
                            lineHeight: 1.6,
                            margin: 0,
                            flex: 1,
                          }}
                        >
                          {selectedService.description}
                        </p>
                        {isAdmin && (
                          <button
                            onClick={() => {
                              setEditedTopDescription(selectedService.description || "");
                              setIsEditingTopDescription(true);
                            }}
                            style={{
                              padding: "6px 12px",
                              background: "#3b82f6",
                              border: "none",
                              color: "#fff",
                              borderRadius: "8px",
                              fontSize: "0.72rem",
                              fontWeight: 700,
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                              flexShrink: 0,
                            }}
                          >
                            <Edit size={12} /> Edit Description
                          </button>
                        )}
                      </>
                    )}
                  </div>

                  {/* -- Our Fee / Market Fees / Working Days -- */}
                  {isAdmin && isEditingService ? (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: isMobile ? "1fr" : (hasWorkingDaysContext ? "1fr 1fr 1fr" : "1fr 1fr"),
                        gap: "1px",
                        background: "#e2e8f0",
                        border: "1px solid #e2e8f0",
                        borderRadius: "12px",
                        overflow: "hidden",
                        marginBottom: "1.25rem",
                      }}
                    >
                      <div
                        style={{
                          padding: "0.6rem 0.7rem",
                          background: "#f8fafc",
                          textAlign: "left",
                          minWidth: 0,
                        }}
                      >
                        <label style={{ fontSize: "0.62rem", fontWeight: 700, color: "#059669", display: "block", marginBottom: "4px", textTransform: "uppercase", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          Our Fee
                        </label>
                        <div
                           style={{
                             display: "flex",
                             alignItems: "center",
                             background: "#ffffff",
                             border: "1px solid #cbd5e1",
                             borderRadius: "8px",
                             padding: "0.5rem 0.6rem",
                             boxShadow: "inset 0 1px 2px rgba(0,0,0,0.05)",
                             transition: "border-color 0.2s",
                             gap: "4px",
                             minWidth: 0,
                           }}
                         >
                           <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#64748b", userSelect: "none", flexShrink: 0 }}>Rs.</span>
                            <input
                              type="text"
                              value={ourFeeInputValue}
                              onChange={(e) => {
                                const raw = e.target.value;
                                setOurFeeInputValue(raw);
                                const formatted = formatOnlyDigits(raw);
                                setEditedService({ ...editedService, recommendedFees: formatted ? `Rs. ${formatted}` : "" });
                              }}
                             style={{
                               flex: 1,
                               minWidth: 0,
                               width: "100%",
                               border: "none",
                               outline: "none",
                               background: "transparent",
                               padding: 0,
                               margin: 0,
                               color: "#000000",
                               fontSize: "0.85rem",
                               fontWeight: 600,
                             }}
                             onFocus={(e) => {
                               e.currentTarget.parentElement.style.borderColor = "#10b981";
                             }}
                             onBlur={(e) => {
                               e.currentTarget.parentElement.style.borderColor = "#cbd5e1";
                             }}
                           />
                         </div>
                      </div>
                      <div
                        style={{
                          padding: "0.6rem 0.7rem",
                          background: "#f8fafc",
                          textAlign: "left",
                          minWidth: 0,
                        }}
                      >
                        <label style={{ fontSize: "0.62rem", fontWeight: 700, color: "#ef4444", display: "block", marginBottom: "4px", textTransform: "uppercase", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          Market Fees
                        </label>
                        <div
                           style={{
                             display: "flex",
                             alignItems: "center",
                             background: "#ffffff",
                             border: "1px solid #cbd5e1",
                             borderRadius: "8px",
                             padding: "0.5rem 0.6rem",
                             boxShadow: "inset 0 1px 2px rgba(0,0,0,0.05)",
                             transition: "border-color 0.2s",
                             gap: "4px",
                             minWidth: 0,
                           }}
                         >
                           <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#64748b", userSelect: "none", flexShrink: 0 }}>Rs.</span>
                            <input
                              type="text"
                              value={(() => {
                                const avg = calculateMarketAverage(editedService?.marketFees);
                                return avg ? formatOnlyDigits(String(Math.round(avg))) : "";
                              })()}
                              onChange={(e) => {
                                const formatted = formatOnlyDigits(e.target.value);
                                setEditedService({ ...editedService, marketFees: formatted ? `Rs. ${formatted}` : "" });
                              }}
                             style={{
                               flex: 1,
                               minWidth: 0,
                               width: "100%",
                               border: "none",
                               outline: "none",
                               background: "transparent",
                               padding: 0,
                               margin: 0,
                               color: "#000000",
                               fontSize: "0.85rem",
                               fontWeight: 600,
                             }}
                             onFocus={(e) => {
                               e.currentTarget.parentElement.style.borderColor = "#ef4444";
                             }}
                             onBlur={(e) => {
                               e.currentTarget.parentElement.style.borderColor = "#cbd5e1";
                             }}
                           />
                         </div>
                      </div>
                      {hasWorkingDaysContext && (
                      <div
                        style={{
                          padding: "0.6rem 0.7rem",
                          background: "#f8fafc",
                          textAlign: "left",
                          minWidth: 0,
                        }}
                      >
                        <label style={{ fontSize: "0.62rem", fontWeight: 700, color: "#3b82f6", display: "block", marginBottom: "4px", textTransform: "uppercase", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          Working Days
                        </label>
                        <div
                           style={{
                             display: "flex",
                             alignItems: "center",
                             background: "#ffffff",
                             border: "1px solid #cbd5e1",
                             borderRadius: "8px",
                             padding: "0.5rem 0.6rem",
                             boxShadow: "inset 0 1px 2px rgba(0,0,0,0.05)",
                             transition: "border-color 0.2s",
                             minWidth: 0,
                           }}
                         >
                            <input
                              type="number"
                              min={1}
                              step={1}
                              value={editedWorkingDays}
                              onChange={(e) => setEditedWorkingDays(e.target.value)}
                             style={{
                               flex: 1,
                               minWidth: 0,
                               width: "100%",
                               border: "none",
                               outline: "none",
                               background: "transparent",
                               padding: 0,
                               margin: 0,
                               color: "#000000",
                               fontSize: "0.85rem",
                               fontWeight: 600,
                             }}
                             onFocus={(e) => {
                               e.currentTarget.parentElement.style.borderColor = "#3b82f6";
                             }}
                             onBlur={(e) => {
                               e.currentTarget.parentElement.style.borderColor = "#cbd5e1";
                             }}
                           />
                         </div>
                      </div>
                      )}
                    </div>
                  ) : (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: isMobile ? "1fr" : (hasWorkingDaysContext ? "1fr 1fr 1fr" : "1fr 1fr"),
                        gap: "1px",
                        background: "#e2e8f0",
                        border: "1px solid #e2e8f0",
                        borderRadius: "12px",
                        overflow: "hidden",
                        marginBottom: "1.75rem",
                      }}
                    >
                      <div
                        style={{
                          padding: "0.85rem",
                          background: "#f8fafc",
                          textAlign: "left",
                        }}
                      >
                        <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "#000000", textTransform: "uppercase", display: "block", marginBottom: "4px", whiteSpace: "nowrap" }}>Our Fee</span>
                        <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "#10b981" }}>{fees.recommended || "—"}</span>
                      </div>
                      <div
                        style={{
                          padding: "0.85rem",
                          background: "#f8fafc",
                          textAlign: "left",
                        }}
                      >
                        <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "#000000", textTransform: "uppercase", display: "block", marginBottom: "4px", whiteSpace: "nowrap" }}>Market Fees</span>
                        <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "#000000", textDecoration: fees.market ? "line-through" : "none", textDecorationThickness: "2px" }}>
                          {fees.market ? getFormattedMarketAverage(fees.market) : "—"}
                        </span>
                      </div>
                      {hasWorkingDaysContext && (
                      <div
                        style={{
                          padding: "0.85rem",
                          background: "#f8fafc",
                          textAlign: "left",
                        }}
                      >
                        <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "#000000", textTransform: "uppercase", display: "block", marginBottom: "4px", whiteSpace: "nowrap" }}>Working Days</span>
                        <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "#10b981" }}>
                          {currentLeadForRequiredDocs?.workingDays ?? 2}
                        </span>
                      </div>
                      )}
                    </div>
                  )}

                   {/* -- Admin Management Bar -- */}
                  {isAdmin && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "10px",
                        padding: "1rem",
                        background: "#ffffff",
                        border: "1px solid #cbd5e1",
                        borderRadius: "12px",
                        marginBottom: "1.5rem",
                        color: "#000000",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <ShieldAlert size={16} color="#000000" style={{ flexShrink: 0 }} />
                        <span
                          style={{
                            fontSize: "0.8rem",
                            fontWeight: 700,
                            color: "#000000",
                          }}
                        >
                          Service Details
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: "8px" }}>
                        {isEditingService ? (
                          <>
                            <button
                              onClick={async () => {
                                const trimmedTitle = String(editedService?.title ?? "").trim();
                                if (!trimmedTitle) {
                                  toast.error("Please enter a service name");
                                  return;
                                }
                                try {
                                  const apiUrl = import.meta.env.VITE_API_URL;
                                  const token = JSON.parse(localStorage.getItem("user"))?.token;
                                  await axios.patch(`${apiUrl}/services/${selectedService._id}`, { ...editedService, title: trimmedTitle }, {
                                    headers: { Authorization: `Bearer ${token}` }
                                  });
                                  // Working days live on the lead (per client request), not the service catalog.
                                  if (currentLeadForRequiredDocs?._id) {
                                    const parsedDays = parseInt(editedWorkingDays, 10);
                                    if (Number.isFinite(parsedDays) && parsedDays > 0) {
                                      await axios.patch(`${apiUrl}/leads/${currentLeadForRequiredDocs._id}`, { workingDays: parsedDays }, {
                                        headers: { Authorization: `Bearer ${token}` }
                                      });
                                    }
                                  }
                                  toast.success("Service updated successfully");
                                  // Store the edited our fee override for immediate display
                                  setOverriddenOurFees(prev => ({
                                    ...prev,
                                    [selectedService?._id || selectedService?.id]: (() => {
                                      const fee = parseFeeAmount(editedService?.recommendedFees);
                                      return fee ? `Rs. ${Number(fee).toLocaleString("en-IN")}` : null;
                                    })()
                                  }));
                                  setIsEditingService(false);
                                  setSelectedService({ ...selectedService, ...editedService, title: trimmedTitle });
                                  // Refresh all services
                                  const refreshRes = await axios.get(`${apiUrl}/services`);
                                  setAllDbServices(refreshRes.data);
                                  await refreshUserLeadsList();
                                } catch (err) {
                                  console.error("Update service error:", err.response?.data || err.message);
                                  toast.error(err.response?.data?.message || "Failed to update service");
                                }
                              }}
                              style={{ padding: "6px 14px", background: "#10b981", border: "none", color: "#fff", borderRadius: "8px", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer" }}
                            >
                              Save
                            </button>
                            <button
                              onClick={() => {
                                setIsEditingService(false);
                                setOurFeeInputValue("");
                              }}
                              style={{ padding: "6px 14px", background: "transparent", border: "1px solid #10b981", color: "#10b981", borderRadius: "8px", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer" }}
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => {
                                const sid = selectedService?._id || selectedService?.id;
                                const overriddenFee = overriddenOurFees[sid];
                                const displayFee = overriddenFee || selectedService.recommendedFees || "Rs. 1";
                                setEditedService({ ...selectedService, recommendedFees: displayFee });
                                const parsed = parseFeeAmount(displayFee);
                                setOurFeeInputValue(parsed ? formatOnlyDigits(String(parsed)) : "1");
                                setEditedWorkingDays(currentLeadForRequiredDocs?.workingDays ?? 2);
                                setIsEditingService(true);
                              }}
                              style={{ padding: "6px 14px", background: "#10b981", border: "none", color: "#fff", borderRadius: "8px", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer" }}
                            >
                              Edit
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {
                    <div
                      style={{
                        background: "#ffffff",
                        border: "1px solid #e2e8f0",
                        borderRadius: "14px",
                        padding: isMobile ? "1rem" : "1.25rem",
                        marginBottom: "1rem",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          justifyContent: "space-between",
                          gap: "1rem",
                          marginBottom: "0.75rem",
                        }}
                      >
                        <div
                          style={{
                            fontSize: isMobile ? "0.8rem" : "0.9rem",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                            color: "#0f172a",
                          }}
                        >
                          About This Service
                        </div>
                        {isAdmin && !isEditingAbout && (
                          <button
                            onClick={() => {
                              setEditedAbout(selectedService.aboutInfo || selectedService.description || "");
                              setIsEditingAbout(true);
                            }}
                            style={{
                              padding: "6px 12px",
                              background: "#3b82f6",
                              border: "none",
                              color: "#fff",
                              borderRadius: "8px",
                              fontSize: "0.72rem",
                              fontWeight: 700,
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                              flexShrink: 0,
                            }}
                          >
                            <Edit size={12} /> Edit Info
                          </button>
                        )}
                      </div>

                      {isEditingAbout ? (
                        <>
                          <textarea
                            value={editedAbout}
                            onChange={(e) => setEditedAbout(e.target.value)}
                            rows={6}
                            placeholder="Describe this service..."
                            style={{
                              width: "100%",
                              padding: "0.75rem",
                              border: "1px solid #cbd5e1",
                              borderRadius: "10px",
                              fontSize: "0.85rem",
                              color: "#0f172a",
                              resize: "vertical",
                              outline: "none",
                              fontFamily: "inherit",
                              lineHeight: 1.6,
                              boxSizing: "border-box",
                            }}
                          />
                          <div style={{ display: "flex", gap: "8px", marginTop: "0.75rem", justifyContent: "flex-end" }}>
                            <button
                              onClick={() => {
                                setIsEditingAbout(false);
                                setEditedAbout("");
                              }}
                              style={{ padding: "6px 14px", background: "transparent", border: "1px solid #10b981", color: "#10b981", borderRadius: "8px", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer" }}
                            >
                              Cancel
                            </button>
                            <button
                              onClick={async () => {
                                const trimmedDesc = String(editedAbout || "").trim();
                                if (!trimmedDesc) {
                                  toast.error("Please enter service information");
                                  return;
                                }
                                try {
                                  const apiUrl = import.meta.env.VITE_API_URL;
                                  const token = JSON.parse(localStorage.getItem("user"))?.token;
                                  await axios.patch(`${apiUrl}/services/${selectedService._id}`, { aboutInfo: trimmedDesc }, {
                                    headers: { Authorization: `Bearer ${token}` }
                                  });
                                  toast.success("Service info updated successfully");
                                  setIsEditingAbout(false);
                                  setSelectedService({ ...selectedService, aboutInfo: trimmedDesc });
                                  const refreshRes = await axios.get(`${apiUrl}/services`);
                                  setAllDbServices(refreshRes.data);
                                } catch (err) {
                                  console.error("Update service info error:", err.response?.data || err.message);
                                  toast.error(err.response?.data?.message || "Failed to update service info");
                                }
                              }}
                              style={{ padding: "6px 14px", background: "#10b981", border: "none", color: "#fff", borderRadius: "8px", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer" }}
                            >
                              Save
                            </button>
                          </div>
                        </>
                      ) : (
                        <p
                          style={{
                            margin: 0,
                            fontSize: isMobile ? "0.85rem" : "0.9rem",
                            lineHeight: 1.6,
                            color: "#334155",
                            whiteSpace: "pre-wrap",
                          }}
                        >
                          {selectedService.aboutInfo || selectedService.description || "No information available for this service yet."}
                        </p>
                      )}
                    </div>
                  }

                  {!isUserRole && leadsForThisService.length > 1 && (
                    <div
                      style={{
                        background: "#ffffff",
                        border: "1px solid #e2e8f0",
                        borderRadius: "14px",
                        padding: isMobile ? "1rem" : "1.25rem",
                        marginBottom: "1rem",
                      }}
                    >
                      <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#0f172a", marginBottom: 8 }}>
                        Documents Required apply to
                      </label>
                      <select
                        value={currentLeadForRequiredDocs?._id || ""}
                        onChange={(e) => setSelectedDocsLeadId(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "0.6rem 0.75rem",
                          borderRadius: 10,
                          border: "1px solid #cbd5e1",
                          background: "#fff",
                          color: "#0f172a",
                          fontSize: "0.85rem",
                          fontWeight: 600,
                        }}
                      >
                        {leadsForThisService.map((l) => (
                          <option key={l._id} value={l._id}>
                            {(l.name || l.email || "Unknown user")}{l.email ? ` (${l.email})` : ""}
                          </option>
                        ))}
                      </select>
                      <p style={{ fontSize: "0.72rem", color: "#94a3b8", margin: "6px 0 0" }}>
                        Multiple users have this service. Pick the specific user before adding or removing a required document — changes only apply to the selected user.
                      </p>
                    </div>
                  )}

                  {(() => {
                    const currentLead = currentLeadForRequiredDocs;
                    const docRows = adminRequiredDocRows;
                    // Admin manages the service-level list even without a lead, so
                    // only bail out for the client (who needs a lead to upload) or
                    // when there are genuinely no required documents to show.
                    if (isUserRole && !currentLead) return null;
                    if (docRows.length === 0) return null;
                    // The editable name list is the one being displayed (service-level
                    // for admin, lead-level for the client).
                    const requiredNames = docRows.map((r) => r.name);

                    return (
                      <div
                        style={{
                          background: "#ffffff",
                          border: "1px solid #e2e8f0",
                          borderRadius: "14px",
                          padding: isMobile ? "1rem" : "1.25rem",
                          marginBottom: "1rem",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", marginBottom: "0.35rem" }}>
                          <div
                            style={{
                              fontSize: isMobile ? "0.8rem" : "0.9rem",
                              fontWeight: 700,
                              textTransform: "uppercase",
                              letterSpacing: "0.05em",
                              color: "#0f172a",
                            }}
                          >
                            Documents Required
                          </div>
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => {
                                setIsAddingServiceRequiredDoc((prev) => !prev);
                                setNewServiceRequiredDocName("");
                              }}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                                padding: "5px 10px",
                                background: isAddingServiceRequiredDoc ? "#0f172a" : "#3b82f6",
                                border: "none",
                                color: "#fff",
                                borderRadius: "8px",
                                fontSize: "0.72rem",
                                fontWeight: 700,
                                cursor: "pointer",
                                flexShrink: 0,
                              }}
                            >
                              {isAddingServiceRequiredDoc ? "Cancel" : (<><Upload size={12} /> Add New Document</>)}
                            </button>
                          )}
                        </div>
                        {isUserRole && (
                          <p style={{ fontSize: "0.75rem", color: "#94a3b8", margin: "0 0 0.75rem" }}>
                            Note: only PDF documents are accepted.
                          </p>
                        )}

                        {isAdmin && isAddingServiceRequiredDoc && (
                          <div
                            style={{
                              background: "#f8fafc",
                              border: "1px solid #e2e8f0",
                              borderRadius: "10px",
                              padding: "0.75rem",
                              marginBottom: "0.75rem",
                              display: "flex",
                              gap: 8,
                            }}
                          >
                            <input
                              type="text"
                              value={newServiceRequiredDocName}
                              onChange={(e) => setNewServiceRequiredDocName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  handleAddServiceRequiredDoc(selectedService, currentLead, requiredNames, newServiceRequiredDocName);
                                  setIsAddingServiceRequiredDoc(false);
                                }
                              }}
                              placeholder="e.g. Bank Statement"
                              autoFocus
                              style={{
                                flex: 1,
                                padding: "0.5rem 0.75rem",
                                borderRadius: 8,
                                border: "1px solid #cbd5e1",
                                background: "#fff",
                                color: "#0f172a",
                                outline: "none",
                                fontSize: "0.8rem",
                              }}
                            />
                            <button
                              type="button"
                              disabled={isSavingServiceRequiredDocs || !newServiceRequiredDocName.trim()}
                              onClick={() => {
                                handleAddServiceRequiredDoc(selectedService, currentLead, requiredNames, newServiceRequiredDocName);
                                setIsAddingServiceRequiredDoc(false);
                              }}
                              style={{
                                padding: "0.5rem 0.9rem",
                                borderRadius: 8,
                                border: "none",
                                background: !newServiceRequiredDocName.trim() ? "#e5e7eb" : "#0f172a",
                                color: !newServiceRequiredDocName.trim() ? "#9ca3af" : "#fff",
                                fontWeight: 700,
                                fontSize: "0.78rem",
                                cursor: !newServiceRequiredDocName.trim() ? "not-allowed" : "pointer",
                              }}
                            >
                              Add
                            </button>
                          </div>
                        )}

                        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                          {docRows.map((row) => {
                            const inputId = `required-doc-upload-${row.key}`;
                            const isUploading = uploadingDocKey === row.name;
                            const isEditingThisRow = editingServiceDocRowKey === row.key;
                            return (
                              <div
                                key={row.key}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  gap: "0.75rem",
                                  padding: "0.65rem 0.85rem",
                                  background: "#f8fafc",
                                  border: "1px solid #e2e8f0",
                                  borderRadius: "10px",
                                }}
                              >
                                {isEditingThisRow ? (
                                  <input
                                    type="text"
                                    value={editingServiceDocRowValue}
                                    autoFocus
                                    onChange={(e) => setEditingServiceDocRowValue(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        e.preventDefault();
                                        handleRenameServiceRequiredDoc(selectedService, currentLead, requiredNames, row.name, editingServiceDocRowValue);
                                      } else if (e.key === "Escape") {
                                        setEditingServiceDocRowKey(null);
                                      }
                                    }}
                                    style={{
                                      flex: 1,
                                      padding: "0.4rem 0.6rem",
                                      borderRadius: 8,
                                      border: "1px solid #cbd5e1",
                                      background: "#fff",
                                      color: "#0f172a",
                                      outline: "none",
                                      fontSize: "0.85rem",
                                    }}
                                  />
                                ) : (
                                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                    <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#0f172a" }}>{row.name}</span>
                                    {row.rejected && (
                                      <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#ef4444" }}>
                                        Rejected by {row.rejectedBy || "PR"} - please reupload
                                      </span>
                                    )}
                                  </div>
                                )}
                                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                                  {isUserRole && (
                                    <>
                                      <input
                                        id={inputId}
                                        type="file"
                                        accept="application/pdf,.pdf"
                                        multiple
                                        style={{ display: "none" }}
                                        onChange={(e) => {
                                          const files = e.target.files;
                                          if (currentLead?._id) handleRequiredDocumentUpload(currentLead._id, row.name, files);
                                          e.target.value = "";
                                        }}
                                      />
                                      <button
                                        type="button"
                                        disabled={isUploading}
                                        onClick={() => document.getElementById(inputId)?.click()}
                                        style={
                                          row.rejected
                                            ? {
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "6px",
                                                padding: "6px 12px",
                                                background: isUploading ? "#94a3b8" : "#ef4444",
                                                border: "none",
                                                color: "#fff",
                                                borderRadius: "8px",
                                                fontSize: "0.75rem",
                                                fontWeight: 700,
                                                cursor: isUploading ? "not-allowed" : "pointer",
                                              }
                                            : row.uploaded
                                            ? {
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "6px",
                                                padding: "6px 12px",
                                                background: "#fff",
                                                border: "1px solid #16a34a",
                                                color: isUploading ? "#94a3b8" : "#16a34a",
                                                borderRadius: "8px",
                                                fontSize: "0.75rem",
                                                fontWeight: 700,
                                                cursor: isUploading ? "not-allowed" : "pointer",
                                              }
                                            : {
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "6px",
                                                padding: "6px 12px",
                                                background: isUploading ? "#94a3b8" : "#16a34a",
                                                border: "none",
                                                color: "#fff",
                                                borderRadius: "8px",
                                                fontSize: "0.75rem",
                                                fontWeight: 700,
                                                cursor: isUploading ? "not-allowed" : "pointer",
                                              }
                                        }
                                      >
                                        {isUploading ? (
                                          <Loader2 size={12} className="animate-spin" />
                                        ) : row.rejected ? (
                                          <RefreshCw size={12} />
                                        ) : row.uploaded ? (
                                          <RefreshCw size={12} />
                                        ) : (
                                          <Upload size={12} />
                                        )}
                                        {isUploading ? "Uploading..." : row.rejected ? "Reupload" : row.uploaded ? "Change" : "Upload"}
                                      </button>
                                    </>
                                  )}
                                  {isAdmin && (
                                    isEditingThisRow ? (
                                      <>
                                        <button
                                          type="button"
                                          disabled={isSavingServiceRequiredDocs}
                                          onClick={() => handleRenameServiceRequiredDoc(selectedService, currentLead, requiredNames, row.name, editingServiceDocRowValue)}
                                          style={{ display: "flex", alignItems: "center", padding: "6px 10px", background: "#16a34a", border: "none", color: "#fff", borderRadius: "8px", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer" }}
                                        >
                                          <Check size={12} />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setEditingServiceDocRowKey(null)}
                                          style={{ display: "flex", alignItems: "center", padding: "6px 10px", background: "#fff", border: "1px solid #cbd5e1", color: "#64748b", borderRadius: "8px", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer" }}
                                        >
                                          <X size={12} />
                                        </button>
                                      </>
                                    ) : (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setEditingServiceDocRowKey(row.key);
                                            setEditingServiceDocRowValue(row.name);
                                          }}
                                          style={{ display: "flex", alignItems: "center", padding: "6px 10px", background: "#fff", border: "1px solid #3b82f6", color: "#3b82f6", borderRadius: "8px", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer" }}
                                        >
                                          <Edit size={12} />
                                        </button>
                                        <button
                                          type="button"
                                          disabled={isSavingServiceRequiredDocs}
                                          onClick={() => handleRemoveServiceRequiredDoc(selectedService, currentLead, requiredNames, row.name)}
                                          style={{ display: "flex", alignItems: "center", padding: "6px 10px", background: "#fff", border: "1px solid #ef4444", color: "#ef4444", borderRadius: "8px", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer" }}
                                        >
                                          <Trash2 size={12} />
                                        </button>
                                      </>
                                    )
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  {showPaymentConfirmationContainer && (() => {
                    const leadId = currentLeadForRequiredDocs?._id;
                    const isPaid = currentLeadForRequiredDocs?.paymentStatus === "Paid";
                    const isPaying = payingLeadId === leadId;
                    const toggleOn = !!paymentConfirmedByLead[leadId];

                    return (
                      <div
                        style={{
                          background: "#ffffff",
                          border: "1px solid #e2e8f0",
                          borderRadius: "14px",
                          padding: isMobile ? "1rem" : "1.25rem",
                          marginBottom: "1rem",
                        }}
                      >
                        <div style={{ fontSize: isMobile ? "0.8rem" : "0.9rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#0f172a", marginBottom: 6 }}>
                          Payment Confirmation
                        </div>
                        <p style={{ fontSize: "0.8rem", color: "#64748b", marginBottom: 14 }}>
                          Complete the service fee payment, then confirm below to enable submission.
                        </p>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                          <button
                            type="button"
                            disabled={isPaid || isPaying || !leadId}
                            onClick={() => {
                              setPayingLeadId(leadId);
                              payForLead(
                                leadId,
                                { name: storedUser?.name, email: storedUser?.email },
                                {
                                  onSuccess: async () => {
                                    await refreshUserLeadsList();
                                    setPaymentConfirmedByLead((prev) => ({ ...prev, [leadId]: true }));
                                    setPayingLeadId(null);
                                  },
                                  onFailure: () => setPayingLeadId(null),
                                },
                              );
                            }}
                            style={{
                              padding: "0.65rem 1.2rem",
                              borderRadius: 10,
                              border: "none",
                              background: isPaid ? "#e5e7eb" : "#0f172a",
                              color: isPaid ? "#6b7280" : "#fff",
                              fontWeight: 700,
                              fontSize: "0.85rem",
                              cursor: isPaid || isPaying ? "not-allowed" : "pointer",
                            }}
                          >
                            {isPaid ? "Payment Completed" : isPaying ? "Processing..." : "Make Payment"}
                          </button>

                          <div style={{ display: "flex", alignItems: "center", gap: 10, opacity: isPaid ? 1 : 0.5 }}>
                            <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#0f172a" }}>Confirm Payment</span>
                            <div
                              role="switch"
                              aria-checked={toggleOn}
                              onClick={() => {
                                if (!isPaid || !leadId) return;
                                setPaymentConfirmedByLead((prev) => ({ ...prev, [leadId]: !prev[leadId] }));
                              }}
                              style={{
                                width: 42,
                                height: 24,
                                borderRadius: 999,
                                position: "relative",
                                background: toggleOn ? "#16a34a" : "#cbd5e1",
                                cursor: isPaid ? "pointer" : "not-allowed",
                                transition: "background 0.2s",
                                flexShrink: 0,
                              }}
                            >
                              <div
                                style={{
                                  position: "absolute",
                                  top: 2,
                                  left: toggleOn ? 20 : 2,
                                  width: 20,
                                  height: 20,
                                  borderRadius: "50%",
                                  background: "#fff",
                                  transition: "left 0.2s",
                                  boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                </div>

                {/* -- STICKY FOOTER -- */}
                {(!storedUser?.role || storedUser?.role === "user") && (
                  <div
                    style={{
                      padding: isMobile ? "0.75rem 1.25rem" : "0.85rem 2rem",
                      borderTop: `1px solid ${isLightMode ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.06)"}`,
                      background: isLightMode ? "#f8fafc" : "rgba(255,255,255,0.015)",
                      flexShrink: 0,
                      display: "flex",
                      justifyContent: isMobile ? "space-between" : "flex-end",
                      gap: "12px",
                    }}
                  >
                    <button
                      onClick={() => setSelectedService(null)}
                      style={{
                        flex: isMobile ? 1 : "none",
                        minWidth: isMobile ? "0" : "140px",
                        padding: isMobile ? "0.8rem" : "0.75rem 2rem",
                        background: "#64748b",
                        color: "#fff",
                        border: "none",
                        borderRadius: "12px",
                        fontWeight: 700,
                        fontSize: "0.88rem",
                        cursor: "pointer",
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#475569";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "#64748b";
                      }}
                    >
                      Cancel
                    </button>
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
                          // All admin-requested documents are uploaded and the lead is still
                          // sitting in the admin-only "Open" stage — this stays Open/admin-only
                          // (not forwarded to PR); it just now displays as "Admin Reviewing".
                          const isReadyForReviewSubmit =
                            String(existingLead?.status || "").trim() === "Open" &&
                            adminRequiredDocRows.length > 0 &&
                            allAdminRequiredDocsUploaded;
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
                            const isServiceRejected = ["rejected", "informationrequired"].includes(String(existingLead.status || "").toLowerCase());
                            const rejectedDocNames = new Set(
                              (existingLead.documents || []).filter((d) => d?.status === "Rejected").map((d) => String(d?.name || "").trim())
                            );
                            const reuploadedDocumentNames = Object.keys(localUploadsForService).filter((n) => rejectedDocNames.has(String(n || "").trim()));

                            const patchPayload = {
                              reuploadedDocumentNames,
                              // Marks this exact set of admin-required documents as confirmed —
                              // the Submit button stays disabled afterwards until a new
                              // upload/reupload resets this flag back to false.
                              ...(adminRequiredDocRows.length > 0 ? { initialSubmissionConfirmed: true } : {}),
                              // If it was rejected (by PR or Executor), move back to PendingReview.
                              // This only runs on an explicit Submit click — reuploading individual
                              // documents earlier never advances the status on its own.
                              ...(isServiceRejected ? {
                                status: "PendingReview",
                                executorMessage: "",
                                prFeedback: "",
                                adminMessage: "",
                                executorServiceRejected: false,
                                prNotifiedClientServiceRejection: false,
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
                                recommendedFees: String(selectedService?.recommendedFees || "").trim(),
                                marketFees: String(selectedService?.marketFees || "").trim(),
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
                          toast.success(
                            !existingLead?._id
                              ? "Interest recorded! Check your dashboard for updates."
                              : isReadyForReviewSubmit
                                ? "Documents submitted to Admin"
                                : "Documents resubmitted for PR review.",
                            { id: "service-confirmation" },
                          );
                          setSelectedService(null);
                          navigate("/dashboard");
                        } catch (error) {
                          toast.error("Submission failed. Try again later.");
                        } finally {
                          setIsSubmitting(false);
                        }
                      }}
                      disabled={isConfirmDisabled}
                      style={{
                        flex: isMobile ? 1 : "none",
                        minWidth: isMobile ? "0" : "140px",
                        padding: isMobile ? "0.85rem" : "0.75rem 2rem",
                        background: !isConfirmDisabled
                          ? "linear-gradient(135deg, #059669, #10b981)"
                          : "#f8fafc",
                        color: !isConfirmDisabled ? "#fff" : "#64748b",
                        border: `1px solid ${!isConfirmDisabled ? "transparent" : "#e2e8f0"}`,
                        borderRadius: "12px",
                        fontWeight: 700,
                        fontSize: "0.88rem",
                        cursor: isConfirmDisabled ? "not-allowed" : "pointer",
                        transition: "all 0.3s",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px",
                        boxShadow: !isConfirmDisabled ? "0 4px 20px rgba(16,185,129,0.3)" : "none",
                        letterSpacing: "-0.01em",
                      }}
                      onMouseEnter={(e) => {
                        if (!isConfirmDisabled) e.currentTarget.style.transform = "translateY(-1px)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "none";
                      }}
                    >
                      {isSubmitting ? (
                        <><Loader2 size={16} className="animate-spin" /> Submitting...</>
                      ) : adminRequiredDocRows.length > 0 && hasRejectedRequiredDocs ? (
                        <>Reupload Rejected Documents</>
                      ) : !isComplete || (adminRequiredDocRows.length > 0 && !allAdminRequiredDocsUploaded) ? (
                        <>Upload Required Files to Submit</>
                      ) : (() => {
                        const existingLead = getLatestLeadForService(selectedService.title);
                        if (!existingLead?._id) {
                          return <>Confirm & Submit <ArrowRight size={16} /></>;
                        }
                        if (adminRequiredDocRows.length > 0) {
                          const existingLeadStatus = String(existingLead.status || "").trim().toLowerCase();
                          // By this point hasRejectedRequiredDocs is already false (that case is
                          // handled by the earlier "Reupload Rejected Documents" branch), so a
                          // lead still sitting in "Rejected"/"InformationRequired" here means every
                          // required document has just been reuploaded but the user hasn't
                          // explicitly resubmitted yet — show "Submit", not "Submitted".
                          const needsExplicitSubmit =
                            (existingLeadStatus === "open" && !existingLead?.initialSubmissionConfirmed) ||
                            existingLeadStatus === "rejected" ||
                            existingLeadStatus === "informationrequired";
                          return needsExplicitSubmit
                            ? <>Submit <ArrowRight size={16} /></>
                            : <>Submitted <ArrowRight size={16} /></>;
                        }
                        const localUploadsForService = uploadedDocs[selectedService.title] || {};
                        const hasLocalReupload = Object.keys(localUploadsForService).length > 0;
                        if (!hasLocalReupload) {
                          return <>Submitted <ArrowRight size={16} /></>;
                        }
                        return <>Confirm & Submit <ArrowRight size={16} /></>;
                      })()}
                    </button>
                  </div>
                )}
              </motion.div>
            </motion.div>

          </>,
            document.body
          );
        })()}

      <ConfirmationModal
        isOpen={isServiceDeleteConfirmOpen}
        title="Delete Service"
        message={`Are you sure you want to delete "${serviceToDelete?.title}"? This will permanently remove the service and all its data from the system. This action cannot be undone.`}
        onConfirm={() => handleDeleteService(serviceToDelete)}
        onCancel={() => {
          setIsServiceDeleteConfirmOpen(false);
          setServiceToDelete(null);
        }}
        isLoading={isServiceDeleting}
      />

      {/* -- Add Service Modal -- */}
      {isAddingService && (
        <>
          <div
            onClick={() => setIsAddingService(false)}
            style={{
              position: "fixed",
              top: 0, left: 0, right: 0, bottom: 0,
              background: "rgba(17,24,39,0.45)",
              zIndex: 99999,
              backdropFilter: "blur(8px)",
            }}
          />
          <div
            style={{
              position: "fixed",
              top: 0, left: 0, right: 0, bottom: 0,
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "center",
              zIndex: 100000,
              pointerEvents: "none",
              padding: "20vh 16px 16px",
            }}
          >
            <div
              style={{
                width: "520px",
                maxWidth: "100%",
                maxHeight: "75vh",
                overflow: "hidden",
                pointerEvents: "auto",
                background: "#ffffff",
                borderRadius: "24px",
                border: "1px solid rgba(17,24,39,0.08)",
                boxShadow: "0 25px 50px -12px rgba(0,0,0,0.15)",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div style={{ padding: "24px 28px 0" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "#111111", letterSpacing: "-0.02em" }}>
                  Add New Service
                </h2>
                <button
                  onClick={() => setIsAddingService(false)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", padding: "4px" }}
                >
                  <X size={20} />
                </button>
              </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "12px", overflowY: "auto", overscrollBehavior: "contain", flex: 1, padding: "0 28px 24px", scrollbarWidth: "thin" }}>
                <div>
                  <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#475569", display: "block", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                     Service Name <span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={newServiceForm.title}
                    onChange={(e) => setNewServiceForm({ ...newServiceForm, title: e.target.value })}
                    placeholder="e.g. GST Registration"
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      border: "1px solid #cbd5e1",
                      borderRadius: "10px",
                      fontSize: "0.85rem",
                      color: "#000000",
                      outline: "none",
                      background: "#f8fafc",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#475569", display: "block", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                     Description <span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span>
                  </label>
                  <textarea
                    value={newServiceForm.description}
                    onChange={(e) => setNewServiceForm({ ...newServiceForm, description: e.target.value })}
                    placeholder="Describe the service..."
                    rows={2}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      border: "1px solid #cbd5e1",
                      borderRadius: "10px",
                      fontSize: "0.85rem",
                      color: "#000000",
                      outline: "none",
                      background: "#f8fafc",
                      resize: "vertical",
                      fontFamily: "inherit",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#475569", display: "block", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                     About The Service <span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span>
                  </label>
                  <textarea
                    value={newServiceForm.aboutInfo}
                    onChange={(e) => setNewServiceForm({ ...newServiceForm, aboutInfo: e.target.value })}
                    placeholder="Detailed information shown in the About The Service tab (e.g. process, eligibility, benefits)..."
                    rows={3}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      border: "1px solid #cbd5e1",
                      borderRadius: "10px",
                      fontSize: "0.85rem",
                      color: "#000000",
                      outline: "none",
                      background: "#f8fafc",
                      resize: "vertical",
                      fontFamily: "inherit",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#475569", display: "block", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                       Our Fee (Rs.) <span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={getOnlyDigitsAndCommas(newServiceForm.recommendedFees ? `Rs. ${newServiceForm.recommendedFees}` : "")}
                      onChange={(e) => {
                        const formatted = formatOnlyDigits(e.target.value);
                        setNewServiceForm({ ...newServiceForm, recommendedFees: formatted });
                      }}
                      placeholder="0"
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        border: "1px solid #cbd5e1",
                        borderRadius: "10px",
                        fontSize: "0.85rem",
                        color: "#000000",
                        outline: "none",
                        background: "#f8fafc",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#475569", display: "block", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                       Market Fees (Rs.) <span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={getOnlyDigitsAndCommas(newServiceForm.marketFees ? `Rs. ${newServiceForm.marketFees}` : "")}
                      onChange={(e) => {
                        const formatted = formatOnlyDigits(e.target.value);
                        setNewServiceForm({ ...newServiceForm, marketFees: formatted });
                      }}
                      placeholder="0"
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        border: "1px solid #cbd5e1",
                        borderRadius: "10px",
                        fontSize: "0.85rem",
                        color: "#000000",
                        outline: "none",
                        background: "#f8fafc",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                </div>

              </div>
              <div style={{ padding: "12px 28px 12px", borderTop: "1px solid #e2e8f0" }}>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  onClick={() => { setIsAddingService(false); }}
                  style={{
                    padding: "10px 22px",
                    borderRadius: "12px",
                    border: "1px solid rgba(17,24,39,0.08)",
                    background: "#f9fafb",
                    color: "#111111",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: 700,
                  }}
                >
                  Cancel
                </button>
                {(() => {
                  const isFormValid =
                    newServiceForm.title.trim() &&
                    newServiceForm.description.trim() &&
                    newServiceForm.aboutInfo.trim() &&
                    newServiceForm.recommendedFees.trim() &&
                    newServiceForm.marketFees.trim();

                  return (
                    <button
                      onClick={handleCreateService}
                      disabled={!isFormValid}
                      style={{
                        padding: "10px 22px",
                        borderRadius: "12px",
                        border: "none",
                        background: isFormValid ? "#10b981" : "#94a3b8",
                        color: "#ffffff",
                        cursor: isFormValid ? "pointer" : "not-allowed",
                        fontSize: "14px",
                        fontWeight: 800,
                        boxShadow: isFormValid ? "0 4px 12px rgba(16,185,129,0.25)" : "none",
                        opacity: isFormValid ? 1 : 0.4,
                      }}
                    >
                      Add Service
                    </button>
                  );
                })()}
              </div>
              </div>
            </div>
          </div>
        </>
      )}

    </div>
  );
};

export default Recommendations;




