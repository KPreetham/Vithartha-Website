import React from "react";
import { motion } from "framer-motion";
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
} from "lucide-react";
import ConfirmationModal from "../components/ConfirmationModal";
import { viewDocument } from "../utils/documentViewer";
import { normalizeRole } from "../utils/roleRouting";

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

const AdminDashboardModern = ({
  navigate,
  filteredLeads,
  activeLead,
  setSelectedLeadId,
  searchQuery,
  setSearchQuery,
  stats,
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
  handleDeleteExecutorMessage,
  handleDeleteAdminMessage,
  messageTarget,
  setMessageTarget,
  messageText,
  setMessageText,
  getMessageTextByTarget,
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
}) => {
  const [documentsOpen, setDocumentsOpen] = React.useState(false);
  const [uploadType, setUploadType] = React.useState("Draft");
  const uploadInputRef = React.useRef(null);

  React.useEffect(() => {
    setDocumentsOpen(false);
  }, [activeLead?._id]);

  const currentUser = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("user") || "{}") : {};
  const isUserRole = normalizeRole(currentUser.role) === "user";

  const systemPhrases = ["status changed", "lead assigned", "draft accepted", "draft sent", "draft rejected", "document accepted", "document rejected", "service updated", "rejected by executor", "assignment rejected"];
  const isSystemMessage = (msg) => {
    if (!msg) return false;
    const lower = msg.toLowerCase();
    return systemPhrases.some(p => lower.includes(p));
  };

  const documents = activeLead ? getVisibleDocuments(activeLead) : [];
  const uploadedDocs = documents.filter((doc) => {
    const status = String(doc?.status || "").trim().toLowerCase();
    return ["uploaded", "accepted", "verified", "approved", "completed", "reuploaded"].includes(status) || !!doc?.url;
  });
  const rejectedDocs = documents.filter((doc) => String(doc?.status || "").toLowerCase() === "rejected");
  const reviewSummary = activeLead ? getServiceReviewSummary(activeLead) : "";
  const serviceOutcomeLabel = activeLead ? getServiceOutcomeLabel(activeLead) : "";
  const topRightStatusLabel = serviceOutcomeLabel.startsWith("Rejected")
    ? serviceOutcomeLabel.split(":")[0]
    : serviceOutcomeLabel;
  const getServiceProgressPercent = (lead) => {
    if (!lead) return 0;

    if (isExecutorRejectedState(lead)) return 20;
    if (isDetailsMissingState(lead)) return 20;

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
      Completed: 100,
    };

    return progressByStatus[status] ?? 0;
  };
  const serviceProgressPercent = getServiceProgressPercent(activeLead);
  const uploadedDocumentCount = uploadedDocs.length;
  const serviceProgressMessage = !activeLead
    ? "No service selected."
    : activeLead.status === "Completed"
      ? "Fulfillment complete. All requirements have been met."
      : serviceOutcomeLabel.startsWith("Rejected")
        ? `${serviceOutcomeLabel}.`
      : isDetailsMissingState(activeLead)
        ? "Action required! Please review missing or rejected documents."
        : {
            Open: "Pending verification and initial review.",
            PendingReview: "Documents are being reviewed by PR.",
            InformationRequired: "Additional information is required.",
            PR_Accepted: "Documents verified. Awaiting executor assignment.",
            AssignedToExecutor: "Executor assigned. Service is starting.",
            InProgress: "Executor is currently working on the service.",
            ExecutionFinished: "Execution finished. Undergoing quality review.",
            DraftSent: "Draft is awaiting user approval.",
            DraftAccepted: "Draft approved. Waiting for final completion.",
            UserAccepted: "Draft approved. Waiting for final completion.",
            DraftRejected: "Draft rejected. Waiting for revision.",
            Rejected: "Service has been rejected.",
          }[String(activeLead.status || "").trim()] || "Service is in progress.";

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

  return (
    <div className="home-page-shell admin-dashboard-shell" style={{ minHeight: "100vh", background: "var(--bg)", color: "#ffffff", paddingTop: "clamp(102px, 12vw, 124px)", paddingBottom: 64, position: "relative", overflow: "hidden" }}>
      <div className="home-page-backdrop" aria-hidden="true" />
      <style>{`
        .admin-dashboard-shell .dashboard-stat-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
          margin-bottom: 18px;
        }
        .admin-dashboard-shell .dashboard-main-grid {
          display: grid;
          grid-template-columns: 360px minmax(0, 1fr);
          gap: 14px;
          align-items: stretch;
        }
        .admin-dashboard-shell .dashboard-sidebar-panel,
        .admin-dashboard-shell .dashboard-details-panel {
          min-height: 560px;
          height: auto;
          display: flex;
          flex-direction: column;
        }
        .admin-dashboard-shell .dashboard-sidebar-scroll,
        .admin-dashboard-shell .dashboard-details-scroll {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          padding-right: 4px;
          margin-right: -4px;
        }
        .admin-dashboard-shell .dashboard-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border-radius: 999px;
          font-size: 0.8rem;
          font-weight: 700;
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
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          text-align: left;
          vertical-align: top;
        }
        .admin-dashboard-shell .dashboard-table th {
          color: rgba(255, 255, 255, 0.55);
          font-size: 0.8rem;
          font-weight: 700;
        }
        .admin-dashboard-shell .dashboard-table tr:last-child td {
          border-bottom: none;
        }
        .admin-dashboard-shell .dashboard-search::placeholder {
          color: rgba(255, 255, 255, 0.35);
        }
        @media (max-width: 1200px) {
          .admin-dashboard-shell .dashboard-stat-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .admin-dashboard-shell .dashboard-main-grid {
            grid-template-columns: 1fr;
          }
          .admin-dashboard-shell .dashboard-sidebar-panel,
          .admin-dashboard-shell .dashboard-details-panel {
            min-height: 0;
            height: auto;
          }
        }
        @media (max-width: 768px) {
          .admin-dashboard-shell .dashboard-stat-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
          }
          .admin-dashboard-shell .dashboard-table th,
          .admin-dashboard-shell .dashboard-table td {
            padding: 10px 8px;
            font-size: 0.85rem;
          }
          .admin-dashboard-shell .dashboard-table th:nth-child(2),
          .admin-dashboard-shell .dashboard-table td:nth-child(2) {
            display: none; /* Hide status on tablet/mobile to save space */
          }
        }
        @media (max-width: 640px) {
          .admin-dashboard-shell .dashboard-stat-grid {
            grid-template-columns: 1fr;
          }
          .admin-dashboard-shell .dashboard-details-panel {
            padding: 16px !important;
          }
          .admin-dashboard-shell .responsive-form-grid {
            grid-template-columns: 1fr !important;
          }
          .admin-dashboard-shell .responsive-progress-grid {
            grid-template-columns: 1fr !important;
            text-align: center;
          }
          .admin-dashboard-shell .responsive-progress-grid div:last-child {
            display: none; /* Hide % text if needed or center it */
          }
        }
        @media (max-width: 480px) {
          .admin-dashboard-shell {
            padding-top: 90px !important;
          }
          .admin-dashboard-shell .dashboard-sidebar-panel,
          .admin-dashboard-shell .dashboard-details-panel {
            border-radius: 18px !important;
          }
        }
      `}</style>

      <div style={{ maxWidth: 1360, margin: "0 auto", padding: "0 1.25rem 0.5rem", position: "relative", zIndex: 1 }}>
        <div style={{ textAlign: "center", marginBottom: 34 }}>
          <h1 style={{ fontSize: "clamp(2.2rem, 4.6vw, 4rem)", fontWeight: 500, letterSpacing: "-0.04em", lineHeight: 1.05, marginBottom: 10, color: "var(--text)" }}>
            Admin Dashboard
          </h1>
          <p style={{ maxWidth: 760, margin: "0 auto", color: "var(--text-secondary)", fontSize: "1rem", lineHeight: 1.7 }}>
            Manage service requests, review documents, coordinate approvals, and track client progress from one centralized control panel.
          </p>
        </div>

        <div className="dashboard-stat-grid">
          {[
            { label: "Pending", value: stats.pending, icon: Clock, color: "#f59e0b" },
            { label: "In Progress", value: stats.inProgress, icon: Sparkles, color: "#4f46e5" },
            { label: "Fulfilled", value: stats.completed, icon: CheckCircle, color: "#10b981" },
            { label: "Revenue (₹)", value: stats.revenue, icon: TrendingUp, color: "#22c55e" },
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
              <h2 style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: 4, color: "#ffffff" }}>Active User Services</h2>
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
                    padding: "0.82rem 2.5rem 0.82rem 2.65rem",
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: 12,
                    color: "#ffffff",
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
                  const statusLabel = outcomeLabel;
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
                            <div style={{ fontSize: "0.98rem", fontWeight: 700, marginBottom: 4, whiteSpace: "normal", overflow: "visible", lineHeight: 1.25 }}>{lead.serviceName}</div>
                            <div style={{ color: "rgba(255,255,255,0.65)", fontSize: "0.8rem" }}>
                              {lead.name} • {lead.email}
                            </div>
                          </div>
                          <span className="dashboard-pill" style={{ color: theme.color, background: theme.bg, border: `1px solid ${theme.color}33`, flexShrink: 0 }}>
                            {getDisplayStatus(lead) === "Completed" ? <CheckCircle size={14} /> : <span className="dot" />}
                            {statusLabel}
                          </span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                          <span style={{ color: "rgba(255,255,255,0.65)", fontSize: "0.86rem" }}>{amount}</span>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 8,
                                padding: "6px 12px",
                                borderRadius: 999,
                                fontSize: "0.78rem",
                                fontWeight: 700,
                                color:
                                  summaryTheme.rejected.length > 0
                                    ? "#ef4444"
                                    : summaryTheme.accepted.length > 0
                                      ? "#10b981"
                                      : "#fbbf24",
                                background:
                                  summaryTheme.rejected.length > 0
                                    ? "rgba(239,68,68,0.08)"
                                    : summaryTheme.accepted.length > 0
                                      ? "rgba(16,185,129,0.08)"
                                      : "rgba(245,158,11,0.08)",
                                border: `1px solid ${
                                  summaryTheme.rejected.length > 0
                                    ? "rgba(239,68,68,0.15)"
                                    : summaryTheme.accepted.length > 0
                                      ? "rgba(16,185,129,0.15)"
                                      : "rgba(245,158,11,0.15)"
                                }`,
                              }}
                            >
                              <FileText size={14} />
                              {summaryChip}
                            </span>
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
                                border: "1px solid rgba(255,255,255,0.08)",
                                background: "rgba(255,255,255,0.03)",
                                color: "rgba(255,255,255,0.55)",
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
                        {hasActionMessage && (
                          <div style={{ marginTop: 8, color: "#10b981", fontSize: "0.76rem", fontWeight: 700 }}>Client message present</div>
                        )}
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                <div style={{ padding: "28px 16px", textAlign: "center", color: "rgba(255,255,255,0.65)" }}>No requests in pipeline.</div>
              )}
            </div>

            <button
              type="button"
              onClick={() => navigate("/admin")}
              style={{
                marginTop: 18,
                width: "100%",
                padding: "0.95rem 1rem",
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.06)",
                background: "rgba(255,255,255,0.03)",
                color: "#ffffff",
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
          </PremiumCard>

          <PremiumCard className="dashboard-details-panel" style={{ padding: 22 }}>
            {activeLead ? (
              <div className="dashboard-details-scroll" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 18, flexWrap: "wrap" }}>
                  <div style={{ minWidth: 0 }}>
                    <h2 style={{ fontSize: "1.45rem", fontWeight: 700, marginBottom: 8, color: "#ffffff" }}>{activeLead.serviceName}</h2>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 14, color: "rgba(255,255,255,0.65)", fontSize: "0.84rem" }}>
                      <span>{activeLead.name}</span>
                      <span>{activeLead.email}</span>
                      <span>Order ID: #{String(activeLead._id || "").slice(-6).toUpperCase()}</span>
                      <span>Total Commitment <strong style={{ color: "#34d399", marginLeft: 8 }}>{formatInr(getLeadRevenueAmount(activeLead))}</strong></span>
                    </div>
                  </div>
                  <span className="dashboard-pill" style={{ color: getStatusTheme(activeLead).color, background: getStatusTheme(activeLead).bg, border: `1px solid ${getStatusTheme(activeLead).color}33` }}>
                    {activeLead.status === "Completed" ? <CheckCircle size={14} /> : <span className="dot" />}
                    {topRightStatusLabel || getDisplayStatus(activeLead)}
                  </span>
                </div>

                <PremiumCard style={{ padding: 16, borderRadius: 18 }}>
                  <div className="responsive-progress-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1.35fr auto", gap: 14, alignItems: "center" }}>
                    <div>
                      <div style={{ color: "rgba(255,255,255,0.65)", fontSize: "0.82rem", marginBottom: 8 }}>Service Progress</div>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                        <span style={{ fontSize: "1.55rem", fontWeight: 800 }}>{uploadedDocumentCount} / {documents.length || 0}</span>
                        <span style={{ color: "rgba(255,255,255,0.65)", fontSize: "0.88rem" }}>uploaded</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <div style={{ width: "100%", height: 10, background: "rgba(255,255,255,0.05)", borderRadius: 999, overflow: "hidden" }}>
                        <div style={{ width: `${serviceProgressPercent}%`, height: "100%", borderRadius: 999, background: "linear-gradient(90deg, #22c55e, #14b8a6)" }} />
                      </div>
                      <div style={{ color: "rgba(255,255,255,0.65)", fontSize: "0.84rem" }}>
                        {serviceProgressMessage}
                      </div>
                    </div>
                    <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "#e5e7eb" }}>{Math.round(serviceProgressPercent)}%</div>
                  </div>
                </PremiumCard>

                {reviewSummary &&
                  dismissedReviewSummarySignatureByLead[activeLead._id] !== getReviewSummarySignature(activeLead) && (
                  <div style={{ padding: 16, borderRadius: 18, border: "1px solid rgba(245,158,11,0.18)", background: "rgba(245,158,11,0.05)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 8, color: "#f59e0b" }}>
                      <strong style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><Sparkles size={16} /> Service Review Summary</strong>
                      <button type="button" onClick={(e) => handleDismissReviewSummary(activeLead, e)} style={{ width: 26, height: 26, borderRadius: 999, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "inherit", cursor: "pointer" }}>×</button>
                    </div>
                    <div style={{ color: "#ffffff", fontSize: "0.95rem", lineHeight: 1.6 }}>
                      <div>{reviewSummary}</div>
                    </div>
                  </div>
                )}

                {isDetailsMissingState(activeLead) && dismissedDetailsMissingSignatureByLead[activeLead._id] !== getDetailsMissingSignature(activeLead) && (
                  <div style={{ padding: 16, borderRadius: 18, border: "1px solid rgba(239,68,68,0.18)", background: "rgba(239,68,68,0.05)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 8, color: "#fb7185" }}>
                      <strong style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><AlertCircle size={16} /> Action Required</strong>
                      <button type="button" onClick={(e) => handleDismissDetailsMissingMessage(activeLead, e)} style={{ width: 26, height: 26, borderRadius: 999, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "inherit", cursor: "pointer" }}>×</button>
                    </div>
                    <div style={{ color: "#ffffff", fontSize: "0.95rem" }}>{getDetailsMissingMessage(activeLead)}</div>
                  </div>
                )}

                {activeLead.executorMessage && !isSystemMessage(activeLead.executorMessage) && (
                  <div style={{ padding: 16, borderRadius: 18, border: "1px solid rgba(139,92,246,0.22)", background: "rgba(139,92,246,0.05)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 8, color: "#a78bfa" }}>
                      <strong style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><MessageSquare size={16} /> Message from Executor</strong>
                      <button type="button" onClick={(e) => handleDeleteExecutorMessage(activeLead._id, e)} style={{ width: 26, height: 26, borderRadius: 999, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "inherit", cursor: "pointer" }}>×</button>
                    </div>
                    <div style={{ color: "#ffffff", fontSize: "0.95rem", fontStyle: "italic" }}>{activeLead.executorMessage}</div>
                  </div>
                )}

                {activeLead.prMessage && !isSystemMessage(activeLead.prMessage) && (
                  <div style={{ padding: 16, borderRadius: 18, border: "1px solid rgba(34,197,94,0.22)", background: "rgba(34,197,94,0.05)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 8, color: "#34d399" }}>
                      <strong style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><MessageSquare size={16} /> Message from PR</strong>
                      <button type="button" onClick={(e) => handleDeletePrMessage(activeLead._id, e)} style={{ width: 26, height: 26, borderRadius: 999, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "inherit", cursor: "pointer" }}>×</button>
                    </div>
                    <div style={{ color: "#ffffff", fontSize: "0.95rem", fontStyle: "italic" }}>{activeLead.prMessage}</div>
                  </div>
                )}

                {activeLead.userMessage && String(activeLead.userMessage || "").trim() && !isSystemMessage(activeLead.userMessage) && (
                  <div style={{ padding: 16, borderRadius: 18, border: "1px solid rgba(239,68,68,0.22)", background: "rgba(239,68,68,0.05)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 8, color: "#fb7185" }}>
                      <strong style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><AlertCircle size={16} /> Message from User</strong>
                      <button type="button" onClick={(e) => handleDeleteUserMessage(activeLead._id, e)} style={{ width: 26, height: 26, borderRadius: 999, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "inherit", cursor: "pointer" }}>×</button>
                    </div>
                    <div style={{ color: "#ffffff", fontSize: "0.95rem" }}>{activeLead.userMessage}</div>
                  </div>
                )}

                <div style={{ display: "grid", gap: 18 }}>
                  <PremiumCard style={{ padding: 0, overflow: "hidden" }}>
                    <button
                      type="button"
                      onClick={() => setDocumentsOpen((prev) => !prev)}
                      aria-expanded={documentsOpen}
                      style={{
                        width: "100%",
                        padding: "14px 16px",
                        border: "none",
                        background: "transparent",
                        color: "inherit",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                        textAlign: "left",
                        borderBottom: documentsOpen ? "1px solid rgba(255,255,255,0.06)" : "none",
                      }}
                    >
                      <div>
                        <h3 style={{ fontSize: "0.98rem", fontWeight: 800, marginBottom: 3, color: "#ffffff" }}>User Documents</h3>
                        <p style={{ color: "rgba(255,255,255,0.65)", fontSize: "0.8rem" }}>Review uploaded and pending files for this service.</p>
                      </div>
                      <span style={{ color: "rgba(255,255,255,0.65)", fontSize: "0.8rem" }}>
                        {uploadedDocumentCount} / {documents.length || 0} uploaded {documentsOpen ? "▴" : "▾"}
                      </span>
                    </button>

                    {documentsOpen && (
                      <div style={{ overflowX: "auto" }}>
                        <table className="dashboard-table">
                          <thead>
                            <tr>
                              <th style={{ width: "68%" }}>Document</th>
                              <th>Status</th>
                              <th style={{ width: 110, textAlign: "right" }}>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {documents.length > 0 ? (
                              documents.map((doc, idx) => {
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
                                const isReuploaded = !!doc?.displayReuploaded || !!doc?.reuploaded || docStatusLower === "reuploaded";
                                const draftRejected = leadStatusLower === "draftrejected";
                                const draftAccepted = leadStatusLower === "draftaccepted" || leadStatusLower === "useraccepted" || leadStatusLower === "completed";
                                const draftShared = leadStatusLower === "draftsent" || leadStatusLower === "draftrejected" || leadStatusLower === "draftaccepted" || leadStatusLower === "useraccepted";
                                const displayedStatus = isDraftDocument
                                  ? draftAccepted
                                    ? "Accepted"
                                    : isReuploaded
                                      ? "Draft Reuploaded"
                                      : draftRejected
                                        ? "Draft Rejected"
                                        : draftShared
                                          ? "Draft Shared"
                                          : "Pending User Approval"
                                  : docStatus;
                                const displayedStatusLower = displayedStatus.toLowerCase();
                                const isDone = isDraftDocument
                                  ? draftAccepted || isReuploaded || hasFile
                                  : ["uploaded", "accepted", "verified", "approved", "completed", "reuploaded"].includes(displayedStatusLower) || !!doc?.url;
                                const isRejected = displayedStatusLower === "rejected" || displayedStatusLower === "rejected by executor" || doc.executorRejected;
                                const statusColor = isDone ? "#22c55e" : isRejected ? "#ef4444" : "#fbbf24";
                                const statusBg = isDone ? "rgba(34,197,94,0.12)" : isRejected ? "rgba(239,68,68,0.12)" : "rgba(245,158,11,0.12)";
                                return (
                                  <tr key={`${doc.name}-${idx}`}>
                                    <td>
                                      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                                        <FileText size={18} color={isDone ? "#22c55e" : isRejected ? "#ef4444" : "#a78bfa"} style={{ flexShrink: 0 }} />
                                        <div style={{ minWidth: 0 }}>
                                          <div style={{ fontSize: "0.92rem", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{doc.name}</div>
                                          {isRejected && <div style={{ marginTop: 4, color: "#ef4444", fontSize: "0.76rem", fontWeight: 700 }}>Reupload Required</div>}
                                          {isReuploaded && <div style={{ marginTop: 4, color: "#38bdf8", fontSize: "0.76rem", fontWeight: 700 }}>Reuploaded</div>}
                                        </div>
                                      </div>
                                    </td>
                                    <td>
                                      <span style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 999, color: statusColor, background: statusBg, border: `1px solid ${statusColor}33`, fontSize: "0.8rem", fontWeight: 700, whiteSpace: "nowrap", lineHeight: 1, flexWrap: "nowrap" }}>
                                        <span className="dot" />
                                        {displayedStatus}
                                      </span>
                                    </td>
                                    <td style={{ textAlign: "right" }}>
                                      {(isDone || isUserRole || hasFile) && (
                                        <button 
                                          type="button" 
                                          onClick={() => (hasFile || isDone ? viewDocument(doc.publicId, doc.url, activeLead._id) : handlePickUpload("Draft"))} 
                                          style={{ 
                                            padding: (hasFile || isDone) ? "0 14px" : "0 12px",
                                            height: 34,
                                            borderRadius: 10, 
                                            border: "1px solid rgba(255,255,255,0.08)", 
                                            background: "rgba(255,255,255,0.03)", 
                                            color: (hasFile || isDone) ? "#e2e8f0" : "#34d399", 
                                            display: "inline-flex", 
                                            alignItems: "center", 
                                            justifyContent: "center", 
                                            gap: 8,
                                            cursor: "pointer",
                                            fontSize: "0.75rem",
                                            fontWeight: 800
                                          }} 
                                          title={(hasFile || isDone) ? "View" : "Upload"}
                                        >
                                          {(hasFile || isDone) ? "VIEW" : "UPLOAD"}
                                          {(hasFile || isDone) ? <Eye size={15} /> : <Upload size={15} />}
                                        </button>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })
                            ) : (
                              <tr>
                                <td colSpan={3} style={{ color: "rgba(255,255,255,0.65)", textAlign: "center", padding: "24px 20px" }}>No documents uploaded yet.</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </PremiumCard>

                  <PremiumCard style={{ padding: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                      <div>
                        <div style={{ fontSize: "0.88rem", fontWeight: 800, marginBottom: 4 }}>Service Status</div>
                        <div style={{ color: "rgba(255,255,255,0.65)", fontSize: "0.8rem" }}>Current fulfillment and approval state for this request.</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <span className="dashboard-pill" style={{ 
                          padding: "10px 18px", 
                          fontSize: "0.9rem",
                          color: getStatusTheme(activeLead).color, 
                          background: getStatusTheme(activeLead).bg, 
                          border: `1px solid ${getStatusTheme(activeLead).color}33`,
                          boxShadow: `0 4px 12px ${getStatusTheme(activeLead).color}12`
                        }}>
                          {activeLead.status === "Completed" ? <CheckCircle size={16} /> : <Clock size={16} />}
                          {getDisplayStatus(activeLead)}
                        </span>
                      </div>
                    </div>
                    {isUserRole && (
                      <input ref={uploadInputRef} type="file" accept=".pdf" style={{ display: "none" }} onChange={handleUploadInput} />
                    )}
                  </PremiumCard>

                  <PremiumCard style={{ padding: 16 }}>
                    <form onSubmit={handleUpdateLead} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                      <div className="responsive-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          <label style={{ fontSize: "0.7rem", fontWeight: 700, color: "rgba(255,255,255,0.65)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Recipient</label>
                          <select 
                            value={messageTarget} 
                            onChange={(e) => { 
                              const nextTarget = e.target.value; 
                              setMessageTarget(nextTarget); 
                              setMessageText(getMessageTextByTarget(activeLead, nextTarget)); 
                            }} 
                            style={{ 
                              background: "#121422", 
                              border: "1px solid rgba(255,255,255,0.15)", 
                              color: "#ffffff", 
                              padding: "0.72rem 0.8rem", 
                              borderRadius: 12, 
                              outline: "none",
                              cursor: "pointer",
                              width: "100%"
                            }}
                          >
                            <option value="client" style={{ background: "#121422", color: "#fff" }}>Client</option>
                            <option value="pr" style={{ background: "#121422", color: "#fff" }}>PR</option>
                            <option value="executor" style={{ background: "#121422", color: "#fff" }}>Executor</option>
                          </select>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          <label style={{ fontSize: "0.7rem", fontWeight: 700, color: "rgba(255,255,255,0.65)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Status</label>
                          <div style={{ padding: "0.72rem 0.8rem", borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", color: "#ffffff", fontWeight: 600 }}>{getServiceOutcomeLabel(activeLead)}</div>
                        </div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <label style={{ fontSize: "0.7rem", fontWeight: 700, color: "rgba(255,255,255,0.65)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Advisor Note</label>
                        <textarea value={messageText} onChange={(e) => setMessageText(e.target.value)} placeholder={messageTarget === "client" ? "Write your response to the client..." : messageTarget === "pr" ? "Write your message to PR..." : "Write your message to the executor..."} style={{ minHeight: 120, resize: "vertical", padding: "0.9rem", borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", color: "#ffffff", outline: "none", fontFamily: "inherit" }} />
                      </div>
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
                        <button type="submit" style={{ padding: "0.8rem 1.2rem", borderRadius: 12, border: "none", background: "#22c55e", color: "#fff", fontWeight: 800, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 }}><Send size={15} /> Send Message</button>
                      </div>
                    </form>
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

export default AdminDashboardModern;
