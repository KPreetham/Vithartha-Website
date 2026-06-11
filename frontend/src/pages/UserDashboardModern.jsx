import React from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import ConfirmationModal from "../components/ConfirmationModal";
import { resolveExecutorLabel } from "../utils/statusLabels";
import {
  AlertCircle,
  ArrowUpRight,
  CheckCircle,
  Clock,
  Eye,
  FileText,
  LayoutDashboard,
  Loader2,
  Search,
  Sparkles,
  Upload,
  X,
  ChevronRight,
  Target,
  MessageSquare,
} from "lucide-react";

const PremiumCard = ({ children, style = {}, className = "", onClick }) => (
  <div
    className={className}
    onClick={onClick}
    style={{
      background:
        "linear-gradient(145deg, #ffffff 0%, #f9fafb 100%)",
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

const UserDashboardModern = ({
  navigate,
  filteredLeads,
  selectedLead,
  setSelectedLeadId,
  selectedLeadDocuments,
  selectedLeadPendingAdminDocs,
  selectedLeadPendingAdminDocsDismissed,
  setSelectedLeadPendingAdminDocsDismissed,
  handleDismissAdminDocsBanner,
  uploadedDocumentCount,
  documentProgress,
  serviceProgressPercent,
  serviceDate,
  stats,
  getServicesByStatus,
  getTotalRevenueBreakdown,
  getStatusTheme,
  getDisplayStatus,
  getCommitmentAmount,
  getCommitmentPair,
  formatInr,
  selectedStatusText,
  selectedStatusBadge,
  dismissedDetailsMissingSignatureByLead,
  getDetailsMissingSignature,
  getDetailsMissingMessage,
  handleDismissDetailsMissingMessage,
  handleDeleteRejectionMessage,
  isExecutorRejectedState,
  isPrRejectedState,
  isDetailsMissingState,
  isReviewDraftState,
  draftRejectingLeadId,
  setDraftRejectingLeadId,
  draftRejectDrafts,
  setDraftRejectDrafts,
  openDraftRejectForm,
  submitDraftReject,
  handleDraftAction,
  handleDeleteService,
  uploadingId,
  uploadInputRef,
  handleUploadDocuments,
  serviceSearch,
  setServiceSearch,
  messageByLead,
  handleMessageChange,
  handleSendMessageToPR,
  handleDeleteAdvisorMessage,
  deleteConfirm,
  handleConfirmDelete,
  setDeleteConfirm,
  viewDocument,
  isRejectedServiceState,
  getRejectionDisplayLabel,
}) => {
  const activeLead = selectedLead || filteredLeads[0] || null;
  const [documentsOpen, setDocumentsOpen] = React.useState(false);
  const [isDropActive, setIsDropActive] = React.useState(false);
  const [reuploadingDocName, setReuploadingDocName] = React.useState(null);
  const [animatedCommitmentHigh, setAnimatedCommitmentHigh] = React.useState(0);
  const [animatedCommitmentSmall, setAnimatedCommitmentSmall] = React.useState(0);
  const [syncedSidebarHeight, setSyncedSidebarHeight] = React.useState(null);
  const [serviceListModal, setServiceListModal] = React.useState(null);
  const [revenuePopup, setRevenuePopup] = React.useState(null);
  const detailsPanelRef = React.useRef(null);
  const [isCompactMobile, setIsCompactMobile] = React.useState(
    () => window.innerWidth <= 480,
  );
  const clientOnlyDocs = (selectedLeadDocuments || []).filter((doc) => {
    const t = String(doc?.type || "").trim().toLowerCase();
    const n = String(doc?.name || "").trim().toLowerCase();
    return t !== "draft" && t !== "final" && !n.startsWith("final");
  });
  const draftFinalDocs = (selectedLeadDocuments || []).filter((doc) => {
    const t = String(doc?.type || "").trim().toLowerCase();
    const n = String(doc?.name || "").trim().toLowerCase();
    return t === "draft" || t === "final" || n.startsWith("final");
  });
  const clientUploadedCount = clientOnlyDocs.filter((doc) => {
    const s = String(doc?.status || "").trim().toLowerCase();
    return ["uploaded","accepted","verified","approved","completed","reuploaded"].includes(s) || !!doc?.url;
  }).length;
  const documentCountLabel = `${clientUploadedCount} / ${clientOnlyDocs.length || 0}`;
  const serviceProgress = Math.max(0, Math.min(100, serviceProgressPercent ?? 0));
  const commitmentTargetHigh = Math.max(0, Number(stats.totalCommitmentHigh || 0));
  const commitmentTargetSmall = Math.max(0, Number(stats.totalCommitmentSmall || 0));
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userName = user?.name ? user.name.split(" ")[0] : "there";

  const handleServiceListClick = (status) => {
    const services = getServicesByStatus(status);
    setServiceListModal({ status, services });
  };

  const handleRevenuePopupClick = () => {
    const breakdown = getTotalRevenueBreakdown();
    const allLeads = filteredLeads.length > 0 ? filteredLeads : getServicesByStatus("pending").concat(getServicesByStatus("inProgress"), getServicesByStatus("completed"));
    const perService = allLeads
      .map((l) => ({
        serviceName: l.serviceName,
        amount: getCommitmentAmount(l) || 0,
      }))
      .filter((i) => i.amount > 0);
    setRevenuePopup({ breakdown: perService, total: breakdown.total });
  };

  const systemPhrases = ["status changed", "lead assigned", "draft accepted", "draft sent", "draft rejected", "document accepted", "document rejected", "service updated", "rejected by executor", "assignment rejected"];
  const isSystemMessage = (msg) => {
    if (!msg) return false;
    const lower = msg.toLowerCase();
    return systemPhrases.some(p => lower.includes(p));
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

  React.useEffect(() => {
    // Auto-open documents when the service has a visible rejection —
    // the user must see the "Reupload" hints without having to click expand.
    const hasNotifiedRejection =
      activeLead?.executorServiceRejected === true &&
      activeLead?.prNotifiedClientServiceRejection === true;
    const isRejectedState =
      hasNotifiedRejection ||
      String(activeLead?.status || "").trim().toLowerCase() === "informationrequired" ||
      (String(activeLead?.status || "").trim().toLowerCase() === "rejected" &&
        !( activeLead?.executorServiceRejected === true && activeLead?.prNotifiedClientServiceRejection !== true ));
    setDocumentsOpen(isRejectedState ? true : false);
  }, [activeLead?._id]);

  React.useEffect(() => {
    let rafId = 0;
    const duration = 900;
    const start = performance.now();
    const startValueHigh = 0;
    const startValueSmall = 0;

    const tick = (now) => {
      const elapsed = Math.min(now - start, duration);
      const progress = elapsed / duration;
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedCommitmentHigh(startValueHigh + (commitmentTargetHigh - startValueHigh) * eased);
      setAnimatedCommitmentSmall(startValueSmall + (commitmentTargetSmall - startValueSmall) * eased);
      if (elapsed < duration) {
        rafId = requestAnimationFrame(tick);
      } else {
        setAnimatedCommitmentHigh(commitmentTargetHigh);
        setAnimatedCommitmentSmall(commitmentTargetSmall);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [commitmentTargetHigh, commitmentTargetSmall]);

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

  const rejectionSignature = activeLead ? getDetailsMissingSignature(activeLead) : "";
  const isRejectionBannerDismissed = activeLead
    ? (() => {
        const saved = dismissedDetailsMissingSignatureByLead[activeLead._id];
        if (!saved) return false;
        if (saved === rejectionSignature) return true;
        // Also dismiss if the same rejection type was already acknowledged
        // (e.g. "pr:some message" was dismissed, still suppress even if prFeedback text changed slightly)
        const savedPrefix = saved.split(":")[0];
        const currentPrefix = rejectionSignature.split(":")[0];
        return savedPrefix && savedPrefix === currentPrefix;
      })()
    : false;

  // Only show executor rejection banner once PR has notified the client (prNotifiedClient)
  // Until then, keep it invisible — the user should not know the executor flagged something
  const hasExecutorRejectionPendingPrNotification = activeLead
    ? Array.isArray(activeLead.documents) &&
      activeLead.documents.some((d) => d?.executorRejected && !d?.prNotifiedClient)
    : false;

  // Service-level executor rejection staged — PR hasn't clicked "Notify Client" yet
  const isExecutorServiceRejectionPending =
    activeLead?.executorServiceRejected === true &&
    activeLead?.prNotifiedClientServiceRejection !== true;

  const activeRejectionBanner = !activeLead
    ? null
    : String(activeLead.status || "").trim().toLowerCase() === "draftrejected"
      ? null
      // Fully suppress everything if executor rejected the service but PR hasn't notified the client
      : isExecutorServiceRejectionPending
      ? null
      // Suppress executor rejection banner until PR notifies client (document-level)
      : isExecutorRejectedState(activeLead) && hasExecutorRejectionPendingPrNotification
      ? null
      : isExecutorRejectedState(activeLead)
      ? {
          title: "Rejected by Executor",
          message: getDetailsMissingMessage(activeLead),
        }
      : isPrRejectedState(activeLead) || isDetailsMissingState(activeLead)
        ? {
            title: "Rejected by PR",
            message: getDetailsMissingMessage(activeLead),
          }
        : null;

  const showRejectionBanner = Boolean(activeRejectionBanner) && !isRejectionBannerDismissed;
  const showOnlyRejectionBanner = showRejectionBanner && activeRejectionBanner?.title === "Rejected by PR";

  const getProgressMessage = () => {
    if (!activeLead) return "No active service.";
    const activeLeadStatus = String(activeLead.status || "").trim();
    const activeLeadStatusLower = activeLeadStatus.toLowerCase();
    const hasFinalDocument = Array.isArray(selectedLeadDocuments) && selectedLeadDocuments.some((doc) => {
      const docType = String(doc?.type || "").trim().toLowerCase();
      const docName = String(doc?.name || "").trim().toLowerCase();
      return docType === "final" || docName.startsWith("final");
    });
    // Mask staged executor service rejection — show "Executor X Reviewing" from the user's perspective
    const maskedStatus = isExecutorServiceRejectionPending
      ? "ExecutorReviewing"
      : activeLeadStatus;
    const effectiveLeadStatus = hasFinalDocument && !["rejected", "informationrequired"].includes(activeLeadStatusLower)
      ? "Completed"
      : maskedStatus;

    if (showOnlyRejectionBanner) return "";
    if (effectiveLeadStatus === "Completed") return "Service completed successfully.";
    // Case-insensitive check — backend sets draft doc to "Rejected" on draft rejection,
    // which can cause isDetailsMissingState to return true; guard against that here.
    if (effectiveLeadStatus === "DraftRejected" || activeLeadStatusLower === "draftrejected") return "Draft rejected. Awaiting revised draft from executor.";
    if (effectiveLeadStatus === "Rejected" || isDetailsMissingState(activeLead)) {
      if (isExecutorRejectedState(activeLead)) return "Service rejected by Executor. Please check for feedback.";
      return "Service rejected by PR. Please review missing or rejected documents.";
    }
    if (isReviewDraftState(activeLead)) return "Please review the draft document below.";

    const status = effectiveLeadStatus;
    // If InformationRequired but user has already reuploaded all rejected docs,
    // show pending-review message instead of the rejection prompt.
    if (status === "InformationRequired") {
      const hasRejected = Array.isArray(selectedLeadDocuments) && selectedLeadDocuments.some(d => String(d?.status || "").trim().toLowerCase() === "rejected");
      if (!hasRejected) return "Documents are being reviewed by PR.";
    }

    const statusMap = {
      Open: "Pending verification and initial review.",
      PendingReview: "Documents are being reviewed by PR.",
      InformationRequired: "Service rejected by PR. Action required.",
      PR_Accepted: "Documents verified. Pending executor assignment.",
      AssignedToExecutor: `Assigned to ${resolveExecutorLabel(activeLead)} — Service is starting.`,
      InProgress: `Accepted by ${resolveExecutorLabel(activeLead)}.`,
      ExecutorReviewing: `${resolveExecutorLabel(activeLead)} is reviewing your service.`,
      ExecutionFinished: activeLead?.draftSentToPR ? `Draft sent to PR by ${resolveExecutorLabel(activeLead)}. Awaiting PR to send to you.` : `Draft uploaded by ${resolveExecutorLabel(activeLead)}. Awaiting review before sending.`,
      DraftSent: "Review Draft.",
      DraftAccepted: "Draft approved. Waiting for final completion.",
      UserAccepted: "Draft approved. Waiting for final completion.",
      DraftRejected: "Draft rejected. Awaiting revised draft from executor.",
      Rejected: "Service has been rejected.",
      Completed: "Service completed successfully.",
    };

    if (status === "Open") {
      if (clientOnlyDocs.length > 0 && clientUploadedCount >= clientOnlyDocs.length) {
        return "All documents uploaded. Awaiting PR review.";
      }
      if (clientOnlyDocs.length > 0) {
        return `${clientUploadedCount} of ${clientOnlyDocs.length} documents uploaded. Keep going!`;
      }
    }

    return statusMap[status] || "Service is in progress.";
  };
  const progressMessage = getProgressMessage();

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

  return (
    <div className="home-page-shell user-dashboard-shell" style={containerStyle}>
      <div className="home-page-backdrop" style={{ background: "#f8fafc" }} aria-hidden="true" />
      <style>{`
        .user-dashboard-shell .dashboard-stat-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
          margin-bottom: 0;
          align-items: stretch;
        }
        .user-dashboard-shell .dashboard-shell {
          width: 100%;
          background: #f4f4f5;
          border: 1px solid rgba(17,24,39,0.08);
          border-radius: 0;
          box-shadow: none;
          overflow: hidden;
        }
        .user-dashboard-shell .stat-card {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: default;
        }
        .user-dashboard-shell .stat-card:hover {
          transform: translateY(-6px) scale(1.03);
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04) !important;
          border-color: rgba(17,24,39,0.18) !important;
          z-index: 10;
        }
        .user-dashboard-shell .dashboard-shell-inner {
          padding: 10px 14px 10px;
        }
        .user-dashboard-shell .dashboard-main-grid {
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
        .user-dashboard-shell .dashboard-panels-divider {
          background: rgba(17,24,39,0.08);
          align-self: stretch;
          border-radius: 0;
        }
        .user-dashboard-shell .dashboard-service-row {
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .user-dashboard-shell .dashboard-service-row:hover {
          transform: scale(1.015) translateY(-2px);
          box-shadow: 0 6px 15px -4px rgba(0, 0, 0, 0.08);
          border-color: rgba(34, 197, 94, 0.2) !important;
          z-index: 2;
        }
        .user-dashboard-shell .inner-card {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .user-dashboard-shell .inner-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 20px -10px rgba(0, 0, 0, 0.12) !important;
          border-color: rgba(17,24,39,0.18) !important;
        }
        .user-dashboard-shell .dashboard-panels-shell {
          padding: 18px 0 0 0;
          border-radius: 0;
          margin-top: 0;
          background: transparent;
          border: none;
          box-shadow: none;
        }
        .user-dashboard-shell .dashboard-section-divider {
          height: 1px;
          width: 100%;
          background: rgba(17,24,39,0.08);
          margin: 6px 0 8px 0;
        }
        .user-dashboard-shell .dashboard-sidebar-panel {
          height: auto;
          min-height: 0;
          display: flex;
          flex-direction: column;
          align-self: start;
        }
        .user-dashboard-shell .dashboard-details-panel {
          height: auto;
          display: flex;
          flex-direction: column;
          align-self: start;
        }
        .user-dashboard-shell .dashboard-details-scroll {
          flex: 0 0 auto;
          min-height: auto;
          overflow: visible;
          padding-right: 0;
          margin-right: 0;
        }
        .user-dashboard-shell .dashboard-sidebar-scroll {
          flex: 1;
          height: 0;
          min-height: 0;
          overflow-y: auto;
          padding-right: 4px;
          margin-right: -4px;
          scrollbar-width: thin;
          scrollbar-color: #b8b8b8 transparent;
        }
        .user-dashboard-shell .dashboard-sidebar-scroll::-webkit-scrollbar {
          width: 6px;
        }
        .user-dashboard-shell .dashboard-sidebar-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .user-dashboard-shell .dashboard-sidebar-scroll::-webkit-scrollbar-thumb {
          background: #b8b8b8;
          border-radius: 999px;
        }
        .user-dashboard-shell .dashboard-sidebar-scroll::-webkit-scrollbar-thumb:hover {
          background: #9ca3af;
        }
        .user-dashboard-shell .dashboard-stat-icon {
          width: 58px;
          height: 58px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .user-dashboard-shell .dashboard-pill {
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
        .user-dashboard-shell .dashboard-pill .dot {
          width: 7px;
          height: 7px;
          border-radius: 999px;
          background: currentColor;
        }
        .user-dashboard-shell .dashboard-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
        }
        .user-dashboard-shell .dashboard-table th,
        .user-dashboard-shell .dashboard-table td {
          padding: 13px 16px;
          border-bottom: 1px solid rgba(17, 24, 39, 0.08);
          text-align: left;
        }
        .user-dashboard-shell .dashboard-table th {
          color: #6b7280;
          font-size: 0.8rem;
          font-weight: 700;
        }
        .user-dashboard-shell .dashboard-table tr:last-child td {
          border-bottom: none;
        }
        .user-dashboard-shell .dashboard-dropzone {
          border: 1px dashed rgba(34, 197, 94, 0.7);
          background: rgba(255, 255, 255, 0.03);
          transition: all 0.2s ease;
        }
        .user-dashboard-shell .dashboard-dropzone:hover {
          border-color: rgba(34, 197, 94, 0.95);
          background: rgba(34, 197, 94, 0.05);
        }
        .user-dashboard-shell .dashboard-search,
        .user-dashboard-shell .dashboard-input {
          transition: all 0.2s ease;
        }
        .user-dashboard-shell .dashboard-search:focus,
        .user-dashboard-shell .dashboard-input:focus {
          border-color: #16a34a !important;
          box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.1);
          outline: none;
        }
        .user-dashboard-shell .dashboard-search::placeholder {
          color: #6b7280;
        }
        @media (max-width: 1200px) {
          .user-dashboard-shell .dashboard-stat-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .user-dashboard-shell .dashboard-main-grid {
            grid-template-columns: 1fr;
          }
          .user-dashboard-shell .dashboard-panels-divider {
            display: none;
          }
          .user-dashboard-shell .dashboard-sidebar-panel {
            height: auto;
            min-height: 0;
            max-height: 350px;
          }
          .user-dashboard-shell .dashboard-sidebar-scroll {
            height: auto;
          }
          .user-dashboard-shell .dashboard-details-panel {
            min-height: 0;
            max-height: none;
          }
        }
        @media (max-width: 768px) {
          .user-dashboard-shell .dashboard-stat-grid {
            grid-template-columns: 1fr;
          }
          .user-dashboard-shell .dashboard-table th,
          .user-dashboard-shell .dashboard-table td {
            padding: 12px 12px;
          }
        }
        @media (max-width: 480px) {
          .user-dashboard-shell .dashboard-shell-inner {
            padding: 8px 10px 10px;
          }
          .user-dashboard-shell .dashboard-main-grid {
            border-radius: 18px;
          }
          .user-dashboard-shell .dashboard-sidebar-panel,
          .user-dashboard-shell .dashboard-details-panel {
            padding: 14px 12px;
          }
          .user-dashboard-shell .dashboard-service-row {
            padding: 14px 12px 14px 14px !important;
            flex-direction: column;
            align-items: stretch;
            gap: 10px;
          }
          .user-dashboard-shell .dashboard-pill {
            width: fit-content;
            white-space: normal;
          }
          .user-dashboard-shell .dashboard-table th,
          .user-dashboard-shell .dashboard-table td {
            padding: 10px 10px;
            font-size: 0.76rem;
          }
          .user-dashboard-shell .dashboard-documents-scroll {
            overflow-x: auto;
            overflow-y: hidden;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: thin;
            scrollbar-color: #b8b8b8 transparent;
            padding-bottom: 4px;
          }
          .user-dashboard-shell .dashboard-documents-scroll::-webkit-scrollbar {
            height: 6px;
          }
          .user-dashboard-shell .dashboard-documents-scroll::-webkit-scrollbar-track {
            background: transparent;
          }
          .user-dashboard-shell .dashboard-documents-scroll::-webkit-scrollbar-thumb {
            background: #b8b8b8;
            border-radius: 999px;
          }
          .user-dashboard-shell .dashboard-documents-scroll::-webkit-scrollbar-thumb:hover {
            background: #9ca3af;
          }
          .user-dashboard-shell .dashboard-table {
            min-width: 520px;
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
            Hi, <span style={{ color: "#16a34a" }}>{userName}!</span>
          </h1>
          <p style={{ color: "#4b5563", fontSize: isCompactMobile ? "0.92rem" : "1.05rem", marginTop: 8, maxWidth: 700, margin: "0 auto", lineHeight: 1.6 }}>
            Welcome to your Dashboard to track your service progress.
          </p>
        </div>

        <div className="dashboard-shell">
          <div className="dashboard-shell-inner">
            <div className="dashboard-stat-grid">
              <PremiumCard
                className="stat-card"
                onClick={() => handleServiceListClick("pending")}
                style={{ padding: 12, minHeight: 92, background: "#ffffff", border: "1px solid rgba(17,24,39,0.08)", boxShadow: "0 2px 4px rgba(0,0,0,0.02)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", borderRadius: 16, cursor: "pointer", transition: "transform 0.15s, box-shadow 0.15s" }}
              >
                <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#111111", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Services Pending</div>
                <div style={{ fontSize: "1.44rem", fontWeight: 500, lineHeight: 1, color: "#16a34a" }}>{stats.pending}</div>
              </PremiumCard>

              <PremiumCard
                className="stat-card"
                onClick={() => handleServiceListClick("inProgress")}
                style={{ padding: 12, minHeight: 92, background: "#ffffff", border: "1px solid rgba(17,24,39,0.08)", boxShadow: "0 2px 4px rgba(0,0,0,0.02)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", borderRadius: 16, cursor: "pointer", transition: "transform 0.15s, box-shadow 0.15s" }}
              >
                <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#111111", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Services In Progress</div>
                <div style={{ fontSize: "1.44rem", fontWeight: 500, lineHeight: 1, color: "#16a34a" }}>{stats.inProgress}</div>
              </PremiumCard>

              <PremiumCard
                className="stat-card"
                onClick={() => handleServiceListClick("completed")}
                style={{ padding: 12, minHeight: 92, background: "#ffffff", border: "1px solid rgba(17,24,39,0.08)", boxShadow: "0 2px 4px rgba(0,0,0,0.02)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", borderRadius: 16, cursor: "pointer", transition: "transform 0.15s, box-shadow 0.15s" }}
              >
                <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#111111", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Services Completed</div>
                <div style={{ fontSize: "1.44rem", fontWeight: 500, lineHeight: 1, color: "#16a34a" }}>{stats.completed}</div>
              </PremiumCard>

              <PremiumCard
                className="stat-card"
                onClick={handleRevenuePopupClick}
                style={{ padding: 12, minHeight: 92, background: "#ffffff", border: "1px solid rgba(17,24,39,0.08)", boxShadow: "0 2px 4px rgba(0,0,0,0.02)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", borderRadius: 16, cursor: "pointer", transition: "transform 0.15s, box-shadow 0.15s" }}
              >
                <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#111111", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Total Commitment</div>
                <div style={{ fontSize: "1.44rem", fontWeight: 400, lineHeight: 1, color: "#16a34a", letterSpacing: "-0.03em" }}>
                  {commitmentTargetHigh === commitmentTargetSmall ? (
                    formatInr(Math.round(animatedCommitmentHigh))
                  ) : (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                      <span style={{ textDecoration: "line-through", color: "#6b7280", fontWeight: 600 }}>{formatInr(Math.round(animatedCommitmentHigh))}</span>
                      <span style={{ color: "#16a34a", fontWeight: 800 }}>{formatInr(Math.round(animatedCommitmentSmall))}</span>
                    </span>
                  )}
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
                  <h2 style={{ fontSize: isCompactMobile ? "0.98rem" : "1.05rem", fontWeight: 700, marginBottom: 4, color: "#111111" }}>All Services</h2>
                  <p style={{ color: "#6b7280", fontSize: isCompactMobile ? "0.77rem" : "0.82rem" }}>{filteredLeads.length} active service{filteredLeads.length === 1 ? "" : "s"}</p>
                </div>

                <div style={{ display: "flex", gap: 10, marginBottom: isCompactMobile ? 12 : 14 }}>
                  <div style={{ position: "relative", flex: 1 }}>
                    <Search size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#6b7280" }} />
                    <input
                      value={serviceSearch}
                      onChange={(e) => setServiceSearch(e.target.value)}
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
                  </div>
                </div>

                <div className="dashboard-sidebar-scroll" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {filteredLeads.length > 0 ? (
                    filteredLeads.map((lead, index) => {
                      const visibleDocs = Array.isArray(lead?.documents) ? lead.documents : [];
                      const hasRejectedDocument = visibleDocs.some((doc) => {
                        const docStatus = String(doc?.status || "").trim().toLowerCase();
                        if (docStatus !== "rejected") return false;
                        // Only visible to user once PR has notified them
                        if (doc?.executorRejected && !doc?.prNotifiedClient) return false;
                        const rejectionText = String(doc?.rejectionReason || doc?.rejectionMessage || "").trim();
                        return docStatus === "rejected" || !!rejectionText;
                      });
                      const hasRejectedService =
                        String(lead?.status || "").trim().toLowerCase() === "rejected";
                      // Suppress the entire rejected state when the executor rejected the service
                      // but PR hasn't yet clicked "Notify Client" — user should not see it yet.
                      const isExecutorServiceRejectionPending =
                        lead?.executorServiceRejected === true &&
                        lead?.prNotifiedClientServiceRejection !== true;
                      // Only show the rejected card state when the lead is actually in a rejected status.
                      // Suppress the red state if the lead has moved back to PendingReview or beyond
                      // (i.e., the user already resubmitted their documents).
                      const isLeadCurrentlyRejected = !isExecutorServiceRejectionPending &&
                        ["rejected", "informationrequired"].includes(
                          String(lead?.status || "").trim().toLowerCase()
                        );
                      const showRejectedCardState =
                        isLeadCurrentlyRejected &&
                        (
                          hasRejectedService ||
                          hasRejectedDocument ||
                          isRejectedServiceState(lead) ||
                          isExecutorRejectedState(lead)
                        );
                      const theme = showRejectedCardState
                        ? { color: "#ef4444", bg: "rgba(239,68,68,0.12)" }
                        : isExecutorServiceRejectionPending
                          ? { color: "#10b981", bg: "rgba(16,185,129,0.1)" }
                          : getStatusTheme(lead);
                      const selected = lead._id === activeLead?._id;
                      const pair = getCommitmentPair(lead) || { high: 0, small: 0 };
                      const amount = pair && pair.high && pair.small
                        ? (pair.high === pair.small
                            ? formatInr(pair.high)
                            : (
                              <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                                <span style={{ textDecoration: "line-through", color: "#6b7280", fontWeight: 600 }}>{formatInr(pair.high)}</span>
                                <span style={{ color: "#111111", fontWeight: 700 }}>{formatInr(pair.small)}</span>
                              </span>
                            ))
                        : formatInr(getCommitmentAmount(lead));
                      const rejectedCardLabel = isExecutorRejectedState(lead)
                        ? "Rejected by Executor"
                        : isPrRejectedState(lead)
                          ? "Rejected by PR"
                          : "Rejected";
                      const isDraftRejectedState = lead.status === "DraftRejected";
                      const effectiveLeadStatus = (() => {
                        const rawStatus = String(lead?.status || "").trim();
                        const rawStatusLower = rawStatus.toLowerCase();
                        const hasFinalDocument = Array.isArray(visibleDocs) && visibleDocs.some((doc) => {
                          const docType = String(doc?.type || "").trim().toLowerCase();
                          const docName = String(doc?.name || "").trim().toLowerCase();
                          return docType === "final" || docName.startsWith("final");
                        });

                        if (hasFinalDocument && !["rejected", "informationrequired"].includes(rawStatusLower)) {
                          return "Completed";
                        }

                        return rawStatus;
                      })();
                      const statusLabel =
                        effectiveLeadStatus === "Completed"
                          ? "Completed"
                          : effectiveLeadStatus === "PR_Accepted"
                            ? "Pending Executor Assignment"
                          : effectiveLeadStatus === "AssignedToExecutor"
                            ? `Assigned to ${resolveExecutorLabel(lead)}`
                          : effectiveLeadStatus === "InProgress"
                            ? `Accepted by ${resolveExecutorLabel(lead)}`
                          : ["PendingReview", "ExecutionFinished", "DraftSent", "DraftAccepted", "UserAccepted"].includes(effectiveLeadStatus)
                            ? (effectiveLeadStatus === "DraftSent"
                                ? "Review Draft"
                                : ["DraftAccepted", "UserAccepted"].includes(effectiveLeadStatus)
                                  ? "Draft Accepted"
                                  : "In Progress")
                            : isDraftRejectedState
                              ? "Draft Rejected by User"
                              : showRejectedCardState
                              ? rejectedCardLabel
                              // Executor rejected but PR hasn't notified the client — mask as "Executor X Reviewing"
                              : isExecutorServiceRejectionPending
                                ? `${resolveExecutorLabel(lead)} Reviewing`
                                : "Pending";
                      const statusIcon =
                        effectiveLeadStatus === "Completed"
                          ? <CheckCircle size={14} />
                          : ["PendingReview", "AssignedToExecutor", "InProgress", "ExecutionFinished", "DraftSent", "DraftAccepted", "UserAccepted"].includes(effectiveLeadStatus) || isExecutorServiceRejectionPending
                            ? (effectiveLeadStatus === "InProgress" || isExecutorServiceRejectionPending ? <CheckCircle size={14} /> : <Clock size={14} />)
                                  : (showRejectedCardState || isDraftRejectedState)
                                    ? <AlertCircle size={14} />
                                    : null;
                      return (
                        <motion.div
                          key={lead._id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.14, delay: Math.min(index * 0.02, 0.12) }}
                          role="button"
                          tabIndex={0}
                          onClick={() => setSelectedLeadId?.(lead._id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setSelectedLeadId?.(lead._id);
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
                                <div style={{ color: "#6b7280", fontSize: "0.8rem" }}>Order ID: #{String(lead._id || "").slice(-6).toUpperCase()}  •  {new Date(lead.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</div>
                              </div>
                              <span className="dashboard-pill" style={{ color: theme.color, background: "transparent", border: "none", boxShadow: "none", padding: 0, flexShrink: 0, alignSelf: "flex-start", filter: "brightness(0.92)", marginTop: 0, whiteSpace: isCompactMobile ? "normal" : "nowrap" }}>
                                {statusIcon}
                                {statusLabel}
                              </span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: isCompactMobile ? "wrap" : "nowrap" }}>
                              <span style={{ color: "#6b7280", fontSize: "0.86rem" }}>{amount}</span>
                              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
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
                          </div>
                        </motion.div>
                      );
                    })
                  ) : (
                    <div style={{ padding: "28px 16px", textAlign: "center", color: "#6b7280" }}>No services match your search.</div>
                  )}
                </div>

                <div style={{ marginTop: "auto", paddingTop: 32 }}>
                  <button
                    type="button"
                    onClick={() => navigate("/services")}
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
                    View All Services
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
                  <div className="dashboard-details-scroll" style={{ display: "flex", flexDirection: "column", gap: isCompactMobile ? 8 : 18 }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 18, flexWrap: "wrap", flexDirection: isCompactMobile ? "column" : "row" }}>
                      <div style={{ minWidth: 0 }}>
                        <h2 style={{ fontSize: isCompactMobile ? "1.2rem" : "1.45rem", fontWeight: 700, marginBottom: 8, color: "#111111" }}>{activeLead.serviceName}</h2>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: isCompactMobile ? 10 : 14, color: "#6b7280", fontSize: "0.84rem" }}>
                          <span>Order ID: #{String(activeLead._id || "").slice(-6).toUpperCase()}</span>
                          <span>{serviceDate}</span>
                          <span>
                            Total Commitment
                            <strong style={{ color: "#16a34a", marginLeft: 8 }}>
                              {(() => {
                                const pair = getCommitmentPair(activeLead);
                                if (!pair) return "";
                                if (pair.high === pair.small) {
                                  return formatInr(pair.high);
                                }

                                return (
                                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                                    <span style={{ textDecoration: "line-through", color: "#6b7280", fontWeight: 600 }}>{formatInr(pair.high)}</span>
                                    <span style={{ color: "#16a34a", fontWeight: 800 }}>{formatInr(pair.small)}</span>
                                  </span>
                                );
                              })()}
                            </strong>
                          </span>
                          {(() => {
                            const marketFeesRaw = String(activeLead?.marketFees || "").trim();
                            if (!marketFeesRaw) return null;
                            return (
                              <span>
                                Market Fee
                                <strong style={{ color: "#6b7280", marginLeft: 8, textDecoration: "line-through" }}>
                                  {marketFeesRaw.startsWith("Rs.") ? marketFeesRaw : `Rs. ${marketFeesRaw}`}
                                </strong>
                              </span>
                            );
                          })()}
                        </div>
                      </div>
                      <span className="dashboard-pill" style={{ color: selectedStatusBadge.color, background: "transparent", border: "none", boxShadow: "none", padding: 0, filter: "brightness(0.92)", alignSelf: isCompactMobile ? "flex-start" : "auto", whiteSpace: isCompactMobile ? "normal" : "nowrap" }}>
                        {getEffectiveLeadStatus(activeLead) === "Completed" ? <CheckCircle size={14} /> : null}
                        {selectedStatusText}
                      </span>
                    </div>

                    <PremiumCard className="inner-card" style={{ padding: isCompactMobile ? 10 : 16, borderRadius: 18, background: "#ffffff", border: "1px solid rgba(17,24,39,0.14)", boxShadow: "none" }}>
                      <div style={{ display: "grid", gridTemplateColumns: isCompactMobile ? "1fr" : "1fr 1.35fr auto", gap: isCompactMobile ? 8 : 14, alignItems: "center" }}>
                        <div>
                          <div style={{ color: "#6b7280", fontSize: "0.82rem", marginBottom: 8, fontWeight: 500 }}>Service Progress</div>
                          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                            <span style={{ fontSize: "1.55rem", fontWeight: 700 }}>{documentCountLabel}</span>
                            <span style={{ color: "#6b7280", fontSize: "0.88rem" }}>uploaded</span>
                          </div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                          <div style={{ width: "100%", height: 10, background: "rgba(17,24,39,0.08)", borderRadius: 999, overflow: "hidden" }}>
                            <div style={{ width: `${serviceProgress}%`, height: "100%", borderRadius: 999, background: "linear-gradient(90deg, #22c55e, #14b8a6)" }} />
                          </div>
                          {progressMessage ? (
                            <div style={{ color: "#6b7280", fontSize: "0.84rem" }}>{progressMessage}</div>
                          ) : null}
                        </div>
                        <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "#111111" }}>{Math.round(serviceProgress)}%</div>
                      </div>
                    </PremiumCard>

                    {Array.isArray(selectedLeadPendingAdminDocs) && selectedLeadPendingAdminDocs.length > 0 && !selectedLeadPendingAdminDocsDismissed && (
                      <div
                        className="inner-card"
                        style={{
                          padding: 14,
                          borderRadius: 18,
                          border: "1px solid rgba(245,158,11,0.28)",
                          background: "rgba(245,158,11,0.08)",
                          display: "flex",
                          flexDirection: isCompactMobile ? "column" : "row",
                          alignItems: isCompactMobile ? "flex-start" : "center",
                          gap: 10,
                        }}
                      >
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "#b45309", fontWeight: 700, fontSize: "0.92rem" }}>
                          <AlertCircle size={16} />
                          {selectedLeadPendingAdminDocs.length === 1
                            ? "1 new document has been added by admin"
                            : `${selectedLeadPendingAdminDocs.length} new documents have been added by admin`}
                        </div>
                        <div style={{ color: "#92400e", fontSize: "0.84rem", lineHeight: 1.45, flex: 1 }}>
                          {selectedLeadPendingAdminDocs.length === 1
                            ? `Please upload "${selectedLeadPendingAdminDocs[0]}" from the Services page to continue.`
                            : `Please upload: ${selectedLeadPendingAdminDocs.map((d) => `"${d}"`).join(", ")} from the Services page to continue.`}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDismissAdminDocsBanner(selectedLead._id)}
                          style={{
                            padding: 6,
                            color: "#b45309",
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            borderRadius: 8,
                          }}
                          aria-label="Dismiss"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    )}

                    {showRejectionBanner && (
                      <div className="inner-card" style={{ padding: 16, borderRadius: 18, border: "1px solid rgba(239,68,68,0.22)", background: "rgba(239,68,68,0.08)" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: activeRejectionBanner.message ? 8 : 0, color: "#fb7185" }}>
                          <strong style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><AlertCircle size={16} /> {activeRejectionBanner.title}</strong>
                          <button
                            type="button"
                            onClick={(e) => handleDismissDetailsMissingMessage(activeLead, e)}
                            style={{ width: 26, height: 26, borderRadius: 999, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "inherit", cursor: "pointer" }}
                          >
                            ×
                          </button>
                        </div>
                        {activeRejectionBanner.message ? (
                          <div style={{ color: "#111111", fontSize: "0.95rem" }}>{activeRejectionBanner.message}</div>
                        ) : null}
                      </div>
                    )}

                    {activeLead.adminMessage && !isSystemMessage(activeLead.adminMessage) && !showOnlyRejectionBanner && (
                      <div className="inner-card" style={{ padding: 16, borderRadius: 18, border: "1px solid rgba(16,185,129,0.22)", background: "rgba(16,185,129,0.05)" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 8, color: "#16a34a" }}>
                          <strong style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><Sparkles size={16} /> Message from Admin</strong>
                          <button type="button" onClick={(e) => handleDeleteAdvisorMessage(activeLead._id, e)} style={{ width: 26, height: 26, borderRadius: 999, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "inherit", cursor: "pointer" }}>×</button>
                        </div>
                        <div style={{ color: "#111111", fontSize: "0.95rem", lineHeight: 1.6 }}>{activeLead.adminMessage}</div>
                      </div>
                    )}

                    {activeLead.prFeedback && !isSystemMessage(activeLead.prFeedback) && !showRejectionBanner && !isPrRejectedState(activeLead) && !isDetailsMissingState(activeLead) && (
                      <div className="inner-card" style={{ padding: 16, borderRadius: 18, border: "1px solid rgba(59,130,246,0.22)", background: "rgba(59,130,246,0.05)" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 8, color: "#2563eb" }}>
                          <strong style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><MessageSquare size={16} /> Message from PR</strong>
                          <button type="button" onClick={(e) => handleDeleteRejectionMessage(activeLead._id, e)} style={{ width: 26, height: 26, borderRadius: 999, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "inherit", cursor: "pointer" }}>×</button>
                        </div>
                        <div style={{ color: "#111111", fontSize: "0.95rem", fontStyle: "italic" }}>"{activeLead.prFeedback}"</div>
                      </div>
                    )}

                    {isReviewDraftState(activeLead) && (
                      <div className="inner-card" style={{ padding: 16, borderRadius: 18, border: "1px solid rgba(22,163,74,0.24)", background: "rgba(22,163,74,0.06)", display: "grid", gap: 12 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#16a34a", fontWeight: 800 }}>
                          Review Your Draft
                        </div>
                        <p style={{ color: "#6b7280", margin: 0, fontSize: "0.9rem" }}>Your service draft is ready for review. Please check the document below and approve it if everything is correct.</p>
                        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                          <button onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/review-draft/${activeLead._id}`); }} style={{ padding: "0.7rem 0.95rem", borderRadius: 12, border: "1px solid rgba(22,163,74,0.35)", background: "rgba(22,163,74,0.12)", color: "#16a34a", fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 }}><FileText size={15} /> View Draft</button>
                          <button onClick={() => handleDraftAction(activeLead._id, "accept")} style={{ padding: "0.7rem 0.95rem", borderRadius: 12, border: "none", background: "#10b981", color: "#fff", fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 }}><CheckCircle size={15} /> Approve Draft</button>
                          <button onClick={() => openDraftRejectForm(activeLead._id)} style={{ padding: "0.7rem 0.95rem", borderRadius: 12, border: "1px solid rgba(239,68,68,0.2)", background: "rgba(239,68,68,0.08)", color: "#fb7185", fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 }}><AlertCircle size={15} /> Reject Draft</button>
                        </div>
                        {draftRejectingLeadId === activeLead._id && (
                          <div style={{ display: "grid", gap: 10, marginTop: 4 }}>
                            <textarea className="dashboard-input" value={draftRejectDrafts[activeLead._id] || ""} onChange={(e) => setDraftRejectDrafts((prev) => ({ ...prev, [activeLead._id]: e.target.value }))} rows={3} placeholder="Describe what needs to be changed in this draft..." style={{ width: "100%", resize: "vertical", borderRadius: 12, border: "1px solid rgba(17,24,39,0.08)", background: "rgba(255,255,255,0.72)", color: "#111111", padding: "0.95rem", outline: "none" }} />
                            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                              <button onClick={() => submitDraftReject(activeLead._id)} style={{ padding: "0.78rem 1rem", borderRadius: 12, border: "none", background: "#ef4444", color: "#fff", fontWeight: 800, cursor: "pointer" }}>Send to PR and Reject Draft</button>
                              <button onClick={() => setDraftRejectingLeadId(null)} style={{ padding: "0.78rem 1rem", borderRadius: 12, border: "1px solid rgba(17,24,39,0.08)", background: "transparent", color: "#6b7280", fontWeight: 700, cursor: "pointer" }}>Cancel</button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <div style={{ display: "grid", gap: isCompactMobile ? 10 : 18 }}>
                      {(() => {
                        // When the service has a visible rejection, force the documents open
                        // and don't allow collapsing — the reupload hints must always be visible.
                        const hasVisibleRejection =
                          (activeLead?.executorServiceRejected === true && activeLead?.prNotifiedClientServiceRejection === true) ||
                          String(activeLead?.status || "").trim().toLowerCase() === "informationrequired" ||
                          (String(activeLead?.status || "").trim().toLowerCase() === "rejected" &&
                            !(activeLead?.executorServiceRejected === true && activeLead?.prNotifiedClientServiceRejection !== true));
                        const forceOpen = hasVisibleRejection;
                        const isOpen = documentsOpen;
                        return (
                      <PremiumCard className="inner-card" style={{ padding: 0, overflow: "hidden", background: "#ffffff", border: "1px solid rgba(17,24,39,0.14)", boxShadow: "none" }}>
                        <button
                          type="button"
                          onClick={() => setDocumentsOpen((prev) => !prev)}
                          aria-expanded={isOpen}
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
                            <h3 style={{ fontSize: isCompactMobile ? "0.92rem" : "0.98rem", fontWeight: 700, marginBottom: 3, color: "#111111" }}>Required Documents</h3>
                            <p style={{ color: "#6b7280", fontSize: isCompactMobile ? "0.74rem" : "0.8rem", fontWeight: 400 }}>
                              {forceOpen ? "Action required — reupload the documents below." : "Track uploaded and pending files for this service."}
                            </p>
                          </div>
                          <span style={{ color: "#6b7280", fontSize: isCompactMobile ? "0.74rem" : "0.8rem", fontWeight: 500 }}>
                            {clientOnlyDocs.length} documents {isOpen ? "▴" : "▾"}
                          </span>
                        </button>

                        <div
                          style={{
                            maxHeight: isOpen ? 9999 : 0,
                            opacity: isOpen ? 1 : 0,
                            transform: isOpen ? "translateY(0)" : "translateY(-6px)",
                            overflow: "hidden",
                            transition: "max-height 280ms ease, opacity 220ms ease, transform 220ms ease",
                            willChange: "max-height, opacity, transform",
                          }}
                        >
                          <div className="dashboard-documents-scroll">
                            <table className="dashboard-table">
                              <thead>
                                <tr>
                                  <th style={{ width: isCompactMobile ? "58%" : "68%" }}>Document</th>
                                  <th>Status</th>
                                  <th style={{ width: isCompactMobile ? 86 : 110, textAlign: "right" }}>Action</th>
                                </tr>
                              </thead>
                              <tbody>
                                {clientOnlyDocs.length > 0 ? (
                                  clientOnlyDocs.map((doc, idx) => {
                                    const docStatus = String(doc?.status || (doc?.url ? "Uploaded" : "Pending")).trim();
                                    const docStatusLower = docStatus.toLowerCase();
                                    const hasFile =
                                      !!doc?.url ||
                                      !!doc?.secure_url ||
                                      !!doc?.uploadedUrl ||
                                      !!doc?.viewUrl ||
                                      !!doc?.publicId ||
                                      !!doc?.filename ||
                                      !!doc?.fileName;
                                    // Executor service rejection is staged — PR hasn't clicked "Notify Client" yet.
                                    // Until then the user must NOT see any rejection state at all.
                                    const isExecutorServiceRejectionStagedForLead =
                                      activeLead?.executorServiceRejected === true &&
                                      activeLead?.prNotifiedClientServiceRejection !== true;
                                    // PR has now notified the client about the executor's full-service rejection.
                                    // All non-draft/non-final docs must show "Rejected" + reupload hint.
                                    const isExecutorServiceRejectionNotified =
                                      activeLead?.executorServiceRejected === true &&
                                      activeLead?.prNotifiedClientServiceRejection === true;
                                    // Per-doc executor staged rejection — not yet visible to client
                                    const isExecutorStagedRejection = !!doc?.executorRejected && !doc?.prNotifiedClient;
                                    const leadStatusLower = String(activeLead?.status || "").trim().toLowerCase();
                                    // "Executor Reviewing" state — includes staged service rejection
                                    const isExecutorReviewState = ["assignedtoexecutor", "pr_accepted", "inprogress"].includes(leadStatusLower)
                                      || isExecutorServiceRejectionStagedForLead;
                                    // serviceRejected: lead is rejected AND it's visible to the user
                                    // (not staged, so either PR-rejected or executor-notified)
                                    const serviceRejected = !isExecutorServiceRejectionStagedForLead && (
                                      isRejectedServiceState?.(activeLead) ||
                                      leadStatusLower === "rejected"
                                    );
                                    const isReuploaded = !serviceRejected && !isExecutorServiceRejectionNotified && (!!doc?.displayReuploaded || !!doc?.reuploaded || docStatusLower === "reuploaded");
                                    const isPending = !serviceRejected && !isExecutorServiceRejectionNotified && ["pending", "pendingreview"].includes(docStatusLower);
                                    // isRejected: true for any doc when the full service is rejected and visible
                                    const isRejected = isExecutorServiceRejectionNotified
                                      || serviceRejected
                                      || (docStatusLower === "rejected" && !isExecutorStagedRejection);
                                    const isRejectedByExecutor = isRejected && (
                                      isExecutorServiceRejectionNotified || isExecutorRejectedState(activeLead)
                                    );
                                    const isDraftDocument = String(doc?.type || "").trim().toLowerCase() === "draft";
                                    const isFinalDocument =
                                      String(doc?.type || "").trim().toLowerCase() === "final" ||
                                      String(doc?.name || "").trim().toLowerCase().startsWith("final");
                                    const displayStatus = isDraftDocument
                                      ? String(activeLead?.status || "").trim().toLowerCase() === "draftaccepted" || String(activeLead?.status || "").trim().toLowerCase() === "useraccepted" || String(activeLead?.status || "").trim().toLowerCase() === "completed"
                                        ? "Accepted"
                                        : String(activeLead?.status || "").trim().toLowerCase() === "draftrejected"
                                          ? "Rejected"
                                          : ["draftsent", "draftrejected", "draftaccepted", "useraccepted", "completed"].includes(String(activeLead?.status || "").trim().toLowerCase())
                                            ? "Draft Shared"
                                            : isReuploaded
                                              ? "Draft Uploaded"
                                              : "Draft Uploaded"
                                      : isFinalDocument
                                        ? "Accepted"
                                        : isRejected
                                          ? "Rejected"
                                          : isExecutorStagedRejection || isExecutorReviewState
                                            ? "Executor Reviewing"
                                            : isPending
                                              ? "Pending Review"
                                              : ["pr_accepted","assignedtoexecutor","inprogress","executionfinished","draftsent","draftrejected","draftaccepted","useraccepted","completed"].includes(leadStatusLower)
                                                ? "Accepted"
                                                : isReuploaded
                                                  ? "Reuploaded"
                                                  : docStatusLower === "accepted" ? "Accepted"
                                                  : docStatus || "Pending";
                                    const displayStatusLower = String(displayStatus || "").trim().toLowerCase();
                                    const isDisplayAccepted = ["accepted"].includes(displayStatusLower);
                                    const isDisplayRejected = displayStatusLower === "rejected";
                                    const isDraftShared = isDraftDocument && displayStatusLower.includes("draft shared");
                                    const statusColor = isDisplayAccepted || isDraftShared ? "#22c55e" : isDisplayRejected ? "#ef4444" : "#fbbf24";
                                    const statusBg = isDisplayAccepted || isDraftShared ? "rgba(34,197,94,0.12)" : isDisplayRejected ? "rgba(239,68,68,0.12)" : "rgba(245,158,11,0.12)";
                                    // Show reupload hint for any rejected non-draft/non-final doc.
                                    // Service-level executor rejection (notified) overrides the per-doc staged flag
                                    // so ALL docs get the reupload message once PR clicks "Notify Client".
                                    const showReuploadHint = isRejected && !isDraftDocument && !isFinalDocument
                                      && (!isExecutorStagedRejection || isExecutorServiceRejectionNotified);
                                    return (
                                      <tr key={`${doc.name}-${idx}`}>
                                        <td>
                                          <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0, flexWrap: isCompactMobile ? "wrap" : "nowrap" }}>
                                            <FileText size={18} color={isDisplayAccepted || isDraftShared ? "#22c55e" : isDisplayRejected ? "#ef4444" : "#a78bfa"} style={{ flexShrink: 0 }} />
                                            <div style={{ minWidth: 0 }}>
                                              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                                                <div style={{ fontSize: isCompactMobile ? "0.86rem" : "0.92rem", fontWeight: 600, whiteSpace: isCompactMobile ? "normal" : "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{doc.name}</div>
                                              </div>
                                              {showReuploadHint && (
                                                <div style={{ marginTop: 4, color: "#f87171", fontSize: "0.76rem", fontWeight: 700 }}>
                                                  Reupload this document from the Services page
                                                </div>
                                              )}
                                              {isReuploaded && !isRejected && <div style={{ marginTop: 4, color: "#38bdf8", fontSize: "0.76rem", fontWeight: 700 }}>Reuploaded</div>}
                                            </div>
                                          </div>
                                        </td>
                                        <td style={{ verticalAlign: "middle" }}>
                                          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: statusColor, fontSize: isCompactMobile ? "0.74rem" : "0.82rem", fontWeight: 700, whiteSpace: isCompactMobile ? "normal" : "nowrap" }}>
                                            {displayStatus}
                                          </span>
                                        </td>
                                        <td style={{ textAlign: "right" }}>
                                          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                                            {hasFile && (
                                              <button
                                                type="button"
                                                onClick={() => viewDocument(doc.publicId, doc.url || doc.secure_url || doc.uploadedUrl || doc.viewUrl, activeLead._id)}
                                                style={{
                                                  padding: isCompactMobile ? "0 10px" : "0 14px",
                                                  height: isCompactMobile ? 32 : 34,
                                                  borderRadius: 10,
                                                  border: "1px solid rgba(17,24,39,0.08)",
                                                  background: "rgba(255,255,255,0.62)",
                                                  color: "#111111",
                                                  display: "inline-flex",
                                                  alignItems: "center",
                                                  justifyContent: "center",
                                                  gap: 8,
                                                  cursor: "pointer",
                                                  fontSize: isCompactMobile ? "0.7rem" : "0.75rem",
                                                  fontWeight: 600
                                                }}
                                                title="View Document"
                                              >
                                                VIEW <Eye size={15} />
                                              </button>
                                            )}
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })
                                ) : (
                                  <tr>
                                    <td colSpan={3} style={{ color: "#6b7280", textAlign: "center", padding: "24px 20px" }}>No documents uploaded yet.</td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </PremiumCard>
                        );
                      })()}

                      {/* Draft & Final Documents */}
                      {draftFinalDocs.length > 0 && (() => {
                        const leadStatusLower = String(activeLead?.status || "").trim().toLowerCase();
                        const latestDraft = draftFinalDocs.filter(d => String(d?.type||"").trim().toLowerCase()==="draft").sort((a,b)=>new Date(b?.uploadedAt||0)-new Date(a?.uploadedAt||0))[0] || null;
                        const latestFinal = draftFinalDocs.filter(d => { const t=String(d?.type||"").trim().toLowerCase(); const n=String(d?.name||"").trim().toLowerCase(); return t==="final"||n.startsWith("final"); }).sort((a,b)=>new Date(b?.uploadedAt||0)-new Date(a?.uploadedAt||0))[0] || null;
                        const getDraftBadge = () => {
                          if (["draftaccepted","useraccepted","completed"].includes(leadStatusLower)) return { label: "Accepted", color: "#16a34a", bg: "rgba(22,163,74,0.08)", border: "rgba(22,163,74,0.2)" };
                          if (leadStatusLower === "draftrejected") return { label: "Rejected", color: "#ef4444", bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.18)" };
                          if (["draftsent","draftrejected","draftaccepted","useraccepted","completed"].includes(leadStatusLower)) return { label: "Draft Shared", color: "#2563eb", bg: "rgba(37,99,235,0.08)", border: "rgba(37,99,235,0.18)" };
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
                          <PremiumCard style={{ padding: 0, overflow: "hidden", background: "#ffffff", border: "1px solid rgba(17,24,39,0.14)", borderRadius: 20, marginTop: 4 }}>
                            <div style={{ padding: isCompactMobile ? "12px 14px" : "14px 18px", borderBottom: "1px solid rgba(17,24,39,0.08)" }}>
                              <h3 style={{ fontSize: isCompactMobile ? "0.92rem" : "0.98rem", fontWeight: 700, marginBottom: 3, color: "#111111" }}>Draft & Final Documents</h3>
                              <p style={{ color: "#6b7280", fontSize: isCompactMobile ? "0.74rem" : "0.8rem", fontWeight: 400 }}>Draft and final documents for this service.</p>
                            </div>
                            <div style={{ padding: isCompactMobile ? 12 : 16, display: "flex", flexDirection: "column", gap: 10 }}>
                              {latestDraft && renderRow(latestDraft, getDraftBadge())}
                              {latestFinal && renderRow(latestFinal, { label: "Uploaded", color: "#16a34a", bg: "rgba(22,163,74,0.08)", border: "rgba(22,163,74,0.2)" })}
                            </div>
                          </PremiumCard>
                        );
                      })()}

                      <div style={{ position: "absolute", width: 1, height: 1, opacity: 0, overflow: "hidden" }}>
                        <input
                          ref={uploadInputRef}
                          id="dashboard-upload-input"
                          type="file"
                          multiple={!reuploadingDocName}
                          accept=".pdf,application/pdf"
                          style={{ display: "none" }}
                          disabled={!!uploadingId}
                          onChange={(e) => {
                            if (e.target.files && e.target.files.length > 0) {
                              handleUploadDocuments(activeLead._id, e.target.files, reuploadingDocName);
                              // Reset reuploading name after trigger
                              setReuploadingDocName(null);
                              e.target.value = "";
                            }
                          }}
                        />
                      </div>

                      <PremiumCard className="inner-card" style={{ padding: 16, borderRadius: 18, background: "#ffffff", border: "1px solid rgba(17,24,39,0.14)", boxShadow: "none" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 500, color: "#111111" }}>
                            Message to PR
                          </div>
                        </div>
                        <div style={{ position: "relative" }}>
                          <textarea
                            className="dashboard-input"
                            value={messageByLead[activeLead._id] || ""}
                            onChange={(e) => handleMessageChange(activeLead._id, e.target.value)}
                            placeholder="Need help or have updates? Message your PR advisor here..."
                            style={{
                              width: "100%",
                              minHeight: 100,
                              background: "rgba(255,255,255,0.7)",
                              border: "1px solid rgba(17,24,39,0.08)",
                              borderRadius: 16,
                              padding: "0.95rem",
                              color: "#111111",
                              fontSize: "0.88rem",
                              resize: "none",
                              outline: "none",
                            }}
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSendMessageToPR(activeLead._id);
                            }}
                            style={{
                              position: "absolute",
                              bottom: 12,
                              right: 12,
                              background: "#10b981",
                              border: "none",
                              color: "white",
                              padding: "7px 14px",
                              borderRadius: 10,
                              fontSize: "0.72rem",
                              fontWeight: 800,
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                            }}
                          >
                            Send Message <ArrowUpRight size={14} />
                          </button>
                        </div>
                      </PremiumCard>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: "52px 24px", textAlign: "center", color: "#6b7280" }}>
                    <LayoutDashboard size={48} style={{ marginBottom: 14 }} />
                    <h3 style={{ color: "#111111", fontSize: "1.25rem", fontWeight: 800, marginBottom: 8 }}>No active services found</h3>
                    <p style={{ maxWidth: 420, margin: "0 auto 20px", lineHeight: 1.6, color: "#6b7280" }}>Start your journey by selecting a service from our curated recommendations.</p>
                    <button onClick={() => navigate("/services")} style={{ padding: "0.85rem 1.2rem", borderRadius: 12, border: "1px solid rgba(34,197,94,0.25)", background: "rgba(34,197,94,0.08)", color: "#34d399", fontWeight: 700, cursor: "pointer" }}>Explore Services</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {createPortal(
        <ConfirmationModal
          isOpen={deleteConfirm.isOpen}
          title="Remove Service"
          message={`Are you sure you want to remove ${deleteConfirm.lead?.serviceName || "this service"}? This will hide the service from your dashboard.`}
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
                        {formatInr(getCommitmentAmount(lead) || 0)}
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
    </div>
  );
};

export default UserDashboardModern;
