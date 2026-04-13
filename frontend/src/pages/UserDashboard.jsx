import React, { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import {
  LayoutDashboard,
  FileText,
  Plus,
  Clock,
  ArrowUpRight,
  LogOut,
  CheckCircle,
  Search,
  AlertCircle,
  TrendingUp,
  Sparkles,
  Target,
  Zap,
  X,
  ChevronDown,
  Send,
  Loader2,
  Upload,
} from "lucide-react";
import ConfirmationModal from "../components/ConfirmationModal";


const PremiumCard = ({
  children,
  style = {},
  className = "",
  highlight = false,
}) => {
  return (
    <div
      className={className}
      style={{
        background: highlight
          ? "var(--dashboard-highlight-bg)"
          : "var(--dashboard-card-bg)",
        backdropFilter: "blur(16px)",
        borderRadius: "24px",
        border: highlight
          ? "1px solid rgba(16, 185, 129, 0.4)"
          : "1px solid var(--dashboard-card-border)",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        position: "relative",
        overflow: "hidden",
        ...style,
      }}
      onMouseEnter={(e) => {
        if (!highlight) {
          e.currentTarget.style.borderColor =
            "var(--dashboard-card-hover-border)";
          e.currentTarget.style.boxShadow = "var(--dashboard-hover-shadow)";
        }
      }}
      onMouseLeave={(e) => {
        if (!highlight) {
          e.currentTarget.style.borderColor = "var(--dashboard-card-border)";
          e.currentTarget.style.boxShadow = "none";
        }
      }}
    >
      <div style={{ position: "relative", zIndex: 1 }}>{children}</div>
    </div>
  );
};

import Loader from "../components/Loader";
import {
  formatInr,
  getLeadRevenueAmount,
} from "../utils/servicePricing";

const UserDashboard = () => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [messageByLead, setMessageByLead] = useState({});
  const [statsHighlight, setStatsHighlight] = useState(false);
  const [portfolioHighlight, setPortfolioHighlight] = useState(false);
  const [uploadingId, setUploadingId] = useState(null);
  const [draftRejectDrafts, setDraftRejectDrafts] = useState({});
  const [draftRejectingLeadId, setDraftRejectingLeadId] = useState(null);
  const [dismissedDetailsMissingSignatureByLead, setDismissedDetailsMissingSignatureByLead] = useState({});
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, lead: null, isLoading: false });
  const navigate = useNavigate();

  const storedUser = JSON.parse(localStorage.getItem("user"));
  const isAdmin = storedUser?.role === "admin";

  useEffect(() => {
    if (isAdmin) {
      navigate("/admin");
      return;
    }

    const fetchUserServices = async () => {
      try {
        const userId = storedUser?._id || storedUser?.id;
        const apiUrl = import.meta.env.VITE_API_URL;
        const response = await axios.get(`${apiUrl}/leads?userId=${userId}`, {
          headers: { Authorization: `Bearer ${storedUser.token}` },
        });
        setLeads(response.data);
      } catch (error) {
        console.error("Error fetching services:", error);
        // If it's a 401, we might handle it differently, but for general "empty" or "failed" load
        // we only show the toast if it's a true server error and the user expects data.
        if (error.response?.status !== 401 && error.response?.status !== 404) {
          // Toast removed as per user request to avoid showing error when no services entered
        }
      } finally {
        // Keep the loader visible for a professional amount of time
        setTimeout(() => setLoading(false), 500);
      }
    };

    if (storedUser && !isAdmin) {
      fetchUserServices();
    } else {
      setLoading(false);
    }
  }, []);

  const handleUploadDocuments = async (leadId, files) => {
    if (!files || files.length === 0) return;
    
    const fileArray = Array.from(files);
    if (fileArray.some((file) => file.type !== "application/pdf")) {
      toast.error("Please upload only PDF documents");
      return;
    }

    setUploadingId(leadId);
    const loadingToast = toast.loading(`Uploading document${fileArray.length > 1 ? 's' : ''}...`);
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const formData = new FormData();

      fileArray.forEach((file) => {
        formData.append("files", file);
      });

      const uploadRes = await axios.post(`${apiUrl}/leads/upload`, formData, {
        headers: { Authorization: `Bearer ${storedUser.token}` },
      });

      const uploadedFiles = Array.isArray(uploadRes.data.files)
        ? uploadRes.data.files
        : uploadRes.data.url
          ? [{ url: uploadRes.data.url, filename: uploadRes.data.filename }]
          : [];

      if (uploadedFiles.length !== fileArray.length) {
        throw new Error("Upload response mismatch");
      }

      const newDocuments = fileArray.map((file, index) => ({
        name: file.name,
        url: uploadedFiles[index]?.url || uploadedFiles[index]?.secure_url,
        type: "Client",
        status: "Pending",
        uploadedAt: new Date(),
      }));

      const response = await axios.patch(
        `${apiUrl}/leads/${leadId}`,
        {
          status: "PendingReview",
          reuploadedDocumentNames: fileArray.map((file) => file.name),
          $push: {
            documents: {
              $each: newDocuments,
            },
          },
        },
        {
          headers: { Authorization: `Bearer ${storedUser.token}` },
        },
      );

      if (response.data) {
        toast.success("Document uploaded successfully!", { id: loadingToast });
        const userId = storedUser?._id || storedUser?.id;
        const leadsRes = await axios.get(`${apiUrl}/leads?userId=${userId}`, {
          headers: { Authorization: `Bearer ${storedUser.token}` },
        });
        setLeads(leadsRes.data);
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload document", { id: loadingToast });
    } finally {
      setUploadingId(null);
    }
  };

  const handleMessageChange = (leadId, value) => {
    setMessageByLead((prev) => ({ ...prev, [leadId]: value }));
  };

  const handleSendMessageToPR = async (leadId) => {
    const message = (messageByLead[leadId] || "").trim();
    if (!message) {
      toast.error("Please enter a message");
      return;
    }

    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      await axios.patch(
        `${apiUrl}/leads/${leadId}`,
        {
          userMessage: message,
        },
        {
          headers: { Authorization: `Bearer ${storedUser.token}` },
        },
      );
      toast.success("Message sent to PR!");
      setMessageByLead((prev) => ({ ...prev, [leadId]: "" }));

      // Refresh leads
      const userId = storedUser?._id || storedUser?.id;
      const leadsRes = await axios.get(`${apiUrl}/leads?userId=${userId}`, {
        headers: { Authorization: `Bearer ${storedUser.token}` },
      });
      setLeads(leadsRes.data);
    } catch (error) {
      console.error("Message error:", error);
      toast.error("Failed to send message");
    }
  };

  const handleDeleteAdvisorMessage = async (leadId, e) => {
    if (e) e.stopPropagation();
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      await axios.patch(
        `${apiUrl}/leads/${leadId}`,
        {
          adminMessage: "",
        },
        {
          headers: { Authorization: `Bearer ${storedUser.token}` },
        },
      );
      toast.success("Advisor note removed");

      const userId = storedUser?._id || storedUser?.id;
      const leadsRes = await axios.get(`${apiUrl}/leads?userId=${userId}`, {
        headers: { Authorization: `Bearer ${storedUser.token}` },
      });
      setLeads(leadsRes.data);
    } catch (error) {
      console.error("Delete advisor note error:", error);
      toast.error("Failed to remove advisor note");
    }
  };

  const handleDeleteService = (lead, e) => {
    if (e) e.stopPropagation();
    setDeleteConfirm({ isOpen: true, lead, isLoading: false });
  };

  const handleConfirmDelete = async () => {
    const lead = deleteConfirm.lead;
    const serviceName = lead?.serviceName || "this service";
    
    setDeleteConfirm((prev) => ({ ...prev, isLoading: true }));
    
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      await axios.delete(`${apiUrl}/leads/${lead._id}`, {
        headers: { Authorization: `Bearer ${storedUser.token}` },
      });

      toast.success(`${serviceName} removed`);
      setExpandedId((prev) => (prev === lead._id ? null : prev));
      setLeads((prev) => prev.filter((item) => item._id !== lead._id));
      setDeleteConfirm({ isOpen: false, lead: null, isLoading: false });
    } catch (error) {
      console.error("Delete service error:", error);
      toast.error("Failed to remove service");
      setDeleteConfirm((prev) => ({ ...prev, isLoading: false }));
    }
  };

  const handleDeleteRejectionMessage = async (leadId, e) => {
    if (e) e.stopPropagation();
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      await axios.patch(
        `${apiUrl}/leads/${leadId}`,
        {
          prFeedback: "",
        },
        {
          headers: { Authorization: `Bearer ${storedUser.token}` },
        },
      );
      toast.success("PR message removed");

      const userId = storedUser?._id || storedUser?.id;
      const leadsRes = await axios.get(`${apiUrl}/leads?userId=${userId}`, {
        headers: { Authorization: `Bearer ${storedUser.token}` },
      });
      setLeads(leadsRes.data);
    } catch (error) {
      console.error("Delete rejection message error:", error);
      toast.error("Failed to remove rejection message");
    }
  };

  const isAdminRejectedState = (lead) =>
    lead?.status === "Rejected" &&
    String(lead?.adminMessage || "")
      .toLowerCase()
      .includes("administrator");

  const isExecutorRejectedState = (lead) =>
    lead?.status === "Rejected" &&
    !isAdminRejectedState(lead) &&
    (
      String(lead?.executorMessage || "")
        .toLowerCase()
        .includes("rejected by executor") ||
      String(lead?.executorMessage || "")
        .toLowerCase()
        .includes("assignment rejected") ||
      !hasPrFeedbackMessage(lead)
    );

  const isDetailsMissingState = (lead) =>
    !isExecutorRejectedState(lead) &&
    (lead?.status === "Rejected" || hasRejectedDocuments(lead));

  const hasDraftReviewInstruction = (lead) => {
    const message = String(lead?.adminMessage || "").toLowerCase();
    return (
      message.includes("draft") &&
      (message.includes("review") ||
        message.includes("approve") ||
        message.includes("check"))
    );
  };

  const hasDraftDocument = (lead) =>
    Array.isArray(lead?.documents) &&
    lead.documents.some((doc) => doc?.type === "Draft");

  const isReviewDraftState = (lead) => {
    if (isDetailsMissingState(lead)) return false;
    if (lead?.status === "DraftSent") return true;
    return hasDraftDocument(lead) && hasDraftReviewInstruction(lead);
  };

  const getDetailsMissingMessage = (lead) => {
    const rejectedDoc = Array.isArray(lead?.documents)
      ? lead.documents.find((doc) => doc?.status === "Rejected")
      : null;
    if (rejectedDoc) return getDocumentRejectionText(rejectedDoc);

    const rejectionNote = String(lead?.prFeedback || "").trim();
    if (rejectionNote) return rejectionNote;

    return "Please review your documents and upload the missing details.";
  };

  const getDetailsMissingSignature = (lead) => {
    const rejectionNote = String(lead?.prFeedback || "").trim();
    if (rejectionNote) return `pr:${rejectionNote}`;

    const rejectedDoc = Array.isArray(lead?.documents)
      ? lead.documents.find((doc) => doc?.status === "Rejected")
      : null;

    if (rejectedDoc) {
      const rejectedDocId = String(rejectedDoc._id || rejectedDoc.name || "unknown");
      const rejectedDocMessage = getDocumentRejectionText(rejectedDoc);
      return `doc:${rejectedDocId}:${rejectedDocMessage}`;
    }

    return "";
  };

  const handleDismissDetailsMissingMessage = (lead, e) => {
    if (e) e.stopPropagation();
    const leadId = lead?._id;
    if (!leadId) return;
    const signature = getDetailsMissingSignature(lead);
    setDismissedDetailsMissingSignatureByLead((prev) => ({
      ...prev,
      [leadId]: signature,
    }));
  };

  const stats = {
    pending: leads.filter((l) => l.status === "Open").length,
    inProgress: leads.filter((l) =>
      ["InProgress", "DraftSent", "UserAccepted"].includes(l.status),
    ).length,
    completed: leads.filter((l) => l.status === "Completed").length,
    totalCommitment: leads.reduce(
      (sum, lead) =>
        sum + (lead.status === "Rejected" ? 0 : getLeadRevenueAmount(lead)),
      0,
    ),
  };

  const getDisplayStatus = (lead) => {
    const status = lead?.status;
    if (isExecutorRejectedState(lead)) return "Rejected by Executor";
    if (isDetailsMissingState(lead)) return "Action Required: Details Missing";
    if (isReviewDraftState(lead)) return "Review Draft";
    if (status === "PendingReview") return "PR Reviewing Documents";
    if (status === "PR_Accepted") return "Documents Verified";
    if (status === "AssignedToExecutor") return "Awaiting Executor Coordination";
    if (status === "InProgress") return "Execution in Progress";
    if (status === "ExecutionFinished") return "PR Performing Quality Review";
    if (status === "DraftSent") return "Draft Awaiting Your Approval";
    if (status === "DraftAccepted" || status === "UserAccepted") return "Waiting for Final Return Upload by PR";
    if (status === "DraftRejected") return "Rejected by User";
    if (status === "Rejected") return "Service Rejected";
    if (status === "Completed") return "Service Completed";
    if (status === "Open") return "Pending Verification";
    return status;
  };

  const getStatusTheme = (lead) => {
    const status = lead?.status;
    if (isExecutorRejectedState(lead)) {
      return { color: "#ef4444", bg: "rgba(239,68,68,0.12)" };
    }
    if (isDetailsMissingState(lead)) {
      return { color: "#ef4444", bg: "rgba(239,68,68,0.12)" };
    }
    if (isReviewDraftState(lead)) {
      return { color: "#8b5cf6", bg: "rgba(139,92,246,0.12)" };
    }
    if (status === "Completed") {
      return { color: "#10b981", bg: "rgba(16,185,129,0.1)" };
    }
    if (["InProgress", "AssignedToExecutor"].includes(status)) {
      return { color: "#4361ee", bg: "rgba(67,97,238,0.1)" };
    }
    if (
      status === "InformationRequired" ||
      status === "DraftRejected" ||
      status === "Rejected"
    ) {
      return { color: "#ef4444", bg: "rgba(239,68,68,0.12)" };
    }
    if (status === "DraftSent") {
      return { color: "#8b5cf6", bg: "rgba(139,92,246,0.12)" };
    }
    if (status === "PR_Accepted" || status === "DraftAccepted") {
      return { color: "#10b981", bg: "rgba(16,185,129,0.1)" };
    }
    return { color: "#f59e0b", bg: "rgba(245,158,11,0.1)" };
  };

  const handleDraftAction = async (leadId, action, feedbackText = "") => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const status = action === 'accept' ? 'DraftAccepted' : 'DraftRejected';
      const feedback =
        action === "reject" ? String(feedbackText || "").trim() : "";
      
      if (action === 'reject' && !feedback) return;

      await axios.patch(
        `${apiUrl}/leads/${leadId}`,
        { status, userMessage: feedback },
        { headers: { Authorization: `Bearer ${storedUser.token}` } }
      );
      
      toast.success(action === 'accept' ? "Draft Approved!" : "Feedback Sent");
      
      // Refresh
      const userId = storedUser?._id || storedUser?.id;
      const leadsRes = await axios.get(`${apiUrl}/leads?userId=${userId}`, {
        headers: { Authorization: `Bearer ${storedUser.token}` },
      });
      setLeads(leadsRes.data);

      if (action === "reject") {
        setDraftRejectDrafts((prev) => ({ ...prev, [leadId]: "" }));
        setDraftRejectingLeadId(null);
      }
    } catch (error) {
       toast.error("Failed to process selection");
    }
  };

  const openDraftRejectForm = (leadId) => {
    setDraftRejectingLeadId(leadId);
  };

  const submitDraftReject = async (leadId) => {
    const reason = String(draftRejectDrafts[leadId] || "").trim();
    if (!reason) {
      toast.error("Please enter a rejection message for PR");
      return;
    }

    await handleDraftAction(
      leadId,
      "reject",
      `Draft rejected by user: ${reason}`,
    );
  };

  if (loading) return <Loader minimal={true} />;

  return (
    <div
      className="home-page-shell"
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        color: "var(--text)",
        paddingTop: "clamp(80px, 12vw, 100px)",
        paddingBottom: "60px",
        position: "relative",
      }}
    >
      <div className="home-page-backdrop" aria-hidden="true" />
      {/* Background Gradient Texture */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 50% -20%, rgba(16, 185, 129, 0.05) 0%, transparent 50%)",
          pointerEvents: "none",
        }}
      />

      <style>{`
                @media (max-width: 768px) {
                    .dash-user-stats {
                        grid-template-columns: 1fr !important;
                        gap: 1rem !important;
                    }
                    .dash-portfolio-header {
                        flex-direction: column !important;
                        align-items: flex-start !important;
                        gap: 1rem !important;
                    }
                    .service-row {
                        flex-direction: column !important;
                        align-items: flex-start !important;
                        gap: 1rem !important;
                        padding: 1rem !important;
                    }
                    .service-row-actions {
                        width: 100% !important;
                        justify-content: space-between !important;
                        margin-top: 0.5rem;
                    }
                    .dash-detail-grid {
                        grid-template-columns: 1fr !important;
                        gap: 1.5rem !important;
                    }
                    .dash-container {
                        padding: 0 1rem !important;
                    }
                    .dash-stats-card {
                        padding: 1.5rem !important;
                    }
                    .dash-portfolio-card {
                        padding: 1.5rem !important;
                    }
                    .dash-dropdown-content {
                        padding: 1.5rem 1rem !important;
                    }
                    .dash-title {
                        font-size: 2rem !important;
                    }
                }
            `}</style>
      {/* Header / Stats Title */}
      <div
        className="dash-container"
        style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 2rem" }}
      >
        <div
          className="dash-header"
          style={{
            textAlign: "center",
            marginBottom: "3rem",
            marginTop: "4.5rem",
          }}
        >
          <h1
            className="dash-title"
            style={{
              fontSize: "2.5rem",
              fontWeight: 600,
              letterSpacing: "-0.02em",
              color: "var(--text)",
              marginBottom: "0.5rem",
            }}
          >
            Manage Your Services <span style={{ color: "#10b981" }}>.</span>
          </h1>
          <p
            style={{
              color: "var(--text-secondary)",
              fontSize: "1.1rem",
              fontWeight: 400,
            }}
          >
            Hello {storedUser.name || "User"}, track and control your active
            business milestones
          </p>
        </div>

        {/* Separate Stats Card inspired by image */}
        <PremiumCard
          className="dash-stats-card"
          highlight={statsHighlight}
          onClick={() => setStatsHighlight(!statsHighlight)}
          style={{
            padding: "2.5rem",
            marginBottom: "2.5rem",
            cursor: "pointer",
          }}
        >
          <div
            className="dash-user-stats"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
              gap: "1.5rem",
              width: "100%",
            }}
          >
            {[
              { label: "Pending", count: stats.pending, color: "#f59e0b" },
              {
                label: "In Progress",
                count: stats.inProgress,
                color: "#4361ee",
              },
              { label: "Completed", count: stats.completed, color: "#10b981" },
              {
                label: "Commitment",
                count: formatInr(stats.totalCommitment),
                color: "#22c55e",
              },
            ].map((item, idx) => (
              <div
                key={idx}
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  borderRadius: "20px",
                  padding: "1.5rem 1rem",
                  textAlign: "center",
                  transition: "all 0.3s ease",
                }}
              >
                <div
                  style={{
                    fontSize: "2.5rem",
                    fontWeight: 700,
                    color: "var(--text)",
                    lineHeight: 1,
                    marginBottom: "0.3rem",
                  }}
                >
                  {item.count}
                </div>
                <div
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    color: "var(--card-content-muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                  }}
                >
                  {item.label}
                </div>
              </div>
            ))}
          </div>
        </PremiumCard>

        <PremiumCard
          className="dash-portfolio-card"
          highlight={portfolioHighlight}
          onClick={() => setPortfolioHighlight(!portfolioHighlight)}
          style={{
            padding: "2.5rem",
            cursor: "default",
          }}
        >
          <div
            style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}
          >
            <div
              className="dash-portfolio-header"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1.5rem",
              }}
            >
              <h3
                className="dash-portfolio-title"
                style={{
                  fontSize: "1.8rem",
                  fontWeight: 800,
                  color: "var(--text)",
                }}
              >
                Service Portfolio
              </h3>
              <button
                className="btn btn-primary"
                onClick={() => navigate("/services")}
                style={{
                  padding: "0.6rem 1.4rem",
                  borderRadius: "30px",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  background: "linear-gradient(135deg, #10b981, #059669)",
                  border: "none",
                  boxShadow: "0 10px 20px -10px rgba(16, 185, 129, 0.5)",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  color: "white",
                }}
              >
                New Service <Plus size={16} />
              </button>
            </div>

            {leads.length > 0 ? (
              leads.map((lead, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.14,
                      delay: Math.min(i * 0.01, 0.06),
                    }}
                    whileHover={{
                      y: -2,
                      boxShadow: "0 10px 25px -10px rgba(0,0,0,0.5)",
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedId(expandedId === lead._id ? null : lead._id);
                    }}
                    className="service-row"
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      background:
                        expandedId === lead._id
                          ? "var(--dashboard-highlight-bg)"
                          : "var(--dashboard-row-bg)",
                      padding: "1.2rem 1.8rem",
                      borderRadius: "16px",
                      border:
                        expandedId === lead._id
                          ? "1px solid rgba(16, 185, 129, 0.3)"
                          : "1px solid var(--dashboard-card-border)",
                      transition: "all 0.16s ease",
                      cursor: "pointer",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.4rem",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.8rem",
                        }}
                      >
                        <h4
                          className="dash-service-name"
                          style={{
                            fontSize: "1.2rem",
                            fontWeight: 700,
                            color: "var(--text)",
                            margin: 0,
                          }}
                        >
                          {lead.serviceName}
                        </h4>
                      </div>
                      <div
                        className="dash-service-meta"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "1.2rem",
                        }}
                      >
                        <span
                          style={{
                            color: "var(--card-content-muted)",
                            fontSize: "0.75rem",
                            fontWeight: 500,
                          }}
                        >
                          Order ID: #{lead._id?.slice(-6).toUpperCase()}
                        </span>
                        <span
                          style={{
                            color: "var(--card-content-muted)",
                            fontSize: "0.75rem",
                          }}
                        >
                          {new Date(lead.createdAt).toLocaleDateString(
                            "en-IN",
                            { day: "numeric", month: "short" },
                          )}
                        </span>
                      </div>
                    </div>

                    <div
                      className="service-row-actions"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "1rem",
                      }}
                    >
                      {lead.status === "InProgress" && (
                        <div
                          style={{
                            width: "80px",
                            display: "flex",
                            flexDirection: "column",
                            gap: "4px",
                          }}
                        >
                          <div
                            style={{
                              width: "100%",
                              height: "3px",
                              background: "var(--border)",
                              borderRadius: "2px",
                              overflow: "hidden",
                            }}
                          >
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: "65%" }}
                              transition={{ duration: 0.35, delay: 0 }}
                              style={{ height: "100%", background: "#4361ee" }}
                            />
                          </div>
                        </div>
                      )}

                      {(lead.status === "DraftSent" ||
                        lead.status === "UserAccepted" ||
                        lead.status === "Completed") && (
                        <span
                          style={{
                            fontSize: "0.68rem",
                            fontWeight: 800,
                            letterSpacing: "0.02em",
                            padding: "6px 10px",
                            borderRadius: "999px",
                            color: getStatusTheme(lead).color,
                            background: getStatusTheme(lead).bg,
                            border: `1px solid ${getStatusTheme(lead).color}33`,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {getDisplayStatus(lead)}
                        </span>
                      )}

                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteService(lead, e)}
                          title="Remove service"
                          aria-label={`Remove ${lead.serviceName}`}
                          style={{
                            width: "24px",
                            height: "24px",
                            border: "none",
                            background: "transparent",
                            color: "#9ca3af",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            flexShrink: 0,
                            transition: "color 0.2s ease",
                            padding: 0,
                            transform: "translateY(-25px)",
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.color = "#d1d5db";
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.color = "#9ca3af";
                          }}
                        >
                          <X size={18} strokeWidth={2.6} />
                        </button>

                        <motion.div
                          animate={{
                            rotate: expandedId === lead._id ? 180 : 0,
                            background:
                              expandedId === lead._id
                                ? "rgba(16, 185, 129, 0.15)"
                                : "transparent",
                          }}
                          transition={{ duration: 0.14, ease: "easeOut" }}
                          style={{
                            width: "22px",
                            height: "22px",
                            borderRadius: "50%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color:
                              expandedId === lead._id
                                ? "#10b981"
                                : "#9ca3af",
                          }}
                        >
                          <ChevronDown size={20} />
                        </motion.div>
                      </div>
                    </div>
                  </motion.div>

                  {/* Dropdown Content */}
                  <AnimatePresence initial={false}>
                    {expandedId === lead._id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{
                          height: { duration: 0.16, ease: "easeOut" },
                          opacity: { duration: 0.1, ease: "linear" },
                        }}
                        style={{ overflow: "hidden" }}
                      >
                        <div
                          className="dash-dropdown-content"
                          style={{
                            padding: "2rem",
                            background: "var(--bg-card)",
                            borderRadius: "20px",
                            border: "1px solid var(--border)",
                            marginTop: "8px",
                            marginBottom: "16px",
                            display: "flex",
                            flexDirection: "column",
                            gap: "2rem",
                          }}
                        >
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns:
                                "repeat(auto-fit, minmax(180px, 1fr))",
                              gap: "2rem",
                            }}
                          >
                            <div>
                              <label
                                style={{
                                  fontSize: "0.65rem",
                                  fontWeight: 800,
                                  color: "var(--card-content-muted)",
                                  textTransform: "uppercase",
                                  letterSpacing: "0.1em",
                                }}
                              >
                                Service Status
                              </label>
                              <div style={{ marginTop: "8px" }}>
                                <span
                                  style={{
                                    fontSize: "0.8rem",
                                    fontWeight: 700,
                                    color: getStatusTheme(lead).color,
                                    background: getStatusTheme(lead).bg,
                                    padding: "6px 12px",
                                    borderRadius: "8px",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "6px",
                                  }}
                                >
                                  <div
                                    style={{
                                      width: "6px",
                                      height: "6px",
                                      borderRadius: "50%",
                                      background: "currentColor",
                                    }}
                                  />
                                  {getDisplayStatus(lead)}
                                </span>
                              </div>
                            </div>
                            <div>
                              <label
                                style={{
                                  fontSize: "0.65rem",
                                  fontWeight: 800,
                                  color: "var(--card-content-muted)",
                                  textTransform: "uppercase",
                                  letterSpacing: "0.1em",
                                }}
                              >
                                Target Timeline
                              </label>
                              <div
                                style={{
                                  fontSize: "1rem",
                                  color: "var(--text)",
                                  fontWeight: 600,
                                  marginTop: "8px",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "8px",
                                }}
                              >
                                <Clock
                                  size={16}
                                  style={{ color: "var(--card-content-muted)" }}
                                />
                                {new Date(
                                  new Date(lead.createdAt).getTime() +
                                    10 * 24 * 60 * 60 * 1000,
                                ).toLocaleDateString("en-IN", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </div>
                            </div>
                            <div>
                              <label
                                style={{
                                  fontSize: "0.65rem",
                                  fontWeight: 800,
                                  color: "var(--card-content-muted)",
                                  textTransform: "uppercase",
                                  letterSpacing: "0.1em",
                                }}
                              >
                                Total Commitment
                              </label>
                              <div
                                style={{
                                  fontSize: "1.2rem",
                                  color: "#10b981",
                                  fontWeight: 800,
                                  marginTop: "4px",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "2px",
                                }}
                              >
                                {formatInr(getLeadRevenueAmount(lead))}
                              </div>
                            </div>
                          </div>

                          {isDetailsMissingState(lead) &&
                            dismissedDetailsMissingSignatureByLead[lead._id] !==
                              getDetailsMissingSignature(lead) && (
                            <div 
                              style={{ 
                                background: "rgba(239, 68, 68, 0.05)", 
                                border: "1px solid rgba(239, 68, 68, 0.2)", 
                                padding: "1.5rem", 
                                borderRadius: "16px",
                                display: "flex",
                                flexDirection: "column",
                                gap: "0.5rem"
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", color: "#ef4444" }}>
                                <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                  <AlertCircle size={18} />
                                  <span style={{ fontWeight: 700, fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Action Required</span>
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    if (String(lead.prFeedback || "").trim()) {
                                      handleDeleteRejectionMessage(lead._id, e);
                                      return;
                                    }
                                    handleDismissDetailsMissingMessage(lead, e);
                                  }}
                                  title="Close message"
                                  style={{
                                    border: "1px solid rgba(239, 68, 68, 0.35)",
                                    background: "rgba(239, 68, 68, 0.18)",
                                    color: "#ffffff",
                                    width: "24px",
                                    height: "24px",
                                    borderRadius: "999px",
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                  }}
                                >
                                  <X size={14} strokeWidth={2.8} />
                                </button>
                              </div>
                              <p style={{ color: "var(--text)", fontSize: "0.95rem", margin: 0, fontWeight: 500 }}>
                                {getDetailsMissingMessage(lead)}
                              </p>
                            </div>
                          )}

                          {!isDetailsMissingState(lead) &&
                            !isExecutorRejectedState(lead) &&
                            String(lead.prFeedback || "").trim() && (
                            <div
                              style={{
                                background: "rgba(67, 97, 238, 0.07)",
                                border: "1px solid rgba(67, 97, 238, 0.22)",
                                padding: "1.5rem",
                                borderRadius: "16px",
                                display: "flex",
                                flexDirection: "column",
                                gap: "0.5rem",
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", color: "#4361ee" }}>
                                <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                  <AlertCircle size={18} />
                                  <span style={{ fontWeight: 700, fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                    Message from PR
                                  </span>
                                </span>
                                <button
                                  onClick={(e) => handleDeleteRejectionMessage(lead._id, e)}
                                  title="Remove PR message"
                                  style={{
                                    border: "1px solid rgba(67, 97, 238, 0.3)",
                                    background: "rgba(67, 97, 238, 0.15)",
                                    color: "#ffffff",
                                    width: "24px",
                                    height: "24px",
                                    borderRadius: "999px",
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                  }}
                                >
                                  <X size={14} strokeWidth={2.8} />
                                </button>
                              </div>
                              <p style={{ color: "var(--text)", fontSize: "0.95rem", margin: 0, fontWeight: 500 }}>
                                {lead.prFeedback}
                              </p>
                            </div>
                          )}

                          {isReviewDraftState(lead) && (
                            <div 
                              style={{ 
                                background: "rgba(139, 92, 246, 0.05)", 
                                border: "1px solid rgba(139, 92, 246, 0.2)", 
                                padding: "1.5rem", 
                                borderRadius: "16px",
                                display: "flex",
                                flexDirection: "column",
                                gap: "1rem",
                                marginBottom: "2rem"
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#8b5cf6" }}>
                                <Sparkles size={18} />
                                <span style={{ fontWeight: 700, fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Review Your Draft</span>
                              </div>
                              <p style={{ color: "var(--text)", fontSize: "0.95rem", margin: 0, fontWeight: 500 }}>
                                Your service draft is ready for review. Please check the document below and approve it if everything is correct.
                              </p>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/dashboard/review-draft/${lead._id}`);
                                }}
                                style={{
                                  background: "rgba(139, 92, 246, 0.1)",
                                  color: "#8b5cf6",
                                  border: "1px solid rgba(139, 92, 246, 0.3)",
                                  padding: "0.85rem",
                                  borderRadius: "12px",
                                  fontSize: "0.85rem",
                                  fontWeight: 700,
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  gap: "8px"
                                }}
                              >
                                <FileText size={16} /> View Draft
                              </button>

                              <div style={{ display: "flex", gap: "12px" }}>
                                <button 
                                  onClick={() => handleDraftAction(lead._id, 'accept')}
                                  style={{
                                    flex: 1,
                                    padding: "0.8rem",
                                    background: "#10b981",
                                    color: "white",
                                    border: "none",
                                    borderRadius: "12px",
                                    fontWeight: 700,
                                    cursor: "pointer",
                                    fontSize: "0.85rem",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: "8px"
                                  }}
                                >
                                  <CheckCircle size={16} /> Approve Draft
                                </button>
                                <button 
                                  onClick={() => openDraftRejectForm(lead._id)}
                                  style={{
                                    flex: 1,
                                    padding: "0.8rem",
                                    background: "rgba(239, 68, 68, 0.08)",
                                    color: "#ef4444",
                                    border: "1px solid rgba(239, 68, 68, 0.2)",
                                    borderRadius: "12px",
                                    fontWeight: 700,
                                    cursor: "pointer",
                                    fontSize: "0.85rem",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: "8px"
                                  }}
                                >
                                  <AlertCircle size={16} /> Reject Draft
                                </button>
                              </div>

                              {draftRejectingLeadId === lead._id && (
                                <div
                                  style={{
                                    marginTop: "0.9rem",
                                    padding: "0.95rem",
                                    borderRadius: "12px",
                                    background: "rgba(239, 68, 68, 0.06)",
                                    border: "1px solid rgba(239, 68, 68, 0.2)",
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "0.65rem",
                                  }}
                                >
                                  <div
                                    style={{
                                      fontSize: "0.72rem",
                                      fontWeight: 800,
                                      color: "#ef4444",
                                      textTransform: "uppercase",
                                      letterSpacing: "0.08em",
                                    }}
                                  >
                                    Send Rejection Message to PR
                                  </div>
                                  <textarea
                                    value={draftRejectDrafts[lead._id] || ""}
                                    onChange={(e) =>
                                      setDraftRejectDrafts((prev) => ({
                                        ...prev,
                                        [lead._id]: e.target.value,
                                      }))
                                    }
                                    rows={3}
                                    placeholder="Describe what needs to be changed in this draft..."
                                    style={{
                                      width: "100%",
                                      resize: "vertical",
                                      borderRadius: "10px",
                                      border: "1px solid rgba(255,255,255,0.12)",
                                      background: "rgba(0,0,0,0.25)",
                                      color: "white",
                                      padding: "0.8rem",
                                      outline: "none",
                                      fontSize: "0.85rem",
                                    }}
                                  />
                                  <div style={{ display: "flex", gap: "10px" }}>
                                    <button
                                      onClick={() => submitDraftReject(lead._id)}
                                      style={{
                                        padding: "0.68rem 0.95rem",
                                        borderRadius: "10px",
                                        border: "none",
                                        background: "#ef4444",
                                        color: "white",
                                        fontSize: "0.78rem",
                                        fontWeight: 800,
                                        cursor: "pointer",
                                      }}
                                    >
                                      Send to PR and Reject Draft
                                    </button>
                                    <button
                                      onClick={() => setDraftRejectingLeadId(null)}
                                      style={{
                                        padding: "0.68rem 0.95rem",
                                        borderRadius: "10px",
                                        border: "1px solid rgba(255,255,255,0.2)",
                                        background: "transparent",
                                        color: "var(--text-secondary)",
                                        fontSize: "0.78rem",
                                        fontWeight: 700,
                                        cursor: "pointer",
                                      }}
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          <div
                            className="dash-detail-grid"
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "2.5rem",
                              borderTop: "1px solid var(--border)",
                              paddingTop: "2rem",
                            }}
                          >
                            <div>
                              <label
                                style={{
                                  fontSize: "0.65rem",
                                  fontWeight: 800,
                                  color: "var(--card-content-muted)",
                                  textTransform: "uppercase",
                                  letterSpacing: "0.1em",
                                  display: "block",
                                  marginBottom: "1rem",
                                }}
                              >
                                Required Documents
                              </label>
                              <div
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: "0.8rem",
                                }}
                              >
                                {lead.documents && lead.documents.length > 0 ? (
                                  lead.documents.map((doc, idx) => (
                                    <div key={idx} style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
                                      <div
                                        style={{
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "space-between",
                                          gap: "12px",
                                          background: "var(--bg-card)",
                                          padding: "0.8rem 1.2rem",
                                          borderRadius: "12px",
                                          border: "1px solid var(--border)",
                                        }}
                                      >
                                        <div
                                          style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "12px",
                                            fontSize: "0.85rem",
                                            color: "var(--card-content-text)",
                                          }}
                                        >
                                          <FileText
                                            size={16}
                                            style={{ color: "#10b981" }}
                                          />{" "}
                                          <span>{doc.name}</span>
                                          {doc.status === "Rejected" && (
                                            <span
                                              style={{
                                                padding: "4px 10px",
                                                borderRadius: "999px",
                                                background: "rgba(239, 68, 68, 0.12)",
                                                color: "#ef4444",
                                                fontSize: "0.7rem",
                                                fontWeight: 800,
                                              }}
                                            >
                                              Reupload Required
                                            </span>
                                          )}
                                        </div>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            window.open(doc.url, "_blank");
                                          }}
                                          style={{
                                            background: "rgba(16, 185, 129, 0.1)",
                                            border:
                                              "1px solid rgba(16, 185, 129, 0.2)",
                                            color: "#10b981",
                                            padding: "5px 12px",
                                            borderRadius: "8px",
                                            fontSize: "0.75rem",
                                            fontWeight: 700,
                                            cursor: "pointer",
                                            transition: "all 0.2s ease",
                                          }}
                                          onMouseOver={(e) =>
                                            (e.currentTarget.style.background =
                                              "rgba(16, 185, 129, 0.2)")
                                          }
                                          onMouseOut={(e) =>
                                            (e.currentTarget.style.background =
                                              "rgba(16, 185, 129, 0.1)")
                                          }
                                        >
                                          View
                                        </button>
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <p
                                    style={{
                                      fontSize: "0.8rem",
                                      color: "var(--card-content-muted)",
                                      margin: 0,
                                      paddingLeft: "4px",
                                    }}
                                  >
                                    No documents uploaded yet.
                                  </p>
                                )}

                                {/* PDF-only notice */}
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                    padding: "0.55rem 0.9rem",
                                    background: "rgba(245, 158, 11, 0.06)",
                                    border: "1px solid rgba(245, 158, 11, 0.15)",
                                    borderRadius: "10px",
                                    marginTop: "0.4rem",
                                  }}
                                >
                                  <FileText size={13} color="#f59e0b" style={{ flexShrink: 0 }} />
                                  <span
                                    style={{
                                      fontSize: "0.7rem",
                                      fontWeight: 600,
                                      color: "#f59e0b",
                                      lineHeight: 1.4,
                                    }}
                                  >
                                    Only PDF documents are accepted
                                  </span>
                                </div>

                                <label
                                  style={{
                                    background: "var(--bg-card)",
                                    border: "1px dashed var(--border)",
                                    color:
                                      uploadingId === lead._id
                                        ? "#10b981"
                                        : "var(--card-content-muted)",
                                    padding: "0.8rem",
                                    borderRadius: "12px",
                                    fontSize: "0.8rem",
                                    fontWeight: 600,
                                    cursor:
                                      uploadingId ? "not-allowed" : "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: "10px",
                                    marginTop: "0.5rem",
                                    transition: "all 0.2s ease",
                                    opacity: (uploadingId && uploadingId !== lead._id) ? 0.5 : 1,
                                    pointerEvents: uploadingId ? "none" : "auto",
                                  }}
                                  onMouseOver={(e) => {
                                    if (!uploadingId) {
                                      e.currentTarget.style.borderColor =
                                        "rgba(16, 185, 129, 0.3)";
                                      e.currentTarget.style.color = "#10b981";
                                    }
                                  }}
                                  onMouseOut={(e) => {
                                    if (!uploadingId) {
                                      e.currentTarget.style.borderColor =
                                        "var(--border)";
                                      e.currentTarget.style.color =
                                        "var(--card-content-muted)";
                                    }
                                  }}
                                >
                                  {uploadingId === lead._id ? (
                                    <Loader2 size={16} className="animate-spin" />
                                  ) : (
                                    <Plus size={16} />
                                  )}
                                  {uploadingId === lead._id
                                    ? "Uploading..."
                                    : "Add Documents"}
                                  <input
                                    type="file"
                                    multiple
                                    accept=".pdf,application/pdf"
                                    hidden
                                    disabled={!!uploadingId}
                                    onChange={(e) => {
                                      if (e.target.files && e.target.files.length > 0) {
                                        handleUploadDocuments(
                                          lead._id,
                                          e.target.files,
                                        );
                                      }
                                    }}
                                  />
                                </label>

                              </div>
                            </div>

                            <div>
                              <label
                                style={{
                                  fontSize: "0.65rem",
                                  fontWeight: 800,
                                  color: "var(--card-content-muted)",
                                  textTransform: "uppercase",
                                  letterSpacing: "0.1em",
                                  display: "block",
                                  marginBottom: "1rem",
                                }}
                              >
                                Message to PR
                              </label>
                              {lead.adminMessage?.trim() && (
                                <div
                                  style={{
                                    marginBottom: "1rem",
                                    background: "rgba(16, 185, 129, 0.08)",
                                    border: "1px solid rgba(16, 185, 129, 0.2)",
                                    borderRadius: "14px",
                                    padding: "0.9rem 1rem",
                                  }}
                                >
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "space-between",
                                      fontSize: "0.68rem",
                                      fontWeight: 800,
                                      color: "#10b981",
                                      textTransform: "uppercase",
                                      letterSpacing: "0.08em",
                                      marginBottom: "0.4rem",
                                    }}
                                  >
                                    <span>Advisor Note</span>
                                    <button
                                      type="button"
                                      onClick={(e) =>
                                        handleDeleteAdvisorMessage(lead._id, e)
                                      }
                                      title="Delete advisor note"
                                      style={{
                                        background: "none",
                                        border: "none",
                                        color: "var(--text-muted)",
                                        cursor: "pointer",
                                        display: "inline-flex",
                                        alignItems: "center",
                                        padding: 0,
                                      }}
                                    >
                                      <X size={14} />
                                    </button>
                                  </div>
                                  <p
                                    style={{
                                      margin: 0,
                                      fontSize: "0.84rem",
                                      color: "var(--text)",
                                      lineHeight: 1.5,
                                    }}
                                  >
                                    {lead.adminMessage}
                                  </p>
                                </div>
                              )}
                              <div style={{ position: "relative" }}>
                                <textarea
                                  value={messageByLead[lead._id] || ""}
                                  onChange={(e) =>
                                    handleMessageChange(
                                      lead._id,
                                      e.target.value,
                                    )
                                  }
                                  placeholder="Need help or have updates? Message us here..."
                                  style={{
                                    width: "100%",
                                    minHeight: "120px",
                                    background: "var(--bg-card)",
                                    border: "1px solid var(--border)",
                                    borderRadius: "16px",
                                    padding: "1.2rem",
                                    color: "var(--text)",
                                    fontSize: "0.9rem",
                                    resize: "none",
                                    outline: "none",
                                    transition: "all 0.3s ease",
                                  }}
                                  onFocus={(e) =>
                                    (e.currentTarget.style.borderColor =
                                      "rgba(16, 185, 129, 0.3)")
                                  }
                                  onBlur={(e) =>
                                    (e.currentTarget.style.borderColor =
                                      "var(--border)")
                                  }
                                />
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSendMessageToPR(lead._id);
                                  }}
                                  style={{
                                    position: "absolute",
                                    bottom: "12px",
                                    right: "12px",
                                    background: "#10b981",
                                    border: "none",
                                    color: "white",
                                    padding: "8px 16px",
                                    borderRadius: "10px",
                                    fontSize: "0.75rem",
                                    fontWeight: 800,
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                    boxShadow:
                                      "0 4px 10px rgba(16, 185, 129, 0.3)",
                                    transition: "all 0.2s ease",
                                  }}
                                  onMouseOver={(e) =>
                                    (e.currentTarget.style.transform =
                                      "translateY(-2px)")
                                  }
                                  onMouseOut={(e) =>
                                    (e.currentTarget.style.transform =
                                      "translateY(0)")
                                  }
                                >
                                  Send Message <Send size={14} />
                                </button>
                              </div>
                              <p
                                style={{
                                  fontSize: "0.7rem",
                                  color: "var(--card-content-muted)",
                                  marginTop: "0.8rem",
                                  fontStyle: "italic",
                                }}
                              >
                                Our PR team typically responds within 4-6
                                business hours.
                              </p>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))
            ) : (
              <div
                className="dash-empty-state"
                style={{
                  textAlign: "center",
                  padding: "4rem 2rem",
                  background: "var(--bg-card)",
                  borderRadius: "32px",
                  border: "1px dashed var(--border)",
                }}
              >
                <AlertCircle
                  size={48}
                  color="var(--card-content-muted)"
                  style={{ marginBottom: "1.5rem" }}
                />
                <h4
                  style={{
                    color: "var(--card-content-text)",
                    fontSize: "1.2rem",
                    fontWeight: 700,
                  }}
                >
                  No active services found
                </h4>
                <p
                  style={{
                    color: "var(--card-content-muted)",
                    maxWidth: "300px",
                    margin: "1rem auto",
                  }}
                >
                  Start your journey by selecting a service from our curated
                  recommendations.
                </p>
                <button
                  onClick={() => navigate("/services")}
                  style={{
                    background: "rgba(16,185,129,0.1)",
                    border: "1px solid rgba(16,185,129,0.2)",
                    color: "#10b981",
                    padding: "0.6rem 1.5rem",
                    borderRadius: "12px",
                    fontWeight: 700,
                    marginTop: "1rem",
                    cursor: "pointer",
                  }}
                >
                  Explore Services
                </button>
              </div>
            )}
          </div>
        </PremiumCard>
        
        <ConfirmationModal
          isOpen={deleteConfirm.isOpen}
          title="Delete Service"
          message={`Are you sure you want to delete ${deleteConfirm.lead?.serviceName || "this service"}? This action cannot be undone.`}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteConfirm({ isOpen: false, lead: null, isLoading: false })}
          isLoading={deleteConfirm.isLoading}
        />
      </div>
    </div>
  );
};

export default UserDashboard;
