import React from "react";
import { motion } from "framer-motion";
import ConfirmationModal from "../components/ConfirmationModal";
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

const UserDashboardModern = ({
  navigate,
  filteredLeads,
  selectedLead,
  setSelectedLeadId,
  selectedLeadDocuments,
  uploadedDocumentCount,
  documentProgress,
  serviceProgressPercent,
  serviceDate,
  stats,
  getStatusTheme,
  getDisplayStatus,
  getCommitmentAmount,
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
  handleDeleteExecutorMessage,
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
  const documentCountLabel = `${uploadedDocumentCount} / ${selectedLeadDocuments.length || 0}`;
  const serviceProgress = Math.max(0, Math.min(100, serviceProgressPercent ?? 0));

  const systemPhrases = ["status changed", "lead assigned", "draft accepted", "draft sent", "draft rejected", "document accepted", "document rejected", "service updated", "rejected by executor", "assignment rejected"];
  const isSystemMessage = (msg) => {
    if (!msg) return false;
    const lower = msg.toLowerCase();
    return systemPhrases.some(p => lower.includes(p));
  };

  React.useEffect(() => {
    setDocumentsOpen(false);
  }, [activeLead?._id]);

  const containerStyle = {
    minHeight: "100vh",
    background: "var(--bg)",
    color: "var(--text)",
    paddingTop: "clamp(102px, 12vw, 124px)",
    paddingBottom: 64,
    position: "relative",
    overflow: "hidden",
  };

  const getProgressMessage = () => {
    if (!activeLead) return "No active service.";
    if (activeLead.status === "Completed") return "Service completed successfully.";
    if (activeLead.status === "Rejected") return "";
    if (isExecutorRejectedState(activeLead) || isDetailsMissingState(activeLead)) return "";
    if (isReviewDraftState(activeLead)) return "Please review the draft document below.";
    
    const status = String(activeLead.status || "").trim();
    if (status === "PendingReview") return "Documents are being reviewed by PR.";
    if (status === "PR_Accepted") return "Documents verified. Awaiting executor assignment.";
    if (status === "AssignedToExecutor") return "Executor assigned. Service is starting.";
    if (status === "InProgress") return "Executor is currently working on your service.";
    if (status === "ExecutionFinished") return "Execution finished. Undergoing quality review.";
    if (status === "DraftSent") return "Draft is awaiting your approval.";
    if (status === "DraftAccepted" || status === "UserAccepted") return "Draft approved. Awaiting final documents.";
    if (status === "DraftRejected") return "Draft rejected. Executor is reviewing your feedback.";
    if (status === "Rejected") return "Service has been rejected.";
    if (status === "Open") {
        if (selectedLeadDocuments.length > 0 && uploadedDocumentCount >= selectedLeadDocuments.length) {
            return "All documents uploaded. Awaiting PR review.";
        }
        if (selectedLeadDocuments.length > 0) {
          return `${uploadedDocumentCount} of ${selectedLeadDocuments.length} documents uploaded. Keep going!`;
        }
        return "Keep going! Upload required documents to proceed.";
    }
    
    return "Service is in progress.";
  };
  const progressMessage = getProgressMessage();

  return (
    <div className="home-page-shell user-dashboard-shell" style={containerStyle}>
      <div className="home-page-backdrop" aria-hidden="true" />
      <style>{`
        .user-dashboard-shell .dashboard-stat-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
          margin-bottom: 18px;
        }
        .user-dashboard-shell .dashboard-main-grid {
          display: grid;
          grid-template-columns: 360px minmax(0, 1fr);
          gap: 14px;
          align-items: stretch;
        }
        .user-dashboard-shell .dashboard-sidebar-panel {
          min-height: 560px;
          height: auto;
          display: flex;
          flex-direction: column;
        }
        .user-dashboard-shell .dashboard-details-panel {
          min-height: 560px;
          height: auto;
          display: flex;
          flex-direction: column;
        }
        .user-dashboard-shell .dashboard-details-scroll {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          padding-right: 4px;
          margin-right: -4px;
        }
        .user-dashboard-shell .dashboard-sidebar-scroll {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          padding-right: 4px;
          margin-right: -4px;
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
          font-size: 0.8rem;
          font-weight: 700;
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
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          text-align: left;
        }
        .user-dashboard-shell .dashboard-table th {
          color: rgba(255, 255, 255, 0.55);
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
        .user-dashboard-shell .dashboard-search::placeholder {
          color: rgba(255, 255, 255, 0.35);
        }
        @media (max-width: 1200px) {
          .user-dashboard-shell .dashboard-stat-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .user-dashboard-shell .dashboard-main-grid {
            grid-template-columns: 1fr;
          }
          .user-dashboard-shell .dashboard-sidebar-panel {
            min-height: 0;
          }
          .user-dashboard-shell .dashboard-details-panel {
            min-height: 0;
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
      `}</style>

      <div
        style={{
          maxWidth: 1360,
          margin: "0 auto",
          padding: "0 1.25rem 0.5rem",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div style={{ marginBottom: 40, textAlign: "center" }}>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 700, letterSpacing: "0.05em", color: "var(--text)", textTransform: "uppercase" }}>
            USER DASHBOARD
          </h1>
          <p style={{ color: "var(--card-content-muted)", fontSize: "0.95rem", marginTop: 8, maxWidth: 600, margin: "8px auto 0" }}>
            Monitor your service progress, manage your documents and connect with your advisors all in one secure unified portal.
          </p>
        </div>

        <div className="dashboard-stat-grid">
          <PremiumCard style={{ padding: 18, minHeight: 115, borderColor: "rgba(74, 222, 128, 0.13)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
            <div style={{ fontSize: "0.9rem", fontWeight: 500, color: "#ffffff", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>Pending</div>
            <div style={{ fontSize: "1.9rem", fontWeight: 800, lineHeight: 1, color: "#ffffff" }}>{stats.pending}</div>
            <div style={{ color: "rgba(251, 191, 36, 0.8)", fontSize: "0.75rem", marginTop: 8, fontWeight: 600 }}>Needs your action</div>
          </PremiumCard>

          <PremiumCard style={{ padding: 18, minHeight: 115, borderColor: "rgba(67, 97, 238, 0.14)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
            <div style={{ fontSize: "0.9rem", fontWeight: 500, color: "#ffffff", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>In Progress</div>
            <div style={{ fontSize: "1.9rem", fontWeight: 800, lineHeight: 1, color: "#ffffff" }}>{stats.inProgress}</div>
            <div style={{ color: "rgba(79, 70, 229, 0.8)", fontSize: "0.75rem", marginTop: 8, fontWeight: 600 }}>In progress services</div>
          </PremiumCard>

          <PremiumCard style={{ padding: 18, minHeight: 115, borderColor: "rgba(52, 211, 153, 0.14)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
            <div style={{ fontSize: "0.9rem", fontWeight: 500, color: "#ffffff", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>Completed</div>
            <div style={{ fontSize: "1.9rem", fontWeight: 800, lineHeight: 1, color: "#ffffff" }}>{stats.completed}</div>
            <div style={{ color: "rgba(52, 211, 153, 0.8)", fontSize: "0.75rem", marginTop: 8, fontWeight: 600 }}>This month</div>
          </PremiumCard>

          <PremiumCard style={{ padding: 18, minHeight: 115, borderColor: "rgba(16, 185, 129, 0.16)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
            <div style={{ fontSize: "0.9rem", fontWeight: 500, color: "#ffffff", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>Total Commitment</div>
            <div style={{ fontSize: "1.9rem", fontWeight: 800, lineHeight: 1, color: "#34d399" }}>{formatInr(stats.totalCommitment)}</div>
            <div style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.75rem", marginTop: 8, fontWeight: 600 }}>This month</div>
          </PremiumCard>
        </div>

        <div className="dashboard-main-grid">
          <PremiumCard className="dashboard-sidebar-panel" style={{ padding: 18 }}>
            <div style={{ marginBottom: 14 }}>
              <h2 style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: 4, color: "#ffffff" }}>All Services</h2>
              <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.82rem" }}>{filteredLeads.length} active service{filteredLeads.length === 1 ? "" : "s"}</p>
            </div>

            <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
              <div style={{ position: "relative", flex: 1 }}>
                <Search size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.55)" }} />
                <input
                  value={serviceSearch}
                  onChange={(e) => setServiceSearch(e.target.value)}
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
                filteredLeads.map((lead, index) => {
                  const visibleDocs = Array.isArray(lead?.documents) ? lead.documents : [];
                  const hasRejectedDocument = visibleDocs.some((doc) => {
                    const docStatus = String(doc?.status || "").trim().toLowerCase();
                    const rejectionText = String(doc?.rejectionReason || doc?.rejectionMessage || "").trim();
                    return docStatus === "rejected" || !!rejectionText;
                  });
                  const hasRejectedService =
                    String(lead?.status || "").trim().toLowerCase() === "rejected";
                  const showRejectedCardState =
                    hasRejectedService ||
                    hasRejectedDocument ||
                    isRejectedServiceState(lead) ||
                    isExecutorRejectedState(lead);
                  const theme = showRejectedCardState
                    ? { color: "#ef4444", bg: "rgba(239,68,68,0.12)" }
                    : getStatusTheme(lead);
                  const selected = lead._id === activeLead?._id;
                  const amount = formatInr(getCommitmentAmount(lead));
                  const rejectedCardLabel = isExecutorRejectedState(lead)
                    ? "Rejected by Executor"
                    : isPrRejectedState(lead)
                      ? "Rejected by PR"
                      : "Rejected";
                  const statusLabel =
                    lead.status === "Completed"
                      ? "Completed"
                      : ["AssignedToExecutor", "InProgress", "ExecutionFinished", "DraftSent", "DraftAccepted", "UserAccepted"].includes(lead.status)
                        ? "In Progress"
                        : showRejectedCardState
                          ? rejectedCardLabel
                          : lead.status === "DraftRejected"
                            ? "Draft Rejected"
                            : "Pending";
                  const statusIcon =
                    lead.status === "Completed"
                      ? <CheckCircle size={14} />
                      : ["AssignedToExecutor", "InProgress", "ExecutionFinished", "DraftSent", "DraftAccepted", "UserAccepted"].includes(lead.status)
                        ? <Clock size={14} />
                        : (showRejectedCardState || lead.status === "DraftRejected")
                          ? <AlertCircle size={14} />
                          : <span className="dot" />;
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
                            <div style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.8rem" }}>Order ID: #{String(lead._id || "").slice(-6).toUpperCase()}  •  {new Date(lead.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</div>
                          </div>
                          <span className="dashboard-pill" style={{ color: theme.color, background: theme.bg, border: `1px solid ${theme.color}33`, flexShrink: 0 }}>
                            {statusIcon}
                            {statusLabel}
                          </span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                          <span style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.86rem" }}>{amount}</span>
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
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                <div style={{ padding: "28px 16px", textAlign: "center", color: "rgba(255,255,255,0.55)" }}>No services match your search.</div>
              )}
            </div>

            <button
              type="button"
              onClick={() => navigate("/services")}
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
              View All Services
              <ChevronRight size={16} />
            </button>
          </PremiumCard>

          <PremiumCard className="dashboard-details-panel" style={{ padding: 22 }}>
            {activeLead ? (
              <div className="dashboard-details-scroll" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 18, flexWrap: "wrap" }}>
                  <div style={{ minWidth: 0 }}>
                    <h2 style={{ fontSize: "1.45rem", fontWeight: 700, marginBottom: 8, color: "#ffffff" }}>{activeLead.serviceName}</h2>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 14, color: "rgba(255,255,255,0.55)", fontSize: "0.84rem" }}>
                      <span>Order ID: #{String(activeLead._id || "").slice(-6).toUpperCase()}</span>
                      <span>{serviceDate}</span>
                      <span>Total Commitment <strong style={{ color: "#34d399", marginLeft: 8 }}>{formatInr(getCommitmentAmount(activeLead))}</strong></span>
                    </div>
                  </div>
                  <span className="dashboard-pill" style={{ color: selectedStatusBadge.color, background: selectedStatusBadge.bg, border: `1px solid ${selectedStatusBadge.color}33` }}>
                    {activeLead.status === "Completed" ? <CheckCircle size={14} /> : <span className="dot" />}
                    {selectedStatusText}
                  </span>
                </div>

                <PremiumCard style={{ padding: 16, borderRadius: 18 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1.35fr auto", gap: 14, alignItems: "center" }}>
                    <div>
                      <div style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.82rem", marginBottom: 8 }}>Documents</div>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                        <span style={{ fontSize: "1.55rem", fontWeight: 800 }}>{documentCountLabel}</span>
                        <span style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.88rem" }}>uploaded</span>
                      </div>
                    </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <div style={{ width: "100%", height: 10, background: "rgba(255,255,255,0.05)", borderRadius: 999, overflow: "hidden" }}>
                        <div style={{ width: `${serviceProgress}%`, height: "100%", borderRadius: 999, background: "linear-gradient(90deg, #22c55e, #14b8a6)" }} />
                      </div>
                      {progressMessage ? (
                        <div style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.84rem" }}>{progressMessage}</div>
                      ) : null}
                    </div>
                    <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "#e5e7eb" }}>{Math.round(serviceProgress)}%</div>
                  </div>
                </PremiumCard>

                {isExecutorRejectedState(activeLead) && dismissedDetailsMissingSignatureByLead[activeLead._id] !== getDetailsMissingSignature(activeLead) && (
                  <div style={{ padding: 16, borderRadius: 18, border: "1px solid rgba(239,68,68,0.22)", background: "rgba(239,68,68,0.08)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 8, color: "#fb7185" }}>
                      <strong style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><AlertCircle size={16} /> Rejected by Executor</strong>
                      <button type="button" onClick={(e) => handleDismissDetailsMissingMessage(activeLead, e)} style={{ width: 26, height: 26, borderRadius: 999, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "inherit", cursor: "pointer" }}>×</button>
                    </div>
                  </div>
                )}

                {isPrRejectedState(activeLead) && dismissedDetailsMissingSignatureByLead[activeLead._id] !== getDetailsMissingSignature(activeLead) && (
                  <div style={{ padding: 16, borderRadius: 18, border: "1px solid rgba(239,68,68,0.22)", background: "rgba(239,68,68,0.08)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 8, color: "#fb7185" }}>
                      <strong style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><AlertCircle size={16} /> Rejected by PR</strong>
                      <button type="button" onClick={(e) => handleDismissDetailsMissingMessage(activeLead, e)} style={{ width: 26, height: 26, borderRadius: 999, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "inherit", cursor: "pointer" }}>×</button>
                    </div>
                  </div>
                )}

                {isDetailsMissingState(activeLead) && dismissedDetailsMissingSignatureByLead[activeLead._id] !== getDetailsMissingSignature(activeLead) && (
                  <div style={{ padding: 16, borderRadius: 18, border: "1px solid rgba(239,68,68,0.18)", background: "rgba(239,68,68,0.05)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 8, color: "#fb7185" }}>
                      <strong style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><AlertCircle size={16} /> Action Required</strong>
                      <button type="button" onClick={(e) => { if (String(activeLead.prFeedback || "").trim()) { handleDeleteRejectionMessage(activeLead._id, e); return; } handleDismissDetailsMissingMessage(activeLead, e); }} style={{ width: 26, height: 26, borderRadius: 999, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "inherit", cursor: "pointer" }}>×</button>
                    </div>
                  </div>
                )}

                {activeLead.adminMessage && !isSystemMessage(activeLead.adminMessage) && (
                  <div style={{ padding: 16, borderRadius: 18, border: "1px solid rgba(16,185,129,0.22)", background: "rgba(16,185,129,0.05)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 8, color: "#34d399" }}>
                      <strong style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><Sparkles size={16} /> Message from Admin</strong>
                      <button type="button" onClick={(e) => handleDeleteAdvisorMessage(activeLead._id, e)} style={{ width: 26, height: 26, borderRadius: 999, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "inherit", cursor: "pointer" }}>×</button>
                    </div>
                    <div style={{ color: "#ffffff", fontSize: "0.95rem", lineHeight: 1.6 }}>{activeLead.adminMessage}</div>
                  </div>
                )}

                {activeLead.prFeedback && !isSystemMessage(activeLead.prFeedback) && (
                  <div style={{ padding: 16, borderRadius: 18, border: "1px solid rgba(59,130,246,0.22)", background: "rgba(59,130,246,0.05)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 8, color: "#60a5fa" }}>
                      <strong style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><MessageSquare size={16} /> Message from PR</strong>
                      <button type="button" onClick={(e) => handleDeleteRejectionMessage(activeLead._id, e)} style={{ width: 26, height: 26, borderRadius: 999, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "inherit", cursor: "pointer" }}>×</button>
                    </div>
                    <div style={{ color: "#ffffff", fontSize: "0.95rem", fontStyle: "italic" }}>"{activeLead.prFeedback}"</div>
                  </div>
                )}

                {activeLead.executorMessage && !isSystemMessage(activeLead.executorMessage) && (
                  <div style={{ padding: 16, borderRadius: 18, border: "1px solid rgba(139,92,246,0.22)", background: "rgba(139,92,246,0.05)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 8, color: "#a78bfa" }}>
                      <strong style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><Sparkles size={16} /> Message from Executor</strong>
                      <button type="button" onClick={(e) => handleDeleteExecutorMessage(activeLead._id, e)} style={{ width: 26, height: 26, borderRadius: 999, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "inherit", cursor: "pointer" }}>×</button>
                    </div>
                    <div style={{ color: "#ffffff", fontSize: "0.95rem", fontStyle: "italic" }}>"{activeLead.executorMessage}"</div>
                  </div>
                )}

                {isReviewDraftState(activeLead) && (
                  <div style={{ padding: 16, borderRadius: 18, border: "1px solid rgba(139,92,246,0.24)", background: "rgba(139,92,246,0.06)", display: "grid", gap: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#c4b5fd", fontWeight: 800 }}>
                      <Sparkles size={16} /> Review Your Draft
                    </div>
                    <p style={{ color: "#ffffff", margin: 0, fontSize: "0.9rem" }}>Your service draft is ready for review. Please check the document below and approve it if everything is correct.</p>
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                      <button onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/review-draft/${activeLead._id}`); }} style={{ padding: "0.7rem 0.95rem", borderRadius: 12, border: "1px solid rgba(139,92,246,0.35)", background: "rgba(139,92,246,0.12)", color: "#c4b5fd", fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 }}><FileText size={15} /> View Draft</button>
                      <button onClick={() => handleDraftAction(activeLead._id, "accept")} style={{ padding: "0.7rem 0.95rem", borderRadius: 12, border: "none", background: "#10b981", color: "#fff", fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 }}><CheckCircle size={15} /> Approve Draft</button>
                      <button onClick={() => openDraftRejectForm(activeLead._id)} style={{ padding: "0.7rem 0.95rem", borderRadius: 12, border: "1px solid rgba(239,68,68,0.2)", background: "rgba(239,68,68,0.08)", color: "#fb7185", fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 }}><AlertCircle size={15} /> Reject Draft</button>
                    </div>
                    {draftRejectingLeadId === activeLead._id && (
                      <div style={{ display: "grid", gap: 10, marginTop: 4 }}>
                        <textarea value={draftRejectDrafts[activeLead._id] || ""} onChange={(e) => setDraftRejectDrafts((prev) => ({ ...prev, [activeLead._id]: e.target.value }))} rows={3} placeholder="Describe what needs to be changed in this draft..." style={{ width: "100%", resize: "vertical", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(0,0,0,0.22)", color: "#ffffff", padding: "0.95rem", outline: "none" }} />
                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                          <button onClick={() => submitDraftReject(activeLead._id)} style={{ padding: "0.78rem 1rem", borderRadius: 12, border: "none", background: "#ef4444", color: "#fff", fontWeight: 800, cursor: "pointer" }}>Send to PR and Reject Draft</button>
                          <button onClick={() => setDraftRejectingLeadId(null)} style={{ padding: "0.78rem 1rem", borderRadius: 12, border: "1px solid rgba(255,255,255,0.14)", background: "transparent", color: "var(--text-secondary)", fontWeight: 700, cursor: "pointer" }}>Cancel</button>
                        </div>
                      </div>
                    )}
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
                        <h3 style={{ fontSize: "0.98rem", fontWeight: 800, marginBottom: 3, color: "#ffffff" }}>Required Documents</h3>
                        <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.8rem" }}>Track uploaded and pending files for this service.</p>
                      </div>
                      <span style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.8rem" }}>
                        {selectedLeadDocuments.length} documents {documentsOpen ? "▴" : "▾"}
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
                            {selectedLeadDocuments.length > 0 ? (
                              selectedLeadDocuments.map((doc, idx) => {
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
                                const serviceRejected = isRejectedServiceState?.(activeLead) ||
                                  String(activeLead?.status || "").trim().toLowerCase() === "rejected";
                                const isReuploaded = !serviceRejected && (!!doc?.displayReuploaded || !!doc?.reuploaded || docStatusLower === "reuploaded");
                                const isAccepted = !serviceRejected && ["uploaded", "accepted", "verified", "approved", "completed"].includes(docStatusLower);
                                const isPending = !serviceRejected && ["pending", "pendingreview"].includes(docStatusLower);
                                const isRejectedByExecutor = serviceRejected && !isReuploaded && isExecutorRejectedState(activeLead);
                                const isRejected = docStatusLower === "rejected" || serviceRejected;
                                const isDraftDocument = String(doc?.type || "").trim().toLowerCase() === "draft";
                                const statusColor = isAccepted ? "#22c55e" : (isRejected || isRejectedByExecutor) ? "#ef4444" : "#fbbf24";
                                const statusBg = isAccepted ? "rgba(34,197,94,0.12)" : (isRejected || isRejectedByExecutor) ? "rgba(239,68,68,0.12)" : "rgba(245,158,11,0.12)";
                                const displayStatus = isRejected
                                    ? "Rejected"
                                    : isPending
                                      ? "Pending Review"
                                      : docStatus || "Pending";
                                return (
                                  <tr key={`${doc.name}-${idx}`}>
                                    <td>
                                      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                                        <FileText size={18} color={isAccepted ? "#22c55e" : (isRejected || isRejectedByExecutor) ? "#ef4444" : "#a78bfa"} style={{ flexShrink: 0 }} />
                                        <div style={{ minWidth: 0 }}>
                                          <div style={{ fontSize: "0.92rem", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{doc.name}</div>
                                          {(isRejected || isRejectedByExecutor) && !isDraftDocument && (
                                            <div
                                              style={{
                                                marginTop: 4,
                                                color: "#f87171",
                                                fontSize: "0.76rem",
                                                fontWeight: 700,
                                              }}
                                            >
                                              Reupload this document from the Services page
                                            </div>
                                          )}
                                          {isReuploaded && <div style={{ marginTop: 4, color: "#38bdf8", fontSize: "0.76rem", fontWeight: 700 }}>Reuploaded</div>}
                                        </div>
                                      </div>
                                    </td>
                                    <td style={{ verticalAlign: "middle" }}>
                                      <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "8px 12px", borderRadius: 999, color: statusColor, background: statusBg, border: `1px solid ${statusColor}33`, fontSize: "0.8rem", fontWeight: 700, whiteSpace: "nowrap", lineHeight: 1, width: "fit-content", minHeight: 34 }}>
                                        <span className="dot" />
                                        {displayStatus}
                                      </span>
                                    </td>
                                    <td style={{ textAlign: "right" }}>
                                      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                                        {hasFile && (
                                          <button 
                                            type="button" 
                                            onClick={() => viewDocument(doc.publicId, doc.url, activeLead._id)} 
                                            style={{ 
                                              padding: "0 14px",
                                              height: 34,
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
                                <td colSpan={3} style={{ color: "rgba(255,255,255,0.55)", textAlign: "center", padding: "24px 20px" }}>No documents uploaded yet.</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </PremiumCard>

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

                  <PremiumCard style={{ padding: 16, borderRadius: 18 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600 }}>
                        Message to PR
                      </div>
                    </div>
                    <div style={{ position: "relative" }}>
                      <textarea
                        value={messageByLead[activeLead._id] || ""}
                        onChange={(e) => handleMessageChange(activeLead._id, e.target.value)}
                        placeholder="Need help or have updates? Message your PR advisor here..."
                        style={{
                          width: "100%",
                          minHeight: 100,
                          background: "rgba(255,255,255,0.03)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          borderRadius: 16,
                          padding: "0.95rem",
                          color: "#ffffff",
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
              <div style={{ padding: "52px 24px", textAlign: "center", color: "rgba(255,255,255,0.55)" }}>
                <LayoutDashboard size={48} style={{ marginBottom: 14 }} />
                <h3 style={{ color: "#ffffff", fontSize: "1.25rem", fontWeight: 800, marginBottom: 8 }}>No active services found</h3>
                <p style={{ maxWidth: 420, margin: "0 auto 20px", lineHeight: 1.6 }}>Start your journey by selecting a service from our curated recommendations.</p>
                <button onClick={() => navigate("/services")} style={{ padding: "0.85rem 1.2rem", borderRadius: 12, border: "1px solid rgba(34,197,94,0.25)", background: "rgba(34,197,94,0.08)", color: "#34d399", fontWeight: 700, cursor: "pointer" }}>Explore Services</button>
              </div>
            )}
          </PremiumCard>
        </div>
      </div>

      <ConfirmationModal
        isOpen={deleteConfirm.isOpen}
        title="Remove Service"
        message={`Are you sure you want to remove ${deleteConfirm.lead?.serviceName || "this service"}? This will hide the service from your dashboard.`}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirm({ isOpen: false, lead: null, isLoading: false })}
        isLoading={deleteConfirm.isLoading}
      />
    </div>
  );
};

export default UserDashboardModern;
