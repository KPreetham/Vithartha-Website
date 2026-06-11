import React, { useState, useEffect, useRef } from "react";
import { getStatusLabel, resolveExecutorLabel } from "../utils/statusLabels";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";
import axios from "axios";
import {
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  Eye,
  FileText,
  Loader2,
  Search,
  Send,
  Upload,
  TrendingUp,
  X,
  Sparkles,
  RefreshCw,
  MessageSquare,
  Briefcase,
} from "lucide-react";
import Loader from "../components/Loader";
import ConfirmationModal from "../components/ConfirmationModal";
import {
  formatInr,
  getOurFeeAmount,
  shouldCountLeadRevenue,
} from "../utils/servicePricing";
import { viewDocument } from "../utils/documentViewer";
import {
  loadHiddenServiceIds,
  saveHiddenServiceIds,
} from "../utils/hiddenServiceStorage";

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

const ExecutorDashboardModern = () => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [messageDrafts, setMessageDrafts] = useState({});
  const [rejectDrafts, setRejectDrafts] = useState({});
  const [rejectingLeadId, setRejectingLeadId] = useState(null);
  const [docRejectDrafts, setDocRejectDrafts] = useState({});
  const [rejectingDocKey, setRejectingDocKey] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, lead: null, isLoading: false });
  const [sentToPRLeads, setSentToPRLeads] = useState({});
  const [localDeleteConfirm, setLocalDeleteConfirm] = useState({ isOpen: false, lead: null });
  const [uploadingDraftId, setUploadingDraftId] = useState(null);
  const draftInputRef = useRef(null);
  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const currentUserId = storedUser?._id || storedUser?.id || "";
  const [hiddenLeads, setHiddenLeads] = useState(() => loadHiddenServiceIds("executor-dashboard", currentUserId));
  const [documentsOpen, setDocumentsOpen] = useState(true);
  const [syncedSidebarHeight, setSyncedSidebarHeight] = useState(null);
  const detailsPanelRef = useRef(null);
  const [isCompactMobile, setIsCompactMobile] = useState(
    () => (typeof window !== "undefined" ? window.innerWidth <= 480 : false),
  );
  const [isMobile, setIsMobile] = useState(
    () => (typeof window !== "undefined" ? window.innerWidth <= 768 : false),
  );

  useEffect(() => {
    setHiddenLeads(loadHiddenServiceIds("executor-dashboard", currentUserId));
  }, [currentUserId]);

  useEffect(() => {
    saveHiddenServiceIds("executor-dashboard", currentUserId, hiddenLeads);
  }, [currentUserId, hiddenLeads]);

  useEffect(() => {
    fetchLeads();
  }, []);

  useEffect(() => {
    const handleServiceDeleted = () => {
      fetchLeads();
    };
    const handleServiceDocumentAdded = () => {
      fetchLeads();
    };
    window.addEventListener("service-deleted", handleServiceDeleted);
    window.addEventListener("service-document-added", handleServiceDocumentAdded);
    return () => {
      window.removeEventListener("service-deleted", handleServiceDeleted);
      window.removeEventListener("service-document-added", handleServiceDocumentAdded);
    };
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setIsCompactMobile(window.innerWidth <= 480);
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
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
  }, [selectedLeadId, documentsOpen]);

  const fetchLeads = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const response = await axios.get(`${apiUrl}/leads`, {
        headers: { Authorization: `Bearer ${storedUser.token}` },
      });
      const data = Array.isArray(response.data) ? response.data : [];
      setLeads(data);
      const sentMap = {};
      data.forEach((l) => { if (l.draftSentToPR) sentMap[l._id] = true; });
      setSentToPRLeads(sentMap);
      // Always auto-select the first lead after a fresh load
      if (data.length > 0) {
        setSelectedLeadId((prev) => prev && data.some(l => l._id === prev) ? prev : data[0]._id);
      } else {
        setSelectedLeadId(null);
      }
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
      toast.success(status === "InProgress" ? "Accepted by Executor" : "Status updated");
      fetchLeads();
    } catch (error) {
      toast.error("Failed to update status");
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

  const handleClearPrMessage = async (leadId, e) => {
    if (e) e.stopPropagation();
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      await axios.patch(`${apiUrl}/leads/${leadId}`, { prToExecutorMessage: "" }, {
        headers: { Authorization: `Bearer ${storedUser.token}` },
      });
      fetchLeads();
    } catch (error) {
      toast.error("Failed to clear PR message");
    }
  };

  const handleClearAdminMessage = async (leadId, e) => {
    if (e) e.stopPropagation();
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      await axios.patch(`${apiUrl}/leads/${leadId}`, { adminToExecutorMessage: "" }, {
        headers: { Authorization: `Bearer ${storedUser.token}` },
      });
      fetchLeads();
    } catch (error) {
      toast.error("Failed to clear Admin message");
    }
  };

  const handleDraftUpload = async (leadId, file) => {
    if (!file) return;
    setSentToPRLeads((prev) => ({ ...prev, [leadId]: false }));
    const loadingToast = toast.loading("Uploading draft...");
    setUploadingDraftId(leadId);
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
            $push: {
              documents: {
                name: `DRAFT - ${file.name}`,
                url: uploadRes.data.url,
                publicId: uploadRes.data.filename,
                type: "Draft",
                status: "Uploaded",
                uploadedAt: new Date(),
              },
            },
            status: "ExecutionFinished",
            draftReadyToSend: true,
            draftSentToPR: false,
          },
          { headers: { Authorization: `Bearer ${storedUser.token}` } },
        );
        toast.success("Draft uploaded successfully", { id: loadingToast });
        fetchLeads();
      }
    } catch {
      toast.error("Draft upload failed", { id: loadingToast });
    } finally {
      setUploadingDraftId(null);
    }
  };

  const handleSendDraftToPR = async (leadId) => {
    setSentToPRLeads((prev) => ({ ...prev, [leadId]: true }));
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      await axios.patch(
        `${apiUrl}/leads/${leadId}`,
        { draftSentToPR: true },
        { headers: { Authorization: `Bearer ${storedUser.token}` } },
      );
      toast.success("Draft sent to PR for review");
      fetchLeads();
    } catch {
      setSentToPRLeads((prev) => ({ ...prev, [leadId]: false }));
      toast.error("Failed to send draft to PR");
    }
  };

  // Document-level accept
  const handleDocumentStatus = async (leadId, docId, status) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      await axios.patch(
        `${apiUrl}/leads/${leadId}/documents/${docId}/status`,
        { status },
        { headers: { Authorization: `Bearer ${storedUser.token}` } }
      );
      toast.success(`Document ${status}`);
      fetchLeads();
    } catch (error) {
      toast.error("Failed to update document status");
    }
  };

  // Document-level reject with message to PR
  const handleRejectDocumentWithMessage = async (leadId, doc) => {
    const docKey = `${leadId}:${doc._id}`;
    const reason = String(docRejectDrafts[docKey] || "").trim();
    if (!reason) {
      toast.error("Please enter a rejection reason for the PR");
      return;
    }
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      // 1. Mark the document as Rejected and store the message
      await axios.patch(
        `${apiUrl}/leads/${leadId}/documents/${doc._id}/status`,
        { status: "Rejected", rejectionMessage: reason },
        { headers: { Authorization: `Bearer ${storedUser.token}` } }
      );
      // 2. Send executor message to PR — phrased to avoid systemPhrases filter
      await axios.patch(
        `${apiUrl}/leads/${leadId}`,
        { executorMessage: `Executor flagged "${doc.name}": ${reason}` },
        { headers: { Authorization: `Bearer ${storedUser.token}` } }
      );
      toast.success("Rejection message sent to PR");
      setDocRejectDrafts((prev) => ({ ...prev, [docKey]: "" }));
      setRejectingDocKey(null);
      fetchLeads();
    } catch (error) {
      toast.error("Failed to reject document");
    }
  };

  const handleConfirmLocalDelete = () => {
    const lead = localDeleteConfirm.lead;
    if (!lead) return;
    setHiddenLeads((prev) => (prev.includes(lead._id) ? prev : [...prev, lead._id]));
    toast.success("Service removed from view");
    setLocalDeleteConfirm({ isOpen: false, lead: null });
  };

  const handleConfirmDelete = async () => {
    const lead = deleteConfirm.lead;
    setDeleteConfirm((prev) => ({ ...prev, isLoading: true }));
    
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      await axios.delete(`${apiUrl}/leads/${lead._id}`, {
        headers: { Authorization: `Bearer ${storedUser.token}` },
      });
      toast.success("Service deleted");
      setSelectedLeadId(null);
      fetchLeads();
      setDeleteConfirm({ isOpen: false, lead: null, isLoading: false });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete service");
      setDeleteConfirm((prev) => ({ ...prev, isLoading: false }));
    }
  };

  function getVisibleDocuments(lead) {
    let documents = Array.isArray(lead?.documents) ? lead.documents : [];

    // Filter out admin-added placeholder entries (adminAdded: true with no URL) so the document
    // only appears in the dashboard once the user has actually uploaded a file.
    documents = documents.filter(
      (d) => !(d?.adminAdded === true && !d?.url && !d?.publicId && !d?.secure_url && !d?.uploadedUrl)
    );

    // Show draft docs once the executor uploads one (InProgress/ExecutionFinished)
    // or after the draft has been sent to the client.
    const isDraftVisible = ["InProgress", "ExecutionFinished", "DraftSent", "DraftAccepted", "DraftRejected", "UserAccepted", "Completed"].includes(lead?.status);
    if (!isDraftVisible) {
      documents = documents.filter(doc => String(doc?.type || "").trim().toLowerCase() !== "draft");
    }

    const sorted = [...documents].sort((a, b) => {
      const aTime = new Date(a?.uploadedAt || a?.createdAt || 0).getTime();
      const bTime = new Date(b?.uploadedAt || b?.createdAt || 0).getTime();
      return bTime - aTime;
    });
    const latestDraft = sorted.find((doc) => String(doc?.type || "").trim().toLowerCase() === "draft");
    const latestFinal = sorted.find((doc) => String(doc?.type || "").trim().toLowerCase() === "final");
    const nonSpecialDocs = sorted.filter((doc) => {
      const type = String(doc?.type || "").trim().toLowerCase();
      return type !== "draft" && type !== "final";
    });
    const grouped = new Map();
    for (const doc of nonSpecialDocs) {
      const key = String(doc?.name || "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      if (!key) continue;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(doc);
    }
    const collapsed = Array.from(grouped.values()).map((group) => {
      const selected = group.find((doc) => !!doc?.displayReuploaded || !!doc?.reuploaded || String(doc?.status || "").trim().toLowerCase() === "reuploaded") || group[0];
      const draftRejected = String(lead?.status || "").trim().toLowerCase() === "draftrejected";
      const isDraftDocument = String(selected?.type || "").trim().toLowerCase() === "draft";
      return {
        ...selected,
        status: draftRejected && isDraftDocument ? "Rejected" : selected?.status,
        displayReuploaded: !!selected?.displayReuploaded || group.length > 1 || !!selected?.reuploaded || String(selected?.status || "").trim().toLowerCase() === "reuploaded",
      };
    });

    const appendedDocs = [];

    if (latestDraft) {
      appendedDocs.push({
        ...latestDraft,
        status: String(lead?.status || "").trim().toLowerCase() === "draftrejected" ? "Rejected" : latestDraft?.status,
        displayReuploaded:
          !!latestDraft?.displayReuploaded ||
          !!latestDraft?.reuploaded ||
          String(latestDraft?.status || "").trim().toLowerCase() === "reuploaded",
      });
    }

    if (latestFinal) {
      appendedDocs.push({
        ...latestFinal,
        status: latestFinal?.status,
        displayReuploaded:
          !!latestFinal?.displayReuploaded ||
          !!latestFinal?.reuploaded ||
          String(latestFinal?.status || "").trim().toLowerCase() === "reuploaded",
      });
    }

    return [...collapsed, ...appendedDocs];
  }

  function hasFinalDocument(lead) {
    return getVisibleDocuments(lead).some((doc) => {
      const docType = String(doc?.type || "").trim().toLowerCase();
      const docName = String(doc?.name || "").trim().toLowerCase();
      return docType === "final" || docName.startsWith("final");
    });
  }

  function getEffectiveServiceStatus(lead) {
    const rawStatus = String(lead?.status || "").trim();
    const rawStatusLower = rawStatus.toLowerCase();

    if (hasFinalDocument(lead) && !["rejected", "informationrequired"].includes(rawStatusLower)) {
      return "Completed";
    }

    // If only individual documents were rejected (service still active), return a
    // distinct internal status so the label shows "Rejected" without "by Executor".
    if (
      ["assignedtoexecutor", "inprogress"].includes(rawStatusLower) &&
      Array.isArray(lead?.documents) &&
      lead.documents.some((d) => d?.executorRejected === true)
    ) {
      return "DocumentsRejected";
    }

    return rawStatus;
  }

  function getDocumentDisplayStatus(lead, doc) {
    const leadStatusLower = String(lead?.status || "").trim().toLowerCase();
    const isDraftDocument = String(doc?.type || "").trim().toLowerCase() === "draft";
    const rawStatus = String(doc?.status || "").trim().toLowerCase();

    if (isDraftDocument) {
      if (["draftaccepted", "useraccepted", "completed"].includes(leadStatusLower)) return "Accepted";
      if (leadStatusLower === "draftrejected") return "Rejected";
      if (leadStatusLower === "draftsent") return "Draft Shared";
      if (["accepted", "verified", "approved", "completed"].includes(rawStatus)) return "Draft Uploaded";
      if (rawStatus === "rejected") return "Rejected";
      return "Draft Uploaded";
    }

    if (leadStatusLower === "rejected") return "Rejected";

    // Executor rejected this doc (regardless of whether PR has notified the client)
    if (doc.executorRejected) return "Rejected";

    // When the lead is assigned to executor, the executor must review all client docs fresh.
    // Override "Accepted" from PR to show "Pending Review" — executor hasn't reviewed yet.
    // Only show "Accepted"/"Rejected" once the executor themselves has acted on the doc.
    if (["pr_accepted", "assignedtoexecutor", "inprogress"].includes(leadStatusLower)) {
      // Executor explicitly accepted it → show Accepted
      if (rawStatus === "accepted" && doc.executorAccepted) return "Accepted";
      // Executor explicitly rejected it → show Rejected
      if (doc.executorRejected) return "Rejected";
      // Everything else → pending executor review
      return "Pending Review";
    }

    if (["accepted", "verified", "approved", "completed", "uploaded"].includes(rawStatus)) return "Accepted";
    if (rawStatus === "rejected") return "Rejected";
    if (["pending", "pendingreview", "", "waiting review"].includes(rawStatus)) return "Pending Review";
    return doc?.status || "Pending Review";
  }

  const getDisplayStatus = (lead) => {
    const status = typeof lead === "string" ? lead : getEffectiveServiceStatus(lead);
    const leadObj = typeof lead === "object" ? lead : null;
    // If executor sent draft to PR but PR hasn't forwarded to client yet, show "Draft Sent to PR"
    if (
      leadObj &&
      status === "ExecutionFinished" &&
      (!!leadObj.draftSentToPR || !!sentToPRLeads[leadObj._id])
    ) {
      return "Draft Sent to PR";
    }
    if (status === "DocumentsRejected") return "Rejected";
    return getStatusLabel(status, leadObj, "executor");
  };

  const getStatusTheme = (lead) => {
    const status = getEffectiveServiceStatus(lead);
    if (status === "ExecutionFinished" && (!!lead?.draftSentToPR || !!sentToPRLeads[lead?._id])) {
      return { color: "#7c3aed" };
    }
    const colors = {
      Open: { color: "#6b7280" },
      PendingReview: { color: "#f59e0b" },
      InformationRequired: { color: "#fb7185" },
      PR_Accepted: { color: "#0ea5e9" },
      AssignedToExecutor: { color: "#0ea5e9" },
      Completed: { color: "#16a34a" },
      InProgress: { color: "#16a34a" },
      Rejected: { color: "#ef4444" },
      DocumentsRejected: { color: "#ef4444" },
      PendingPRReview: { color: "#f59e0b" },
      DraftSent: { color: "#f59e0b" },
      ExecutionFinished: { color: "#16a34a" },
      DraftAccepted: { color: "#16a34a" },
      UserAccepted: { color: "#16a34a" },
      DraftRejected: { color: "#ef4444" },
      Closed: { color: "#6b7280" },
      default: { color: "#16a34a" }
    };
    return colors[status] || colors.default;
  };

  const isSystemMessage = (msg) => {
    if (!msg) return true;
    const lowMsg = String(msg).toLowerCase();
    const systemPhrases = [
      "draft accepted",
      "user accepted",
      "service accepted",
      "documents rejected",
      "service completed",
      "final return uploaded",
      "waiting for user",
      "pending pr approval",
      "action required",
      "rejected by executor",
      "assignment rejected",
      "draft shared",
      "draft approved",
      "draft rejected",
      "pr reviewing result"
    ];
    return systemPhrases.some(phrase => lowMsg.includes(phrase));
  };

  const userRole = String(storedUser?.role || "").trim().toLowerCase();
  const isSpecificExecutor = /^executor\d+$/.test(userRole);

  // Client-side filter — matches exactly what the backend query returns,
  // but acts as a safety net in case stale data or other leads slip through.
  const visibleLeads = leads.filter((lead) => {
    if (hiddenLeads.includes(lead._id)) return false;
    if (isSpecificExecutor) {
      const assignedTo = String(lead.assignedExecutor || "").trim().toLowerCase();
      const executorIdStr = String(lead.executorId?._id || lead.executorId || "").trim();
      const assignedToMe = assignedTo === userRole;
      const linkedToMe = executorIdStr === currentUserId;
      return assignedToMe || linkedToMe;
    }
    return true;
  });

  // Auto-select first visible lead whenever the list changes
  useEffect(() => {
    if (visibleLeads.length === 0) {
      setSelectedLeadId(null);
      return;
    }
    setSelectedLeadId((prev) =>
      prev && visibleLeads.some((l) => l._id === prev) ? prev : visibleLeads[0]._id
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leads]);
  const activeLead = visibleLeads.find((lead) => lead._id === selectedLeadId) || null;
  const filteredLeads = visibleLeads.filter(l =>
    !searchQuery.trim() || (
      l.serviceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l._id.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const stats = {
    active: visibleLeads.filter((l) => ["PR_Accepted", "AssignedToExecutor", "InProgress", "ExecutionFinished", "DraftSent", "DraftAccepted", "UserAccepted", "DraftRejected", "InformationRequired"].includes(getEffectiveServiceStatus(l))).length,
    completed: visibleLeads.filter((l) => getEffectiveServiceStatus(l) === "Completed").length,
    revenue: visibleLeads.reduce((sum, lead) => sum + (shouldCountLeadRevenue(lead) ? getOurFeeAmount(lead) : 0), 0)
  };

  const getServicesByStatus = (status) => {
    if (status === "active") {
      return visibleLeads.filter((l) => ["PR_Accepted", "AssignedToExecutor", "InProgress", "ExecutionFinished", "DraftSent", "DraftAccepted", "UserAccepted", "DraftRejected", "InformationRequired"].includes(getEffectiveServiceStatus(l)));
    }
    if (status === "completed") {
      return visibleLeads.filter((l) => getEffectiveServiceStatus(l) === "Completed");
    }
    return [];
  };

  const getTotalRevenueBreakdown = () => {
    const activeLeads = visibleLeads.filter((l) => ["PR_Accepted", "AssignedToExecutor", "InProgress", "ExecutionFinished", "DraftSent", "DraftAccepted", "UserAccepted", "DraftRejected", "InformationRequired"].includes(getEffectiveServiceStatus(l)));
    const completedLeads = visibleLeads.filter((l) => getEffectiveServiceStatus(l) === "Completed");

    return {
      active: activeLeads.reduce((sum, lead) => sum + (shouldCountLeadRevenue(lead) ? getOurFeeAmount(lead) : 0), 0),
      completed: completedLeads.reduce((sum, lead) => sum + (shouldCountLeadRevenue(lead) ? getOurFeeAmount(lead) : 0), 0),
      total: stats.revenue,
      high: stats.revenue,
      small: stats.revenue,
    };
  };

  const [serviceListModal, setServiceListModal] = React.useState(null);
  const [revenuePopup, setRevenuePopup] = React.useState(null);

  const handleServiceListClick = (status) => {
    const services = getServicesByStatus(status);
    setServiceListModal({ status, services });
  };

  const handleRevenuePopupClick = () => {
    const breakdown = getTotalRevenueBreakdown();
    const allLeads = filteredLeads.length > 0 ? filteredLeads : visibleLeads;
    const perService = allLeads
      .map((l) => ({
        serviceName: l.serviceName,
        amount: getOurFeeAmount(l) || 0,
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

  const allDocs = activeLead ? getVisibleDocuments(activeLead) : [];
  const clientOnlyDocs = allDocs.filter((doc) => {
    const t = String(doc?.type || "").trim().toLowerCase();
    return t !== "draft" && t !== "final";
  });
  const uploadedDocs = clientOnlyDocs.filter((doc) => {
    const status = String(doc?.status || "").trim().toLowerCase();
    return ["uploaded", "accepted", "verified", "approved", "completed"].includes(status) || !!doc?.url;
  });
  const totalDocCount = clientOnlyDocs.length;
  const uploadedDocCount = uploadedDocs.length;
  
  const getServiceProgressPercent = (lead) => {
    if (!lead) return 0;
    
    // Standardize percentages across all dashboards
    if (
      lead.status === "Rejected" &&
      lead?.executorServiceRejected === true &&
      lead?.prNotifiedClientServiceRejection !== true
    ) return 55;
    if (lead.status === "Rejected" && String(lead?.executorMessage || "").length > 0) return 20;
    if (lead.status === "InformationRequired") return 20;

    const status = getEffectiveServiceStatus(lead);
    const progressByStatus = {
      Open: 10,
      PendingReview: 20,
      InformationRequired: 20,
      PR_Accepted: 32,
      AssignedToExecutor: 45,
      InProgress: 60,
      PendingPRReview: 55,
      ExecutionFinished: 75,
      DraftSent: 82,
      DraftAccepted: 92,
      UserAccepted: 92,
      DraftRejected: 70,
      Rejected: 100,
      DocumentsRejected: 60,
      Completed: 100,
      Closed: 100,
    };
    return progressByStatus[status] ?? 0;
  };
  const progressPercent = getServiceProgressPercent(activeLead);
  
  const getProgressMessage = (lead) => {
    if (!lead) return "";
    const status = getEffectiveServiceStatus(lead);
    const statusMap = {
      Open: "Pending verification and initial review.",
      PendingReview: "Documents are being reviewed by PR.",
      InformationRequired: "Service rejected by PR. Action required.",
      PR_Accepted: "Documents verified. Awaiting executor assignment.",
      AssignedToExecutor: "Executor assigned. Service is starting.",
      InProgress: "Service accepted. Please upload the draft document below.",
      ExecutionFinished: "Draft uploaded. Ready to send to client.",
      DraftSent: "Draft sent to client. Awaiting user approval.",
      DraftAccepted: "Draft approved. Waiting for final completion.",
      UserAccepted: "Draft approved. Waiting for final completion.",
      DraftRejected: "Draft rejected. Waiting for revision.",
      Rejected: "Service has been rejected.",
      Completed: "Service completed successfully.",
    };
    return statusMap[status] || "Service is progressing through the workflow.";
  };

  const containerStyle = {
    minHeight: "100vh",
    background: "radial-gradient(circle at top, rgba(248, 250, 252, 1) 0%, rgba(241, 245, 249, 1) 50%, rgba(226, 232, 240, 1) 100%)",
    color: "#111111",
    paddingTop: isCompactMobile ? "clamp(112px, 16vw, 126px)" : "clamp(130px, 14vw, 150px)",
    paddingBottom: 64,
    position: "relative",
    overflow: "hidden",
  };

  if (loading) return <Loader minimal={true} />;

  return (
    <div className="home-page-shell executor-dashboard-shell" style={containerStyle}>
      <div className="home-page-backdrop" style={{ background: "#f8fafc" }} aria-hidden="true" />
      <style>{`
        .executor-dashboard-shell, .executor-dashboard-shell * {
          box-sizing: border-box;
        }
        .executor-dashboard-shell .dashboard-stat-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          margin-bottom: 0;
          align-items: stretch;
        }
        .executor-dashboard-shell .dashboard-shell {
          width: 100%;
          background: #f4f4f5;
          border: 1px solid rgba(17,24,39,0.08);
          border-radius: 0;
          box-shadow: none;
          overflow: hidden;
        }
        .executor-dashboard-shell .stat-card {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: default;
        }
        .executor-dashboard-shell .stat-card:hover {
          transform: translateY(-6px) scale(1.03);
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04) !important;
          border-color: rgba(17,24,39,0.18) !important;
          z-index: 10;
        }
        .executor-dashboard-shell .dashboard-shell-inner {
          padding: 10px 14px 10px;
        }
        .executor-dashboard-shell .dashboard-main-grid {
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
        .executor-dashboard-shell .dashboard-panels-divider {
          background: rgba(17,24,39,0.08);
          align-self: stretch;
          border-radius: 0;
        }
        .executor-dashboard-shell .dashboard-service-row {
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .executor-dashboard-shell .dashboard-service-row:hover {
          transform: scale(1.015) translateY(-2px);
          box-shadow: 0 6px 15px -4px rgba(0, 0, 0, 0.08);
          border-color: rgba(34, 197, 94, 0.2) !important;
          z-index: 2;
        }
        .executor-dashboard-shell .inner-card {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .executor-dashboard-shell .inner-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 20px -10px rgba(0, 0, 0, 0.12) !important;
          border-color: rgba(17,24,39,0.18) !important;
        }
        .executor-dashboard-shell .dashboard-sidebar-panel {
          height: auto;
          min-height: 0;
          display: flex;
          flex-direction: column;
          align-self: start;
        }
        .executor-dashboard-shell .dashboard-details-panel {
          height: auto;
          display: flex;
          flex-direction: column;
          align-self: start;
        }
        .executor-dashboard-shell .dashboard-sidebar-scroll,
        .executor-dashboard-shell .dashboard-details-scroll {
          flex: 0 0 auto;
          min-height: auto;
          overflow: visible;
          padding-right: 0;
          margin-right: 0;
        }
        .executor-dashboard-shell .dashboard-sidebar-scroll {
          height: 0;
          scrollbar-width: thin;
          scrollbar-color: #b8b8b8 transparent;
        }
        .executor-dashboard-shell .dashboard-sidebar-scroll::-webkit-scrollbar {
          width: 6px;
        }
        .executor-dashboard-shell .dashboard-sidebar-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .executor-dashboard-shell .dashboard-sidebar-scroll::-webkit-scrollbar-thumb {
          background: #b8b8b8;
          border-radius: 999px;
        }
        .executor-dashboard-shell .dashboard-sidebar-scroll::-webkit-scrollbar-thumb:hover {
          background: #9ca3af;
        }
        .executor-dashboard-shell .dashboard-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
        }
        .executor-dashboard-shell .dashboard-table th,
        .executor-dashboard-shell .dashboard-table td {
          padding: 13px 16px;
          border-bottom: 1px solid rgba(17, 24, 39, 0.08);
          text-align: left;
        }
        .executor-dashboard-shell .dashboard-table th {
          color: #6b7280;
          font-size: 0.8rem;
          font-weight: 700;
        }
        .executor-dashboard-shell .dashboard-search,
        .executor-dashboard-shell .dashboard-input {
          transition: all 0.2s ease;
        }
        .executor-dashboard-shell .dashboard-search:focus,
        .executor-dashboard-shell .dashboard-input:focus {
          border-color: #16a34a !important;
          box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.1);
          outline: none;
        }
        .executor-dashboard-shell .dashboard-documents-scroll {
          overflow-x: auto;
          overflow-y: hidden;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: thin;
          scrollbar-color: #b8b8b8 transparent;
          padding-bottom: 4px;
        }
        .executor-dashboard-shell .dashboard-documents-scroll::-webkit-scrollbar {
          height: 6px;
        }
        .executor-dashboard-shell .dashboard-documents-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .executor-dashboard-shell .dashboard-documents-scroll::-webkit-scrollbar-thumb {
          background: #b8b8b8;
          border-radius: 999px;
        }
        .executor-dashboard-shell .dashboard-documents-scroll::-webkit-scrollbar-thumb:hover {
          background: #9ca3af;
        }

        @media (max-width: 1200px) {
          .executor-dashboard-shell .dashboard-stat-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .executor-dashboard-shell .dashboard-main-grid {
            grid-template-columns: minmax(0, 1fr);
          }
          .executor-dashboard-shell .dashboard-panels-divider {
            display: none;
          }
        }
        @media (max-width: 768px) {
          .executor-dashboard-shell .dashboard-stat-grid {
            grid-template-columns: minmax(0, 1fr);
          }
          .executor-dashboard-shell .dashboard-documents-scroll .dashboard-table {
            min-width: 520px;
          }
          .executor-dashboard-shell .dashboard-sidebar-panel {
            height: auto;
            min-height: 0;
            max-height: 350px;
          }
          .executor-dashboard-shell .dashboard-sidebar-scroll {
            height: auto;
          }
          .executor-dashboard-shell .dashboard-details-panel {
            min-height: 0;
            max-height: none;
          }
        }
        @media (max-width: 480px) {
          .executor-dashboard-shell .dashboard-shell-inner {
            padding: 8px 10px 10px;
          }
          .executor-dashboard-shell .dashboard-main-grid {
            border-radius: 18px;
          }
          .executor-dashboard-shell .dashboard-sidebar-panel,
          .executor-dashboard-shell .dashboard-details-panel {
            padding: 14px 12px;
          }
          .executor-dashboard-shell .dashboard-table th,
          .executor-dashboard-shell .dashboard-table td {
            padding: 10px 10px;
            font-size: 0.76rem;
          }
        }
@media (max-width: 360px) {
  .executor-dashboard-shell .dashboard-shell-inner {
    padding: 6px 8px 8px;
  }
  .executor-dashboard-shell .dashboard-main-grid {
    gap: 8px;
  }
  .executor-dashboard-shell h1, .executor-dashboard-shell h2, .executor-dashboard-shell h3, .executor-dashboard-shell h4 {
    font-size: 0.85rem;
  }
  .executor-dashboard-shell .dashboard-table th,
  .executor-dashboard-shell .dashboard-table td {
    padding: 6px 8px;
    font-size: 0.7rem;
  }
  .executor-dashboard-shell .dashboard-search,
  .executor-dashboard-shell .dashboard-input {
    padding: 0.6rem 0.9rem 0.6rem 2rem;
    font-size: 0.78rem;
  }
}
      `}</style>

      <div style={{ width: "100%", maxWidth: "none", margin: 0, padding: "0 0 0.5rem", position: "relative", zIndex: 1 }}>
        <div style={{ marginBottom: isCompactMobile ? 24 : 40, textAlign: "center", padding: isCompactMobile ? "0 8px" : 0 }}>
          <h1 style={{ fontSize: isCompactMobile ? "1.65rem" : "2.2rem", fontWeight: 800, color: "#111111", letterSpacing: "-0.02em", marginBottom: isCompactMobile ? 8 : 12, lineHeight: 1.2 }}>
            {isSpecificExecutor
              ? <>{(() => { const m = userRole.match(/^executor(\d+)$/); return m ? `Executor ${m[1]}` : "Executor"; })()} <span style={{ color: "#16a34a" }}>Dashboard</span></>
              : <>Executor <span style={{ color: "#16a34a" }}>Dashboard</span></>
            }
          </h1>
          <p style={{ color: "#4b5563", fontSize: isCompactMobile ? "0.92rem" : "1.05rem", marginTop: 8, maxWidth: 700, margin: "0 auto", lineHeight: 1.5 }}>
            {isSpecificExecutor
              ? `Showing services assigned to you (${(() => { const m = userRole.match(/^executor(\d+)$/); return m ? `Executor ${m[1]}` : userRole; })()}).`
              : "Track and Manage Client Service Documents."
            }
          </p>
        </div>

        <div className="dashboard-shell">
          <div className="dashboard-shell-inner">
            <div className="dashboard-stat-grid">
              {[
                { label: "Active Services", value: stats.active, color: "#16a34a", onClick: () => handleServiceListClick("active") },
                { label: "Completed Services", value: stats.completed, color: "#16a34a", onClick: () => handleServiceListClick("completed") },
                { label: "Revenue (₹)", value: stats.revenue, color: "#16a34a", isMoney: true, onClick: handleRevenuePopupClick },
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
                    {card.isMoney ? (
                      <CountUp end={card.value} formatter={(v) => formatInr(v)} />
                    ) : (
                      <CountUp end={card.value} />
                    )}
                  </div>
                </PremiumCard>
              ))}
            </div>
          </div>
          <div style={{ height: 1, width: "100%", background: "rgba(17,24,39,0.08)", margin: "6px 0 8px 0" }} />

          <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: "16px", paddingLeft: isMobile ? 12 : 18 }}>
            <div style={{ position: "relative", width: isMobile ? "100%" : "360px" }}>
              <Search size={16} style={{ position: "absolute", left: isMobile ? 12 : 14, top: "50%", transform: "translateY(-50%)", color: "#6b7280" }} />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search services..."
                className="dashboard-search"
                style={{
                  width: "100%",
                  padding: isMobile ? "0.76rem 0.9rem 0.76rem 2.45rem" : "0.82rem 1rem 0.82rem 2.65rem",
                  background: "#ffffff",
                  border: "1px solid rgba(17,24,39,0.08)",
                  borderRadius: 12,
                  color: "#111111",
                  outline: "none",
                }}
              />
            </div>
          </div>

          <div className="dashboard-shell-inner" style={{ paddingTop: 0 }}>
            <div className="dashboard-main-grid">
              <div
                className="dashboard-sidebar-panel"
                style={{
                  padding: isMobile ? "16px 12px" : "20px 18px",
                  background: "#ffffff",
                  height: syncedSidebarHeight ? `${syncedSidebarHeight}px` : "auto",
                  maxHeight: syncedSidebarHeight ? `${syncedSidebarHeight}px` : "none",
                  overflow: syncedSidebarHeight ? "hidden" : "visible",
                }}
              >
                <div style={{ marginBottom: 14 }}>
                  <h2 style={{ fontSize: isMobile ? "0.98rem" : "1.05rem", fontWeight: 700, marginBottom: 4, color: "#111111" }}>User Services</h2>
                  <p style={{ color: "#6b7280", fontSize: isMobile ? "0.77rem" : "0.82rem" }}>{filteredLeads.length} request{filteredLeads.length === 1 ? "" : "s"}</p>
                </div>

                <div className="dashboard-sidebar-scroll" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {filteredLeads.length > 0 ? (
                    filteredLeads.map((item, index) => {
                      const selected = item._id === selectedLeadId;
                      const theme = getStatusTheme(item);
                      return (
                        <motion.div
                           key={item._id}
                           initial={{ opacity: 0, y: 8 }}
                           animate={{ opacity: 1, y: 0 }}
                           transition={{ duration: 0.14, delay: Math.min(index * 0.02, 0.12) }}
                           onClick={() => setSelectedLeadId(item._id)}
                           className={`dashboard-service-row ${selected ? "active" : ""}`}
                           style={{
                             padding: isMobile ? "14px 12px" : "16px 16px 16px 18px",
                             borderRadius: 16,
                             border: selected ? "1px solid rgba(34,197,94,0.45)" : "1px solid rgba(17,24,39,0.08)",
                             background: selected ? "rgba(16,185,129,0.08)" : "#ffffff",
                             cursor: "pointer",
                           }}
                        >
                           <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "flex-start" : "center", justifyContent: "space-between", gap: isMobile ? 8 : 10, marginBottom: 6 }}>
                             <div style={{ minWidth: 0, flex: 1 }}>
                               <div style={{ fontSize: isMobile ? "0.92rem" : "0.98rem", fontWeight: 700, marginBottom: 4, whiteSpace: "normal", lineHeight: 1.25, color: "#111111" }}>{item.serviceName}</div>
                               <div style={{ color: "#6b7280", fontSize: "0.8rem" }}>{item.name}</div>
                             </div>
                             <span style={{ color: theme.color, fontSize: "0.86rem", fontWeight: 700, display: "flex", alignItems: "center", gap: 6, marginLeft: isMobile ? 0 : "auto" }}>
                               {getEffectiveServiceStatus(item) === "Completed" && <CheckCircle size={14} />}
                               {getDisplayStatus(item)}
                             </span>
                           </div>
                           <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
                             <button
                               onClick={(e) => { e.stopPropagation(); setLocalDeleteConfirm({ isOpen: true, lead: item }); }}
                               title="Remove from view"
                               style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 24, height: 24, background: "transparent", border: "none", color: "#6b7280", cursor: "pointer", borderRadius: "50%", transition: "all 0.2s" }}
                               onMouseEnter={(e) => { e.currentTarget.style.color = "#ef4444"; e.currentTarget.style.background = "rgba(239, 68, 68, 0.08)"; }}
                               onMouseLeave={(e) => { e.currentTarget.style.color = "#6b7280"; e.currentTarget.style.background = "transparent"; }}
                             >
                               <X size={14} />
                             </button>
                           </div>
                        </motion.div>
                      );
                    })
                  ) : (
                    <div style={{ padding: "28px 16px", textAlign: "center", color: "#6b7280" }}>No requests found.</div>
                  )}
                </div>
              </div>

              <div className="dashboard-panels-divider" />              <div
                ref={detailsPanelRef}
                className="dashboard-details-panel"
                style={{ padding: isMobile ? "16px 12px" : "22px 24px", background: "#ffffff" }}
              >
                {activeLead ? (
                  <div className="dashboard-details-scroll" style={{ display: "flex", flexDirection: "column", gap: isMobile ? 14 : 18 }}>
                    <div style={{ display: "flex", alignItems: isMobile ? "flex-start" : "center", justifyContent: "space-between", gap: 18, flexWrap: "wrap", flexDirection: isMobile ? "column" : "row" }}>
                      <div style={{ minWidth: 0 }}>
                        <h2 style={{ fontSize: isMobile ? "1.2rem" : "1.45rem", fontWeight: 700, marginBottom: 8, color: "#111111" }}>{activeLead.serviceName}</h2>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: isMobile ? 10 : 14, color: "#6b7280", fontSize: "0.84rem" }}>
                           <span>Client: {activeLead.name}</span>
                           <span>ID: #{activeLead._id.slice(-6).toUpperCase()}</span>
                           <span>Value: <strong style={{ color: "#16a34a" }}>{formatInr(getOurFeeAmount(activeLead))}</strong></span>
                        </div>
                      </div>
                      <span style={{ color: getStatusTheme(activeLead).color, fontWeight: 700, fontSize: "1rem", display: "flex", alignItems: "center", gap: 8 }}>
                        {getEffectiveServiceStatus(activeLead) === "Completed" && <CheckCircle size={16} />}
                        {getDisplayStatus(activeLead)}
                      </span>
                    </div>

                    {/* Messages Section */}
                    {activeLead.adminToExecutorMessage && !isSystemMessage(activeLead.adminToExecutorMessage) && (
                      <div className="inner-card" style={{ padding: 16, borderRadius: 18, border: "1px solid rgba(16,185,129,0.22)", background: "rgba(16,185,129,0.05)" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 8, color: "#16a34a" }}>
                          <strong style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><Sparkles size={16} /> Message from Admin</strong>
                          <button type="button" onClick={(e) => handleClearAdminMessage(activeLead._id, e)} style={{ width: 26, height: 26, borderRadius: 999, border: "1px solid rgba(0,0,0,0.12)", background: "transparent", color: "inherit", cursor: "pointer" }}>×</button>
                        </div>
                        <div style={{ color: "#111111", fontSize: "0.95rem" }}>{activeLead.adminToExecutorMessage}</div>
                      </div>
                    )}

                    {activeLead.prToExecutorMessage && !isSystemMessage(activeLead.prToExecutorMessage) && (
                      <div className="inner-card" style={{ padding: 16, borderRadius: 18, border: "1px solid rgba(59,130,246,0.22)", background: "rgba(59,130,246,0.05)" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 8, color: "#3b82f6" }}>
                          <strong style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><MessageSquare size={16} /> Message from PR</strong>
                          <button type="button" onClick={(e) => handleClearPrMessage(activeLead._id, e)} style={{ width: 26, height: 26, borderRadius: 999, border: "1px solid rgba(0,0,0,0.12)", background: "transparent", color: "inherit", cursor: "pointer" }}>×</button>
                        </div>
                        <div style={{ color: "#111111", fontSize: "0.95rem" }}>{activeLead.prToExecutorMessage}</div>
                      </div>
                    )}

                    {/* Progress Bar Section */}
                    <PremiumCard className="inner-card" style={{ padding: isMobile ? 14 : 16, borderRadius: 18, background: "#ffffff", border: "1px solid rgba(17,24,39,0.14)", boxShadow: "none" }}>
                      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1.35fr auto", gap: 14, alignItems: "center" }}>
                        <div>
                          <div style={{ color: "#6b7280", fontSize: "0.82rem", marginBottom: 8, fontWeight: 500 }}>Service Progress</div>
                          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                            <span style={{ fontSize: "1.55rem", fontWeight: 700 }}>{uploadedDocCount} / {totalDocCount || 0}</span>
                            <span style={{ color: "#6b7280", fontSize: "0.88rem" }}>uploaded</span>
                          </div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                          <div style={{ width: "100%", height: 10, background: "rgba(17,24,39,0.08)", borderRadius: 999, overflow: "hidden" }}>
                            <div style={{ width: `${progressPercent}%`, height: "100%", borderRadius: 999, background: "linear-gradient(90deg, #22c55e, #14b8a6)" }} />
                          </div>
                          <div style={{ color: "#6b7280", fontSize: "0.84rem" }}>{getProgressMessage(activeLead)}</div>
                        </div>
                        <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "#111111", textAlign: isMobile ? "left" : "right" }}>{Math.round(progressPercent)}%</div>
                      </div>
                    </PremiumCard>

                    {/* Documents Section */}
                    <PremiumCard className="inner-card" style={{ padding: 0, overflow: "hidden", background: "#ffffff", border: "1px solid rgba(17,24,39,0.14)", boxShadow: "none" }}>
                      <div 
                        onClick={() => setDocumentsOpen(!documentsOpen)}
                        style={{ padding: isMobile ? "12px 12px" : "14px 16px", borderBottom: documentsOpen ? "1px solid rgba(17,24,39,0.08)" : "none", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", userSelect: "none", gap: 10 }}
                      >
                        <div>
                          <h3 style={{ fontSize: isMobile ? "0.92rem" : "0.98rem", fontWeight: 700, marginBottom: 3, color: "#111111" }}>Reference Documents</h3>
                          <p style={{ color: "#6b7280", fontSize: isMobile ? "0.74rem" : "0.8rem", fontWeight: 400 }}>Review uploaded and pending files for this service.</p>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <span style={{ fontSize: isMobile ? "0.74rem" : "0.8rem", color: "#6b7280", fontWeight: 500 }}>{uploadedDocCount} / {totalDocCount} uploaded</span>
                          <ChevronDown size={18} style={{ transform: documentsOpen ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.3s ease", color: "#6b7280" }} />
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
                            <div className="dashboard-documents-scroll" style={{ overflowX: "auto" }}>
                              <table className="dashboard-table">
                                <thead>
                                  <tr>
                                    <th style={{ width: isMobile ? "50%" : "auto" }}>Document Name</th>
                                    <th>Status</th>
                                    <th style={{ width: isMobile ? 96 : "auto", textAlign: "right" }}>Action</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {allDocs.filter((doc) => {
                                    const t = String(doc?.type || "").trim().toLowerCase();
                                    return t !== "draft" && t !== "final";
                                  }).map((doc) => {
                                    const docKey = `${activeLead._id}:${doc._id}`;
                                    const displayStatus = getDocumentDisplayStatus(activeLead, doc);
                                    const displayStatusLower = String(displayStatus || "").trim().toLowerCase();
                                    // Effective doc status for this executor's review context
                                    const leadStatusLower = String(activeLead?.status || "").trim().toLowerCase();
                                    const isExecutorReviewState = ["pr_accepted", "assignedtoexecutor", "inprogress"].includes(leadStatusLower);
                                    // When in executor review state, use executor-specific flags
                                    const docStatusLower = isExecutorReviewState
                                      ? (doc.executorRejected
                                          ? "rejected"
                                          : doc.executorAccepted
                                            ? "accepted"
                                            : "pending")
                                      : displayStatusLower;
                                    const rejectedByExecutor =
                                      String(activeLead?.status || "").trim().toLowerCase() === "rejected" &&
                                      (
                                        String(activeLead?.executorMessage || "").trim().length > 0 ||
                                        String(activeLead?.prFeedback || "").toLowerCase().includes("executor") ||
                                        String(activeLead?.prFeedback || "").toLowerCase().includes("assignment") ||
                                        String(activeLead?.adminMessage || "").toLowerCase().includes("executor") ||
                                        String(activeLead?.adminMessage || "").toLowerCase().includes("assignment")
                                      );
                                    const showReuploadRequired = rejectedByExecutor && displayStatusLower.includes("rejected");
                                    const statusColor =
                                      docStatusLower === "accepted"
                                        ? "#16a34a"
                                        : docStatusLower === "rejected"
                                          ? "#ef4444"
                                          : "#f59e0b";

                                    // Show accept/reject when service is assigned/in-progress and doc hasn't been decided yet
                                    const serviceAwaitingAction = ["PR_Accepted", "AssignedToExecutor", "InProgress"].includes(activeLead.status);
                                    const showReviewActions = serviceAwaitingAction && !!doc.url &&
                                      !doc.executorAccepted &&
                                      !(doc.executorRejected && !doc.prNotifiedClient);

                                    return (
                                    <React.Fragment key={doc._id}>
                                      <tr>
                                        <td>
                                          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: isMobile ? "wrap" : "nowrap" }}>
                                              <FileText size={16} color={docStatusLower === "accepted" ? "#16a34a" : docStatusLower === "rejected" ? "#ef4444" : "#6b7280"} />
                                              <span style={{ fontSize: isMobile ? "0.82rem" : "0.88rem", fontWeight: 600, color: "#111111", whiteSpace: isMobile ? "normal" : "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{doc.name}</span>
                                            </div>
                                            {showReuploadRequired ? (
                                              <div style={{ marginLeft: 26, marginTop: 4, color: "#ef4444", fontSize: "0.76rem", fontWeight: 700 }}>Reupload Required</div>
                                            ) : doc.displayReuploaded ? (
                                              <div style={{ marginLeft: 26, marginTop: 4, color: "#16a34a", fontSize: "0.76rem", fontWeight: 700 }}>Reuploaded</div>
                                            ) : null}
                                            {docStatusLower === "rejected" && doc.rejectionMessage ? (
                                              <div style={{ marginLeft: 26, marginTop: 4, color: "#ef4444", fontSize: "0.74rem", fontWeight: 500 }}>Reason: {doc.rejectionMessage}</div>
                                            ) : null}
                                          </div>
                                        </td>
                                        <td>
                                          <span style={{ fontSize: isMobile ? "0.74rem" : "0.82rem", fontWeight: 700, color: statusColor }}>{displayStatus}</span>
                                        </td>
                                        <td style={{ textAlign: "right" }}>
                                          <div style={{ display: "inline-flex", gap: 8, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
                                            <button
                                              onClick={() => viewDocument(doc.publicId, doc.url || doc.secure_url || doc.uploadedUrl || doc.viewUrl, activeLead._id)}
                                              style={{ padding: isMobile ? "6px 10px" : "7px 14px", borderRadius: 10, background: "#ffffff", color: "#111111", border: "1px solid rgba(17,24,39,0.12)", cursor: "pointer", fontSize: isMobile ? "0.7rem" : "0.78rem", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 6, transition: "all 0.2s" }}
                                              className="inner-card"
                                            >
                                              VIEW <Eye size={14} />
                                            </button>
                                            {showReviewActions && (
                                              <>
                                                <button
                                                  onClick={() => handleDocumentStatus(activeLead._id, doc._id, "Accepted")}
                                                  style={{ padding: isMobile ? "6px 10px" : "7px 14px", borderRadius: 10, background: "#16a34a", color: "#fff", border: "none", cursor: "pointer", fontSize: isMobile ? "0.7rem" : "0.78rem", fontWeight: 800, display: "inline-flex", alignItems: "center", gap: 6 }}
                                                >
                                                  ACCEPT
                                                </button>
                                                <button
                                                  onClick={() => setRejectingDocKey(rejectingDocKey === docKey ? null : docKey)}
                                                  style={{ padding: isMobile ? "6px 10px" : "7px 14px", borderRadius: 10, background: "rgba(239,68,68,0.08)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)", cursor: "pointer", fontSize: isMobile ? "0.7rem" : "0.78rem", fontWeight: 800, display: "inline-flex", alignItems: "center", gap: 6 }}
                                                >
                                                  REJECT
                                                </button>
                                              </>
                                            )}
                                          </div>
                                        </td>
                                      </tr>
                                      {/* Inline reject form for this doc */}
                                      {rejectingDocKey === docKey && (
                                        <tr>
                                          <td colSpan={3} style={{ padding: "0 4px 10px" }}>
                                            <div style={{ padding: 14, borderRadius: 14, background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.18)" }}>
                                              <div style={{ fontSize: "0.72rem", fontWeight: 800, color: "#ef4444", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
                                                Rejection Message to PR
                                              </div>
                                              <textarea
                                                value={docRejectDrafts[docKey] || ""}
                                                onChange={(e) => setDocRejectDrafts((prev) => ({ ...prev, [docKey]: e.target.value }))}
                                                rows={3}
                                                placeholder={`Explain why "${doc.name}" is being rejected...`}
                                                style={{ width: "100%", resize: "vertical", borderRadius: 10, border: "1px solid rgba(17,24,39,0.12)", background: "#ffffff", color: "#111111", padding: "10px 12px", outline: "none", fontSize: "0.85rem", fontFamily: "inherit" }}
                                              />
                                              <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
                                                <button
                                                  onClick={() => handleRejectDocumentWithMessage(activeLead._id, doc)}
                                                  style={{ padding: "8px 16px", borderRadius: 10, border: "none", background: "#ef4444", color: "#fff", fontSize: "0.8rem", fontWeight: 800, cursor: "pointer" }}
                                                >
                                                  Reject & Notify PR
                                                </button>
                                                <button
                                                  onClick={() => setRejectingDocKey(null)}
                                                  style={{ padding: "8px 16px", borderRadius: 10, border: "1px solid rgba(17,24,39,0.1)", background: "#ffffff", color: "#6b7280", fontSize: "0.8rem", fontWeight: 700, cursor: "pointer" }}
                                                >
                                                  Cancel
                                                </button>
                                              </div>
                                            </div>
                                          </td>
                                        </tr>
                                      )}
                                    </React.Fragment>
                                  );})}
                                </tbody>
                              </table>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </PremiumCard>

                    {/* Draft & Final Documents Section — visible for all draft-workflow statuses */}
                    {["InProgress", "ExecutionFinished", "DraftSent", "DraftAccepted", "DraftRejected", "UserAccepted", "Completed"].includes(activeLead.status) && (() => {
                      const visibleDocs = getVisibleDocuments(activeLead);
                      const latestDraft = visibleDocs.find((d) => String(d?.type || "").trim().toLowerCase() === "draft") || null;
                      const latestFinal = visibleDocs.find((d) => String(d?.type || "").trim().toLowerCase() === "final") || null;
                      const isSentToPR = (!!activeLead.draftSentToPR || !!sentToPRLeads[activeLead._id]) && activeLead.status !== "DraftRejected";
                      const getDraftStatusBadge = () => {
                        const leadSt = String(activeLead?.status || "").trim().toLowerCase();
                        if (leadSt === "draftrejected") return { label: "Rejected by User", color: "#ef4444", bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.18)" };
                        if (["draftaccepted","useraccepted","completed"].includes(leadSt)) return { label: "Accepted", color: "#16a34a", bg: "rgba(22,163,74,0.08)", border: "rgba(22,163,74,0.2)" };
                        if (["draftsent"].includes(leadSt)) return { label: "Draft Shared", color: "#2563eb", bg: "rgba(37,99,235,0.08)", border: "rgba(37,99,235,0.18)" };
                        if (isSentToPR) return { label: "Draft Sent to PR", color: "#7c3aed", bg: "rgba(124,58,237,0.08)", border: "rgba(124,58,237,0.18)" };
                        return { label: "Uploaded", color: "#16a34a", bg: "rgba(22,163,74,0.08)", border: "rgba(22,163,74,0.2)" };
                      };
                      const getFinalStatusBadge = () => ({ label: "Uploaded", color: "#16a34a", bg: "rgba(22,163,74,0.08)", border: "rgba(22,163,74,0.2)" });
                      return (
                        <PremiumCard className="inner-card" style={{ padding: 0, overflow: "hidden", background: "#ffffff", border: "1px solid rgba(17,24,39,0.14)", boxShadow: "none" }}>
                          <div style={{ padding: isMobile ? "12px 12px" : "14px 16px", borderBottom: "1px solid rgba(17,24,39,0.08)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <div>
                              <h3 style={{ fontSize: isMobile ? "0.92rem" : "0.98rem", fontWeight: 700, marginBottom: 3, color: "#111111" }}>Draft & Final Documents</h3>
                              <p style={{ color: "#6b7280", fontSize: isMobile ? "0.74rem" : "0.8rem", fontWeight: 400 }}>Draft and final documents for this service.</p>
                            </div>
                          </div>
                          <div style={{ padding: isMobile ? 12 : 16, display: "flex", flexDirection: "column", gap: 10 }}>
                            {!latestDraft && !latestFinal && (
                              <div style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(17,24,39,0.03)", border: "1px dashed rgba(17,24,39,0.1)", color: "#9ca3af", fontSize: "0.82rem", fontWeight: 600, textAlign: "center" }}>
                                No draft or final documents uploaded yet. Upload a draft from Workflow Actions above.
                              </div>
                            )}
                            {latestDraft && (() => {
                              const badge = getDraftStatusBadge();
                              return (
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderRadius: 12, background: "#fafafa", border: "1px solid rgba(17,24,39,0.08)", gap: 10, flexWrap: isMobile ? "wrap" : "nowrap" }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
                                    <FileText size={16} color="#8b5cf6" style={{ flexShrink: 0 }} />
                                    <div style={{ minWidth: 0 }}>
                                      <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#111111", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{latestDraft.name}</div>
                                      <div style={{ fontSize: "0.7rem", fontWeight: 800, color: "#8b5cf6", textTransform: "uppercase", letterSpacing: "0.04em", marginTop: 2 }}>DRAFT</div>
                                    </div>
                                  </div>
                                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                      <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#6b7280" }}>Status:</span>
                                      <span style={{ fontSize: "0.72rem", fontWeight: 800, color: badge.color, background: badge.bg, border: `1px solid ${badge.border}`, padding: "3px 10px", borderRadius: 20, whiteSpace: "nowrap" }}>{badge.label}</span>
                                    </div>
                                    <button
                                      onClick={() => viewDocument(latestDraft.publicId, latestDraft.url || latestDraft.secure_url || latestDraft.uploadedUrl || latestDraft.viewUrl, activeLead._id)}
                                      style={{ padding: "5px 12px", borderRadius: 8, border: "1px solid rgba(17,24,39,0.1)", background: "#ffffff", color: "#111111", fontSize: "0.72rem", fontWeight: 800, cursor: "pointer" }}
                                    >
                                      VIEW
                                    </button>
                                  </div>
                                </div>
                              );
                            })()}
                            {latestFinal && (() => {
                              const badge = getFinalStatusBadge();
                              return (
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderRadius: 12, background: "#fafafa", border: "1px solid rgba(17,24,39,0.08)", gap: 10, flexWrap: isMobile ? "wrap" : "nowrap" }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
                                    <FileText size={16} color="#10b981" style={{ flexShrink: 0 }} />
                                    <div style={{ minWidth: 0 }}>
                                      <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#111111", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{latestFinal.name}</div>
                                      <div style={{ fontSize: "0.7rem", fontWeight: 800, color: "#10b981", textTransform: "uppercase", letterSpacing: "0.04em", marginTop: 2 }}>FINAL</div>
                                    </div>
                                  </div>
                                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                      <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#6b7280" }}>Status:</span>
                                      <span style={{ fontSize: "0.72rem", fontWeight: 800, color: badge.color, background: badge.bg, border: `1px solid ${badge.border}`, padding: "3px 10px", borderRadius: 20, whiteSpace: "nowrap" }}>{badge.label}</span>
                                    </div>
                                    <button
                                      onClick={() => viewDocument(latestFinal.publicId, latestFinal.url || latestFinal.secure_url || latestFinal.uploadedUrl, activeLead._id)}
                                      style={{ padding: "5px 12px", borderRadius: 8, border: "1px solid rgba(17,24,39,0.1)", background: "#ffffff", color: "#111111", fontSize: "0.72rem", fontWeight: 800, cursor: "pointer" }}
                                    >
                                      VIEW
                                    </button>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        </PremiumCard>
                      );
                    })()}

                    {/* Controls Section */}
                    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(300px, 1fr))", gap: isMobile ? 14 : 18 }}>
                      <PremiumCard className="inner-card" style={{ padding: 18, borderRadius: 20, background: "#ffffff", border: "1px solid rgba(17,24,39,0.14)", boxShadow: "none" }}>
                        <h4 style={{ fontSize: "0.9rem", fontWeight: 700, marginBottom: 14, color: "#111111", display: "flex", alignItems: "center", gap: 8 }}>
                          <RefreshCw size={16} /> Workflow Actions
                        </h4>
                        {["PR_Accepted", "AssignedToExecutor"].includes(activeLead.status) ? (
                          (() => {
                            // Only count docs that are actually uploaded (have a URL)
                            const clientDocs = allDocs.filter(d =>
                              !["Draft", "Final", "ExecutionResult"].includes(d.type) &&
                              !!(d.url || d.publicId || d.secure_url || d.uploadedUrl)
                            );
                            // Use executorAccepted flag — only docs the executor explicitly accepted count
                            const acceptedCount = clientDocs.filter(d => !!d.executorAccepted).length;
                            const allAccepted = clientDocs.length > 0 && acceptedCount === clientDocs.length;
                            const anyPending = clientDocs.some(d => !d.executorAccepted && !(d.executorRejected && !d.prNotifiedClient));
                            const anyRejected = clientDocs.some(d => d.executorRejected && !d.prNotifiedClient);
                            return (
                              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                {clientDocs.length === 0 ? (
                                  <div style={{ padding: "10px 14px", borderRadius: 12, background: "rgba(17,24,39,0.04)", border: "1px solid rgba(17,24,39,0.1)", color: "#6b7280", fontSize: "0.82rem", fontWeight: 600 }}>
                                    No documents uploaded yet. Waiting for client to upload.
                                  </div>
                                ) : anyPending ? (
                                  <div style={{ padding: "10px 14px", borderRadius: 12, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", color: "#b45309", fontSize: "0.82rem", fontWeight: 600 }}>
                                    Review all documents above — {acceptedCount}/{clientDocs.length} accepted.
                                  </div>
                                ) : anyRejected ? (
                                  <div style={{ padding: "10px 14px", borderRadius: 12, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.18)", color: "#dc2626", fontSize: "0.82rem", fontWeight: 600 }}>
                                    Some documents were rejected. Waiting for client to reupload.
                                  </div>
                                ) : null}
                                <div style={{ display: "flex", gap: 12, flexDirection: isMobile ? "column" : "row" }}>
                                  <button
                                    onClick={() => allAccepted && handleStatusUpdate(activeLead._id, "InProgress")}
                                    disabled={!allAccepted}
                                    style={{ flex: 1, padding: "12px", borderRadius: 12, background: allAccepted ? "#16a34a" : "rgba(17,24,39,0.06)", color: allAccepted ? "#fff" : "#9ca3af", border: allAccepted ? "none" : "1px solid rgba(17,24,39,0.1)", fontWeight: 700, cursor: allAccepted ? "pointer" : "not-allowed", transition: "all 0.2s", fontSize: "0.9rem" }}
                                  >
                                    {allAccepted ? "Accept Service" : `Accept Service (${acceptedCount}/${clientDocs.length} docs reviewed)`}
                                  </button>
                                  <button
                                    onClick={() => setRejectingLeadId(activeLead._id)}
                                    style={{ flex: 1, padding: "12px", borderRadius: 12, background: "#ffffff", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)", fontWeight: 700, cursor: "pointer", fontSize: "0.9rem" }}
                                  >
                                    Reject Service
                                  </button>
                                </div>
                              </div>
                            );
                          })()
                        ) : ["InProgress", "ExecutionFinished", "DraftRejected"].includes(activeLead.status) ? (
                          (() => {
                            const existingDraft = Array.isArray(activeLead?.documents)
                              ? [...activeLead.documents]
                                  .filter((d) => String(d?.type || "").trim().toLowerCase() === "draft" && (d?.url || d?.publicId))
                                  .sort((a, b) => new Date(b?.uploadedAt || 0) - new Date(a?.uploadedAt || 0))[0] || null
                              : null;
                            const hasDraft = !!existingDraft;
                            const isDraftRejected = activeLead.status === "DraftRejected";
                            const alreadySentToPR = (!!activeLead.draftSentToPR || !!sentToPRLeads[activeLead._id]) && !isDraftRejected;
                            const canSendToPR = hasDraft && !alreadySentToPR;
                            return (
                              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                <div style={{ padding: "10px 14px", borderRadius: 12, background: alreadySentToPR ? "rgba(37,99,235,0.05)" : isDraftRejected ? "rgba(239,68,68,0.06)" : "rgba(16,163,74,0.05)", border: alreadySentToPR ? "1px solid rgba(37,99,235,0.18)" : isDraftRejected ? "1px solid rgba(239,68,68,0.2)" : "1px solid rgba(16,163,74,0.18)", color: alreadySentToPR ? "#2563eb" : isDraftRejected ? "#dc2626" : "#16a34a", fontWeight: 600, fontSize: "0.82rem" }}>
                                  {alreadySentToPR ? "Draft sent to PR for review. Re-upload to send a new version." : isDraftRejected ? "Draft rejected by user. Please re-upload a revised draft and send it to PR." : hasDraft ? "Draft uploaded. You can re-upload to replace it or send it to PR for review." : "Service accepted. Upload the draft document for PR to review."}
                                </div>
                                {/* Upload / Re-upload Draft */}
                                <div style={{ padding: isMobile ? 10 : 12, borderRadius: 14, background: "rgba(17,24,39,0.02)", border: "1px solid rgba(17,24,39,0.08)" }}>
                                  <div style={{ fontSize: "0.78rem", fontWeight: 800, color: "#111111", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
                                    {hasDraft || isDraftRejected ? "Re-upload Draft" : "Upload Draft"}
                                  </div>
                                  <input
                                    type="file"
                                    ref={draftInputRef}
                                    style={{ display: "none" }}
                                    accept=".pdf,.doc,.docx"
                                    onChange={(e) => {
                                      if (e.target.files[0]) handleDraftUpload(activeLead._id, e.target.files[0]);
                                      e.target.value = "";
                                    }}
                                  />
                                  <button
                                    onClick={() => draftInputRef.current?.click()}
                                    disabled={!!uploadingDraftId}
                                    style={{ width: "100%", padding: "10px", borderRadius: 10, border: "1px dashed rgba(22,163,74,0.45)", background: "#ffffff", color: uploadingDraftId ? "#9ca3af" : "#16a34a", fontWeight: 700, fontSize: "0.82rem", cursor: uploadingDraftId ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all 0.2s" }}
                                  >
                                    {uploadingDraftId ? <><Loader2 size={16} className="animate-spin" /> Uploading...</> : <><Upload size={16} /> {hasDraft || isDraftRejected ? "Re-upload Draft" : "Upload Draft"}</>}
                                  </button>
                                </div>
                                {/* Send Draft to PR */}
                                <div style={{ padding: isMobile ? 10 : 12, borderRadius: 14, background: canSendToPR ? "rgba(17,24,39,0.02)" : "rgba(17,24,39,0.015)", border: canSendToPR ? "1px solid rgba(17,24,39,0.08)" : "1px dashed rgba(17,24,39,0.1)" }}>
                                  <div style={{ fontSize: "0.78rem", fontWeight: 800, color: canSendToPR ? "#111111" : "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Send Draft to PR</div>
                                  <button
                                    onClick={() => canSendToPR && handleSendDraftToPR(activeLead._id)}
                                    disabled={!canSendToPR}
                                    style={{ width: "100%", padding: "10px", borderRadius: 10, background: canSendToPR ? "#16a34a" : "rgba(17,24,39,0.05)", color: canSendToPR ? "#fff" : "#9ca3af", border: canSendToPR ? "none" : "1px solid rgba(17,24,39,0.1)", fontWeight: 700, fontSize: "0.82rem", cursor: canSendToPR ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all 0.2s" }}
                                  >
                                    <Send size={16} /> {alreadySentToPR ? "Sent to PR" : "Send Draft to PR"}
                                  </button>
                                </div>
                              </div>
                            );
                          })()
                        ) : activeLead.status === "DraftSent" ? (
                          <div style={{ padding: "14px", borderRadius: 14, background: "rgba(245, 158, 11, 0.06)", border: "1px solid rgba(245, 158, 11, 0.18)", color: "#b45309", fontWeight: 700, textAlign: "center", fontSize: "0.9rem" }}>
                            Draft sent to client. Waiting for the client's response.
                          </div>
                        ) : ["DraftAccepted", "UserAccepted"].includes(activeLead.status) ? (
                          <div style={{ padding: "14px", borderRadius: 14, background: "rgba(16, 163, 74, 0.05)", border: "1px solid rgba(16, 163, 74, 0.15)", color: "#16a34a", fontWeight: 700, textAlign: "center", fontSize: "0.9rem" }}>
                            Current Phase: {getDisplayStatus(activeLead)}
                          </div>
                        ) : (
                          <div style={{ padding: "14px", borderRadius: 14, background: "#f8fafc", border: "1px solid rgba(17,24,39,0.08)", color: "#4b5563", fontWeight: 700, textAlign: "center", fontSize: "0.9rem" }}>
                            Current Phase: {getDisplayStatus(activeLead)}
                          </div>
                        )}

                        {rejectingLeadId === activeLead._id && (
                          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: 16, padding: 16, background: "#fff5f5", borderRadius: 14, border: "1px solid rgba(239,68,68,0.15)" }}>
                            <textarea 
                              value={rejectDrafts[activeLead._id] || ""} 
                              onChange={(e) => setRejectDrafts({...rejectDrafts, [activeLead._id]: e.target.value})}
                              placeholder="Reason for rejecting this service..." 
                              className="dashboard-input"
                              style={{ width: "100%", background: "#ffffff", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: 12, color: "#111111", fontSize: "0.88rem", marginBottom: 12, minHeight: 80, outline: "none" }}
                            />
                            <div style={{ display: "flex", gap: 10, flexDirection: isMobile ? "column" : "row" }}>
                              <button onClick={() => handleRejectAssignment(activeLead._id)} style={{ flex: 1, padding: "10px", background: "#ef4444", color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, fontSize: "0.85rem" }}>Confirm Reject</button>
                              <button onClick={() => setRejectingLeadId(null)} style={{ flex: 1, padding: "10px", background: "transparent", color: "#4b5563", border: "1px solid rgba(17,24,39,0.12)", borderRadius: 10, fontWeight: 700, fontSize: "0.85rem" }}>Cancel</button>
                            </div>
                          </motion.div>
                        )}
                      </PremiumCard>

                      <PremiumCard className="inner-card" style={{ padding: 18, borderRadius: 20, background: "#ffffff", border: "1px solid rgba(17,24,39,0.14)", boxShadow: "none" }}>
                        <h4 style={{ fontSize: "0.9rem", fontWeight: 700, marginBottom: 14, color: "#111111", display: "flex", alignItems: "center", gap: 8 }}>
                          <MessageSquare size={16} /> Message to PR
                        </h4>
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                          <textarea
                            value={messageDrafts[activeLead._id] || ""}
                            onChange={(e) => setMessageDrafts({...messageDrafts, [activeLead._id]: e.target.value})}
                            placeholder="Type message..."
                            className="dashboard-input"
                            rows={4}
                            style={{ width: "100%", background: "#ffffff", border: "1px solid rgba(17,24,39,0.12)", borderRadius: 12, padding: "12px 16px", color: "#111111", outline: "none", resize: "vertical", minHeight: 90, fontSize: "0.88rem", fontFamily: "inherit", boxSizing: "border-box" }}
                          />
                          <button onClick={() => handleSendMessageToPR(activeLead._id, messageDrafts[activeLead._id])} style={{ width: "100%", padding: "11px", borderRadius: 12, background: "#16a34a", color: "#fff", border: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, cursor: "pointer", fontWeight: 700, fontSize: "0.88rem", transition: "all 0.2s" }}>
                            <Send size={16} /> Send
                          </button>
                        </div>
                      </PremiumCard>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "grid", placeItems: "center", minHeight: 400, color: "#6b7280" }}>
                    <div style={{ textAlign: "center" }}>
                      <Briefcase size={48} style={{ color: "rgba(17,24,39,0.08)", marginBottom: 16 }} />
                      <p>Select an assignment from the sidebar to view details.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        {createPortal(
          <ConfirmationModal
            isOpen={deleteConfirm.isOpen}
            title="Delete Assignment"
            message={`Are you sure you want to delete ${deleteConfirm.lead?.serviceName}?`}
            onConfirm={handleConfirmDelete}
            onCancel={() => setDeleteConfirm({ isOpen: false, lead: null, isLoading: false })}
            isLoading={deleteConfirm.isLoading}
          />,
          document.body
        )}
        {createPortal(
          <ConfirmationModal
            isOpen={localDeleteConfirm.isOpen}
            title="Remove Service"
            message={`Are you sure you want to remove ${localDeleteConfirm.lead?.serviceName} from your view?`}
            onConfirm={handleConfirmLocalDelete}
            onCancel={() => setLocalDeleteConfirm({ isOpen: false, lead: null })}
            isLoading={false}
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
                      {serviceListModal.status === "active" ? "Active Services" : "Completed Services"}
                    </h3>
                    <span style={{ background: serviceListModal.status === "active" ? "#fef3c7" : "#dcfce7", color: serviceListModal.status === "active" ? "#92400e" : "#166534", fontSize: "0.75rem", fontWeight: 700, padding: "2px 10px", borderRadius: 999 }}>
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
                            <span style={{ fontSize: "0.75rem", fontWeight: 600, padding: "2px 8px", borderRadius: 6, background: getStatusTheme ? (getStatusTheme(lead)?.color || "#16a34a") + "18" : "#f3f4f6", color: getStatusTheme ? getStatusTheme(lead)?.color || "#374151" : "#374151", display: "inline-block" }}>
                              {getDisplayStatus ? getDisplayStatus(lead) : lead.status}
                            </span>
                          </div>
                        </div>
                        <div style={{ color: "#16a34a", fontWeight: 600, fontSize: "0.85rem", marginLeft: 12, whiteSpace: "nowrap" }}>
                          {formatInr(getOurFeeAmount(lead) || 0)}
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

export default ExecutorDashboardModern;
