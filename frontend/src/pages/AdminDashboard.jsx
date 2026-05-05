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
  shouldCountLeadRevenue,
} from "../utils/servicePricing";
import { viewDocument } from "../utils/documentViewer";
import AdminDashboardModern from "./AdminDashboardModern";

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
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [expandedLeadId, setExpandedLeadId] = useState(null);
  const [draftRejectingLeadId, setDraftRejectingLeadId] = useState(null);
  const [draftRejectDrafts, setDraftRejectDrafts] = useState({});
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
  const [dismissedReviewSummarySignatureByLead, setDismissedReviewSummarySignatureByLead] = useState({});
  const [dismissedDetailsMissingSignatureByLead, setDismissedDetailsMissingSignatureByLead] = useState({});

  const getMessageFieldByTarget = (target) => {
    if (target === "pr") return "adminToPrMessage";
    if (target === "executor") return "adminToExecutorMessage";
    if (target === "client") return "adminMessage";
  };

  const getMessageTextByTarget = (lead, target) => {
    if (target === "pr") return lead?.adminToPrMessage || "";
    if (target === "executor") return lead?.adminToExecutorMessage || "";
    return lead?.adminMessage || "";
  };

  const getDetailsMissingSignature = (lead) => {
    return [
      lead?._id || "",
      lead?.status || "",
      lead?.adminMessage || "",
      lead?.prFeedback || "",
      lead?.userMessage || "",
      lead?.executorMessage || "",
    ].join("|");
  };

  const getDetailsMissingMessage = (lead) => {
    if (!lead) return "Action required.";
    if (lead?.status === "InformationRequired") {
      return lead?.prFeedback || lead?.adminMessage || "Additional information is required for this service.";
    }
    // DraftRejected is now handled by PR/Executor, not shown as "Action Required" to Admin
    return lead?.adminMessage || lead?.prFeedback || "Action required.";
  };

  const isDetailsMissingState = (lead) =>
    lead?.status === "InformationRequired";

  const isReviewDraftState = (lead) => lead?.status === "DraftSent";

  const isExecutorRejectedState = (lead) => {
    if (!lead || lead?.status !== "Rejected") return false;
    const execMsg = String(lead?.executorMessage || "").trim();
    const prMsg = String(lead?.prFeedback || "").toLowerCase();
    const adminMsg = String(lead?.adminMessage || "").toLowerCase();
    
    // Check if any message explicitly indicates an executor rejection
    const executorIndicators = ["executor", "assignment rejected", "rejected by executor"];
    
    return (
      execMsg.length > 0 ||
      executorIndicators.some(ind => prMsg.includes(ind)) ||
      executorIndicators.some(ind => adminMsg.includes(ind))
    );
  };

  const isExecutorRejectedLead = isExecutorRejectedState;

  const hasServiceReviewMessage = (lead) =>
    [
      lead?.adminMessage,
      lead?.prFeedback,
      lead?.userMessage,
      lead?.executorMessage,
    ].some((value) => String(value || "").trim().length > 0);

  const normalizeDocumentKey = (value) =>
    String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const handleDismissDetailsMissingMessage = async (lead, e) => {
    if (e) e.stopPropagation();
    if (!lead?._id) return;
    
    // 1. Local hide
    setDismissedDetailsMissingSignatureByLead((prev) => ({
      ...prev,
      [lead._id]: getDetailsMissingSignature(lead),
    }));

    // 2. Persistent clear in backend
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const user = JSON.parse(localStorage.getItem("user"));
      await axios.patch(
        `${apiUrl}/leads/${lead._id}`,
        { prFeedback: "", userMessage: "" },
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      fetchLeads();
    } catch (error) {
      console.error("Failed to persist action required dismissal:", error);
    }
  };

  const handleDeleteRejectionMessage = async (leadId, e) => {
    if (e) e.stopPropagation();
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const user = JSON.parse(localStorage.getItem("user"));
      const lead = leads.find((item) => item._id === leadId);
      const patchPayload = String(lead?.prFeedback || "").trim()
        ? { prFeedback: "" }
        : { userMessage: "" };
      await axios.patch(`${apiUrl}/leads/${leadId}`, patchPayload, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      toast.success("Rejection message removed");
      fetchLeads();
    } catch (error) {
      toast.error("Failed to remove rejection message");
    }
  };

  const handleDeletePrMessage = async (leadId, e) => {
    if (e) e.stopPropagation();
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const user = JSON.parse(localStorage.getItem("user"));
      await axios.patch(`${apiUrl}/leads/${leadId}`, { prMessage: "" }, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      toast.success("PR message removed");
      fetchLeads();
    } catch (error) {
      toast.error("Failed to remove PR message");
    }
  };

  const handleDeleteExecutorMessage = async (leadId, e) => {
    if (e) e.stopPropagation();
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const user = JSON.parse(localStorage.getItem("user"));
      const lead = leads.find((item) => item._id === leadId);
      const executorRejected = isExecutorRejectedState(lead);
      const executorReason = getExecutorRejectionReason(lead);

      if (executorRejected) {
        // Preserve executor-origin rejection by storing marker in prFeedback
        // This ensures isExecutorRejectedState will continue to detect it
        const prFeedback = String(lead?.prFeedback || "").trim();
        const marker = executorReason ? `Rejected by Executor: ${executorReason}` : "Rejected by Executor";
        const nextPrFeedback = prFeedback.toLowerCase().includes("executor") ? prFeedback : (prFeedback ? `${prFeedback}\n${marker}` : marker);

        // Update local state immediately so the UI doesn't flip to 'Rejected by PR'
        setLeads((prev) => prev.map((l) => (l._id === leadId ? { ...l, prFeedback: nextPrFeedback, executorMessage: "" } : l)));

        await axios.patch(`${apiUrl}/leads/${leadId}`, { prFeedback: nextPrFeedback, executorMessage: "" }, {
          headers: { Authorization: `Bearer ${user.token}` },
        });
      } else {
        await axios.patch(`${apiUrl}/leads/${leadId}`, { executorMessage: "" }, {
          headers: { Authorization: `Bearer ${user.token}` },
        });
      }

      toast.success("Executor message removed");
      fetchLeads();
    } catch (error) {
      toast.error("Failed to remove executor message");
    }
  };

  const handleDeleteAdminMessage = async (leadId, e) => {
    if (e) e.stopPropagation();
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const user = JSON.parse(localStorage.getItem("user"));
      await axios.patch(`${apiUrl}/leads/${leadId}`, { adminMessage: "" }, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      toast.success("Admin message removed");
      fetchLeads();
    } catch (error) {
      toast.error("Failed to remove advisor message");
    }
  };

  const openDraftRejectForm = (leadId) => {
    setDraftRejectingLeadId(leadId);
  };

  const submitDraftReject = async (leadId) => {
    const draftText = String(draftRejectDrafts[leadId] || "").trim();
    if (!draftText) {
      toast.error("Please enter a rejection note first");
      return;
    }
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const user = JSON.parse(localStorage.getItem("user"));
      await axios.patch(
        `${apiUrl}/leads/${leadId}`,
        {
          status: "DraftRejected",
          userMessage: draftText,
        },
        {
          headers: { Authorization: `Bearer ${user.token}` },
        },
      );
      toast.success("Draft rejected and note sent");
      setDraftRejectDrafts((prev) => ({ ...prev, [leadId]: "" }));
      setDraftRejectingLeadId(null);
      fetchLeads();
    } catch (error) {
      toast.error("Failed to reject draft");
    }
  };

  const handleDraftAction = async (leadId, action) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const user = JSON.parse(localStorage.getItem("user"));
      const nextStatus = action === "accept" ? "DraftAccepted" : "DraftRejected";
      await axios.patch(
        `${apiUrl}/leads/${leadId}`,
        { status: nextStatus },
        {
          headers: { Authorization: `Bearer ${user.token}` },
        },
      );
      toast.success(action === "accept" ? "Draft approved" : "Draft rejected");
      fetchLeads();
    } catch (error) {
      toast.error("Action failed");
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
      setLoading(false);
    } catch (error) {
      toast.error("Failed to fetch services");
      setLoading(false);
    }
  };

  const fetchLeadDetails = async (leadId) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const user = JSON.parse(localStorage.getItem("user"));
      const response = await axios.get(`${apiUrl}/leads/${leadId}`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      setLeads((prev) =>
        prev.map((l) => (l._id === leadId ? response.data : l)),
      );
    } catch (error) {
      console.error("Failed to fetch lead details");
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const handleUpdateLead = async (e) => {
    e.preventDefault();
    if (!selectedLeadId) return;

    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const user = JSON.parse(localStorage.getItem("user"));
      const field = getMessageFieldByTarget(messageTarget);

      await axios.patch(
        `${apiUrl}/leads/${selectedLeadId}`,
        { [field]: messageText },
        { headers: { Authorization: `Bearer ${user.token}` } },
      );

      toast.success("Message sent successfully");
      setMessageText("");
      fetchLeads();
    } catch (error) {
      toast.error("Failed to send message");
    }
  };

  const handleApprove = async (leadId) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const user = JSON.parse(localStorage.getItem("user"));
      await axios.patch(
        `${apiUrl}/leads/${leadId}`,
        { status: "PR_Accepted" },
        { headers: { Authorization: `Bearer ${user.token}` } },
      );
      toast.success("Request Approved");
      fetchLeads();
    } catch (error) {
      toast.error("Failed to approve");
    }
  };

  const handleReject = async (leadId) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const user = JSON.parse(localStorage.getItem("user"));
      await axios.patch(
        `${apiUrl}/leads/${leadId}`,
        { status: "InformationRequired" },
        { headers: { Authorization: `Bearer ${user.token}` } },
      );
      toast.success("Status Updated");
      fetchLeads();
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const handleSendDraft = async (leadId) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const user = JSON.parse(localStorage.getItem("user"));
      await axios.patch(
        `${apiUrl}/leads/${leadId}`,
        { status: "DraftSent" },
        { headers: { Authorization: `Bearer ${user.token}` } },
      );
      toast.success("Draft Shared with User");
      fetchLeads();
    } catch (error) {
      toast.error("Failed to share draft");
    }
  };

  const handleComplete = async (leadId) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const user = JSON.parse(localStorage.getItem("user"));
      await axios.patch(
        `${apiUrl}/leads/${leadId}`,
        { status: "Completed" },
        { headers: { Authorization: `Bearer ${user.token}` } },
      );
      toast.success("Service Completed");
      fetchLeads();
    } catch (error) {
      toast.error("Failed to complete service");
    }
  };

  const handleDeleteService = (lead, e) => {
    if (e) e.stopPropagation();
    setDeleteConfirm({ isOpen: true, lead, isLoading: false });
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm.lead) return;
    setDeleteConfirm((prev) => ({ ...prev, isLoading: true }));
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const user = JSON.parse(localStorage.getItem("user"));
      await axios.delete(`${apiUrl}/leads/${deleteConfirm.lead._id}`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      toast.success("Service request deleted");
      fetchLeads();
    } catch (error) {
      toast.error("Failed to delete service");
    } finally {
      setDeleteConfirm({ isOpen: false, lead: null, isLoading: false });
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
        { headers: { Authorization: `Bearer ${user.token}` } },
      );
      toast.success("Message cleared");
      fetchLeads();
    } catch (error) {
      toast.error("Failed to clear message");
    }
  };

  const handleUploadDraft = async (leadId, file, type) => {
    if (!file) return;
    setUploadingId(leadId);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", type);

    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const user = JSON.parse(localStorage.getItem("user"));
      await axios.post(`${apiUrl}/leads/${leadId}/upload-draft`, formData, {
        headers: {
          Authorization: `Bearer ${user.token}`,
          "Content-Type": "multipart/form-data",
        },
      });
      toast.success(`${type} uploaded successfully`);
      fetchLeads();
    } catch (error) {
      toast.error(`Failed to upload ${type}`);
    } finally {
      setUploadingId(null);
    }
  };

  const stats = {
    total: leads.length,
    pending: leads.filter((l) =>
      ["Open", "PendingReview", "InformationRequired", "PR_Accepted", "DraftRejected", "Rejected"].includes(l.status),
    ).length,
    inProgress: leads.filter((l) =>
      ["AssignedToExecutor", "InProgress", "ExecutionFinished", "DraftSent", "DraftAccepted", "UserAccepted"].includes(l.status),
    ).length,
    completed: leads.filter((l) => l.status === "Completed").length,
    revenue: formatInr(
      leads.reduce(
        (sum, l) => sum + (shouldCountLeadRevenue(l) ? (getLeadRevenueAmount(l) || 0) : 0),
        0,
      ),
    ),
  };

  const getServiceOutcomeLabel = (lead) => {
    const status = lead?.status;
    const rejectionLabel = getRejectionDisplayLabel(lead);
    if (rejectionLabel) return rejectionLabel;
    if (isPrReuploadReviewState(lead)) return "PR Reviewing";
    if (status === "PendingReview") return "New Request";
    if (status === "InformationRequired") return "Action Required";
    if (status === "PR_Accepted") return "Accepted by PR";
    if (status === "AssignedToExecutor") return "Awaiting Executor";
    if (status === "InProgress") return "Execution Phase";
    if (status === "ExecutionFinished") return "PR Reviewing Result";
    if (status === "DraftSent") return "Draft Shared";
    if (status === "DraftAccepted" || status === "UserAccepted") return "Draft Approved";
    if (status === "DraftRejected") return "Draft Rejected";
    if (status === "Completed") return "Completed";
    if (status === "Open") return "Open";
    return status;
  };

  const getVisibleDocuments = (lead) => {
    if (!lead || !Array.isArray(lead.documents)) return [];

    const sorted = [...lead.documents].sort((a, b) => {
      const aTime = new Date(a?.uploadedAt || a?.createdAt || 0).getTime();
      const bTime = new Date(b?.uploadedAt || b?.createdAt || 0).getTime();
      return bTime - aTime;
    });

    const grouped = new Map();
    for (const doc of sorted) {
      const key = normalizeDocumentKey(doc?.name);
      if (!key) continue;

      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(doc);
    }

    const executorRejected = isExecutorRejectedLead(lead);

    return Array.from(grouped.values()).map((group) => {
      const selected =
        group.find(
          (doc) =>
            !!doc?.reuploaded ||
            String(doc?.status || "").trim().toLowerCase() === "reuploaded",
        ) || group[0];
      const isReuploaded = !!selected?.displayReuploaded || !!selected?.reuploaded || String(selected?.status || "").trim().toLowerCase() === "reuploaded";
      const serviceRejected = lead?.status === "Rejected";

      // When the executor rejects the entire service, mark all docs with
      // a special status so the UI can display "Rejected by Executor"
      // instead of the generic per-document "Rejected" label.
      let resolvedStatus = selected?.status || "Waiting Review";
      if (serviceRejected && !isReuploaded) {
        resolvedStatus = executorRejected ? "Rejected by Executor" : "Rejected";
      }

      return {
        ...selected,
        status: resolvedStatus,
        displayReuploaded: isReuploaded,
        executorRejected: executorRejected && serviceRejected && !isReuploaded,
      };
    });
  };

  const isPrReuploadReviewState = (lead) => {
    if (!lead || lead?.status !== "Rejected") return false;
    const docs = lead?.documents || [];
    const hasReuploaded = docs.some(d => !!d?.reuploaded || String(d?.status || "").toLowerCase() === "reuploaded");
    return hasReuploaded && !isExecutorRejectedLead(lead) && !hasRejectedDocuments(lead);
  };

  const hasAcceptedDocuments = (lead) => {
    return (
      lead?.documents?.some((doc) => doc.status === "Accepted") ||
      lead?.status === "PR_Accepted"
    );
  };

  const hasRejectedDocuments = (lead) => {
    const visibleDocs = getVisibleDocuments(lead);
    return visibleDocs.some(doc => String(doc?.status || "").toLowerCase() === "rejected");
  };

  // Consolidated into isExecutorRejectedState at the top of the file
  /*
  const isExecutorRejectedLead = (lead) => {
    ...
  };
  */

  const isPrRejectedLead = (lead) => {
    if (!lead || lead?.status !== "Rejected") return false;
    return !isExecutorRejectedLead(lead);
  };

  const getRejectionDisplayLabel = (lead) => {
    const status = lead?.status;
    if (status !== "Rejected") return "";

    // Check all messages for explicit executor indicators
    const adminMsg = String(lead?.adminMessage || "").toLowerCase();
    const execMsg = String(lead?.executorMessage || "").toLowerCase();
    const prMsg = String(lead?.prFeedback || "").toLowerCase();
    
    const executorIndicators = ["executor", "assignment rejected", "rejected by executor"];
    const isExecutorOrigin = [adminMsg, execMsg, prMsg].some(m => executorIndicators.some(ind => m.includes(ind)));
    
    if (isExecutorOrigin || isExecutorRejectedLead(lead)) {
      const reason = getExecutorRejectionReason(lead);
      return reason ? `Rejected by Executor: ${reason}` : "Rejected by Executor";
    }

    // If it's "Rejected" and not by executor, it's by PR
    const prReason = String(lead?.prFeedback || "").trim();
    const adminReason = String(lead?.adminMessage || "").trim();
    const displayReason = prReason || adminReason;
    return displayReason ? `Rejected by PR: ${displayReason}` : "Rejected by PR";
  };

  const getDocumentStatusSummary = (lead) => {
    const docs = getVisibleDocuments(lead) || [];
    return {
      total: docs.length,
      accepted: docs.filter((d) => d.status === "Accepted"),
      rejected: docs.filter((d) => d.status === "Rejected"),
      pending: docs.filter((d) => !d.status || d.status === "PendingReview"),
    };
  };

  const getDocumentStatusSummaryLabel = (lead) => {
    const { total, accepted, rejected } = getDocumentStatusSummary(lead);
    const status = lead?.status;
    const rejectionLabel = getRejectionDisplayLabel(lead);
    if (status === "DraftRejected") return "Draft Rejected by User";
    if (status === "DraftSent") return "Waiting for User Draft Approval";
    if (isPrReuploadReviewState(lead)) return "PR Reviewing";
    if (rejectionLabel) return rejectionLabel;
    if (status === "Rejected") return "Service Rejected";
    if (status === "InformationRequired" && rejected.length > 0) {
      return rejected.length === 1
        ? "1 Document Rejected"
        : `${rejected.length} Documents Rejected`;
    }
    if (accepted.length > 0 && total > 0 && accepted.length === total) {
      return "Service accepted by PR";
    }
    if (accepted.length > 0) {
      return accepted.length === 1
        ? "1 Document Accepted"
        : `${accepted.length} Documents Accepted`;
    }

    return getDisplayStatus(lead);
  };

  const getServiceReviewSummary = (lead) => {
    if (!lead) return "";

    // 1. Skip if it's a state that already has the red "Action Required" banner
    if (isDetailsMissingState(lead)) return "";

    // 2. Get messages from others (Client, PR, Executor)
    const userMsg = String(lead?.userMessage || "").trim();
    const prMsg = String(lead?.prFeedback || "").trim();
    const execMsg = String(lead?.executorMessage || "").trim();

    // 3. Define phrases that indicate a system-generated status update
    // If a message contains any of these phrases, we treat it as a status update and hide it.
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

    const isStatusUpdate = (msg) => {
      if (!msg) return true;
      const lowMsg = msg.toLowerCase();
      // If the message contains any of the system phrases, it's a status update
      return systemPhrases.some(phrase => lowMsg.includes(phrase));
    };

    // 4. Return the first genuine message from "others" (Client, PR, or Executor)
    // We ignore adminMessage as it's the admin's own note
    if (userMsg && !isStatusUpdate(userMsg)) return userMsg;
    if (prMsg && !isStatusUpdate(prMsg)) return prMsg;
    if (execMsg && !isStatusUpdate(execMsg)) return execMsg;

    return "";
  };

  const getDocumentSummaryChip = (lead) => {
    const summary = getDocumentStatusSummary(lead);
    const rejectionLabel = getRejectionDisplayLabel(lead);
    if (rejectionLabel) return rejectionLabel;
    if (lead?.status === "Completed") return "Completed";
    if (lead?.status === "PR_Accepted") return "Accepted by the PR";
    if (lead?.status === "DraftRejected") return "Draft Rejected by User";
    if (summary.rejected.length > 0) {
      return summary.rejected.length === 1
        ? "1 Rejected"
        : `${summary.rejected.length} Rejected`;
    }
    if (summary.accepted.length > 0) {
      return summary.accepted.length === 1
        ? "1 Accepted"
        : `${summary.accepted.length} Accepted`;
    }
    return `${summary.total} ${summary.total === 1 ? "Doc" : "Docs"}`;
  };

  const getDocumentDisplayStatus = (lead, doc) => {
    const rejectionLabel = getRejectionDisplayLabel(lead);
    if (rejectionLabel) return rejectionLabel;
    return doc?.status || "Pending Review";
  };

  const getExecutorRejectionReason = (lead) => {
    // Prefer executorMessage, then prFeedback, then adminMessage (for moved markers)
    const rawMessage = String(lead?.executorMessage || lead?.prFeedback || lead?.adminMessage || "").trim();
    if (!rawMessage) return "";

    const cleaned = rawMessage
      .replace(/^assignment rejected by executor:\s*/i, "")
      .replace(/^rejected by executor:\s*/i, "")
      .replace(/^\[?rejected by executor:\s*/i, "")
      .replace(/\]$/i, "")
      .trim();

    return cleaned || rawMessage;
  };

  const getReviewSummarySignature = (lead) => {
    const summary = getDocumentStatusSummary(lead);
    const executorReason = getExecutorRejectionReason(lead);
    return [
      lead?._id || "",
      lead?.userMessage || "",
      lead?.prFeedback || "",
      lead?.executorMessage || "",
      lead?.prMessage || "",
      lead?.adminToPrMessage || "",
      summary.accepted.length,
      summary.rejected.length,
      executorReason,
    ].join("|");
  };

  const handleDismissReviewSummary = async (lead, e) => {
    if (e) e.stopPropagation();
    
    // 1. Immediate UI feedback
    setDismissedReviewSummarySignatureByLead((prev) => ({
      ...prev,
      [lead._id]: getReviewSummarySignature(lead),
    }));

    // 2. Persistent update in backend
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const user = JSON.parse(localStorage.getItem("user"));

      const executorRejected = isExecutorRejectedState(lead);
      const executorReason = getExecutorRejectionReason(lead);

      const patchData = { userMessage: "" };

      if (executorRejected) {
        // For executor rejections, ensure a durable marker is in prFeedback
        // This guarantees isExecutorRejectedState will detect it
        const prFeedback = String(lead?.prFeedback || "").trim();
        const marker = executorReason ? `Rejected by Executor: ${executorReason}` : "Rejected by Executor";
        if (!prFeedback.toLowerCase().includes("executor")) {
          patchData.prFeedback = prFeedback ? `${prFeedback}\n${marker}` : marker;
        }
        // Keep executorMessage and adminMessage as-is
      } else {
        // Not an executor rejection: clear PR feedback
        patchData.prFeedback = "";
      }

      // Update local state immediately so the admin UI reflects the executor rejection
      setLeads((prev) => prev.map((l) => {
        if (l._id !== lead._id) return l;
        return {
          ...l,
          ...patchData,
        };
      }));

      await axios.patch(
        `${apiUrl}/leads/${lead._id}`,
        patchData,
        { headers: { Authorization: `Bearer ${user.token}` } }
      );

      // refresh to sync with server state
      fetchLeads();
    } catch (error) {
      console.error("Failed to persist summary dismissal:", error);
      toast.error("Failed to clear summary permanently");
    }
  };

  const getDisplayStatus = (lead) => {
    const status = lead?.status;
    if (isPrReuploadReviewState(lead)) {
      return "PR Reviewing";
    }
    const rejectionLabel = getRejectionDisplayLabel(lead);
    if (rejectionLabel) return rejectionLabel;

    // If it's a genuine rejection state, let rejectionLabel handle it
    if (status === "Rejected" && !isPrReuploadReviewState(lead)) {
      const label = getRejectionDisplayLabel(lead);
      if (label) return label;
    }

    if (status === "PendingReview") return "PR Reviewing";
    if (status === "InformationRequired") return "Action Required";
    if (status === "PR_Accepted") return "Service accepted by PR";
    if (status === "AssignedToExecutor") return "Pending Executor Approval";
    if (status === "InProgress") return "Service accepted by the executor";
    if (status === "ExecutionFinished") return "PR Reviewing Result";
    if (status === "DraftSent") return "Waiting for User Draft Approval";
    if (status === "DraftAccepted" || status === "UserAccepted") return "Draft accepted by the user";
    if (status === "DraftRejected") return "Draft Rejected by User";
    if (status === "Completed") return "Completed";
    if (status === "Open") return "PR Reviewing";
    return status;
  };

  const getStatusTheme = (lead) => {
    const status = lead?.status;
    if (isPrReuploadReviewState(lead)) {
      return { color: "#f59e0b", bg: "rgba(245,158,11,0.1)" };
    }
    const rejectionLabel = getRejectionDisplayLabel(lead);
    if (rejectionLabel || status === "Rejected" && hasRejectedDocuments(lead)) {
      return { color: "#ef4444", bg: "rgba(239,68,68,0.1)" };
    }
    // Rejection state theme
    if (status === "Rejected") {
      return { color: "#ef4444", bg: "rgba(239,68,68,0.1)" };
    }
    if (status === "DraftSent") {
      return { color: "#8b5cf6", bg: "rgba(139,92,246,0.12)" };
    }
    if (status === "InformationRequired") {
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

  const searchTerm = searchQuery.trim().toLowerCase();
  const filteredLeads = leads.filter((lead) => {
    if (!searchTerm) return true;
    
    // Split search into individual terms for multi-keyword matching
    const searchTerms = searchTerm.split(/\s+/).filter(Boolean);
    
    const documents = Array.isArray(lead?.documents) ? lead.documents : [];
    const documentText = documents
      .flatMap((doc) => [doc?.name, doc?.status, doc?.type, doc?.rejectionMessage])
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const leadText = [
      lead?.name,
      lead?.email,
      lead?.serviceName,
      lead?.status,
      lead?.adminMessage,
      lead?.userMessage,
      lead?.executorMessage,
      lead?.prFeedback,
      lead?._id,
      lead?.user?.profile?.industry,
      lead?.user?.profile?.companyName,
      lead?.createdAt ? new Date(lead.createdAt).toLocaleDateString("en-IN") : "",
      lead?.createdAt
        ? new Date(lead.createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })
        : "",
      String(getLeadRevenueAmount(lead) || ""),
      String(formatInr(getLeadRevenueAmount(lead)) || ""),
      documentText,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
      
    // All search keywords must match at least once in the lead text
    return searchTerms.every(term => leadText.includes(term));
  });

  useEffect(() => {
    if (!filteredLeads.length) {
      if (selectedLeadId !== null) setSelectedLeadId(null);
      return;
    }
    if (!filteredLeads.some((lead) => lead._id === selectedLeadId)) {
      setSelectedLeadId(filteredLeads[0]._id);
    }
  }, [filteredLeads, selectedLeadId]);

  useEffect(() => {
    if (selectedLeadId && expandedLeadId !== selectedLeadId) {
      setExpandedLeadId(selectedLeadId);
    }
  }, [selectedLeadId, expandedLeadId]);

  useEffect(() => {
    if (selectedLeadId) {
      fetchLeadDetails(selectedLeadId);
    }
  }, [selectedLeadId]);

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

  const activeLead = filteredLeads.find((lead) => lead._id === selectedLeadId) || filteredLeads[0] || null;

  if (loading) return <Loader minimal={true} />;

  return (
    <AdminDashboardModern
      navigate={navigate}
      filteredLeads={filteredLeads}
      activeLead={activeLead}
      selectedLeadId={selectedLeadId}
      setSelectedLeadId={setSelectedLeadId}
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
      stats={stats}
      formatInr={formatInr}
      getLeadRevenueAmount={getLeadRevenueAmount}
      getStatusTheme={getStatusTheme}
      getDisplayStatus={getDisplayStatus}
      getServiceOutcomeLabel={getServiceOutcomeLabel}
      getDocumentStatusSummary={getDocumentStatusSummary}
      getDocumentSummaryChip={getDocumentSummaryChip}
      getVisibleDocuments={getVisibleDocuments}
      getDocumentDisplayStatus={getDocumentDisplayStatus}
      getServiceReviewSummary={getServiceReviewSummary}
      getExecutorRejectionReason={getExecutorRejectionReason}
      getReviewSummarySignature={getReviewSummarySignature}
      isExecutorRejectedLead={isExecutorRejectedLead}
      hasAcceptedDocuments={hasAcceptedDocuments}
      hasRejectedDocuments={hasRejectedDocuments}
      dismissedReviewSummarySignatureByLead={dismissedReviewSummarySignatureByLead}
      handleDismissReviewSummary={handleDismissReviewSummary}
      handleDeleteService={handleDeleteService}
      handleApprove={handleApprove}
      handleReject={handleReject}
      handleSendDraft={handleSendDraft}
      handleComplete={handleComplete}
      handleUpdateLead={handleUpdateLead}
      handleDeleteUserMessage={handleDeleteRejectionMessage}
      handleDeletePrMessage={handleDeletePrMessage}
      handleDeleteExecutorMessage={handleDeleteExecutorMessage}
      handleDeleteAdminMessage={handleDeleteAdminMessage}
      messageTarget={messageTarget}
      setMessageTarget={setMessageTarget}
      messageText={messageText}
      setMessageText={setMessageText}
      getMessageTextByTarget={getMessageTextByTarget}
      uploadingId={uploadingId}
      handleUploadDraft={handleUploadDraft}
      viewDocument={viewDocument}
      deleteConfirm={deleteConfirm}
      handleConfirmDelete={handleConfirmDelete}
      setDeleteConfirm={setDeleteConfirm}
      draftRejectingLeadId={draftRejectingLeadId}
      draftRejectDrafts={draftRejectDrafts}
      setDraftRejectDrafts={setDraftRejectDrafts}
      openDraftRejectForm={openDraftRejectForm}
      submitDraftReject={submitDraftReject}
      handleDraftAction={handleDraftAction}
      isDetailsMissingState={isDetailsMissingState}
      isReviewDraftState={isReviewDraftState}
      isExecutorRejectedState={isExecutorRejectedState}
      dismissedDetailsMissingSignatureByLead={dismissedDetailsMissingSignatureByLead}
      getDetailsMissingSignature={getDetailsMissingSignature}
      getDetailsMissingMessage={getDetailsMissingMessage}
      handleDismissDetailsMissingMessage={handleDismissDetailsMissingMessage}
      handleDeleteRejectionMessage={handleDeleteRejectionMessage}
    />
  );
};

export default AdminDashboard;
