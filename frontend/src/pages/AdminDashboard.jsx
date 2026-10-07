import React, { useState, useRef, useCallback, useEffect } from "react";
import { getStatusLabel, getPrReviewingLabel, resolvePrLabel, resolveExecutorLabel, hasAdminRejectedDocuments, isPreSubmissionStage } from "../utils/statusLabels";
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
import {
  loadHiddenServiceIds,
  saveHiddenServiceIds,
} from "../utils/hiddenServiceStorage";

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
  const [services, setServices] = useState([]);
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
  const [newDocName, setNewDocName] = useState("");
  const [isSavingRequiredDocuments, setIsSavingRequiredDocuments] = useState(false);
  const [isSendingDocuments, setIsSendingDocuments] = useState(false);
  const [updatingDocStatusId, setUpdatingDocStatusId] = useState(null);
  const [isUpdatingServiceStatus, setIsUpdatingServiceStatus] = useState(false);
  const [executors, setExecutors] = useState([]);
  const [prUsers, setPrUsers] = useState([]);
  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const currentUserId = storedUser?._id || storedUser?.id || "";
  const [hiddenLeads, setHiddenLeads] = useState(() => loadHiddenServiceIds("admin-dashboard", currentUserId));
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, lead: null, isLoading: false });
  const [dismissedReviewSummarySignatureByLead, setDismissedReviewSummarySignatureByLead] = useState({});
  const [dismissedDetailsMissingSignatureByLead, setDismissedDetailsMissingSignatureByLead] = useState({});

  useEffect(() => {
    setHiddenLeads(loadHiddenServiceIds("admin-dashboard", currentUserId));
  }, [currentUserId]);

  useEffect(() => {
    saveHiddenServiceIds("admin-dashboard", currentUserId, hiddenLeads);
  }, [currentUserId, hiddenLeads]);

  // PR recipients are encoded as "pr:<userId>" so each PR in the DB is its own target.
  const getPrTargetId = (target) => (String(target || "").startsWith("pr:") ? String(target).slice(3) : "");

  const getMessageFieldByTarget = (target) => {
    if (getPrTargetId(target)) return "adminToPrMessage";
    if (target === "executor") return "adminToExecutorMessage";
    if (target === "client") return "adminMessage";
  };

  const getMessageTextByTarget = (lead, target) => {
    const prId = getPrTargetId(target);
    if (prId) {
      const addressedTo = String(lead?.adminToPrMessageTo || "");
      return lead?.adminToPrMessage && addressedTo === prId ? lead.adminToPrMessage : "";
    }
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
    // If the executor rejected the service but PR hasn't notified the client yet,
    // hide the rejection from user/admin dashboards — only PR can see it.
    if (lead?.executorServiceRejected === true && lead?.prNotifiedClientServiceRejection !== true) {
      return false;
    }
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

  // "Rejected by PR 1 (Asha Rao)" — names the PR the lead is assigned to,
  // falling back to the generic label when no PR is populated.
  const getRejectedByPrLabel = (lead) => `Rejected by ${resolvePrLabel(lead) || "PR"}`;

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

  const handleDeletePrAdditionalDetailsMessage = async (leadId, e) => {
    if (e) e.stopPropagation();
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const user = JSON.parse(localStorage.getItem("user"));
      await axios.patch(`${apiUrl}/leads/${leadId}`, { prAdditionalDetailsMessage: "" }, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      fetchLeads();
    } catch (error) {
      toast.error("Failed to remove PR notification");
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
      const [leadsRes, servicesRes, executorsRes] = await Promise.all([
        axios.get(`${apiUrl}/leads`, {
          headers: { Authorization: `Bearer ${user.token}` },
        }),
        axios.get(`${apiUrl}/services`).catch(() => ({ data: [] })),
        axios.get(`${apiUrl}/auth/pr-executors`, {
          headers: { Authorization: `Bearer ${user.token}` },
        }).catch(() => ({ data: [] })),
      ]);
      const fetchedServices = Array.isArray(servicesRes.data) ? servicesRes.data : [];
      setServices(fetchedServices);
      setLeads(hydrateLeadsWithDocuments(leadsRes.data, fetchedServices));
      // pr-executors returns both PR and executor accounts — keep only the
      // actual named executors currently stored in the DB for the message
      // recipient dropdown.
      if (Array.isArray(executorsRes.data)) {
        setExecutors(executorsRes.data.filter((u) => /^executor\d+$/i.test(String(u?.role || "").trim())));
        setPrUsers(executorsRes.data.filter((u) => /^pr\d*$/i.test(String(u?.role || "").trim())));
      }
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
      const hydrated = hydrateLeadsWithDocuments([response.data])[0];
      setLeads((prev) => prev.map((l) => (l._id === leadId ? hydrated : l)));
    } catch (error) {
      console.error("Failed to fetch lead details");
    }
  };

  useEffect(() => {
    fetchLeads();
    const intervalId = setInterval(fetchLeads, 30000);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const handleServiceDeleted = async () => {
      await fetchLeads();
    };
    const handleServiceDocumentAdded = async () => {
      await fetchLeads();
    };
    window.addEventListener("service-deleted", handleServiceDeleted);
    window.addEventListener("service-document-added", handleServiceDocumentAdded);
    return () => {
      window.removeEventListener("service-deleted", handleServiceDeleted);
      window.removeEventListener("service-document-added", handleServiceDocumentAdded);
    };
  }, []);

  const handleUpdateLead = async (e) => {
    e.preventDefault();
    if (!selectedLeadId) return;

    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const user = JSON.parse(localStorage.getItem("user"));
      const field = getMessageFieldByTarget(messageTarget);

      const prTargetId = getPrTargetId(messageTarget);
      await axios.patch(
        `${apiUrl}/leads/${selectedLeadId}`,
        prTargetId
          ? { adminToPrMessage: messageText, adminToPrMessageTo: prTargetId }
          : { [field]: messageText },
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

  const handleAddRequiredDocument = async (leadId, docName) => {
    const trimmedName = String(docName || "").trim();
    if (!trimmedName) return;
    const lead = leads.find((l) => l._id === leadId);
    const existingNames = Array.isArray(lead?.documentsRequired) ? lead.documentsRequired : [];
    if (existingNames.some((n) => String(n).trim().toLowerCase() === trimmedName.toLowerCase())) {
      setNewDocName("");
      return;
    }
    setIsSavingRequiredDocuments(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const user = JSON.parse(localStorage.getItem("user"));
      await axios.patch(
        `${apiUrl}/leads/${leadId}/documents-required`,
        { documentsRequired: [...existingNames, trimmedName] },
        { headers: { Authorization: `Bearer ${user.token}` } },
      );
      setNewDocName("");
      fetchLeads();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to add document");
    } finally {
      setIsSavingRequiredDocuments(false);
    }
  };

  const handleRemoveRequiredDocument = async (leadId, docName) => {
    const lead = leads.find((l) => l._id === leadId);
    const existingNames = Array.isArray(lead?.documentsRequired) ? lead.documentsRequired : [];
    setIsSavingRequiredDocuments(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const user = JSON.parse(localStorage.getItem("user"));
      await axios.patch(
        `${apiUrl}/leads/${leadId}/documents-required`,
        { documentsRequired: existingNames.filter((n) => n !== docName) },
        { headers: { Authorization: `Bearer ${user.token}` } },
      );
      fetchLeads();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to remove document");
    } finally {
      setIsSavingRequiredDocuments(false);
    }
  };

  const handleSendDocumentsToUser = async (leadId, note) => {
    setIsSendingDocuments(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const user = JSON.parse(localStorage.getItem("user"));
      await axios.patch(
        `${apiUrl}/leads/${leadId}/send-documents`,
        typeof note === "string" ? { note } : {},
        { headers: { Authorization: `Bearer ${user.token}` } },
      );
      toast.success("Client notified");
      fetchLeads();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to notify client");
    } finally {
      setIsSendingDocuments(false);
    }
  };

  const handleUpdateWorkingDays = async (leadId, days) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const user = JSON.parse(localStorage.getItem("user"));
      await axios.patch(
        `${apiUrl}/leads/${leadId}`,
        { workingDays: days },
        { headers: { Authorization: `Bearer ${user.token}` } },
      );
      fetchLeads();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update working days");
    }
  };

  const handleUpdateDocumentStatus = async (leadId, docId, status) => {
    setUpdatingDocStatusId(docId);
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const user = JSON.parse(localStorage.getItem("user"));
      await axios.patch(
        `${apiUrl}/leads/${leadId}/documents/${docId}/status`,
        { status, rejectionMessage: status === "Rejected" ? "Rejected by admin. Please reupload." : "" },
        { headers: { Authorization: `Bearer ${user.token}` } },
      );
      toast.success(`Document ${status.toLowerCase()}`);
      fetchLeads();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update document status");
    } finally {
      setUpdatingDocStatusId(null);
    }
  };

  const handleAcceptService = async (leadId, prId) => {
    if (!prId) {
      toast.error("Please select a PR to send this service to");
      return;
    }
    setIsUpdatingServiceStatus(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const user = JSON.parse(localStorage.getItem("user"));
      await axios.patch(
        `${apiUrl}/leads/${leadId}`,
        { status: "PendingReview", prId },
        { headers: { Authorization: `Bearer ${user.token}` } },
      );
      toast.success("Service accepted and sent to the selected PR");
      fetchLeads();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to accept service");
    } finally {
      setIsUpdatingServiceStatus(false);
    }
  };

  const handleRejectService = async (leadId, docs) => {
    setIsUpdatingServiceStatus(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const user = JSON.parse(localStorage.getItem("user"));
      const rejectableDocs = (Array.isArray(docs) ? docs : []).filter((doc) => {
        const type = String(doc?.type || "").trim().toLowerCase();
        const hasFile = !!(doc?.url || doc?.publicId || doc?.secure_url || doc?.uploadedUrl);
        return hasFile && type !== "draft" && type !== "final";
      });
      await Promise.all(
        rejectableDocs.map((doc) =>
          axios.patch(
            `${apiUrl}/leads/${leadId}/documents/${doc._id}/status`,
            { status: "Rejected", rejectionMessage: "Rejected by admin. Please reupload." },
            { headers: { Authorization: `Bearer ${user.token}` } },
          ),
        ),
      );
      toast.success("All documents rejected");
      fetchLeads();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to reject service");
    } finally {
      setIsUpdatingServiceStatus(false);
    }
  };

  const handleDeleteService = (lead, e) => {
    if (e) e.stopPropagation();
    setDeleteConfirm({ isOpen: true, lead, isLoading: false });
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm.lead) return;
    setDeleteConfirm((prev) => ({ ...prev, isLoading: true }));
    setHiddenLeads((prev) => (prev.includes(deleteConfirm.lead._id) ? prev : [...prev, deleteConfirm.lead._id]));
    toast.success("Service hidden from this dashboard");
    setDeleteConfirm({ isOpen: false, lead: null, isLoading: false });
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

  const getEffectiveLeadStatus = (lead) => {
    const rawStatus = String(lead?.status || "").trim();
    const rawStatusLower = rawStatus.toLowerCase();
    const documents = Array.isArray(lead?.documents) ? lead.documents : [];
    const hasFinalDocument = documents.some((doc) => {
      const docType = String(doc?.type || "").trim().toLowerCase();
      const docName = String(doc?.name || "").trim().toLowerCase();
      return docType === "final" || docName.startsWith("final");
    });

    if (hasFinalDocument && !["rejected", "informationrequired"].includes(rawStatusLower)) {
      return "Completed";
    }

    return rawStatus;
  };

  const visibleLeads = leads.filter((lead) => {
    if (hiddenLeads.includes(lead._id)) return false;
    const serviceKey = String(lead?.serviceName || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
    if (!serviceKey) return false;
    const serviceExists = services.some(
      (s) => String(s?.title || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim() === serviceKey
    );
    return serviceExists;
  });

  const stats = {
    total: visibleLeads.length,
    pending: visibleLeads.filter((l) => {
      // Staged executor rejection should appear as inProgress to admin too
      if (l?.executorServiceRejected === true && l?.prNotifiedClientServiceRejection !== true) return false;
      return ["Open", "PendingReview", "InformationRequired", "PR_Accepted", "DraftRejected", "Rejected"].includes(getEffectiveLeadStatus(l));
    }).length,
    inProgress: visibleLeads.filter((l) => {
      // Staged executor rejection: counts as inProgress
      if (l?.executorServiceRejected === true && l?.prNotifiedClientServiceRejection !== true) return true;
      return ["AssignedToExecutor", "InProgress", "ExecutionFinished", "DraftSent", "DraftAccepted", "UserAccepted"].includes(getEffectiveLeadStatus(l));
    }).length,
    completed: visibleLeads.filter((l) => getEffectiveLeadStatus(l) === "Completed").length,
    revenueValue: visibleLeads.reduce(
      (sum, l) => {
        if (!shouldCountLeadRevenue(l)) return sum;
        const key = String(l?.serviceName || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
        const catalog = key ? services.find((s) => String(s?.title || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim() === key) : null;
        return sum + (getLeadRevenueAmount(l, catalog) || 0);
      },
      0,
    ),
    revenue: formatInr(
      visibleLeads.reduce(
        (sum, l) => {
          if (!shouldCountLeadRevenue(l)) return sum;
          const key = String(l?.serviceName || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
          const catalog = key ? services.find((s) => String(s?.title || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim() === key) : null;
          return sum + (getLeadRevenueAmount(l, catalog) || 0);
        },
        0,
      ),
    ),
  };

  const getServicesByStatus = (status) => {
    if (status === "pending") {
      return visibleLeads.filter((l) => {
        if (l?.executorServiceRejected === true && l?.prNotifiedClientServiceRejection !== true) return false;
        return ["Open", "PendingReview", "InformationRequired", "PR_Accepted", "DraftRejected", "Rejected"].includes(getEffectiveLeadStatus(l));
      });
    }
    if (status === "inProgress") {
      return visibleLeads.filter((l) => {
        if (l?.executorServiceRejected === true && l?.prNotifiedClientServiceRejection !== true) return true;
        return ["AssignedToExecutor", "InProgress", "ExecutionFinished", "DraftSent", "DraftAccepted", "UserAccepted"].includes(getEffectiveLeadStatus(l));
      });
    }
    if (status === "completed") {
      return visibleLeads.filter((l) => getEffectiveLeadStatus(l) === "Completed");
    }
    return [];
  };

  const getTotalRevenueBreakdown = () => {
    const pendingLeads = visibleLeads.filter((l) => {
      if (l?.executorServiceRejected === true && l?.prNotifiedClientServiceRejection !== true) return false;
      return ["Open", "PendingReview", "InformationRequired", "PR_Accepted", "DraftRejected", "Rejected"].includes(getEffectiveLeadStatus(l));
    });
    const inProgressLeads = visibleLeads.filter((l) => {
      if (l?.executorServiceRejected === true && l?.prNotifiedClientServiceRejection !== true) return true;
      return ["AssignedToExecutor", "InProgress", "ExecutionFinished", "DraftSent", "DraftAccepted", "UserAccepted"].includes(getEffectiveLeadStatus(l));
    });
    const completedLeads = visibleLeads.filter((l) => getEffectiveLeadStatus(l) === "Completed");

    return {
      pending: pendingLeads.reduce((sum, l) => {
        if (!shouldCountLeadRevenue(l)) return sum;
        const key = String(l?.serviceName || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
        const catalog = key ? services.find((s) => String(s?.title || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim() === key) : null;
        return sum + (getLeadRevenueAmount(l, catalog) || 0);
      }, 0),
      inProgress: inProgressLeads.reduce((sum, l) => {
        if (!shouldCountLeadRevenue(l)) return sum;
        const key = String(l?.serviceName || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
        const catalog = key ? services.find((s) => String(s?.title || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim() === key) : null;
        return sum + (getLeadRevenueAmount(l, catalog) || 0);
      }, 0),
      completed: completedLeads.reduce((sum, l) => {
        if (!shouldCountLeadRevenue(l)) return sum;
        const key = String(l?.serviceName || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
        const catalog = key ? services.find((s) => String(s?.title || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim() === key) : null;
        return sum + (getLeadRevenueAmount(l, catalog) || 0);
      }, 0),
      total: stats.revenueValue,
      high: stats.revenueValue,
      small: stats.revenueValue,
    };
  };

  const getServiceOutcomeLabel = (lead) => {
    const status = getEffectiveLeadStatus(lead);

    // Staged executor rejection — mask as "Executor X Reviewing"
    if (lead?.executorServiceRejected === true && lead?.prNotifiedClientServiceRejection !== true) {
      return `${resolveExecutorLabel(lead)} Reviewing`;
    }

    if (status === "ExecutionFinished" && lead?.draftSentToPR) {
      return `Draft Sent to PR by ${resolveExecutorLabel(lead)}`;
    }

    const rejectionLabel = getRejectionDisplayLabel(lead);
    if (rejectionLabel) return rejectionLabel;
    if (isPrReuploadReviewState(lead)) return "Pending PR Review";
    if (status === "PendingReview") return lead?.prId ? getPrReviewingLabel(lead) : "New Request";
    if (status === "InformationRequired") return hasRejectedDocuments(lead) ? getRejectedByPrLabel(lead) : getPrReviewingLabel(lead);
    return getStatusLabel(status, lead, "admin");
  };

  const getVisibleDocuments = (lead) => {
    if (!lead || !Array.isArray(lead.documents)) return [];

    // Filter out admin-added placeholder entries (adminAdded: true with no URL) so the document
    // only appears in the dashboard once the user has actually uploaded a file.
    let filteredDocs = lead.documents.filter(
      (d) => !(d?.adminAdded === true && !d?.url && !d?.publicId && !d?.secure_url && !d?.uploadedUrl)
    );

    // When admin has requested specific documents, each file the user picks is written straight
    // onto that same required-document subdocument (the backend fills in the placeholder's url
    // rather than pushing a new entry, so it keeps adminAdded: true even after a real file lands
    // on it) — well before the user has paid and clicked "Submit". So `adminAdded` alone can't
    // tell an unfulfilled request apart from an already-uploaded one; only the presence of a file
    // can. Until submission, mask every document that HAS a file back down to a "pending client
    // payment/submission" placeholder (no file link, no real status, flagged via
    // pendingSubmission) so the admin can't View/Accept/Reject it yet.
    if (isPreSubmissionStage(lead)) {
      filteredDocs = filteredDocs.map((d) => {
        const hasFile = !!(d?.url || d?.publicId || d?.secure_url || d?.uploadedUrl || d?.viewUrl);
        if (!hasFile) return d;
        return {
          ...d,
          url: null,
          secure_url: null,
          uploadedUrl: null,
          viewUrl: null,
          publicId: null,
          status: "Pending",
          pendingSubmission: true,
        };
      });
    }

    const sorted = [...filteredDocs].sort((a, b) => {
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
      const key = normalizeDocumentKey(doc?.name);
      if (!key) continue;

      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(doc);
    }

    const executorRejected = isExecutorRejectedLead(lead);
    // Staged: executor rejected but PR hasn't notified client yet
    const isStagedRejection =
      lead?.executorServiceRejected === true &&
      lead?.prNotifiedClientServiceRejection !== true;

    const collapsed = Array.from(grouped.values()).map((group) => {
      const selected =
        group.find(
          (doc) =>
            !!doc?.reuploaded ||
            String(doc?.status || "").trim().toLowerCase() === "reuploaded",
          ) || group[0];
      const isReuploaded = !!selected?.displayReuploaded || !!selected?.reuploaded || String(selected?.status || "").trim().toLowerCase() === "reuploaded";
      const serviceRejected = lead?.status === "Rejected";
      const isDraftDocument = String(selected?.type || "").trim().toLowerCase() === "draft";
      const leadStatusLower = String(lead?.status || "").trim().toLowerCase();
      const draftRejected = leadStatusLower === "draftrejected";
      const draftAccepted = leadStatusLower === "draftaccepted" || leadStatusLower === "useraccepted" || leadStatusLower === "completed";
      const draftShared = leadStatusLower === "draftsent" || leadStatusLower === "draftrejected" || leadStatusLower === "draftaccepted" || leadStatusLower === "useraccepted";

      let resolvedStatus = selected?.status || "Waiting Review";
      if (isDraftDocument) {
        resolvedStatus = draftAccepted
          ? "Accepted"
            : draftRejected
              ? "Draft Rejected"
              : draftShared
                ? "Waiting for User Draft Approval"
                  : isReuploaded
                    ? "Draft Uploaded"
                    : "Draft Uploaded";
      } else if (isStagedRejection && !isReuploaded) {
        // PR hasn't notified client yet — show neutral in-progress status
        resolvedStatus = "Executor Reviewing";
      } else if (serviceRejected && !isReuploaded) {
        resolvedStatus = executorRejected ? "Rejected by Executor" : "Rejected";
      }

      return {
        ...selected,
        status: resolvedStatus,
        displayReuploaded: isReuploaded,
        executorRejected: executorRejected && serviceRejected && !isReuploaded && !isStagedRejection,
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
  };

  // --- Hydration helpers (merge server docs with any pending local uploads) ---
  const extractCloudinaryPublicIdFromUrl = (url) => {
    const rawUrl = String(url || "").trim();
    if (!rawUrl) return "";

    try {
      const parsed = new URL(rawUrl);
      const marker = "/upload/";
      const markerIndex = parsed.pathname.indexOf(marker);
      if (markerIndex === -1) return "";

      let publicId = parsed.pathname.slice(markerIndex + marker.length);
      publicId = publicId.replace(/^v\d+\//, "");
      publicId = publicId.replace(/\.[a-z0-9]+$/i, "");
      return publicId.trim();
    } catch {
      return "";
    }
  };

  const normalizeServiceKey = (value) =>
    String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const getCatalogServiceForLead = (lead) => {
    const target = normalizeServiceKey(lead?.serviceName);
    if (!target) return null;
    return services.find((s) => normalizeServiceKey(s?.title) === target) || null;
  };

  const getLeadRevenueWithCatalog = (lead) => {
    const catalog = getCatalogServiceForLead(lead);
    return getLeadRevenueAmount(lead, catalog);
  };

  const getPendingUploadsForService = (serviceName) => {
    const target = normalizeServiceKey(serviceName);
    if (!target) return [];

    const saved = localStorage.getItem("pending_uploads");
    if (!saved) return [];

    try {
      const parsed = JSON.parse(saved);
      const currentUserId = JSON.parse(localStorage.getItem("user"))?._id;
      if (parsed?.userId && currentUserId && String(parsed.userId) !== String(currentUserId)) {
        return [];
      }

      const docsByService = parsed?.docs || {};
      const serviceDocs =
        docsByService[serviceName] ||
        Object.entries(docsByService).find(([key]) => normalizeServiceKey(key) === target)?.[1] ||
        {};

      return Object.entries(serviceDocs).flatMap(([docName, value]) => {
        const arr = Array.isArray(value) ? value : value ? [value] : [];
        return arr
          .filter(Boolean)
          .map((item) => ({
            name: item?.name || docName,
            originalName: item?.name || docName,
            url: item?.url || item?.secure_url || "",
            publicId: item?.publicId || item?.filename || extractCloudinaryPublicIdFromUrl(item?.url || item?.secure_url || ""),
            type: "Client",
            status: "Pending",
            uploadedAt: item?.uploadedAt || new Date(),
            reuploaded: !!item?.reuploaded,
          }))
          .filter((doc) => !!doc.url || !!doc.publicId);
      });
    } catch {
      return [];
    }
  };

  const normalizeDocumentName = (doc) => {
    const fallbackName =
      doc?.name ||
      doc?.originalName ||
      doc?.fileName ||
      doc?.filename ||
      doc?.publicId ||
      doc?.url ||
      "Document";

    const cleaned = String(fallbackName).trim();
    if (!cleaned) return "Document";
    return cleaned.includes("/") ? (cleaned.split("/").pop() || "Document") : cleaned;
  };

  const dedupeDocumentsByName = (documents, options = {}) => {
    const docs = Array.isArray(documents) ? documents.filter(Boolean) : [];
    if (docs.length === 0) return [];
    const reuploadedDocumentNames = new Set(
      Array.isArray(options?.reuploadedDocumentNames)
        ? options.reuploadedDocumentNames.map((name) => String(name || "").trim().toLowerCase()).filter(Boolean)
        : [],
    );

    const sorted = [...docs].sort((a, b) => {
      const aTime = new Date(a?.uploadedAt || a?.createdAt || 0).getTime();
      const bTime = new Date(b?.uploadedAt || b?.createdAt || 0).getTime();
      return bTime - aTime;
    });

    const grouped = new Map();
    for (const doc of sorted) {
      const key = normalizeServiceKey(normalizeDocumentName(doc));
      if (!key) continue;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(doc);
    }

    return Array.from(grouped.values()).map((group) => {
      const reuploadedDoc = group.find(
        (doc) =>
          !!doc?.displayReuploaded ||
          !!doc?.reuploaded ||
          String(doc?.status || "").trim().toLowerCase() === "reuploaded",
      );
      const rejectedDoc = group.find((doc) => String(doc?.status || "").trim().toLowerCase() === "rejected");
      const selected =
        reuploadedDoc ||
        rejectedDoc ||
        group.find((doc) => String(doc?.status || "").trim().toLowerCase() !== "rejected") ||
        group[0];
      const fileSource =
        group.find(
          (doc) =>
            !!doc?.url ||
            !!doc?.secure_url ||
            !!doc?.uploadedUrl ||
            !!doc?.viewUrl ||
            !!doc?.publicId ||
            !!doc?.filename ||
            !!doc?.fileName,
        ) ||
        selected;
      const docName = String(normalizeDocumentName(selected)).trim().toLowerCase();

      const resolvedUrl =
        selected?.url ||
        selected?.secure_url ||
        selected?.uploadedUrl ||
        selected?.viewUrl ||
        fileSource?.url ||
        fileSource?.secure_url ||
        fileSource?.uploadedUrl ||
        fileSource?.viewUrl ||
        "";
      const resolvedPublicId =
        selected?.publicId ||
        selected?.filename ||
        selected?.fileName ||
        fileSource?.publicId ||
        fileSource?.filename ||
        fileSource?.fileName ||
        extractCloudinaryPublicIdFromUrl(resolvedUrl);

      return {
        ...selected,
        name: normalizeDocumentName(selected),
        url: resolvedUrl,
        publicId: resolvedPublicId,
        displayReuploaded:
          reuploadedDocumentNames.has(docName) ||
          !!selected?.displayReuploaded ||
          !!selected?.reuploaded ||
          String(selected?.status || "").trim().toLowerCase() === "reuploaded",
      };
    });
  };

  const hydrateLeadsWithDocuments = (leadList, servicesList = []) => {
    const list = Array.isArray(leadList) ? leadList : [];
    return list.map((lead) => {
      // Required-document placeholders are sourced from THIS lead's own
      // documentsRequired field only — never the shared Service catalog.
      // A document admin requested for one user must never appear as
      // "required"/"Pending" on another user's lead for the same service,
      // including any names that leaked into the catalog before this fix.
      const leadRequiredDocNames = Array.isArray(lead?.documentsRequired) ? lead.documentsRequired : [];

      let requiredDocs = [];
      if (leadRequiredDocNames.length > 0) {
        // Identify which document names have admin-added placeholders (to preserve the flag after dedupe)
        const adminAddedDocNames = new Set(
          (Array.isArray(lead?.documents) ? lead.documents : [])
            .filter(d => d?.adminAdded === true && !d?.url && !d?.publicId && !d?.secure_url && !d?.uploadedUrl)
            .map(d => String(d?.name || "").trim().toLowerCase())
        );
        // Don't synthesize a "Pending" placeholder for a name that already has a
        // real uploaded file — otherwise it competes with the real entry for the
        // same name once merged.
        const namesWithRealUpload = new Set(
          (Array.isArray(lead?.documents) ? lead.documents : [])
            .filter(d => !!(d?.url || d?.publicId || d?.secure_url || d?.uploadedUrl))
            .map(d => String(d?.name || "").trim().toLowerCase())
        );
        requiredDocs = leadRequiredDocNames
          .filter((docName) => !namesWithRealUpload.has(String(docName || "").trim().toLowerCase()))
          .map((docName) => ({
            name: docName,
            status: "Pending",
            type: "Client",
            adminAdded: adminAddedDocNames.has(String(docName || "").trim().toLowerCase())
          }));
      }

      const pendingDocs = getPendingUploadsForService(lead?.serviceName);
      const currentDocs = Array.isArray(lead?.documents) ? lead.documents : [];
      // Filter out admin-added placeholder entries (adminAdded: true with no URL) so the document
      // only appears in the dashboard once the user has actually uploaded a file.
      const realCurrentDocs = currentDocs.filter(
        (d) => !(d?.adminAdded === true && !d?.url && !d?.publicId && !d?.secure_url && !d?.uploadedUrl)
      );
      const mergedDocsRaw = dedupeDocumentsByName([...realCurrentDocs, ...pendingDocs, ...requiredDocs], {
        reuploadedDocumentNames: lead?.reuploadedDocumentNames,
      });
      // requiredDocs (sourced from the service catalog) never carry a URL, so an
      // unresolved admin-requested one would otherwise slip through the merge above
      // (only realCurrentDocs was filtered) and show up as a "Pending" document
      // before the client has uploaded anything.
      const mergedDocs = mergedDocsRaw.filter(
        (d) => !(d?.adminAdded === true && !d?.url && !d?.publicId && !d?.secure_url && !d?.uploadedUrl)
      );

      const executorRejected = isExecutorRejectedState(lead);
      const serviceRejected = String(lead?.status || "").trim().toLowerCase() === "rejected";
      const draftRejected = String(lead?.status || "").trim().toLowerCase() === "draftrejected";
      // Staged: executor rejected but PR hasn't notified client yet — docs stay neutral
      const isStagedRejection =
        lead?.executorServiceRejected === true &&
        lead?.prNotifiedClientServiceRejection !== true;

      let finalDocs = mergedDocs.map((doc) => {
        let resolvedStatus = doc?.status || "Pending";
        if (isStagedRejection && serviceRejected) {
          // Keep existing accepted/pending status but show "Executor Reviewing" for non-draft docs
          const docType = String(doc?.type || "").trim().toLowerCase();
          if (docType !== "draft" && docType !== "final") {
            resolvedStatus = "Executor Reviewing";
          }
        } else if (serviceRejected) {
          resolvedStatus = "Rejected";
        } else if (draftRejected && String(doc?.type || "").trim().toLowerCase() === "draft") {
          resolvedStatus = "Rejected";
        }

        return {
          ...doc,
          status: resolvedStatus,
          executorRejected: executorRejected && serviceRejected && !isStagedRejection,
          displayReuploaded:
            (serviceRejected && !isStagedRejection) || draftRejected
              ? false
              : !!doc?.displayReuploaded || !!doc?.reuploaded || String(doc?.status || "").trim().toLowerCase() === "reuploaded",
        };
      });

      // Filter out draft documents that haven't been sent yet
      const isDraftSent = ["DraftSent", "DraftAccepted", "DraftRejected", "UserAccepted", "Completed"].includes(lead?.status);
      if (!isDraftSent) {
        finalDocs = finalDocs.filter(doc => String(doc?.type || "").trim().toLowerCase() !== "draft");
      }

      // Names that have ANY entry in the lead's raw documents array (placeholder
      // or real file) — used by the "Send to User" button to know which
      // requested document names have already been communicated to the client,
      // since `documents` above deliberately strips out unresolved placeholders.
      const rawDocumentNames = (Array.isArray(lead?.documents) ? lead.documents : [])
        .map((d) => String(d?.name || "").trim().toLowerCase())
        .filter(Boolean);

      return {
        ...lead,
        documents: finalDocs,
        rawDocumentNames,
      };
    });
  };

  const isPrReuploadReviewState = (lead) => {
    if (!lead) return false;
    const statusLower = String(lead?.status || "").trim().toLowerCase();
    if (!["rejected", "informationrequired", "pendingreview"].includes(statusLower)) return false;

    const docs = getVisibleDocuments(lead) || [];
    const hasReuploaded = docs.some(
      (d) => !!d?.displayReuploaded || !!d?.reuploaded || String(d?.status || "").toLowerCase() === "reuploaded",
    );

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
    return displayReason ? `${getRejectedByPrLabel(lead)}: ${displayReason}` : getRejectedByPrLabel(lead);
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
    if (isPrReuploadReviewState(lead)) return getPrReviewingLabel(lead);
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
      "rejected by pr",
      "document rejected",
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
    if (lead?.status === "PR_Accepted") return "Accepted by PR";
    if (lead?.status === "InformationRequired") return hasRejectedDocuments(lead) ? getRejectedByPrLabel(lead) : getPrReviewingLabel(lead);
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
    const isDraftDocument = String(doc?.type || "").trim().toLowerCase() === "draft";
    const leadStatusLower = String(lead?.status || "").trim().toLowerCase();
    const isReuploaded = !!doc?.displayReuploaded || !!doc?.reuploaded || String(doc?.status || "").trim().toLowerCase() === "reuploaded";
    const draftRejected = leadStatusLower === "draftrejected";
    const draftAccepted = leadStatusLower === "draftaccepted" || leadStatusLower === "useraccepted" || leadStatusLower === "completed";
    const draftShared = leadStatusLower === "draftsent" || leadStatusLower === "draftrejected" || leadStatusLower === "draftaccepted" || leadStatusLower === "useraccepted";
    if (isDraftDocument) {
      if (draftAccepted) return "Accepted";
      if (draftRejected) return "Draft Rejected";
      if (draftShared) return "Draft Shared";
      if (isReuploaded) return "Draft Uploaded";
      return "Draft Uploaded";
    }
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
    const status = getEffectiveLeadStatus(lead);

    // Executor rejected the service but PR hasn't clicked "Notify Client" yet —
    // show as "Executor X Reviewing" in the admin dashboard too (mirrors user view).
    if (lead?.executorServiceRejected === true && lead?.prNotifiedClientServiceRejection !== true) {
      const execLabel = resolveExecutorLabel(lead);
      return `${execLabel} Reviewing`;
    }

    if (status === "ExecutionFinished" && lead?.draftSentToPR) {
      return `Draft Sent to PR by ${resolveExecutorLabel(lead)}`;
    }
    if (isPrReuploadReviewState(lead)) return getPrReviewingLabel(lead);
    const rejectionLabel = getRejectionDisplayLabel(lead);
    if (rejectionLabel) return rejectionLabel;
    if (status === "Rejected" && !isPrReuploadReviewState(lead)) {
      const label = getRejectionDisplayLabel(lead);
      if (label) return label;
    }
    if (status === "PendingReview") return getPrReviewingLabel(lead);
    if (status === "InformationRequired") return getRejectedByPrLabel(lead);
    return getStatusLabel(status, lead, "admin");
  };

  const getStatusTheme = (lead) => {
    const status = getEffectiveLeadStatus(lead);

    if (status === "ExecutionFinished" && lead?.draftSentToPR) {
      return { color: "#7c3aed", bg: "rgba(124,58,237,0.1)" };
    }
    // Staged executor rejection — treat as in-progress (green) for admin too
    if (lead?.executorServiceRejected === true && lead?.prNotifiedClientServiceRejection !== true) {
      return { color: "#16a34a", bg: "rgba(16,163,74,0.1)" };
    }

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
      return { color: "#16a34a", bg: "rgba(22,163,74,0.1)" };
    }
    if (status === "InformationRequired") {
      return { color: "#ef4444", bg: "rgba(239,68,68,0.1)" };
    }
    if (status === "Completed") {
      return { color: "#10b981", bg: "rgba(16,185,129,0.1)" };
    }
    if (["InProgress", "AssignedToExecutor"].includes(status)) {
      return { color: "#16a34a", bg: "rgba(16,163,74,0.1)" };
    }
    if (status === "InformationRequired" || status === "DraftRejected") {
      return { color: "#ef4444", bg: "rgba(239,68,68,0.1)" };
    }
    if (status === "DraftSent" || status === "ExecutionFinished") {
      return { color: "#16a34a", bg: "rgba(22,163,74,0.1)" };
    }
    if (status === "PR_Accepted" || status === "DraftAccepted") {
      return { color: "#10b981", bg: "rgba(16,185,129,0.1)" };
    }
    if (status === "Open" && hasAdminRejectedDocuments(lead)) {
      return { color: "#ef4444", bg: "rgba(239,68,68,0.1)" };
    }
    return { color: "#f59e0b", bg: "rgba(245,158,11,0.1)" };
  };

  const searchTerm = searchQuery.trim().toLowerCase();
  const filteredLeads = visibleLeads.filter((lead) => {
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
      String(getLeadRevenueWithCatalog(lead) || ""),
      String(formatInr(getLeadRevenueWithCatalog(lead)) || ""),
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
      setSelectedLeadId(filteredLeads[0]?._id || null);
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
      getServicesByStatus={getServicesByStatus}
      getTotalRevenueBreakdown={getTotalRevenueBreakdown}
      formatInr={formatInr}
      getLeadRevenueAmount={getLeadRevenueWithCatalog}
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
      handleDeletePrAdditionalDetailsMessage={handleDeletePrAdditionalDetailsMessage}
      handleDeleteExecutorMessage={handleDeleteExecutorMessage}
      handleDeleteAdminMessage={handleDeleteAdminMessage}
      messageTarget={messageTarget}
      setMessageTarget={setMessageTarget}
      messageText={messageText}
      setMessageText={setMessageText}
      getMessageTextByTarget={getMessageTextByTarget}
      executors={executors}
      prUsers={prUsers}
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
      newDocName={newDocName}
      setNewDocName={setNewDocName}
      isSavingRequiredDocuments={isSavingRequiredDocuments}
      isSendingDocuments={isSendingDocuments}
      handleAddRequiredDocument={handleAddRequiredDocument}
      handleRemoveRequiredDocument={handleRemoveRequiredDocument}
      handleSendDocumentsToUser={handleSendDocumentsToUser}
      handleUpdateWorkingDays={handleUpdateWorkingDays}
      handleUpdateDocumentStatus={handleUpdateDocumentStatus}
      updatingDocStatusId={updatingDocStatusId}
      handleAcceptService={handleAcceptService}
      handleRejectService={handleRejectService}
      isUpdatingServiceStatus={isUpdatingServiceStatus}
    />
  );
};

export default AdminDashboard;
