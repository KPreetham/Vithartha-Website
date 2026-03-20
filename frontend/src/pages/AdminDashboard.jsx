import React, { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Briefcase,
  TrendingUp,
  Bell,
  Search,
  Filter,
  Check,
  MessageSquare,
  ShieldAlert,
  FileText,
  ArrowUpRight,
  RefreshCw,
  X,
  AlertCircle,
  Building,
  CheckCircle,
  Clock,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "react-hot-toast";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const PremiumCard = ({ children, style = {}, className = "" }) => {
  return (
    <div
      className={className}
      style={{
        background: "var(--dashboard-card-bg)",
        borderRadius: "24px",
        border: "1px solid var(--dashboard-card-border)",
        position: "relative",
        overflow: "hidden",
        backdropFilter: "blur(10px)",
        boxShadow: "var(--shadow-card)",
        ...style,
      }}
    >
      <div style={{ position: "relative", zIndex: 1 }}>{children}</div>
    </div>
  );
};

import Loader from "../components/Loader";

const AdminDashboard = () => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLead, setSelectedLead] = useState(null);
  const [expandedLeadId, setExpandedLeadId] = useState(null);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    serviceName: "",
    status: "",
    adminMessage: "",
  });

  useEffect(() => {
    const lead = leads.find((l) => l._id === expandedLeadId);
    if (lead) {
      setEditForm({
        name: lead.name || "",
        email: lead.email || "",
        serviceName: lead.serviceName || "",
        status: lead.status || "Open",
        adminMessage: lead.adminMessage || "",
        userMessage: lead.userMessage || "",
      });
    }
  }, [expandedLeadId, leads]);

  const handleUpdateLead = async (e) => {
    e.preventDefault();
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const response = await axios.patch(
        `${apiUrl}/leads/${expandedLeadId}`,
        editForm,
      );
      if (response.data) {
        toast.success("Message sent to user");
        fetchLeads();
      }
    } catch (error) {
      toast.error("Update failed");
      console.error(error);
    }
  };

  const fetchLeads = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const response = await axios.get(`${apiUrl}/leads`);
      setLeads(response.data);
    } catch (error) {
      console.error("Error fetching leads:", error);
      toast.error("Failed to load platform data");
    } finally {
      setTimeout(() => setLoading(false), 500);
    }
  };

  const fetchLeadDetails = async (id) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const response = await axios.get(`${apiUrl}/leads/${id}`);
      if (response.data) {
        setLeads((prev) => prev.map((l) => (l._id === id ? response.data : l)));
      }
    } catch (error) {
      console.error("Error fetching lead details:", error);
      toast.error("Failed to sync latest lead data");
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const handleApprove = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      await axios.patch(`${apiUrl}/leads/${id}`, {
        status: "InProgress",
      });
      toast.success("Service request accepted and moved to In-Progress");
      fetchLeads();
      if (selectedLead?._id === id) setSelectedLead(null);
    } catch (error) {
      toast.error("Failed to move to In-Progress");
    }
  };

  const handleReject = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const response = await axios.patch(`${apiUrl}/leads/${id}`, {
        status: "Rejected",
        adminMessage: "Request rejected by administrator.",
      });
      if (response.data) {
        toast.success("Service request rejected");
        fetchLeads();
        if (selectedLead?._id === id) setSelectedLead(null);
      }
    } catch (error) {
      toast.error("Failed to reject request");
    }
  };

  const handleUploadDraft = async (leadId, file, type = "Draft") => {
    if (!file) return;
    const loadingToast = toast.loading(
      `Uploading ${type.toLowerCase()} document...`,
    );
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const formData = new FormData();
      formData.append("file", file);

      const user = JSON.parse(localStorage.getItem("user"));
      const token = user?.token;
      const uploadRes = await axios.post(`${apiUrl}/leads/upload`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!uploadRes.data.success) throw new Error("Upload failed");

      // Add the draft/final to the documents array and update status if Final
      const updatePayload = {
        $push: {
          documents: {
            name: `${type.toUpperCase()} - ${file.name}`,
            url: uploadRes.data.url,
            type: type,
            status: "Accepted",
            uploadedAt: new Date(),
          },
        },
      };

      if (type === "Final") {
        updatePayload.status = "Completed";
        updatePayload.adminMessage =
          "Final return uploaded. Please review/download your final document below.";
      }

      await axios.patch(`${apiUrl}/leads/${leadId}`, updatePayload);

      toast.success(`${type} uploaded!`, { id: loadingToast });
      fetchLeads();
      if (selectedLead?._id === leadId) fetchLeadDetails(leadId);
    } catch (error) {
      console.error(error);
      toast.error(`${type} upload failed`, { id: loadingToast });
    }
  };

  const handleSendDraft = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      await axios.patch(`${apiUrl}/leads/${id}`, {
        status: "DraftSent",
        adminMessage:
          "Draft is ready. Please click Review Draft in your dashboard and accept or reject it.",
      });
      toast.success("Draft sent to user for approval!");
      fetchLeads();
      if (selectedLead?._id === id) setSelectedLead(null);
    } catch (error) {
      toast.error("Failed to send draft");
    }
  };

  const handleComplete = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      await axios.patch(`${apiUrl}/leads/${id}`, { status: "Completed" });
      toast.success("Service marked as completed!");
      fetchLeads();
      if (selectedLead?._id === id) setSelectedLead(null);
    } catch (error) {
      toast.error("Failed to complete service");
    }
  };

  const handleDeleteUserMessage = async (leadId, e) => {
    if (e) e.stopPropagation();
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      await axios.patch(`${apiUrl}/leads/${leadId}`, { userMessage: "" });
      toast.success("User message removed");
      fetchLeads();
      if (expandedLeadId === leadId) {
        setEditForm((prev) => ({ ...prev, userMessage: "" }));
      }
    } catch (error) {
      toast.error("Failed to remove message");
    }
  };

  const stats = {
    total: leads.length,
    pending: leads.filter((l) => l.status === "Open").length,
    completed: leads.filter((l) => l.status === "Completed").length,
    revenue: (leads.length * 2500).toLocaleString("en-IN"),
  };

  const getDisplayStatus = (status) => {
    if (status === "DraftSent") return "Awaiting Draft Review";
    if (status === "UserAccepted") return "Awaiting Final Upload";
    if (status === "Completed") return "Final Uploaded";
    if (status === "InProgress") return "Active";
    if (status === "Open") return "Pending";
    return status;
  };

  const getStatusTheme = (status) => {
    if (status === "Completed") {
      return { color: "#10b981", bg: "rgba(16,185,129,0.1)" };
    }
    if (status === "InProgress") {
      return { color: "#22c55e", bg: "rgba(34,197,94,0.1)" };
    }
    if (status === "DraftSent") {
      return { color: "#f59e0b", bg: "rgba(245,158,11,0.12)" };
    }
    if (status === "UserAccepted") {
      return { color: "#8b5cf6", bg: "rgba(139,92,246,0.12)" };
    }
    if (status === "Rejected") {
      return { color: "#ef4444", bg: "rgba(239,68,68,0.1)" };
    }
    return { color: "#f59e0b", bg: "rgba(245,158,11,0.1)" };
  };

  const filteredLeads = leads.filter(
    (l) =>
      l.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.serviceName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.email?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      toast.error("Please enter a name or service to search");
      return;
    }
    if (filteredLeads.length === 1) {
      fetchLeadDetails(filteredLeads[0]._id);
      toast.success(`Displaying details for ${filteredLeads[0].name}`);
    } else if (filteredLeads.length > 1) {
      toast.success(`Found ${filteredLeads.length} matching results`);
    } else {
      toast.error("No matching users or services found");
    }
  };

  if (loading) return <Loader minimal={true} />;

  return (
    <div
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

      <style>{`
        @media (max-width: 768px) {
          .admin-container {
            padding: 0 1rem !important;
          }
          .admin-search-wrap {
            flex-direction: column !important;
          }
          .admin-search-wrap button {
            width: 100% !important;
            justify-content: center !important;
          }
          .admin-stats-grid {
            grid-template-columns: 1fr !important;
          }
          .admin-lead-row {
            grid-template-columns: 1fr !important;
            gap: 1rem !important;
            align-items: flex-start !important;
          }
          .admin-lead-row > div:last-child {
            width: 100% !important;
            justify-content: space-between !important;
            margin-top: 0.5rem;
          }
          .admin-detail-grid {
            grid-template-columns: 1fr !important;
            gap: 2rem !important;
          }
          .admin-status-service-grid {
            grid-template-columns: 1fr !important;
            gap: 1rem !important;
          }
          .admin-actions-grid {
            grid-template-columns: 1fr !important;
            gap: 1rem !important;
          }
          .admin-actions-grid > div {
             grid-column: span 1 !important;
          }
        }
      `}</style>

      <div
        className="admin-container"
        style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 2rem" }}
      >
        <div
          className="admin-header"
          style={{ textAlign: "center", marginBottom: "4rem" }}
        >
          <h1
            style={{
              fontSize: "clamp(2rem, 5vw, 3.2rem)",
              fontWeight: 500,
              letterSpacing: "-0.04em",
              margin: 0,
              color: "var(--text)",
            }}
          >
            Admin Dashboard <span style={{ color: "#22c55e" }}>.</span>
          </h1>
          <p
            style={{
              color: "var(--text-muted)",
              fontSize: "1rem",
              marginTop: "0.6rem",
              marginBottom: "2.5rem",
              maxWidth: "550px",
              margin: "0.6rem auto 2.5rem",
              lineHeight: 1.6,
            }}
          >
            Manage service requests, review documents and track client progress
          </p>

          <div
            className="admin-search-wrap"
            style={{
              display: "flex",
              gap: "1rem",
              justifyContent: "center",
              maxWidth: "700px",
              margin: "0 auto 4rem",
            }}
          >
            <div
              className="admin-search-input-group"
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                gap: "12px",
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                padding: "0.8rem 1.2rem",
                borderRadius: "18px",
              }}
            >
              <Search size={18} color="var(--text-muted)" />
              <input
                type="text"
                placeholder="Search by name, email or service..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text)",
                  outline: "none",
                  width: "100%",
                  fontSize: "0.9rem",
                }}
              />
            </div>
            <button
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
              }}
            >
              <Search size={18} /> Search
            </button>
          </div>
        </div>

        <div
          className="admin-stats-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "1rem",
            marginBottom: "2.5rem",
          }}
        >
          {[
            {
              label: "Platform Users",
              value: stats.total,
              icon: Users,
              color: "#22c55e",
            },
            {
              label: "Pending Approval",
              value: stats.pending,
              icon: Clock,
              color: "#f59e0b",
            },
            {
              label: "Fulfilled",
              value: stats.completed,
              icon: CheckCircle,
              color: "#10b981",
            },
            {
              label: "Revenue (₹)",
              value: stats.revenue,
              icon: TrendingUp,
              color: "#22c55e",
            },
          ].map((s, idx) => (
            <PremiumCard key={idx} style={{ padding: "1.5rem" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "1rem",
                }}
              >
                <s.icon size={20} color={s.color} />
                <span
                  style={{
                    fontSize: "0.65rem",
                    fontWeight: 800,
                    color: "var(--text-muted)",
                    textTransform: "uppercase",
                  }}
                >
                  {s.label}
                </span>
              </div>
              <div
                style={{
                  fontSize: "1.8rem",
                  fontWeight: 900,
                  color: "var(--text)",
                }}
              >
                {s.value}
              </div>
            </PremiumCard>
          ))}
        </div>

        <PremiumCard style={{ padding: "clamp(1.2rem, 4vw, 2.5rem)" }}>
          <div
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
              Active User Services
            </h2>
            <span
              style={{
                fontSize: "0.75rem",
                color: "var(--text-muted)",
                fontWeight: 600,
              }}
            >
              {filteredLeads.length} requests
            </span>
          </div>

          <div
            style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
          >
            {filteredLeads.length > 0 ? (
              filteredLeads.map((lead, i) => (
                <React.Fragment key={lead._id}>
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.14, delay: Math.min(i * 0.01, 0.06) }}
                    onClick={() => {
                      const isExpanding = expandedLeadId !== lead._id;
                      setExpandedLeadId(isExpanding ? lead._id : null);
                      if (isExpanding) fetchLeadDetails(lead._id);
                    }}
                    className="admin-lead-row"
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(130px, 1fr))",
                      alignItems: "center",
                      padding: "1.2rem 1.5rem",
                      background:
                        expandedLeadId === lead._id
                          ? "rgba(34, 197, 94, 0.08)"
                          : "var(--dashboard-row-bg)",
                      borderRadius:
                        expandedLeadId === lead._id ? "20px 20px 0 0" : "20px",
                      border:
                        "1px solid " +
                        (expandedLeadId === lead._id
                          ? "rgba(34, 197, 94, 0.2)"
                          : "var(--dashboard-card-border)"),
                      cursor: "pointer",
                      gap: "1rem",
                      transition: "all 0.16s ease",
                      position: "relative",
                      zIndex: 2,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                      }}
                    >
                      <div
                        style={{
                          width: "34px",
                          height: "34px",
                          borderRadius: "10px",
                          background: "var(--dashboard-card-bg)",
                          border: "1px solid var(--dashboard-card-border)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 800,
                          fontSize: "0.85rem",
                          color: "#22c55e",
                        }}
                      >
                        {lead.name?.[0]?.toUpperCase() || "U"}
                      </div>
                      <div>
                        <div
                          style={{
                            fontWeight: 700,
                            fontSize: "0.88rem",
                            color: "var(--text)",
                          }}
                        >
                          {lead.name}
                        </div>
                        <div
                          style={{
                            fontSize: "0.68rem",
                            color: "var(--text-muted)",
                          }}
                        >
                          {lead.email}
                        </div>
                      </div>
                    </div>

                    <div>
                      <div
                        style={{
                          fontSize: "0.85rem",
                          fontWeight: 700,
                          color: "var(--text)",
                        }}
                      >
                        {lead.serviceName}
                      </div>
                      <div style={{ fontSize: "0.7rem", color: "#22c55e" }}>
                        {lead.user?.profile?.industry || "Service Request"}
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "6px 12px",
                        background:
                          lead.documents?.length > 0
                            ? "rgba(16, 185, 129, 0.08)"
                            : "var(--dashboard-row-bg)",
                        borderRadius: "10px",
                        border:
                          "1px solid " +
                          (lead.documents?.length > 0
                            ? "rgba(16, 185, 129, 0.15)"
                            : "var(--dashboard-card-border)"),
                        position: "relative",
                      }}
                    >
                      <FileText
                        size={14}
                        color={
                          lead.documents?.length > 0
                            ? "#10b981"
                            : "rgba(255,255,255,0.2)"
                        }
                      />
                      <span
                        style={{
                          fontSize: "0.8rem",
                          fontWeight: 800,
                          color:
                            lead.documents?.length > 0
                              ? "#10b981"
                              : "var(--text-muted)",
                        }}
                      >
                        {lead.documents?.length || 0}{" "}
                        {lead.documents?.length === 1 ? "Doc" : "Docs"}
                      </span>
                      {lead.userMessage && (
                        <div
                          style={{
                            position: "absolute",
                            top: "-5px",
                            right: "-5px",
                            width: "12px",
                            height: "12px",
                            background: "#10b981",
                            borderRadius: "50%",
                            border: "2px solid #151515",
                            boxShadow: "0 0 10px rgba(16, 185, 129, 0.6)",
                            animation: "pulse 2s infinite",
                          }}
                        />
                      )}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "flex-end",
                        gap: "0.8rem",
                        alignItems: "center",
                      }}
                    >
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "5px",
                          fontSize: "0.68rem",
                          fontWeight: 700,
                          color: getStatusTheme(lead.status).color,
                        }}
                      >
                        <span
                          style={{
                            width: "6px",
                            height: "6px",
                            borderRadius: "50%",
                            background: getStatusTheme(lead.status).color,
                          }}
                        />
                        {getDisplayStatus(lead.status)}
                      </span>
                      {expandedLeadId === lead._id ? (
                        <ChevronUp size={18} color="var(--text-muted)" />
                      ) : (
                        <ChevronDown size={18} color="var(--text-muted)" />
                      )}
                    </div>
                  </motion.div>

                  <AnimatePresence initial={false}>
                    {expandedLeadId === lead._id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{
                          height: { duration: 0.16, ease: "easeOut" },
                          opacity: { duration: 0.1, ease: "linear" },
                        }}
                        style={{
                          overflow: "hidden",
                          background: "var(--dashboard-row-bg)",
                          border: "1px solid var(--dashboard-card-border)",
                          borderTop: "none",
                          borderRadius: "0 0 16px 16px",
                          marginBottom: "0.5rem",
                          padding: "1.5rem",
                          position: "relative",
                          zIndex: 1,
                        }}
                      >
                        <div
                          className="admin-detail-grid"
                          style={{
                            display: "grid",
                            gridTemplateColumns: "minmax(250px, 1fr) 1fr",
                            gap: "2rem",
                          }}
                        >
                          {/* Left: User & Form */}
                          <div>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.9rem",
                                marginBottom: "1.2rem",
                              }}
                            >
                              <div
                                style={{
                                  width: "38px",
                                  height: "38px",
                                  borderRadius: "10px",
                                  background: "var(--bg-card)",
                                  border: "1px solid var(--border)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: "0.95rem",
                                  fontWeight: 800,
                                  color: "#22c55e",
                                }}
                              >
                                {lead.name?.[0] || "U"}
                              </div>
                              <div>
                                <h4
                                  style={{
                                    margin: 0,
                                    fontSize: "0.95rem",
                                    fontWeight: 700,
                                    color: "var(--text)",
                                  }}
                                >
                                  {lead.name}
                                </h4>
                                <p
                                  style={{
                                    margin: 0,
                                    fontSize: "0.72rem",
                                    color: "var(--text-muted)",
                                  }}
                                >
                                  {lead.email}
                                </p>
                              </div>
                            </div>

                            <form
                              onSubmit={handleUpdateLead}
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "1rem",
                              }}
                            >
                              {(lead.status === "DraftSent" ||
                                lead.status === "UserAccepted" ||
                                lead.status === "Completed") && (
                                <div
                                  style={{
                                    marginBottom: "0.2rem",
                                    background: getStatusTheme(lead.status).bg,
                                    border: `1px solid ${getStatusTheme(lead.status).color}33`,
                                    borderRadius: "12px",
                                    padding: "0.8rem 0.9rem",
                                  }}
                                >
                                  <div
                                    style={{
                                      fontSize: "0.62rem",
                                      fontWeight: 800,
                                      color: getStatusTheme(lead.status).color,
                                      textTransform: "uppercase",
                                      letterSpacing: "0.06em",
                                      marginBottom: "0.25rem",
                                    }}
                                  >
                                    Client Flow Update
                                  </div>
                                  <div
                                    style={{
                                      fontSize: "0.8rem",
                                      fontWeight: 600,
                                      color: "var(--text)",
                                    }}
                                  >
                                    {getDisplayStatus(lead.status)}
                                  </div>
                                </div>
                              )}

                              {lead.userMessage?.trim() && (
                                <div
                                  style={{
                                    marginBottom: "1rem",
                                    background: "var(--bg-card)",
                                    border: "1px solid var(--border)",
                                    borderRadius: "12px",
                                    padding: "0.9rem",
                                  }}
                                >
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "space-between",
                                      fontSize: "0.6rem",
                                      fontWeight: 700,
                                      color: "var(--text-muted)",
                                      textTransform: "uppercase",
                                      letterSpacing: "0.05em",
                                      marginBottom: "0.5rem",
                                    }}
                                  >
                                    <span>User Message For This Service</span>
                                    <button
                                      type="button"
                                      onClick={(e) =>
                                        handleDeleteUserMessage(lead._id, e)
                                      }
                                      title="Delete user message"
                                      style={{
                                        background: "none",
                                        border: "none",
                                        color: "var(--text-muted)",
                                        cursor: "pointer",
                                        display: "inline-flex",
                                        alignItems: "center",
                                        padding: 0,
                                      }}
                                    >
                                      <X size={14} />
                                    </button>
                                  </div>
                                  <p
                                    style={{
                                      margin: 0,
                                      fontSize: "0.83rem",
                                      color: "var(--text)",
                                      lineHeight: 1.5,
                                    }}
                                  >
                                    {lead.userMessage}
                                  </p>
                                </div>
                              )}

                              <div
                                className="admin-status-service-grid"
                                style={{
                                  display: "grid",
                                  gridTemplateColumns: "1fr 1fr",
                                  gap: "0.8rem",
                                }}
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "0.3rem",
                                  }}
                                >
                                  <label
                                    style={{
                                      fontSize: "0.6rem",
                                      fontWeight: 700,
                                      color: "var(--text-muted)",
                                      textTransform: "uppercase",
                                      letterSpacing: "0.05em",
                                    }}
                                  >
                                    Status
                                  </label>
                                  <div
                                    style={{
                                      background: "var(--bg-card)",
                                      border: "1px solid var(--border)",
                                      color: "var(--text)",
                                      padding: "0.6rem 0.8rem",
                                      borderRadius: "10px",
                                      fontSize: "0.82rem",
                                      fontWeight: 600,
                                    }}
                                  >
                                    {lead.status === "Open"
                                      ? "Pending"
                                      : lead.status}
                                  </div>
                                </div>
                                <div
                                  style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "0.3rem",
                                  }}
                                >
                                  <label
                                    style={{
                                      fontSize: "0.6rem",
                                      fontWeight: 700,
                                      color: "var(--text-muted)",
                                      textTransform: "uppercase",
                                      letterSpacing: "0.05em",
                                    }}
                                  >
                                    Service
                                  </label>
                                  <div
                                    style={{
                                      background: "var(--bg-card)",
                                      border: "1px solid var(--border)",
                                      color: "var(--text)",
                                      padding: "0.6rem 0.8rem",
                                      borderRadius: "10px",
                                      fontSize: "0.82rem",
                                      fontWeight: 600,
                                    }}
                                  >
                                    {lead.serviceName}
                                  </div>
                                </div>
                              </div>

                              <div
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: "0.3rem",
                                }}
                              >
                                <label
                                  style={{
                                    fontSize: "0.6rem",
                                    fontWeight: 700,
                                    color: "var(--text-muted)",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.05em",
                                  }}
                                >
                                  Advisor Note
                                </label>
                                <textarea
                                  value={editForm.adminMessage}
                                  onChange={(e) =>
                                    setEditForm({
                                      ...editForm,
                                      adminMessage: e.target.value,
                                    })
                                  }
                                  placeholder="Write your response to the client..."
                                  style={{
                                    background: "var(--bg-card)",
                                    border: "1px solid var(--border)",
                                    color: "var(--text)",
                                    padding: "0.8rem",
                                    borderRadius: "10px",
                                    fontSize: "0.82rem",
                                    minHeight: "100px",
                                    resize: "vertical",
                                    fontFamily: "inherit",
                                    outline: "none",
                                  }}
                                />
                              </div>
                              <button
                                type="submit"
                                style={{
                                  padding: "0.7rem",
                                  background: "#22c55e",
                                  border: "none",
                                  color: "white",
                                  borderRadius: "10px",
                                  fontWeight: 700,
                                  cursor: "pointer",
                                  fontSize: "0.82rem",
                                  transition: "all 0.3s",
                                }}
                              >
                                Send Message
                              </button>
                            </form>
                          </div>

                          {/* Right: Documents & Actions */}
                          <div>
                            <h5
                              style={{
                                fontSize: "0.9rem",
                                color: "var(--text)",
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                marginBottom: "1rem",
                              }}
                            >
                              <FileText size={16} color="#22c55e" /> User
                              Documents
                            </h5>
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "0.6rem",
                                marginBottom: "1.5rem",
                              }}
                            >
                              {lead.documents && lead.documents.length > 0 ? (
                                lead.documents.map((doc, idx) => (
                                  <div
                                    key={idx}
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "1rem",
                                      padding: "0.8rem",
                                      background: "var(--dashboard-row-bg)",
                                      borderRadius: "12px",
                                      border:
                                        "1px solid var(--dashboard-card-border)",
                                    }}
                                  >
                                    <FileText size={18} color="#10b981" />
                                    <span
                                      style={{
                                        flex: 1,
                                        fontSize: "0.8rem",
                                        color: "var(--text)",
                                      }}
                                    >
                                      {doc.name}
                                    </span>
                                    <button
                                      onClick={() =>
                                        window.open(doc.url, "_blank")
                                      }
                                      style={{
                                        background: "rgba(34, 197, 94, 0.1)",
                                        border:
                                          "1px solid rgba(34, 197, 94, 0.2)",
                                        color: "#22c55e",
                                        padding: "4px 10px",
                                        borderRadius: "8px",
                                        fontSize: "0.75rem",
                                        fontWeight: 800,
                                        cursor: "pointer",
                                      }}
                                    >
                                      View
                                    </button>
                                  </div>
                                ))
                              ) : (
                                <div
                                  style={{
                                    padding: "1.5rem",
                                    textAlign: "center",
                                    background: "var(--dashboard-row-bg)",
                                    borderRadius: "12px",
                                    border:
                                      "1px dashed var(--dashboard-card-border)",
                                    color: "var(--text-muted)",
                                    fontSize: "0.75rem",
                                  }}
                                >
                                  No documents uploaded.
                                </div>
                              )}
                            </div>

                            <h5
                              style={{
                                fontSize: "0.9rem",
                                color: "var(--text)",
                                marginBottom: "1rem",
                              }}
                            >
                              Admin Actions
                            </h5>
                            <div
                              className="admin-actions-grid"
                              style={{
                                display: "grid",
                                gridTemplateColumns: "1fr 1fr",
                                gap: "1rem",
                              }}
                            >
                              {lead.status === "Open" ? (
                                <>
                                  <button
                                    onClick={(e) => handleApprove(lead._id, e)}
                                    style={{
                                      padding: "0.8rem",
                                      background: "#22c55e",
                                      border: "none",
                                      color: "white",
                                      borderRadius: "12px",
                                      fontWeight: 800,
                                      cursor: "pointer",
                                      boxShadow:
                                        "0 4px 15px rgba(34, 197, 94, 0.2)",
                                      transition: "all 0.3s ease",
                                    }}
                                  >
                                    Accept Service
                                  </button>
                                  <button
                                    onClick={(e) => handleReject(lead._id, e)}
                                    style={{
                                      padding: "0.8rem",
                                      background: "rgba(239, 68, 68, 0.08)",
                                      border:
                                        "1px solid rgba(239, 68, 68, 0.2)",
                                      color: "#ef4444",
                                      borderRadius: "12px",
                                      fontWeight: 800,
                                      cursor: "pointer",
                                      transition: "all 0.3s ease",
                                    }}
                                  >
                                    Reject Lead
                                  </button>
                                </>
                              ) : lead.status === "InProgress" ? (
                                <>
                                  <input
                                    type="file"
                                    id={`draft-upload-${lead._id}`}
                                    hidden
                                    onChange={(e) =>
                                      handleUploadDraft(
                                        lead._id,
                                        e.target.files[0],
                                        "Draft",
                                      )
                                    }
                                  />
                                  <button
                                    onClick={() =>
                                      document
                                        .getElementById(
                                          `draft-upload-${lead._id}`,
                                        )
                                        .click()
                                    }
                                    style={{
                                      padding: "0.8rem",
                                      background: "var(--dashboard-row-bg)",
                                      border:
                                        "1px solid var(--dashboard-card-border)",
                                      color: "var(--text)",
                                      borderRadius: "12px",
                                      fontWeight: 800,
                                      cursor: "pointer",
                                      transition: "all 0.3s ease",
                                    }}
                                  >
                                    Upload Draft
                                  </button>
                                  <button
                                    onClick={(e) =>
                                      handleSendDraft(lead._id, e)
                                    }
                                    style={{
                                      padding: "0.8rem",
                                      background: "#22c55e",
                                      border: "none",
                                      color: "white",
                                      borderRadius: "12px",
                                      fontWeight: 800,
                                      cursor: "pointer",
                                      boxShadow:
                                        "0 4px 15px rgba(34, 197, 94, 0.2)",
                                      transition: "all 0.3s ease",
                                    }}
                                  >
                                    Send Draft
                                  </button>
                                </>
                              ) : lead.status === "UserAccepted" ? (
                                <>
                                  <input
                                    type="file"
                                    id={`final-upload-${lead._id}`}
                                    hidden
                                    onChange={(e) =>
                                      handleUploadDraft(
                                        lead._id,
                                        e.target.files[0],
                                        "Final",
                                      )
                                    }
                                  />
                                  <button
                                    onClick={() =>
                                      document
                                        .getElementById(
                                          `final-upload-${lead._id}`,
                                        )
                                        .click()
                                    }
                                    style={{
                                      padding: "0.8rem",
                                      background: "rgba(34, 197, 94, 0.12)",
                                      border:
                                        "1px solid rgba(34, 197, 94, 0.25)",
                                      color: "#22c55e",
                                      borderRadius: "12px",
                                      fontWeight: 800,
                                      cursor: "pointer",
                                      transition: "all 0.3s ease",
                                    }}
                                  >
                                    Upload Final
                                  </button>
                                  <button
                                    onClick={(e) => handleComplete(lead._id, e)}
                                    style={{
                                      padding: "0.8rem",
                                      background: "#22c55e",
                                      border: "none",
                                      color: "white",
                                      borderRadius: "12px",
                                      fontWeight: 800,
                                      cursor: "pointer",
                                      boxShadow:
                                        "0 4px 15px rgba(34, 197, 94, 0.2)",
                                      transition: "all 0.3s ease",
                                    }}
                                  >
                                    Complete Service
                                  </button>
                                </>
                              ) : (
                                <div
                                  style={{
                                    gridColumn: "span 2",
                                    padding: "0.8rem",
                                    background: "var(--dashboard-row-bg)",
                                    border:
                                      "1px solid var(--dashboard-card-border)",
                                    color: "var(--text-muted)",
                                    borderRadius: "12px",
                                    fontSize: "0.75rem",
                                    fontWeight: 600,
                                    textAlign: "center",
                                  }}
                                >
                                  No additional actions required
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </React.Fragment>
              ))
            ) : (
              <div
                style={{
                  textAlign: "center",
                  padding: "4rem",
                  color: "var(--text-muted)",
                }}
              >
                No requests in pipeline
              </div>
            )}
          </div>
        </PremiumCard>
      </div>
    </div>
  );
};

export default AdminDashboard;
