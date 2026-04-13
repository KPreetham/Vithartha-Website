import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import {
  LayoutDashboard,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Upload,
  Zap,
  Check,
  Loader2,
  Calendar,
  Layers,
  Target,
  Send,
  MessageSquare,
  X,
} from "lucide-react";
import Loader from "../components/Loader";
import ConfirmationModal from "../components/ConfirmationModal";
import {
  formatInr,
  getLeadRevenueAmount,
} from "../utils/servicePricing";

const ExecutorDashboard = () => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [uploadingId, setUploadingId] = useState(null);
  const [messageDrafts, setMessageDrafts] = useState({});
  const [rejectDrafts, setRejectDrafts] = useState({});
  const [rejectingLeadId, setRejectingLeadId] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, lead: null, isLoading: false });
  
  const storedUser = JSON.parse(localStorage.getItem("user"));

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const response = await axios.get(`${apiUrl}/leads`, {
        headers: { Authorization: `Bearer ${storedUser.token}` },
      });
      setLeads(response.data);
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
      toast.success(status === 'InProgress' ? "Assignment Accepted" : "Status Updated");
      fetchLeads();
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const handleUploadResult = async (leadId, file) => {
    if (!file) return;
    setUploadingId(leadId);
    const loadingToast = toast.loading("Uploading execution result...");

    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await axios.post(`${apiUrl}/leads/upload`, formData, {
        headers: { Authorization: `Bearer ${storedUser.token}` },
      });

      if (uploadRes.data.success) {
        await axios.patch(
          `${apiUrl}/leads/${leadId}`,
          {
            status: "ExecutionFinished",
            $push: {
              documents: {
                name: `EXEC_RESULT - ${file.name}`,
                url: uploadRes.data.url,
                type: "ExecutionResult",
                status: "Accepted",
                uploadedAt: new Date(),
              },
            },
          },
          { headers: { Authorization: `Bearer ${storedUser.token}` } }
        );

        toast.success("Work submitted successfully!", { id: loadingToast });
        fetchLeads();
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload result", { id: loadingToast });
    } finally {
      setUploadingId(null);
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

  const handleClearAdminMessage = async (leadId) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      await axios.patch(
        `${apiUrl}/leads/${leadId}`,
        { executorMessage: "" },
        { headers: { Authorization: `Bearer ${storedUser.token}` } }
      );
      toast.success("Admin message removed");
      fetchLeads();
    } catch (error) {
      toast.error("Failed to remove admin message");
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
      toast.success("Service deleted");
      setExpandedId((prev) => (prev === lead._id ? null : prev));
      setLeads((prev) => prev.filter((item) => item._id !== lead._id));
      setDeleteConfirm({ isOpen: false, lead: null, isLoading: false });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete service");
      setDeleteConfirm((prev) => ({ ...prev, isLoading: false }));
    }
  };

  const openRejectForm = (leadId) => {
    setExpandedId(leadId);
    setRejectingLeadId(leadId);
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

  if (loading) return <Loader minimal={true} />;

  const getDisplayStatus = (status) => {
    const map = {
      PR_Accepted: "Available",
      AssignedToExecutor: "Awaiting Accept",
      InProgress: "Accepted",
      ExecutionFinished: "Sent for PR Review",
      DraftSent: "Waiting for User Approval",
      DraftRejected: "Rejected by User",
      DraftAccepted: "Draft Approved",
      Completed: "Completed",
      Rejected: "Rejected",
    };
    return map[status] || status;
  };

  const activeCount = leads.filter(l => ["PR_Accepted", "AssignedToExecutor", "InProgress", "DraftRejected"].includes(l.status)).length;
  const doneCount = leads.filter(l => ["ExecutionFinished", "Completed"].includes(l.status)).length;
  const revenueCount = leads.reduce(
    (sum, lead) =>
      sum + (lead.status === "Rejected" ? 0 : getLeadRevenueAmount(lead)),
    0,
  );

  // Custom inline styles since Tailwind is not available
  const styles = {
    container: {
      maxWidth: "1200px",
      margin: "0 auto",
      padding: "0 2rem",
      width: "100%",
    },
    header: {
      textAlign: "center",
      marginBottom: "3.5rem",
      marginTop: "1.5rem",
    },
    statsGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
      gap: "1.5rem",
      marginBottom: "4rem",
    },
    statCard: {
      background: "var(--bg-card)",
      border: "1px solid var(--border)",
      borderRadius: "24px",
      padding: "2rem",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      backdropFilter: "blur(12px)",
      boxShadow: "var(--shadow-sm)",
    },
    leadCard: {
      background: "rgba(255, 255, 255, 0.02)",
      border: "1px solid var(--border)",
      borderRadius: "20px",
      marginBottom: "1rem",
      overflow: "hidden",
      transition: "var(--transition-base)",
    },
    leadHeader: {
      padding: "2rem",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
    },
    badge: (status) => ({
      padding: "6px 16px",
      borderRadius: "999px",
      fontSize: "0.7rem",
      fontWeight: "800",
      textTransform: "uppercase",
      letterSpacing: "0.05em",
      background:
        status === 'DraftRejected'
          ? "rgba(239, 68, 68, 0.1)"
          : status === 'InProgress'
            ? "rgba(255, 165, 0, 0.1)"
            : "rgba(67, 97, 238, 0.1)",
      color:
        status === 'DraftRejected'
          ? "#ef4444"
          : status === 'InProgress'
            ? "#ffa500"
            : "#4361ee",
    border: `1px solid ${
        status === 'DraftRejected'
          ? "rgba(239, 68, 68, 0.2)"
          : status === 'InProgress'
            ? "rgba(255, 165, 0, 0.2)"
            : "rgba(67, 97, 238, 0.2)"
      }`,
    })
  };

  const mobileStyles = `
    @media (max-width: 768px) {
      .executor-dashboard-page {
        padding-top: 100px !important;
      }
      .executor-container {
        padding: 0 1rem !important;
      }
      .executor-stats-grid {
        grid-template-columns: 1fr !important;
        margin-bottom: 2.5rem !important;
      }
      .executor-lead-header {
        flex-direction: column !important;
        align-items: flex-start !important;
        gap: 1.2rem !important;
        padding: 1.2rem 1rem !important;
      }
      .executor-lead-info {
        width: 100% !important;
      }
      .executor-header-actions {
        width: 100% !important;
        justify-content: space-between !important;
        flex-wrap: wrap !important;
      }
      .executor-action-btns {
        width: 100% !important;
        display: flex !important;
        gap: 8px !important;
        margin-bottom: 8px !important;
      }
      .executor-action-btns button {
        flex: 1 !important;
        justify-content: center !important;
      }
      .executor-modal-actions {
        flex-direction: column !important;
      }
      .executor-modal-actions button {
        width: 100% !important;
      }
      .executor-chat-input {
        flex-direction: column !important;
      }
      .executor-chat-input button {
        width: 100% !important;
        height: 50px !important;
        justify-content: center !important;
      }
      .executor-chat-input input {
        width: 100% !important;
      }
      .executor-expanded-content {
        padding: 1.5rem 1rem !important;
      }
      .executor-controls-grid {
        grid-template-columns: 1fr !important;
        gap: 2rem !important;
      }
    }
  `;

  return (
    <div className="executor-dashboard-page" style={{ minHeight: "100vh", background: "var(--bg)", paddingTop: "125px", color: "var(--text)" }}>
      <style>{mobileStyles}</style>
      <div className="executor-container" style={styles.container}>

        
        <header style={styles.header}>
          <h1 style={{ fontSize: "clamp(2rem, 5vw, 3.2rem)", fontWeight: 500, letterSpacing: "-0.02em", marginBottom: "0.8rem" }}>
            Executor <span style={{ color: "var(--v-blue)", fontWeight: 600 }}>Dashboard</span>
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "1rem", maxWidth: "600px", margin: "0 auto", opacity: 0.8 }}>
            Real-time management for professional service fulfillment and coordination.
          </p>
        </header>

        <section className="executor-stats-grid" style={styles.statsGrid}>
          <motion.div whileHover={{ y: -5, borderColor: "rgba(67, 97, 238, 0.3)" }} style={styles.statCard}>
             <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
                <div style={{ width: "52px", height: "52px", background: "rgba(67, 97, 238, 0.1)", border: "1px solid rgba(67, 97, 238, 0.2)", borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--v-blue)" }}>
                   <Zap size={26} />
                </div>
                <div>
                   <div style={{ fontSize: "2rem", fontWeight: 700, lineHeight: 1 }}>{activeCount}</div>
                   <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", marginTop: "4px", letterSpacing: "0.02em" }}>Active Tasks</div>
                </div>
             </div>
          </motion.div>

          <motion.div whileHover={{ y: -5, borderColor: "rgba(34, 197, 94, 0.3)" }} style={styles.statCard}>
             <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
                <div style={{ width: "52px", height: "52px", background: "rgba(34, 197, 94, 0.1)", border: "1px solid rgba(34, 197, 94, 0.2)", borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--v-green)" }}>
                   <CheckCircle size={26} />
                </div>
                <div>
                   <div style={{ fontSize: "2rem", fontWeight: 700, lineHeight: 1 }}>{doneCount}</div>
                   <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", marginTop: "4px", letterSpacing: "0.02em" }}>Completed</div>
                </div>
             </div>
          </motion.div>

           <motion.div whileHover={{ y: -5, borderColor: "rgba(34, 197, 94, 0.3)" }} style={styles.statCard}>
             <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
               <div style={{ width: "52px", height: "52px", background: "rgba(34, 197, 94, 0.1)", border: "1px solid rgba(34, 197, 94, 0.2)", borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--v-green)" }}>
                 <Target size={26} />
               </div>
               <div>
                 <div style={{ fontSize: "1.5rem", fontWeight: 700, lineHeight: 1 }}>{formatInr(revenueCount)}</div>
                 <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", marginTop: "4px", letterSpacing: "0.02em" }}>Total Revenue</div>
               </div>
             </div>
           </motion.div>
        </section>

        <main>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 600, marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "10px", color: "var(--text-secondary)" }}>
            <LayoutDashboard size={20} style={{ color: "var(--v-blue)" }} /> Active Services
          </h2>

          <div className="queue-container">
            {leads.length === 0 ? (
              <div style={{ textAlign: "center", padding: "5rem 2rem", background: "rgba(255,255,255,0.01)", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: "32px" }}>
                <AlertCircle size={48} style={{ color: "var(--text-muted)", marginBottom: "1rem" }} />
                <p style={{ color: "var(--text-muted)" }}>No tasks currently in your execution queue.</p>
              </div>
            ) : (
              leads.map((lead) => (
                <div key={lead._id} style={{
                  ...styles.leadCard,
                  borderColor: expandedId === lead._id ? "rgba(67, 97, 238, 0.4)" : "rgba(255,255,255,0.08)",
                  boxShadow: expandedId === lead._id ? "0 20px 40px -20px rgba(0,0,0,0.5)" : "none"
                }}>
                  <div className="executor-lead-header" style={styles.leadHeader} onClick={() => setExpandedId(expandedId === lead._id ? null : lead._id)}>
                    <div className="executor-lead-info" style={{ display: "flex", alignItems: "center", gap: "20px" }}>
                        <div style={{ width: "45px", height: "45px", flexShrink: 0, background: expandedId === lead._id ? "var(--v-blue)" : "var(--bg-card-alt)", color: expandedId === lead._id ? "white" : "var(--text-secondary)", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.3s" }}>
                           <FileText size={20} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                           <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "2px", wordBreak: "break-word" }}>{lead.serviceName}</h3>
                           <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "flex", flexDirection: "column", gap: "2px" }}>
                              <span>Client: {lead.name} • {lead.email}</span>
                              <span style={{ opacity: 0.6, fontSize: "0.75rem" }}>Reference: {lead._id.slice(-8).toUpperCase()}</span>
                           </div>
                        </div>
                    </div>
                    
                    <div className="executor-header-actions" style={{ display: "flex", alignItems: "center", gap: "0.9rem" }}>
                       {['PR_Accepted', 'AssignedToExecutor'].includes(lead.status) && (
                         <div className="executor-action-btns" style={{ display: "flex", gap: "8px" }} onClick={(e) => e.stopPropagation()}>
                           <button 
                             onClick={() => handleStatusUpdate(lead._id, 'InProgress')}
                             style={{ padding: "6px 14px", borderRadius: "8px", background: "var(--v-blue)", color: "white", border: "none", fontSize: "0.7rem", fontWeight: "700", cursor: "pointer", transition: "all 0.2s" }}
                           >
                             ACCEPT
                           </button>
                           <button 
                             onClick={() => openRejectForm(lead._id)}
                              style={{ padding: "6px 14px", borderRadius: "8px", background: "rgba(239, 68, 68, 0.14)", color: "#ffffff", border: "1px solid rgba(239, 68, 68, 0.35)", fontSize: "0.7rem", fontWeight: "700", cursor: "pointer", transition: "all 0.2s", display: "inline-flex", alignItems: "center", gap: "8px" }}
                           >
                              <X size={14} strokeWidth={2.8} /> REJECT
                           </button>
                         </div>
                       )}
                       <span style={styles.badge(lead.status)}>
                          {getDisplayStatus(lead.status)}
                       </span>
                       <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                         <button
                           type="button"
                           onClick={(e) => {
                             handleDeleteService(lead, e);
                           }}
                           title="Delete service"
                           aria-label={`Delete ${lead.serviceName}`}
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
                             padding: 0,
                             transition: "color 0.2s ease",
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

                         <ChevronDown size={18} style={{ 
                           transform: expandedId === lead._id ? "rotate(180deg)" : "rotate(0)", 
                           transition: "transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                           color: "#9ca3af"
                         }} />
                       </div>
                    </div>
                  </div>

                  <AnimatePresence>
                    {expandedId === lead._id && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        style={{ borderTop: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.01)" }}
                      >
                         <div className="executor-expanded-content" style={{ padding: "2.5rem" }}>
                            <div className="executor-controls-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "3rem" }}>
                               {/* Controls */}
                               <div className="col">
                                  <h4 style={{ fontSize: "0.7rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: "1.5rem" }}>Service Controls</h4>
                                  
                                  {['PR_Accepted', 'AssignedToExecutor'].includes(lead.status) && (
                                    <div className="executor-modal-actions" style={{ display: "flex", gap: "10px" }}>
                                      <button 
                                        onClick={() => handleStatusUpdate(lead._id, 'InProgress')}
                                        style={{ flex: 2, padding: "1.2rem", borderRadius: "16px", background: "var(--v-blue)", color: "white", fontWeight: 700, border: "none", cursor: "pointer" }}
                                      >
                                        Accept Assignment
                                      </button>
                                      <button 
                                        onClick={() => openRejectForm(lead._id)}
                                        style={{ flex: 1, padding: "1.2rem", borderRadius: "16px", background: "rgba(239, 68, 68, 0.14)", color: "#ffffff", border: "1px solid rgba(239, 68, 68, 0.35)", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
                                      >
                                        <X size={14} strokeWidth={2.8} /> Decline
                                      </button>
                                    </div>
                                  )}

                                  {rejectingLeadId === lead._id && (
                                    <div
                                      style={{
                                        marginTop: "1rem",
                                        padding: "1rem",
                                        borderRadius: "14px",
                                        background: "rgba(239, 68, 68, 0.06)",
                                        border: "1px solid rgba(239, 68, 68, 0.2)",
                                      }}
                                    >
                                      <div
                                        style={{
                                          fontSize: "0.72rem",
                                          fontWeight: 800,
                                          color: "#ef4444",
                                          textTransform: "uppercase",
                                          letterSpacing: "0.08em",
                                          marginBottom: "0.6rem",
                                        }}
                                      >
                                        Send Rejection Message to PR
                                      </div>
                                      <textarea
                                        value={rejectDrafts[lead._id] || ""}
                                        onChange={(e) =>
                                          setRejectDrafts((prev) => ({
                                            ...prev,
                                            [lead._id]: e.target.value,
                                          }))
                                        }
                                        rows={3}
                                        placeholder="Enter why you are rejecting this assignment..."
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
                                      <div className="executor-modal-actions" style={{ display: "flex", gap: "10px", marginTop: "0.7rem" }}>
                                        <button
                                          onClick={() => handleRejectAssignment(lead._id)}
                                          style={{
                                            padding: "0.7rem 1rem",
                                            borderRadius: "10px",
                                            border: "none",
                                            background: "#ef4444",
                                            color: "white",
                                            fontSize: "0.78rem",
                                            fontWeight: 800,
                                            cursor: "pointer",
                                          }}
                                        >
                                          Send to PR and Reject
                                        </button>
                                        <button
                                          onClick={() => setRejectingLeadId(null)}
                                          style={{
                                            padding: "0.7rem 1rem",
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

                                  {lead.status === 'InProgress' && (
                                    <div style={{ padding: "1.5rem", background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.3)", borderRadius: "16px", color: "var(--v-green)", display: "flex", alignItems: "center", gap: "12px" }}>
                                       <CheckCircle size={24} />
                                       <div>
                                          <div style={{ fontWeight: 800, fontSize: "0.9rem" }}>Service Accepted</div>
                                          <div style={{ fontSize: "0.75rem", opacity: 0.8 }}>PR coordinator will provide draft delivery.</div>
                                       </div>
                                    </div>
                                  )}

                                  {lead.status === 'ExecutionFinished' && (
                                    <div style={{ padding: "1.5rem", background: "rgba(34, 197, 94, 0.1)", border: "1px solid rgba(34, 197, 94, 0.3)", borderRadius: "16px", color: "var(--v-green)", display: "flex", alignItems: "center", gap: "12px" }}>
                                       <CheckCircle size={24} />
                                       <div>
                                          <div style={{ fontWeight: 800, fontSize: "0.9rem" }}>Work Submitted</div>
                                          <div style={{ fontSize: "0.75rem", opacity: 0.8 }}>Quality review by PR in progress</div>
                                       </div>
                                    </div>
                                  )}
                               </div>

                               {/* Message to PR */}
                               <div className="col">
                                  <h4 style={{ fontSize: "0.7rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: "1.5rem" }}>Message to PR</h4>

                                  {lead.executorMessage?.trim() && (
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
                                        <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                                          <MessageSquare size={13} /> Message from Admin
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => handleClearAdminMessage(lead._id)}
                                          title="Delete admin message"
                                          style={{
                                            background: "rgba(239, 68, 68, 0.18)",
                                            border: "1px solid rgba(239, 68, 68, 0.35)",
                                            color: "#ffffff",
                                            cursor: "pointer",
                                            display: "inline-flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            padding: 0,
                                            width: "24px",
                                            height: "24px",
                                            borderRadius: "999px",
                                          }}
                                        >
                                          <X size={14} strokeWidth={2.8} />
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
                                        {lead.executorMessage}
                                      </p>
                                    </div>
                                  )}

                                  <div className="executor-chat-input" style={{ display: "flex", gap: "10px", marginBottom: "1.5rem" }}>
                                        <input 
                                           placeholder="Send update or ask PR for info..."
                                           value={messageDrafts[lead._id] || ""}
                                           onChange={(e) => setMessageDrafts({...messageDrafts, [lead._id]: e.target.value})}
                                           style={{ flex: 1, padding: "1rem", borderRadius: "12px", background: "rgba(0,0,0,0.2)", color: "white", border: "1px solid rgba(255,255,255,0.1)", outline: "none", fontSize: "0.85rem" }}
                                        />
                                        <button 
                                           onClick={() => handleSendMessageToPR(lead._id, messageDrafts[lead._id])}
                                           style={{ width: "50px", height: "50px", borderRadius: "12px", background: "var(--v-blue)", color: "white", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                                        >
                                           <Send size={18}/>
                                        </button>
                                  </div>

                                  <div style={{ marginTop: "1.5rem" }}>
                                     <h4 style={{ fontSize: "0.7rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: "1rem" }}>Client Assets</h4>
                                     <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                                        {lead.documents?.map((doc, i) => (
                                          <a key={i} href={doc.url} target="_blank" rel="noreferrer" style={{ padding: "8px 12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", fontSize: "0.7rem", color: "white", textDecoration: "none", display: "flex", alignItems: "center", gap: "6px" }}>
                                             <FileText size={12} /> {doc.name.length > 20 ? doc.name.slice(0, 17) + '...' : doc.name}
                                          </a>
                                        ))}
                                     </div>
                                  </div>
                               </div>
                            </div>
                         </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))
            )}
          </div>
        </main>
        
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

export default ExecutorDashboard;
