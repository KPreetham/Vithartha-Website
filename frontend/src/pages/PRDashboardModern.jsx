import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  CheckCircle,
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

const PremiumCard = ({ children, style = {}, className = "" }) => (
  <div
    className={className}
    style={{
      background:
        "linear-gradient(145deg, rgba(18, 20, 34, 0.92) 0%, rgba(11, 13, 24, 0.94) 100%)",
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

const PRDashboardModern = ({
  navigate,
  filteredLeads,
  activeLead,
  selectedLeadId,
  setSelectedLeadId,
  searchQuery,
  setSearchQuery,
  stats,
  formatInr,
  getEffectiveLeadStatus,
  getDisplayStatus,
  getVisibleDocuments,
  handleUpdateLeadStatus,
  handleDocumentStatus,
  handleAssignExecutor,
  handleClearExecutorMessage,
  handleClearUserRejectedMessage,
  handleClearAdminPrMessage,
  handleDeleteService,
  handleFileUpload,
  handleSendDraftToClient,
  handleSendMessage,
  handleRejectDocumentWithMessage,
  handleRejectService,
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
}) => {
  const [documentsOpen, setDocumentsOpen] = React.useState(false);
  const [messageTarget, setMessageTarget] = React.useState("user");
  const draftInputRef = React.useRef(null);
  const finalInputRef = React.useRef(null);

  React.useEffect(() => {
    setDocumentsOpen(false);
  }, [activeLead?._id]);

  const systemPhrases = [
    "status changed",
    "lead assigned to executor",
    "draft accepted",
    "draft sent to client",
    "draft rejected by user",
    "document accepted",
    "document rejected",
    "service updated",
    "executor message removed",
    "user message removed",
    "admin message removed",
    "draft rejected by user: ",
    "rejected by executor",
    "assignment rejected",
    "assignment rejected by executor"
  ];

  const isSystemMessage = (msg) => {
    if (!msg) return false;
    const lower = msg.toLowerCase();
    return systemPhrases.some((phrase) => lower.includes(phrase));
  };

  const lead = activeLead || null;
  const leadStatus = lead ? getEffectiveLeadStatus(lead) : "";
  const serviceRejected = String(lead?.status || "").trim().toLowerCase() === "rejected";
  const isDraftUploading = lead ? uploadingId === `${lead._id}-Draft` : false;
  const isFinalUploading = lead ? uploadingId === `${lead._id}-Final` : false;
  const docs = lead ? getVisibleDocuments(lead) : [];
  const clientDocs = docs.filter((d) => d.type === "Client");
  const draftFinalDocs = docs.filter((d) => ["Draft", "Final"].includes(d.type));
  const uploadedClientDocs = clientDocs.filter((d) => {
    const status = String(d?.status || "").trim().toLowerCase();
    return ["uploaded", "accepted", "verified", "approved", "completed", "reuploaded", "under review"].includes(status) || !!d?.url;
  });
  const hasReuploadedDocs = docs.some(d => d.displayReuploaded);
  const serviceProgressPercent = (() => {
    if (!lead) return 0;
    const status = String(leadStatus || "").trim();
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
      Completed: 100,
    };
    return progressByStatus[status] ?? 0;
  })();
  const uploadedDocumentCount = uploadedClientDocs.length;
  const isDraftApprovedByWorkflow = ["DraftAccepted", "UserAccepted", "Completed"].includes(leadStatus);
  const isFinalApprovedByWorkflow = leadStatus === "Completed";
  const getDraftFinalStatusInfo = (doc) => {
    const docType = String(doc?.type || "").trim();
    const rawStatus = String(doc?.status || "").trim().toLowerCase();
    const draftRejected = String(lead?.status || "").trim().toLowerCase() === "draftrejected";

    if (draftRejected && docType === "Draft") {
      return {
        label: "REJECTED",
        color: "#ef4444",
        bg: "rgba(239,68,68,0.12)",
        border: "rgba(239,68,68,0.2)",
        note: "Rejected by the user and awaiting revision.",
      };
    }

    if (rawStatus === "rejected") {
      return {
        label: "REJECTED",
        color: "#ef4444",
        bg: "rgba(239,68,68,0.12)",
        border: "rgba(239,68,68,0.2)",
        note: doc?.rejectionMessage
          ? `Rejected: ${doc.rejectionMessage}`
          : "Rejected and awaiting user revision.",
      };
    }

    if (docType === "Draft") {
      return isDraftApprovedByWorkflow
        ? {
            label: "APPROVED",
            color: "#10b981",
            bg: "rgba(16,185,129,0.12)",
            border: "rgba(16,185,129,0.2)",
            note: "Approved by the user.",
          }
        : {
            label: "UPLOADED",
            color: "#f59e0b",
            bg: "rgba(245,158,11,0.12)",
            border: "rgba(245,158,11,0.2)",
            note: "Awaiting user approval.",
          };
    }

    if (docType === "Final") {
      return isFinalApprovedByWorkflow
        ? {
            label: "APPROVED",
            color: "#10b981",
            bg: "rgba(16,185,129,0.12)",
            border: "rgba(16,185,129,0.2)",
            note: "Final return completed.",
          }
        : {
            label: "UPLOADED",
            color: "#f59e0b",
            bg: "rgba(245,158,11,0.12)",
            border: "rgba(245,158,11,0.2)",
            note: "Awaiting final user completion.",
          };
    }

    return {
      label: doc?.status || "Waiting Review",
      color: "#f59e0b",
      bg: "rgba(245,158,11,0.12)",
      border: "rgba(245,158,11,0.2)",
      note: "Waiting review.",
    };
  };

  const statusPill = lead
    ? {
        color:
          leadStatus === "Completed"
            ? "#10b981"
            : leadStatus === "DraftSent"
              ? "#8b5cf6"
              : leadStatus === "InformationRequired"
                ? "#f59e0b"
                : leadStatus === "Rejected"
                  ? "#ef4444"
                  : "#22c55e",
        bg:
          leadStatus === "Completed"
            ? "rgba(16,185,129,0.1)"
            : leadStatus === "DraftSent"
              ? "rgba(139,92,246,0.12)"
              : leadStatus === "InformationRequired"
                ? "rgba(245,158,11,0.12)"
                : leadStatus === "Rejected"
                  ? "rgba(239,68,68,0.1)"
                  : "rgba(34,197,94,0.1)",
      }
    : { color: "#9ca3af", bg: "rgba(255,255,255,0.04)" };

  const handleDraftUpload = (type, file) => {
    if (!lead || !file) return;
    handleFileUpload(lead._id, file, type);
  };

  const canAcceptService =
    clientDocs.length > 0 &&
    clientDocs.every((doc) => doc.status === "Accepted");
  const draftReadyToSend = lead?.draftReadyToSend === true;
  const canSendDraftNow = canSendDraftToClient(lead) && draftReadyToSend;

  return (
    <div className="home-page-shell pr-dashboard-shell" style={{ minHeight: "100vh", background: "var(--bg)", color: "#ffffff", paddingTop: "clamp(102px, 12vw, 124px)", paddingBottom: 64, position: "relative", overflow: "hidden" }}>
      <div className="home-page-backdrop" aria-hidden="true" />
      <style>{`
        .pr-dashboard-shell .dashboard-stat-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
          margin-bottom: 18px;
        }
        .pr-dashboard-shell .dashboard-main-grid {
          display: grid;
          grid-template-columns: 360px minmax(0, 1fr);
          gap: 14px;
          align-items: stretch;
        }
        .pr-dashboard-shell .dashboard-sidebar-panel,
        .pr-dashboard-shell .dashboard-details-panel {
          min-height: 560px;
          height: auto;
          display: flex;
          flex-direction: column;
        }
        .pr-dashboard-shell .dashboard-sidebar-scroll,
        .pr-dashboard-shell .dashboard-details-scroll {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          padding-right: 4px;
          margin-right: -4px;
        }
        .pr-dashboard-shell .dashboard-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border-radius: 999px;
          font-size: 0.8rem;
          font-weight: 700;
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
        .pr-dashboard-shell .dashboard-table th,
        .pr-dashboard-shell .dashboard-table td {
          padding: 13px 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          text-align: left;
          vertical-align: top;
        }
        .pr-dashboard-shell .dashboard-table th {
          color: rgba(255, 255, 255, 0.55);
          font-size: 0.8rem;
          font-weight: 700;
        }
        .pr-dashboard-shell .dashboard-table tr:last-child td {
          border-bottom: none;
        }
        .pr-dashboard-shell .dashboard-search::placeholder {
          color: rgba(255, 255, 255, 0.35);
        }
        @media (max-width: 1200px) {
          .pr-dashboard-shell .dashboard-stat-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .pr-dashboard-shell .dashboard-main-grid {
            grid-template-columns: 1fr;
          }
          .pr-dashboard-shell .dashboard-sidebar-panel,
          .pr-dashboard-shell .dashboard-details-panel {
            min-height: 0;
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
      `}</style>

      <div style={{ maxWidth: 1360, margin: "0 auto", padding: "0 1.25rem 0.5rem", position: "relative", zIndex: 1 }}>
        <div style={{ textAlign: "center", marginBottom: 34 }}>
          <h1 style={{ fontSize: "clamp(2.2rem, 4.6vw, 4rem)", fontWeight: 500, letterSpacing: "-0.04em", lineHeight: 1.05, marginBottom: 10, color: "var(--text)" }}>
            PR Dashboard
          </h1>
          <p style={{ maxWidth: 760, margin: "0 auto", color: "var(--text-secondary)", fontSize: "1rem", lineHeight: 1.7 }}>
            Efficiency control for client verifications, executor coordination, document review, and service lifecycle management.
          </p>
        </div>

        <div className="dashboard-stat-grid">
          {[
            { label: "Total Requests", value: stats.total, icon: Users, color: "#22c55e" },
            { label: "Pending Review", value: stats.pending, icon: Clock, color: "#f59e0b" },
            { label: "Completed", value: stats.completed, icon: CheckCircle, color: "#10b981" },
            { label: "Revenue", value: stats.revenue, icon: TrendingUp, color: "#22c55e" },
          ].map((card) => {
            return (
              <PremiumCard
                key={card.label}
                style={{
                  padding: 18,
                  minHeight: 115,
                  borderColor: `${card.color}22`,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontSize: "0.88rem",
                    fontWeight: 700,
                    color: "#f5f5f5",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    marginBottom: 10,
                  }}
                >
                  {card.label}
                </div>
                <div
                  style={{
                    fontSize: "1.9rem",
                    fontWeight: 800,
                    lineHeight: 1,
                    color: "#ffffff",
                  }}
                >
                  {card.value}
                </div>
              </PremiumCard>
            );
          })}
        </div>

        <div className="dashboard-main-grid">
          <PremiumCard className="dashboard-sidebar-panel" style={{ padding: 18 }}>
            <div style={{ marginBottom: 14 }}>
              <h2 style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: 4, color: "#ffffff" }}>All User Services</h2>
              <p style={{ color: "rgba(255,255,255,0.65)", fontSize: "0.82rem" }}>{filteredLeads.length} request{filteredLeads.length === 1 ? "" : "s"}</p>
            </div>

            <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
              <div style={{ position: "relative", flex: 1 }}>
                <Search size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.45)" }} />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search services..."
                  className="dashboard-search"
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
            </div>

            <div className="dashboard-sidebar-scroll" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {filteredLeads.length > 0 ? (
                filteredLeads.map((item, index) => {
                  const selected = item._id === activeLead?._id;
                  const pricing = getServicePricing(item?.serviceName);
                  const itemStatus = getEffectiveLeadStatus(item);
                  const statusLabel = getDisplayStatus(itemStatus, item);
                  const itemPill = {
                    color:
                      itemStatus === "Completed"
                        ? "#10b981"
                        : itemStatus === "DraftSent"
                          ? "#8b5cf6"
                          : itemStatus === "InformationRequired"
                            ? "#f59e0b"
                            : itemStatus === "Rejected"
                              ? "#ef4444"
                              : "#22c55e",
                    bg:
                      itemStatus === "Completed"
                        ? "rgba(16,185,129,0.1)"
                        : itemStatus === "DraftSent"
                          ? "rgba(139,92,246,0.12)"
                          : itemStatus === "InformationRequired"
                            ? "rgba(245,158,11,0.12)"
                            : itemStatus === "Rejected"
                              ? "rgba(239,68,68,0.1)"
                              : "rgba(34,197,94,0.1)",
                  };
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
                      style={{
                        textAlign: "left",
                        width: "100%",
                        padding: "16px 16px 16px 18px",
                        borderRadius: 16,
                        border: selected ? "1px solid rgba(34,197,94,0.75)" : "1px solid rgba(255,255,255,0.06)",
                        background: selected ? "rgba(16,185,129,0.08)" : "rgba(255,255,255,0.03)",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 6 }}>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontSize: "0.98rem", fontWeight: 700, marginBottom: 4, whiteSpace: "normal", lineHeight: 1.25 }}>{item.serviceName}</div>
                            <div style={{ color: "rgba(255,255,255,0.65)", fontSize: "0.8rem" }}>{item.name} • {item.email}</div>
                          </div>
                          <span className="dashboard-pill" style={{ color: itemPill.color, background: itemPill.bg, border: `1px solid ${itemPill.color}33`, flexShrink: 0 }}>
                            {itemStatus === "Completed" ? <CheckCircle size={14} /> : <span className="dot" />}
                            {statusLabel}
                          </span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                          <span style={{ color: "rgba(255,255,255,0.65)", fontSize: "0.86rem" }}>{formatInr(pricing.amount)}</span>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 12px", borderRadius: 999, fontSize: "0.78rem", fontWeight: 700, color: "#fbbf24", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.15)" }}>
                              <FileText size={14} />
                              {item.documents?.length || 0} Docs
                            </span>
                            <button type="button" onClick={(e) => { e.stopPropagation(); handleDeleteService(item, e); }} title="Remove service" style={{ width: 28, height: 28, borderRadius: 999, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.55)", display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                <div style={{ padding: "28px 16px", textAlign: "center", color: "rgba(255,255,255,0.65)" }}>No requests in pipeline.</div>
              )}
            </div>
          </PremiumCard>

          <PremiumCard className="dashboard-details-panel" style={{ padding: 22 }}>
            {lead ? (
              <div className="dashboard-details-scroll" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 18, flexWrap: "wrap" }}>
                  <div style={{ minWidth: 0 }}>
                    <h2 style={{ fontSize: "1.45rem", fontWeight: 700, marginBottom: 8, color: "#ffffff" }}>{lead.serviceName}</h2>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 14, color: "rgba(255,255,255,0.65)", fontSize: "0.84rem" }}>
                      <span>{lead.name}</span>
                      <span>{lead.email}</span>
                      <span>Order ID: #{String(lead._id || "").slice(-6).toUpperCase()}</span>
                      <span>Fee <strong style={{ color: "#34d399", marginLeft: 8 }}>{formatInr(getServicePricing(lead?.serviceName).amount)}</strong></span>
                    </div>
                  </div>
                  <span className="dashboard-pill" style={{ color: statusPill.color, background: statusPill.bg, border: `1px solid ${statusPill.color}33` }}>
                    {leadStatus === "Completed" ? <CheckCircle size={14} /> : <span className="dot" />}
                    {getDisplayStatus(leadStatus, lead)}
                  </span>
                </div>

                <PremiumCard style={{ padding: 16, borderRadius: 18 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1.35fr auto", gap: 14, alignItems: "center" }}>
                    <div>
                      <div style={{ color: "rgba(255,255,255,0.65)", fontSize: "0.82rem", marginBottom: 8 }}>Service Progress</div>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                        <span style={{ fontSize: "1.55rem", fontWeight: 800 }}>{uploadedDocumentCount} / {clientDocs.length || 0}</span>
                        <span style={{ color: "rgba(255,255,255,0.65)", fontSize: "0.88rem" }}>uploaded</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <div style={{ width: "100%", height: 10, background: "rgba(255,255,255,0.05)", borderRadius: 999, overflow: "hidden" }}>
                        <div style={{ width: `${serviceProgressPercent}%`, height: "100%", borderRadius: 999, background: "linear-gradient(90deg, #22c55e, #14b8a6)" }} />
                      </div>
                    </div>
                    <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "#e5e7eb" }}>{Math.round(serviceProgressPercent)}%</div>
                  </div>
                </PremiumCard>

                {lead.adminToPrMessage && !isSystemMessage(lead.adminToPrMessage) && (
                  <div style={{ padding: 16, borderRadius: 18, border: "1px solid rgba(16,185,129,0.22)", background: "rgba(16,185,129,0.05)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 8, color: "#34d399" }}>
                      <strong style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><MessageSquare size={16} /> Message from Admin</strong>
                      <button type="button" onClick={(e) => handleClearAdminPrMessage(lead._id, e)} style={{ width: 26, height: 26, borderRadius: 999, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "inherit", cursor: "pointer" }}>×</button>
                    </div>
                    <div style={{ color: "#ffffff", fontSize: "0.95rem", fontStyle: "italic" }}>{lead.adminToPrMessage}</div>
                  </div>
                )}

                {lead.userMessage && String(lead.userMessage || "").trim() && !isSystemMessage(lead.userMessage) && (
                  <div style={{ padding: 16, borderRadius: 18, border: "1px solid rgba(239,68,68,0.22)", background: "rgba(239,68,68,0.05)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 8, color: "#fb7185" }}>
                      <strong style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><AlertCircle size={16} /> Message from User</strong>
                      <button type="button" onClick={(e) => handleClearUserRejectedMessage(lead._id, e)} style={{ width: 26, height: 26, borderRadius: 999, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "inherit", cursor: "pointer" }}>×</button>
                    </div>
                    <div style={{ color: "#ffffff", fontSize: "0.95rem" }}>{lead.userMessage}</div>
                  </div>
                )}

                <div style={{ display: "grid", gap: 18 }}>
                  <PremiumCard style={{ padding: 0, overflow: "hidden" }}>
                    <div 
                      onClick={() => setDocumentsOpen((prev) => !prev)} 
                      style={{ width: "100%", padding: "14px 16px", background: "transparent", color: "inherit", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, textAlign: "left", borderBottom: documentsOpen ? "1px solid rgba(255,255,255,0.06)" : "none", userSelect: "none" }}
                    >
                      <div>
                        <h3 style={{ fontSize: "0.98rem", fontWeight: 600, marginBottom: 3, color: "#ffffff" }}>Client Files</h3>
                        <p style={{ color: "rgba(255,255,255,0.65)", fontSize: "0.8rem" }}>Accept or reject uploaded client documents.</p>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <span style={{ color: "rgba(255,255,255,0.65)", fontSize: "0.8rem" }}>{uploadedDocumentCount} / {clientDocs.length || 0} uploaded</span>
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
                                  <th style={{ width: "54%" }}>Document</th>
                                  <th>Status</th>
                                  <th style={{ width: 220, textAlign: "right" }}>Action</th>
                                </tr>
                              </thead>
                              <tbody>
                              {clientDocs.length > 0 ? (
                                clientDocs.map((doc) => {
                                  const docKey = `${lead._id}:${doc._id}`;
                                  const isDraftDocument = String(doc?.type || "").trim().toLowerCase() === "draft";
                                  const draftRejected = String(lead?.status || "").trim().toLowerCase() === "draftrejected";
                                  const isReuploaded = !serviceRejected && doc.displayReuploaded;
                                  const actualStatus = String(doc.status || "").trim().toLowerCase();
                                  const isReuploadPending =
                                    isReuploaded &&
                                    !["accepted", "rejected"].includes(actualStatus);
                                  const docStatus = serviceRejected
                                    ? "Rejected"
                                    : draftRejected && isDraftDocument
                                      ? "Rejected"
                                    : ["accepted", "rejected"].includes(actualStatus)
                                      ? doc.status
                                      : isReuploadPending
                                        ? "Under Review"
                                        : String(doc.status || "Waiting Review");
                                  const showReviewActions =
                                    ["Open", "PendingReview", "InformationRequired", "Rejected"].includes(lead.status) &&
                                    (!serviceRejected || docStatus !== "Rejected");
                                  return (
                                    <React.Fragment key={doc._id}>
                                      <tr>
                                        <td>
                                          <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                                              <FileText size={18} color={docStatus === "Accepted" ? "#22c55e" : docStatus === "Rejected" ? "#ef4444" : "#fbbf24"} style={{ flexShrink: 0 }} />
                                              <div style={{ minWidth: 0 }}>
                                                <div style={{ fontSize: "0.92rem", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{doc.name}</div>
                                                {isReuploaded && <div style={{ marginTop: 4, color: "#38bdf8", fontSize: "0.76rem", fontWeight: 700 }}>Reuploaded</div>}
                                              </div>
                                            </div>
                                          </td>
                                          <td>
                                            <span style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 999, color: docStatus === "Accepted" ? "#22c55e" : docStatus === "Rejected" ? "#ef4444" : "#fbbf24", background: docStatus === "Accepted" ? "rgba(34,197,94,0.12)" : docStatus === "Rejected" ? "rgba(239,68,68,0.12)" : "rgba(245,158,11,0.12)", border: `1px solid ${docStatus === "Accepted" ? "rgba(34,197,94,0.2)" : docStatus === "Rejected" ? "rgba(239,68,68,0.2)" : "rgba(245,158,11,0.2)"}`, fontSize: "0.8rem", fontWeight: 700, whiteSpace: "nowrap" }}>
                                              <span className="dot" />
                                              {docStatus}
                                            </span>
                                          </td>
                                          <td style={{ textAlign: "right" }}>
                                              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, alignItems: "center" }}>
                                                <button 
                                                  type="button" 
                                                  onClick={() => viewDocument(doc.publicId, doc.url, lead._id)} 
                                                  style={{ 
                                                    height: 38,
                                                    padding: "0 12px",
                                                    borderRadius: 10, 
                                                    border: "1px solid rgba(255,255,255,0.08)", 
                                                    background: "rgba(255,255,255,0.03)", 
                                                    color: "#e2e8f0", 
                                                    display: "inline-flex", 
                                                    alignItems: "center", 
                                                    justifyContent: "center", 
                                                    gap: 8,
                                                    cursor: "pointer",
                                                    fontSize: "0.75rem",
                                                    fontWeight: 700
                                                  }} 
                                                  title="View"
                                                  >
                                                    VIEW <Eye size={14} />
                                                  </button>
                                                
                                                {((serviceRejected || draftRejected) && !isReuploaded && actualStatus === "rejected") ? (
                                                  <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#ef4444", fontSize: "0.75rem", fontWeight: 800, padding: "0 10px" }}>
                                                    <X size={18} strokeWidth={3} /> REJECTED
                                                  </div>
                                                ) : String(docStatus || "").toLowerCase() === "accepted" ? (
                                                  <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#10b981", fontSize: "0.75rem", fontWeight: 800, padding: "0 10px" }}>
                                                    <CheckCircle size={18} /> ACCEPTED
                                                  </div>
                                                ) : String(docStatus || "").toLowerCase() === "rejected" ? (
                                                  <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#ef4444", fontSize: "0.75rem", fontWeight: 800, padding: "0 10px" }}>
                                                    <X size={18} strokeWidth={3} /> REJECTED
                                                  </div>
                                                ) : showReviewActions ? (
                                                  <>
                                                    <button 
                                                      type="button" 
                                                      onClick={() => handleDocumentStatus(lead._id, doc._id, "Accepted")} 
                                                      style={{ 
                                                        height: 38,
                                                        padding: "0 14px", 
                                                        borderRadius: 10, 
                                                        border: "1px solid rgba(16,185,129,0.3)", 
                                                        background: "rgba(16,185,129,0.05)", 
                                                        color: "#10b981", 
                                                        fontWeight: 800, 
                                                        cursor: "pointer", 
                                                        fontSize: "0.75rem" 
                                                      }}
                                                    >
                                                      ACCEPT
                                                    </button>
                                                    
                                                    <button 
                                                      type="button" 
                                                      onClick={() => openDocRejectForm(lead._id, doc)} 
                                                      style={{ 
                                                        height: 38,
                                                        padding: "0 14px", 
                                                        borderRadius: 10, 
                                                        border: "1px solid rgba(239,68,68,0.35)", 
                                                        background: "rgba(239,68,68,0.12)", 
                                                        color: "#fff", 
                                                        fontWeight: 800, 
                                                        cursor: "pointer", 
                                                        fontSize: "0.75rem" 
                                                      }}
                                                    >
                                                      REJECT
                                                    </button>
                                                  </>
                                                ) : null}
                                              </div>
                                          </td>
                                        </tr>
                                        {rejectingDocKey === docKey && (
                                          <tr>
                                            <td colSpan={3}>
                                              <div style={{ marginTop: 8, padding: 14, borderRadius: 14, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)" }}>
                                                <div style={{ fontSize: "0.72rem", fontWeight: 800, color: "#ef4444", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Send Rejection Message to Client</div>
                                                <textarea value={docRejectDrafts[docKey] || ""} onChange={(e) => setDocRejectDrafts((prev) => ({ ...prev, [docKey]: e.target.value }))} rows={3} placeholder={`Explain why ${doc.name} was rejected...`} style={{ width: "100%", resize: "vertical", borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(0,0,0,0.25)", color: "#fff", padding: "0.8rem", outline: "none", fontSize: "0.85rem" }} />
                                                <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
                                                  <button type="button" onClick={() => handleRejectDocumentWithMessage(lead._id, doc)} style={{ padding: "0.7rem 1rem", borderRadius: 10, border: "none", background: "#ef4444", color: "#fff", fontSize: "0.78rem", fontWeight: 800, cursor: "pointer" }}>Reject and Notify Client</button>
                                                  <button type="button" onClick={() => setRejectingDocKey(null)} style={{ padding: "0.7rem 1rem", borderRadius: 10, border: "1px solid rgba(255,255,255,0.2)", background: "transparent", color: "var(--text-secondary)", fontSize: "0.78rem", fontWeight: 700, cursor: "pointer" }}>Cancel</button>
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
                                    <td colSpan={3} style={{ color: "rgba(255,255,255,0.65)", textAlign: "center", padding: "24px 20px" }}>No client documents uploaded yet.</td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </PremiumCard>

                    <PremiumCard style={{ padding: 16 }}>
                      {draftFinalDocs.length > 0 && (
                        <div style={{ marginBottom: 24, padding: 16, background: "rgba(16,185,129,0.02)", border: "1px solid rgba(16,185,129,0.1)", borderRadius: 16 }}>
                          <div style={{ fontSize: "0.9rem", color: "#ffffff", display: "flex", alignItems: "center", gap: 8, marginBottom: 12, fontWeight: 600 }}>
                            <FileText size={16} color="#22c55e" /> Draft & Final Files
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            {draftFinalDocs.map((doc) => (
                              (() => {
                                const statusInfo = getDraftFinalStatusInfo(doc);

                                return (
                              <div key={doc._id} style={{ padding: "14px 16px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                                <div style={{ overflow: "hidden", flex: 1 }}>
                                  <p style={{ fontSize: "0.92rem", fontWeight: 700, color: "#fff", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", margin: 0 }}>{doc.name}</p>
                                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                                    <span style={{ fontSize: "0.7rem", fontWeight: 800, textTransform: "uppercase", color: doc.type === "Draft" ? "#8b5cf6" : "#10b981", background: doc.type === "Draft" ? "rgba(139,92,246,0.12)" : "rgba(16,185,129,0.12)", borderRadius: 999, padding: "3px 8px" }}>{doc.type}</span>
                                    <span style={{ fontSize: "0.7rem", fontWeight: 800, textTransform: "uppercase", color: statusInfo.color }}>{statusInfo.label}</span>
                                  </div>
                                  <div style={{ marginTop: 8, fontSize: "0.76rem", color: "rgba(255,255,255,0.65)" }}>{statusInfo.note}</div>
                                </div>
                                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                                  <button 
                                    type="button" 
                                    onClick={() => viewDocument(doc.publicId, doc.url, lead._id)} 
                                    title="View Document" 
                                    style={{ 
                                      height: 38,
                                      padding: "0 12px",
                                      background: "rgba(255,255,255,0.04)", 
                                      border: "1px solid rgba(255,255,255,0.08)", 
                                      color: "var(--text-secondary)", 
                                      cursor: "pointer", 
                                      borderRadius: 10, 
                                      display: "flex", 
                                      alignItems: "center", 
                                      justifyContent: "center", 
                                      gap: 8, 
                                      fontSize: "0.75rem", 
                                      fontWeight: 700 
                                    }}
                                  >
                                    <Eye size={16} /> VIEW
                                  </button>
                                  <div style={{ display: "flex", alignItems: "center", gap: 6, color: statusInfo.color, fontSize: "0.75rem", fontWeight: 800, padding: "0 10px" }}>
                                    {statusInfo.label === "APPROVED" ? <CheckCircle size={18} /> : <Clock size={18} />}
                                    {statusInfo.label}
                                  </div>
                                </div>
                              </div>
                                );
                              })()
                            ))}
                          </div>
                        </div>
                      )}

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
                        <div>
                          <div style={{ fontSize: "0.88rem", fontWeight: 600, marginBottom: 4 }}>Workflow Controls</div>
                        <div style={{ color: "rgba(255,255,255,0.65)", fontSize: "0.8rem" }}>Accept the service only after every client document is approved, then manage drafts from one panel.</div>
                      </div>
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                        {["PR_Accepted", "AssignedToExecutor", "InProgress", "ExecutionFinished", "DraftSent", "DraftAccepted", "UserAccepted", "Completed"].includes(lead.status) ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#10b981", fontSize: "1rem", fontWeight: 800, padding: "8px 16px", background: "rgba(16,185,129,0.1)", borderRadius: 12, border: "1px solid rgba(16,185,129,0.2)" }}>
                            <CheckCircle size={20} /> SERVICE ACCEPTED
                          </div>
                        ) : (lead.status === "Rejected" && !hasReuploadedDocs) ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#ef4444", fontSize: "1rem", fontWeight: 800, padding: "8px 16px", background: "rgba(239,68,68,0.1)", borderRadius: 12, border: "1px solid rgba(239,68,68,0.2)" }}>
                            <X size={20} strokeWidth={3} /> SERVICE REJECTED
                          </div>
                        ) : (
                          <>
                          <button 
                            type="button" 
                            onClick={() => handleUpdateLeadStatus(lead._id, "PR_Accepted")} 
                            disabled={!canAcceptService}
                            style={{ 
                              padding: "0.75rem 0.95rem", 
                              borderRadius: 12, 
                              border: "none", 
                              background: canAcceptService ? "#10b981" : "rgba(255,255,255,0.05)", 
                              color: canAcceptService ? "#fff" : "rgba(255,255,255,0.25)", 
                              fontWeight: 800, 
                              cursor: canAcceptService ? "pointer" : "not-allowed",
                              opacity: canAcceptService ? 1 : 0.6
                            }}
                          >
                            Accept Service
                          </button>
                            <button 
                              type="button" 
                              onClick={() => openRejectForm(lead._id)} 
                              style={{ padding: "0.75rem 0.95rem", borderRadius: 12, border: "1px solid rgba(239,68,68,0.25)", background: "rgba(239,68,68,0.08)", color: "#fb7185", fontWeight: 800, cursor: "pointer" }}
                            >
                              Reject Service
                            </button>
                          </>
                        )}
                      </div>
                      {!canAcceptService && (
                        <div style={{ marginTop: 12, padding: "8px 14px", borderRadius: 10, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", color: "#f59e0b", fontSize: "0.78rem", fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
                          <AlertCircle size={14} /> Accept all client documents to enable service approval.
                        </div>
                      )}
                    </div>

                    {rejectingLeadId === lead._id && (
                      <div style={{ marginTop: 12, padding: 14, borderRadius: 14, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)" }}>
                        <div style={{ fontSize: "0.72rem", fontWeight: 800, color: "#ef4444", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Send Rejection Message to User</div>
                        <textarea value={rejectDrafts[lead._id] || ""} onChange={(e) => setRejectDrafts((prev) => ({ ...prev, [lead._id]: e.target.value }))} rows={3} placeholder="Explain clearly why this service is rejected..." style={{ width: "100%", resize: "vertical", borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(0,0,0,0.25)", color: "#fff", padding: "0.8rem", outline: "none", fontSize: "0.85rem" }} />
                        <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
                          <button type="button" onClick={() => handleRejectService(lead._id)} style={{ padding: "0.7rem 1rem", borderRadius: 10, border: "none", background: "#ef4444", color: "#fff", fontSize: "0.78rem", fontWeight: 800, cursor: "pointer" }}>Reject Service and Notify User</button>
                          <button type="button" onClick={() => setRejectingLeadId(null)} style={{ padding: "0.7rem 1rem", borderRadius: 10, border: "1px solid rgba(255,255,255,0.2)", background: "transparent", color: "var(--text-secondary)", fontSize: "0.78rem", fontWeight: 700, cursor: "pointer" }}>Cancel</button>
                        </div>
                      </div>
                    )}

                    {lead.adminToPrMessage && (
                      <div style={{ marginTop: 14, padding: 14, background: "rgba(16,185,129,0.05)", border: "1px dashed rgba(16,185,129,0.3)", borderRadius: 16, color: "#34d399" }}>
                        <div style={{ fontSize: "0.7rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><MessageSquare size={14} /> Message from Admin</span>
                          <button type="button" onClick={(e) => handleClearAdminPrMessage(lead._id, e)} style={{ border: "1px solid rgba(239,68,68,0.35)", background: "rgba(239,68,68,0.18)", color: "#fff", width: 24, height: 24, borderRadius: 999, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><X size={14} strokeWidth={2.8} /></button>
                        </div>
                        <p style={{ margin: 0, fontStyle: "italic" }}>{lead.adminToPrMessage}</p>
                      </div>
                    )}

                    {leadStatus === "DraftRejected" && String(lead.userMessage || "").trim() && (
                      <div style={{ marginTop: 14, padding: 14, borderRadius: 14, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.22)", color: "#fecaca" }}>
                        <div style={{ fontSize: "0.7rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                          <span>Message from User</span>
                          <button type="button" onClick={(e) => handleClearUserRejectedMessage(lead._id, e)} style={{ border: "1px solid rgba(239,68,68,0.35)", background: "rgba(239,68,68,0.18)", color: "#fff", width: 24, height: 24, borderRadius: 999, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><X size={14} strokeWidth={2.8} /></button>
                        </div>
                        <p style={{ margin: 0 }}>{lead.userMessage}</p>
                      </div>
                    )}

                    {["InProgress", "ExecutionFinished", "DraftSent", "DraftRejected", "DraftAccepted", "UserAccepted"].includes(lead.status) && (
                      <div style={{ marginTop: 16, padding: 16, background: "rgba(16,185,129,0.02)", border: "1px solid rgba(16,185,129,0.1)", borderRadius: 16 }}>
                        <div style={{ fontSize: "0.7rem", fontWeight: 900, color: "#10b981", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>Draft & Completion Management</div>

                        {(lead.status === "DraftAccepted" || lead.status === "UserAccepted") ? (
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                            <input ref={finalInputRef} type="file" accept=".pdf" hidden onChange={(e) => handleDraftUpload("Final", e.target.files?.[0])} />
                            <button type="button" onClick={() => finalInputRef.current?.click()} style={{ padding: "1rem", borderRadius: 14, background: "rgba(255,255,255,0.04)", color: "#fff", border: "1px solid rgba(255,255,255,0.1)", fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, cursor: "pointer" }}>
                              {isFinalUploading ? (
                                <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                                  <Loader2 size={18} className="animate-spin" /> UPLOADING...
                                </span>
                              ) : (
                                <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                                  <Upload size={18} /> UPLOAD FINAL
                                </span>
                              )}
                            </button>
                            <button type="button" disabled={!draftFinalDocs.some((d) => d.type === "Final")} onClick={() => handleUpdateLeadStatus(lead._id, "Completed")} style={{ padding: "1rem", borderRadius: 14, background: "#10b981", color: "#fff", border: "none", fontWeight: 800, cursor: "pointer", opacity: draftFinalDocs.some((d) => d.type === "Final") ? 1 : 0.3 }}>MARK COMPLETED</button>
                          </div>
                        ) : (
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                            <input ref={draftInputRef} type="file" accept=".pdf" hidden onChange={(e) => handleDraftUpload("Draft", e.target.files?.[0])} />
                            <button type="button" disabled={!canManageDraftForLead(lead)} onClick={() => draftInputRef.current?.click()} style={{ padding: "1rem", borderRadius: 14, background: canManageDraftForLead(lead) ? "rgba(67,97,238,0.1)" : "rgba(255,255,255,0.02)", color: canManageDraftForLead(lead) ? "#4361ee" : "rgba(255,255,255,0.2)", border: "1px solid rgba(67,97,238,0.2)", fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, cursor: canManageDraftForLead(lead) ? "pointer" : "not-allowed" }}>
                              {isDraftUploading ? (
                                <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                                  <Loader2 size={18} className="animate-spin" /> UPLOADING...
                                </span>
                              ) : (
                                <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                                  <Upload size={18} /> UPLOAD DRAFT
                                </span>
                              )}
                            </button>
                            <button type="button" disabled={!canSendDraftNow} onClick={() => handleSendDraftToClient(lead._id)} style={{ padding: "1rem", borderRadius: 14, background: canSendDraftNow ? "#10b981" : "rgba(255,255,255,0.02)", color: canSendDraftNow ? "#fff" : "rgba(255,255,255,0.2)", border: "none", fontWeight: 800, cursor: canSendDraftNow ? "pointer" : "not-allowed" }}>SEND DRAFT TO CLIENT</button>
                            {lead.status === "ExecutionFinished" && (
                              <div style={{ gridColumn: "span 2", padding: 12, background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 12, fontSize: "0.8rem", color: "#10b981", fontWeight: 800, textAlign: "center" }}>Executor has finished work. Review and Send to Client.</div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {["Open", "PendingReview", "InformationRequired", "PR_Accepted", "AssignedToExecutor"].includes(lead.status) && (
                      <div style={{ marginTop: 16, padding: "1.2rem 1.4rem", background: "rgba(245, 158, 11, 0.05)", border: "1px solid rgba(245, 158, 11, 0.18)", borderRadius: 16, color: "#f59e0b", fontSize: "0.78rem", fontWeight: 700, textAlign: "center" }}>
                        Draft controls will appear after the executor accepts this service.
                      </div>
                    )}

                    <div style={{ marginTop: 16, padding: 16, background: "rgba(255,255,255,0.02)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.05)" }}>
                      <div style={{ fontSize: "0.65rem", fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 12 }}>Communicate</div>
                      <div style={{ display: "grid", gridTemplateColumns: "120px 1fr auto", gap: 10 }}>
                        <select 
                          value={messageTarget}
                          onChange={(e) => setMessageTarget(e.target.value)}
                          style={{
                            padding: "0.8rem",
                            borderRadius: 12,
                            background: "rgba(0,0,0,0.3)",
                            color: "#fff",
                            border: "1px solid rgba(255,255,255,0.1)",
                            outline: "none",
                            fontSize: "0.8rem",
                            fontWeight: 700,
                            cursor: "pointer"
                          }}
                        >
                          <option value="user" style={{ background: "#1a1b23" }}>User</option>
                          <option value="admin" style={{ background: "#1a1b23" }}>Admin</option>
                          <option value="executor" style={{ background: "#1a1b23" }}>Executor</option>
                        </select>
                        <input 
                          placeholder={`Message to ${messageTarget}...`} 
                          value={messageDrafts[lead._id] || ""} 
                          onChange={(e) => setMessageDrafts({ ...messageDrafts, [lead._id]: e.target.value })} 
                          style={{ flex: 1, padding: "1rem", borderRadius: 12, background: "rgba(0,0,0,0.2)", color: "#fff", border: "1px solid rgba(255,255,255,0.1)", outline: "none", fontSize: "0.85rem" }} 
                        />
                        <button 
                          type="button" 
                          onClick={() => handleSendMessage(lead._id, messageDrafts[lead._id], messageTarget)} 
                          style={{ width: 50, height: 50, borderRadius: 12, background: "#4361ee", color: "#fff", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                        >
                          <Send size={18} />
                        </button>
                      </div>
                    </div>

                  </PremiumCard>
                </div>
              </div>
            ) : (
              <div style={{ display: "grid", placeItems: "center", minHeight: 320, color: "rgba(255,255,255,0.65)" }}>No requests in pipeline.</div>
            )}
          </PremiumCard>
        </div>

        <ConfirmationModal
          isOpen={deleteConfirm.isOpen}
          title="Remove Service"
          message={`Are you sure you want to remove ${deleteConfirm.lead?.serviceName || "this service"}? It will be hidden from the dashboard.`}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteConfirm({ isOpen: false, lead: null, isLoading: false })}
          isLoading={deleteConfirm.isLoading}
        />
      </div>
    </div>
  );
};

export default PRDashboardModern;
