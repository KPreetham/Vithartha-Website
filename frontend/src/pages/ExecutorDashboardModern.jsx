import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";
import axios from "axios";
import {
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  Eye,
  FileText,
  Search,
  Send,
  Upload,
  TrendingUp,
  X,
  Sparkles,
  RefreshCw,
  MessageSquare,
  Briefcase,
} from "lucide-react";
import Loader from "../components/Loader";
import ConfirmationModal from "../components/ConfirmationModal";
import {
  formatInr,
  getLeadRevenueAmount,
  shouldCountLeadRevenue,
} from "../utils/servicePricing";
import { viewDocument } from "../utils/documentViewer";
import {
  loadHiddenServiceIds,
  saveHiddenServiceIds,
} from "../utils/hiddenServiceStorage";

const PremiumCard = ({ children, style = {}, className = "" }) => (
  <div
    className={className}
    style={{
      background: "linear-gradient(145deg, #ffffff 0%, #f9fafb 100%)",
      backdropFilter: "blur(16px)",
      borderRadius: 24,
      border: "1px solid rgba(17,24,39,0.08)",
      boxShadow: "0 18px 40px -28px rgba(17,24,39,0.18)",
      overflow: "hidden",
      position: "relative",
      color: "#111111",
      ...style,
    }}
  >
    {children}
  </div>
);

const CountUp = ({ end, duration = 1200, formatter = (v) => v }) => {
  const [count, setCount] = React.useState(0);

  React.useEffect(() => {
    let startTime = null;
    const startValue = 0;
    let animationFrame;

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      const currentValue = Math.floor(easedProgress * (end - startValue) + startValue);
      
      setCount(currentValue);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        setCount(end);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration]);

  return <>{formatter(count)}</>;
};

