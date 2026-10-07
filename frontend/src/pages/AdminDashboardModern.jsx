import React from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import axios from "axios";
import { toast } from "react-hot-toast";
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
  Users,
  ShieldCheck,
  Pencil,
  Check,
  XCircle,
} from "lucide-react";
import ConfirmationModal from "../components/ConfirmationModal";
import { viewDocument } from "../utils/documentViewer";
import { normalizeRole, getAssignableRoleError } from "../utils/roleRouting";
import { resolvePrLabel, resolveExecutorLabel, areAllRequiredDocumentsUploaded, hasAdminRejectedDocuments, allAdminRequiredDocumentsRejected, isPreSubmissionStage } from "../utils/statusLabels";

const PremiumCard = ({ children, style = {}, className = "", onClick }) => (
  <div
    className={className}
    onClick={onClick}
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

const AdminDashboardModern = ({
  navigate,
  filteredLeads,
  activeLead,
  setSelectedLeadId,
  searchQuery,
  setSearchQuery,
  stats,
  getServicesByStatus,
  getTotalRevenueBreakdown,
  formatInr,
  getLeadRevenueAmount,
  getStatusTheme,
  getDisplayStatus,
  getServiceOutcomeLabel,
  getDocumentStatusSummary,
  getDocumentSummaryChip,
  getVisibleDocuments,
  getDocumentDisplayStatus,
  getServiceReviewSummary,
  getExecutorRejectionReason,
  getReviewSummarySignature,
  isExecutorRejectedLead,
  hasAcceptedDocuments,
  hasRejectedDocuments,
  dismissedReviewSummarySignatureByLead,
  handleDismissReviewSummary,
  handleDeleteService,
  handleApprove,
  handleReject,
  handleSendDraft,
  handleComplete,
  handleUpdateLead,
  handleDeleteUserMessage,
  handleDeletePrMessage,
  handleDeletePrAdditionalDetailsMessage,
  handleDeleteExecutorMessage,
  handleDeleteAdminMessage,
  messageTarget,
  setMessageTarget,
  messageText,
  setMessageText,
  getMessageTextByTarget,
  executors,
  prUsers = [],
  uploadingId,
  handleUploadDraft,
  deleteConfirm,
  handleConfirmDelete,
  setDeleteConfirm,
  draftRejectingLeadId,
  draftRejectDrafts,
  setDraftRejectDrafts,
  openDraftRejectForm,
  submitDraftReject,
  handleDraftAction,
  isDetailsMissingState,
  isReviewDraftState,
  isExecutorRejectedState,
  dismissedDetailsMissingSignatureByLead,
  getDetailsMissingSignature,
  getDetailsMissingMessage,
  handleDismissDetailsMissingMessage,
  handleDeleteRejectionMessage,
  newDocName,
  setNewDocName,
  isSavingRequiredDocuments,
  isSendingDocuments,
  handleAddRequiredDocument,
  handleRemoveRequiredDocument,
  handleSendDocumentsToUser,
  handleUpdateWorkingDays,
  handleUpdateDocumentStatus,
  updatingDocStatusId,
  handleAcceptService,
  handleRejectService,
  isUpdatingServiceStatus,
}) => {
  const [serviceListModal, setServiceListModal] = React.useState(null);
  const [selectedPrId, setSelectedPrId] = React.useState("");
  React.useEffect(() => {
    const existing = activeLead?.prId?._id || activeLead?.prId || "";
    setSelectedPrId(String(existing || ""));
  }, [activeLead?._id]);
  const [revenuePopup, setRevenuePopup] = React.useState(null);
  const [managePRModal, setManagePRModal] = React.useState(false);
  const [assignEmail, setAssignEmail] = React.useState("");
  const [assignRole, setAssignRole] = React.useState("");
  const [assignLoading, setAssignLoading] = React.useState(false);
  const [assignError, setAssignError] = React.useState("");
  const [assignSuccess, setAssignSuccess] = React.useState("");
  const [prExecutorList, setPRExecutorList] = React.useState([]);
  const [prListLoading, setPRListLoading] = React.useState(false);
  const [prListError, setPRListError] = React.useState("");
  const [editingUser, setEditingUser] = React.useState(null);
  const [editRole, setEditRole] = React.useState("");
  const [editLoading, setEditLoading] = React.useState(false);
  const [editError, setEditError] = React.useState("");
  const [documentsOpen, setDocumentsOpen] = React.useState(false);
  const [isMessageTargetOpen, setIsMessageTargetOpen] = React.useState(false);
  const [uploadType, setUploadType] = React.useState("Draft");
  const [syncedSidebarHeight, setSyncedSidebarHeight] = React.useState(null);
  const detailsPanelRef = React.useRef(null);
  const [isCompactMobile, setIsCompactMobile] = React.useState(() =>
    typeof window !== "undefined" ? window.innerWidth <= 480 : false,
  );
  const uploadInputRef = React.useRef(null);
  const [workingDaysDraft, setWorkingDaysDraft] = React.useState(null);
  const [documentsNoteDraft, setDocumentsNoteDraft] = React.useState(null);

  // Switching leads must not carry over a note draft typed for a different
  // user/service — reset back to that lead's own saved note.
  React.useEffect(() => {
    setDocumentsNoteDraft(null);
  }, [activeLead?._id]);

  // The only executor who will ever see a lead's adminToExecutorMessage is
  // whichever executor this specific lead is actually assigned to — so the
  // "Executor" recipient option must show that real, DB-stored executor by
  // name instead of a generic label, and must not appear at all until the
  // lead has an assigned executor to send it to.
  const assignedExecutorRoleKey = String(activeLead?.assignedExecutor || "").trim().toLowerCase();
  const assignedExecutorRecord = assignedExecutorRoleKey && Array.isArray(executors)
    ? executors.find((ex) => String(ex?.role || "").trim().toLowerCase() === assignedExecutorRoleKey)
    : null;
  const assignedExecutorLabel = assignedExecutorRecord
    ? `${assignedExecutorRecord.name} (${assignedExecutorRoleKey})`
    : assignedExecutorRoleKey
      ? assignedExecutorRoleKey.charAt(0).toUpperCase() + assignedExecutorRoleKey.slice(1)
      : "";
  const hasAssignedExecutor = !!assignedExecutorRoleKey;

  React.useEffect(() => {
    setDocumentsOpen(false);
    setWorkingDaysDraft(null);
  }, [activeLead?._id]);

  // If the newly selected lead has no assigned executor, "executor" is not a
  // valid recipient — fall back to messaging the client instead of leaving a
  // message staged for a non-existent recipient.
  React.useEffect(() => {
    if (messageTarget === "executor" && !activeLead?.assignedExecutor) {
      setMessageTarget("client");
      setMessageText(getMessageTextByTarget(activeLead, "client"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLead?._id]);

  const selectedPrTargetLabel = React.useMemo(() => {
    if (!String(messageTarget || "").startsWith("pr:")) return "";
    const pr = prUsers.find((u) => `pr:${u._id}` === messageTarget);
    return pr ? `${pr.name || pr.email} (${String(pr.role || "").toUpperCase()})` : "";
  }, [messageTarget, prUsers]);

  const fetchPRExecutorList = React.useCallback(() => {
    const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
    const apiUrl = import.meta.env.VITE_API_URL;
    setPRListLoading(true);
    setPRListError("");
    axios.get(`${apiUrl}/auth/pr-executors`, { headers: { Authorization: `Bearer ${storedUser.token}` } })
      .then((res) => { setPRExecutorList(Array.isArray(res.data) ? res.data : []); })
      .catch((err) => { setPRListError(err?.response?.data?.message || "Failed to load users."); setPRExecutorList([]); })
      .finally(() => setPRListLoading(false));
  }, []);

  React.useEffect(() => {
    if (!managePRModal) return;
    fetchPRExecutorList();
  }, [managePRModal, fetchPRExecutorList]);

  React.useEffect(() => {
    const handleResize = () => setIsCompactMobile(window.innerWidth <= 480);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  React.useEffect(() => {
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
  }, [activeLead?._id, documentsOpen]);

  const currentUser = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("user") || "{}") : {};
  const isUserRole = normalizeRole(currentUser.role) === "user";

  const systemPhrases = ["status changed", "lead assigned", "draft accepted", "draft sent", "draft rejected", "document accepted", "document rejected", "service updated", "rejected by executor", "assignment rejected"];
  const isSystemMessage = (msg) => {
    if (!msg) return false;
    const lower = msg.toLowerCase();
    return systemPhrases.some(p => lower.includes(p));
  };

  // Names already pushed to the client (placeholder or real file) on a previous
  // send. Sourced from rawDocumentNames (not the filtered `documents` list,
  // which strips out unresolved placeholders) so this stays correct even after
  // a page refresh. Used to keep "Send to User" disabled once sent, re-enabling
  // only when a document is added that hasn't been sent yet.
  const sentRequiredDocNames = new Set(activeLead?.rawDocumentNames || []);
  const hasUnsentRequiredDocuments = (activeLead?.documentsRequired || []).some(
    (name) => !sentRequiredDocNames.has(String(name || "").trim().toLowerCase()),
  );

  const documents = activeLead ? getVisibleDocuments(activeLead) : [];
  const clientOnlyDocs = documents.filter((doc) => {
    const t = String(doc?.type || "").trim().toLowerCase();
    const n = String(doc?.name || "").trim().toLowerCase();
    return t !== "draft" && t !== "final" && !n.startsWith("final");
  });
  const draftFinalDocs = documents.filter((doc) => {
    const t = String(doc?.type || "").trim().toLowerCase();
    const n = String(doc?.name || "").trim().toLowerCase();
    return t === "draft" || t === "final" || n.startsWith("final");
  });
  const uploadedDocs = clientOnlyDocs.filter((doc) => {
    const status = String(doc?.status || "").trim().toLowerCase();
    return ["uploaded", "accepted", "verified", "approved", "completed", "reuploaded"].includes(status) || !!doc?.url;
  });
  const rejectedDocs = clientOnlyDocs.filter((doc) => String(doc?.status || "").toLowerCase() === "rejected");
  const reviewSummary = activeLead ? getServiceReviewSummary(activeLead) : "";
  const serviceOutcomeLabel = activeLead ? getServiceOutcomeLabel(activeLead) : "";
  const activeLeadStatus = String(activeLead?.status || "").trim();
  const activeLeadStatusLower = activeLeadStatus.toLowerCase();
  const hasFinalDocument = documents.some((doc) => {
    const docType = String(doc?.type || "").trim().toLowerCase();
    const docName = String(doc?.name || "").trim().toLowerCase();
    return docType === "final" || docName.startsWith("final");
  });
  const effectiveServiceStatus = hasFinalDocument && !["rejected", "informationrequired"].includes(activeLeadStatusLower)
    ? "Completed"
    : activeLeadStatus;
  const activeLeadForDisplay = activeLead ? { ...activeLead, status: effectiveServiceStatus } : null;
  const isPendingPrReviewStatus = effectiveServiceStatus === "PendingReview";
  // "Pending PR Review" becomes "PR 1 (Name) Reviewing" once the admin has
  // forwarded the lead to a specific PR.
  const pendingPrText = (lead) => {
    const prLabel = resolvePrLabel(lead);
    return prLabel ? `${prLabel} Reviewing` : "Pending PR Review";
  };
  const displayStatusLabel = (lead) => {
    const rawLabel = getDisplayStatus(lead);
    return ["Open", "PendingReview"].includes(String(rawLabel || "")) ? "Pending PR Review" : rawLabel;
  };
  const topRightStatusLabel = serviceOutcomeLabel.startsWith("Rejected")
    ? serviceOutcomeLabel.split(":")[0]
    : effectiveServiceStatus === "Completed"
      ? "Completed"
      : isPendingPrReviewStatus
        ? pendingPrText(activeLeadForDisplay)
        : serviceOutcomeLabel;
  const pendingReviewTextColor = "#16a34a";
  const getServiceProgressPercent = (lead) => {
    if (!lead) return 0;

    // Staged executor rejection — show InProgress-level progress (60%)
    if (lead?.executorServiceRejected === true && lead?.prNotifiedClientServiceRejection !== true) {
      return 60;
    }

    if (isExecutorRejectedState(lead)) return 20;
    if (isDetailsMissingState(lead)) return 20;

    const status = String(
      lead === activeLead ? effectiveServiceStatus : lead.status || "",
    ).trim();
    if (status === "Open" && allAdminRequiredDocumentsRejected(lead)) return 5;
    if (status === "Open" && hasAdminRejectedDocuments(lead)) return 12;
    // Only bump progress once the user has paid and clicked Submit — uploading
    // every required file isn't submission by itself.
    if (status === "Open" && areAllRequiredDocumentsUploaded(lead) && lead?.initialSubmissionConfirmed === true) return 15;
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
    };

    return progressByStatus[status] ?? 0;
  };
  const serviceProgressPercent = getServiceProgressPercent(activeLead);
  const uploadedDocumentCount = uploadedDocs.length;
  const hasReuploadedDocs = documents.some(doc => {
    return !!doc?.displayReuploaded || !!doc?.reuploaded;
  });
  const serviceProgressMessage = !activeLead
    ? "No service selected."
    : effectiveServiceStatus === "Completed"
      ? "Service completed."
      // Staged executor rejection — PR hasn't notified client yet
      : activeLead?.executorServiceRejected === true && activeLead?.prNotifiedClientServiceRejection !== true
        ? `${resolveExecutorLabel(activeLead)} is reviewing the service.`
      : serviceOutcomeLabel.startsWith("Rejected")
          ? `${serviceOutcomeLabel}.`
        : activeLeadStatus === "InformationRequired" && hasReuploadedDocs && rejectedDocs.length === 0
          ? "Documents have been reuploaded and are pending PR review."
        : isDetailsMissingState(activeLead)
          ? "Service rejected by PR. Please review missing or rejected documents."
        : activeLeadStatus === "Open" && activeLead?.documentsSentToUser
          ? (allAdminRequiredDocumentsRejected(activeLead)
              ? "All documents rejected by admin. Waiting for client to reupload."
              : hasAdminRejectedDocuments(activeLead)
                ? "Some documents rejected by admin. Waiting for client to reupload."
                : areAllRequiredDocumentsUploaded(activeLead) ? "All documents uploaded. Pending admin review." : "Pending client documents upload.")
          : {
            Open: "Pending admin review and documents upload.",
            PendingReview: "Documents are being reviewed by PR.",
            InformationRequired: "Service rejected by PR. Action required.",
            PR_Accepted: "Documents verified. Awaiting executor assignment.",
            AssignedToExecutor: "Executor assigned. Service is starting.",
            InProgress: "Accepted by Executor.",
            ExecutionFinished: activeLead?.draftSentToPR ? `Draft sent to PR by ${resolveExecutorLabel(activeLead)}. Awaiting PR to send to client.` : `Draft uploaded by ${resolveExecutorLabel(activeLead)}. Awaiting to send to PR.`,
            DraftSent: "Waiting for User Draft Approval.",
            DraftAccepted: "Draft approved. Waiting for final completion.",
            UserAccepted: "Draft approved. Waiting for final completion.",
            DraftRejected: "Draft rejected. Waiting for revision.",
            Rejected: "Service has been rejected.",
            Completed: "Service completed successfully.",
          }[String(activeLead.status || "").trim()] || "Service is in progress.";
  const reviewStatusMessage = ["Open", "PendingReview"].includes(effectiveServiceStatus)
    ? serviceProgressMessage
    : "";

  const handlePickUpload = (nextType) => {
    setUploadType(nextType);
    uploadInputRef.current?.click();
  };

  const handleUploadInput = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !activeLead) return;
    await handleUploadDraft(activeLead._id, file, uploadType);
    event.target.value = "";
  };

  const handleSelectLead = (leadId) => {
    setSelectedLeadId?.(leadId);
  };

  const handleServiceListClick = (status) => {
    const services = getServicesByStatus(status);
    setServiceListModal({ status, services });
  };

  const handleRevenuePopupClick = () => {
    const breakdown = getTotalRevenueBreakdown();
    const allLeads = filteredLeads;
    const perService = allLeads
      .map((l) => ({
        serviceName: l.serviceName,
        amount: getLeadRevenueAmount(l) || 0,
      }))
      .filter((i) => i.amount > 0);
    setRevenuePopup({ breakdown: perService, total: breakdown.total });
  };

  const modalOverlayStyle = {
    position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
    background: "rgba(0,0,0,0.45)", zIndex: 10000,
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: 20,
  };
  const modalBoxStyle = {
    background: "#fff", borderRadius: 16, maxWidth: 540, width: "100%",
    height: "80vh", maxHeight: "80vh", display: "flex", flexDirection: "column", overflow: "hidden",
    boxShadow: "0 12px 40px rgba(0,0,0,0.2)",
  };

  const containerStyle = {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top, rgba(248, 250, 252, 1) 0%, rgba(241, 245, 249, 1) 50%, rgba(226, 232, 240, 1) 100%)",
    color: "#111111",
    "--text": "#111111",
    "--text-secondary": "#4b5563",
    "--text-muted": "#6b7280",
    "--card-content-text": "#111111",
    "--card-content-muted": "#6b7280",
    paddingTop: isCompactMobile ? "clamp(112px, 16vw, 126px)" : "clamp(130px, 14vw, 150px)",
    paddingBottom: 64,
    position: "relative",
    overflow: "hidden",
  };

  return (
    <div className="home-page-shell admin-dashboard-shell" style={containerStyle}>
      <div className="home-page-backdrop" style={{ background: "#f8fafc" }} aria-hidden="true" />
      <style>{`
        .admin-dashboard-shell .dashboard-stat-grid {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 10px;
          margin-bottom: 0;
          align-items: stretch;
        }
        .admin-dashboard-shell .dashboard-shell {
          width: 100%;
          background: #f4f4f5;
          border: 1px solid rgba(17,24,39,0.08);
          border-radius: 0;
          box-shadow: none;
          overflow: hidden;
        }
        .admin-dashboard-shell .stat-card {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: default;
        }
        .admin-dashboard-shell .stat-card:hover {
          transform: translateY(-6px) scale(1.03);
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04) !important;
          border-color: rgba(17,24,39,0.18) !important;
          z-index: 10;
        }
        .admin-dashboard-shell .dashboard-shell-inner {
          padding: 10px 14px 10px;
        }
        .admin-dashboard-shell .dashboard-main-grid {
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
        .admin-dashboard-shell .dashboard-panels-divider {
          background: rgba(17,24,39,0.08);
          align-self: stretch;
          border-radius: 0;
        }
        .admin-dashboard-shell .dashboard-service-row {
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .admin-dashboard-shell .dashboard-service-row:hover {
          transform: scale(1.015) translateY(-2px);
          box-shadow: 0 6px 15px -4px rgba(0, 0, 0, 0.08);
          border-color: rgba(34, 197, 94, 0.2) !important;
          z-index: 2;
        }
        .admin-dashboard-shell .inner-card {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .admin-dashboard-shell .inner-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 20px -10px rgba(0, 0, 0, 0.12) !important;
          border-color: rgba(17,24,39,0.18) !important;
        }
        .admin-dashboard-shell .dashboard-panels-shell {
          padding: 18px 0 0 0;
          border-radius: 0;
          margin-top: 0;
          background: transparent;
          border: none;
          box-shadow: none;
        }
        .admin-dashboard-shell .dashboard-section-divider {
          height: 1px;
          width: 100%;
          background: rgba(17,24,39,0.08);
          margin: 6px 0 8px 0;
        }
        .admin-dashboard-shell .dashboard-sidebar-panel {
          height: auto;
          min-height: 0;
          display: flex;
          flex-direction: column;
          align-self: start;
        }
        .admin-dashboard-shell .dashboard-details-panel {
          height: auto;
          display: flex;
          flex-direction: column;
          align-self: start;
        }
        .admin-dashboard-shell .dashboard-details-scroll {
          flex: 0 0 auto;
          min-height: auto;
          overflow: visible;
          padding-right: 0;
          margin-right: 0;
        }
        .admin-dashboard-shell .dashboard-sidebar-scroll {
          flex: 1;
          height: 0;
          min-height: 0;
          overflow-y: auto;
          padding-right: 4px;
          margin-right: -4px;
          scrollbar-width: thin;
          scrollbar-color: #b8b8b8 transparent;
        }
        .admin-dashboard-shell .dashboard-sidebar-scroll::-webkit-scrollbar {
          width: 6px;
        }
        .admin-dashboard-shell .dashboard-sidebar-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .admin-dashboard-shell .dashboard-sidebar-scroll::-webkit-scrollbar-thumb {
          background: #b8b8b8;
          border-radius: 999px;
        }
        .admin-dashboard-shell .dashboard-sidebar-scroll::-webkit-scrollbar-thumb:hover {
          background: #9ca3af;
        }
        .admin-dashboard-shell .dashboard-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border-radius: 999px;
          font-size: 0.86rem;
          font-weight: 700;
          line-height: 1.1;
          white-space: nowrap;
        }
        .admin-dashboard-shell .dashboard-pill .dot {
          width: 7px;
          height: 7px;
          border-radius: 999px;
          background: currentColor;
        }
        .admin-dashboard-shell .dashboard-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
        }
        .admin-dashboard-shell .dashboard-table th,
        .admin-dashboard-shell .dashboard-table td {
          padding: 13px 16px;
          border-bottom: 1px solid rgba(17, 24, 39, 0.08);
          text-align: left;
        }
        .admin-dashboard-shell .dashboard-table th {
          color: #6b7280;
          font-size: 0.8rem;
          font-weight: 700;
        }
        .admin-dashboard-shell .dashboard-table tr:last-child td {
          border-bottom: none;
        }
        .admin-dashboard-shell .dashboard-dropzone {
          border: 1px dashed rgba(34, 197, 94, 0.7);
          background: rgba(255, 255, 255, 0.03);
          transition: all 0.2s ease;
        }
        .admin-dashboard-shell .dashboard-dropzone:hover {
          border-color: rgba(34, 197, 94, 0.95);
          background: rgba(34, 197, 94, 0.05);
        }
        .admin-dashboard-shell .dashboard-search,
        .admin-dashboard-shell .dashboard-input {
          transition: all 0.2s ease;
        }
        .admin-dashboard-shell .dashboard-search:focus,
        .admin-dashboard-shell .dashboard-input:focus {
          border-color: #16a34a !important;
          box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.1);
          outline: none;
        }
        .admin-dashboard-shell .dashboard-search::placeholder {
          color: #6b7280;
        }
        @media (max-width: 1200px) {
          .admin-dashboard-shell .dashboard-stat-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          }
          .admin-dashboard-shell .dashboard-main-grid {
            grid-template-columns: 1fr;
          }
          .admin-dashboard-shell .dashboard-panels-divider {
            display: none;
          }
          .admin-dashboard-shell .dashboard-sidebar-panel {
            height: auto;
            min-height: 0;
            max-height: 350px;
          }
          .admin-dashboard-shell .dashboard-sidebar-scroll {
            height: auto;
          }
          .admin-dashboard-shell .dashboard-details-panel {
            min-height: 0;
            max-height: none;
          }
        }
        @media (max-width: 768px) {
          .admin-dashboard-shell .dashboard-stat-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 8px;
          }
          .admin-dashboard-shell .dashboard-shell-inner {
            padding: 8px 10px;
          }
          .admin-dashboard-shell .dashboard-main-grid {
            border-radius: 18px;
          }
          .admin-dashboard-shell .dashboard-sidebar-panel,
          .admin-dashboard-shell .dashboard-details-panel {
            padding: 14px 12px !important;
          }
          .admin-dashboard-shell .dashboard-table th,
          .admin-dashboard-shell .dashboard-table td {
            padding: 10px 10px;
            font-size: 0.8rem;
          }
          .admin-dashboard-shell .dashboard-service-row {
            padding: 12px 10px 12px 12px !important;
          }
          .admin-dashboard-shell .stat-card {
            min-height: 76px !important;
            padding: 10px 8px !important;
          }
        }
        @media (max-width: 480px) {
          .admin-dashboard-shell .dashboard-stat-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 6px;
          }
          .admin-dashboard-shell .dashboard-shell-inner {
            padding: 6px 8px 8px;
          }
          .admin-dashboard-shell .dashboard-main-grid {
            border-radius: 14px;
          }
          .admin-dashboard-shell .dashboard-sidebar-panel,
          .admin-dashboard-shell .dashboard-details-panel {
            padding: 12px 10px !important;
          }
          .admin-dashboard-shell .dashboard-service-row {
            padding: 12px 10px !important;
            flex-direction: column;
            align-items: stretch;
            gap: 8px;
          }
          .admin-dashboard-shell .dashboard-pill {
            width: fit-content;
            white-space: normal;
          }
          .admin-dashboard-shell .dashboard-table th,
          .admin-dashboard-shell .dashboard-table td {
            padding: 9px 8px;
            font-size: 0.74rem;
          }
          .admin-dashboard-shell .stat-card {
            min-height: 70px !important;
            padding: 8px 6px !important;
          }
          .admin-dashboard-shell .dashboard-documents-scroll {
            overflow-x: auto;
            overflow-y: hidden;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: thin;
            scrollbar-color: #b8b8b8 transparent;
            padding-bottom: 4px;
          }
          .admin-dashboard-shell .dashboard-documents-scroll::-webkit-scrollbar { height: 4px; }
          .admin-dashboard-shell .dashboard-documents-scroll::-webkit-scrollbar-track { background: transparent; }
          .admin-dashboard-shell .dashboard-documents-scroll::-webkit-scrollbar-thumb { background: #b8b8b8; border-radius: 999px; }
          .admin-dashboard-shell .dashboard-documents-scroll .dashboard-table { min-width: 480px; }
        }
        @media (max-width: 360px) {
          .admin-dashboard-shell .dashboard-stat-grid {
            grid-template-columns: 1fr 1fr !important;
            gap: 5px;
          }
          .admin-dashboard-shell .stat-card {
            min-height: 62px !important;
            padding: 7px 5px !important;
          }
          .admin-dashboard-shell .dashboard-shell-inner {
            padding: 5px 6px;
          }
        }
      `}</style>

      <div
        style={{
          width: "100%",
          maxWidth: "none",
          margin: 0,
          padding: "0 0 0.5rem",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div style={{ marginBottom: isCompactMobile ? 28 : 40, textAlign: "center" }}>
          <h1 style={{ fontSize: isCompactMobile ? "1.65rem" : "2.2rem", fontWeight: 800, color: "#111111", letterSpacing: "-0.02em", marginBottom: isCompactMobile ? 10 : 12, lineHeight: 1.15 }}>
            Admin <span style={{ color: "#16a34a" }}>Dashboard</span>
          </h1>
          <p style={{ color: "#4b5563", fontSize: isCompactMobile ? "0.92rem" : "1.05rem", marginTop: 8, maxWidth: isCompactMobile ? 640 : 700, margin: "0 auto", lineHeight: 1.6, textAlign: "center" }}>
            Manage service requests, review documents, coordinate approvals and track client progress from one centralized control panel.
          </p>
        </div>

        <div className="dashboard-shell">
          <div className="dashboard-shell-inner">
            <div className="dashboard-stat-grid">
              {[
                { label: "Services Pending", value: stats.pending, color: "#16a34a", onClick: () => handleServiceListClick("pending") },
                { label: "Services In Progress", value: stats.inProgress, color: "#16a34a", onClick: () => handleServiceListClick("inProgress") },
                { label: "Services Completed", value: stats.completed, color: "#16a34a", onClick: () => handleServiceListClick("completed") },
                { label: "Revenue (₹)", value: stats.revenueValue || 0, color: "#16a34a", isMoney: true, onClick: handleRevenuePopupClick },
              ].map((card) => (
                <PremiumCard
                  key={card.label}
                  className="stat-card"
                  onClick={card.onClick}
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
                    cursor: "pointer",
                    transition: "transform 0.15s, box-shadow 0.15s",
                  }}
                >
                  <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#111111", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
                    {card.label}
                  </div>
                  <div style={{ fontSize: "1.44rem", fontWeight: 500, lineHeight: 1, color: card.color }}>
                    {card.isMoney ? <CountUp end={card.value} formatter={(v) => formatInr(v)} /> : <CountUp end={card.value} />}
                  </div>
                </PremiumCard>
              ))}
              {/* Manage PR & Executor card */}
              <PremiumCard
                className="stat-card"
                onClick={() => { setManagePRModal(true); setAssignEmail(""); setAssignRole(""); setAssignError(""); setAssignSuccess(""); }}
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
                  cursor: "pointer",
                  transition: "transform 0.15s, box-shadow 0.15s",
                  gap: 6,
                }}
              >
                <Users size={22} color="#16a34a" />
                <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#111111", textTransform: "uppercase", letterSpacing: "0.08em", lineHeight: 1.3 }}>
                  Manage PR &<br />Executor
                </div>
              </PremiumCard>
            </div>
          </div>
          <div className="dashboard-section-divider" />
          <div className="dashboard-shell-inner" style={{ paddingTop: 0 }}>
            <div className="dashboard-main-grid">
              <div
                className="dashboard-sidebar-panel"
                style={{
                  padding: isCompactMobile ? "16px 12px" : "20px 18px",
                  background: "#ffffff",
                  height: syncedSidebarHeight ? `${syncedSidebarHeight}px` : "auto",
                  maxHeight: syncedSidebarHeight ? `${syncedSidebarHeight}px` : "none",
                  overflow: syncedSidebarHeight ? "hidden" : "visible",
                }}
              >
                <div style={{ marginBottom: 14 }}>
                  <h2 style={{ fontSize: isCompactMobile ? "0.98rem" : "1.05rem", fontWeight: 700, marginBottom: 4, color: "#111111" }}>Active User Services</h2>
                  <p style={{ color: "#6b7280", fontSize: isCompactMobile ? "0.77rem" : "0.82rem" }}>{filteredLeads.length} request{filteredLeads.length === 1 ? "" : "s"}</p>
                </div>

                <div style={{ display: "flex", gap: 10, marginBottom: isCompactMobile ? 12 : 14 }}>
                  <div style={{ position: "relative", flex: 1 }}>
                    <Search size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#6b7280" }} />
                    <input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search services..."
                      className="dashboard-search"
                      style={{
                        width: "100%",
                        padding: isCompactMobile ? "0.76rem 0.9rem 0.76rem 2.45rem" : "0.82rem 1rem 0.82rem 2.65rem",
                        background: "#ffffff",
                        border: "1px solid rgba(17,24,39,0.08)",
                        borderRadius: 12,
                        color: "#111111",
                        outline: "none",
                      }}
                    />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    style={{
                      position: "absolute",
                      right: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      color: "rgba(255,255,255,0.4)",
                      cursor: "pointer",
                      padding: 4,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            <div className="dashboard-sidebar-scroll" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {filteredLeads.length > 0 ? (
                filteredLeads.map((lead, index) => {
                  const theme = getStatusTheme(lead);
                  const selected = lead._id === activeLead?._id;
                  const amount = formatInr(getLeadRevenueAmount(lead));
                  const outcomeLabel = getServiceOutcomeLabel(lead) || getDisplayStatus(lead);
                  const statusLabel = outcomeLabel.startsWith("Rejected")
                    ? outcomeLabel.split(":")[0]
                    : ["Open", "PendingReview"].includes(String(outcomeLabel || ""))
                      ? "Pending PR Review"
                      : outcomeLabel;
                  const summaryChip = getDocumentSummaryChip(lead);
                  const summaryTheme = getDocumentStatusSummary(lead);
                  const hasActionMessage = Boolean(lead.userMessage);
                  return (
                      <motion.div
                        key={lead._id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.14, delay: Math.min(index * 0.02, 0.12) }}
                        role="button"
                        tabIndex={0}
                        onClick={() => handleSelectLead(lead._id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleSelectLead(lead._id);
                          }
                        }}
                        className={`dashboard-service-row ${selected ? "active" : ""}`}
                        style={{
                          textAlign: "left",
                          width: "100%",
                          padding: isCompactMobile ? "14px 12px 14px 14px" : "16px 16px 16px 18px",
                          borderRadius: 16,
                          border: selected ? "1px solid rgba(34,197,94,0.45)" : "1px solid rgba(17,24,39,0.08)",
                          background: selected ? "rgba(16,185,129,0.08)" : "#ffffff",
                          cursor: "pointer",
                          display: "flex",
                          flexDirection: isCompactMobile ? "column" : "row",
                          alignItems: isCompactMobile ? "stretch" : "flex-start",
                          gap: isCompactMobile ? 10 : 12,
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: isCompactMobile ? 6 : 10, marginBottom: 6, flexDirection: isCompactMobile ? "column" : "row" }}>
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{ fontSize: isCompactMobile ? "0.92rem" : "0.98rem", fontWeight: 700, marginBottom: 4, whiteSpace: "normal", overflow: "visible", lineHeight: 1.25, color: "#111111" }}>{lead.serviceName}</div>
                              <div style={{ color: "#6b7280", fontSize: "0.8rem" }}>
                                {lead.name} {lead.email}
                              </div>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", alignItems: isCompactMobile ? "flex-start" : "flex-end", gap: 4, flexShrink: 0, textAlign: isCompactMobile ? "left" : "right" }}>
                              <span style={{ color: statusLabel === "Pending PR Review" ? pendingReviewTextColor : theme.color, padding: 0, fontSize: "0.86rem", fontWeight: 700, display: "flex", alignItems: "center", gap: 6, lineHeight: 1.2, textAlign: "right" }}>
                                {getDisplayStatus(lead) === "Completed" && <CheckCircle size={14} />}
                                {statusLabel === "Pending PR Review" ? pendingPrText(lead) : statusLabel}
                              </span>
                              {displayStatusLabel(lead) === "Pending PR Review" && !lead?.prId ? (
                                <span style={{ color: "#6b7280", fontSize: "0.73rem", fontWeight: 500, lineHeight: 1.3, maxWidth: 190 }}>
                                  Pending admin review and documents upload.
                                </span>
                              ) : null}
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: isCompactMobile ? "wrap" : "nowrap" }}>
                            <span style={{ color: "#6b7280", fontSize: "0.86rem" }}>{amount}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteService(lead, e);
                              }}
                              title="Remove service"
                              style={{
                                width: 28,
                                height: 28,
                                borderRadius: 999,
                                border: "1px solid rgba(17,24,39,0.08)",
                                background: "rgba(255,255,255,0.62)",
                                color: "#6b7280",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: "pointer",
                              }}
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                ) : (
                  <div style={{ padding: "28px 16px", textAlign: "center", color: "#6b7280" }}>No requests in pipeline.</div>
                )}
              </div>

              <div style={{ marginTop: "auto", paddingTop: 32 }}>
                <button
                  type="button"
                  onClick={() => navigate("/admin")}
                  style={{
                    width: "100%",
                    padding: "0.95rem 1rem",
                    borderRadius: 14,
                    border: "1px solid rgba(17,24,39,0.08)",
                    background: "rgba(255,255,255,0.72)",
                    color: "#111111",
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10,
                    cursor: "pointer",
                  }}
                >
                  View All Requests
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            <div className="dashboard-panels-divider" aria-hidden="true" />

            <div
              ref={detailsPanelRef}
              className="dashboard-details-panel"
              style={{ padding: isCompactMobile ? "16px 12px" : "22px 24px", background: "#ffffff" }}
            >
              {activeLead ? (
                <div className="dashboard-details-scroll" style={{ display: "flex", flexDirection: "column", gap: isCompactMobile ? 14 : 18 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 18, flexWrap: "wrap", flexDirection: isCompactMobile ? "column" : "row" }}>
                    <div style={{ minWidth: 0 }}>
                      <h2 style={{ fontSize: isCompactMobile ? "1.2rem" : "1.45rem", fontWeight: 700, marginBottom: 8, color: "#111111" }}>{activeLead.serviceName}</h2>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: isCompactMobile ? 10 : 14, color: "#6b7280", fontSize: "0.84rem" }}>
                        <span>{activeLead.name}</span>
                        <span>{activeLead.email}</span>
                        <span>Order ID: #{String(activeLead._id || "").slice(-6).toUpperCase()}</span>
                        <span>Total Commitment <strong style={{ color: "#16a34a", marginLeft: 8 }}>{formatInr(getLeadRevenueAmount(activeLead))}</strong></span>
                      </div>
                    </div>
                    <span style={{ color: displayStatusLabel(activeLeadForDisplay) === "Pending PR Review" ? pendingReviewTextColor : getStatusTheme(activeLead).color, fontWeight: 700, fontSize: "1rem", display: "flex", alignItems: "center", gap: 8 }}>
                      {effectiveServiceStatus === "Completed" && <CheckCircle size={16} />}
                      {displayStatusLabel(activeLeadForDisplay) === "Pending PR Review"
                        ? pendingPrText(activeLeadForDisplay)
                        : topRightStatusLabel || getDisplayStatus(activeLeadForDisplay)}
                    </span>
                  </div>

                  <PremiumCard className="inner-card" style={{ padding: isCompactMobile ? 14 : 16, borderRadius: 18, background: "#ffffff", border: "1px solid rgba(17,24,39,0.14)", boxShadow: "none" }}>
                    <div className="responsive-progress-grid" style={{ display: "grid", gridTemplateColumns: isCompactMobile ? "1fr" : "1fr 1.35fr auto", gap: 14, alignItems: "center" }}>
                      <div>
                        <div style={{ color: "#6b7280", fontSize: "0.82rem", marginBottom: 8, fontWeight: 500 }}>Service Progress</div>
                        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                          <span style={{ fontSize: "1.55rem", fontWeight: 700 }}>{uploadedDocumentCount} / {clientOnlyDocs.length || 0}</span>
                          <span style={{ color: "#6b7280", fontSize: "0.88rem" }}>uploaded</span>
                        </div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        <div style={{ width: "100%", height: 10, background: "rgba(17,24,39,0.08)", borderRadius: 999, overflow: "hidden" }}>
                          <div style={{ width: `${serviceProgressPercent}%`, height: "100%", borderRadius: 999, background: "linear-gradient(90deg, #22c55e, #14b8a6)", transition: "width 0.4s ease" }} />
                        </div>
                        <div style={{ color: "#6b7280", fontSize: "0.84rem" }}>
                          {serviceProgressMessage}
                        </div>
                      </div>
                      <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "#111111" }}>{Math.round(serviceProgressPercent)}%</div>
                    </div>
                  </PremiumCard>

                  {/* Documents Required — hidden once the client has uploaded everything
                      requested; editing at that point happens from the Services page. */}
                  {!(activeLead?.documentsSentToUser && areAllRequiredDocumentsUploaded(activeLead)) && (
                  <PremiumCard className="inner-card" style={{ padding: "18px 22px", background: "#ffffff", border: "1px solid rgba(17,24,39,0.14)", borderRadius: 18, boxShadow: "none" }}>
                    <div style={{ marginBottom: 14 }}>
                      <h3 style={{ fontSize: "1.1rem", fontWeight: 800, marginBottom: 2, color: "#111111" }}>Documents Required</h3>
                      <p style={{ color: "#6b7280", fontSize: "0.82rem" }}>
                        {activeLead?.documentsSentToUser
                          ? "Sent to the client. Add more below and send again if needed."
                          : "Add the documents this client needs to upload, then send the request."}
                      </p>
                    </div>

                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
                      {!Array.isArray(activeLead?.documentsRequired) || activeLead.documentsRequired.length === 0 ? (
                        <span style={{ color: "#9ca3af", fontSize: "0.85rem" }}>No documents added yet.</span>
                      ) : (
                        activeLead.documentsRequired.map((docName) => (
                          <span
                            key={docName}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                              padding: "6px 10px",
                              borderRadius: 999,
                              background: "rgba(22,163,74,0.08)",
                              border: "1px solid rgba(22,163,74,0.2)",
                              color: "#166534",
                              fontSize: "0.8rem",
                              fontWeight: 700,
                            }}
                          >
                            {docName}
                            <button
                              type="button"
                              disabled={isSavingRequiredDocuments}
                              onClick={() => handleRemoveRequiredDocument(activeLead._id, docName)}
                              style={{ background: "none", border: "none", cursor: "pointer", color: "#166534", display: "flex", padding: 0 }}
                            >
                              <X size={13} />
                            </button>
                          </span>
                        ))
                      )}
                    </div>

                    <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                      <input
                        type="text"
                        value={newDocName}
                        onChange={(e) => setNewDocName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddRequiredDocument(activeLead._id, newDocName);
                          }
                        }}
                        placeholder="e.g. PAN Card"
                        style={{
                          flex: 1,
                          padding: "0.65rem 1rem",
                          borderRadius: 12,
                          border: "1px solid rgba(17,24,39,0.12)",
                          background: "#f9fafb",
                          color: "#111111",
                          outline: "none",
                          fontSize: "0.88rem",
                        }}
                      />
                      <button
                        type="button"
                        disabled={isSavingRequiredDocuments || !newDocName.trim()}
                        onClick={() => handleAddRequiredDocument(activeLead._id, newDocName)}
                        style={{
                          padding: "0.65rem 1.1rem",
                          borderRadius: 12,
                          border: "none",
                          background: !newDocName.trim() ? "#e5e7eb" : "#111111",
                          color: !newDocName.trim() ? "#9ca3af" : "#fff",
                          fontWeight: 700,
                          fontSize: "0.85rem",
                          cursor: !newDocName.trim() ? "not-allowed" : "pointer",
                        }}
                      >
                        Add
                      </button>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
                      <label style={{ fontSize: "0.85rem", fontWeight: 700, color: "#111111" }}>Total Working Days</label>
                      <input
                        type="number"
                        min={1}
                        step={1}
                        value={workingDaysDraft ?? (activeLead?.workingDays ?? 2)}
                        onChange={(e) => setWorkingDaysDraft(e.target.value)}
                        onBlur={() => {
                          const parsed = parseInt(workingDaysDraft, 10);
                          if (Number.isFinite(parsed) && parsed > 0 && parsed !== (activeLead?.workingDays ?? 2)) {
                            handleUpdateWorkingDays(activeLead._id, parsed);
                          }
                          setWorkingDaysDraft(null);
                        }}
                        style={{
                          width: 90,
                          padding: "0.5rem 0.65rem",
                          borderRadius: 10,
                          border: "1px solid rgba(17,24,39,0.12)",
                          background: "#f9fafb",
                          color: "#111111",
                          outline: "none",
                          fontSize: "0.88rem",
                          textAlign: "center",
                        }}
                      />
                    </div>

                    <div style={{ marginBottom: 14 }}>
                      <label style={{ fontSize: "0.85rem", fontWeight: 700, color: "#111111", display: "block", marginBottom: 8 }}>
                        Note to Client <span style={{ fontWeight: 500, color: "#9ca3af" }}>(optional)</span>
                      </label>
                      <textarea
                        value={documentsNoteDraft ?? (activeLead?.documentsRequiredNote || "")}
                        onChange={(e) => setDocumentsNoteDraft(e.target.value)}
                        placeholder="e.g. Please upload clear scans of both sides of your PAN card."
                        rows={3}
                        style={{
                          width: "100%",
                          padding: "0.65rem 0.85rem",
                          borderRadius: 12,
                          border: "1px solid rgba(17,24,39,0.12)",
                          background: "#f9fafb",
                          color: "#111111",
                          outline: "none",
                          fontSize: "0.85rem",
                          fontFamily: "inherit",
                          resize: "vertical",
                        }}
                      />
                      <p style={{ fontSize: "0.72rem", color: "#94a3b8", margin: "6px 0 0" }}>
                        Only visible to this client, on this service, in their dashboard.
                      </p>
                    </div>

                    {(() => {
                      const currentNote = documentsNoteDraft ?? (activeLead?.documentsRequiredNote || "");
                      const noteChanged = currentNote.trim() !== String(activeLead?.documentsRequiredNote || "").trim();
                      const isSendDisabled =
                        !activeLead?.documentsRequired?.length ||
                        isSendingDocuments ||
                        (activeLead?.documentsSentToUser && !hasUnsentRequiredDocuments && !noteChanged);
                      const label = isSendingDocuments
                        ? "Notifying…"
                        : activeLead?.documentsSentToUser
                          ? hasUnsentRequiredDocuments || noteChanged
                            ? "Notify Again"
                            : "Notified"
                          : "Notify Client";
                      return (
                        <button
                          type="button"
                          disabled={isSendDisabled}
                          onClick={() => handleSendDocumentsToUser(activeLead._id, currentNote)}
                          style={{
                            width: "100%",
                            padding: "0.75rem",
                            borderRadius: 14,
                            border: "none",
                            background: isSendDisabled ? "#e5e7eb" : "linear-gradient(135deg,#16a34a,#059669)",
                            color: isSendDisabled ? "#9ca3af" : "#fff",
                            fontWeight: 800,
                            fontSize: "0.9rem",
                            cursor: isSendDisabled ? "not-allowed" : "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 8,
                          }}
                        >
                          <Send size={16} />
                          {label}
                        </button>
                      );
                    })()}
                  </PremiumCard>
                  )}

                  {/* Auto-displayed message panels removed per request (executor/pr/user messages and review banners). */}
                  {activeLead.prMessage && !isSystemMessage(activeLead.prMessage) && (
                    <PremiumCard
                      className="inner-card"
                      style={{
                        padding: 16,
                        borderRadius: 18,
                        background: "#ffffff",
                        border: "1px solid rgba(59,130,246,0.18)",
                        boxShadow: "none",
                      }}
                      >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                          <MessageSquare size={16} color="#3b82f6" />
                          <div style={{ color: "#3b82f6", fontWeight: 800, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                            Message from PR
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => handleDeletePrMessage(activeLead._id, e)}
                          title="Remove PR message"
                          aria-label="Remove PR message"
                          style={{
                            width: 26,
                            height: 26,
                            borderRadius: 999,
                            border: "1px solid rgba(59,130,246,0.2)",
                            background: "rgba(59,130,246,0.08)",
                            color: "#3b82f6",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            flexShrink: 0,
                          }}
                        >
                          <X size={14} />
                        </button>
                      </div>
                      <div style={{ color: "#111111", fontSize: "0.95rem", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                        {activeLead.prMessage}
                      </div>
                    </PremiumCard>
                  )}

                  {activeLead.prAdditionalDetailsMessage && (
                    <PremiumCard
                      className="inner-card"
                      style={{
                        padding: 16,
                        borderRadius: 18,
                        background: "#ffffff",
                        border: "1px solid rgba(59,130,246,0.18)",
                        boxShadow: "none",
                      }}
                      >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                          <MessageSquare size={16} color="#3b82f6" />
                          <div style={{ color: "#3b82f6", fontWeight: 800, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                            Additional Details from PR
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => handleDeletePrAdditionalDetailsMessage(activeLead._id, e)}
                          title="Close"
                          aria-label="Close"
                          style={{
                            width: 26,
                            height: 26,
                            borderRadius: 999,
                            border: "1px solid rgba(59,130,246,0.2)",
                            background: "rgba(59,130,246,0.08)",
                            color: "#3b82f6",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            flexShrink: 0,
                          }}
                        >
                          <X size={14} />
                        </button>
                      </div>
                      <div style={{ color: "#111111", fontSize: "0.95rem", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                        {activeLead.prAdditionalDetailsMessage}
                      </div>
                    </PremiumCard>
                  )}

                <div style={{ display: "grid", gap: isCompactMobile ? 14 : 18 }}>
                    <PremiumCard className="inner-card" style={{ padding: 0, overflow: "hidden", background: "#ffffff", border: "1px solid rgba(17,24,39,0.14)", boxShadow: "none" }}>
                      <button
                        type="button"
                        onClick={() => setDocumentsOpen((prev) => !prev)}
                        aria-expanded={documentsOpen}
                        style={{
                          width: "100%",
                          padding: isCompactMobile ? "12px 12px" : "14px 16px",
                          border: "none",
                          background: "transparent",
                          color: "inherit",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 12,
                          textAlign: "left",
                          borderBottom: "none",
                        }}
                      >
                        <div>
                          <h3 style={{ fontSize: isCompactMobile ? "0.92rem" : "0.98rem", fontWeight: 700, marginBottom: 3, color: "#111111" }}>User Documents</h3>
                          <p style={{ color: "#6b7280", fontSize: isCompactMobile ? "0.74rem" : "0.8rem", fontWeight: 400 }}>Review uploaded and pending files for this service.</p>
                        </div>
                        <span style={{ color: "#6b7280", fontSize: isCompactMobile ? "0.74rem" : "0.8rem", fontWeight: 500 }}>
                          {uploadedDocumentCount} / {clientOnlyDocs.length || 0} uploaded {documentsOpen ? "▴" : "▾"}
                        </span>
                      </button>

                    {documentsOpen && (
                      <div className="dashboard-documents-scroll">
                        <table className="dashboard-table">
                          <thead>
                            <tr>
                              <th style={{ width: isCompactMobile ? "42%" : "46%" }}>Document</th>
                              <th style={{ width: isCompactMobile ? "28%" : "24%" }}>Status</th>
                              <th style={{ width: isCompactMobile ? 160 : 182, textAlign: "center" }}>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {clientOnlyDocs.length > 0 ? (
                              clientOnlyDocs.map((doc, idx) => {
                                const hasFile =
                                  !!doc?.url ||
                                  !!doc?.secure_url ||
                                  !!doc?.uploadedUrl ||
                                  !!doc?.viewUrl ||
                                  !!doc?.publicId;
                                const docStatus = String(doc?.status || (hasFile ? "Uploaded" : "Pending")).trim();
                                const docStatusLower = docStatus.toLowerCase();
                                const isDraftDocument = String(doc?.type || "").trim().toLowerCase() === "draft";
                                const leadStatusLower = String(activeLead?.status || "").trim().toLowerCase();
                                // Staged: executor rejected but PR hasn't notified client — don't show rejection UI
                                const isStagedRejection =
                                  activeLead?.executorServiceRejected === true &&
                                  activeLead?.prNotifiedClientServiceRejection !== true;
                                const serviceRejectedByExecutor = !isStagedRejection && isExecutorRejectedState(activeLead);
                                const explicitReuploaded = !serviceRejectedByExecutor && (!!doc?.displayReuploaded || !!doc?.reuploaded);
                                const documentRejected = !isStagedRejection && (docStatusLower.includes("rejected") || !!doc?.executorRejected);
                                const requiresReupload = serviceRejectedByExecutor || (documentRejected && !explicitReuploaded);
                                const isPendingSubmission = !!doc?.pendingSubmission;
                                const documentNotice = isPendingSubmission
                                  ? "Pending Client Payment and Submission of Service"
                                  : serviceRejectedByExecutor || documentRejected
                                    ? "Reupload required"
                                    : explicitReuploaded
                                      ? "Reuploaded"
                                      : "";
                                const draftRejected = leadStatusLower === "draftrejected";
                                const draftAccepted = leadStatusLower === "draftaccepted" || leadStatusLower === "useraccepted" || leadStatusLower === "completed";
                                const draftShared = leadStatusLower === "draftsent" || leadStatusLower === "draftrejected" || leadStatusLower === "draftaccepted" || leadStatusLower === "useraccepted";
                                const isExecutorReviewingState = ["assignedtoexecutor", "inprogress"].includes(leadStatusLower);
                                const displayedStatus = isDraftDocument
                                  ? draftAccepted
                                    ? "Accepted"
                                    : draftRejected
                                        ? "Draft Rejected"
                                        : draftShared
                                          ? "Draft Shared"
                                          : "Draft Uploaded"
                                  // Executor is actively reviewing — show per-doc decision or generic label
                                  : isExecutorReviewingState || isStagedRejection
                                    ? doc.executorRejected
                                      ? "Rejected"
                                      : doc.executorAccepted
                                        ? "Accepted"
                                        : "Executor Reviewing"
                                    : docStatus;
                                const displayedStatusLower = displayedStatus.toLowerCase();
                                const isDone = isDraftDocument
                                  ? draftAccepted || explicitReuploaded || hasFile
                                  : ["uploaded", "accepted", "verified", "approved", "completed", "reuploaded"].includes(displayedStatusLower) || explicitReuploaded || !!doc?.url;
                                const isRejected = displayedStatusLower.includes("rejected") || documentRejected;
                                const isExecutorReviewing = displayedStatus === "Executor Reviewing";
                                const isDraftSentState = isDraftDocument && draftShared && !draftRejected && !draftAccepted;
                                
                                const statusColor = isRejected ? "#ef4444" : (isDone || isDraftSentState) ? "#16a34a" : isExecutorReviewing ? "#7c3aed" : "#f59e0b";
                                const statusBg = isRejected ? "rgba(239, 68, 68, 0.08)" : (isDone || isDraftSentState) ? "rgba(22, 163, 74, 0.08)" : isExecutorReviewing ? "rgba(124, 58, 237, 0.08)" : "rgba(245, 158, 11, 0.08)";
                                
                                return (
                                  <tr key={`${doc.name}-${idx}`}>
                                    <td>
                                      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0, flexWrap: isCompactMobile ? "wrap" : "nowrap" }}>
                                        <div style={{ padding: 8, background: isDone ? "rgba(22,163,74,0.06)" : isExecutorReviewing ? "rgba(124,58,237,0.06)" : "rgba(17,24,39,0.04)", borderRadius: 10 }}>
                                          <FileText size={18} color={isDone ? "#16a34a" : isRejected ? "#ef4444" : isExecutorReviewing ? "#7c3aed" : "#6b7280"} />
                                        </div>
                                        <div style={{ minWidth: 0 }}>
                                          <div style={{ fontSize: isCompactMobile ? "0.84rem" : "0.9rem", fontWeight: 700, color: "#111111", whiteSpace: isCompactMobile ? "normal" : "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{doc.name}</div>
                                          {documentNotice ? (
                                            <div
                                              style={{
                                                marginTop: 2,
                                                color: documentNotice === "Reuploaded" ? "#16a34a" : "#ef4444",
                                                fontSize: "0.74rem",
                                                fontWeight: 700,
                                              }}
                                            >
                                              {documentNotice}
                                            </div>
                                          ) : null}
                                        </div>
                                      </div>
                                    </td>
                                    <td>
                                      <span style={{ display: "flex", alignItems: "center", color: statusColor, fontSize: isCompactMobile ? "0.74rem" : "0.84rem", fontWeight: 700 }}>
                                        {displayedStatus}
                                      </span>
                                    </td>
                                    <td style={{ textAlign: "center" }}>
                                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, flexWrap: "nowrap" }}>
                                        {isPendingSubmission ? (
                                          <span style={{ color: "#f59e0b", fontSize: isCompactMobile ? "0.72rem" : "0.78rem", fontWeight: 700 }}>
                                            Pending
                                          </span>
                                        ) : (
                                          <>
                                        {(isDone || isUserRole || hasFile) && (
                                          <button
                                            type="button"
                                            onClick={() => (hasFile || isDone ? viewDocument(doc.publicId, doc.url || doc.secure_url || doc.uploadedUrl || doc.viewUrl, activeLead._id) : handlePickUpload("Draft"))}
                                            style={{
                                              padding: isCompactMobile ? "0 10px" : "0 12px",
                                              height: isCompactMobile ? 30 : 32,
                                              borderRadius: 10,
                                              border: "1px solid rgba(17,24,39,0.08)",
                                              background: "#ffffff",
                                              color: "#111111",
                                              display: "inline-flex",
                                              alignItems: "center",
                                              justifyContent: "center",
                                              gap: 6,
                                              cursor: "pointer",
                                              fontSize: isCompactMobile ? "0.68rem" : "0.72rem",
                                              fontWeight: 800,
                                              whiteSpace: "nowrap",
                                              flexShrink: 0,
                                              transition: "all 0.2s ease"
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = "#f9fafb"}
                                            onMouseLeave={(e) => e.currentTarget.style.background = "#ffffff"}
                                          >
                                            {(hasFile || isDone) ? "VIEW" : "UPLOAD"}
                                            {(hasFile || isDone) ? <Eye size={14} /> : <Upload size={14} />}
                                          </button>
                                        )}
                                        {leadStatusLower === "open" && hasFile && !isDraftDocument && (
                                          <>
                                            <button
                                              type="button"
                                              title={docStatusLower === "rejected" ? "Reupload required before this document can be accepted" : "Accept document"}
                                              disabled={updatingDocStatusId === doc._id || docStatusLower === "rejected"}
                                              onClick={() => handleUpdateDocumentStatus(activeLead._id, doc._id, "Accepted")}
                                              style={{
                                                width: isCompactMobile ? 34 : 36,
                                                height: isCompactMobile ? 30 : 32,
                                                flexShrink: 0,
                                                borderRadius: 10,
                                                border: docStatusLower === "accepted" ? "1px solid #16a34a" : "1px solid rgba(22,163,74,0.3)",
                                                background: docStatusLower === "accepted" ? "#16a34a" : "rgba(22,163,74,0.08)",
                                                color: docStatusLower === "accepted" ? "#ffffff" : "#16a34a",
                                                display: "inline-flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                cursor: (updatingDocStatusId === doc._id || docStatusLower === "rejected") ? "not-allowed" : "pointer",
                                                opacity: (updatingDocStatusId === doc._id || docStatusLower === "rejected") ? 0.4 : 1,
                                                transition: "all 0.2s ease",
                                              }}
                                              onMouseEnter={(e) => {
                                                if (updatingDocStatusId === doc._id || docStatusLower === "rejected") return;
                                                e.currentTarget.style.width = isCompactMobile ? "40px" : "42px";
                                                e.currentTarget.style.background = "#16a34a";
                                                e.currentTarget.style.color = "#ffffff";
                                                e.currentTarget.style.borderColor = "#16a34a";
                                              }}
                                              onMouseLeave={(e) => {
                                                e.currentTarget.style.width = isCompactMobile ? "34px" : "36px";
                                                const isAccepted = docStatusLower === "accepted";
                                                e.currentTarget.style.background = isAccepted ? "#16a34a" : "rgba(22,163,74,0.08)";
                                                e.currentTarget.style.color = isAccepted ? "#ffffff" : "#16a34a";
                                                e.currentTarget.style.borderColor = isAccepted ? "#16a34a" : "rgba(22,163,74,0.3)";
                                              }}
                                            >
                                              <Check size={16} />
                                            </button>
                                            {docStatusLower !== "accepted" && (
                                              <button
                                                type="button"
                                                title="Reject document"
                                                disabled={updatingDocStatusId === doc._id}
                                                onClick={() => handleUpdateDocumentStatus(activeLead._id, doc._id, "Rejected")}
                                                style={{
                                                  width: isCompactMobile ? 30 : 32,
                                                  height: isCompactMobile ? 30 : 32,
                                                  flexShrink: 0,
                                                  borderRadius: 10,
                                                  border: docStatusLower === "rejected" ? "1px solid #ef4444" : "1px solid rgba(239,68,68,0.3)",
                                                  background: docStatusLower === "rejected" ? "#ef4444" : "rgba(239,68,68,0.08)",
                                                  color: docStatusLower === "rejected" ? "#ffffff" : "#ef4444",
                                                  display: "inline-flex",
                                                  alignItems: "center",
                                                  justifyContent: "center",
                                                  cursor: updatingDocStatusId === doc._id ? "not-allowed" : "pointer",
                                                  opacity: updatingDocStatusId === doc._id ? 0.6 : 1,
                                                  transition: "all 0.2s ease",
                                                }}
                                                onMouseEnter={(e) => {
                                                  if (updatingDocStatusId === doc._id) return;
                                                  e.currentTarget.style.width = isCompactMobile ? "40px" : "42px";
                                                  e.currentTarget.style.background = "#ef4444";
                                                  e.currentTarget.style.color = "#ffffff";
                                                  e.currentTarget.style.borderColor = "#ef4444";
                                                }}
                                                onMouseLeave={(e) => {
                                                  e.currentTarget.style.width = isCompactMobile ? "34px" : "36px";
                                                  const isRejected = docStatusLower === "rejected";
                                                  e.currentTarget.style.background = isRejected ? "#ef4444" : "rgba(239,68,68,0.08)";
                                                  e.currentTarget.style.color = isRejected ? "#ffffff" : "#ef4444";
                                                  e.currentTarget.style.borderColor = isRejected ? "#ef4444" : "rgba(239,68,68,0.3)";
                                                }}
                                              >
                                                <XCircle size={16} />
                                              </button>
                                            )}
                                          </>
                                        )}
                                          </>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })
                            ) : (
                              <tr>
                                <td colSpan={3} style={{ color: "#6b7280", textAlign: "center", padding: "32px 20px", fontSize: "0.88rem" }}>No documents uploaded yet.</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </PremiumCard>

                  {/* Draft & Final Documents */}
                  {draftFinalDocs.length > 0 && (() => {
                    const leadStatusLower = String(activeLead?.status || "").trim().toLowerCase();
                    const draftDocs = draftFinalDocs.filter(d => String(d?.type || "").trim().toLowerCase() === "draft");
                    const finalDocs = draftFinalDocs.filter(d => {
                      const t = String(d?.type || "").trim().toLowerCase();
                      const n = String(d?.name || "").trim().toLowerCase();
                      return t === "final" || n.startsWith("final");
                    });
                    const latestDraft = draftDocs.sort((a,b) => new Date(b?.uploadedAt||0) - new Date(a?.uploadedAt||0))[0] || null;
                    const latestFinal = finalDocs.sort((a,b) => new Date(b?.uploadedAt||0) - new Date(a?.uploadedAt||0))[0] || null;
                    const getDraftBadge = (doc) => {
                      const isSentOrBeyond = ["draftsent","draftaccepted","draftrejected","useraccepted","completed"].includes(leadStatusLower);
                      const s = String(doc?.status || "").trim().toLowerCase();
                      if (leadStatusLower === "draftaccepted" || leadStatusLower === "useraccepted" || leadStatusLower === "completed") return { label: "Accepted", color: "#16a34a", bg: "rgba(22,163,74,0.08)", border: "rgba(22,163,74,0.2)" };
                      if (leadStatusLower === "draftrejected") return { label: "Rejected", color: "#ef4444", bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.18)" };
                      if (isSentOrBeyond || s === "draft shared") return { label: "Draft Shared", color: "#2563eb", bg: "rgba(37,99,235,0.08)", border: "rgba(37,99,235,0.18)" };
                      return { label: "Draft Uploaded", color: "#16a34a", bg: "rgba(22,163,74,0.08)", border: "rgba(22,163,74,0.2)" };
                    };
                    const renderRow = (doc, badge) => (
                      <div key={doc.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderRadius: 12, background: "#fafafa", border: "1px solid rgba(17,24,39,0.08)", gap: 10, flexWrap: "wrap" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
                          <FileText size={16} color="#8b5cf6" style={{ flexShrink: 0 }} />
                          <span style={{ fontSize: "0.88rem", fontWeight: 600, color: "#111111", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.name}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                          <span style={{ fontSize: "0.76rem", fontWeight: 700, color: badge.color, background: badge.bg, border: `1px solid ${badge.border}`, borderRadius: 8, padding: "3px 10px" }}>{badge.label}</span>
                          {(doc.url || doc.secure_url || doc.uploadedUrl || doc.publicId) && (
                            <button type="button" onClick={() => viewDocument(doc.publicId, doc.url || doc.secure_url || doc.uploadedUrl, activeLead._id)} style={{ padding: "0 12px", height: 30, borderRadius: 10, border: "1px solid rgba(17,24,39,0.08)", background: "#fff", color: "#111111", display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: "0.75rem", fontWeight: 600 }}>
                              VIEW <Eye size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                    return (
                      <PremiumCard style={{ padding: 0, overflow: "hidden", background: "#ffffff", border: "1px solid rgba(17,24,39,0.14)", borderRadius: 20, marginTop: 16 }}>
                        <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(17,24,39,0.08)" }}>
                          <h3 style={{ fontSize: "0.98rem", fontWeight: 700, marginBottom: 3, color: "#111111" }}>Draft & Final Documents</h3>
                          <p style={{ color: "#6b7280", fontSize: "0.8rem", fontWeight: 400 }}>Draft and final documents for this service.</p>
                        </div>
                        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                          {latestDraft && renderRow(latestDraft, getDraftBadge(latestDraft))}
                          {latestFinal && renderRow(latestFinal, { label: "Uploaded", color: "#16a34a", bg: "rgba(22,163,74,0.08)", border: "rgba(22,163,74,0.2)" })}
                        </div>
                      </PremiumCard>
                    );
                  })()}

                    <div style={{ display: "grid", gap: 18, marginTop: 10 }}>
                      {/* Service Management Control */}
                      <PremiumCard style={{ padding: "18px 22px", background: "#ffffff", border: "1px solid rgba(17,24,39,0.12)", borderRadius: 20 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <div>
                              <h3 style={{ fontSize: "1.1rem", fontWeight: 800, marginBottom: 2, color: "#111111" }}>Service Status and Controls</h3>
                              <p style={{ color: "#6b7280", fontSize: "0.82rem" }}>Client service status.</p>
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            {(() => {
                              const leadStatusLower = String(activeLead?.status || "").trim().toLowerCase();
                              // Don't show Accept/Reject Service until the user has actually paid
                              // and clicked Submit — uploading every required file isn't submission
                              // by itself (isPreSubmissionStage mirrors the same gate used to mask
                              // the per-document View/Accept/Reject controls above).
                              if (
                                leadStatusLower !== "open" ||
                                !activeLead?.documentsSentToUser ||
                                !areAllRequiredDocumentsUploaded(activeLead) ||
                                clientOnlyDocs.length === 0 ||
                                isPreSubmissionStage(activeLead)
                              ) {
                                return null;
                              }
                              const allDocsAccepted = clientOnlyDocs.every((doc) => {
                                const type = String(doc?.type || "").trim().toLowerCase();
                                if (type === "draft" || type === "final") return true;
                                return String(doc?.status || "").trim().toLowerCase() === "accepted";
                              });
                              return (
                                <>
                                  <select
                                    value={selectedPrId}
                                    onChange={(e) => setSelectedPrId(e.target.value)}
                                    disabled={isUpdatingServiceStatus}
                                    aria-label="Select PR"
                                    style={{ padding: "8px 12px", borderRadius: 12, border: "1px solid rgba(17,24,39,0.2)", background: "#ffffff", color: "#111111", fontSize: "0.78rem", fontWeight: 700, minWidth: 180 }}
                                  >
                                    <option value="">{prUsers.length ? "Select PR" : "No PRs available"}</option>
                                    {prUsers.map((pr) => (
                                      <option key={pr._id} value={pr._id}>{pr.name} ({pr.email})</option>
                                    ))}
                                  </select>
                                  <button
                                    type="button"
                                    disabled={!allDocsAccepted || isUpdatingServiceStatus || !selectedPrId}
                                    onClick={() => handleAcceptService(activeLead._id, selectedPrId)}
                                    style={{
                                      padding: "8px 16px",
                                      borderRadius: 12,
                                      border: "none",
                                      background: allDocsAccepted && selectedPrId ? "#16a34a" : "rgba(22,163,74,0.25)",
                                      color: "#ffffff",
                                      fontSize: "0.78rem",
                                      fontWeight: 800,
                                      cursor: allDocsAccepted && selectedPrId && !isUpdatingServiceStatus ? "pointer" : "not-allowed",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      gap: 6,
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    <Check size={14} /> Send to PR
                                  </button>
                                  <button
                                    type="button"
                                    disabled={isUpdatingServiceStatus}
                                    onClick={() => handleRejectService(activeLead._id, clientOnlyDocs)}
                                    style={{
                                      padding: "8px 16px",
                                      borderRadius: 12,
                                      border: "1px solid rgba(239,68,68,0.3)",
                                      background: "#ffffff",
                                      color: "#ef4444",
                                      fontSize: "0.78rem",
                                      fontWeight: 800,
                                      cursor: isUpdatingServiceStatus ? "not-allowed" : "pointer",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      gap: 6,
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    <XCircle size={14} /> Reject Service
                                  </button>
                                </>
                              );
                            })()}
                            {Array.isArray(activeLead?.documentsRequired) && activeLead.documentsRequired.length > 0 && (
                              <>
                                <div style={{ height: 24, width: 1, background: "rgba(17,24,39,0.08)", margin: "0 4px" }} />
                                <span
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 6,
                                    fontWeight: 700,
                                    fontSize: "0.95rem",
                                    color: activeLead?.paymentStatus === "Paid" ? "#16a34a" : "#d97706",
                                  }}
                                >
                                  {activeLead?.paymentStatus === "Paid" ? <Check size={16} /> : <Clock size={16} />}
                                  Payment {activeLead?.paymentStatus === "Paid" ? "Done" : "Pending"}
                                </span>
                              </>
                            )}
                            <div style={{ height: 24, width: 1, background: "rgba(17,24,39,0.08)", margin: "0 4px" }} />
                            <span style={{ color: displayStatusLabel(activeLeadForDisplay) === "Pending PR Review" ? pendingReviewTextColor : getStatusTheme(activeLead).color, fontWeight: 700, fontSize: "0.95rem", display: "flex", alignItems: "center", gap: 8 }}>
                              {effectiveServiceStatus === "Completed" && <CheckCircle size={16} />}
                              {displayStatusLabel(activeLeadForDisplay) === "Pending PR Review"
                                ? pendingPrText(activeLeadForDisplay)
                                : getDisplayStatus(activeLeadForDisplay)}
                            </span>
                          </div>
                        </div>
                      </PremiumCard>

                      {/* Advisor Communication Hub */}
                      <PremiumCard style={{ padding: "18px 22px", background: "#ffffff", border: "1px solid rgba(17,24,39,0.12)", borderRadius: 20, overflow: "visible" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                          <div>
                            <h3 style={{ fontSize: "1.1rem", fontWeight: 800, marginBottom: 2, color: "#111111" }}>Communicate With the Client, Team</h3>
                            <p style={{ color: "#6b7280", fontSize: "0.82rem" }}>Direct coordination with clients and execution teams.</p>
                          </div>
                        </div>

                        <form onSubmit={handleUpdateLead} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16 }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                              <label style={{ fontSize: "0.75rem", fontWeight: 800, color: "#111111", textTransform: "uppercase", letterSpacing: "0.05em" }}>Message Recipient</label>
                              <div 
                                onClick={() => setIsMessageTargetOpen(!isMessageTargetOpen)}
                                style={{ 
                                  width: "100%",
                                  background: "#f9fafb", 
                                  border: "1px solid rgba(17,24,39,0.08)", 
                                  color: "#111111", 
                                  padding: "0.72rem 1.2rem", 
                                  borderRadius: 16, 
                                  fontSize: "0.9rem", 
                                  fontWeight: 600, 
                                  cursor: "pointer", 
                                  display: "flex", 
                                  alignItems: "center", 
                                  justifyContent: "space-between", 
                                  position: "relative", 
                                  userSelect: "none" 
                                }}
                              >
                                <span>{messageTarget === "client" ? "Client" : messageTarget.startsWith("pr:") ? (selectedPrTargetLabel || "Select PR") : (assignedExecutorLabel || "Executor")}</span>
                                <ChevronDown size={18} style={{ color: "#6b7280", transform: isMessageTargetOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />

                                {isMessageTargetOpen && (
                                  <div style={{
                                    position: "absolute",
                                    top: "calc(100% + 6px)",
                                    left: 0,
                                    right: 0,
                                    background: "#ffffff",
                                    border: "1px solid rgba(17,24,39,0.08)",
                                    borderRadius: 16,
                                    boxShadow: "0 12px 30px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.08)",
                                    zIndex: 100,
                                    overflow: "hidden"
                                  }}>
                                    {[
                                      { value: "client", label: "Client" },
                                      // One option per PR account stored in the DB — the message goes
                                      // only to the PR picked here.
                                      ...prUsers.map((pr) => ({
                                        value: `pr:${pr._id}`,
                                        label: `${pr.name || pr.email} (${String(pr.role || "").toUpperCase()})`,
                                      })),
                                      // Only the executor actually assigned to this lead (a real DB-stored
                                      // executor account) can ever see this message — never a generic
                                      // "Executor" placeholder, and never shown before one is assigned.
                                      ...(hasAssignedExecutor ? [{ value: "executor", label: assignedExecutorLabel }] : []),
                                    ].map((opt) => (
                                      <div 
                                        key={opt.value}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setMessageTarget(opt.value);
                                          setMessageText(getMessageTextByTarget(activeLead, opt.value));
                                          setIsMessageTargetOpen(false);
                                        }}
                                        style={{ 
                                          padding: "0.72rem 1.2rem", 
                                          cursor: "pointer", 
                                          fontSize: "0.9rem", 
                                          fontWeight: 600, 
                                          color: messageTarget === opt.value ? "#16a34a" : "#111111", 
                                          background: messageTarget === opt.value ? "rgba(22, 163, 74, 0.05)" : "transparent", 
                                          transition: "all 0.15s ease", 
                                          borderBottom: opt.value !== "executor" ? "1px solid rgba(17,24,39,0.04)" : "none" 
                                        }}
                                        onMouseEnter={(e) => { if (messageTarget !== opt.value) e.currentTarget.style.background = "#f9fafb"; }}
                                        onMouseLeave={(e) => { if (messageTarget !== opt.value) e.currentTarget.style.background = "transparent"; }}
                                      >
                                        {opt.label}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            <label style={{ fontSize: "0.75rem", fontWeight: 800, color: "#111111", textTransform: "uppercase", letterSpacing: "0.05em" }}>Message Content</label>
                            <textarea 
                              value={messageText} 
                              onChange={(e) => setMessageText(e.target.value)} 
                              placeholder={
                                messageTarget === "client" 
                                  ? "Share an update or request information from the client..." 
                                  : `Share an update or request information from the ${messageTarget.startsWith("pr:") ? (selectedPrTargetLabel || "PR") : "Executor"}...`
                              } 
                              style={{ 
                                minHeight: 140, 
                                resize: "vertical", 
                                padding: "1.2rem", 
                                borderRadius: 16, 
                                border: "1px solid rgba(17,24,39,0.08)", 
                                background: "#f9fafb", 
                                color: "#111111", 
                                outline: "none", 
                                fontSize: "0.95rem",
                                lineHeight: 1.6,
                                fontFamily: "inherit" 
                              }} 
                            />
                          </div>

                          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
                            <button 
                              type="submit" 
                              style={{ 
                                padding: "0.9rem 2.2rem", 
                                borderRadius: 14, 
                                border: "none", 
                                background: "#16a34a", 
                                color: "#ffffff", 
                                fontWeight: 800, 
                                fontSize: "0.95rem",
                                cursor: "pointer", 
                                display: "inline-flex", 
                                alignItems: "center", 
                                gap: 10,
                                boxShadow: "0 4px 15px rgba(22, 163, 74, 0.25)",
                                transition: "all 0.2s ease"
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.transform = "translateY(-2px)";
                                e.currentTarget.style.boxShadow = "0 6px 20px rgba(22, 163, 74, 0.35)";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.transform = "none";
                                e.currentTarget.style.boxShadow = "0 4px 15px rgba(22, 163, 74, 0.25)";
                              }}
                            >
                              <Send size={18} /> Send Message
                            </button>
                          </div>
                        </form>
                      </PremiumCard>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 60, textAlign: "center" }}>
                  <div style={{ width: 80, height: 80, borderRadius: "50%", background: "rgba(17,24,39,0.04)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24 }}>
                    <Search size={32} color="#9ca3af" />
                  </div>
                  <h3 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#111111", marginBottom: 8 }}>No Service Selected</h3>
                  <p style={{ color: "#6b7280", fontSize: "0.95rem", maxWidth: 320, lineHeight: 1.6 }}>Select a service request from the sidebar to manage documents and communicate with the team.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

        {createPortal(
          <ConfirmationModal
            isOpen={deleteConfirm.isOpen}
            title="Remove Service"
            message={`Are you sure you want to remove ${deleteConfirm.lead?.serviceName || "this service"}? It will be hidden from the dashboard.`}
            onConfirm={handleConfirmDelete}
            onCancel={() => setDeleteConfirm({ isOpen: false, lead: null, isLoading: false })}
            isLoading={deleteConfirm.isLoading}
          />,
          document.body
        )}

        {serviceListModal && createPortal(
          <div style={modalOverlayStyle} onClick={() => setServiceListModal(null)}>
            <div style={modalBoxStyle} onClick={(e) => e.stopPropagation()}>
              <div style={{ padding: "28px 24px 0", flexShrink: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, color: "#111" }}>
                      {serviceListModal.status === "inProgress" ? "Services In Progress" : serviceListModal.status === "pending" ? "Services Pending" : "Services Completed"}
                    </h3>
                    <span style={{ background: serviceListModal.status === "inProgress" ? "#fef3c7" : serviceListModal.status === "pending" ? "#dbeafe" : "#dcfce7", color: serviceListModal.status === "inProgress" ? "#92400e" : serviceListModal.status === "pending" ? "#1e40af" : "#166534", fontSize: "0.75rem", fontWeight: 700, padding: "2px 10px", borderRadius: 999 }}>
                      {serviceListModal.services.length}
                    </span>
                  </div>
                  <button onClick={() => setServiceListModal(null)} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#6b7280", lineHeight: 1, padding: "0 4px" }}>&times;</button>
                </div>
              </div>
              <div style={{ overflowY: "auto", flex: "1 1 0", minHeight: 0, padding: "0 24px 24px", scrollbarWidth: "thin", scrollbarColor: "#d1d5db transparent" }}>
                {serviceListModal.services.length === 0 ? (
                  <p style={{ color: "#6b7280", textAlign: "center", padding: "20px 0" }}>No services in this category.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {serviceListModal.services.map((lead, idx) => (
                      <div key={lead._id || idx} style={{ padding: "12px 14px", borderRadius: 10, background: "#f9fafb", border: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, color: "#111", fontSize: "0.95rem" }}>{lead.serviceName}</div>
                          <div style={{ marginTop: 6 }}>
                            <span style={{ fontSize: "0.75rem", fontWeight: 600, padding: "2px 8px", borderRadius: 6, background: getStatusTheme ? getStatusTheme(lead)?.bg || "#f3f4f6" : "#f3f4f6", color: getStatusTheme ? getStatusTheme(lead)?.text || "#374151" : "#374151", display: "inline-block" }}>
                              {getDisplayStatus ? getDisplayStatus(lead) : lead.status}
                            </span>
                          </div>
                        </div>
                        <div style={{ color: "#16a34a", fontWeight: 600, fontSize: "0.85rem", marginLeft: 12, whiteSpace: "nowrap" }}>
                          {formatInr(getLeadRevenueAmount(lead) || 0)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}

        {revenuePopup && createPortal(
          <div style={modalOverlayStyle} onClick={() => setRevenuePopup(null)}>
            <div style={modalBoxStyle} onClick={(e) => e.stopPropagation()}>
              <div style={{ padding: "28px 24px 0", flexShrink: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                  <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, color: "#111" }}>Total Commitment</h3>
                  <button onClick={() => setRevenuePopup(null)} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#6b7280", lineHeight: 1, padding: "0 4px" }}>&times;</button>
                </div>
              </div>
              <div style={{ overflowY: "auto", flex: "1 1 0", minHeight: 0, padding: "0 24px 24px", scrollbarWidth: "thin", scrollbarColor: "#d1d5db transparent" }}>
                {(!revenuePopup.breakdown || revenuePopup.breakdown.length === 0) ? (
                  <p style={{ color: "#6b7280", textAlign: "center", padding: "20px 0" }}>No revenue data available.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {(revenuePopup.breakdown || []).map((item, idx) => (
                      <div key={idx} style={{ padding: "12px 14px", borderRadius: 10, background: "#f9fafb", border: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontWeight: 600, color: "#111", fontSize: "0.95rem" }}>{item.serviceName}</span>
                        <span style={{ color: "#16a34a", fontWeight: 700, fontSize: "0.95rem" }}>{formatInr(item.amount)}</span>
                      </div>
                    ))}
                    <div style={{ padding: "12px 14px", borderRadius: 10, background: "#f0fdf4", border: "1px solid #bbf7d0", display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                      <span style={{ fontWeight: 700, color: "#111", fontSize: "1rem" }}>Total</span>
                      <span style={{ color: "#16a34a", fontWeight: 800, fontSize: "1rem" }}>{formatInr(revenuePopup.total)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}

        {managePRModal && createPortal(
          <div
            onClick={() => setManagePRModal(false)}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 9999, display: "flex", alignItems: isCompactMobile ? "flex-end" : "center", justifyContent: "center", padding: isCompactMobile ? 0 : 16 }}
          >
            <style>{`
              .manage-pr-modal::-webkit-scrollbar { width: 4px; }
              .manage-pr-modal::-webkit-scrollbar-track { background: rgba(17,24,39,0.05); border-radius: 4px; margin-top: 28px; margin-bottom: 28px; }
              .manage-pr-modal::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 4px; min-height: 30px; }
              .manage-pr-modal::-webkit-scrollbar-thumb:hover { background: #9ca3af; }
              .manage-pr-modal::-webkit-scrollbar-button { display: none; }
            `}</style>
            {/* Outer: clips scrollbar to rounded corners */}
            <div
              onClick={(e) => e.stopPropagation()}
              style={{ background: "#fff", borderRadius: isCompactMobile ? "14px 14px 0 0" : 20, width: "100%", maxWidth: 480, maxHeight: isCompactMobile ? "88vh" : "70vh", overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.18)" }}
            >
            {/* Inner: scrolls, scrollbar appears inside the clipped area */}
            <div
              className="manage-pr-modal"
              style={{ overflowY: "auto", maxHeight: "70vh", display: "flex", flexDirection: "column", scrollbarWidth: "thin", scrollbarColor: "#d1d5db transparent" }}
            >
              {/* Header */}
              <div style={{ padding: "14px 20px 12px", borderBottom: "1px solid rgba(17,24,39,0.08)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#7c3aed,#4f46e5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <ShieldCheck size={18} color="#fff" />
                  </div>
                  <div>
                    <div style={{ fontSize: "1rem", fontWeight: 800, color: "#111" }}>Manage PR & Executor</div>
                    <div style={{ fontSize: "0.75rem", color: "#6b7280", fontWeight: 500 }}>Assign roles to registered users</div>
                  </div>
                </div>
                <button onClick={() => setManagePRModal(false)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, borderRadius: 8, color: "#6b7280" }}><X size={20} /></button>
              </div>

              {/* Form */}
              <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(17,24,39,0.06)" }}>
                <div style={{ marginBottom: 10 }}>
                  <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>Email ID of User</label>
                  <input
                    type="email"
                    value={assignEmail}
                    onChange={(e) => { setAssignEmail(e.target.value); setAssignError(""); setAssignSuccess(""); }}
                    placeholder="Enter registered email address"
                    style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1.5px solid rgba(17,24,39,0.12)", fontSize: "0.88rem", color: "#111", outline: "none", boxSizing: "border-box", background: "#fafafa" }}
                  />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>Assign Role</label>
                  <input
                    type="text"
                    value={assignRole}
                    onChange={(e) => { setAssignRole(e.target.value); setAssignError(""); setAssignSuccess(""); }}
                    placeholder="e.g. pr1, pr2  or  executor1, executor2 …"
                    style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1.5px solid rgba(17,24,39,0.12)", fontSize: "0.88rem", color: "#111", background: "#fafafa", outline: "none", boxSizing: "border-box" }}
                  />
                  <div style={{ fontSize: "0.72rem", color: "#6b7280", marginTop: 4 }}>PR role: <strong>pr1</strong>, <strong>pr2</strong>, <strong>pr3</strong> … &nbsp;|&nbsp; Executor role: <strong>executor1</strong>, <strong>executor2</strong>, <strong>executor3</strong> … (number required)</div>
                </div>
                {assignError && <div style={{ fontSize: "0.82rem", color: "#ef4444", fontWeight: 600, marginBottom: 10, padding: "8px 12px", background: "rgba(239,68,68,0.06)", borderRadius: 8 }}>{assignError}</div>}
                {assignSuccess && <div style={{ fontSize: "0.82rem", color: "#16a34a", fontWeight: 600, marginBottom: 10, padding: "8px 12px", background: "rgba(22,163,74,0.06)", borderRadius: 8 }}>{assignSuccess}</div>}
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    disabled={assignLoading || !assignEmail.trim() || !assignRole.trim()}
                    onClick={async () => {
                      setAssignError(""); setAssignSuccess("");
                      const normalizedRole = assignRole.trim().toLowerCase();
                      const roleError = getAssignableRoleError(normalizedRole);
                      if (roleError) {
                        const msg = roleError;
                        setAssignError(msg);
                        toast.error(msg);
                        return;
                      }
                      setAssignLoading(true);
                      try {
                        const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
                        const apiUrl = import.meta.env.VITE_API_URL;
                        const res = await axios.patch(
                          `${apiUrl}/auth/assign-role`,
                          { email: assignEmail.trim(), role: normalizedRole },
                          { headers: { Authorization: `Bearer ${storedUser.token}` } }
                        );
                        const updated = res.data?.user;
                        const successMsg = res.data?.message || "Role assigned successfully!";
                        toast.success(successMsg);
                        setAssignEmail("");
                        setAssignRole("");
                        setManagePRModal(false);
                        // Optimistically update list if user already exists in it, else refetch
                        if (updated) {
                          setPRExecutorList((prev) => {
                            const exists = prev.find((u) => u._id === updated._id);
                            if (exists) return prev.map((u) => u._id === updated._id ? { ...u, role: updated.role } : u);
                            return [...prev, updated];
                          });
                        }
                        fetchPRExecutorList();
                      } catch (err) {
                        const status = err.response?.status;
                        const msg = status === 404
                          ? "User not registered. Please login to the site first."
                          : err.response?.data?.message || "Failed to assign role.";
                        setAssignError(msg);
                        toast.error(msg);
                      } finally {
                        setAssignLoading(false);
                      }
                    }}
                    style={{ flex: 1, padding: "10px 0", borderRadius: 10, background: assignLoading || !assignEmail.trim() ? "#e5e7eb" : "linear-gradient(135deg,#7c3aed,#4f46e5)", color: assignLoading || !assignEmail.trim() ? "#9ca3af" : "#fff", border: "none", fontWeight: 700, fontSize: "0.88rem", cursor: assignLoading || !assignEmail.trim() ? "not-allowed" : "pointer" }}
                  >
                    {assignLoading ? "Assigning…" : "Assign Role"}
                  </button>
                  <button
                    onClick={() => setManagePRModal(false)}
                    style={{ padding: "10px 20px", borderRadius: 10, background: "#f3f4f6", color: "#374151", border: "none", fontWeight: 700, fontSize: "0.88rem", cursor: "pointer" }}
                  >
                    Cancel
                  </button>
                </div>
              </div>

              {/* Active PR & Executors list */}
              <div style={{ padding: "12px 20px 32px" }}>
                <div style={{ fontSize: "0.78rem", fontWeight: 800, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span>Active PR &amp; Executors ({prExecutorList.length})</span>
                  {prListLoading && <span style={{ fontSize: "0.72rem", color: "#7c3aed", fontWeight: 600 }}>Loading…</span>}
                </div>
                {prListError ? (
                  <div style={{ fontSize: "0.82rem", color: "#ef4444", padding: "10px 14px", background: "rgba(239,68,68,0.06)", borderRadius: 10 }}>{prListError}</div>
                ) : prListLoading ? (
                  <div style={{ fontSize: "0.85rem", color: "#9ca3af", textAlign: "center", padding: "20px 0" }}>Fetching users…</div>
                ) : prExecutorList.length === 0 ? (
                  <div style={{ fontSize: "0.85rem", color: "#9ca3af", textAlign: "center", padding: "20px 0", background: "#f9fafb", borderRadius: 12, border: "1px solid rgba(17,24,39,0.06)" }}>No PR or Executor users assigned yet.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {prExecutorList.map((u) => {
                      const roleRaw = String(u.role || "").trim().toLowerCase();
                      const isPR = /^pr\d*$/.test(roleRaw);
                      const roleLabel = roleRaw.toUpperCase();
                      const isEditing = editingUser?._id === u._id;
                      return (
                        <div key={u._id}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 12px", borderRadius: 9, background: "#f9fafb", border: "1px solid rgba(17,24,39,0.07)" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
                              <div style={{ width: 28, height: 28, borderRadius: 8, background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                <Users size={13} color="#6b7280" />
                              </div>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#111", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{u.name}</div>
                                <div style={{ fontSize: "0.72rem", color: "#6b7280", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{u.email}</div>
                              </div>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, marginLeft: 8 }}>
                              <span style={{ fontSize: "0.82rem", fontWeight: 800, color: "#16a34a", whiteSpace: "nowrap" }}>{roleLabel}</span>
                              <button
                                onClick={() => { setEditingUser(u); setEditRole(String(u.role || "").trim().toLowerCase()); setEditError(""); }}
                                style={{ width: 26, height: 26, borderRadius: 7, border: "1px solid rgba(17,24,39,0.1)", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                                title="Edit role"
                              >
                                <Pencil size={12} color="#6b7280" />
                              </button>
                            </div>
                          </div>
                          {isEditing && (
                            <div style={{ margin: "4px 0 2px", padding: "10px 12px", borderRadius: 9, background: "#f0fdf4", border: "1px solid rgba(22,163,74,0.2)", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                              <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#374151", whiteSpace: "nowrap" }}>Change role:</span>
                              <input
                                type="text"
                                value={editRole}
                                onChange={(e) => setEditRole(e.target.value)}
                                placeholder="pr1, pr2  or  executor1, executor2 …"
                                style={{ flex: 1, minWidth: 110, padding: "5px 8px", borderRadius: 7, border: "1px solid rgba(17,24,39,0.12)", fontSize: "0.82rem", color: "#111", background: "#fff", outline: "none" }}
                              />
                              {editError && <span style={{ fontSize: "0.75rem", color: "#ef4444", width: "100%" }}>{editError}</span>}
                              <button
                                disabled={editLoading}
                                onClick={async () => {
                                  const normalizedEditRole = editRole.trim().toLowerCase();
                                  const editRoleError = getAssignableRoleError(normalizedEditRole);
                                  if (editRoleError) {
                                    const msg = editRoleError;
                                    setEditError(msg);
                                    toast.error(msg);
                                    return;
                                  }
                                  setEditLoading(true); setEditError("");
                                  try {
                                    const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
                                    const apiUrl = import.meta.env.VITE_API_URL;
                                    const res = await axios.patch(
                                      `${apiUrl}/auth/assign-role`,
                                      { email: u.email, role: normalizedEditRole },
                                      { headers: { Authorization: `Bearer ${storedUser.token}` } }
                                    );
                                    const updated = res.data?.user;
                                    // Optimistically update this item in the list immediately
                                    if (updated) {
                                      setPRExecutorList((prev) => prev.map((item) =>
                                        item._id === updated._id ? { ...item, role: updated.role } : item
                                      ));
                                    }
                                    setEditingUser(null);
                                    fetchPRExecutorList();
                                  } catch (err) {
                                    const status = err.response?.status;
                                    const msg = status === 404
                                      ? "User not registered. Please login to the site first."
                                      : err.response?.data?.message || "Failed to update role.";
                                    setEditError(msg);
                                    toast.error(msg);
                                  } finally { setEditLoading(false); }
                                }}
                                style={{ padding: "5px 14px", borderRadius: 7, background: "#16a34a", color: "#fff", border: "none", fontWeight: 700, fontSize: "0.78rem", cursor: editLoading ? "not-allowed" : "pointer" }}
                              >
                                {editLoading ? "Saving…" : "Save"}
                              </button>
                              <button
                                onClick={() => setEditingUser(null)}
                                style={{ padding: "5px 10px", borderRadius: 7, background: "#f3f4f6", color: "#374151", border: "none", fontWeight: 700, fontSize: "0.78rem", cursor: "pointer" }}
                              >
                                Cancel
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            </div>
          </div>,
          document.body
        )}
      </div>
    </div>
  );
};

export default AdminDashboardModern;
