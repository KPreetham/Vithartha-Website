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
  Loader2,
  Upload,
} from "lucide-react";
import { toast } from "react-hot-toast";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import ConfirmationModal from "../components/ConfirmationModal";
import {
  formatInr,
  getLeadRevenueAmount,
} from "../utils/servicePricing";

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
  const [messageTarget, setMessageTarget] = useState("client");
  const [messageText, setMessageText] = useState("");
  const [uploadingId, setUploadingId] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, lead: null, isLoading: false });

  const getMessageFieldByTarget = (target) => {
    if (target === "pr") return "prMessage";
    if (target === "executor") return "executorMessage";
    return "adminMessage";
  };

  const getMessageTextByTarget = (lead, target) => {
    if (target === "pr") return lead?.prMessage || "";
    if (target === "executor") return lead?.executorMessage || "";
    return lead?.adminMessage || "";
  };

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
      setMessageText(getMessageTextByTarget(lead, messageTarget));
    }
  }, [expandedLeadId, messageTarget]);

  const handleUpdateLead = async (e) => {
    e.preventDefault();
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const user = JSON.parse(localStorage.getItem("user"));
      const targetField = getMessageFieldByTarget(messageTarget);
      const trimmedMessage = String(messageText || "").trim();
      if (!trimmedMessage) {
        toast.error("Please enter a message before sending");
        return;
      }
      const response = await axios.patch(
        `${apiUrl}/leads/${expandedLeadId}`,
        { [targetField]: trimmedMessage },
        { headers: { Authorization: `Bearer ${user.token}` } },
      );
      if (response.data) {
        toast.success(
          `Message sent to ${messageTarget === "client" ? "client" : messageTarget === "pr" ? "PR" : "executor"}`,
        );
        setMessageText("");
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
      const user = JSON.parse(localStorage.getItem("user"));
      const response = await axios.get(`${apiUrl}/leads`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      setLeads(response.data);
    } catch (error) {
      console.error("Error fetching leads:", error);
      if (error.response?.status !== 401 && error.response?.status !== 404) {
        // Toast removed as per user request to avoid showing error when no services entered
      }
    } finally {
      setTimeout(() => setLoading(false), 500);
    }
  };

  const fetchLeadDetails = async (id) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const user = JSON.parse(localStorage.getItem("user"));
      const response = await axios.get(`${apiUrl}/leads/${id}`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
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
      const user = JSON.parse(localStorage.getItem("user"));
      await axios.patch(
        `${apiUrl}/leads/${id}`,
        {
          status: "InProgress",
        },
        {
          headers: { Authorization: `Bearer ${user.token}` },
        },
      );
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
      const user = JSON.parse(localStorage.getItem("user"));
      const response = await axios.patch(
        `${apiUrl}/leads/${id}`,
        {
          status: "Rejected",
          adminMessage: "Request rejected by administrator.",
        },
        {
          headers: { Authorization: `Bearer ${user.token}` },
        },
      );
      if (response.data) {
        toast.success("Service request rejected");
        fetchLeads();
        if (selectedLead?._id === id) setSelectedLead(null);
      }
    } catch (error) {
      toast.error("Failed to reject request");
    }
  };

  const handleDeleteService = (lead, e) => {
    if (e) e.stopPropagation();
    setDeleteConfirm({ isOpen: true, lead, isLoading: false });
  };

  const handleConfirmDelete = async () => {
    const lead = deleteConfirm.lead;
    const serviceName = lead?.serviceName || "this service";
    
    setDeleteConfirm((prev) => ({ ...prev, isLoading: true }));
    
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const user = JSON.parse(localStorage.getItem("user"));
      await axios.delete(`${apiUrl}/leads/${lead._id}`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });

      toast.success("Service deleted");
      setExpandedLeadId((prev) => (prev === lead._id ? null : prev));
      setLeads((prev) => prev.filter((item) => item._id !== lead._id));
      setDeleteConfirm({ isOpen: false, lead: null, isLoading: false });
    } catch (error) {
      console.error("Delete service error:", error);
      toast.error("Failed to delete service");
      setDeleteConfirm((prev) => ({ ...prev, isLoading: false }));
    }
  };

  const handleUploadDraft = async (leadId, file, type = "Draft") => {
    if (!file) return;
    const loadingToast = toast.loading(
      `Uploading ${type.toLowerCase()} document...`,
    );
    setUploadingId(`${leadId}-${type}`);
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const formData = new FormData();
      formData.append("file", file);

      const user = JSON.parse(localStorage.getItem("user"));
      const token = user?.token;

      if (!token) {
        toast.error("Administrator session expired. Please re-login.", {
          id: loadingToast,
        });
        return;
      }

      const uploadRes = await axios.post(`${apiUrl}/leads/upload`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!uploadRes.data.success) throw new Error("Upload failed");

      // Add admin-uploaded draft/final document into lead documents
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
        updatePayload.adminMessage =
          "Final return uploaded. Final document is ready for delivery.";
      }

      await axios.patch(`${apiUrl}/leads/${leadId}`, updatePayload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      toast.success(`${type} uploaded!`, { id: loadingToast });
      fetchLeads();
      if (selectedLead?._id === leadId) fetchLeadDetails(leadId);
    } finally {
      setUploadingId(null);
    }
  };

  const handleSendDraft = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const lead = leads.find((item) => item._id === id);
      const hasDraftDoc = lead?.documents?.some((doc) => doc.type === "Draft");

      if (!hasDraftDoc) {
        toast.error("Upload draft first before sending to user");
        return;
      }

      const user = JSON.parse(localStorage.getItem("user"));
      await axios.patch(
        `${apiUrl}/leads/${id}`,
        {
          status: "DraftSent",
          adminMessage:
            "Draft is ready. Please click Review Draft in your dashboard and accept or reject it.",
        },
        {
          headers: { Authorization: `Bearer ${user.token}` },
        },
      );
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
      const lead = leads.find((item) => item._id === id);
      const hasFinalDoc = lead?.documents?.some((doc) => doc.type === "Final");

      if (!hasFinalDoc) {
        toast.error("Upload final return first before completing service");
        return;
      }

      const user = JSON.parse(localStorage.getItem("user"));
      await axios.patch(
        `${apiUrl}/leads/${id}`,
        { status: "Completed" },
        {
          headers: { Authorization: `Bearer ${user.token}` },
        },
      );
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
      const user = JSON.parse(localStorage.getItem("user"));
      await axios.patch(
        `${apiUrl}/leads/${leadId}`,
        { userMessage: "" },
        {
          headers: { Authorization: `Bearer ${user.token}` },
        },
      );
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
    revenue: formatInr(
      leads.reduce(
        (sum, lead) =>
          sum + (lead.status === "Rejected" ? 0 : getLeadRevenueAmount(lead)),
        0,
      ),
    ),
  };

  const hasPrFeedback = (lead) => String(lead?.prFeedback || "").trim().length > 0;

  const isAdminRejectedLead = (lead) =>
    lead?.status === "Rejected" &&
    String(lead?.adminMessage || "")
      .toLowerCase()
      .includes("administrator");

  const isExecutorRejectedLead = (lead) => {
    if (lead?.status !== "Rejected" || isAdminRejectedLead(lead)) return false;

    const executorMsg = String(lead?.executorMessage || "").toLowerCase();
    const fromExecutorMessage =
      executorMsg.includes("rejected by executor") ||
      executorMsg.includes("assignment rejected");

    // If it is rejected and not clearly PR/admin rejected, treat it as executor rejection.
    return fromExecutorMessage || !hasPrFeedback(lead);
  };

  const getDisplayStatus = (lead) => {
    const status = lead?.status;
    if (isExecutorRejectedLead(lead)) return "Rejected by Executor";
    if (status === "PendingReview") return "Pending PR Approval";
    if (status === "InformationRequired") return "Action Required";
    if (status === "PR_Accepted") return "Pending Executor Approval";
    if (status === "AssignedToExecutor") return "Pending Executor Approval";
    if (status === "InProgress") return "Execution Active";
    if (status === "ExecutionFinished") return "PR Reviewing Result";
    if (status === "DraftSent") return "Client Reviewing Draft";
    if (status === "DraftAccepted" || status === "UserAccepted") return "Draft Approved";
    if (status === "DraftRejected") return "Rejected by User";
    if (status === "Completed") return "Completed";
    if (status === "Open") return "Pending PR Approval";
    return status;
  };

  const getStatusTheme = (lead) => {
    const status = lead?.status;
    if (isExecutorRejectedLead(lead) || status === "Rejected") {
      return { color: "#ef4444", bg: "rgba(239,68,68,0.1)" };
    }
    if (status === "Completed") {
      return { color: "#10b981", bg: "rgba(16,185,129,0.1)" };
    }
    if (["InProgress", "AssignedToExecutor"].includes(status)) {
      return { color: "#4361ee", bg: "rgba(67,97,238,0.1)" };
    }
    if (status === "InformationRequired" || status === "DraftRejected") {
      return { color: "#ef4444", bg: "rgba(239,68,68,0.1)" };
    }
    if (status === "DraftSent" || status === "ExecutionFinished") {
      return { color: "#8b5cf6", bg: "rgba(139,92,246,0.12)" };
    }
    if (status === "PR_Accepted" || status === "DraftAccepted") {
      return { color: "#10b981", bg: "rgba(16,185,129,0.1)" };
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
          .admin-page-shell {
            padding-top: 120px !important;
            padding-bottom: 64px !important;
          }
          .admin-container {
            padding: 0 1rem !important;
          }
          .admin-header {
            margin-bottom: 2.5rem !important;
          }
          .admin-header-title {
            font-size: clamp(1.8rem, 8vw, 2.6rem) !important;
          }
          .admin-header-copy {
            margin-bottom: 1.75rem !important;
            font-size: 0.96rem !important;
          }
          .admin-search-wrap {
            flex-direction: column !important;
            max-width: 100% !important;
            margin-bottom: 2.5rem !important;
          }
          .admin-search-input-group {
            width: 100% !important;
          }
          .admin-search-wrap button {
            width: 100% !important;
            justify-content: center !important;
          }
          .admin-stats-grid {
            grid-template-columns: 1fr !important;
            gap: 0.85rem !important;
            margin-bottom: 2rem !important;
          }
          .admin-stat-card {
            padding: 1.25rem !important;
          }
          .admin-lead-row {
            grid-template-columns: 1fr !important;
            gap: 0.85rem !important;
            align-items: flex-start !important;
            padding: 1rem !important;
          }
          .admin-lead-row > div {
            min-width: 0 !important;
          }
          .admin-lead-row > div:last-child {
            width: 100% !important;
            justify-content: space-between !important;
            margin-top: 0.5rem;
          }
          .admin-delete-btn {
            transform: none !important;
            align-self: flex-start !important;
          }
          .admin-detail-grid {
            grid-template-columns: 1fr !important;
            gap: 1.5rem !important;
          }
          .admin-status-service-grid {
            grid-template-columns: 1fr !important;
            gap: 1rem !important;
          }
          .admin-send-msg-btn {
            width: 100% !important;
          }
          .admin-doc-item {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 0.65rem !important;
          }
          .admin-doc-item span {
            white-space: normal !important;
            overflow: visible !important;
            text-overflow: clip !important;
          }
          .admin-doc-item button {
            width: 100% !important;
          }
          .admin-expanded-panel {
            padding: 1rem !important;
          }
        }

        @media (max-width: 480px) {
          .admin-page-shell {
            padding-top: 96px !important;
            padding-bottom: 56px !important;
          }
          .admin-container {
            padding: 0 0.75rem !important;
          }
          .admin-header {
            margin-bottom: 2rem !important;
          }
          .admin-header-title {
            font-size: clamp(1.55rem, 10vw, 2.1rem) !important;
          }
          .admin-header-copy {
            font-size: 0.9rem !important;
            margin-bottom: 1.5rem !important;
          }
          .admin-search-input-group {
            padding: 0.7rem 0.85rem !important;
            border-radius: 14px !important;
            gap: 0.65rem !important;
          }
          .admin-search-input-group input {
            font-size: 0.88rem !important;
          }
          .admin-search-wrap button {
            padding: 0.75rem 1rem !important;
            border-radius: 14px !important;
            font-size: 0.88rem !important;
          }
          .admin-stat-card {
            padding: 1rem !important;
          }
          .admin-lead-row {
            padding: 0.9rem !important;
            border-radius: 16px !important;
          }
          .admin-lead-row > div:first-child {
            gap: 0.6rem !important;
          }
          .admin-expanded-panel {
            padding: 0.9rem !important;
          }
          .admin-detail-grid {
            gap: 1.25rem !important;
          }
        }
      `}</style>

      <div
        className="admin-container admin-page-shell"
        style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 2rem" }}
      >
        <div
          className="admin-header"
          style={{ textAlign: "center", marginBottom: "4rem" }}
        >
          <h1
            className="admin-header-title"
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
            className="admin-header-copy"
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
            <PremiumCard key={idx} className="admin-stat-card" style={{ padding: "1.5rem" }}>
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
                    transition={{
                      duration: 0.14,
                      delay: Math.min(i * 0.01, 0.06),
                    }}
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
                          flexShrink: 0,
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
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontWeight: 700,
                            fontSize: "0.88rem",
                            color: "var(--text)",
                            wordBreak: "break-word",
                          }}
                        >
                          {lead.name}
                        </div>
                        <div
                          style={{
                            fontSize: "0.68rem",
                            color: "var(--text-muted)",
                            wordBreak: "break-all",
                          }}
                        >
                          {lead.email}
                        </div>
                      </div>
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: "0.85rem",
                          fontWeight: 700,
                          color: "var(--text)",
                          wordBreak: "break-word",
                        }}
                      >
                        {lead.serviceName}
                      </div>
                      <div style={{ fontSize: "0.7rem", color: "#22c55e", wordBreak: "break-word" }}>
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
                          color: getStatusTheme(lead).color,
                        }}
                      >
                        <span
                          style={{
                            width: "6px",
                            height: "6px",
                            borderRadius: "50%",
                            background: getStatusTheme(lead).color,
                          }}
                        />
                        {getDisplayStatus(lead)}
                      </span>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteService(lead, e)}
                          title="Delete service"
                          aria-label={`Delete ${lead.serviceName}`}
                          className="admin-delete-btn"
                          style={{
                            width: "24px",
                            height: "24px",
                            border: "none",
                            background: "transparent",
                            color: "#9ca3af",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            flexShrink: 0,
                            transition: "color 0.2s ease",
                            padding: 0,
                            marginBottom: "8px",
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.color = "#d1d5db";
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.color = "#9ca3af";
                          }}
                        >
                          <X size={18} strokeWidth={2.6} />
                        </button>

                        {expandedLeadId === lead._id ? (
                          <ChevronUp size={18} color="#9ca3af" />
                        ) : (
                          <ChevronDown size={18} color="#9ca3af" />
                        )}
                      </div>
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
                        className="admin-expanded-panel"
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
                                  flexShrink: 0,
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
                                    background: getStatusTheme(lead).bg,
                                    border: `1px solid ${getStatusTheme(lead).color}33`,
                                    borderRadius: "12px",
                                    padding: "0.8rem 0.9rem",
                                  }}
                                >
                                  <div
                                    style={{
                                      fontSize: "0.62rem",
                                      fontWeight: 800,
                                      color: getStatusTheme(lead).color,
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
                                    {getDisplayStatus(lead)}
                                  </div>
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
                                    {getDisplayStatus(lead)}
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
                                  Message Recipient
                                </label>
                                <select
                                  className="admin-role-select"
                                  value={messageTarget}
                                  onChange={(e) => {
                                    const nextTarget = e.target.value;
                                    setMessageTarget(nextTarget);
                                    const lead = leads.find(
                                      (item) => item._id === expandedLeadId,
                                    );
                                    setMessageText(
                                      getMessageTextByTarget(lead, nextTarget),
                                    );
                                  }}
                                  style={{
                                    background: "var(--secondary-mid)",
                                    border: "1px solid var(--border)",
                                    color: "var(--text)",
                                    padding: "0.6rem 0.75rem",
                                    borderRadius: "10px",
                                    fontSize: "0.82rem",
                                    outline: "none",
                                    cursor: "pointer",
                                  }}
                                >
                                  <option value="client">Client</option>
                                  <option value="pr">PR</option>
                                  <option value="executor">Executor</option>
                                </select>
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
                                  value={messageText}
                                  onChange={(e) => setMessageText(e.target.value)}
                                  placeholder={
                                    messageTarget === "client"
                                      ? "Write your response to the client..."
                                      : messageTarget === "pr"
                                      ? "Write your message to PR..."
                                      : "Write your message to the executor..."
                                  }
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
                                className="admin-send-msg-btn"
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
                                    className="admin-doc-item"
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
                                        whiteSpace: "nowrap",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
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

                            {/* Removed Admin Actions Section as per Oversight Only requirement */}
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
        
        <ConfirmationModal
          isOpen={deleteConfirm.isOpen}
          title="Delete Service"
          message={`Are you sure you want to delete ${deleteConfirm.lead?.serviceName || "this service"}? This action cannot be undone.`}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteConfirm({ isOpen: false, lead: null, isLoading: false })}
          isLoading={deleteConfirm.isLoading}
        />
      </div>
    </div>
  );
};

export default AdminDashboard;