const ExecutorDashboardModern = () => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [messageDrafts, setMessageDrafts] = useState({});
  const [rejectDrafts, setRejectDrafts] = useState({});
  const [rejectingLeadId, setRejectingLeadId] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, lead: null, isLoading: false });
  const [localDeleteConfirm, setLocalDeleteConfirm] = useState({ isOpen: false, lead: null });
  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const currentUserId = storedUser?._id || storedUser?.id || "";
  const [hiddenLeads, setHiddenLeads] = useState(() => loadHiddenServiceIds("executor-dashboard", currentUserId));
  const [documentsOpen, setDocumentsOpen] = useState(true);
  const [syncedSidebarHeight, setSyncedSidebarHeight] = useState(null);
  const detailsPanelRef = useRef(null);
  const [isCompactMobile, setIsCompactMobile] = useState(
    () => (typeof window !== "undefined" ? window.innerWidth <= 480 : false),
  );
  const [isMobile, setIsMobile] = useState(
    () => (typeof window !== "undefined" ? window.innerWidth <= 768 : false),
  );

  useEffect(() => {
    setHiddenLeads(loadHiddenServiceIds("executor-dashboard", currentUserId));
  }, [currentUserId]);

  useEffect(() => {
    saveHiddenServiceIds("executor-dashboard", currentUserId, hiddenLeads);
  }, [currentUserId, hiddenLeads]);

  useEffect(() => {
    fetchLeads();
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setIsCompactMobile(window.innerWidth <= 480);
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const syncSidebarHeight = () => {
      if (window.innerWidth <= 1200) {
        setSyncedSidebarHeight(null);
        return;
      }

      const detailsNode = detailsPanelRef.current;
      if (!detailsNode) {
        setSyncedSidebarHeight(null);
        return;
      }

      const nextHeight = Math.ceil(detailsNode.getBoundingClientRect().height);
      setSyncedSidebarHeight((current) => (current === nextHeight ? current : nextHeight));
    };

    syncSidebarHeight();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", syncSidebarHeight);
      return () => window.removeEventListener("resize", syncSidebarHeight);
    }

    const observer = new ResizeObserver(syncSidebarHeight);
    if (detailsPanelRef.current) {
      observer.observe(detailsPanelRef.current);
    }
    window.addEventListener("resize", syncSidebarHeight);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", syncSidebarHeight);
    };
  }, [selectedLeadId, documentsOpen]);

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
      toast.success(status === "InProgress" ? "Accepted by Executor" : "Status updated");
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

  const handleConfirmLocalDelete = () => {
    const lead = localDeleteConfirm.lead;
    if (!lead) return;
    setHiddenLeads((prev) => (prev.includes(lead._id) ? prev : [...prev, lead._id]));
    toast.success("Service removed from view");
    setLocalDeleteConfirm({ isOpen: false, lead: null });
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
    let documents = Array.isArray(lead?.documents) ? lead.documents : [];
    
    // Filter out draft documents that haven't been sent yet
    const isDraftSent = ["DraftSent", "DraftAccepted", "DraftRejected", "UserAccepted", "Completed"].includes(lead?.status);
    if (!isDraftSent) {
      documents = documents.filter(doc => String(doc?.type || "").trim().toLowerCase() !== "draft");
    }

    const sorted = [...documents].sort((a, b) => {
      const aTime = new Date(a?.uploadedAt || a?.createdAt || 0).getTime();
      const bTime = new Date(b?.uploadedAt || b?.createdAt || 0).getTime();
      return bTime - aTime;
    });
    const latestDraft = sorted.find((doc) => String(doc?.type || "").trim().toLowerCase() === "draft");
    const latestFinal = sorted.find((doc) => String(doc?.type || "").trim().toLowerCase() === "final");
    const nonSpecialDocs = sorted.filter((doc) => {
      const type = String(doc?.type || "").trim().toLowerCase();
      return type !== "draft" && type !== "final";
    });
    const grouped = new Map();
    for (const doc of nonSpecialDocs) {
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
    const collapsed = Array.from(grouped.values()).map((group) => {
      const selected = group.find((doc) => !!doc?.displayReuploaded || !!doc?.reuploaded || String(doc?.status || "").trim().toLowerCase() === "reuploaded") || group[0];
      const draftRejected = String(lead?.status || "").trim().toLowerCase() === "draftrejected";
      const isDraftDocument = String(selected?.type || "").trim().toLowerCase() === "draft";
      return {
        ...selected,
        status: draftRejected && isDraftDocument ? "Rejected" : selected?.status,
        displayReuploaded: !!selected?.displayReuploaded || group.length > 1 || !!selected?.reuploaded || String(selected?.status || "").trim().toLowerCase() === "reuploaded",
      };
    });

    const appendedDocs = [];

    if (latestDraft) {
      appendedDocs.push({
        ...latestDraft,
        status: String(lead?.status || "").trim().toLowerCase() === "draftrejected" ? "Rejected" : latestDraft?.status,
        displayReuploaded:
          !!latestDraft?.displayReuploaded ||
          !!latestDraft?.reuploaded ||
          String(latestDraft?.status || "").trim().toLowerCase() === "reuploaded",
      });
    }

    if (latestFinal) {
      appendedDocs.push({
        ...latestFinal,
        status: latestFinal?.status,
        displayReuploaded:
          !!latestFinal?.displayReuploaded ||
          !!latestFinal?.reuploaded ||
          String(latestFinal?.status || "").trim().toLowerCase() === "reuploaded",
      });
    }

    return [...collapsed, ...appendedDocs];
  }

  function hasFinalDocument(lead) {
    return getVisibleDocuments(lead).some((doc) => {
      const docType = String(doc?.type || "").trim().toLowerCase();
      const docName = String(doc?.name || "").trim().toLowerCase();
      return docType === "final" || docName.startsWith("final");
    });
  }

  function getEffectiveServiceStatus(lead) {
    const rawStatus = String(lead?.status || "").trim();
    const rawStatusLower = rawStatus.toLowerCase();

    if (hasFinalDocument(lead) && !["rejected", "informationrequired"].includes(rawStatusLower)) {
      return "Completed";
    }

    return rawStatus;
  }

  function getDocumentDisplayStatus(lead, doc) {
    const leadStatusLower = String(lead?.status || "").trim().toLowerCase();
    const isDraftDocument = String(doc?.type || "").trim().toLowerCase() === "draft";
    const rawStatus = String(doc?.status || "").trim().toLowerCase();

    if (isDraftDocument) {
      if (["draftaccepted", "useraccepted", "completed"].includes(leadStatusLower)) return "Accepted";
      if (leadStatusLower === "draftrejected") return "Rejected";
      if (leadStatusLower === "draftsent") return "Draft Shared";
      if (["accepted", "verified", "approved", "completed"].includes(rawStatus)) return "Draft Uploaded";
      if (rawStatus === "rejected") return "Rejected";
      return "Draft Uploaded";
    }

    if (leadStatusLower === "rejected") return "Rejected";
    if (["accepted", "verified", "approved", "completed", "uploaded"].includes(rawStatus)) return "Accepted";
    if (rawStatus === "rejected") return "Rejected";
    if (["pending", "pendingreview", "", "waiting review"].includes(rawStatus)) return "Pending Review";
    return doc?.status || "Pending Review";
  }

  const getDisplayStatus = (lead) => {
    const status = typeof lead === "string" ? lead : getEffectiveServiceStatus(lead);
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
      InformationRequired: "Rejected by PR",
      PR_Accepted: "Awaiting Executor",
      AssignedToExecutor: "Awaiting Executor",
      InProgress: "Accepted by Executor",
      ExecutionFinished: "Draft Uploaded",
      DraftSent: "Draft Sent to Client",
      DraftRejected: "Draft Rejected by User",
      DraftAccepted: "Accepted",
      UserAccepted: "Accepted",
      Completed: "Completed",
      Closed: "Closed",
    };
    return map[status] || status;
  };

  const getStatusTheme = (lead) => {
    const status = getEffectiveServiceStatus(lead);
    const colors = {
      Open: { color: "#6b7280" },
      PendingReview: { color: "#f59e0b" },
      InformationRequired: { color: "#fb7185" },
      PR_Accepted: { color: "#0ea5e9" },
      AssignedToExecutor: { color: "#0ea5e9" },
      Completed: { color: "#16a34a" },
      InProgress: { color: "#16a34a" },
      Rejected: { color: "#ef4444" },
      DraftSent: { color: "#f59e0b" },
      ExecutionFinished: { color: "#16a34a" },
      DraftAccepted: { color: "#16a34a" },
      UserAccepted: { color: "#16a34a" },
      DraftRejected: { color: "#ef4444" },
      Closed: { color: "#6b7280" },
      default: { color: "#16a34a" }
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

  const visibleLeads = leads.filter((lead) => !hiddenLeads.includes(lead._id));
  const activeLead = visibleLeads.find((lead) => lead._id === selectedLeadId) || null;
  const filteredLeads = visibleLeads.filter(l => 
    (
      l.serviceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l._id.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  useEffect(() => {
    if (!filteredLeads.length) {
      if (selectedLeadId !== null) setSelectedLeadId(null);
      return;
    }

    if (!filteredLeads.some((lead) => lead._id === selectedLeadId)) {
      setSelectedLeadId(filteredLeads[0]?._id || null);
    }
  }, [filteredLeads, selectedLeadId]);

  const stats = {
    active: visibleLeads.filter((l) => ["PR_Accepted", "AssignedToExecutor", "InProgress", "DraftSent", "DraftAccepted", "UserAccepted", "DraftRejected", "InformationRequired"].includes(getEffectiveServiceStatus(l))).length,
    completed: visibleLeads.filter((l) => getEffectiveServiceStatus(l) === "Completed").length,
    revenue: visibleLeads.reduce((sum, lead) => sum + (shouldCountLeadRevenue(lead) ? getLeadRevenueAmount(lead) : 0), 0)
  };

  const allDocs = activeLead ? getVisibleDocuments(activeLead) : [];
  const uploadedDocs = allDocs.filter((doc) => {
    const status = String(doc?.status || "").trim().toLowerCase();
    return ["uploaded", "accepted", "verified", "approved", "completed"].includes(status) || !!doc?.url;
  });
  const totalDocCount = allDocs.length;
  const uploadedDocCount = uploadedDocs.length;
  
  const getServiceProgressPercent = (lead) => {
    if (!lead) return 0;
    
    // Standardize percentages across all dashboards
    if (lead.status === "Rejected" && String(lead?.executorMessage || "").length > 0) return 20;
    if (lead.status === "InformationRequired") return 20;

    const status = getEffectiveServiceStatus(lead);
    const progressByStatus = {
      Open: 10,
      PendingReview: 20,
      InformationRequired: 20,
      PR_Accepted: 32,
      AssignedToExecutor: 45,
      InProgress: 60,
      ExecutionFinished: 75,
      DraftSent: 82,
      DraftAccepted: 92,
      UserAccepted: 92,
      DraftRejected: 70,
      Rejected: 100,
      Completed: 100,
      Closed: 100,
    };
    return progressByStatus[status] ?? 0;
  };
  const progressPercent = getServiceProgressPercent(activeLead);
  
  const getProgressMessage = (lead) => {
    if (!lead) return "";
    const status = getEffectiveServiceStatus(lead);
    const statusMap = {
      Open: "Pending verification and initial review.",
      PendingReview: "Documents are being reviewed by PR.",
      InformationRequired: "Service rejected by PR. Action required.",
      PR_Accepted: "Documents verified. Awaiting executor assignment.",
      AssignedToExecutor: "Executor assigned. Service is starting.",
      InProgress: "Accepted by Executor.",
      ExecutionFinished: "Draft uploaded by PR. Awaiting user approval.",
      DraftSent: "Draft sent to client. Awaiting user approval.",
      DraftAccepted: "Draft approved. Waiting for final completion.",
      UserAccepted: "Draft approved. Waiting for final completion.",
      DraftRejected: "Draft rejected. Waiting for revision.",
      Rejected: "Service has been rejected.",
      Completed: "Service completed successfully.",
    };
    return statusMap[status] || "Service is progressing through the workflow.";
  };

  const containerStyle = {
    minHeight: "100vh",
    background: "radial-gradient(circle at top, rgba(248, 250, 252, 1) 0%, rgba(241, 245, 249, 1) 50%, rgba(226, 232, 240, 1) 100%)",
    color: "#111111",
    paddingTop: isCompactMobile ? "clamp(112px, 16vw, 126px)" : "clamp(130px, 14vw, 150px)",
    paddingBottom: 64,
    position: "relative",
    overflow: "hidden",
  };

  if (loading) return <Loader minimal={true} />;

  return (
    <div className="home-page-shell executor-dashboard-shell" style={containerStyle}>
      <div className="home-page-backdrop" style={{ background: "#f8fafc" }} aria-hidden="true" />
      <style>{`
        .executor-dashboard-shell, .executor-dashboard-shell * {
          box-sizing: border-box;
        }
        .executor-dashboard-shell .dashboard-stat-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          margin-bottom: 0;
          align-items: stretch;
        }
        .executor-dashboard-shell .dashboard-shell {
          width: 100%;
          background: #f4f4f5;
          border: 1px solid rgba(17,24,39,0.08);
          border-radius: 0;
          box-shadow: none;
          overflow: hidden;
        }
        .executor-dashboard-shell .stat-card {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: default;
        }
        .executor-dashboard-shell .stat-card:hover {
          transform: translateY(-6px) scale(1.03);
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04) !important;
          border-color: rgba(17,24,39,0.18) !important;
          z-index: 10;
        }
        .executor-dashboard-shell .dashboard-shell-inner {
          padding: 10px 14px 10px;
        }
        .executor-dashboard-shell .dashboard-main-grid {
          display: grid;
          grid-template-columns: 360px 1px minmax(0, 1fr);
          gap: 0;
          align-items: start;
          background: #ffffff;
          border: 1px solid rgba(17,24,39,0.12);
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 0 4px 20px -12px rgba(0, 0, 0, 0.08);
        }
        .executor-dashboard-shell .dashboard-panels-divider {
          background: rgba(17,24,39,0.08);
          align-self: stretch;
          border-radius: 0;
        }
        .executor-dashboard-shell .dashboard-service-row {
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .executor-dashboard-shell .dashboard-service-row:hover {
          transform: scale(1.015) translateY(-2px);
          box-shadow: 0 6px 15px -4px rgba(0, 0, 0, 0.08);
          border-color: rgba(34, 197, 94, 0.2) !important;
          z-index: 2;
        }
        .executor-dashboard-shell .inner-card {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .executor-dashboard-shell .inner-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 20px -10px rgba(0, 0, 0, 0.12) !important;
          border-color: rgba(17,24,39,0.18) !important;
        }
        .executor-dashboard-shell .dashboard-sidebar-panel {
          height: auto;
          min-height: 0;
          display: flex;
          flex-direction: column;
          align-self: start;
        }
        .executor-dashboard-shell .dashboard-details-panel {
          height: auto;
          display: flex;
          flex-direction: column;
          align-self: start;
        }
        .executor-dashboard-shell .dashboard-sidebar-scroll,
        .executor-dashboard-shell .dashboard-details-scroll {
          flex: 0 0 auto;
          min-height: auto;
          overflow: visible;
          padding-right: 0;
          margin-right: 0;
        }
        .executor-dashboard-shell .dashboard-sidebar-scroll {
          height: 0;
          scrollbar-width: thin;
          scrollbar-color: #b8b8b8 transparent;
        }
        .executor-dashboard-shell .dashboard-sidebar-scroll::-webkit-scrollbar {
          width: 6px;
        }
        .executor-dashboard-shell .dashboard-sidebar-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .executor-dashboard-shell .dashboard-sidebar-scroll::-webkit-scrollbar-thumb {
          background: #b8b8b8;
          border-radius: 999px;
        }
        .executor-dashboard-shell .dashboard-sidebar-scroll::-webkit-scrollbar-thumb:hover {
          background: #9ca3af;
        }
        .executor-dashboard-shell .dashboard-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
        }
        .executor-dashboard-shell .dashboard-table th,
        .executor-dashboard-shell .dashboard-table td {
          padding: 13px 16px;
          border-bottom: 1px solid rgba(17, 24, 39, 0.08);
          text-align: left;
        }
        .executor-dashboard-shell .dashboard-table th {
          color: #6b7280;
          font-size: 0.8rem;
          font-weight: 700;
        }
        .executor-dashboard-shell .dashboard-search,
        .executor-dashboard-shell .dashboard-input {
          transition: all 0.2s ease;
        }
        .executor-dashboard-shell .dashboard-search:focus,
        .executor-dashboard-shell .dashboard-input:focus {
          border-color: #16a34a !important;
          box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.1);
          outline: none;
        }
        .executor-dashboard-shell .dashboard-documents-scroll {
          overflow-x: auto;
          overflow-y: hidden;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: thin;
          scrollbar-color: #b8b8b8 transparent;
          padding-bottom: 4px;
        }
        .executor-dashboard-shell .dashboard-documents-scroll::-webkit-scrollbar {
          height: 6px;
        }
        .executor-dashboard-shell .dashboard-documents-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .executor-dashboard-shell .dashboard-documents-scroll::-webkit-scrollbar-thumb {
          background: #b8b8b8;
          border-radius: 999px;
        }
        .executor-dashboard-shell .dashboard-documents-scroll::-webkit-scrollbar-thumb:hover {
          background: #9ca3af;
        }

        @media (max-width: 1200px) {
          .executor-dashboard-shell .dashboard-stat-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .executor-dashboard-shell .dashboard-main-grid {
            grid-template-columns: minmax(0, 1fr);
          }
          .executor-dashboard-shell .dashboard-panels-divider {
            display: none;
          }
        }
        @media (max-width: 768px) {
          .executor-dashboard-shell .dashboard-stat-grid {
            grid-template-columns: minmax(0, 1fr);
          }
          .executor-dashboard-shell .dashboard-documents-scroll .dashboard-table {
            min-width: 520px;
          }
          .executor-dashboard-shell .dashboard-sidebar-panel {
            height: auto;
            min-height: 0;
            max-height: 350px;
          }
          .executor-dashboard-shell .dashboard-sidebar-scroll {
            height: auto;
          }
          .executor-dashboard-shell .dashboard-details-panel {
            min-height: 0;
            max-height: none;
          }
        }
        @media (max-width: 480px) {
          .executor-dashboard-shell .dashboard-shell-inner {
            padding: 8px 10px 10px;
          }
          .executor-dashboard-shell .dashboard-main-grid {
            border-radius: 18px;
          }
          .executor-dashboard-shell .dashboard-sidebar-panel,
          .executor-dashboard-shell .dashboard-details-panel {
            padding: 14px 12px;
          }
          .executor-dashboard-shell .dashboard-table th,
          .executor-dashboard-shell .dashboard-table td {
            padding: 10px 10px;
            font-size: 0.76rem;
          }
        }
@media (max-width: 360px) {
  .executor-dashboard-shell .dashboard-shell-inner {
    padding: 6px 8px 8px;
  }
  .executor-dashboard-shell .dashboard-main-grid {
    gap: 8px;
  }
  .executor-dashboard-shell h1, .executor-dashboard-shell h2, .executor-dashboard-shell h3, .executor-dashboard-shell h4 {
    font-size: 0.85rem;
  }
  .executor-dashboard-shell .dashboard-table th,
  .executor-dashboard-shell .dashboard-table td {
    padding: 6px 8px;
    font-size: 0.7rem;
  }
  .executor-dashboard-shell .dashboard-search,
  .executor-dashboard-shell .dashboard-input {
    padding: 0.6rem 0.9rem 0.6rem 2rem;
    font-size: 0.78rem;
  }
}
      `}</style>

      <div style={{ width: "100%", maxWidth: "none", margin: 0, padding: "0 0 0.5rem", position: "relative", zIndex: 1 }}>
        <div style={{ marginBottom: isCompactMobile ? 24 : 40, textAlign: "center", padding: isCompactMobile ? "0 8px" : 0 }}>
          <h1 style={{ fontSize: isCompactMobile ? "1.65rem" : "2.2rem", fontWeight: 800, color: "#111111", letterSpacing: "-0.02em", marginBottom: isCompactMobile ? 8 : 12, lineHeight: 1.2 }}>
            Executor <span style={{ color: "#16a34a" }}>Dashboard</span>
          </h1>
          <p style={{ color: "#4b5563", fontSize: isCompactMobile ? "0.92rem" : "1.05rem", marginTop: 8, maxWidth: 700, margin: "0 auto", lineHeight: 1.5 }}>
            Track and Manage Client Service Documents.
          </p>
        </div>

        <div className="dashboard-shell">
          <div className="dashboard-shell-inner">
            <div className="dashboard-stat-grid">
              {[
                { label: "Active Services", value: stats.active, color: "#16a34a" },
                { label: "Completed Services", value: stats.completed, color: "#16a34a" },
                { label: "Revenue (₹)", value: stats.revenue, color: "#16a34a", isMoney: true },
              ].map((card) => (
                <PremiumCard
                  key={card.label}
                  className="stat-card"
                  style={{
                    padding: 12,
                    minHeight: 92,
                    background: "#ffffff",
                    border: "1px solid rgba(17,24,39,0.08)",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    textAlign: "center",
                    borderRadius: 16,
                  }}
                >
                  <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#111111", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
                    {card.label}
                  </div>
                  <div style={{ fontSize: "1.44rem", fontWeight: 500, lineHeight: 1, color: card.color }}>
                    {card.isMoney ? (
                      <CountUp end={card.value} formatter={(v) => formatInr(v)} />
                    ) : (
                      <CountUp end={card.value} />
                    )}
                  </div>
                </PremiumCard>
              ))}
            </div>
          </div>
          <div style={{ height: 1, width: "100%", background: "rgba(17,24,39,0.08)", margin: "6px 0 8px 0" }} />
          
          <div className="dashboard-shell-inner" style={{ paddingTop: 0 }}>
            <div className="dashboard-main-grid">
              <div
                className="dashboard-sidebar-panel"
                style={{
                  padding: isMobile ? "16px 12px" : "20px 18px",
                  background: "#ffffff",
                  height: syncedSidebarHeight ? `${syncedSidebarHeight}px` : "auto",
                  maxHeight: syncedSidebarHeight ? `${syncedSidebarHeight}px` : "none",
                  overflow: syncedSidebarHeight ? "hidden" : "visible",
                }}
              >
                <div style={{ marginBottom: 14 }}>
                  <h2 style={{ fontSize: isMobile ? "0.98rem" : "1.05rem", fontWeight: 700, marginBottom: 4, color: "#111111" }}>User Services</h2>
                  <p style={{ color: "#6b7280", fontSize: isMobile ? "0.77rem" : "0.82rem" }}>{filteredLeads.length} request{filteredLeads.length === 1 ? "" : "s"}</p>
                </div>

                <div style={{ position: "relative", marginBottom: 14 }}>
                  <Search size={16} style={{ position: "absolute", left: isMobile ? 12 : 14, top: "50%", transform: "translateY(-50%)", color: "#6b7280" }} />
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search services..."
                    className="dashboard-search"
                    style={{
                      width: "100%",
                      padding: isMobile ? "0.76rem 0.9rem 0.76rem 2.45rem" : "0.82rem 1rem 0.82rem 2.65rem",
                      background: "#ffffff",
                      border: "1px solid rgba(17,24,39,0.08)",
                      borderRadius: 12,
                      color: "#111111",
                      outline: "none",
                    }}
                  />
                </div>

                <div className="dashboard-sidebar-scroll" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {filteredLeads.length > 0 ? (
                    filteredLeads.map((item, index) => {
                      const selected = item._id === selectedLeadId;
                      const theme = getStatusTheme(item);
                      return (
                        <motion.div
                           key={item._id}
                           initial={{ opacity: 0, y: 8 }}
                           animate={{ opacity: 1, y: 0 }}
                           transition={{ duration: 0.14, delay: Math.min(index * 0.02, 0.12) }}
                           onClick={() => setSelectedLeadId(item._id)}
                           className={`dashboard-service-row ${selected ? "active" : ""}`}
                           style={{
                             padding: isMobile ? "14px 12px" : "16px 16px 16px 18px",
                             borderRadius: 16,
                             border: selected ? "1px solid rgba(34,197,94,0.45)" : "1px solid rgba(17,24,39,0.08)",
                             background: selected ? "rgba(16,185,129,0.08)" : "#ffffff",
                             cursor: "pointer",
                           }}
                        >
                           <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "flex-start" : "center", justifyContent: "space-between", gap: isMobile ? 8 : 10, marginBottom: 6 }}>
                             <div style={{ minWidth: 0, flex: 1 }}>
                               <div style={{ fontSize: isMobile ? "0.92rem" : "0.98rem", fontWeight: 700, marginBottom: 4, whiteSpace: "normal", lineHeight: 1.25, color: "#111111" }}>{item.serviceName}</div>
                               <div style={{ color: "#6b7280", fontSize: "0.8rem" }}>{item.name}</div>
                             </div>
                             <span style={{ color: theme.color, fontSize: "0.86rem", fontWeight: 700, display: "flex", alignItems: "center", gap: 6, marginLeft: isMobile ? 0 : "auto" }}>
                               {getEffectiveServiceStatus(item) === "Completed" && <CheckCircle size={14} />}
                               {getDisplayStatus(item)}
                             </span>
                           </div>
                           <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
                             <button
                               onClick={(e) => { e.stopPropagation(); setLocalDeleteConfirm({ isOpen: true, lead: item }); }}
                               title="Remove from view"
                               style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 24, height: 24, background: "transparent", border: "none", color: "#6b7280", cursor: "pointer", borderRadius: "50%", transition: "all 0.2s" }}
                               onMouseEnter={(e) => { e.currentTarget.style.color = "#ef4444"; e.currentTarget.style.background = "rgba(239, 68, 68, 0.08)"; }}
                               onMouseLeave={(e) => { e.currentTarget.style.color = "#6b7280"; e.currentTarget.style.background = "transparent"; }}
                             >
                               <X size={14} />
                             </button>
                           </div>
                        </motion.div>
                      );
                    })
                  ) : (
                    <div style={{ padding: "28px 16px", textAlign: "center", color: "#6b7280" }}>No requests found.</div>
                  )}
                </div>
              </div>

              <div className="dashboard-panels-divider" />              <div
                ref={detailsPanelRef}
                className="dashboard-details-panel"
                style={{ padding: isMobile ? "16px 12px" : "22px 24px", background: "#ffffff" }}
              >
                {activeLead ? (
                  <div className="dashboard-details-scroll" style={{ display: "flex", flexDirection: "column", gap: isMobile ? 14 : 18 }}>
                    <div style={{ display: "flex", alignItems: isMobile ? "flex-start" : "center", justifyContent: "space-between", gap: 18, flexWrap: "wrap", flexDirection: isMobile ? "column" : "row" }}>
                      <div style={{ minWidth: 0 }}>
                        <h2 style={{ fontSize: isMobile ? "1.2rem" : "1.45rem", fontWeight: 700, marginBottom: 8, color: "#111111" }}>{activeLead.serviceName}</h2>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: isMobile ? 10 : 14, color: "#6b7280", fontSize: "0.84rem" }}>
                           <span>Client: {activeLead.name}</span>
                           <span>ID: #{activeLead._id.slice(-6).toUpperCase()}</span>
                           <span>Value: <strong style={{ color: "#16a34a" }}>{formatInr(getLeadRevenueAmount(activeLead))}</strong></span>
                        </div>
                      </div>
                      <span style={{ color: getStatusTheme(activeLead).color, fontWeight: 700, fontSize: "1rem", display: "flex", alignItems: "center", gap: 8 }}>
                        {getEffectiveServiceStatus(activeLead) === "Completed" && <CheckCircle size={16} />}
                        {getDisplayStatus(activeLead)}
                      </span>
                    </div>

                    {/* Messages Section */}
                    {activeLead.adminToExecutorMessage && !isSystemMessage(activeLead.adminToExecutorMessage) && (
                      <div className="inner-card" style={{ padding: 16, borderRadius: 18, border: "1px solid rgba(16,185,129,0.22)", background: "rgba(16,185,129,0.05)" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 8, color: "#16a34a" }}>
                          <strong style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><Sparkles size={16} /> Message from Admin</strong>
                          <button type="button" onClick={(e) => handleClearAdminMessage(activeLead._id, e)} style={{ width: 26, height: 26, borderRadius: 999, border: "1px solid rgba(0,0,0,0.12)", background: "transparent", color: "inherit", cursor: "pointer" }}>×</button>
                        </div>
                        <div style={{ color: "#111111", fontSize: "0.95rem" }}>{activeLead.adminToExecutorMessage}</div>
                      </div>
                    )}

                    {activeLead.prToExecutorMessage && !isSystemMessage(activeLead.prToExecutorMessage) && (
                      <div className="inner-card" style={{ padding: 16, borderRadius: 18, border: "1px solid rgba(59,130,246,0.22)", background: "rgba(59,130,246,0.05)" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 8, color: "#3b82f6" }}>
                          <strong style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><MessageSquare size={16} /> Message from PR</strong>
                          <button type="button" onClick={(e) => handleClearPrMessage(activeLead._id, e)} style={{ width: 26, height: 26, borderRadius: 999, border: "1px solid rgba(0,0,0,0.12)", background: "transparent", color: "inherit", cursor: "pointer" }}>×</button>
                        </div>
                        <div style={{ color: "#111111", fontSize: "0.95rem" }}>{activeLead.prToExecutorMessage}</div>
                      </div>
                    )}

                    {/* Progress Bar Section */}
                    <PremiumCard className="inner-card" style={{ padding: isMobile ? 14 : 16, borderRadius: 18, background: "#ffffff", border: "1px solid rgba(17,24,39,0.14)", boxShadow: "none" }}>
                      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1.35fr auto", gap: 14, alignItems: "center" }}>
                        <div>
                          <div style={{ color: "#6b7280", fontSize: "0.82rem", marginBottom: 8, fontWeight: 500 }}>Service Progress</div>
                          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                            <span style={{ fontSize: "1.55rem", fontWeight: 700 }}>{uploadedDocCount} / {totalDocCount || 0}</span>
                            <span style={{ color: "#6b7280", fontSize: "0.88rem" }}>uploaded</span>
                          </div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                          <div style={{ width: "100%", height: 10, background: "rgba(17,24,39,0.08)", borderRadius: 999, overflow: "hidden" }}>
                            <div style={{ width: `${progressPercent}%`, height: "100%", borderRadius: 999, background: "linear-gradient(90deg, #22c55e, #14b8a6)" }} />
                          </div>
                          <div style={{ color: "#6b7280", fontSize: "0.84rem" }}>{getProgressMessage(activeLead)}</div>
                        </div>
                        <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "#111111", textAlign: isMobile ? "left" : "right" }}>{Math.round(progressPercent)}%</div>
                      </div>
                    </PremiumCard>

                    {/* Documents Section */}
                    <PremiumCard className="inner-card" style={{ padding: 0, overflow: "hidden", background: "#ffffff", border: "1px solid rgba(17,24,39,0.14)", boxShadow: "none" }}>
                      <div 
                        onClick={() => setDocumentsOpen(!documentsOpen)}
                        style={{ padding: isMobile ? "12px 12px" : "14px 16px", borderBottom: documentsOpen ? "1px solid rgba(17,24,39,0.08)" : "none", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", userSelect: "none", gap: 10 }}
                      >
                        <div>
                          <h3 style={{ fontSize: isMobile ? "0.92rem" : "0.98rem", fontWeight: 700, marginBottom: 3, color: "#111111" }}>Reference Documents</h3>
                          <p style={{ color: "#6b7280", fontSize: isMobile ? "0.74rem" : "0.8rem", fontWeight: 400 }}>Review uploaded and pending files for this service.</p>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <span style={{ fontSize: isMobile ? "0.74rem" : "0.8rem", color: "#6b7280", fontWeight: 500 }}>{allDocs.length} total</span>
                          <ChevronDown size={18} style={{ transform: documentsOpen ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.3s ease", color: "#6b7280" }} />
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
                            <div className="dashboard-documents-scroll" style={{ overflowX: "auto" }}>
                              <table className="dashboard-table">
                                <thead>
                                  <tr>
                                    <th style={{ width: isMobile ? "50%" : "auto" }}>Document Name</th>
                                    <th>Status</th>
                                    <th style={{ width: isMobile ? 96 : "auto", textAlign: "right" }}>Action</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {allDocs.map((doc) => {
                                    const displayStatus = getDocumentDisplayStatus(activeLead, doc);
                                    const displayStatusLower = String(displayStatus || "").trim().toLowerCase();
                                    const rejectedByExecutor =
                                      String(activeLead?.status || "").trim().toLowerCase() === "rejected" &&
                                      (
                                        String(activeLead?.executorMessage || "").trim().length > 0 ||
                                        String(activeLead?.prFeedback || "").toLowerCase().includes("executor") ||
                                        String(activeLead?.prFeedback || "").toLowerCase().includes("assignment") ||
                                        String(activeLead?.adminMessage || "").toLowerCase().includes("executor") ||
                                        String(activeLead?.adminMessage || "").toLowerCase().includes("assignment")
                                      );
                                    const showReuploadRequired = rejectedByExecutor && displayStatusLower.includes("rejected");
                                    const statusColor =
                                      ["accepted"].includes(displayStatusLower)
                                        ? "#16a34a"
                                        : displayStatusLower.includes("rejected")
                                          ? "#ef4444"
                                          : "#f59e0b";

                                    return (
                                    <tr key={doc._id}>
                                      <td>
                                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: isMobile ? "wrap" : "nowrap" }}>
                                            <FileText size={16} color="#16a34a" />
                                            <span style={{ fontSize: isMobile ? "0.82rem" : "0.88rem", fontWeight: 600, color: "#111111", whiteSpace: isMobile ? "normal" : "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{doc.name}</span>
                                          </div>
                                          {showReuploadRequired ? (
                                            <div style={{ marginLeft: 26, marginTop: 4, color: "#ef4444", fontSize: "0.76rem", fontWeight: 700 }}>
                                              Reupload Required
                                            </div>
                                          ) : doc.displayReuploaded ? (
                                            <div style={{ marginLeft: 26, marginTop: 4, color: "#16a34a", fontSize: "0.76rem", fontWeight: 700 }}>
                                              Reuploaded
                                            </div>
                                          ) : null}
                                        </div>
                                      </td>
                                      <td>
                                        <span style={{ fontSize: isMobile ? "0.74rem" : "0.82rem", fontWeight: 700, color: statusColor }}>{displayStatus}</span>
                                      </td>
                                      <td style={{ textAlign: "right" }}>
                                        <button 
                                          onClick={() => viewDocument(doc.publicId, doc.url || doc.secure_url || doc.uploadedUrl || doc.viewUrl, activeLead._id)} 
                                          style={{ padding: isMobile ? "6px 10px" : "7px 14px", borderRadius: 10, background: "#ffffff", color: "#111111", border: "1px solid rgba(17,24,39,0.12)", cursor: "pointer", fontSize: isMobile ? "0.7rem" : "0.78rem", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: isMobile ? 6 : 8, transition: "all 0.2s" }}
                                          className="inner-card"
                                        >
                                          VIEW <Eye size={14} />
                                        </button>
                                      </td>
                                    </tr>
                                  );})}
                                </tbody>
                              </table>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </PremiumCard>

                    {/* Controls Section */}
                    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(300px, 1fr))", gap: isMobile ? 14 : 18 }}>
                      <PremiumCard className="inner-card" style={{ padding: 18, borderRadius: 20, background: "#ffffff", border: "1px solid rgba(17,24,39,0.14)", boxShadow: "none" }}>
                        <h4 style={{ fontSize: "0.9rem", fontWeight: 700, marginBottom: 14, color: "#111111", display: "flex", alignItems: "center", gap: 8 }}>
                          <RefreshCw size={16} /> Workflow Actions
                        </h4>
                        {["PR_Accepted", "AssignedToExecutor"].includes(activeLead.status) ? (
                          <div style={{ display: "flex", gap: 12, flexDirection: isMobile ? "column" : "row" }}>
                            <button onClick={() => handleStatusUpdate(activeLead._id, "InProgress")} style={{ flex: 1, padding: "12px", borderRadius: 12, background: "#16a34a", color: "#fff", border: "none", fontWeight: 700, cursor: "pointer", transition: "all 0.2s" }}>Accept Service</button>
                            <button onClick={() => setRejectingLeadId(activeLead._id)} style={{ flex: 1, padding: "12px", borderRadius: 12, background: "#ffffff", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)", fontWeight: 700, cursor: "pointer" }}>Reject Service</button>
                          </div>
                        ) : activeLead.status === "InProgress" ? (
                          <div style={{ padding: "14px", borderRadius: 14, background: "rgba(16,163,74,0.05)", border: "1px solid rgba(16,163,74,0.15)", color: "#16a34a", fontWeight: 700, textAlign: "center", fontSize: "0.9rem" }}>
                            Accepted by Executor. PR will upload the draft document.
                          </div>
                        ) : activeLead.status === "ExecutionFinished" ? (
                          <div style={{ padding: "14px", borderRadius: 14, background: "rgba(16,163,74,0.05)", border: "1px solid rgba(16,163,74,0.15)", color: "#16a34a", fontWeight: 700, textAlign: "center", fontSize: "0.9rem" }}>
                            Draft uploaded by PR. Awaiting user approval.
                          </div>
                        ) : activeLead.status === "DraftSent" ? (
                          <div style={{ padding: "14px", borderRadius: 14, background: "rgba(245, 158, 11, 0.06)", border: "1px solid rgba(245, 158, 11, 0.18)", color: "#b45309", fontWeight: 700, textAlign: "center", fontSize: "0.9rem" }}>
                            Draft sent to client. Waiting for the client's response.
                          </div>
                        ) : ["DraftAccepted", "UserAccepted"].includes(activeLead.status) ? (
                          <div style={{ padding: "14px", borderRadius: 14, background: "rgba(16, 163, 74, 0.05)", border: "1px solid rgba(16, 163, 74, 0.15)", color: "#16a34a", fontWeight: 700, textAlign: "center", fontSize: "0.9rem" }}>
                            Current Phase: {getDisplayStatus(activeLead)}
                          </div>
                        ) : (
                          <div style={{ padding: "14px", borderRadius: 14, background: "#f8fafc", border: "1px solid rgba(17,24,39,0.08)", color: "#4b5563", fontWeight: 700, textAlign: "center", fontSize: "0.9rem" }}>
                            Current Phase: {getDisplayStatus(activeLead)}
                          </div>
                        )}

                        {rejectingLeadId === activeLead._id && (
                          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: 16, padding: 16, background: "#fff5f5", borderRadius: 14, border: "1px solid rgba(239,68,68,0.15)" }}>
                            <textarea 
                              value={rejectDrafts[activeLead._id] || ""} 
                              onChange={(e) => setRejectDrafts({...rejectDrafts, [activeLead._id]: e.target.value})}
                              placeholder="Reason for rejecting this service..." 
                              className="dashboard-input"
                              style={{ width: "100%", background: "#ffffff", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: 12, color: "#111111", fontSize: "0.88rem", marginBottom: 12, minHeight: 80, outline: "none" }}
                            />
                            <div style={{ display: "flex", gap: 10, flexDirection: isMobile ? "column" : "row" }}>
                              <button onClick={() => handleRejectAssignment(activeLead._id)} style={{ flex: 1, padding: "10px", background: "#ef4444", color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, fontSize: "0.85rem" }}>Confirm Reject</button>
                              <button onClick={() => setRejectingLeadId(null)} style={{ flex: 1, padding: "10px", background: "transparent", color: "#4b5563", border: "1px solid rgba(17,24,39,0.12)", borderRadius: 10, fontWeight: 700, fontSize: "0.85rem" }}>Cancel</button>
                            </div>
                          </motion.div>
                        )}
                      </PremiumCard>

                      <PremiumCard className="inner-card" style={{ padding: 18, borderRadius: 20, background: "#ffffff", border: "1px solid rgba(17,24,39,0.14)", boxShadow: "none" }}>
                        <h4 style={{ fontSize: "0.9rem", fontWeight: 700, marginBottom: 14, color: "#111111", display: "flex", alignItems: "center", gap: 8 }}>
                          <MessageSquare size={16} /> Message to PR
                        </h4>
                        <div style={{ display: "flex", gap: 12, flexDirection: isMobile ? "column" : "row" }}>
                          <input 
                            value={messageDrafts[activeLead._id] || ""} 
                            onChange={(e) => setMessageDrafts({...messageDrafts, [activeLead._id]: e.target.value})}
                            placeholder="Type message..." 
                            className="dashboard-input"
                            style={{ flex: 1, background: "#ffffff", border: "1px solid rgba(17,24,39,0.12)", borderRadius: 12, padding: "12px 16px", color: "#111111", outline: "none", minWidth: 0 }} 
                          />
                          <button onClick={() => handleSendMessageToPR(activeLead._id, messageDrafts[activeLead._id])} style={{ width: isMobile ? "100%" : 48, height: 48, borderRadius: 12, background: "#16a34a", color: "#fff", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.2s" }}>
                            {isMobile ? <><Send size={16} style={{ marginRight: 8 }} /> Send</> : <Send size={18} />}
                          </button>
                        </div>
                      </PremiumCard>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "grid", placeItems: "center", minHeight: 400, color: "#6b7280" }}>
                    <div style={{ textAlign: "center" }}>
                      <Briefcase size={48} style={{ color: "rgba(17,24,39,0.08)", marginBottom: 16 }} />
                      <p>Select an assignment from the sidebar to view details.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        <ConfirmationModal
          isOpen={deleteConfirm.isOpen}
          title="Delete Assignment"
          message={`Are you sure you want to delete ${deleteConfirm.lead?.serviceName}?`}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteConfirm({ isOpen: false, lead: null, isLoading: false })}
          isLoading={deleteConfirm.isLoading}
        />
        <ConfirmationModal
          isOpen={localDeleteConfirm.isOpen}
          title="Remove Service"
          message={`Are you sure you want to remove ${localDeleteConfirm.lead?.serviceName} from your view?`}
          onConfirm={handleConfirmLocalDelete}
          onCancel={() => setLocalDeleteConfirm({ isOpen: false, lead: null })}
          isLoading={false}
        />
      </div>
    </div>
  );
};

export default ExecutorDashboardModern;
