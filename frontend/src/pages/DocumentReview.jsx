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
} from "lucide-react";
import axios from "axios";
import { toast } from "react-hot-toast";
import Loader from "../components/Loader";
import { getSecureDocumentUrl } from "../utils/documentViewer";

const DocumentReview = () => {
  const { leadId } = useParams();
  const navigate = useNavigate();
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [securePreviewUrl, setSecurePreviewUrl] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchLeadDetails = useCallback(async () => {
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      const apiUrl = import.meta.env.VITE_API_URL;
      const response = await axios.get(`${apiUrl}/leads/${leadId}`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      if (response.data) {
        setLead(response.data);
        if (response.data.documents?.length > 0 && !selectedDoc) {
          setSelectedDoc(response.data.documents[0]);
        }
      } else {
        toast.error("Service request not found");
        navigate("/admin");
      }
    } catch (error) {
      console.error("Error fetching lead:", error);
      toast.error("Failed to load details");
    } finally {
      setLoading(false);
    }
  }, [leadId, navigate, selectedDoc]);

  useEffect(() => {
    fetchLeadDetails();
  }, [fetchLeadDetails]);

  useEffect(() => {
    let cancelled = false;

    const loadSecurePreviewUrl = async () => {
      if (!selectedDoc?.publicId || !leadId) {
        setSecurePreviewUrl("");
        return;
      }

      try {
        const url = await getSecureDocumentUrl(selectedDoc.publicId, leadId);
        if (!cancelled) {
          setSecurePreviewUrl(url);
        }
      } catch (error) {
        if (!cancelled) {
          setSecurePreviewUrl("");
        }
        console.error("Failed to load secure preview URL:", error);
      }
    };

    loadSecurePreviewUrl();

    return () => {
      cancelled = true;
    };
  }, [leadId, selectedDoc?.publicId]);

  const handleDocumentAction = async (docId, status) => {
    setActionLoading(true);
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      const apiUrl = import.meta.env.VITE_API_URL;
      await axios.patch(
        `${apiUrl}/leads/${leadId}/documents/${docId}`,
        { status },
        {
          headers: { Authorization: `Bearer ${user.token}` },
        },
      );
      toast.success(
        `Document ${status === "Accepted" ? "approved" : "rejected"}`,
      );
      await fetchLeadDetails();

      // Move to next document if available and pending
      const nextDoc = lead.documents.find(
        (d) => d._id !== docId && d.status === "Pending",
      );
      if (nextDoc) setSelectedDoc(nextDoc);
    } catch (error) {
      toast.error("Action failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectService = async () => {
    setActionLoading(true);
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      const apiUrl = import.meta.env.VITE_API_URL;
      await axios.patch(
        `${apiUrl}/leads/${leadId}`,
        { status: "Rejected" },
        {
          headers: { Authorization: `Bearer ${user.token}` },
        },
      );
      toast.success("Service request rejected");
      navigate("/admin");
    } catch (error) {
      toast.error("Failed to reject service");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || !lead) return <Loader minimal={true} />;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#050505",
        color: "var(--text)",
        paddingTop: "clamp(80px, 12vw, 100px)",
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
            "radial-gradient(circle, rgba(34, 197, 94, 0.03) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "-10%",
          left: "-5%",
          width: "30%",
          height: "30%",
          background:
            "radial-gradient(circle, rgba(34, 197, 94, 0.02) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div className="container" style={{ position: "relative", zIndex: 1 }}>
        {/* Header Section */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "1rem",
            marginBottom: "2.5rem",
          }}
        >
          <button
            onClick={() => navigate("/admin")}
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
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "rgba(255,255,255,0.06)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "rgba(255,255,255,0.03)")
            }
          >
            <ChevronLeft size={20} />
          </button>
          <div>
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
                  color: "#22c55e",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                }}
              >
                Verification Chamber
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
                }}
              >
                Lead #{lead?._id?.slice(-6).toUpperCase() || "..."}
              </span>
            </div>
            <h1 style={{ fontSize: "1.8rem", fontWeight: 800, margin: 0 }}>
              Document Compliance Review
            </h1>
          </div>

          <div style={{ marginLeft: "auto", display: "flex", gap: "0.8rem" }}>
            <button
              onClick={handleRejectService}
              disabled={actionLoading}
              style={{
                background: "rgba(239, 68, 68, 0.03)",
                border: "1px solid rgba(239, 68, 68, 0.15)",
                color: "#ef4444",
                padding: "0.7rem 1.5rem",
                borderRadius: "14px",
                fontWeight: 700,
                fontSize: "0.9rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                transition: "all 0.3s",
              }}
            >
              <X size={18} /> Reject Lead
            </button>
            <button
              onClick={async () => {
                const allAccepted = lead?.documents?.every(
                  (d) => d.status === "Accepted",
                );
                if (!allAccepted) {
                  toast.error("Approve all documents first");
                  return;
                }
                setActionLoading(true);
                try {
                  const user = JSON.parse(localStorage.getItem("user"));
                  const apiUrl = import.meta.env.VITE_API_URL;
                  await axios.patch(
                    `${apiUrl}/leads/${leadId}`,
                    { status: "InProgress" },
                    {
                      headers: { Authorization: `Bearer ${user.token}` },
                    },
                  );
                  toast.success("Service accepted!");
                  navigate("/admin");
                } catch (error) {
                  toast.error("Failed to accept");
                } finally {
                  setActionLoading(false);
                }
              }}
              disabled={
                actionLoading ||
                !lead?.documents?.every((d) => d.status === "Accepted")
              }
              style={{
                background: lead?.documents?.every(
                  (d) => d.status === "Accepted",
                )
                  ? "#22c55e"
                  : "rgba(255,255,255,0.01)",
                border:
                  "1px solid " +
                  (lead?.documents?.every((d) => d.status === "Accepted")
                    ? "#22c55e"
                    : "rgba(255,255,255,0.05)"),
                color: lead?.documents?.every((d) => d.status === "Accepted")
                  ? "white"
                  : "rgba(255,255,255,0.1)",
                padding: "0.7rem 1.5rem",
                borderRadius: "14px",
                fontWeight: 800,
                fontSize: "0.9rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                boxShadow: lead?.documents?.every(
                  (d) => d.status === "Accepted",
                )
                  ? "0 8px 24px rgba(34, 197, 94, 0.3)"
                  : "none",
                transition: "all 0.3s",
              }}
            >
              <ShieldCheck size={18} /> Accept Service
            </button>
          </div>
        </div>

        {/* Main Review Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "320px 1fr",
            gap: "2rem",
            height: "calc(100vh - 250px)",
          }}
        >
          {/* Left Panel: Document List */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
              background: "rgba(255,255,255,0.01)",
              border: "1px solid rgba(255,255,255,0.05)",
              borderRadius: "24px",
              padding: "1.5rem",
              overflowY: "auto",
            }}
          >
            <h3
              style={{
                fontSize: "0.9rem",
                fontWeight: 800,
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: "0.5rem",
              }}
            >
              Submitted Files
            </h3>

            {lead.documents?.map((doc, idx) => (
              <div
                key={idx}
                onClick={() => setSelectedDoc(doc)}
                style={{
                  padding: "1rem",
                  borderRadius: "16px",
                  background:
                    selectedDoc?._id === doc._id
                      ? "rgba(34, 197, 94, 0.08)"
                      : "rgba(255,255,255,0.02)",
                  border:
                    "1px solid " +
                    (selectedDoc?._id === doc._id
                      ? "rgba(34, 197, 94, 0.2)"
                      : "rgba(255,255,255,0.04)"),
                  cursor: "pointer",
                  transition: "all 0.2s",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                }}
              >
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "10px",
                    background:
                      doc.status === "Accepted"
                        ? "rgba(16, 185, 129, 0.1)"
                        : doc.status === "Rejected"
                          ? "rgba(239, 68, 68, 0.1)"
                          : "rgba(255,255,255,0.04)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {doc.status === "Accepted" ? (
                    <Check size={18} color="#10b981" />
                  ) : doc.status === "Rejected" ? (
                    <X size={18} color="#ef4444" />
                  ) : (
                    <FileText size={18} color="rgba(255,255,255,0.3)" />
                  )}
                </div>
                <div style={{ flex: 1, overflow: "hidden" }}>
                  <div
                    style={{
                      fontSize: "0.85rem",
                      fontWeight: 700,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {doc.name}
                  </div>
                  <div
                    style={{
                      fontSize: "0.65rem",
                      color: "var(--text-muted)",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <Clock size={10} />{" "}
                    {new Date(doc.uploadedAt).toLocaleDateString()}
                  </div>
                </div>
                {selectedDoc?._id === doc._id && (
                  <ArrowRight size={14} color="#22c55e" />
                )}
              </div>
            ))}

            {/* User Details Context Card */}
            <div
              style={{
                marginTop: "auto",
                padding: "1.2rem",
                background: "rgba(255,255,255,0.03)",
                borderRadius: "20px",
                border: "1px solid rgba(255,255,255,0.05)",
              }}
            >
              <div
                style={{
                  fontSize: "0.7rem",
                  fontWeight: 800,
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  marginBottom: "0.8rem",
                }}
              >
                Client Context
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  marginBottom: "0.8rem",
                }}
              >
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "8px",
                    background: "#22c55e",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 900,
                    fontSize: "0.8rem",
                  }}
                >
                  {lead.name?.[0]}
                </div>
                <div>
                  <div style={{ fontSize: "0.85rem", fontWeight: 700 }}>
                    {lead.name}
                  </div>
                  <div
                    style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}
                  >
                    {lead.user?.profile?.industry || "General Business"}
                  </div>
                </div>
              </div>
              <div
                style={{
                  fontSize: "0.75rem",
                  padding: "8px 12px",
                  background: "rgba(34, 197, 94, 0.1)",
                  color: "#22c55e",
                  borderRadius: "8px",
                  fontWeight: 700,
                  textAlign: "center",
                  marginBottom: lead.userMessage ? "0.8rem" : 0,
                }}
              >
                {lead.serviceName}
              </div>
              {lead.userMessage && (
                <div
                  style={{
                    fontSize: "0.8rem",
                    color: "var(--text)",
                    background: "rgba(255,255,255,0.02)",
                    padding: "10px",
                    borderRadius: "8px",
                    border: "1px solid rgba(255,255,255,0.05)",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.65rem",
                      color: "#10b981",
                      fontWeight: 800,
                      textTransform: "uppercase",
                      display: "block",
                      marginBottom: "4px",
                    }}
                  >
                    User Message
                  </span>
                  {lead.userMessage}
                </div>
              )}
            </div>
          </div>

          {/* Right Panel: Document Preview & Actions */}
          <div
            style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}
          >
            <div
              style={{
                flex: 1,
                background: "rgba(255,255,255,0.01)",
                border: "1px solid rgba(255,255,255,0.05)",
                borderRadius: "24px",
                overflow: "hidden",
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "column",
              }}
            >
              {selectedDoc ? (
                <>
                  <div
                    style={{
                      position: "absolute",
                      top: "1.5rem",
                      right: "1.5rem",
                      display: "flex",
                      gap: "0.6rem",
                    }}
                  >
                    <a
                      href={securePreviewUrl || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => {
                        if (!securePreviewUrl) {
                          e.preventDefault();
                          toast.error("Document preview is not ready yet.");
                        }
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "10px 18px",
                        background: "white",
                        color: "black",
                        borderRadius: "12px",
                        fontSize: "0.8rem",
                        fontWeight: 800,
                        textDecoration: "none",
                      }}
                    >
                      <ExternalLink size={14} /> View Original
                    </a>
                    <button
                      style={{
                        padding: "10px",
                        background: "rgba(255,255,255,0.05)",
                        color: "white",
                        border: "none",
                        borderRadius: "12px",
                        cursor: "pointer",
                      }}
                    >
                      <Download size={18} />
                    </button>
                  </div>

                  {/* Document Preview Box */}
                  <div
                    style={{
                      width: "90%",
                      height: "85%",
                      background: "#1a1a1f",
                      borderRadius: "16px",
                      overflow: "hidden",
                      display: "flex",
                      flexDirection: "column",
                      border: "1px solid rgba(255,255,255,0.05)",
                    }}
                  >
                    <div
                      style={{
                        padding: "0.8rem 1.2rem",
                        background: "rgba(255,255,255,0.02)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                        }}
                      >
                        <FileText size={16} color="#22c55e" />
                        <span style={{ fontSize: "0.85rem", fontWeight: 700 }}>
                          {selectedDoc.name}
                        </span>
                      </div>
                      <div
                        style={{
                          padding: "4px 10px",
                          borderRadius: "6px",
                          fontSize: "0.65rem",
                          fontWeight: 800,
                          textTransform: "uppercase",
                          background:
                            selectedDoc.status === "Accepted"
                              ? "rgba(16, 185, 129, 0.1)"
                              : selectedDoc.status === "Rejected"
                                ? "rgba(239, 68, 68, 0.1)"
                                : "rgba(245, 158, 11, 0.1)",
                          color:
                            selectedDoc.status === "Accepted"
                              ? "#10b981"
                              : selectedDoc.status === "Rejected"
                                ? "#ef4444"
                                : "#f59e0b",
                        }}
                      >
                        {selectedDoc.status}
                      </div>
                    </div>
                    <div
                      style={{
                        flex: 1,
                        position: "relative",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {securePreviewUrl ? (
                        <iframe
                          src={securePreviewUrl}
                          title="Preview"
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
                            textAlign: "center",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: "1.2rem",
                          }}
                        >
                          <div
                            style={{
                              width: "80px",
                              height: "80px",
                              borderRadius: "24px",
                              background: "rgba(255,255,255,0.02)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <FileText size={32} color="rgba(255,255,255,0.1)" />
                          </div>
                          <div>
                            <div
                              style={{
                                fontSize: "1.1rem",
                                fontWeight: 800,
                                marginBottom: "0.4rem",
                              }}
                            >
                              Document Securely Stored
                            </div>
                            <div
                              style={{
                                fontSize: "0.85rem",
                                color: "rgba(255,255,255,0.4)",
                                maxWidth: "280px",
                                margin: "0 auto",
                                lineHeight: 1.5,
                              }}
                            >
                              Live preview is unavailable in this environment.
                              Please download the file for full inspection.
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                if (!selectedDoc?.publicId) {
                                  toast.error("Secure document reference is missing.");
                                  return;
                                }
                                const url = await getSecureDocumentUrl(selectedDoc.publicId, leadId);
                                window.open(url, "_blank", "noopener,noreferrer");
                              } catch (error) {
                                toast.error(error.message || "Failed to open document securely.");
                              }
                            }}
                            style={{
                              padding: "0.8rem 1.5rem",
                              background: "rgba(255,255,255,0.05)",
                              borderRadius: "12px",
                              color: "white",
                              textDecoration: "none",
                              fontSize: "0.85rem",
                              fontWeight: 700,
                              border: "1px solid rgba(255,255,255,0.1)",
                              cursor: "pointer",
                            }}
                          >
                            Open Secure Copy
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Decision Footer */}
                  <div
                    style={{
                      position: "absolute",
                      bottom: 0,
                      left: 0,
                      right: 0,
                      padding: "2rem",
                      background:
                        "linear-gradient(to top, rgba(0,0,0,0.8), transparent)",
                      display: "flex",
                      justifyContent: "center",
                      gap: "1.5rem",
                    }}
                  >
                    <button
                      onClick={() =>
                        handleDocumentAction(selectedDoc._id, "Rejected")
                      }
                      disabled={actionLoading}
                      style={{
                        padding: "1rem 2.5rem",
                        background: "rgba(239, 68, 68, 0.1)",
                        border: "1px solid rgba(239, 68, 68, 0.2)",
                        color: "#ef4444",
                        borderRadius: "18px",
                        fontWeight: 800,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        transition: "all 0.3s",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background =
                          "rgba(239, 68, 68, 0.2)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background =
                          "rgba(239, 68, 68, 0.1)")
                      }
                    >
                      <X size={20} /> Reject Document
                    </button>
                    <button
                      onClick={() =>
                        handleDocumentAction(selectedDoc._id, "Accepted")
                      }
                      disabled={actionLoading}
                      style={{
                        padding: "1rem 2.5rem",
                        background: "#22c55e",
                        border: "none",
                        color: "white",
                        borderRadius: "18px",
                        fontWeight: 800,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        transition: "all 0.3s",
                        boxShadow: "0 8px 32px rgba(34, 197, 94, 0.2)",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.transform = "translateY(-2px)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.transform = "translateY(0)")
                      }
                    >
                      <Check size={20} /> Approve Document
                    </button>
                  </div>
                </>
              ) : (
                <div
                  style={{
                    color: "var(--text-muted)",
                    fontSize: "0.9rem",
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      padding: "2rem",
                      background: "rgba(255,255,255,0.03)",
                      borderRadius: "50%",
                      marginBottom: "1rem",
                      display: "inline-flex",
                    }}
                  >
                    <AlertCircle size={32} />
                  </div>
                  <p>Select a document to begin review</p>
                </div>
              )}
            </div>

            {/* Metadata Info Panel */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "1rem",
              }}
            >
              {[
                {
                  icon: Info,
                  label: "Document Type",
                  value: "Government ID / Proof",
                  color: "#22c55e",
                },
                {
                  icon: ShieldCheck,
                  label: "Integrity Check",
                  value: "System Verified",
                  color: "#22c55e",
                },
                {
                  icon: Clock,
                  label: "Review Latency",
                  value: "< 2 Hours",
                  color: "#f59e0b",
                },
              ].map((item, i) => (
                <div
                  key={i}
                  style={{
                    padding: "1.2rem",
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.04)",
                    borderRadius: "20px",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                  }}
                >
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "10px",
                      background: item.color + "15",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <item.icon size={18} color={item.color} />
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: "0.65rem",
                        color: "var(--text-muted)",
                        fontWeight: 700,
                        textTransform: "uppercase",
                      }}
                    >
                      {item.label}
                    </div>
                    <div style={{ fontSize: "0.85rem", fontWeight: 700 }}>
                      {item.value}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentReview;
