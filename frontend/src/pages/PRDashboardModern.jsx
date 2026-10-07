import React from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  CheckCircle,
  XCircle,
  ChevronRight,
  Clock,
  Eye,
  FileText,
  Loader2,
  Search,
  Send,
  Upload,
  X,
  Users,
  TrendingUp,
  Briefcase,
  MessageSquare,
  ChevronDown,
} from "lucide-react";
import ConfirmationModal from "../components/ConfirmationModal";
import { getServicePricing } from "../utils/servicePricing";
import { normalizeRole } from "../utils/roleRouting";
import { areAllRequiredDocumentsUploaded } from "../utils/statusLabels";

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

const PRDashboardModern = ({
  navigate,
  filteredLeads,
  activeLead,
  selectedLeadId,
  setSelectedLeadId,
  searchQuery,
  setSearchQuery,
  stats,
  getServicesByStatus,
  getTotalRevenueBreakdown,
  formatInr,
  getEffectiveLeadStatus,
  isPrServiceDecisionFinalized,
  getDisplayStatus,
  getVisibleDocuments,
  getLeadRevenueAmount,
  handleUpdateLeadStatus,
  handleDocumentStatus,
  handleNotifyClientDocRejection,
  handleNotifyClientServiceRejection,
  handleAssignExecutor,
  handleClearExecutorMessage,
  handleClearUserRejectedMessage,
  handleClearAdminPrMessage,
  handleDeleteService,
  handleFileUpload,
  handleSendMessage,
  handleRejectDocumentWithMessage,
  handleRejectService,
  handleNotifyAdminAdditionalDetails,
  additionalDetailsDrafts,
  setAdditionalDetailsDrafts,
  uploadingId,
  messageDrafts,
  setMessageDrafts,
  rejectDrafts,
  setRejectDrafts,
  rejectingLeadId,
  setRejectingLeadId,
  openRejectForm,
  docRejectDrafts,
  setDocRejectDrafts,
  rejectingDocKey,
  setRejectingDocKey,
  openDocRejectForm,
  canManageDraftForLead,
  canSendDraftToClient,
  viewDocument,
  deleteConfirm,
  handleConfirmDelete,
  setDeleteConfirm,
  executors,
}) => {
  const getExecutorLabel = (roleKey) => {
    const r = String(roleKey || "").trim().toLowerCase();
    if (!r) return "Executor";
    const match = Array.isArray(executors) && executors.find((ex) => String(ex.role || "").trim().toLowerCase() === r);
    if (match) return `${match.name} (${r})`;
    return r.charAt(0).toUpperCase() + r.slice(1);
  };

  // Executor recipients are encoded as "executor:<userId>".
  const getTargetExecutorLabel = (target) => {
    if (!String(target || "").startsWith("executor:")) return "";
    const ex = (Array.isArray(executors) ? executors : []).find((u) => `executor:${u._id}` === target);
    return ex ? `${ex.name || ex.email} (${String(ex.role || "").toUpperCase()})` : "";
  };

  const [serviceListModal, setServiceListModal] = React.useState(null);
  const [revenuePopup, setRevenuePopup] = React.useState(null);
  const [assigningExecutorLead, setAssigningExecutorLead] = React.useState(null);
  const [selectedExecutorRole, setSelectedExecutorRole] = React.useState("");
  // Tracks which lead IDs have had their executor rejection banner dismissed by the PR
  const [dismissedExecutorBannerLeads, setDismissedExecutorBannerLeads] = React.useState(new Set());

  // Reset dismissed banners when the active lead changes so the PR sees fresh alerts
  React.useEffect(() => {
    setDismissedExecutorBannerLeads(new Set());
  }, [activeLead?._id]);

  React.useEffect(() => {
    if (!activeLead) return;
    const activeLower = String(activeLead?.status || "").trim().toLowerCase();
    const isFinalized = !["open", "pendingreview", "informationrequired"].includes(activeLower);
    if (!isFinalized) return;

    // If accepted but executor not yet assigned, keep/open the executor selector
    const needsExecutorAssignment =
      activeLower === "pr_accepted" &&
      !activeLead.assignedExecutor &&
      !activeLead.executorId;

    if (needsExecutorAssignment) {
      setAssigningExecutorLead(activeLead._id);
      return;
    }

    // Fully finalised — clear any pending UI state
    setAssigningExecutorLead(null);
    setSelectedExecutorRole("");
    setRejectingLeadId?.((current) =>
      current === activeLead._id ? null : current
    );
  }, [activeLead?._id, activeLead?.status, activeLead?.assignedExecutor, activeLead?.executorId, setRejectingLeadId]);
  const [documentsOpen, setDocumentsOpen] = React.useState(false);
  const [isMessageTargetOpen, setIsMessageTargetOpen] = React.useState(false);
  const [showCommunicationBox, setShowCommunicationBox] = React.useState(true);
  const [messageTarget, setMessageTarget] = React.useState("user");
  const [syncedSidebarHeight, setSyncedSidebarHeight] = React.useState(null);
  const detailsPanelRef = React.useRef(null);
  const [isCompactMobile, setIsCompactMobile] = React.useState(() =>
    typeof window !== "undefined" ? window.innerWidth <= 480 : false,
  );
  const finalInputRef = React.useRef(null);

  const storedUser = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("user") || "{}") : {};
  const isPRRole = normalizeRole(storedUser?.role) === "pr";

  React.useEffect(() => {
    setDocumentsOpen(false);
  }, [activeLead?._id]);

  // If the newly selected lead has no assigned executor, "executor" is not a
  // valid recipient — fall back to messaging the client instead of leaving a
  // message staged for a non-existent recipient.
  React.useEffect(() => {
    if (messageTarget === "executor" && !activeLead?.assignedExecutor) {
      setMessageTarget("user");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLead?._id]);

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

  const systemPhrases = [
    "status changed",
    "lead assigned to executor",
    "draft accepted",
    "draft sent to client",
    "draft rejected by user",
    "service updated",
    "executor message removed",
    "user message removed",
    "admin message removed",
    "draft rejected by user: ",
    "assignment rejected by executor"
  ];

  const isSystemMessage = (msg) => {
    if (!msg) return false;
    const lower = msg.toLowerCase();
    return systemPhrases.some((phrase) => lower.includes(phrase));
  };
  const lead = activeLead || null;
  const leadStatus = lead ? getEffectiveLeadStatus(lead) : "";
  const rawStatus = String(lead?.status || "").trim();
  const normalizedRawStatus = rawStatus.toLowerCase();
  const serviceRejected = normalizedRawStatus === "rejected";

  // Inline finalization check — do NOT rely solely on the prop function.
  // Any status that is not "Open", "PendingReview", or "InformationRequired" means
  // the PR has already made a decision (accept or reject), so hide action buttons.
  const PENDING_DECISION_STATUSES = new Set(["open", "pendingreview", "informationrequired"]);
  // Once PR has accepted the service and assigned an executor, the lead can fall
  // back to "InformationRequired" later — e.g. when PR clicks "Notify Client" on
  // a document the EXECUTOR rejected post-acceptance. That status reuse must not
  // resurface the initial Accept/Reject Service controls: PR already made that
  // call, so having an assigned executor means the decision stays finalized
  // regardless of the current status string.
  const hasBeenAssignedToExecutor = !!(lead?.assignedExecutor || lead?.executorId);
  const serviceDecisionFinalized = lead
    ? (!PENDING_DECISION_STATUSES.has(normalizedRawStatus) ||
        (normalizedRawStatus === "informationrequired" && hasBeenAssignedToExecutor))
    : false;

  // PR_Accepted with no executor yet: decision is made (hide accept/reject btns)
  // but the executor selector should still be shown so assignment can be completed.
  const isPrAcceptedPendingExecutor =
    !!lead &&
    normalizedRawStatus === "pr_accepted" &&
    !lead.assignedExecutor &&
    !lead.executorId;

  // Double-gated: finalized check + explicit allowlist for safety
  const canShowServiceDecisionButtons =
    !!lead &&
    !serviceDecisionFinalized &&
    PENDING_DECISION_STATUSES.has(normalizedRawStatus);
  const isFinalUploading = lead ? uploadingId === `${lead._id}-Final` : false;
  const rawDocs = Array.isArray(lead?.documents) ? lead.documents : [];
  const hasFinalDocument = rawDocs.some((doc) => String(doc?.type || "").trim().toLowerCase() === "final");
  const effectiveServiceStatus = hasFinalDocument && !["Rejected", "InformationRequired"].includes(leadStatus)
    ? "Completed"
    : leadStatus;
  const docs = lead ? getVisibleDocuments(lead) : [];
  // Exclude draft/final from the client docs list and count — they live in the separate section
  const clientDocs = docs.filter((d) => {
    const t = String(d?.type || "").trim().toLowerCase();
    return t !== "draft" && t !== "final";
  });
  // Draft is visible to PR once executor has sent it to PR (draftSentToPR flag) or beyond DraftSent.
  // When status is DraftRejected and the latest draft document is still "Rejected", the draftSentToPR
  // flag is stale from the previous cycle — a new draft hasn't arrived yet, so treat it as false.
  const _rawDraftSentToPRFlag = !!lead?.draftSentToPR;
  const _latestDraftDoc = [...rawDocs]
    .sort((a, b) => new Date(b?.uploadedAt || b?.createdAt || 0) - new Date(a?.uploadedAt || a?.createdAt || 0))
    .find((doc) => String(doc?.type || "").trim().toLowerCase() === "draft");
  const _latestDraftRejected = String(_latestDraftDoc?.status || "").trim().toLowerCase() === "rejected";
  const draftSentToPRFlag = _rawDraftSentToPRFlag &&
    !(effectiveServiceStatus === "DraftRejected" && _latestDraftRejected);
  const draftSentToClient = ["DraftSent", "DraftAccepted", "DraftRejected", "UserAccepted", "Completed"].includes(effectiveServiceStatus);
  const draftVisibleToPR = draftSentToPRFlag || draftSentToClient;
  const draftFinalDocs = (() => {
    const sortedDocs = [...rawDocs].sort((a, b) => {
      const aTime = new Date(a?.uploadedAt || a?.createdAt || 0).getTime();
      const bTime = new Date(b?.uploadedAt || b?.createdAt || 0).getTime();
      return bTime - aTime;
    });
    const latestDraft = draftVisibleToPR
      ? sortedDocs.find((doc) => String(doc?.type || "").trim().toLowerCase() === "draft")
      : null;
    const latestFinal = sortedDocs.find((doc) => String(doc?.type || "").trim().toLowerCase() === "final");
    return sortedDocs.filter((doc) => {
      const type = String(doc?.type || "").trim().toLowerCase();
      if (type === "final") return doc === latestFinal;
      if (type !== "draft") return false;
      return doc === latestDraft;
    });
  })();
  const uploadedClientDocs = clientDocs.filter((d) => {
    const status = String(d?.status || "").trim().toLowerCase();
    return ["uploaded", "accepted", "verified", "approved", "completed", "reuploaded", "under review"].includes(status) || !!d?.url;
  });
  const hasReuploadedDocs = rawDocs.some((d) => !!d?.displayReuploaded || !!d?.reuploaded || String(d?.status || "").trim().toLowerCase() === "reuploaded");
  const draftWorkflowStarted =
    ["InProgress", "ExecutionFinished", "DraftSent", "DraftRejected", "DraftAccepted", "UserAccepted", "Completed"].includes(effectiveServiceStatus);
  const hasAssignedExecutor = !!(lead?.assignedExecutor || lead?.executorId);
  const serviceProgressPercent = (() => {
    if (!lead) return 0;
    
    // Standardize percentages across all dashboards
    if (effectiveServiceStatus === "Rejected" && String(lead?.executorMessage || "").length > 0) return 20;
    if (effectiveServiceStatus === "InformationRequired") return 20;

    const status = String(effectiveServiceStatus || "").trim();
    if (status === "Open" && areAllRequiredDocumentsUploaded(lead)) return 15;
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
  })();
  const serviceProgressMessage = lead
    ? (String(effectiveServiceStatus || "").trim() === "Open" && lead?.documentsSentToUser)
      ? (areAllRequiredDocumentsUploaded(lead) ? "All documents uploaded. Pending admin review." : "Pending client documents upload.")
      : {
        Open: "Pending admin review and documents upload.",
        PendingReview: "Documents are being reviewed by PR.",
        InformationRequired: "Service rejected by PR. Action required.",
        PR_Accepted: "Documents verified. Awaiting executor assignment.",
        AssignedToExecutor: `Assigned to ${getExecutorLabel(lead?.assignedExecutor)} — Service is starting.`,
        InProgress: `Accepted by ${getExecutorLabel(lead?.assignedExecutor)}.`,
        ExecutionFinished: draftSentToPRFlag ? `Draft sent by ${getExecutorLabel(lead?.assignedExecutor)} — Review and send to client.` : "Execution finished. Awaiting executor to send draft.",
        DraftSent: "Draft is awaiting user approval.",
        DraftAccepted: "Draft approved by user. Waiting for final completion.",
        UserAccepted: "Draft approved by user. Waiting for final completion.",
        DraftRejected: draftSentToPRFlag ? `Revised draft sent by ${getExecutorLabel(lead?.assignedExecutor)} — Review and send to client.` : "Draft rejected by user. Awaiting revised draft from executor.",
        Rejected: "Service has been rejected.",
        Completed: "Service completed successfully.",
      }[String(effectiveServiceStatus || "").trim()] || "Service is in progress."
    : "";
    const showFinalUploadSection = ["DraftAccepted", "UserAccepted", "Completed"].includes(effectiveServiceStatus);
  const uploadedDocumentCount = uploadedClientDocs.length;
  const isDraftApprovedByWorkflow = ["DraftAccepted", "UserAccepted", "Completed"].includes(effectiveServiceStatus);
  const isFinalApprovedByWorkflow = effectiveServiceStatus === "Completed";
  const getDraftFinalStatusInfo = (doc) => {
    const docType = String(doc?.type || "").trim();
    const rawStatus = String(doc?.status || "").trim().toLowerCase();
    const draftRejected = String(lead?.status || "").trim().toLowerCase() === "draftrejected";
    const draftRejectedByUser =
      draftRejected ||
      String(lead?.userMessage || "").toLowerCase().includes("draft rejected by user");

    if (draftRejectedByUser && docType === "Draft") {
      return {
        label: "REJECTED BY USER",
        color: "#ef4444",
        bg: "rgba(239,68,68,0.08)",
        border: "rgba(239,68,68,0.15)",
        note: "Rejected by the user and awaiting revision.",
      };
    }

    if (rawStatus === "rejected") {
      return {
        label: "REJECTED",
        color: "#ef4444",
        bg: "rgba(239,68,68,0.08)",
        border: "rgba(239,68,68,0.15)",
        note: doc?.rejectionMessage
          ? `Rejected: ${doc.rejectionMessage}`
          : "Rejected and awaiting user revision.",
      };
    }

    if (docType === "Draft") {
      return isDraftApprovedByWorkflow
        ? {
            label: "DRAFT APPROVED BY USER",
            color: "#16a34a",
            bg: "rgba(22, 163, 74, 0.08)",
            border: "rgba(22, 163, 74, 0.15)",
            note: "Approved by user.",
          }
        : {
            label: "UPLOADED",
            color: "#f59e0b",
            bg: "rgba(245,158,11,0.08)",
            border: "rgba(245,158,11,0.15)",
            note: "Awaiting user approval.",
          };
    }

    if (docType === "Final") {
      return (isFinalApprovedByWorkflow || rawStatus === "accepted")
        ? {
            label: "DRAFT APPROVED BY USER",
            color: "#16a34a",
            bg: "rgba(22, 163, 74, 0.08)",
            border: "rgba(22, 163, 74, 0.15)",
            note: "Final return completed and accepted.",
          }
        : {
            label: "UPLOADED",
            color: "#f59e0b",
            bg: "rgba(245,158,11,0.08)",
            border: "rgba(245,158,11,0.15)",
            note: "Awaiting final completion.",
          };
    }

    return {
      label: doc?.status || "Waiting Review",
      color: "#f59e0b",
      bg: "rgba(245,158,11,0.08)",
      border: "rgba(245,158,11,0.15)",
      note: "Waiting review.",
    };
  };

  const statusPill = lead
    ? (() => {
        // Use the resolved display label to determine color — this accounts for resubmission
        // (e.g. when status is still "Rejected" but user has reuploaded, label becomes "PR Reviewing")
        const resolvedDisplayLabel = getDisplayStatus(effectiveServiceStatus, lead);
        const isPrReviewingNow = resolvedDisplayLabel === "PR Reviewing";
        const isStagedExecutorRejection = resolvedDisplayLabel === "Rejected by Executor (Notify Client)";
        const isRejectedOrInfoReq =
          effectiveServiceStatus === "InformationRequired" ||
          effectiveServiceStatus === "Rejected";

        const isRejectedAndReSent = effectiveServiceStatus === "DraftRejected" && draftSentToPRFlag;
        const color =
          effectiveServiceStatus === "Completed"
            ? "#16a34a"
            : effectiveServiceStatus === "DraftSent"
              ? "#16a34a"
              : isRejectedAndReSent
                ? "#7c3aed"
              : effectiveServiceStatus === "DraftRejected"
                ? "#ef4444"
              : isStagedExecutorRejection
                ? "#f59e0b"
              : isRejectedOrInfoReq && !isPrReviewingNow
                ? "#ef4444"
                : "#16a34a";
        const bg =
          effectiveServiceStatus === "Completed"
            ? "rgba(22, 163, 74, 0.08)"
            : effectiveServiceStatus === "DraftSent"
              ? "rgba(22, 163, 74, 0.08)"
              : isRejectedAndReSent
                ? "rgba(124, 58, 237, 0.08)"
              : effectiveServiceStatus === "DraftRejected"
                ? "rgba(239, 68, 68, 0.08)"
              : isStagedExecutorRejection
                ? "rgba(245, 158, 11, 0.08)"
              : isRejectedOrInfoReq && !isPrReviewingNow
                ? "rgba(239, 68, 68, 0.08)"
                : "rgba(22, 163, 74, 0.08)";
        return { color, bg };
      })()
    : { color: "#6b7280", bg: "rgba(17,24,39,0.04)" };

  const handleDraftUpload = (type, file) => {
    if (!lead || !file) return;
    handleFileUpload(lead._id, file, type);
  };

  const canAcceptService =
    clientDocs.length > 0 &&
    clientDocs.every((doc) => doc.status === "Accepted");
  const draftReadyToSend = lead?.draftReadyToSend === true;
  const canMarkCompleted = draftFinalDocs.some((d) => d.type === "Final") && effectiveServiceStatus !== "Completed";

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
    background: "radial-gradient(circle at top, rgba(248, 250, 252, 1) 0%, rgba(241, 245, 249, 1) 50%, rgba(226, 232, 240, 1) 100%)",
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
    <div className="home-page-shell pr-dashboard-shell" style={containerStyle}>
      <div className="home-page-backdrop" style={{ background: "#f8fafc" }} aria-hidden="true" />
      <style>{`
        .pr-dashboard-shell .dashboard-stat-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
          margin-bottom: 0;
          align-items: stretch;
        }
        .pr-dashboard-shell .dashboard-shell {
          width: 100%;
          background: #f4f4f5;
          border: 1px solid rgba(17,24,39,0.08);
          border-radius: 0;
          box-shadow: none;
          overflow: hidden;
        }
        .pr-dashboard-shell .stat-card {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: default;
        }
        .pr-dashboard-shell .stat-card:hover {
          transform: translateY(-6px) scale(1.03);
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04) !important;
          border-color: rgba(17,24,39,0.18) !important;
          z-index: 10;
        }
        .pr-dashboard-shell .dashboard-shell-inner {
          padding: 10px 14px 10px;
        }
        .pr-dashboard-shell .dashboard-main-grid {
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
        .pr-dashboard-shell .dashboard-panels-divider {
          background: rgba(17,24,39,0.08);
          align-self: stretch;
          border-radius: 0;
        }
        .pr-dashboard-shell .dashboard-service-row {
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .pr-dashboard-shell .dashboard-service-row:hover {
          transform: scale(1.015) translateY(-2px);
          box-shadow: 0 6px 15px -4px rgba(0, 0, 0, 0.08);
          border-color: rgba(34, 197, 94, 0.2) !important;
          z-index: 2;
        }
        .pr-dashboard-shell .inner-card {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .pr-dashboard-shell .inner-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 20px -10px rgba(0, 0, 0, 0.12) !important;
          border-color: rgba(17,24,39,0.18) !important;
        }
        .pr-dashboard-shell .dashboard-panels-shell {
          padding: 18px 0 0 0;
          border-radius: 0;
          margin-top: 0;
          background: transparent;
          border: none;
          box-shadow: none;
        }
        .pr-dashboard-shell .dashboard-section-divider {
          height: 1px;
          width: 100%;
          background: rgba(17,24,39,0.08);
          margin: 6px 0 8px 0;
        }
        .pr-dashboard-shell .dashboard-sidebar-panel {
          height: auto;
          min-height: 0;
          display: flex;
          flex-direction: column;
          align-self: start;
        }
        .pr-dashboard-shell .dashboard-details-panel {
          height: auto;
          display: flex;
          flex-direction: column;
          align-self: start;
        }
        .pr-dashboard-shell .dashboard-details-scroll {
          flex: 0 0 auto;
          min-height: auto;
          overflow: visible;
          padding-right: 0;
          margin-right: 0;
        }
        .pr-dashboard-shell .dashboard-sidebar-scroll {
          flex: 1;
          height: 0;
          min-height: 0;
          overflow-y: auto;
          padding-right: 4px;
          margin-right: -4px;
          scrollbar-width: thin;
          scrollbar-color: #b8b8b8 transparent;
        }
        .pr-dashboard-shell .dashboard-sidebar-scroll::-webkit-scrollbar {
          width: 6px;
        }
        .pr-dashboard-shell .dashboard-sidebar-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .pr-dashboard-shell .dashboard-sidebar-scroll::-webkit-scrollbar-thumb {
          background: #b8b8b8;
          border-radius: 999px;
        }
        .pr-dashboard-shell .dashboard-sidebar-scroll::-webkit-scrollbar-thumb:hover {
          background: #9ca3af;
        }
        .pr-dashboard-shell .dashboard-pill {
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
        .pr-dashboard-shell .dashboard-pill .dot {
          width: 7px;
          height: 7px;
          border-radius: 999px;
          background: currentColor;
        }
        .pr-dashboard-shell .dashboard-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
        }
        .pr-dashboard-shell .dashboard-docs-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #a1a1aa #ffffff;
        }
        .pr-dashboard-shell .dashboard-docs-scrollbar::-webkit-scrollbar {
          height: 10px;
        }
        .pr-dashboard-shell .dashboard-docs-scrollbar::-webkit-scrollbar-track {
          background: #ffffff;
        }
        .pr-dashboard-shell .dashboard-docs-scrollbar::-webkit-scrollbar-thumb {
          background-color: #a1a1aa;
          border-radius: 999px;
          border: 2px solid #ffffff;
        }
        .pr-dashboard-shell .dashboard-docs-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: #8b8b94;
        }
        .pr-dashboard-shell .dashboard-table th,
        .pr-dashboard-shell .dashboard-table td {
          padding: 13px 16px;
          border-bottom: 1px solid rgba(17, 24, 39, 0.08);
          text-align: left;
        }
        .pr-dashboard-shell .dashboard-table th {
          color: #6b7280;
          font-size: 0.8rem;
          font-weight: 700;
        }
        .pr-dashboard-shell .dashboard-table tr:last-child td {
          border-bottom: none;
        }
        .pr-dashboard-shell .dashboard-dropzone {
          border: 1px dashed rgba(34, 197, 94, 0.7);
          background: rgba(255, 255, 255, 0.03);
          transition: all 0.2s ease;
        }
        .pr-dashboard-shell .dashboard-dropzone:hover {
          border-color: rgba(34, 197, 94, 0.95);
          background: rgba(34, 197, 94, 0.05);
        }
        .pr-dashboard-shell .dashboard-search,
        .pr-dashboard-shell .dashboard-input {
          transition: all 0.2s ease;
        }
        .pr-dashboard-shell .dashboard-search:focus,
        .pr-dashboard-shell .dashboard-input:focus {
          border-color: #16a34a !important;
          box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.1);
          outline: none;
        }
        .pr-dashboard-shell .dashboard-search::placeholder {
          color: #6b7280;
        }
        @media (max-width: 1200px) {
          .pr-dashboard-shell .dashboard-stat-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .pr-dashboard-shell .dashboard-main-grid {
            grid-template-columns: 1fr;
          }
          .pr-dashboard-shell .dashboard-panels-divider {
            display: none;
          }
          .pr-dashboard-shell .dashboard-sidebar-panel {
            height: auto;
            min-height: 0;
            max-height: 350px;
          }
          .pr-dashboard-shell .dashboard-sidebar-scroll {
            height: auto;
          }
          .pr-dashboard-shell .dashboard-details-panel {
            min-height: 0;
            max-height: none;
          }
        }
        @media (max-width: 768px) {
          .pr-dashboard-shell .dashboard-stat-grid {
            grid-template-columns: 1fr;
          }
          .pr-dashboard-shell .dashboard-table th,
          .pr-dashboard-shell .dashboard-table td {
            padding: 12px 12px;
          }
        }
        @media (max-width: 480px) {
          .pr-dashboard-shell .dashboard-shell-inner {
            padding: 8px 10px 10px;
          }
          .pr-dashboard-shell .dashboard-main-grid {
            border-radius: 18px;
          }
          .pr-dashboard-shell .dashboard-sidebar-panel,
          .pr-dashboard-shell .dashboard-details-panel {
            padding: 14px 12px;
          }
          .pr-dashboard-shell .dashboard-service-row {
            padding: 14px 12px 14px 14px !important;
            flex-direction: column;
            align-items: stretch;
            gap: 10px;
          }
          .pr-dashboard-shell .dashboard-pill {
            width: fit-content;
            white-space: normal;
          }
          .pr-dashboard-shell .dashboard-table th,
          .pr-dashboard-shell .dashboard-table td {
            padding: 10px 10px;
            font-size: 0.76rem;
          }
          .pr-dashboard-shell .dashboard-documents-scroll {
            overflow-x: auto;
            overflow-y: hidden;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: thin;
            scrollbar-color: #b8b8b8 transparent;
            padding-bottom: 4px;
          }
          .pr-dashboard-shell .dashboard-documents-scroll::-webkit-scrollbar {
            height: 6px;
          }
          .pr-dashboard-shell .dashboard-documents-scroll::-webkit-scrollbar-track {
            background: transparent;
          }
          .pr-dashboard-shell .dashboard-documents-scroll::-webkit-scrollbar-thumb {
            background: #b8b8b8;
            border-radius: 999px;
          }
          .pr-dashboard-shell .dashboard-documents-scroll::-webkit-scrollbar-thumb:hover {
            background: #9ca3af;
          }
          .pr-dashboard-shell .dashboard-documents-scroll .dashboard-table {
            min-width: 540px;
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
            PR <span style={{ color: "#16a34a" }}>Dashboard</span>
          </h1>
          <p style={{ color: "#4b5563", fontSize: isCompactMobile ? "0.92rem" : "1.05rem", marginTop: 8, maxWidth: 700, margin: "0 auto", lineHeight: 1.6, textAlign: "center" }}>
            Track and Manage Client Service Documents
          </p>
        </div>

        <div className="dashboard-shell">
          <div className="dashboard-shell-inner">
            <div className="dashboard-stat-grid">
              {[
                { label: "Services Pending", value: stats.pending, color: "#16a34a", onClick: () => handleServiceListClick("pending") },
                { label: "Services In Progress", value: stats.inProgress, color: "#16a34a", onClick: () => handleServiceListClick("inProgress") },
                { label: "Completed Services", value: stats.completed, color: "#16a34a", onClick: () => handleServiceListClick("completed") },
                { label: "Revenue (₹)", value: stats.revenueValue || 0, color: "#16a34a", isMoney: true, moneyValue: stats.revenue, onClick: handleRevenuePopupClick },
              ].map((card) => {
                return (
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
                      cursor: card.onClick ? "pointer" : undefined,
                      transition: "transform 0.15s, box-shadow 0.15s",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "0.78rem",
                        fontWeight: 700,
                        color: "#111111",
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        marginBottom: 4,
                      }}
                    >
                      {card.label}
                    </div>
                    <div
                      style={{
                        fontSize: "1.44rem",
                        fontWeight: 500,
                        lineHeight: 1,
                        color: card.color,
                      }}
                    >
                      {card.isMoney ? (
                        <CountUp end={card.value} formatter={(v) => formatInr(v)} />
                      ) : (
                        <CountUp end={card.value} />
                      )}
                    </div>
                  </PremiumCard>
                );
              })}
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
                  <h2 style={{ fontSize: isCompactMobile ? "0.98rem" : "1.05rem", fontWeight: 700, marginBottom: 4, color: "#111111" }}>All User Services</h2>
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
                          color: "rgba(0,0,0,0.4)",
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
                    filteredLeads.map((item, index) => {
                      const selected = item._id === activeLead?._id;
                      const pricing = getServicePricing(item?.serviceName);
                      const itemHasFinalDocument = Array.isArray(item?.documents)
                        && item.documents.some((doc) => {
                          const docType = String(doc?.type || "").trim().toLowerCase();
                          const docName = String(doc?.name || "").trim().toLowerCase();
                          return docType === "final" || docName.startsWith("final");
                        });
                      const itemStatus = itemHasFinalDocument && !["rejected", "informationrequired"].includes(String(item?.status || "").trim().toLowerCase())
                        ? "Completed"
                        : getEffectiveLeadStatus(item);
                      const statusLabel = getDisplayStatus(itemStatus, item);
                      
                      // If the statusLabel resolved to "PR Reviewing", the user has resubmitted —
                      // use green/neutral color even if the underlying status is still "Rejected".
                      const isPrReviewing = statusLabel === "PR Reviewing";
                      // Staged executor rejection — amber to signal PR action needed
                      const isStagedExecutorRejection = statusLabel === "Rejected by Executor (Notify Client)";
                      const itemPillColor = 
                        itemStatus === "Completed"
                          ? "#16a34a"
                          : itemStatus === "DraftSent"
                            ? "#16a34a"
                            : itemStatus === "DraftRejected"
                              ? "#ef4444"
                            : isStagedExecutorRejection
                              ? "#f59e0b"
                            : (itemStatus === "InformationRequired" || itemStatus === "Rejected") && !isPrReviewing
                              ? "#ef4444"
                              : "#16a34a";

                      return (
                        <motion.div
                          key={item._id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.14, delay: Math.min(index * 0.02, 0.12) }}
                          role="button"
                          tabIndex={0}
                          onClick={() => setSelectedLeadId?.(item._id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setSelectedLeadId?.(item._id);
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
                            <div style={{ display: "grid", gridTemplateColumns: isCompactMobile ? "1fr" : "minmax(0, 1fr) minmax(132px, 160px)", alignItems: "start", gap: isCompactMobile ? 8 : 12, marginBottom: 6 }}>
                              <div style={{ minWidth: 0, alignSelf: "start" }}>
                                <div style={{ fontSize: isCompactMobile ? "0.92rem" : "0.98rem", fontWeight: 700, marginBottom: 4, whiteSpace: "normal", overflow: "hidden", textOverflow: "ellipsis", lineHeight: 1.2, color: "#111111", marginTop: 0, wordBreak: "break-word" }}>{item.serviceName}</div>
                                <div style={{ color: "#6b7280", fontSize: "0.8rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", lineHeight: 1.35, wordBreak: "normal" }}>
                                  {item.name}
                                </div>
                                <div style={{ color: "#6b7280", fontSize: "0.8rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", lineHeight: 1.35, wordBreak: "normal" }}>
                                  {item.email}
                                </div>
                              </div>
                              <span style={{ color: itemPillColor, padding: 0, flexShrink: 0, marginLeft: isCompactMobile ? 0 : "auto", alignSelf: "start", fontSize: "0.86rem", fontWeight: 700, display: "inline-flex", alignItems: "flex-start", justifyContent: isCompactMobile ? "flex-start" : "flex-end", gap: 6, textAlign: isCompactMobile ? "left" : "right", lineHeight: 1.25, whiteSpace: "normal", overflowWrap: "anywhere", wordBreak: "break-word", maxWidth: "100%" }}>
                                {itemStatus === "Completed" && <CheckCircle size={11} style={{ flexShrink: 0 }} />}
                                {statusLabel}
                              </span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: isCompactMobile ? "wrap" : "nowrap" }}>
                              <span style={{ color: "#6b7280", fontSize: "0.86rem" }}>{formatInr(getLeadRevenueAmount(item))}</span>
                              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: "0.75rem", fontWeight: 700, color: "#f59e0b" }}>
                                  <FileText size={12} />
                                  {item.documents?.length || 0} Docs
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteService(item, e);
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
                    <div style={{ padding: "28px 16px", textAlign: "center", color: "#6b7280" }}>No requests in pipeline.</div>
                  )}
                </div>
              </div>

              <div className="dashboard-panels-divider" aria-hidden="true" />

              <div
                ref={detailsPanelRef}
                className="dashboard-details-panel"
                style={{ padding: isCompactMobile ? "16px 12px" : "22px 24px", background: "#ffffff" }}
              >
                {lead ? (
                  <div className="dashboard-details-scroll" style={{ display: "flex", flexDirection: "column", gap: isCompactMobile ? 14 : 18 }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 18, flexWrap: "wrap", flexDirection: isCompactMobile ? "column" : "row" }}>
                      <div style={{ minWidth: 0 }}>
                        <h2 style={{ fontSize: isCompactMobile ? "1.2rem" : "1.45rem", fontWeight: 700, marginBottom: 8, color: "#111111" }}>{lead.serviceName}</h2>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: isCompactMobile ? 10 : 14, color: "#6b7280", fontSize: "0.84rem" }}>
                          <span>{lead.name}</span>
                          <span>{lead.email}</span>
                          <span>Order ID: #{String(lead._id || "").slice(-6).toUpperCase()}</span>
                          <span>Fee <strong style={{ color: "#16a34a", marginLeft: 8 }}>{formatInr(getLeadRevenueAmount(lead))}</strong></span>
                        </div>
                      </div>
                      <span style={{ color: statusPill.color, fontWeight: 700, fontSize: "1rem", display: "flex", alignItems: "center", gap: 8 }}>
                        {effectiveServiceStatus === "Completed" && <CheckCircle size={16} />}
                        {getDisplayStatus(effectiveServiceStatus, lead)}
                      </span>
                    </div>

                    <PremiumCard className="inner-card" style={{ padding: isCompactMobile ? 14 : 16, borderRadius: 18, background: "#ffffff", border: "1px solid rgba(17,24,39,0.14)", boxShadow: "none" }}>
                      <div className="responsive-progress-grid" style={{ display: "grid", gridTemplateColumns: isCompactMobile ? "1fr" : "1fr 1.35fr auto", gap: 14, alignItems: "center" }}>
                        <div>
                          <div style={{ color: "#6b7280", fontSize: "0.82rem", marginBottom: 8, fontWeight: 500 }}>Service Progress</div>
                          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                            <span style={{ fontSize: "1.55rem", fontWeight: 700 }}>
                              <CountUp end={uploadedDocumentCount} /> / {clientDocs.length || 0}
                            </span>
                            <span style={{ color: "#6b7280", fontSize: "0.88rem" }}>uploaded</span>
                          </div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                          <div style={{ width: "100%", height: 10, background: "rgba(17,24,39,0.08)", borderRadius: 999, overflow: "hidden" }}>
                            <div style={{ width: `${serviceProgressPercent}%`, height: "100%", borderRadius: 999, background: "linear-gradient(90deg, #22c55e, #14b8a6)" }} />
                          </div>
                          <div style={{ color: "#6b7280", fontSize: "0.84rem" }}>
                            {serviceProgressMessage}
                          </div>
                        </div>
                        <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "#111111" }}>
                          <CountUp end={Math.round(serviceProgressPercent)} />%
                        </div>
                      </div>
                    </PremiumCard>

                    {lead.adminToPrMessage && !isSystemMessage(lead.adminToPrMessage) && (
                      <div className="inner-card" style={{ padding: 16, borderRadius: 18, border: "1px solid rgba(16,185,129,0.22)", background: "rgba(16,185,129,0.05)" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 8, color: "#16a34a" }}>
                          <strong style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><MessageSquare size={16} /> Message from Admin</strong>
                          <button type="button" onClick={(e) => handleClearAdminPrMessage(lead._id, e)} style={{ width: 26, height: 26, borderRadius: 999, border: "1px solid rgba(0,0,0,0.1)", background: "transparent", color: "inherit", cursor: "pointer" }}>×</button>
                        </div>
                        <div style={{ color: "#111111", fontSize: "0.95rem", fontStyle: "italic" }}>{lead.adminToPrMessage}</div>
                      </div>
                    )}

                    {lead.executorMessage && !isSystemMessage(lead.executorMessage) && (
                      <div className="inner-card" style={{ padding: 16, borderRadius: 18, border: "1px solid rgba(59,130,246,0.22)", background: "rgba(59,130,246,0.05)" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 8, color: "#3b82f6" }}>
                          <strong style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><MessageSquare size={16} /> Message from Executor</strong>
                          <button type="button" onClick={(e) => handleClearExecutorMessage(lead._id, e)} style={{ width: 26, height: 26, borderRadius: 999, border: "1px solid rgba(0,0,0,0.1)", background: "transparent", color: "inherit", cursor: "pointer" }}>×</button>
                        </div>
                        <div style={{ color: "#111111", fontSize: "0.95rem", fontStyle: "italic" }}>{lead.executorMessage}</div>
                      </div>
                    )}

                    {/* Executor Service Rejection Banner — only visible in PR dashboard until PR notifies client */}
                    {(() => {
                      const isServiceRejectedByExecutor =
                        lead?.executorServiceRejected === true &&
                        lead?.prNotifiedClientServiceRejection !== true;
                      if (!isServiceRejectedByExecutor) return null;
                      const rejectionReason = String(lead?.executorMessage || "")
                        .replace(/^assignment rejected by executor:\s*/i, "")
                        .trim();
                      return (
                        <div className="inner-card" style={{ padding: 18, borderRadius: 18, border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.05)", position: "relative" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, color: "#dc2626" }}>
                            <AlertCircle size={18} />
                            <strong style={{ fontSize: "0.95rem", fontWeight: 800 }}>
                              Executor Rejected Entire Service — Action Required
                            </strong>
                          </div>
                          {rejectionReason && (
                            <div style={{ color: "#6b7280", fontSize: "0.88rem", marginBottom: 16 }}>
                              <span style={{ fontWeight: 600, color: "#dc2626" }}>Reason: </span>
                              {rejectionReason}
                            </div>
                          )}
                          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                            <button
                              type="button"
                              onClick={() => handleNotifyClientServiceRejection(lead._id)}
                              style={{
                                padding: "9px 20px",
                                borderRadius: 10,
                                border: "none",
                                background: "#ef4444",
                                color: "#fff",
                                fontWeight: 800,
                                fontSize: "0.85rem",
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 8,
                              }}
                            >
                              <Send size={14} />
                              Notify Client
                            </button>
                            <span style={{ fontSize: "0.78rem", color: "#9ca3af", fontStyle: "italic" }}>
                              Clicking this makes the rejection visible to the client and all dashboards.
                            </span>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Executor Document Rejection Summary — only visible in PR dashboard */}
                    {(() => {
                      const flaggedDocs = Array.isArray(lead.documents)
                        ? lead.documents.filter(d => d?.executorRejected && !d?.prNotifiedClient && d?.url)
                        : [];
                      if (flaggedDocs.length === 0) return null;
                      if (dismissedExecutorBannerLeads.has(lead._id)) return null;
                      return (
                        <div className="inner-card" style={{ padding: 18, borderRadius: 18, border: "1px solid rgba(239,68,68,0.25)", background: "rgba(239,68,68,0.04)", position: "relative" }}>
                          {/* Close button */}
                          <button
                            type="button"
                            onClick={() => setDismissedExecutorBannerLeads(prev => new Set([...prev, lead._id]))}
                            aria-label="Dismiss"
                            style={{
                              position: "absolute", top: 12, right: 12,
                              width: 26, height: 26, borderRadius: 999,
                              border: "1px solid rgba(239,68,68,0.2)",
                              background: "rgba(239,68,68,0.08)",
                              color: "#ef4444", cursor: "pointer",
                              display: "inline-flex", alignItems: "center", justifyContent: "center",
                              fontSize: "0.9rem", fontWeight: 800, lineHeight: 1,
                            }}
                          >
                            <X size={14} />
                          </button>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, color: "#dc2626", paddingRight: 32 }}>
                            <AlertCircle size={18} />
                            <strong style={{ fontSize: "0.95rem", fontWeight: 800 }}>
                              Executor Rejected {flaggedDocs.length} Document{flaggedDocs.length > 1 ? "s" : ""} — Action Required
                            </strong>
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            {flaggedDocs.map((doc) => (
                              <div
                                key={doc._id}
                                style={{
                                  padding: "12px 14px",
                                  borderRadius: 12,
                                  background: "#ffffff",
                                  border: "1px solid rgba(239,68,68,0.18)",
                                  display: "flex",
                                  alignItems: "flex-start",
                                  justifyContent: "space-between",
                                  gap: 12,
                                  flexWrap: "wrap",
                                }}
                              >
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#111111", marginBottom: 2 }}>{doc.name}</div>
                                  {doc.rejectionMessage && (
                                    <div style={{ color: "#6b7280", fontSize: "0.82rem" }}>
                                      <span style={{ fontWeight: 600, color: "#dc2626" }}>Reason: </span>{doc.rejectionMessage}
                                    </div>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleNotifyClientDocRejection(lead._id, doc._id)}
                                  style={{
                                    padding: "8px 16px",
                                    borderRadius: 10,
                                    border: "none",
                                    background: "#ef4444",
                                    color: "#fff",
                                    fontWeight: 800,
                                    fontSize: "0.8rem",
                                    cursor: "pointer",
                                    flexShrink: 0,
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 6,
                                  }}
                                >
                                  Notify Client
                                </button>
                              </div>
                            ))}
                          </div>
                          <div style={{ marginTop: 12, fontSize: "0.78rem", color: "#9ca3af", fontStyle: "italic" }}>
                            Clicking "Notify Client" marks the document as rejected and sends it to the client for reupload.
                          </div>
                        </div>
                      );
                    })()}

                    {(() => {
                      const rawUserMsg = String(lead.userMessage || "").trim();
                      if (!rawUserMsg) return null;
                      // For DraftRejected, always surface the user's feedback — strip the
                      // auto-prepended "Draft rejected by user: " prefix before displaying.
                      const isDraftRejectedLead = effectiveServiceStatus === "DraftRejected";
                      const draftRejectionReason = rawUserMsg
                        .replace(/^Draft rejected by user:\s*/i, "")
                        .trim();
                      if (isDraftRejectedLead && draftRejectionReason) {
                        return (
                          <div className="inner-card" style={{ padding: 16, borderRadius: 18, border: "1px solid rgba(239,68,68,0.22)", background: "rgba(239,68,68,0.05)" }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 8, color: "#ef4444" }}>
                              <strong style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><AlertCircle size={16} /> Draft Rejected by User</strong>
                              <button type="button" onClick={(e) => handleClearUserRejectedMessage(lead._id, e)} style={{ width: 26, height: 26, borderRadius: 999, border: "1px solid rgba(0,0,0,0.1)", background: "transparent", color: "inherit", cursor: "pointer" }}>×</button>
                            </div>
                            <div style={{ color: "#111111", fontSize: "0.95rem" }}>{draftRejectionReason}</div>
                          </div>
                        );
                      }
                      if (!isSystemMessage(rawUserMsg)) {
                        return (
                          <div className="inner-card" style={{ padding: 16, borderRadius: 18, border: "1px solid rgba(239,68,68,0.22)", background: "rgba(239,68,68,0.05)" }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 8, color: "#ef4444" }}>
                              <strong style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><AlertCircle size={16} /> Message from User</strong>
                              <button type="button" onClick={(e) => handleClearUserRejectedMessage(lead._id, e)} style={{ width: 26, height: 26, borderRadius: 999, border: "1px solid rgba(0,0,0,0.1)", background: "transparent", color: "inherit", cursor: "pointer" }}>×</button>
                            </div>
                            <div style={{ color: "#111111", fontSize: "0.95rem" }}>{rawUserMsg}</div>
                          </div>
                        );
                      }
                      return null;
                    })()}

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
                            userSelect: "none"
                          }}
                        >
                          <div>
                            <h3 style={{ fontSize: isCompactMobile ? "0.92rem" : "0.98rem", fontWeight: 700, marginBottom: 3, color: "#111111" }}>Service Documents</h3>
                            <p style={{ color: "#6b7280", fontSize: isCompactMobile ? "0.74rem" : "0.8rem", fontWeight: 400 }}>Review and manage all documents for this service.</p>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <span style={{ color: "#6b7280", fontSize: isCompactMobile ? "0.74rem" : "0.8rem", fontWeight: 500 }}>{uploadedDocumentCount} / {clientDocs.length || 0} uploaded</span>
                            <ChevronDown size={18} style={{ transform: documentsOpen ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.3s ease", color: "#6b7280" }} />
                          </div>
                        </button>

                        <AnimatePresence>
                          {documentsOpen && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              style={{ overflow: "hidden" }}
                            >
                              <div className="dashboard-docs-scrollbar dashboard-documents-scroll" style={{ overflowX: "auto" }}>
                                <table className="dashboard-table">
                                  <thead>
                                    <tr>
                                      <th style={{ width: isCompactMobile ? "32%" : "34%" }}>Document</th>
                                      <th style={{ width: isCompactMobile ? "24%" : "22%", paddingLeft: 20 }}>Status</th>
                                      <th style={{ width: isCompactMobile ? 150 : 180, textAlign: "center", paddingLeft: 20 }}>Action</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                  {clientDocs.length > 0 ? (
                                    clientDocs.map((doc) => {
                                      const docKey = `${lead._id}:${doc._id}`;
                                      const isDraftDocument = String(doc?.type || "").trim().toLowerCase() === "draft";
                                      const draftRejected = String(lead?.status || "").trim().toLowerCase() === "draftrejected";
                                      const draftAccepted = ["draftaccepted", "useraccepted", "completed"].includes(String(lead?.status || "").trim().toLowerCase());
                                      const isReuploaded = !!doc.displayReuploaded;
                                      const actualStatus = String(doc.status || "").trim().toLowerCase();
                                      const draftShared = ["draftsent", "draftrejected", "draftaccepted", "useraccepted", "completed"].includes(String(lead?.status || "").trim().toLowerCase());
                                      const isReuploadPending =
                                        isReuploaded &&
                                        !["accepted", "rejected"].includes(actualStatus);
                                      const docStatus = serviceRejected
                                        ? "Rejected"
                                        : draftRejected && isDraftDocument
                                          ? isReuploaded
                                            ? "Draft Shared"
                                            : "Draft Rejected"
                                          : isDraftDocument && draftAccepted
                                            ? "Accepted"
                                          : isDraftDocument && isReuploaded
                                            ? "Draft Shared"
                                          : isDraftDocument
                                            ? (draftShared ? "Draft Shared" : "Draft Uploaded")
                                          : ["accepted", "rejected"].includes(actualStatus)
                                            ? doc.status
                                            : isReuploadPending
                                              ? "Under Review"
                                              : String(doc.status || "Waiting Review");
                                        const docStatusLower = String(docStatus || "").trim().toLowerCase();
                                        const isDraftSentState =
                                          isDraftDocument &&
                                          ["draft shared", "draft sent", "draft approved"].includes(docStatusLower);
                                        const rejectedByExecutor =
                                          String(lead?.status || "").trim().toLowerCase() === "rejected" &&
                                          (
                                            String(lead?.executorMessage || "").trim().length > 0 ||
                                            String(lead?.prFeedback || "").toLowerCase().includes("executor") ||
                                            String(lead?.prFeedback || "").toLowerCase().includes("assignment") ||
                                            String(lead?.adminMessage || "").toLowerCase().includes("executor") ||
                                            String(lead?.adminMessage || "").toLowerCase().includes("assignment")
                                          );
                                        const showReuploadRequired = rejectedByExecutor && docStatusLower.includes("rejected");

                                      // Executor flagged this doc but PR hasn't told the client yet
                                      const isPendingPrNotification = !!doc.executorRejected && !doc.prNotifiedClient;

                                      // In InformationRequired (reupload flow): only show ACCEPT/REJECT on
                                      // reuploaded docs. Docs that were already accepted should not re-show buttons.
                                      // In Open/PendingReview: show on any pending doc (normal first review).
                                      const showReviewActions =
                                        !serviceDecisionFinalized &&
                                        !isPendingPrNotification &&
                                        ["Open", "PendingReview", "InformationRequired"].includes(lead.status) &&
                                        actualStatus !== "accepted" &&
                                        actualStatus !== "rejected" &&
                                        (lead.status === "InformationRequired" ? (isReuploaded || actualStatus === "pending") : true);
                                      
                                      const isDone = docStatus === "Accepted";
                                      const isDraftRejectedDoc = draftRejected && isDraftDocument;
                                      const isError = docStatus === "Rejected" || isDraftRejectedDoc;

                                      return (
                                        <React.Fragment key={doc._id}>
                                          <tr>
                                            <td>
                                              <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0, flexWrap: isCompactMobile ? "wrap" : "nowrap" }}>
                                                  <div style={{ padding: 8, background: isDone ? "rgba(22,163,74,0.06)" : (isError || isPendingPrNotification) ? "rgba(239,68,68,0.06)" : "rgba(17,24,39,0.04)", borderRadius: 10 }}>
                                                    <FileText size={18} color={isDone ? "#16a34a" : (isError || isPendingPrNotification) ? "#ef4444" : "#6b7280"} style={{ flexShrink: 0 }} />
                                                  </div>
                                                <div style={{ minWidth: 0 }}>
                                                    <div style={{ fontSize: isCompactMobile ? "0.84rem" : "0.9rem", fontWeight: 700, color: "#111111", whiteSpace: isCompactMobile ? "normal" : "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{doc.name}</div>
                                                    {isPendingPrNotification ? (
                                                      <div style={{ marginTop: 2, color: "#ef4444", fontSize: "0.74rem", fontWeight: 700 }}>⚠ Flagged by Executor — Notify Client</div>
                                                    ) : showReuploadRequired ? (
                                                      <div style={{ marginTop: 2, color: "#ef4444", fontSize: "0.74rem", fontWeight: 700 }}>Reupload Required</div>
                                                    ) : isReuploaded ? (
                                                      <div style={{ marginTop: 2, color: "#16a34a", fontSize: "0.74rem", fontWeight: 700 }}>{isDraftDocument ? "Draft Reuploaded" : "Reuploaded"}</div>
                                                      ) : null}
                                                  </div>
                                                </div>
                                              </td>
                                              <td style={{ paddingLeft: 20 }}>
                                                <span style={{ display: "flex", alignItems: "center", color: isDone || isDraftSentState ? "#16a34a" : (isError || isPendingPrNotification) ? "#ef4444" : "#f59e0b", fontSize: isCompactMobile ? "0.74rem" : "0.84rem", fontWeight: 700 }}>
                                                  {isPendingPrNotification ? "Flagged by Executor" : docStatus}
                                                </span>
                                              </td>
                                              <td style={{ textAlign: "center", paddingLeft: 20 }}>
                                                  <div style={{ display: "flex", justifyContent: "center", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                                                    <button
                                                      type="button"
                                                      onClick={() => viewDocument(doc.publicId, doc.url || doc.secure_url || doc.uploadedUrl || doc.viewUrl, lead._id)}
                                                      style={{ 
                                                        height: isCompactMobile ? 30 : 32,
                                                        padding: isCompactMobile ? "0 10px" : "0 12px",
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
                                                        transition: "all 0.2s ease"
                                                      }} 
                                                      onMouseEnter={(e) => e.currentTarget.style.background = "#f9fafb"}
                                                      onMouseLeave={(e) => e.currentTarget.style.background = "#ffffff"}
                                                      title="View"
                                                      >
                                                        VIEW <Eye size={14} />
                                                      </button>

                                                    {/* Notify Client btn — only shown in PR dashboard when executor flagged the doc */}
                                                    {isPendingPrNotification && (
                                                      <button
                                                        type="button"
                                                        onClick={() => handleNotifyClientDocRejection(lead._id, doc._id)}
                                                        style={{
                                                          height: isCompactMobile ? 30 : 32,
                                                          padding: isCompactMobile ? "0 10px" : "0 14px",
                                                          borderRadius: 10,
                                                          border: "none",
                                                          background: "#ef4444",
                                                          color: "#fff",
                                                          fontWeight: 800,
                                                          cursor: "pointer",
                                                          fontSize: isCompactMobile ? "0.68rem" : "0.72rem",
                                                          display: "inline-flex", alignItems: "center", gap: 6,
                                                        }}
                                                      >
                                                        Notify Client
                                                      </button>
                                                    )}
                                                    
                                                    {showReviewActions && !isPendingPrNotification && (
                                                      <>
                                                        <button 
                                                          type="button" 
                                                          onClick={() => handleDocumentStatus(lead._id, doc._id, "Accepted")} 
                                                          style={{ 
                                                            height: isCompactMobile ? 30 : 32,
                                                            padding: isCompactMobile ? "0 10px" : "0 14px", 
                                                            borderRadius: 10, 
                                                            border: "none", 
                                                            background: "#16a34a", 
                                                            color: "#fff", 
                                                            fontWeight: 800, 
                                                            cursor: "pointer", 
                                                            fontSize: isCompactMobile ? "0.68rem" : "0.72rem" 
                                                          }}
                                                        >
                                                          ACCEPT
                                                        </button>
                                                        
                                                        <button 
                                                          type="button" 
                                                          onClick={() => openDocRejectForm(lead._id, doc)} 
                                                          style={{ 
                                                            height: isCompactMobile ? 30 : 32,
                                                            padding: isCompactMobile ? "0 10px" : "0 14px", 
                                                            borderRadius: 10, 
                                                            border: "1px solid rgba(239, 68, 68, 0.15)", 
                                                            background: "rgba(239, 68, 68, 0.08)", 
                                                            color: "#ef4444", 
                                                            fontWeight: 800, 
                                                            cursor: "pointer", 
                                                            fontSize: isCompactMobile ? "0.68rem" : "0.72rem" 
                                                          }}
                                                        >
                                                          REJECT
                                                        </button>
                                                      </>
                                                    )}
                                                  </div>
                                              </td>
                                            </tr>
                                            {rejectingDocKey === docKey && (
                                              <tr>
                                                <td colSpan={3}>
                                                  <div style={{ marginTop: 8, padding: 14, borderRadius: 14, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)" }}>
                                                    <div style={{ fontSize: "0.72rem", fontWeight: 800, color: "#ef4444", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Send Rejection Message to Client</div>
                                                    <textarea value={docRejectDrafts[docKey] || ""} onChange={(e) => setDocRejectDrafts((prev) => ({ ...prev, [docKey]: e.target.value }))} rows={3} placeholder={`Explain why ${doc.name} was rejected...`} style={{ width: "100%", resize: "vertical", borderRadius: 12, border: "1px solid rgba(17,24,39,0.08)", background: "#ffffff", color: "#111111", padding: "0.8rem", outline: "none", fontSize: "0.85rem" }} />
                                                    <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
                                                      <button type="button" onClick={() => handleRejectDocumentWithMessage(lead._id, doc)} style={{ padding: "0.7rem 1rem", borderRadius: 10, border: "none", background: "#ef4444", color: "#fff", fontSize: "0.78rem", fontWeight: 800, cursor: "pointer" }}>Reject and Notify Client</button>
                                                      <button type="button" onClick={() => setRejectingDocKey(null)} style={{ padding: "0.7rem 1rem", borderRadius: 10, border: "1px solid rgba(17,24,39,0.08)", background: "#ffffff", color: "#6b7280", fontSize: "0.78rem", fontWeight: 700, cursor: "pointer" }}>Cancel</button>
                                                    </div>
                                                  </div>
                                                </td>
                                              </tr>
                                            )}
                                          </React.Fragment>
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
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </PremiumCard>

                      {/* Draft & Final Fulfillment Control */}
                      {draftWorkflowStarted && (
                        <PremiumCard className="inner-card" style={{ padding: isCompactMobile ? "14px" : "18px 22px", background: "#ffffff", border: "1px solid rgba(17,24,39,0.12)", borderRadius: 20 }}>
                          <div style={{ marginBottom: 18, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                            <div>
                              <h3 style={{ fontSize: "1.1rem", fontWeight: 800, marginBottom: 2, color: "#111111" }}>Final Document Upload</h3>
                              <p style={{ color: "#6b7280", fontSize: "0.82rem" }}>Upload the final return document once the user accepts the draft.</p>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 20, background: "rgba(59,130,246,0.07)", border: "1px solid rgba(59,130,246,0.18)", whiteSpace: "nowrap", flexShrink: 0 }}>
                              <span style={{ fontSize: "0.75rem" }}>ℹ️</span>
                              <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#2563eb" }}>
                                Draft upload handled by {getExecutorLabel(lead?.assignedExecutor)}
                              </span>
                            </div>
                          </div>
                          <div style={{ marginBottom: 20 }}>
                            {/* Final Section */}
                            <div style={{ padding: isCompactMobile ? 12 : 16, borderRadius: 16, border: showFinalUploadSection ? "1px solid rgba(17,24,39,0.08)" : "1px dashed rgba(17,24,39,0.1)", background: showFinalUploadSection ? "rgba(17,24,39,0.02)" : "rgba(17,24,39,0.015)" }}>
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                                <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "#111111" }}>FINAL RETURN</span>
                                {!showFinalUploadSection && (
                                  <span style={{ fontSize: "0.72rem", fontWeight: 600, color: "#9ca3af" }}>Waiting for user to accept draft</span>
                                )}
                              </div>
                              <input type="file" ref={finalInputRef} style={{ display: "none" }} onChange={(e) => handleDraftUpload("Final", e.target.files[0])} />
                              <button
                                className="fulfillment-btn"
                                onClick={() => showFinalUploadSection && finalInputRef.current.click()}
                                disabled={isFinalUploading || !showFinalUploadSection}
                                style={{ width: "100%", padding: "12px", borderRadius: 12, border: showFinalUploadSection ? "1px dashed rgba(22, 163, 74, 0.4)" : "1px dashed rgba(17,24,39,0.15)", background: showFinalUploadSection ? "white" : "rgba(17,24,39,0.03)", color: showFinalUploadSection ? "#16a34a" : "#9ca3af", fontWeight: 700, fontSize: "0.85rem", cursor: showFinalUploadSection ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}
                              >
                                {isFinalUploading ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}
                                {isFinalUploading ? "Uploading..." : showFinalUploadSection ? "Upload Final" : "Upload Final"}
                              </button>
                            </div>
                          </div>
                          
                          {draftFinalDocs.length > 0 && (
                            <div style={{ marginBottom: 20, padding: 16, borderRadius: 16, background: "rgba(17,24,39,0.02)", border: "1px solid rgba(17,24,39,0.05)" }}>
                              <div style={{ fontSize: "0.75rem", fontWeight: 800, color: "#6b7280", textTransform: "uppercase", marginBottom: 12, letterSpacing: "0.05em" }}>Draft & Final Documents</div>
                              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                {draftFinalDocs.map((doc) => {
                                  const info = getDraftFinalStatusInfo(doc);
                                  const leadSt = String(lead?.status || "").trim().toLowerCase();
                                  const isSentOrBeyond = ["draftsent","draftaccepted","draftrejected","useraccepted","completed"].includes(leadSt);
                                  const isAccepted = ["draftaccepted","useraccepted","completed"].includes(leadSt) && String(doc?.type||"").trim().toLowerCase() === "draft";
                                  const isDraftDoc = String(doc?.type||"").trim().toLowerCase() === "draft";
                                  // Rejected by user only when executor hasn't re-sent to PR yet
                                  const isRejectedStatus = leadSt === "draftrejected" && isDraftDoc && !draftSentToPRFlag;
                                  // Re-sent to PR after rejection
                                  const isReSentToPR = isDraftDoc && draftSentToPRFlag && leadSt === "draftrejected";
                                  // Can send to client: executor sent to PR and status is not yet forwarded in this cycle
                                  const canSendToClient = isDraftDoc && draftSentToPRFlag && (leadSt === "executionfinished" || leadSt === "draftrejected");
                                  const statusLabel = isAccepted ? "Accepted"
                                    : isRejectedStatus ? "Rejected by User"
                                    : isReSentToPR ? "Sent to PR"
                                    : isSentOrBeyond && isDraftDoc ? "Draft Shared"
                                    : isDraftDoc && draftSentToPRFlag ? "Sent to PR"
                                    : isDraftDoc ? "Draft Uploaded"
                                    : "Uploaded";
                                  const statusColor = isAccepted ? "#16a34a" : isRejectedStatus ? "#ef4444" : (isReSentToPR || (isDraftDoc && draftSentToPRFlag)) ? "#7c3aed" : isSentOrBeyond && isDraftDoc ? "#2563eb" : "#16a34a";
                                  const statusBg = isAccepted ? "rgba(22,163,74,0.08)" : isRejectedStatus ? "rgba(239,68,68,0.08)" : (isReSentToPR || (isDraftDoc && draftSentToPRFlag)) ? "rgba(124,58,237,0.08)" : isSentOrBeyond && isDraftDoc ? "rgba(37,99,235,0.08)" : "rgba(22,163,74,0.08)";
                                  const statusBorder = isAccepted ? "rgba(22,163,74,0.2)" : isRejectedStatus ? "rgba(239,68,68,0.18)" : (isReSentToPR || (isDraftDoc && draftSentToPRFlag)) ? "rgba(124,58,237,0.18)" : isSentOrBeyond && isDraftDoc ? "rgba(37,99,235,0.18)" : "rgba(22,163,74,0.2)";
                                  return (
                                    <div key={doc._id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderRadius: 12, background: "#ffffff", border: "1px solid rgba(17,24,39,0.08)", gap: 10, flexWrap: "wrap" }}>
                                      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
                                        <FileText size={16} color="#8b5cf6" style={{ flexShrink: 0 }} />
                                        <div style={{ minWidth: 0 }}>
                                          <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#111111", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "block" }}>{doc.name}</span>
                                          <span style={{ fontSize: "0.65rem", fontWeight: 800, color: String(doc?.type||"").trim().toLowerCase() === "draft" ? "#8b5cf6" : "#10b981" }}>{String(doc?.type||"").trim().toUpperCase()}</span>
                                        </div>
                                      </div>
                                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                                        <span style={{ fontSize: "0.74rem", fontWeight: 700, color: statusColor, background: statusBg, border: `1px solid ${statusBorder}`, borderRadius: 8, padding: "3px 10px", whiteSpace: "nowrap" }}>{statusLabel}</span>
                                        <button
                                          onClick={() => viewDocument(doc.publicId, doc.url || doc.secure_url || doc.uploadedUrl || doc.viewUrl, lead._id)}
                                          style={{ padding: "0 12px", height: 30, borderRadius: 8, border: "1px solid rgba(17,24,39,0.1)", background: "#ffffff", color: "#111111", fontSize: "0.72rem", fontWeight: 800, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}
                                          onMouseEnter={(e) => e.currentTarget.style.background = "#f9fafb"}
                                          onMouseLeave={(e) => e.currentTarget.style.background = "#ffffff"}
                                        >
                                          VIEW
                                        </button>
                                        {canSendToClient && (
                                          <button
                                            onClick={() => handleUpdateLeadStatus(lead._id, "DraftSent")}
                                            style={{ padding: "0 12px", height: 30, borderRadius: 8, border: "none", background: "#2563eb", color: "#fff", fontSize: "0.72rem", fontWeight: 800, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = "#1d4ed8"}
                                            onMouseLeave={(e) => e.currentTarget.style.background = "#2563eb"}
                                          >
                                            <Send size={13} /> Send to Client
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                           <div style={{ display: "flex", gap: 12, justifyContent: isCompactMobile ? "stretch" : "flex-end", width: "100%", flexWrap: "wrap" }}>
                            {canMarkCompleted && (
                              <button onClick={() => handleUpdateLeadStatus(lead._id, "Completed")} style={{ width: isCompactMobile ? "100%" : "auto", padding: "12px 20px", borderRadius: 12, background: "#16a34a", color: "#fff", border: "none", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}><CheckCircle size={16} /> Mark Completed</button>
                            )}
                          </div>
                        </PremiumCard>
                      )}

                      {/* Service Management Control */}
                      <PremiumCard style={{
                        padding: "18px 22px",
                        background: serviceDecisionFinalized
                          ? serviceRejected
                            ? "rgba(239,68,68,0.04)"
                            : "rgba(22,163,74,0.04)"
                          : "#ffffff",
                        border: serviceDecisionFinalized
                          ? serviceRejected
                            ? "1px solid rgba(239,68,68,0.2)"
                            : "1px solid rgba(22,163,74,0.2)"
                          : "1px solid rgba(17,24,39,0.12)",
                        borderRadius: 20
                      }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <div>
                              <h3 style={{ fontSize: "1.1rem", fontWeight: 800, marginBottom: 2, color: "#111111" }}>Service Status Control</h3>
                              <p style={{ color: "#6b7280", fontSize: "0.82rem" }}>
                                {serviceDecisionFinalized
                                  ? serviceRejected
                                    ? "This service has been rejected."
                                    : isPrAcceptedPendingExecutor
                                      ? "Service accepted. Please assign an executor to proceed."
                                      : "This service has been accepted and is in progress."
                                  : "Accept or Reject the service request."}
                              </p>
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>

                            {/* Finalized state — show badge only, no action buttons */}
                            {serviceDecisionFinalized ? (
                              isPrAcceptedPendingExecutor ? (
                                /* Accepted but executor not yet assigned — show selector only */
                                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                                  <span style={{
                                    display: "inline-flex", alignItems: "center", gap: 6,
                                    padding: "6px 14px", borderRadius: 10, fontWeight: 700, fontSize: "0.82rem",
                                    background: "rgba(22,163,74,0.08)", color: "#16a34a",
                                    border: "1px solid rgba(22,163,74,0.2)",
                                  }}>
                                    <CheckCircle size={14} /> Accepted — Assign Executor
                                  </span>
                                  <select
                                    value={selectedExecutorRole}
                                    onChange={(e) => setSelectedExecutorRole(e.target.value)}
                                    style={{
                                      padding: "8px 12px", borderRadius: 10, border: "1px solid #d1d5db",
                                      fontSize: "0.85rem", fontWeight: 600, color: "#111",
                                      background: "#fff", cursor: "pointer",
                                    }}
                                  >
                                    <option value="">Select executor...</option>
                                    {Array.isArray(executors) && executors.length > 0
                                      ? executors.map((ex) => (
                                          <option key={ex._id} value={String(ex.role).trim().toLowerCase()}>
                                            {ex.name} ({String(ex.role).trim().toLowerCase()})
                                          </option>
                                        ))
                                      : null}
                                  </select>
                                  <button
                                    onClick={async () => {
                                      const executorRole = selectedExecutorRole;
                                      setAssigningExecutorLead(null);
                                      setSelectedExecutorRole("");
                                      await handleUpdateLeadStatus(lead._id, "AssignedToExecutor", "", {
                                        assignedExecutor: executorRole,
                                      });
                                    }}
                                    disabled={!selectedExecutorRole}
                                    style={{
                                      padding: "8px 16px", borderRadius: 10,
                                      background: selectedExecutorRole ? "#16a34a" : "rgba(17,24,39,0.05)",
                                      color: selectedExecutorRole ? "#fff" : "#9ca3af", border: "none",
                                      fontWeight: 700, fontSize: "0.85rem",
                                      cursor: selectedExecutorRole ? "pointer" : "not-allowed",
                                      display: "flex", alignItems: "center", gap: 6,
                                    }}
                                  >
                                    <CheckCircle size={16} /> Assign
                                  </button>
                                </div>
                              ) : (
                                /* Fully decided — show rejected badge only */
                                serviceRejected ? (
                                  <span style={{
                                    display: "inline-flex", alignItems: "center", gap: 8,
                                    padding: "8px 18px", borderRadius: 12, fontWeight: 700, fontSize: "0.9rem",
                                    background: "rgba(239,68,68,0.1)", color: "#dc2626",
                                    border: "1px solid rgba(239,68,68,0.25)",
                                  }}>
                                    <XCircle size={16} /> Service Rejected
                                  </span>
                                ) : null
                              )
                            ) : (
                              <>
                                {/* Service Status Control - Accept/Reject (only shown when not yet decided) */}
                                {canShowServiceDecisionButtons && (
                                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                    {assigningExecutorLead === lead._id ? (
                                      <>
                                        <select
                                          value={selectedExecutorRole}
                                          onChange={(e) => setSelectedExecutorRole(e.target.value)}
                                          style={{
                                            padding: "8px 12px", borderRadius: 10, border: "1px solid #d1d5db",
                                            fontSize: "0.85rem", fontWeight: 600, color: "#111",
                                            background: "#fff", cursor: "pointer",
                                          }}
                                        >
                                          <option value="">Select executor...</option>
                                          {Array.isArray(executors) && executors.length > 0
                                            ? executors.map((ex) => (
                                                <option key={ex._id} value={String(ex.role).trim().toLowerCase()}>
                                                  {ex.name} ({String(ex.role).trim().toLowerCase()})
                                                </option>
                                              ))
                                            : null}
                                        </select>
                                        <button
                                          onClick={async () => {
                                            const executorRole = selectedExecutorRole;
                                            setAssigningExecutorLead(null);
                                            setSelectedExecutorRole("");
                                            await handleUpdateLeadStatus(lead._id, "AssignedToExecutor", "", {
                                              assignedExecutor: executorRole,
                                            });
                                          }}
                                          disabled={!selectedExecutorRole}
                                          style={{
                                            padding: "8px 16px", borderRadius: 10, background: selectedExecutorRole ? "#16a34a" : "rgba(17,24,39,0.05)",
                                            color: selectedExecutorRole ? "#fff" : "#9ca3af", border: "none",
                                            fontWeight: 700, fontSize: "0.85rem", cursor: selectedExecutorRole ? "pointer" : "not-allowed",
                                            display: "flex", alignItems: "center", gap: 6,
                                          }}
                                        >
                                          <CheckCircle size={16} /> Assign
                                        </button>
                                        <button
                                          onClick={() => { setAssigningExecutorLead(null); setSelectedExecutorRole(""); }}
                                          style={{
                                            padding: "8px 16px", borderRadius: 10, background: "rgba(239,68,68,0.08)",
                                            color: "#ef4444", border: "1px solid rgba(239,68,68,0.15)",
                                            fontWeight: 700, fontSize: "0.85rem", cursor: "pointer",
                                          }}
                                        >
                                          Cancel
                                        </button>
                                      </>
                                    ) : (
                                      <button
                                        onClick={async () => {
                                          // Immediately persist PR_Accepted to DB so status survives refresh.
                                          // Backend auto-advances to AssignedToExecutor if executor already set.
                                          await handleUpdateLeadStatus(lead._id, "PR_Accepted");
                                          setAssigningExecutorLead(lead._id);
                                        }}
                                        disabled={!canAcceptService}
                                        style={{
                                          padding: "10px 20px",
                                          borderRadius: 12,
                                          background: canAcceptService ? "#16a34a" : "rgba(17,24,39,0.05)",
                                          color: canAcceptService ? "#ffffff" : "#9ca3af",
                                          border: canAcceptService ? "none" : "1px solid rgba(17,24,39,0.08)",
                                          fontWeight: 700,
                                          fontSize: "0.85rem",
                                          cursor: canAcceptService ? "pointer" : "not-allowed",
                                          display: "flex",
                                          alignItems: "center",
                                          gap: 8,
                                          transition: "all 0.2s ease"
                                        }}
                                      >
                                        <CheckCircle size={16} /> Accept Service
                                      </button>
                                    )}
                                  </div>
                                )}
                                {assigningExecutorLead !== lead._id && canShowServiceDecisionButtons && (
                                  <button onClick={() => openRejectForm(lead._id)} style={{ padding: "10px 20px", borderRadius: 12, background: "rgba(239, 68, 68, 0.08)", color: "#ef4444", border: "1px solid rgba(239, 68, 68, 0.15)", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}><X size={16} /> Reject Service</button>
                                )}
                              </>
                            )}

                            <div style={{ height: 24, width: 1, background: "rgba(17,24,39,0.08)", margin: "0 4px" }} />
                            <span style={{ color: statusPill.color, fontWeight: 700, fontSize: "0.95rem", display: "flex", alignItems: "center", gap: 8 }}>
                              {effectiveServiceStatus === "Completed" && <CheckCircle size={16} />}
                              {getDisplayStatus(effectiveServiceStatus, lead)}
                            </span>
                          </div>
                        </div>

                        {/* Rejection form — only shown when not yet finalized */}
                        {rejectingLeadId === lead._id && canShowServiceDecisionButtons && (
                          <div style={{ marginTop: 20, padding: 20, borderRadius: 18, background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.15)" }}>
                            <h4 style={{ fontSize: "0.85rem", fontWeight: 800, color: "#ef4444", marginBottom: 12, textTransform: "uppercase" }}>Confirm Service Rejection</h4>
                            <textarea value={rejectDrafts[lead._id] || ""} onChange={(e) => setRejectDrafts((prev) => ({ ...prev, [lead._id]: e.target.value }))} rows={4} placeholder="Explain the reason for rejection to the user..." style={{ width: "100%", padding: 14, borderRadius: 14, border: "1px solid rgba(17,24,39,0.08)", background: "white", color: "#111111", fontSize: "0.9rem", outline: "none", marginBottom: 14 }} />
                            <div style={{ display: "flex", gap: 10 }}>
                              <button onClick={() => handleRejectService(lead._id)} style={{ padding: "10px 22px", borderRadius: 12, background: "#ef4444", color: "#fff", border: "none", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer" }}>Confirm Rejection</button>
                              <button onClick={() => setRejectingLeadId(null)} style={{ padding: "10px 22px", borderRadius: 12, border: "1px solid rgba(17,24,39,0.08)", background: "white", color: "#6b7280", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer" }}>Cancel</button>
                            </div>
                          </div>
                        )}
                      </PremiumCard>

                      {/* Additional Details — notify admin about this specific service */}
                      <PremiumCard style={{ padding: "18px 22px", background: "#ffffff", border: "1px solid rgba(17,24,39,0.12)", borderRadius: 20 }}>
                        <h3 style={{ fontSize: "1.1rem", fontWeight: 800, marginBottom: 2, color: "#111111" }}>Additional Details</h3>
                        <p style={{ color: "#6b7280", fontSize: "0.82rem", marginBottom: 14 }}>
                          Share any extra context about this service with the admin.
                        </p>
                        <div style={{ position: "relative", width: "100%" }}>
                          <textarea
                            value={additionalDetailsDrafts?.[lead._id] || ""}
                            onChange={(e) => setAdditionalDetailsDrafts((prev) => ({ ...prev, [lead._id]: e.target.value }))}
                            placeholder="Add any additional details for the admin about this service..."
                            style={{
                              width: "100%",
                              minHeight: 140,
                              padding: "16px",
                              paddingBottom: 56,
                              borderRadius: 14,
                              border: "1px solid rgba(17,24,39,0.12)",
                              background: "#fafafa",
                              color: "#111111",
                              fontSize: "0.9rem",
                              outline: "none",
                              resize: "vertical",
                              fontFamily: "inherit",
                              boxSizing: "border-box",
                            }}
                          />
                          <button
                            onClick={() => handleNotifyAdminAdditionalDetails(lead._id)}
                            style={{
                              position: "absolute",
                              right: 12,
                              bottom: 12,
                              padding: "10px 18px",
                              borderRadius: 12,
                              background: "#111111",
                              color: "#fff",
                              border: "none",
                              fontWeight: 700,
                              fontSize: "0.82rem",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            <Send size={14} /> Notify Admin
                          </button>
                        </div>
                      </PremiumCard>

                      {/* Communication Hub */}
                      {showCommunicationBox && (
                        <PremiumCard style={{ padding: "18px 22px", background: "#ffffff", border: "1px solid rgba(17,24,39,0.12)", borderRadius: 20, overflow: "visible", position: "relative" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                            <div>
                              <h3 style={{ fontSize: "1.1rem", fontWeight: 800, marginBottom: 2, color: "#111111" }}>Communication with the Client, Team</h3>
                              <p style={{ color: "#6b7280", fontSize: "0.82rem" }}>Direct coordination with clients and team members.</p>
                            </div>
                          </div>

                          {(() => {
                            // Only the executor actually assigned to THIS lead (a real DB-stored
                            // executor account) can ever see adminToExecutorMessage-style content
                            // relayed through this lead — so the "Executor" recipient must show
                            // that real, named executor and must not appear at all until one is
                            // assigned to this specific lead.
                            const assignedExecutorRoleKey = String(lead?.assignedExecutor || "").trim().toLowerCase();
                            const hasAssignedExecutorForHub = !!assignedExecutorRoleKey;
                            const assignedExecutorLabelForHub = hasAssignedExecutorForHub
                              ? getExecutorLabel(assignedExecutorRoleKey)
                              : "Executor";

                            return (
                          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
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
                              <span>{messageTarget === "user" ? "Client" : messageTarget === "admin" ? "Admin" : (getTargetExecutorLabel(messageTarget) || "Select executor")}</span>
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
                                    { value: "user", label: "Client" },
                                    { value: "admin", label: "Admin" },
                                    // One option per executor account in the DB — the message goes only to the one picked.
                                    ...(Array.isArray(executors) ? executors : []).map((ex) => ({
                                      value: `executor:${ex._id}`,
                                      label: `${ex.name || ex.email} (${String(ex.role || "").toUpperCase()})`,
                                    })),
                                  ].map((opt) => (
                                    <div 
                                      key={opt.value}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setMessageTarget(opt.value);
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
                                        borderBottom: "1px solid rgba(17,24,39,0.04)" 
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

                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            <label style={{ fontSize: "0.75rem", fontWeight: 800, color: "#111111", textTransform: "uppercase", letterSpacing: "0.05em" }}>Message Content</label>
                            <textarea 
                              value={messageDrafts[lead._id] || ""} 
                              onChange={(e) => setMessageDrafts((prev) => ({ ...prev, [lead._id]: e.target.value }))} 
                              placeholder={`Send a message to the ${messageTarget === "user" ? "client" : messageTarget === "admin" ? "admin" : (getTargetExecutorLabel(messageTarget) || "executor")}...`}
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
                              type="button" 
                              onClick={() => handleSendMessage(lead._id, messageDrafts[lead._id], messageTarget)}
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
                          </div>
                            );
                          })()}
                        </PremiumCard>
                      )}
                    </div>
                  </div>
                ) : (
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 60, textAlign: "center" }}>
                    <div style={{ width: 80, height: 80, borderRadius: "50%", background: "rgba(17,24,39,0.04)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24 }}>
                      <Search size={32} color="#9ca3af" />
                    </div>
                    <h3 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#111111", marginBottom: 8 }}>No Service Selected</h3>
                    <p style={{ color: "#6b7280", fontSize: "0.95rem", maxWidth: 320, lineHeight: 1.6 }}>Select a service request from the sidebar to manage documents and coordinate approvals.</p>
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
                      {serviceListModal.status === "pending" ? "Services Pending" : serviceListModal.status === "inProgress" ? "Services In Progress" : "Completed Services"}
                    </h3>
                    <span style={{ background: serviceListModal.status === "pending" ? "#dbeafe" : serviceListModal.status === "inProgress" ? "#fef3c7" : "#dcfce7", color: serviceListModal.status === "pending" ? "#1e40af" : serviceListModal.status === "inProgress" ? "#92400e" : "#166534", fontSize: "0.75rem", fontWeight: 700, padding: "2px 10px", borderRadius: 999 }}>
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
                            <span style={{ fontSize: "0.75rem", fontWeight: 600, padding: "2px 8px", borderRadius: 6, background: "#f3f4f6", color: "#374151", display: "inline-block" }}>
                              {getDisplayStatus ? getDisplayStatus(lead.status, lead) : lead.status}
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
      </div>
    </div>
  );
};

export default PRDashboardModern;
