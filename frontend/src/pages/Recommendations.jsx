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
} from "lucide-react";
import { toast } from "react-hot-toast";

const iconMap = {
  Finance: BarChart3,
  Compliance: Shield,
  Advisory: Zap,
  Tax: FileCheck,
  Legal: Building,
};

const categoryColors = {
  Finance: { color: "#4361ee", bg: "rgba(67,97,238,0.08)" },
  Compliance: { color: "#10b981", bg: "rgba(16,185,129,0.08)" },
  Advisory: { color: "#f72585", bg: "rgba(247,37,133,0.08)" },
  Tax: { color: "#7c3aed", bg: "rgba(124,58,237,0.08)" },
  Legal: { color: "#f59e0b", bg: "rgba(245,158,11,0.08)" },
};

const DOCUMENTS_REGISTRY = {
  common: [
    { name: "PAN Card", required: true, desc: "Copy of PAN card" },
    { name: "Aadhaar Card", required: true, desc: "Copy of Aadhaar card" },
    {
      name: "Bank Statements",
      required: true,
      desc: "All bank account statements for the financial year (April – March)",
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
      desc: "Issued by employer – mandatory for salaried individuals",
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
      desc: "Needed if HRA exemption claimed (landlord PAN required if rent > ₹1L/year)",
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
      desc: "Form 16A for winnings above ₹10,000",
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
    id: "virtual-cfo",
    title: "Virtual CFO Service",
    description:
      "Digitally manage your financial reporting task. Designed to support fundamental decision making.",
    category: "Finance",
    trigger: "Virtual CFO",
  },
  {
    id: "company-incorporation",
    title: "Company Incorporation",
    description:
      "Incorporation of Private Limited, Public Limited, OPC, or LLP with MCA compliance.",
    category: "Legal",
    trigger: "Registration",
  },
];

/* ══════════════════════════════════════════════════
   PREMIUM CARD  – 3D tilt + glow (reused from Admin)
══════════════════════════════════════════════════ */
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

/* ══════════════════════════════════════════════════
   ADMIN SERVICES VIEW
══════════════════════════════════════════════════ */
const AdminServicesView = () => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLead, setSelectedLead] = useState(null);
  const [expandedUser, setExpandedUser] = useState(null);
  const [expandedServiceId, setExpandedServiceId] = useState(null);
  const navigate = useNavigate();

  const fetchLeads = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const response = await axios.get(`${apiUrl}/leads`);
      setLeads(response.data);
    } catch (error) {
      console.error("Error fetching leads:", error);
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
            "radial-gradient(circle at 50% 0%, rgba(34, 197, 94, 0.03) 0%, transparent 70%)",
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
            User Services <span style={{ color: "#22c55e" }}>.</span>
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
                background: "var(--bg-card)",
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
                background: "#22c55e",
                border: "none",
                color: "white",
                padding: "0.8rem 2rem",
                borderRadius: "18px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                fontWeight: 700,
                boxShadow: "0 4px 15px rgba(34, 197, 94, 0.2)",
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
                        ? "1px solid rgba(34, 197, 94, 0.3)"
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
                          background: "var(--dashboard-card-bg)",
                          border: "1px solid var(--dashboard-card-border)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "0.9rem",
                          fontWeight: 800,
                          color: "#22c55e",
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
                                  background: "var(--dashboard-row-bg)",
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
                                  <span
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "5px",
                                      fontSize: "0.68rem",
                                      fontWeight: 700,
                                      color:
                                        lead.status === "Completed"
                                          ? "#10b981"
                                          : lead.status === "InProgress"
                                            ? "#22c55e"
                                            : lead.status === "Rejected"
                                              ? "#ef4444"
                                              : "#f59e0b",
                                    }}
                                  >
                                    <span
                                      style={{
                                        width: "6px",
                                        height: "6px",
                                        borderRadius: "50%",
                                        background:
                                          lead.status === "Completed"
                                            ? "#10b981"
                                            : lead.status === "InProgress"
                                              ? "#22c55e"
                                              : lead.status === "Rejected"
                                                ? "#ef4444"
                                                : "#f59e0b",
                                      }}
                                    />
                                    {lead.status === "Open"
                                      ? "Pending"
                                      : lead.status === "InProgress"
                                        ? "Active"
                                        : lead.status}
                                  </span>
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
                                                window.open(doc.url, "_blank");
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
                background: "var(--secondary)",
                border: "1px solid rgba(34, 197, 94, 0.2)",
                position: "relative",
                padding: "1.5rem 2rem",
                borderRadius: "28px",
                boxShadow: "0 30px 60px rgba(0,0,0,0.5)",
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
                    background: "linear-gradient(135deg, #22c55e, #16a34a)",
                    margin: "0 auto 1rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.5rem",
                    fontWeight: 900,
                    color: "white",
                    boxShadow: "0 10px 25px rgba(34, 197, 94, 0.3)",
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
                        color: "#22c55e",
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
                    background: "rgba(16, 185, 129, 0.08)",
                    borderRadius: "16px",
                    border: "1px solid rgba(16, 185, 129, 0.15)",
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
                    color: "#22c55e",
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
                          background: "var(--dashboard-row-bg)",
                          borderRadius: "10px",
                          border: "1px solid var(--dashboard-card-border)",
                        }}
                      >
                        <FileText size={13} color="#10b981" />
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
                    background: "#22c55e",
                    border: "none",
                    color: "white",
                    borderRadius: "18px",
                    fontWeight: 800,
                    fontSize: "1rem",
                    cursor: "pointer",
                    boxShadow: "0 8px 24px rgba(34, 197, 94, 0.3)",
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
                    background: "#22c55e",
                    border: "none",
                    color: "white",
                    borderRadius: "18px",
                    fontWeight: 800,
                    fontSize: "1rem",
                    cursor: "pointer",
                    boxShadow: "0 8px 24px rgba(34, 197, 94, 0.3)",
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
                    background: "rgba(34, 197, 94, 0.08)",
                    border: "1px solid rgba(34, 197, 94, 0.2)",
                    color: "#22c55e",
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

