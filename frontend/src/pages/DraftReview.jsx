import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  Check,
  X,
  FileText,
  ExternalLink,
  AlertCircle,
  ShieldCheck,
  Clock,
  Download,
  ArrowRight,
  Info,
  Sparkles,
  Loader2,
  Send,
} from "lucide-react";
import axios from "axios";
import { toast } from "react-hot-toast";
import Loader from "../components/Loader";
import { viewDocument, getSecureDocumentUrl } from "../utils/documentViewer";

const DraftReview = () => {
  const { leadId } = useParams();
  const navigate = useNavigate();
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [showAcceptConfirm, setShowAcceptConfirm] = useState(false);
  const [rejectMessage, setRejectMessage] = useState("");
  const [secureIframeUrl, setSecureIframeUrl] = useState("");

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const fetchLeadDetails = useCallback(async () => {
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      const apiUrl = import.meta.env.VITE_API_URL;
      const response = await axios.get(`${apiUrl}/leads/${leadId}`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      if (response.data) {
        setLead(response.data);
        // Find the latest draft
        const draftDocs = response.data.documents?.filter(
          (d) => d.type === "Draft",
        );
        if (draftDocs && draftDocs.length > 0) {
          setSelectedDoc(draftDocs[draftDocs.length - 1]);
        } else if (response.data.documents?.length > 0) {
          setSelectedDoc(response.data.documents[0]);
        }
      } else {
        toast.error("Service request not found");
        navigate("/dashboard");
      }
    } catch (error) {
      console.error("Error fetching lead:", error);
      toast.error("Failed to load details");
    } finally {
      setLoading(false);
    }
  }, [leadId, navigate]);

  useEffect(() => {
    fetchLeadDetails();
  }, [fetchLeadDetails]);

  useEffect(() => {
    const fetchSecureUrl = async () => {
      if (selectedDoc) {
        try {
          const url = await getSecureDocumentUrl(selectedDoc.publicId, selectedDoc.url, leadId);
          setSecureIframeUrl(url);
        } catch (error) {
          console.error("Error fetching secure URL:", error);
        }
      }
    };
    fetchSecureUrl();
  }, [selectedDoc, leadId]);

  const handleAcceptDraft = async () => {
    setActionLoading(true);
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      const apiUrl = import.meta.env.VITE_API_URL;
      await axios.patch(
        `${apiUrl}/leads/${leadId}`,
        {
          status: "DraftAccepted",
          userMessage:
            "Draft accepted by user. Please upload final return document.",
        },
        {
          headers: { Authorization: `Bearer ${user.token}` },
        },
      );
      toast.success("Draft accepted successfully!");
      navigate("/dashboard");
    } catch (error) {
      toast.error("Failed to accept draft");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectDraft = async () => {
    const reason = String(rejectMessage || "").trim();
    if (!reason) {
      toast.error("Please enter a rejection message for PR");
      return;
    }

    setActionLoading(true);
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      const apiUrl = import.meta.env.VITE_API_URL;
      await axios.patch(
        `${apiUrl}/leads/${leadId}`,
        {
          status: "DraftRejected",
          userMessage: `Draft rejected by user: ${reason}`,
        },
        {
          headers: { Authorization: `Bearer ${user.token}` },
        },
      );
      toast.success("Draft rejected and message sent to PR.");
      setShowRejectForm(false);
      setRejectMessage("");
      navigate("/dashboard");
    } catch (error) {
      toast.error("Failed to reject draft");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <Loader minimal={true} />;
  if (!lead) return null;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        color: "var(--text)",
        paddingTop: isMobile ? "92px" : "clamp(88px, 12vw, 110px)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background Decorations */}
      <div
        style={{
          position: "absolute",
          top: "-10%",
          right: "-5%",
          width: "40%",
          height: "40%",
          background:
            "radial-gradient(circle, rgba(16, 185, 129, 0.05) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div
        className="container"
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: "1200px",
          margin: "0 auto",
          padding: isMobile ? "0 1rem 1.25rem" : "0 2rem",
        }}
      >
        {/* Header Section */}
        <div
          style={{
            display: "flex",
            alignItems: isMobile ? "flex-start" : "center",
            flexWrap: isMobile ? "wrap" : "nowrap",
            gap: "1rem",
            marginBottom: isMobile ? "1.5rem" : "2.5rem",
          }}
        >
          <button
            onClick={() => navigate("/dashboard")}
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "14px",
              width: "44px",
              height: "44px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "var(--text-secondary)",
            }}
          >
            <ChevronLeft size={20} />
          </button>
          <div
            style={{
              minWidth: 0,
              flex: isMobile ? "1 1 calc(100% - 56px)" : "1 1 auto",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "4px",
              }}
            >
              <span
                style={{
                  fontSize: "0.7rem",
                  fontWeight: 800,
                  color: "#10b981",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                }}
              >
                Client Approval Portal
              </span>
              <div
                style={{
                  width: "4px",
                  height: "4px",
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.2)",
                }}
              />
              <span
                style={{
                  fontSize: "0.7rem",
                  fontWeight: 600,
                  color: "var(--text-muted)",
                  whiteSpace: "nowrap",
                }}
              >
                Service ID: #{lead._id.slice(-6).toUpperCase()}
              </span>
            </div>
            <h1
              style={{
                fontSize: isMobile ? "1.35rem" : "1.8rem",
                fontWeight: 800,
                margin: 0,
                lineHeight: 1.25,
              }}
            >
              Review Your Service Draft
            </h1>
          </div>

          <div
            style={{
              marginLeft: isMobile ? 0 : "auto",
              width: isMobile ? "100%" : "auto",
              display: "flex",
              gap: "0.8rem",
              flexDirection: isMobile ? "column-reverse" : "row",
            }}
          >
            <button
              onClick={() => setShowRejectForm(true)}
              disabled={actionLoading}
              style={{
                background: "rgba(239, 68, 68, 0.05)",
                border: "1px solid rgba(239, 68, 68, 0.2)",
                color: "#ef4444",
                padding: isMobile ? "0.8rem 1rem" : "0.7rem 1.5rem",
                borderRadius: "14px",
                fontWeight: 700,
                fontSize: "0.9rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                width: isMobile ? "100%" : "auto",
              }}
            >
              <X size={18} /> I Reject This Draft
            </button>
            <button
              onClick={() => setShowAcceptConfirm(true)}
              disabled={actionLoading}
              style={{
                background: "#10b981",
                border: "none",
                color: "white",
                padding: isMobile ? "0.85rem 1rem" : "0.7rem 1.5rem",
                borderRadius: "14px",
                fontWeight: 800,
                fontSize: "0.9rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                boxShadow: "0 8px 24px rgba(16, 185, 129, 0.3)",
                width: isMobile ? "100%" : "auto",
              }}
            >
              <Check size={18} /> Accept & Approve
            </button>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 1fr) 350px",
            gap: isMobile ? "1.1rem" : "2rem",
            marginBottom: "2rem",
          }}
        >
          {/* Document View */}
          <div
            style={{
              background: "rgba(255,255,255,0.01)",
              border: "1px solid rgba(255,255,255,0.05)",
              borderRadius: isMobile ? "18px" : "24px",
              overflow: "hidden",
              height: isMobile ? "62vh" : "100vh",
              minHeight: isMobile ? "440px" : "unset",
              maxHeight: isMobile ? "540px" : "700px",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                padding: isMobile ? "0.9rem 1rem" : "1rem 1.5rem",
                background: "rgba(255,255,255,0.02)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: isMobile ? "flex-start" : "center",
                flexDirection: isMobile ? "column" : "row",
                gap: isMobile ? "0.65rem" : 0,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  minWidth: 0,
                }}
              >
                <FileText size={18} color="#10b981" />
                <span
                  style={{
                    fontSize: "0.9rem",
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {selectedDoc?.name || "Draft Document"}
                </span>
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  onClick={() => viewDocument(selectedDoc?.publicId, selectedDoc?.url, leadId)}
                  style={{
                    padding: "8px 16px",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "white",
                    borderRadius: "10px",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <ExternalLink size={14} /> Full Screen
                </button>
              </div>
            </div>
            <div style={{ flex: 1 }}>
              {secureIframeUrl || selectedDoc?.url ? (
                <iframe
                  src={secureIframeUrl || selectedDoc.url}
                  title="Draft Preview"
                  style={{
                    width: "100%",
                    height: "100%",
                    border: "none",
                    background: "white",
                  }}
                />
              ) : (
                <div
                  style={{
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "column",
                    gap: "1.5rem",
                    padding: "2rem",
                    textAlign: "center",
                  }}
                >
                  <FileText size={48} color="rgba(255,255,255,0.1)" />
                  <div>
                    <h3 style={{ marginBottom: "0.5rem" }}>
                      Draft Ready for Download
                    </h3>
                    <p
                      style={{
                        color: "rgba(255,255,255,0.4)",
                        maxWidth: "300px",
                      }}
                    >
                      Your service draft has been prepared. Please download it
                      to review the details.
                    </p>
                  </div>
                  <a
                    href={selectedDoc?.url}
                    download
                    style={{
                      padding: "1rem 2rem",
                      background: "#10b981",
                      color: "white",
                      borderRadius: "15px",
                      fontWeight: 800,
                      textDecoration: "none",
                    }}
                  >
                    Download PDF Draft
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Meta Info */}
          <div
            style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}
          >
            <div
              style={{
                padding: isMobile ? "1.2rem" : "2rem",
                background: "rgba(16, 185, 129, 0.03)",
                border: "1px solid rgba(16, 185, 129, 0.1)",
                borderRadius: isMobile ? "18px" : "24px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  marginBottom: "1rem",
                }}
              >
                <Sparkles size={20} color="#10b981" />
                <h3 style={{ fontSize: "1.1rem", fontWeight: 800, margin: 0 }}>
                  Advisor Summary
                </h3>
              </div>
              <p
                style={{
                  fontSize: "0.9rem",
                  color: "rgba(255,255,255,0.7)",
                  lineHeight: 1.6,
                  margin: 0,
                  wordBreak: "break-word",
                }}
              >
                {lead.adminMessage ||
                  "Our team has completed the initial draft of your service. Please review the attached document carefully. If everything looks correct, click 'Accept & Approve' to proceed to the final step."}
              </p>
            </div>

            <div
              style={{
                padding: isMobile ? "1.2rem" : "2rem",
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.05)",
                borderRadius: isMobile ? "18px" : "24px",
              }}
            >
              <h3
                style={{
                  fontSize: "1rem",
                  fontWeight: 800,
                  marginBottom: "1.2rem",
                }}
              >
                Next Steps
              </h3>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1rem",
                }}
              >
                {[
                  {
                    icon: Check,
                    text: "Carefully review all details in the draft",
                    done: true,
                  },
                  {
                    icon: Clock,
                    text: "Upon approval, we will generate the final return",
                    done: false,
                  },
                  {
                    icon: ShieldCheck,
                    text: "Final documents will be available for download",
                    done: false,
                  },
                ].map((step, i) => (
                  <div key={i} style={{ display: "flex", gap: "12px" }}>
                    <div
                      style={{
                        width: "24px",
                        height: "24px",
                        borderRadius: "50%",
                        background: step.done
                          ? "rgba(16, 185, 129, 0.2)"
                          : "rgba(255,255,255,0.05)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <step.icon
                        size={14}
                        color={step.done ? "#10b981" : "rgba(255,255,255,0.3)"}
                      />
                    </div>
                    <span
                      style={{
                        fontSize: "0.85rem",
                        color: step.done ? "white" : "rgba(255,255,255,0.4)",
                      }}
                    >
                      {step.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div
              style={{
                padding: isMobile ? "1rem" : "1.5rem",
                background: "rgba(255,255,255,0.01)",
                border: "1px solid rgba(255,255,255,0.05)",
                borderRadius: isMobile ? "18px" : "24px",
                display: "flex",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "12px",
                  background: "rgba(67, 97, 238, 0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Info size={20} color="#4361ee" />
              </div>
              <div>
                <div
                  style={{
                    fontSize: "0.7rem",
                    fontWeight: 800,
                    color: "var(--text-muted)",
                    textTransform: "uppercase",
                  }}
                >
                  Need Help?
                </div>
                <div style={{ fontSize: "0.85rem", fontWeight: 700 }}>
                  Contact Support
                </div>
              </div>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {showRejectForm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                background: "rgba(0, 0, 0, 0.8)",
                backdropFilter: "blur(8px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 1000,
                padding: "1rem",
              }}
              onClick={() => setShowRejectForm(false)}
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                style={{
                  width: "100%",
                  maxWidth: "500px",
                  background: "#121422",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  borderRadius: "24px",
                  padding: "2rem",
                  boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
                  position: "relative",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    marginBottom: "1.5rem",
                    color: "#ef4444",
                  }}
                >
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "12px",
                      background: "rgba(239, 68, 68, 0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <AlertCircle size={24} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: "1.25rem", fontWeight: 800, margin: 0 }}>
                      Reject This Draft?
                    </h3>
                    <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.5)", margin: 0 }}>
                      Please provide feedback for the PR to improve the draft.
                    </p>
                  </div>
                </div>

                <textarea
                  value={rejectMessage}
                  onChange={(e) => setRejectMessage(e.target.value)}
                  rows={4}
                  placeholder="Describe what needs to be changed in this draft (e.g., incorrect names, missing details, etc.)..."
                  autoFocus
                  style={{
                    width: "100%",
                    resize: "none",
                    borderRadius: "16px",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    background: "rgba(255, 255, 255, 0.03)",
                    color: "white",
                    padding: "1rem",
                    outline: "none",
                    fontSize: "0.95rem",
                    marginBottom: "1.5rem",
                    lineHeight: 1.5,
                  }}
                />

                <div style={{ display: "flex", gap: "12px" }}>
                  <button
                    onClick={() => setShowRejectForm(false)}
                    style={{
                      flex: 1,
                      padding: "0.85rem",
                      borderRadius: "14px",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      background: "transparent",
                      color: "rgba(255,255,255,0.6)",
                      fontSize: "0.9rem",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRejectDraft}
                    disabled={actionLoading || !rejectMessage.trim()}
                    style={{
                      flex: 2,
                      padding: "0.85rem",
                      borderRadius: "14px",
                      border: "none",
                      background: "#ef4444",
                      color: "white",
                      fontSize: "0.9rem",
                      fontWeight: 800,
                      cursor: actionLoading || !rejectMessage.trim() ? "not-allowed" : "pointer",
                      opacity: actionLoading || !rejectMessage.trim() ? 0.7 : 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      boxShadow: "0 8px 20px rgba(239, 68, 68, 0.2)",
                    }}
                  >
                    {actionLoading ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <>
                        <Send size={18} /> Send Feedback & Reject
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}

          {showAcceptConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                background: "rgba(0, 0, 0, 0.8)",
                backdropFilter: "blur(8px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 1000,
                padding: "1rem",
              }}
              onClick={() => setShowAcceptConfirm(false)}
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                style={{
                  width: "100%",
                  maxWidth: "460px",
                  background: "#121422",
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                  borderRadius: "24px",
                  padding: "2rem",
                  boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
                  position: "relative",
                  textAlign: "center"
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div
                  style={{
                    width: "64px",
                    height: "64px",
                    borderRadius: "20px",
                    background: "rgba(16, 185, 129, 0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 1.5rem",
                    color: "#10b981"
                  }}
                >
                  <ShieldCheck size={32} />
                </div>
                
                <h3 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: "0.75rem", color: "white" }}>
                  Approve Draft?
                </h3>
                <p style={{ fontSize: "0.95rem", color: "rgba(255,255,255,0.6)", lineHeight: 1.6, marginBottom: "2rem" }}>
                  By approving this draft, you confirm that all details are correct. We will proceed to generate your final return documents.
                </p>

                <div style={{ display: "flex", gap: "12px" }}>
                  <button
                    onClick={() => setShowAcceptConfirm(false)}
                    style={{
                      flex: 1,
                      padding: "0.95rem",
                      borderRadius: "14px",
                      border: "1px solid rgba(255,255,255,0.1)",
                      background: "transparent",
                      color: "rgba(255,255,255,0.6)",
                      fontSize: "0.95rem",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Review Again
                  </button>
                  <button
                    onClick={handleAcceptDraft}
                    disabled={actionLoading}
                    style={{
                      flex: 1.5,
                      padding: "0.95rem",
                      borderRadius: "14px",
                      border: "none",
                      background: "#10b981",
                      color: "white",
                      fontSize: "0.95rem",
                      fontWeight: 800,
                      cursor: actionLoading ? "not-allowed" : "pointer",
                      opacity: actionLoading ? 0.7 : 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      boxShadow: "0 8px 20px rgba(16, 185, 129, 0.2)",
                    }}
                  >
                    {actionLoading ? (
                      <Loader2 size={20} className="animate-spin" />
                    ) : (
                      <>
                        <Check size={20} /> Approve Now
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
};

export default DraftReview;
