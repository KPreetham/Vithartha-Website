import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";
import axios from "axios";
import {
  LayoutDashboard,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  Zap,
  Check,
  Calendar,
  Layers,
  Target,
  Send,
  MessageSquare,
  X,
  Search,
  TrendingUp,
  Eye,
  Briefcase,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import Loader from "../components/Loader";
import ConfirmationModal from "../components/ConfirmationModal";
import {
  formatInr,
  getLeadRevenueAmount,
} from "../utils/servicePricing";
import { shouldCountLeadRevenue } from "../utils/servicePricing";
import { viewDocument } from "../utils/documentViewer";

const PremiumCard = ({ children, style = {}, className = "" }) => (
  <div
    className={className}
    style={{
      background: "linear-gradient(145deg, rgba(18, 20, 34, 0.92) 0%, rgba(11, 13, 24, 0.94) 100%)",
      backdropFilter: "blur(16px)",
      borderRadius: 24,
      border: "1px solid rgba(255,255,255,0.08)",
      boxShadow: "0 18px 40px -24px rgba(0,0,0,0.7)",
      overflow: "hidden",
      position: "relative",
      color: "#ffffff",
      ...style,
    }}
  >
    {children}
  </div>
);

const ExecutorDashboardModern = () => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [messageDrafts, setMessageDrafts] = useState({});
  const [rejectDrafts, setRejectDrafts] = useState({});
  const [rejectingLeadId, setRejectingLeadId] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, lead: null, isLoading: false });
  const [documentsOpen, setDocumentsOpen] = useState(true);
  
  const storedUser = JSON.parse(localStorage.getItem("user"));

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const response = await axios.get(`${apiUrl}/leads`, {
        headers: { Authorization: `Bearer ${storedUser.token}` },
      });
      setLeads(response.data);
      if (response.data.length > 0 && !selectedLeadId) {
        setSelectedLeadId(response.data[0]._id);
      }
    } catch (error) {
      console.error("Error fetching leads:", error);
      toast.error("Failed to load assignments");
    } finally {
      setTimeout(() => setLoading(false), 500);
    }
  };

  const handleStatusUpdate = async (leadId, status, feedback = "") => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const payload = { status };
      if (feedback) {
        payload.prFeedback = feedback;
      }
      
      await axios.patch(
        `${apiUrl}/leads/${leadId}`,
        payload,
        { headers: { Authorization: `Bearer ${storedUser.token}` } }
      );
      toast.success(status === "InProgress" ? "Service accepted" : "Status updated");
      fetchLeads();
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const handleSendMessageToPR = async (leadId, message) => {
    if (!message) return;
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      await axios.patch(
        `${apiUrl}/leads/${leadId}`,
        { executorMessage: message },
        { headers: { Authorization: `Bearer ${storedUser.token}` } }
      );
      toast.success("Message sent to PR");
      setMessageDrafts({ ...messageDrafts, [leadId]: "" });
      fetchLeads();
    } catch (error) {
      toast.error("Failed to send message");
    }
  };

  const handleRejectAssignment = async (leadId) => {
    const reason = String(rejectDrafts[leadId] || "").trim();
    if (!reason) {
      toast.error("Please enter a rejection reason for PR");
      return;
    }

    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      await axios.patch(
        `${apiUrl}/leads/${leadId}`,
        {
          status: "Rejected",
          executorId: storedUser?._id || storedUser?.id,
          executorMessage: `Assignment rejected by executor: ${reason}`,
        },
        { headers: { Authorization: `Bearer ${storedUser.token}` } },
      );

      toast.success("Service rejected and PR notified");
      setRejectDrafts((prev) => ({ ...prev, [leadId]: "" }));
      setRejectingLeadId(null);
      fetchLeads();
    } catch (error) {
      toast.error("Failed to send rejection message");
    }
  };

  const handleClearPrMessage = async (leadId, e) => {
    if (e) e.stopPropagation();
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      await axios.patch(`${apiUrl}/leads/${leadId}`, { prToExecutorMessage: "" }, {
        headers: { Authorization: `Bearer ${storedUser.token}` },
      });
      fetchLeads();
    } catch (error) {
      toast.error("Failed to clear PR message");
    }
  };

  const handleClearAdminMessage = async (leadId, e) => {
    if (e) e.stopPropagation();
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      await axios.patch(`${apiUrl}/leads/${leadId}`, { adminToExecutorMessage: "" }, {
        headers: { Authorization: `Bearer ${storedUser.token}` },
      });
      fetchLeads();
    } catch (error) {
      toast.error("Failed to clear Admin message");
    }
  };

  const handleConfirmDelete = async () => {
    const lead = deleteConfirm.lead;
    setDeleteConfirm((prev) => ({ ...prev, isLoading: true }));
    
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      await axios.delete(`${apiUrl}/leads/${lead._id}`, {
        headers: { Authorization: `Bearer ${storedUser.token}` },
      });
      toast.success("Service deleted");
      setSelectedLeadId(null);
      fetchLeads();
      setDeleteConfirm({ isOpen: false, lead: null, isLoading: false });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete service");
      setDeleteConfirm((prev) => ({ ...prev, isLoading: false }));
    }
  };

  function getVisibleDocuments(lead) {
    const documents = Array.isArray(lead?.documents) ? lead.documents : [];
    const sorted = [...documents].sort((a, b) => {
      const aTime = new Date(a?.uploadedAt || a?.createdAt || 0).getTime();
      const bTime = new Date(b?.uploadedAt || b?.createdAt || 0).getTime();
      return bTime - aTime;
    });
    const grouped = new Map();
    for (const doc of sorted) {
      const key = String(doc?.name || "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      if (!key) continue;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(doc);
    }
    return Array.from(grouped.values()).map((group) => {
      const selected = group.find((doc) => !!doc?.displayReuploaded || !!doc?.reuploaded || String(doc?.status || "").trim().toLowerCase() === "reuploaded") || group[0];
      return {
        ...selected,
        displayReuploaded: !!selected?.displayReuploaded || group.length > 1 || !!selected?.reuploaded || String(selected?.status || "").trim().toLowerCase() === "reuploaded",
      };
    });
  }

  const getDisplayStatus = (lead) => {
    const status = typeof lead === "string" ? lead : lead?.status;
    const s = String(status || "").trim().toLowerCase();
    
    if (s === "rejected") {
      const leadObj = typeof lead === "object" ? lead : null;
      const execMsg = String(leadObj?.executorMessage || "").toLowerCase();
      const prMsg = String(leadObj?.prFeedback || "").toLowerCase();
      const adminMsg = String(leadObj?.adminMessage || "").toLowerCase();
      
      if (
        execMsg.length > 0 ||
        prMsg.includes("executor") ||
        prMsg.includes("assignment") ||
        adminMsg.includes("executor") ||
        adminMsg.includes("assignment")
      ) {
        return "Rejected by Executor";
      }
      return "Rejected by PR";
    }

    const map = {
      Open: "Open",
      PendingReview: "Under Review",
      InformationRequired: "Action Required",
      PR_Accepted: "Awaiting Executor",
      AssignedToExecutor: "Awaiting Executor",
      InProgress: "Service Accepted",
      ExecutionFinished: "Sent for Review",
      DraftSent: "User Review",
      DraftRejected: "Draft Rejected",
      DraftAccepted: "Draft Approved",
      UserAccepted: "Draft Approved",
      Completed: "Completed",
      Closed: "Closed",
    };
    return map[status] || status;
  };

  const getStatusPill = (status) => {
    const colors = {
      Open: { color: "#94a3b8", bg: "rgba(148,163,184,0.1)" },
      PendingReview: { color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
      InformationRequired: { color: "#fb7185", bg: "rgba(251,113,133,0.12)" },
      PR_Accepted: { color: "#38bdf8", bg: "rgba(56,189,248,0.12)" },
      AssignedToExecutor: { color: "#38bdf8", bg: "rgba(56,189,248,0.12)" },
      Completed: { color: "#10b981", bg: "rgba(16,185,129,0.1)" },
      InProgress: { color: "#8b5cf6", bg: "rgba(139,92,246,0.12)" },
      Rejected: { color: "#ef4444", bg: "rgba(239,68,68,0.1)" },
      DraftSent: { color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
      ExecutionFinished: { color: "#22c55e", bg: "rgba(34,197,94,0.12)" },
      DraftAccepted: { color: "#10b981", bg: "rgba(16,185,129,0.1)" },
      UserAccepted: { color: "#10b981", bg: "rgba(16,185,129,0.1)" },
      DraftRejected: { color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
      Closed: { color: "#94a3b8", bg: "rgba(148,163,184,0.1)" },
      default: { color: "#34d399", bg: "rgba(34,197,94,0.1)" }
    };
    return colors[status] || colors.default;
  };

  const isSystemMessage = (msg) => {
    if (!msg) return true;
    const lowMsg = String(msg).toLowerCase();
    const systemPhrases = [
      "draft accepted",
      "user accepted",
      "service accepted",
      "documents rejected",
      "service completed",
      "final return uploaded",
      "waiting for user",
      "pending pr approval",
      "action required",
      "rejected by executor",
      "assignment rejected",
      "draft shared",
      "draft approved",
      "draft rejected",
      "pr reviewing result"
    ];
    return systemPhrases.some(phrase => lowMsg.includes(phrase));
  };

  const activeLead = leads.find(l => l._id === selectedLeadId) || null;
  const filteredLeads = leads.filter(l => 
    l.serviceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l._id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    active: leads.filter(l => ["PR_Accepted", "AssignedToExecutor", "InProgress", "DraftSent", "DraftAccepted", "UserAccepted", "DraftRejected", "InformationRequired"].includes(l.status)).length,
    completed: leads.filter(l => ["ExecutionFinished", "Completed"].includes(l.status)).length,
    revenue: leads.reduce((sum, lead) => sum + (shouldCountLeadRevenue(lead) ? getLeadRevenueAmount(lead) : 0), 0)
  };

  // Progress Calculations
  const allDocs = activeLead ? getVisibleDocuments(activeLead) : [];
  const uploadedDocs = allDocs.filter((doc) => {
    const status = String(doc?.status || "").trim().toLowerCase();
    return ["uploaded", "accepted", "verified", "approved", "completed"].includes(status) || !!doc?.url;
  });
  const totalDocCount = allDocs.length;
  const uploadedDocCount = uploadedDocs.length;
  const getServiceProgressPercent = (lead) => {
    if (!lead) return 0;

    const status = String(lead.status || "").trim();
    const progressByStatus = {
      Open: 10,
      PendingReview: 20,
      InformationRequired: 18,
      PR_Accepted: 32,
      AssignedToExecutor: 45,
      InProgress: 60,
      ExecutionFinished: 75,
      DraftSent: 82,
      DraftAccepted: 92,
      UserAccepted: 92,
      DraftRejected: 70,
      Rejected: 100,
      Closed: 100,
      Completed: 100,
    };

    return progressByStatus[status] ?? 0;
  };
  const progressPercent = getServiceProgressPercent(activeLead);
  
  const getProgressMessage = (lead) => {
    if (!lead) return "";
    const status = lead.status;
    if (status === "Completed") return "The service is successfully completed.";
      if (status === "ExecutionFinished") return "Work submitted. Awaiting PR review.";
    if (status === "InProgress") return "Service accepted. PR will upload the draft document.";
    if (status === "DraftSent") return "Draft shared with client. Awaiting approval.";
    if (status === "AssignedToExecutor") return "Awaiting your acceptance to begin.";
    if (status === "PR_Accepted") return "Documents verified. Ready for executor acceptance.";
    if (status === "PendingReview") return "Documents are being reviewed by PR.";
    if (status === "InformationRequired") return "More information is needed before work can begin.";
    if (status === "Rejected") return "Service was rejected.";
    return "Service is progressing through the workflow.";
  };

  if (loading) return <Loader minimal={true} />;

  return (
    <div className="executor-dashboard-shell" style={{ minHeight: "100vh", background: "var(--bg)", color: "#ffffff", paddingTop: "clamp(102px, 12vw, 124px)", paddingBottom: 64, position: "relative", overflow: "hidden" }}>
      <div className="home-page-backdrop" aria-hidden="true" />
      <style>{`
        .executor-dashboard-shell .dashboard-stat-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
          margin-bottom: 18px;
        }
        .executor-dashboard-shell .dashboard-main-grid {
          display: grid;
          grid-template-columns: 360px minmax(0, 1fr);
          gap: 14px;
          align-items: stretch;
        }
        .executor-dashboard-shell .dashboard-sidebar-scroll,
        .executor-dashboard-shell .dashboard-details-scroll {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          padding-right: 8px;
          margin-right: -8px;
        }
        .executor-dashboard-shell .dashboard-sidebar-container,
        .executor-dashboard-shell .dashboard-details-container {
          height: clamp(500px, 72vh, 850px);
          display: flex;
          flex-direction: column;
        }
        .executor-dashboard-shell .dashboard-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border-radius: 999px;
          font-size: 0.8rem;
          font-weight: 700;
          white-space: nowrap;
        }
        .executor-dashboard-shell .dashboard-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
        }
        .executor-dashboard-shell .dashboard-table th,
        .executor-dashboard-shell .dashboard-table td {
          padding: 13px 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          text-align: left;
        }
        .executor-dashboard-shell .dashboard-table th {
          color: rgba(255, 255, 255, 0.55);
          font-size: 0.8rem;
          font-weight: 700;
        }
        .executor-dashboard-shell .dashboard-controls-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 18px;
        }
        .executor-dashboard-shell .pr-message-box {
          display: flex;
          gap: 10px;
        }
        @media (max-width: 1200px) {
          .executor-dashboard-shell .dashboard-main-grid {
            grid-template-columns: 1fr;
            gap: 20px;
          }
          .executor-dashboard-shell .dashboard-stat-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .executor-dashboard-shell .dashboard-sidebar-container,
          .executor-dashboard-shell .dashboard-details-container {
            height: auto;
            min-height: 450px;
            max-height: 600px;
          }
          .executor-dashboard-shell .dashboard-details-container {
            max-height: none;
          }
        }
        @media (max-width: 768px) {
          .executor-dashboard-shell .dashboard-stat-grid {
            grid-template-columns: 1fr;
          }
          .executor-dashboard-shell .dashboard-table th,
          .executor-dashboard-shell .dashboard-table td {
            padding: 12px 12px;
          }
          .executor-dashboard-shell .dashboard-sidebar-container {
            max-height: 400px;
          }
          .executor-dashboard-shell .dashboard-controls-grid {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 480px) {
          .executor-dashboard-shell .pr-message-box {
            flex-direction: column;
          }
          .executor-dashboard-shell .pr-message-box button {
            width: 100% !important;
            height: 42px !important;
          }
        }
      `}</style>

      <div style={{ maxWidth: 1360, margin: "0 auto", padding: "0 1.25rem 0.5rem", position: "relative", zIndex: 1 }}>
        <div style={{ marginBottom: 40, textAlign: "center" }}>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 700, letterSpacing: "0.05em", color: "var(--text)", textTransform: "uppercase" }}>
            EXECUTOR DASHBOARD
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", marginTop: 8 }}>
            Professional fulfillment coordination and service management portal.
          </p>
        </div>

        <div className="dashboard-stat-grid">
          {[
            { label: "Active Tasks", value: stats.active, icon: Briefcase, color: "#38bdf8" },
            { label: "Completed", value: stats.completed, icon: CheckCircle, color: "#10b981" },
            { label: "Est. Revenue", value: formatInr(stats.revenue), icon: TrendingUp, color: "#22c55e" },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <PremiumCard key={card.label} style={{ padding: 18, minHeight: 115, borderColor: `${card.color}22`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
                <div style={{ width: 58, height: 58, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12, background: `${card.color}18`, color: card.color }}>
                  <Icon size={24} />
                </div>
                <div style={{ fontSize: "0.88rem", fontWeight: 600, color: "#f5f5f5", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>{card.label}</div>
                <div style={{ fontSize: "1.9rem", fontWeight: 800, lineHeight: 1, color: "#ffffff" }}>{card.value}</div>
              </PremiumCard>
            );
          })}
        </div>

        <div className="dashboard-main-grid">
          <PremiumCard className="dashboard-sidebar-container" style={{ padding: 18 }}>
            <div style={{ marginBottom: 14 }}>
              <h2 style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: 4, color: "#ffffff" }}>User Services</h2>
              <p style={{ color: "rgba(255,255,255,0.65)", fontSize: "0.82rem" }}>{filteredLeads.length} service{filteredLeads.length === 1 ? "" : "s"} found</p>
            </div>

            <div style={{ position: "relative", marginBottom: 14 }}>
              <Search size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.45)" }} />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search services..."
                style={{
                  width: "100%",
                  padding: "0.82rem 1rem 0.82rem 2.65rem",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 12,
                  color: "#ffffff",
                  outline: "none",
                }}
              />
            </div>

            <div className="dashboard-sidebar-scroll" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {filteredLeads.length > 0 ? (
                filteredLeads.map((item) => {
                  const selected = item._id === selectedLeadId;
                  const pill = getStatusPill(item.status);
                  return (
                    <motion.div
                      key={item._id}
                      onClick={() => setSelectedLeadId(item._id)}
                      style={{
                        padding: "16px 16px 16px 18px",
                        borderRadius: 16,
                        border: selected ? "1px solid rgba(56,189,248,0.75)" : "1px solid rgba(255,255,255,0.06)",
                        background: selected ? "rgba(56,189,248,0.08)" : "rgba(255,255,255,0.03)",
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 6 }}>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: "0.98rem", fontWeight: 700, marginBottom: 4, whiteSpace: "normal", lineHeight: 1.25 }}>{item.serviceName}</div>
                          <div style={{ color: "rgba(255,255,255,0.65)", fontSize: "0.8rem" }}>{item.name}</div>
                        </div>
                        <span className="dashboard-pill" style={{ color: pill.color, background: pill.bg, border: `1px solid ${pill.color}33`, fontSize: "0.75rem" }}>
                          {getDisplayStatus(item)}
                        </span>
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                <div style={{ padding: 20, textAlign: "center", color: "rgba(255,255,255,0.65)" }}>No tasks found.</div>
              )}
            </div>
          </PremiumCard>

          <PremiumCard className="dashboard-details-container" style={{ padding: 22 }}>
            {activeLead ? (
              <div className="dashboard-details-scroll">
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 18, marginBottom: 20 }}>
                  <div>
                    <h2 style={{ fontSize: "1.45rem", fontWeight: 700, marginBottom: 8, color: "#ffffff" }}>{activeLead.serviceName}</h2>
                    <div style={{ display: "flex", gap: 14, color: "rgba(255,255,255,0.65)", fontSize: "0.84rem" }}>
                      <span>Client: {activeLead.name}</span>
                      <span>ID: #{activeLead._id.slice(-6).toUpperCase()}</span>
                      <span>Value: <strong style={{ color: "#34d399" }}>{formatInr(getLeadRevenueAmount(activeLead))}</strong></span>
                    </div>
                  </div>
                  <span className="dashboard-pill" style={{ ...getStatusPill(activeLead.status), fontSize: "0.9rem", padding: "10px 18px" }}>
                    {getDisplayStatus(activeLead)}
                  </span>
                </div>

                <div style={{ display: "grid", gap: 18 }}>
                  {/* Messages Section */}
                  {activeLead.adminToExecutorMessage && !isSystemMessage(activeLead.adminToExecutorMessage) && (
                    <div style={{ padding: 16, borderRadius: 18, border: "1px solid rgba(16,185,129,0.22)", background: "rgba(16,185,129,0.05)" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 8, color: "#34d399" }}>
                        <strong style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><Sparkles size={16} /> Message from Admin</strong>
                        <button type="button" onClick={(e) => handleClearAdminMessage(activeLead._id, e)} style={{ width: 26, height: 26, borderRadius: 999, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "inherit", cursor: "pointer" }}>×</button>
                      </div>
                      <div style={{ color: "#ffffff", fontSize: "0.95rem" }}>{activeLead.adminToExecutorMessage}</div>
                    </div>
                  )}

                  {activeLead.prToExecutorMessage && !isSystemMessage(activeLead.prToExecutorMessage) && (
                    <div style={{ padding: 16, borderRadius: 18, border: "1px solid rgba(59,130,246,0.22)", background: "rgba(59,130,246,0.05)" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 8, color: "#60a5fa" }}>
                        <strong style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><MessageSquare size={16} /> Message from PR</strong>
                        <button type="button" onClick={(e) => handleClearPrMessage(activeLead._id, e)} style={{ width: 26, height: 26, borderRadius: 999, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "inherit", cursor: "pointer" }}>×</button>
                      </div>
                      <div style={{ color: "#ffffff", fontSize: "0.95rem" }}>{activeLead.prToExecutorMessage}</div>
                    </div>
                  )}

                  {activeLead.prFeedback && !isSystemMessage(activeLead.prFeedback) && (
                    <div style={{ padding: 16, borderRadius: 18, border: "1px solid rgba(239,68,68,0.22)", background: "rgba(239,68,68,0.05)" }}>
                      <div style={{ color: "#ef4444", fontWeight: 800, fontSize: "0.7rem", textTransform: "uppercase", marginBottom: 8 }}>Internal Note (PR)</div>
                      <div style={{ color: "#fff", fontSize: "0.95rem" }}>{activeLead.prFeedback}</div>
                    </div>
                  )}

                  {activeLead.userMessage && !isSystemMessage(activeLead.userMessage) && (
                    <div style={{ padding: 16, borderRadius: 18, border: "1px solid rgba(139,92,246,0.22)", background: "rgba(139,92,246,0.05)" }}>
                      <div style={{ color: "#a78bfa", fontWeight: 800, fontSize: "0.7rem", textTransform: "uppercase", marginBottom: 8 }}>Message from Client</div>
                      <div style={{ color: "#fff", fontSize: "0.95rem" }}>{activeLead.userMessage}</div>
                    </div>
                  )}

                  {/* Progress Bar Section */}
                  <PremiumCard style={{ padding: 16, borderRadius: 18 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1.35fr auto", gap: 14, alignItems: "center" }}>
                      <div>
                        <div style={{ color: "rgba(255,255,255,0.65)", fontSize: "0.82rem", marginBottom: 8 }}>Service Progress</div>
                        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                          <span style={{ fontSize: "1.55rem", fontWeight: 800 }}>{uploadedDocCount}</span>
                          <span style={{ color: "rgba(255,255,255,0.65)", fontSize: "0.88rem" }}>/ {totalDocCount || 0} docs</span>
                        </div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        <div style={{ width: "100%", height: 10, background: "rgba(255,255,255,0.05)", borderRadius: 999, overflow: "hidden" }}>
                          <div style={{ width: `${progressPercent}%`, height: "100%", borderRadius: 999, background: "linear-gradient(90deg, #38bdf8, #10b981)" }} />
                        </div>
                        <div style={{ color: "rgba(255,255,255,0.65)", fontSize: "0.84rem" }}>{getProgressMessage(activeLead)}</div>
                      </div>
                      <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "#e5e7eb" }}>{progressPercent}%</div>
                    </div>
                  </PremiumCard>

                  {/* Documents Section */}
                  <PremiumCard style={{ padding: 0 }}>
                    <div 
                      onClick={() => setDocumentsOpen(!documentsOpen)}
                      style={{ padding: "14px 16px", borderBottom: documentsOpen ? "1px solid rgba(255,255,255,0.06)" : "none", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", userSelect: "none" }}
                    >
                      <h3 style={{ fontSize: "0.9rem", fontWeight: 600, color: "#ffffff" }}>Reference Documents</h3>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.65)" }}>{getVisibleDocuments(activeLead).length} total</span>
                        <ChevronDown size={18} style={{ transform: documentsOpen ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.3s ease", color: "rgba(255,255,255,0.4)" }} />
                      </div>
                    </div>
                    <AnimatePresence>
                      {documentsOpen && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          style={{ overflow: "hidden" }}
                        >
                          <div style={{ overflowX: "auto" }}>
                            <table className="dashboard-table">
                              <thead>
                                <tr>
                                  <th>Document Name</th>
                                  <th>Type</th>
                                  <th style={{ textAlign: "right" }}>Action</th>
                                </tr>
                              </thead>
                              <tbody>
                                {getVisibleDocuments(activeLead).map((doc) => (
                                  <tr key={doc._id}>
                                    <td>
                                      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                          <FileText size={16} color="#38bdf8" />
                                          <span style={{ fontSize: "0.85rem", fontWeight: 500 }}>{doc.name}</span>
                                        </div>
                                        {doc.displayReuploaded && (
                                          <div style={{ marginLeft: 26, marginTop: 4, color: "#38bdf8", fontSize: "0.76rem", fontWeight: 700 }}>
                                            Reuploaded
                                          </div>
                                        )}
                                      </div>
                                    </td>
                                    <td>
                                      <span style={{ fontSize: "0.7rem", fontWeight: 700, padding: "4px 8px", borderRadius: 6, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>{doc.type}</span>
                                    </td>
                                    <td style={{ textAlign: "right" }}>
                                      <button onClick={() => viewDocument(doc.publicId, doc.url, activeLead._id)} style={{ padding: "6px 12px", borderRadius: 8, background: "rgba(56,189,248,0.1)", color: "#38bdf8", border: "1px solid rgba(56,189,248,0.2)", cursor: "pointer", fontSize: "0.75rem", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 6 }}>
                                        VIEW <Eye size={14} />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </PremiumCard>

                  {/* Controls Section */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <PremiumCard style={{ padding: 18 }}>
                      <h4 style={{ fontSize: "0.85rem", fontWeight: 700, marginBottom: 12 }}>Workflow Actions</h4>
                      {["PR_Accepted", "AssignedToExecutor"].includes(activeLead.status) ? (
                        <div style={{ display: "flex", gap: 10 }}>
                          <button onClick={() => handleStatusUpdate(activeLead._id, "InProgress")} style={{ flex: 1, padding: "12px", borderRadius: 12, background: "#10b981", color: "#fff", border: "none", fontWeight: 800, cursor: "pointer" }}>Accept Service</button>
                          <button onClick={() => setRejectingLeadId(activeLead._id)} style={{ flex: 1, padding: "12px", borderRadius: 12, background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)", fontWeight: 800, cursor: "pointer" }}>Reject Service</button>
                        </div>
                      ) : activeLead.status === "InProgress" ? (
                        <div style={{ padding: "12px", borderRadius: 12, background: "rgba(56,189,248,0.08)", border: "1px solid rgba(56,189,248,0.2)", color: "#38bdf8", fontWeight: 800, textAlign: "center" }}>
                          Service accepted. PR will upload the draft document.
                        </div>
                      ) : (
                        <div style={{ padding: "12px", borderRadius: 12, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", color: "#10b981", fontWeight: 800, textAlign: "center" }}>
                          Current Phase: {getDisplayStatus(activeLead)}
                        </div>
                      )}

                      {rejectingLeadId === activeLead._id && (
                        <div style={{ marginTop: 14, padding: 14, background: "rgba(239,68,68,0.05)", borderRadius: 12, border: "1px solid rgba(239,68,68,0.2)" }}>
                          <textarea 
                            value={rejectDrafts[activeLead._id] || ""} 
                            onChange={(e) => setRejectDrafts({...rejectDrafts, [activeLead._id]: e.target.value})}
                            placeholder="Reason for rejecting this service..." 
                            style={{ width: "100%", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: 10, color: "#fff", fontSize: "0.85rem", marginBottom: 10 }}
                          />
                          <div style={{ display: "flex", gap: 8 }}>
                            <button onClick={() => handleRejectAssignment(activeLead._id)} style={{ flex: 1, padding: "8px", background: "#ef4444", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: "0.75rem" }}>Confirm Reject</button>
                            <button onClick={() => setRejectingLeadId(null)} style={{ flex: 1, padding: "8px", background: "transparent", color: "#fff", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontWeight: 700, fontSize: "0.75rem" }}>Cancel</button>
                          </div>
                        </div>
                      )}
                    </PremiumCard>

                    <PremiumCard style={{ padding: 18 }}>
                      <h4 style={{ fontSize: "0.85rem", fontWeight: 700, marginBottom: 12 }}>Message to PR</h4>
                      <div style={{ display: "flex", gap: 10 }}>
                        <input 
                          value={messageDrafts[activeLead._id] || ""} 
                          onChange={(e) => setMessageDrafts({...messageDrafts, [activeLead._id]: e.target.value})}
                          placeholder="Type message..." 
                          style={{ flex: 1, background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "10px 14px", color: "#fff", outline: "none" }} 
                        />
                        <button onClick={() => handleSendMessageToPR(activeLead._id, messageDrafts[activeLead._id])} style={{ width: 44, height: 44, borderRadius: 12, background: "#8b5cf6", color: "#fff", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                          <Send size={18} />
                        </button>
                      </div>
                      {activeLead.executorMessage && (
                        <div style={{ marginTop: 12, padding: 10, background: "rgba(139,92,246,0.05)", borderRadius: 10, border: "1px dashed rgba(139,92,246,0.3)", fontSize: "0.8rem", color: "#a78bfa", fontStyle: "italic" }}>
                          Last sent: "{activeLead.executorMessage}"
                        </div>
                      )}
                    </PremiumCard>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: "grid", placeItems: "center", minHeight: 400, color: "rgba(255,255,255,0.65)" }}>
                Select an assignment from the sidebar to view details.
              </div>
            )}
          </PremiumCard>
        </div>

        <ConfirmationModal
          isOpen={deleteConfirm.isOpen}
          title="Delete Assignment"
          message={`Are you sure you want to delete ${deleteConfirm.lead?.serviceName}?`}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteConfirm({ isOpen: false, lead: null, isLoading: false })}
          isLoading={deleteConfirm.isLoading}
        />
      </div>
    </div>
  );
};

export default ExecutorDashboardModern;