/* ══════════════════════════════════════════════════
   MAIN RECOMMENDATIONS COMPONENT
══════════════════════════════════════════════════ */
/* ══════════════════════════════════════════════════
   HELPER COMPONENTS
   ══════════════════════════════════════════════════ */
const ServiceCard = ({
  service,
  idx,
  onClick,
  isLightMode = false,
  isMobile = false,
}) => {
  const cat = service.category || "Advisory";
  const config = categoryColors[cat] || categoryColors["Advisory"];
  const Icon = iconMap[cat] || Zap;

  return (
    <div
      key={idx}
      onClick={() => onClick(service)}
      style={{
        background: "var(--card-gradient)",
        borderRadius: isMobile ? "20px" : "24px",
        border: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        cursor: "pointer",
        height: "100%",
        transition: "all 0.2s ease",
        position: "relative",
        overflow: "hidden",
        minHeight: isMobile ? "unset" : "360px",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = isLightMode
          ? "rgba(0, 0, 0, 0.2)"
          : "rgba(255, 255, 255, 0.2)";
        e.currentTarget.style.transform = "translateY(-4px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = isLightMode
          ? "rgba(0, 0, 0, 0.1)"
          : "rgba(255, 255, 255, 0.08)";
        e.currentTarget.style.transform = "none";
      }}
    >
      <div
        style={{
          height: 4,
          background: isLightMode
            ? "rgba(0,0,0,0.08)"
            : "rgba(255,255,255,0.05)",
        }}
      />
      <div
        style={{
          padding: isMobile ? "1.25rem" : "1.8rem 2rem",
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: isMobile ? "0.8rem" : "1.2rem",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <div
            style={{
              width: isMobile ? 40 : 44,
              height: isMobile ? 40 : 44,
              borderRadius: "12px",
              background: isLightMode
                ? "rgba(0,0,0,0.06)"
                : "rgba(255,255,255,0.03)",
              border: isLightMode
                ? "1px solid rgba(0,0,0,0.12)"
                : "1px solid rgba(255,255,255,0.05)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon
              size={isMobile ? 18 : 20}
              color={isLightMode ? "#111111" : "white"}
            />
          </div>
          <span
            style={{
              background: isLightMode
                ? "rgba(0,0,0,0.06)"
                : "rgba(255,255,255,0.03)",
              border: isLightMode
                ? "1px solid rgba(0,0,0,0.12)"
                : "1px solid rgba(255,255,255,0.05)",
              color: isLightMode ? "#111111" : "rgba(255,255,255,0.6)",
              padding: "0.35rem 0.8rem",
              borderRadius: "99px",
              fontSize: isMobile ? "0.65rem" : "0.72rem",
              fontWeight: 800,
              letterSpacing: "0.04em",
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
              fontWeight: 750,
              color: isLightMode ? "#111111" : "var(--text)",
              marginBottom: "0.5rem",
              letterSpacing: "-0.01em",
            }}
          >
            {service.title}
          </h3>
          <p
            style={{
              color: isLightMode ? "#4b5563" : "var(--text-secondary)",
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
              color: isLightMode ? "#0f172a" : "#10b981",
              fontWeight: 700,
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
  );
};

const NoServicesFound = ({ onClear }) => (
  <div
    style={{
      textAlign: "center",
      padding: "4rem 1rem",
      background: "rgba(255,255,255,0.03)",
      borderRadius: "24px",
      border: "1px dashed rgba(255,255,255,0.1)",
    }}
  >
    <Search
      size={48}
      color="rgba(255,255,255,0.1)"
      style={{ marginBottom: "1rem" }}
    />
    <h3 style={{ fontSize: "1.2rem", color: "#fff", marginBottom: "0.5rem" }}>
      No services found
    </h3>
    <p style={{ color: "rgba(255,255,255,0.5)" }}>
      We couldn't find any services matching your search.
    </p>
    <button
      onClick={onClear}
      className="btn btn-primary"
      style={{
        marginTop: "1rem",
        background: "#4361ee",
        border: "none",
        borderRadius: "12px",
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
  }); // { [serviceTitle]: { [docName]: { name, url } } }
  const isAdmin = storedUser?.role === "admin";
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [isLightMode, setIsLightMode] = useState(() => {
    if (typeof document !== "undefined" && document.body) {
      return document.body.classList.contains("light-mode");
    }
    return localStorage.getItem("theme") === "light";
  });
  const mobileNavbarOffset = "calc(env(safe-area-inset-top, 0px) + 5.6rem)";

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

  const ALL_SERVICES =
    allDbServices.length > 0 ? allDbServices : FALLBACK_SERVICES;

  useEffect(() => {
    const fetchUserLeads = async () => {
      const userId = storedUser?._id || storedUser?.id;
      if (isLoggedIn && userId) {
        try {
          const apiUrl = import.meta.env.VITE_API_URL;
          const response = await axios.get(`${apiUrl}/leads?userId=${userId}`, {
            headers: { Authorization: `Bearer ${storedUser.token}` },
          });
          setUserLeads(response.data);
        } catch (error) {
          console.error("Error fetching user leads:", error);
        }
      }
    };
    fetchUserLeads();
  }, [isLoggedIn, storedUser?._id, storedUser?.id]);

  // If admin → render admin services view
  if (isAdmin) {
    return <AdminServicesView />;
  }

  // ── Section separator — clean, rule-based personalised service engine ───
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

  // ── TRIGGER → exact service title lookup ─────────────────────────────────
  // Broad category triggers (used when user picks from Have a Business checkboxes)
  const BROAD_TRIGGER_MAP = {
    "GST Compliance": [
      "GST Registration",
      "GSTR 1 & 3B Filing",
      "GST 2B Reconciliation",
      "GST Notice Management",
      "E-Way Bill & E-Invoicing",
      "GST Health Check",
    ],
    "Income Tax": [
      "ITR Filing (Individuals)",
      "TDS Payment & Returns",
      "IT Notice Management",
      "Refund Postponement/Reissue",
    ],
    "Virtual CFO": ["Virtual CFO Service", "Virtual Accountant"],
    Registration: [
      "Company Incorporation",
      "Startup Consulting",
      "Import & Export (IEC)",
    ],
    "Legal Advisory": [
      "MCA Annual Filings",
      "Legal & Secretarial Service",
      "Director & Professional Svc",
      "Share Transfer & ESOP",
    ],
    Payroll: [
      "EPF & ESI Management",
      "TDS (Payroll) Compliance",
      "Technical Service",
    ],
    // Focused startup flag — shows only the 3 most essential startup services
    startingBusiness: [
      "Company Incorporation",
      "Startup Consulting",
      "GST Registration",
    ],
  };

  // Granular flags set by specific Yes/No answers — these override the broad Income Tax mapping
  const GRANULAR_FLAG_MAP = {
    salaried: ["ITR Filing (Individuals)"],
    capitalGains: ["Capital Gains Tax Filing"],
    houseProperty: ["Rental & House Property ITR"],
    otherSources: ["ITR Filing (Individuals)"],
  };

  const broadTriggerMapLower = Object.fromEntries(
    Object.entries(BROAD_TRIGGER_MAP).map(([k, v]) => [k.toLowerCase(), v]),
  );
  const granularFlagMapLower = Object.fromEntries(
    Object.entries(GRANULAR_FLAG_MAP).map(([k, v]) => [k.toLowerCase(), v]),
  );
  const granularFlags = Object.keys(granularFlagMapLower);

  // Selected interests from onboarding options
  const normalizedNeeds = userNeeds
    .filter(Boolean)
    .map((need) => String(need).trim().toLowerCase());

  // Entered interests from text-based onboarding answers
  const interestText = [
    activeProfile.industry,
    activeProfile.businessStage,
    activeProfile.path,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const inferredNeedTokens = [];
  const keywordNeedMap = [
    { keyword: "capital gain", needs: ["income tax", "capitalgains"] },
    { keyword: "capital gains", needs: ["income tax", "capitalgains"] },
    { keyword: "income tax", needs: ["income tax"] },
    { keyword: "itr", needs: ["income tax"] },
    { keyword: "gst", needs: ["gst compliance"] },
    { keyword: "payroll", needs: ["payroll"] },
    { keyword: "epf", needs: ["payroll"] },
    { keyword: "esi", needs: ["payroll"] },
    { keyword: "cfo", needs: ["virtual cfo"] },
    { keyword: "account", needs: ["virtual cfo"] },
    { keyword: "legal", needs: ["legal advisory"] },
    { keyword: "mca", needs: ["legal advisory"] },
    { keyword: "registration", needs: ["registration"] },
    { keyword: "incorporation", needs: ["registration"] },
    { keyword: "startup", needs: ["startingbusiness"] },
    { keyword: "house property", needs: ["houseproperty"] },
    { keyword: "rental", needs: ["houseproperty"] },
    { keyword: "salary", needs: ["salaried"] },
  ];

  keywordNeedMap.forEach(({ keyword, needs }) => {
    if (interestText.includes(keyword)) {
      needs.forEach((need) => inferredNeedTokens.push(need));
    }
  });

  const allNeedTokens = [...normalizedNeeds, ...inferredNeedTokens];

  // If ANY granular income flag is present, broad income mapping is suppressed.
  const hasGranularIncomeFlags = allNeedTokens.some((n) =>
    granularFlags.includes(n),
  );

  const personalisedTitles = new Set();

  allNeedTokens.forEach((need) => {
    if (need === "income tax" && hasGranularIncomeFlags) {
      return;
    }
    const broadTitles = broadTriggerMapLower[need];
    if (broadTitles) {
      broadTitles.forEach((t) => personalisedTitles.add(t));
      return;
    }

    const granularTitles = granularFlagMapLower[need];
    if (granularTitles) {
      granularTitles.forEach((t) => personalisedTitles.add(t));
    }
  });

  ALL_SERVICES.forEach((service) => {
    const trigger = String(service.trigger || "")
      .trim()
      .toLowerCase();
    const title = String(service.title || "")
      .trim()
      .toLowerCase();
    if (allNeedTokens.includes(trigger) || allNeedTokens.includes(title)) {
      personalisedTitles.add(service.title);
    }
  });

  // Backfill granular flags from profile booleans if needs array is incomplete
  if (activeProfile.salaried) {
    GRANULAR_FLAG_MAP.salaried.forEach((title) =>
      personalisedTitles.add(title),
    );
  }
  if (activeProfile.capitalGains) {
    GRANULAR_FLAG_MAP.capitalGains.forEach((title) =>
      personalisedTitles.add(title),
    );
  }
  if (activeProfile.houseProperty) {
    GRANULAR_FLAG_MAP.houseProperty.forEach((title) =>
      personalisedTitles.add(title),
    );
  }
  if (activeProfile.otherSources) {
    GRANULAR_FLAG_MAP.otherSources.forEach((title) =>
      personalisedTitles.add(title),
    );
  }

  // Apply search filter
  const filterFn = (s) =>
    searchQuery.trim() === "" ||
    s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.category.toLowerCase().includes(searchQuery.toLowerCase());

  const personalisedServices = ALL_SERVICES.filter((s) =>
    personalisedTitles.has(s.title),
  );

  // Strict onboarding behavior: if profile exists, top section shows only profile-related services.
  // No fallback-to-generic inside personalised section for onboarded users.
  let myServices;
  if (searchQuery.trim() !== "") {
    myServices = ALL_SERVICES.filter(filterFn);
  } else if (hasOnboardingProfile) {
    myServices = personalisedServices;
  } else if (recommendations && recommendations.length > 0) {
    const recTitles = new Set(recommendations.map((r) => r.title));
    myServices = ALL_SERVICES.filter((s) => recTitles.has(s.title));
  } else {
    myServices = ALL_SERVICES.filter((s) =>
      [
        "ITR Filing (Individuals)",
        "GST Registration",
        "Virtual CFO Service",
        "Company Incorporation",
      ].includes(s.title),
    );
  }

  const myServiceTitles = new Set(myServices.map((s) => s.title));

  const isSearching = searchQuery.trim() !== "";

  // Everything else goes to "Other Services"
  const otherServices = isSearching
    ? ALL_SERVICES.filter((s) => !filterFn(s))
    : ALL_SERVICES.filter((s) => !myServiceTitles.has(s.title));

  const handleSearch = () => {
    // Searching is now handled dynamically as user types
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
                fontWeight: 600,
                letterSpacing: "0.05em",
                marginBottom: "1.2rem",
                color: "var(--text)",
              }}
            >
              {searchQuery.trim() !== "" ? (
                "Search Results"
              ) : userNeeds.length > 0 ? (
                <>
                  Your <span style={{ color: "#10b981" }}>Personalised</span>{" "}
                  Services
                </>
              ) : (
                <>
                  Your <span style={{ color: "#10b981" }}>Service Roadmap</span>
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
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  padding: "0.5rem 0.5rem 0.5rem 1.2rem",
                  borderRadius: "16px",
                }}
              >
                <Search size={18} color="var(--text-muted)" />
                <input
                  type="text"
                  placeholder="Search specific services..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--text)",
                    outline: "none",
                    width: "100%",
                    fontSize: "0.95rem",
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
                      color: isLightMode
                        ? "rgba(0,0,0,0.55)"
                        : "rgba(255,255,255,0.3)",
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
                    background: "#4361ee",
                    border: "none",
                    color: "white",
                    padding: "0.6rem 1.2rem",
                    borderRadius: "12px",
                    cursor: "pointer",
                    fontWeight: 700,
                    fontSize: "0.85rem",
                    transition: "all 0.2s",
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
            {myServices.length > 0 && (
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
                      fontWeight: 600,
                      color: "var(--text)",
                      margin: 0,
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {isSearching
                      ? "Matched Services"
                      : userNeeds.length > 0 || recommendations?.length > 0
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
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Other Services Section */}
            {otherServices.length > 0 && (
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
                      fontWeight: 600,
                      color: "var(--text)",
                      margin: 0,
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {isSearching
                      ? "Other Services (Not Matching)"
                      : "Other Services"}
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
                  {otherServices.map((service, idx) => (
                    <ServiceCard
                      key={`other-${idx}`}
                      service={service}
                      idx={idx}
                      onClick={setSelectedService}
                      isLightMode={isLightMode}
                      isMobile={isMobile}
                    />
                  ))}
                </div>
              </div>
            )}

            {myServices.length === 0 && otherServices.length === 0 && (
              <NoServicesFound onClear={() => setSearchQuery("")} />
            )}
          </div>
        </div>
      </section>



      {/* Service Detail Modal/Form */}
      <AnimatePresence>
        {selectedService && (
          <div
            className="rec-detail-modal"
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 2000,
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "center",
              padding: isMobile
                ? `${mobileNavbarOffset} 0.75rem max(0.75rem, env(safe-area-inset-bottom, 0px))`
                : "clamp(5.8rem, 9vh, 6.5rem) 1.5rem 1.5rem",
              background: "rgba(0,0,0,0.85)",
              backdropFilter: "blur(12px)",
              overflowY: "auto",
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="rec-modal-content"
              style={{
                background: "var(--modal-gradient)",
                width: "100%",
                maxWidth: "780px",
                maxHeight: isMobile
                  ? `calc(100vh - ${mobileNavbarOffset} - max(0.75rem, env(safe-area-inset-bottom, 0px)))`
                  : "calc(100vh - clamp(7.4rem, 12vh, 8.5rem))",
                borderRadius: isMobile ? "24px" : "32px",
                border: "1px solid var(--border)",
                overflow: "hidden",
                position: "relative",
                boxShadow: "0 40px 100px -12px rgba(0, 0, 0, 0.4)",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {/* Modal Header */}
              <div
                style={{
                  padding: isMobile ? "1.2rem 1.5rem" : "1.8rem 2.5rem",
                  borderBottom: "1px solid rgba(255,255,255,0.05)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: "rgba(255,255,255,0.01)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: isMobile ? "0.7rem" : "1rem",
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      padding: isMobile ? "4px 10px" : "8px 16px",
                      background: (
                        categoryColors[selectedService.category] ||
                        categoryColors["Advisory"]
                      ).bg,
                      color: (
                        categoryColors[selectedService.category] ||
                        categoryColors["Advisory"]
                      ).color,
                      borderRadius: "100px",
                      fontSize: isMobile ? "0.6rem" : "0.7rem",
                      fontWeight: 800,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    {selectedService.category}
                  </div>
                  <h2
                    style={{
                      fontSize: isMobile ? "1.1rem" : "1.4rem",
                      fontWeight: 750,
                      color: "var(--text)",
                      margin: 0,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {selectedService.title}
                  </h2>
                </div>
                <button
                  onClick={() => setSelectedService(null)}
                  style={{
                    background: isLightMode
                      ? "rgba(0,0,0,0.08)"
                      : "rgba(255,255,255,0.05)",
                    border: "none",
                    color: isLightMode ? "#111111" : "#fff",
                    cursor: "pointer",
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "0.2s",
                    flexShrink: 0,
                    marginLeft: "10px",
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Scrollable Content */}
              <div
                style={{
                  padding: isMobile ? "1.5rem" : "2rem 2.5rem",
                  overflowY: "auto",
                  flex: 1,
                }}
                className="custom-scrollbar"
              >
                <div style={{ marginBottom: isMobile ? "1.8rem" : "2.5rem" }}>
                  <h3
                    style={{
                      fontSize: "0.8rem",
                      fontWeight: 800,
                      color: "#22c55e",
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      marginBottom: "0.6rem",
                    }}
                  >
                    Service Overview
                  </h3>
                  <p
                    style={{
                      color: "var(--text-secondary)",
                      fontSize: "0.9rem",
                      lineHeight: 1.6,
                      margin: 0,
                    }}
                  >
                    {selectedService.description}
                  </p>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                      gap: "0.8rem",
                      marginTop: "1.2rem",
                    }}
                  >
                    <div
                      style={{
                        background: isLightMode
                          ? "rgba(0,0,0,0.05)"
                          : "rgba(255,255,255,0.02)",
                        padding: "1rem",
                        borderRadius: "16px",
                        border: isLightMode
                          ? "1px solid rgba(0,0,0,0.12)"
                          : "1px solid rgba(255,255,255,0.05)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.7rem",
                          color: isLightMode
                            ? "rgba(0,0,0,0.7)"
                            : "rgba(255,255,255,0.4)",
                          fontWeight: 700,
                          textTransform: "uppercase",
                        }}
                      >
                        Expert Fee
                      </span>
                      <span
                        style={{
                          fontSize: "1.1rem",
                          fontWeight: 800,
                          color: "#22c55e",
                        }}
                      >
                        ₹1,000
                      </span>
                    </div>
                    <div
                      style={{
                        background: isLightMode
                          ? "rgba(0,0,0,0.05)"
                          : "rgba(255,255,255,0.02)",
                        padding: "1rem",
                        borderRadius: "16px",
                        border: isLightMode
                          ? "1px solid rgba(0,0,0,0.12)"
                          : "1px solid rgba(255,255,255,0.05)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.7rem",
                          color: isLightMode
                            ? "rgba(0,0,0,0.7)"
                            : "rgba(255,255,255,0.4)",
                          fontWeight: 700,
                          textTransform: "uppercase",
                        }}
                      >
                        Turnaround
                      </span>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        <Clock size={16} color="#22c55e" />
                        <span
                          style={{
                            fontSize: "0.95rem",
                            fontWeight: 700,
                            color: isLightMode ? "#111111" : "var(--text)",
                          }}
                        >
                          2-4 Days
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Checklist Section */}
                <div>
                  {/* PDF-only notice */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "0.55rem 0.9rem",
                      background: "rgba(245, 158, 11, 0.06)",
                      border: "1px solid rgba(245, 158, 11, 0.15)",
                      borderRadius: "10px",
                      marginBottom: "1rem",
                    }}
                  >
                    <FileText size={13} color="#f59e0b" style={{ flexShrink: 0 }} />
                    <span
                      style={{
                        fontSize: "0.72rem",
                        fontWeight: 600,
                        color: "#f59e0b",
                        lineHeight: 1.4,
                      }}
                    >
                      Only PDF documents are accepted for upload
                    </span>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexDirection: isMobile ? "column" : "row",
                      justifyContent: "space-between",
                      alignItems: isMobile ? "flex-start" : "center",
                      marginBottom: "1rem",
                      gap: isMobile ? "0.5rem" : 0,
                    }}
                  >
                    <h3
                      style={{
                        fontSize: "0.8rem",
                        fontWeight: 800,
                        color: "#22c55e",
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                        margin: 0,
                      }}
                    >
                      Required Documentation
                    </h3>
                    {(() => {
                      const docs = getActiveDocs(selectedService);
                      const required = docs.filter((d) => d.required);
                      const uploaded =
                        uploadedDocs[selectedService.title] || {};
                      const count = required.filter(
                        (d) => uploaded[d.name],
                      ).length;
                      return (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            width: isMobile ? "100%" : "auto",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "0.72rem",
                              color: "#22c55e",
                              fontWeight: 800,
                            }}
                          >
                            {count}/{required.length} Required
                          </span>
                          <div
                            style={{
                              flex: isMobile ? 1 : "unset",
                              width: isMobile ? "auto" : "80px",
                              height: "6px",
                              background: isLightMode
                                ? "rgba(0,0,0,0.12)"
                                : "rgba(255,255,255,0.05)",
                              borderRadius: "10px",
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                width: `${(count / Math.max(1, required.length)) * 100}%`,
                                height: "100%",
                                background: "#22c55e",
                                transition: "width 0.4s ease",
                              }}
                            />
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.8rem",
                    }}
                  >
                    {(() => {
                      const docs = getActiveDocs(selectedService);
                      const uploaded =
                        uploadedDocs[selectedService.title] || {};

                      return docs.map((doc, idx) => (
                        <div
                          key={idx}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: isMobile ? "0.8rem 1rem" : "1rem 1.25rem",
                            background: uploaded[doc.name]
                              ? isLightMode
                                ? "rgba(16,185,129,0.15)"
                                : "rgba(16,185,129,0.04)"
                              : isLightMode
                                ? "rgba(0,0,0,0.06)"
                                : "rgba(255,255,255,0.01)",
                            borderRadius: "18px",
                            border: uploaded[doc.name]
                              ? isLightMode
                                ? "1px solid rgba(16,185,129,0.35)"
                                : "1px solid rgba(16,185,129,0.15)"
                              : isLightMode
                                ? "1px solid rgba(0,0,0,0.14)"
                                : "1px solid rgba(255,255,255,0.05)",
                            transition: "all 0.2s",
                            opacity:
                              !doc.required && !uploaded[doc.name] ? 0.7 : 1,
                            gap: isMobile ? "0.6rem" : "1rem",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: isMobile ? "0.7rem" : "1rem",
                              flex: 1,
                              minWidth: 0,
                            }}
                          >
                            <div
                              style={{
                                width: isMobile ? "30px" : "36px",
                                height: isMobile ? "30px" : "36px",
                                borderRadius: "8px",
                                background: uploaded[doc.name]
                                  ? "rgba(16,185,129,0.1)"
                                  : isLightMode
                                    ? "rgba(0,0,0,0.08)"
                                    : "rgba(255,255,255,0.03)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                              }}
                            >
                              {uploaded[doc.name] ? (
                                <Check size={16} color="#10b981" />
                              ) : (
                                <FileText
                                  size={16}
                                  color={
                                    isLightMode
                                      ? "rgba(0,0,0,0.6)"
                                      : "rgba(255,255,255,0.2)"
                                  }
                                />
                              )}
                            </div>
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "6px",
                                  flexWrap: "wrap",
                                }}
                              >
                                <p
                                  style={{
                                    fontSize: isMobile ? "0.8rem" : "0.85rem",
                                    fontWeight: 700,
                                    color: isLightMode
                                      ? "#111111"
                                      : "var(--text)",
                                    margin: 0,
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                  }}
                                >
                                  {doc.name}
                                </p>
                                {doc.required ? (
                                  <span
                                    style={{
                                      fontSize: "0.55rem",
                                      padding: "2px 5px",
                                      background: "rgba(239,68,68,0.1)",
                                      color: "#ef4444",
                                      borderRadius: "4px",
                                      fontWeight: 800,
                                      textTransform: "uppercase",
                                    }}
                                  >
                                    Required
                                  </span>
                                ) : (
                                  <span
                                    style={{
                                      fontSize: "0.55rem",
                                      padding: "2px 5px",
                                      background: isLightMode
                                        ? "rgba(0,0,0,0.1)"
                                        : "rgba(255,255,255,0.05)",
                                      color: isLightMode
                                        ? "rgba(0,0,0,0.65)"
                                        : "rgba(255,255,255,0.3)",
                                      borderRadius: "4px",
                                      fontWeight: 700,
                                      textTransform: "uppercase",
                                    }}
                                  >
                                    Optional
                                  </span>
                                )}
                              </div>
                              <p
                                style={{
                                  fontSize: "0.65rem",
                                  color: isLightMode
                                    ? "rgba(0,0,0,0.7)"
                                    : "var(--text-muted)",
                                  margin: "1px 0 0",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  display: "-webkit-box",
                                  WebkitLineClamp: 1,
                                  WebkitBoxOrient: "vertical",
                                }}
                              >
                                {uploaded[doc.name]
                                  ? `Uploaded: ${uploaded[doc.name].name}`
                                  : doc.desc || "Documentation needed"}
                              </p>
                            </div>
                          </div>

                          <label
                            style={{
                              cursor: uploadingDoc ? "not-allowed" : "pointer",
                              padding: isMobile ? "5px 12px" : "6px 14px",
                              background: uploaded[doc.name]
                                ? (isLightMode ? "rgba(16,185,129,0.1)" : "rgba(255,255,255,0.05)")
                                : "#22c55e",
                              color: "#fff",
                              borderRadius: "8px",
                              fontSize: isMobile ? "0.7rem" : "0.75rem",
                              fontWeight: 700,
                              display: "flex",
                              alignItems: "center",
                              gap: "5px",
                              transition: "0.2s",
                              border: "none",
                              flexShrink: 0,
                              marginLeft: isMobile ? "4px" : "0.5rem",
                              opacity: (uploadingDoc && uploadingDoc !== doc.name) ? 0.5 : 1,
                              pointerEvents: uploadingDoc ? "none" : "auto",
                            }}
                          >
                            {uploadingDoc === doc.name ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <Upload size={12} />
                            )}{" "}
                            {uploadingDoc === doc.name
                              ? "Uploading..."
                              : isMobile && uploaded[doc.name]
                                ? ""
                                : uploaded[doc.name]
                                  ? "Change"
                                  : "Upload"}
                            <input
                              type="file"
                              accept=".pdf"
                              hidden
                              disabled={!!uploadingDoc}
                              onChange={async (e) => {
                                const file = e.target.files[0];
                                if (file) {
                                  if (file.type !== "application/pdf") {
                                    toast.error(
                                      "Please upload only PDF documents",
                                    );
                                    return;
                                  }
                                  
                                  setUploadingDoc(doc.name);
                                  const loadingToast = toast.loading(
                                    `Uploading ${doc.name}...`,
                                  );
                                  try {
                                    const apiUrl = import.meta.env.VITE_API_URL;
                                    const formData = new FormData();
                                    formData.append("file", file);

                                    const user = JSON.parse(
                                      localStorage.getItem("user"),
                                    );
                                    const token = user?.token;

                                    if (!token) {
                                      toast.error(
                                        "Please log in to upload documents",
                                        { id: loadingToast },
                                      );
                                      setUploadingDoc(null);
                                      return;
                                    }

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
                                      setUploadedDocs((prev) => ({
                                        ...prev,
                                        [selectedService.title]: {
                                          ...(prev[selectedService.title] ||
                                            {}),
                                          [doc.name]: {
                                            name: file.name,
                                            url: uploadRes.data.url,
                                          },
                                        },
                                      }));
                                      toast.success(`Uploaded ${doc.name}`, {
                                        id: loadingToast,
                                      });
                                    }
                                  } catch (error) {
                                    console.error("Upload error:", error);
                                    toast.error(
                                      `Upload failed for ${doc.name}`,
                                      { id: loadingToast },
                                    );
                                  } finally {
                                    setUploadingDoc(null);
                                  }
                                }
                              }}
                            />
                          </label>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              </div>

              {/* Sticky Modal Footer */}
              <div
                style={{
                  padding: isMobile ? "1.2rem 1.5rem" : "1.5rem 2.5rem",
                  borderTop: "1px solid rgba(255,255,255,0.05)",
                  background: "rgba(255,255,255,0.01)",
                  display: "flex",
                  gap: "1rem",
                }}
              >
                {(() => {
                  const docs = getActiveDocs(selectedService);
                  const required = docs.filter((d) => d.required);
                  const uploaded = uploadedDocs[selectedService.title] || {};
                  const isComplete = required.every((d) => uploaded[d.name]);

                  return (
                    <button
                      onClick={async () => {
                        if (!isComplete) {
                          toast.error("Complete required uploads to proceed.");
                          return;
                        }
                        setIsSubmitting(true);
                        try {
                          const user = JSON.parse(localStorage.getItem("user"));
                          const apiUrl = import.meta.env.VITE_API_URL;
                          const docList = Object.keys(uploaded).map(
                            (docName) => ({
                              name: docName,
                              url: uploaded[docName].url,
                              status: "Pending",
                              uploadedAt: new Date(),
                            }),
                          );

                          console.log(
                            "[Recommendations] Submitting lead with docs:",
                            docList,
                          );

                          await axios.post(
                            `${apiUrl}/leads`,
                            {
                              user: user?._id || user?.id || null,
                              name: user?.name,
                              email: user?.email,
                              serviceName: selectedService.title,
                              cost: 1000,
                              documents: docList,
                            },
                            {
                              headers: {
                                Authorization: `Bearer ${user.token}`,
                              },
                            },
                          );

                          // Clear pending uploads for this service after successful submission
                          setUploadedDocs((prev) => {
                            const newState = { ...prev };
                            delete newState[selectedService.title];
                            return newState;
                          });

                          toast.success(
                            "Interest recorded! Check your dashboard for updates.",
                          );
                          setSelectedService(null);
                          navigate("/dashboard");
                        } catch (error) {
                          toast.error("Submission failed. Try again later.");
                        } finally {
                          setIsSubmitting(false);
                        }
                      }}
                      disabled={!isComplete || isSubmitting}
                      style={{
                        flex: 1,
                        padding: isMobile ? "0.9rem" : "1.1rem",
                        background: isComplete
                          ? "linear-gradient(135deg, #16a34a, #22c55e)"
                          : "rgba(255,255,255,0.03)",
                        color: isComplete ? "#fff" : "rgba(255,255,255,0.15)",
                        border: isComplete
                          ? "none"
                          : "1px solid rgba(255,255,255,0.05)",
                        borderRadius: isMobile ? "12px" : "16px",
                        fontWeight: 800,
                        fontSize: isMobile ? "0.85rem" : "0.95rem",
                        cursor: isComplete ? "pointer" : "not-allowed",
                        transition: "all 0.3s",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px",
                        boxShadow: isComplete
                          ? "0 6px 20px rgba(34,197,94,0.25)"
                          : "none",
                      }}
                    >
                      {isSubmitting
                        ? "Submitting..."
                        : isComplete
                          ? "Confirm Interest & Submit"
                          : isMobile
                            ? "Upload Required Files"
                            : "Upload Required Files to Unlock"}
                      {isComplete && <ArrowRight size={18} />}
                    </button>
                  );
                })()}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Recommendations;
