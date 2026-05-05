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
import { viewDocument } from "../utils/documentViewer";
import ConfirmationModal from "../components/ConfirmationModal";
import UserDashboardModern from "./UserDashboardModern";


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
  parseFeeAmount,
  shouldCountLeadRevenue,
} from "../utils/servicePricing";

const UserDashboard = () => {
  const [leads, setLeads] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [messageByLead, setMessageByLead] = useState({});
  const [statsHighlight, setStatsHighlight] = useState(false);
  const [portfolioHighlight, setPortfolioHighlight] = useState(false);
  const [serviceSearch, setServiceSearch] = useState("");
  const [uploadingId, setUploadingId] = useState(null);
  const [draftRejectDrafts, setDraftRejectDrafts] = useState({});
  const [draftRejectingLeadId, setDraftRejectingLeadId] = useState(null);
  const [dismissedDetailsMissingSignatureByLead, setDismissedDetailsMissingSignatureByLead] = useState({});
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, lead: null, isLoading: false });
  const uploadInputRef = useRef(null);
  const navigate = useNavigate();

  const storedUser = JSON.parse(localStorage.getItem("user"));
  const isAdmin = storedUser?.role === "admin";

  const extractCloudinaryPublicIdFromUrl = (url) => {
    const rawUrl = String(url || "").trim();
    if (!rawUrl) return "";

    try {
      const parsed = new URL(rawUrl);
      const marker = "/upload/";
      const markerIndex = parsed.pathname.indexOf(marker);
      if (markerIndex === -1) return "";

      let publicId = parsed.pathname.slice(markerIndex + marker.length);
      publicId = publicId.replace(/^v\d+\//, "");
      publicId = publicId.replace(/\.[a-z0-9]+$/i, "");
      return publicId.trim();
    } catch {
      return "";
    }
  };

  const normalizeServiceKey = (value) =>
    String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const getPendingUploadsForService = (serviceName) => {
    const target = normalizeServiceKey(serviceName);
    if (!target) return [];

    const saved = localStorage.getItem("pending_uploads");
    if (!saved) return [];

    try {
      const parsed = JSON.parse(saved);
      const currentUserId = storedUser?._id || storedUser?.id;
      if (parsed?.userId && currentUserId && String(parsed.userId) !== String(currentUserId)) {
        return [];
      }

      const docsByService = parsed?.docs || {};
      const serviceDocs =
        docsByService[serviceName] ||
        Object.entries(docsByService).find(([key]) => normalizeServiceKey(key) === target)?.[1] ||
        {};

      return Object.entries(serviceDocs).flatMap(([docName, value]) => {
        const arr = Array.isArray(value) ? value : value ? [value] : [];
        return arr
          .filter(Boolean)
          .map((item) => ({
            name: item?.name || docName,
            originalName: item?.name || docName,
            url: item?.url || item?.secure_url || "",
            publicId: item?.publicId || item?.filename || extractCloudinaryPublicIdFromUrl(item?.url || item?.secure_url || ""),
            type: "Client",
            status: "Pending",
            uploadedAt: item?.uploadedAt || new Date(),
            reuploaded: !!item?.reuploaded,
          }))
          .filter((doc) => !!doc.url || !!doc.publicId);
      });
    } catch {
      return [];
    }
  };

  const normalizeDocumentName = (doc) => {
    const fallbackName =
      doc?.name ||
      doc?.originalName ||
      doc?.fileName ||
      doc?.filename ||
      doc?.publicId ||
      doc?.url ||
      "Document";

    const cleaned = String(fallbackName).trim();
    if (!cleaned) return "Document";
    return cleaned.includes("/") ? (cleaned.split("/").pop() || "Document") : cleaned;
  };

  const dedupeDocumentsByName = (documents, options = {}) => {
    const docs = Array.isArray(documents) ? documents.filter(Boolean) : [];
    if (docs.length === 0) return [];
    const reuploadedDocumentNames = new Set(
      Array.isArray(options?.reuploadedDocumentNames)
        ? options.reuploadedDocumentNames.map((name) => normalizeText(name)).filter(Boolean)
        : [],
    );

    const sorted = [...docs].sort((a, b) => {
      const aTime = new Date(a?.uploadedAt || a?.createdAt || 0).getTime();
      const bTime = new Date(b?.uploadedAt || b?.createdAt || 0).getTime();
      return bTime - aTime;
    });

    const grouped = new Map();
    for (const doc of sorted) {
      const key = normalizeServiceKey(normalizeDocumentName(doc));
      if (!key) continue;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(doc);
    }

    return Array.from(grouped.values()).map((group) => {
      const reuploadedDoc = group.find(
        (doc) =>
          !!doc?.displayReuploaded ||
          !!doc?.reuploaded ||
          String(doc?.status || "").trim().toLowerCase() === "reuploaded",
      );
      const rejectedDoc = group.find((doc) => String(doc?.status || "").trim().toLowerCase() === "rejected");
      const selected =
        reuploadedDoc ||
        rejectedDoc ||
        group.find((doc) => String(doc?.status || "").trim().toLowerCase() !== "rejected") ||
        group[0];
      const fileSource =
        group.find(
          (doc) =>
            !!doc?.url ||
            !!doc?.secure_url ||
            !!doc?.uploadedUrl ||
            !!doc?.viewUrl ||
            !!doc?.publicId ||
            !!doc?.filename ||
            !!doc?.fileName,
        ) ||
        selected;
      const docName = normalizeText(normalizeDocumentName(selected));

      const resolvedUrl =
        selected?.url ||
        selected?.secure_url ||
        selected?.uploadedUrl ||
        selected?.viewUrl ||
        fileSource?.url ||
        fileSource?.secure_url ||
        fileSource?.uploadedUrl ||
        fileSource?.viewUrl ||
        "";
      const resolvedPublicId =
        selected?.publicId ||
        selected?.filename ||
        selected?.fileName ||
        fileSource?.publicId ||
        fileSource?.filename ||
        fileSource?.fileName ||
        extractCloudinaryPublicIdFromUrl(resolvedUrl);

      return {
        ...selected,
        name: normalizeDocumentName(selected),
        url: resolvedUrl,
        publicId: resolvedPublicId,
        displayReuploaded:
          reuploadedDocumentNames.has(docName) ||
          !!selected?.displayReuploaded ||
          !!selected?.reuploaded ||
          String(selected?.status || "").trim().toLowerCase() === "reuploaded",
      };
    });
  };

  const hydrateLeadsWithDocuments = (leadList, servicesList = services) => {
    const list = Array.isArray(leadList) ? leadList : [];
    return list.map((lead) => {
      const serviceKey = normalizeServiceKey(lead?.serviceName);
      
      const matchedService = servicesList.find(
        (s) => normalizeServiceKey(s?.title) === serviceKey
      );
      
      let requiredDocs = [];
      if (matchedService && Array.isArray(matchedService.documentsRequired)) {
        requiredDocs = matchedService.documentsRequired.map(docName => ({
          name: docName,
          status: "Pending",
          type: "Client"
        }));
      }

      const pendingDocs = getPendingUploadsForService(lead?.serviceName);
      const currentDocs = Array.isArray(lead?.documents) ? lead.documents : [];
      const mergedDocs = dedupeDocumentsByName(
        [...currentDocs, ...pendingDocs, ...requiredDocs],
        {
          reuploadedDocumentNames: lead?.reuploadedDocumentNames,
        },
      );

      const executorRejected = isExecutorRejectedState(lead);
      const serviceRejected = String(lead?.status || "").trim().toLowerCase() === "rejected";
      const draftRejected = String(lead?.status || "").trim().toLowerCase() === "draftrejected";

      const finalDocs = mergedDocs.map(doc => {
        let resolvedStatus = doc?.status || "Pending";
        if (serviceRejected) {
          resolvedStatus = "Rejected";
        } else if (draftRejected && String(doc?.type || "").trim().toLowerCase() === "draft") {
          resolvedStatus = "Rejected";
        }

        return {
          ...doc,
          status: resolvedStatus,
          executorRejected: executorRejected && serviceRejected,
          displayReuploaded:
            serviceRejected || draftRejected
              ? false
              : !!doc?.displayReuploaded || !!doc?.reuploaded || String(doc?.status || "").trim().toLowerCase() === "reuploaded",
        };
      });

      return {
        ...lead,
        documents: finalDocs,
      };
    });
  };

  useEffect(() => {
    if (isAdmin) {
      navigate("/admin");
      return;
    }

    const fetchUserServices = async () => {
      try {
        const userId = storedUser?._id || storedUser?.id;
        const apiUrl = import.meta.env.VITE_API_URL;
        const [leadsRes, servicesRes] = await Promise.all([
          axios.get(`${apiUrl}/leads?userId=${userId}`, {
            headers: { Authorization: `Bearer ${storedUser.token}` },
          }),
          axios.get(`${apiUrl}/services`),
        ]);
        const fetchedServices = Array.isArray(servicesRes.data) ? servicesRes.data : [];
        setLeads(hydrateLeadsWithDocuments(leadsRes.data, fetchedServices));
        setServices(fetchedServices);
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

  useEffect(() => {
    const syncExpandedLead = async () => {
      if (!expandedId) return;

      try {
        const apiUrl = import.meta.env.VITE_API_URL;
        const user = JSON.parse(localStorage.getItem("user"));
        if (!user?.token) return;

        const response = await axios.get(`${apiUrl}/leads/${expandedId}`, {
          headers: { Authorization: `Bearer ${user.token}` },
        });

        if (response.data) {
          setLeads((prev) =>
            hydrateLeadsWithDocuments(
              prev.map((lead) =>
                lead._id === expandedId ? { ...lead, ...response.data } : lead,
              ),
            ),
          );
        }
      } catch (error) {
        console.warn("Unable to refresh expanded lead details:", error);
      }
    };

    syncExpandedLead();
  }, [expandedId]);

  const handleUploadDocuments = async (leadId, files, targetName = null) => {
    if (!files || files.length === 0) return;
    
    const fileArray = Array.from(files);
    if (fileArray.some((file) => file.type !== "application/pdf")) {
      toast.error("Please upload only PDF documents");
      return;
    }

    setUploadingId(leadId);
    const loadingToast = toast.loading(targetName ? `Uploading ${targetName}...` : `Uploading document${fileArray.length > 1 ? 's' : ''}...`);
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

      const lead = leads.find(l => l._id === leadId);
      const serviceRejected = String(lead?.status || "").trim().toLowerCase() === "rejected";
      const isReuploadFlow = serviceRejected || !!targetName;
      const newDocuments = fileArray.map((file, index) => ({
        // Use the targetName if provided (for single document re-upload)
        name: targetName || file.name,
        url: uploadedFiles[index]?.url || uploadedFiles[index]?.secure_url,
        publicId: uploadedFiles[index]?.filename,
        type: "Client",
        status: "Pending",
        reuploaded: isReuploadFlow,
        uploadedAt: new Date(),
      }));

      const patchPayload = {
        status: serviceRejected ? "PendingReview" : (lead?.status || "PendingReview"),
        $push: {
          documents: {
            $each: newDocuments,
          },
        },
      };
      if (isReuploadFlow) {
        patchPayload.reuploadedDocumentNames = targetName ? [targetName] : fileArray.map((file) => file.name);
      }

      const response = await axios.patch(
        `${apiUrl}/leads/${leadId}`,
        patchPayload,
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
        setLeads(hydrateLeadsWithDocuments(leadsRes.data));
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
      setLeads(hydrateLeadsWithDocuments(leadsRes.data));
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
      setLeads(hydrateLeadsWithDocuments(leadsRes.data));
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
      toast.success("Message removed");

      const userId = storedUser?._id || storedUser?.id;
      const leadsRes = await axios.get(`${apiUrl}/leads?userId=${userId}`, {
        headers: { Authorization: `Bearer ${storedUser.token}` },
      });
      setLeads(hydrateLeadsWithDocuments(leadsRes.data));
    } catch (error) {
      console.error("Delete rejection message error:", error);
      toast.error("Failed to remove message");
    }
  };

  const handleDeleteExecutorMessage = async (leadId, e) => {
    if (e) e.stopPropagation();
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      await axios.patch(
        `${apiUrl}/leads/${leadId}`,
        {
          executorMessage: "",
        },
        {
          headers: { Authorization: `Bearer ${storedUser.token}` },
        },
      );
      toast.success("Executor message removed");

      const userId = storedUser?._id || storedUser?.id;
      const leadsRes = await axios.get(`${apiUrl}/leads?userId=${userId}`, {
        headers: { Authorization: `Bearer ${storedUser.token}` },
      });
      setLeads(hydrateLeadsWithDocuments(leadsRes.data));
    } catch (error) {
      console.error("Delete executor message error:", error);
      toast.error("Failed to remove executor message");
    }
  };

  const hasRejectedDocuments = (lead) =>
    Array.isArray(lead?.documents) &&
    lead.documents.some((doc) => doc?.status === "Rejected");

  const isRejectedServiceState = (lead) => {
    const status = String(lead?.status || "").trim().toLowerCase();
    if (status === "rejected") return hasRejectedDocuments(lead);

    const rejectionText = [
      lead?.executorMessage,
      lead?.prFeedback,
      lead?.adminMessage,
      lead?.prToExecutorMessage,
      lead?.adminToExecutorMessage,
    ]
      .map((value) => String(value || "").trim().toLowerCase())
      .join(" ");

    return (
      rejectionText.includes("rejected by executor") ||
      rejectionText.includes("assignment rejected") ||
      rejectionText.includes("rejected by pr") ||
      rejectionText.includes("service rejected")
    ) && hasRejectedDocuments(lead);
  };

  const hasPrFeedbackMessage = (lead) =>
    lead?.prFeedback && String(lead.prFeedback).trim().length > 0;

  const getExecutorRejectionReason = (lead) => {
    const rawMessage = String(lead?.executorMessage || lead?.prFeedback || "").trim();
    if (!rawMessage) return "";

    const cleaned = rawMessage
      .replace(/^assignment rejected by executor:\s*/i, "")
      .replace(/^rejected by executor:\s*/i, "")
      .trim();

    return cleaned || rawMessage;
  };

  const getDocumentRejectionText = (doc) => {
    return String(doc?.rejectionReason || "").trim() || "Document rejected due to quality issues.";
  };

  const getLeadDocumentsToDisplay = (lead) => {
    if (!lead) return [];
    // We utilize the centralized hydration logic to ensure consistency across the dashboard.
    // This merges backend docs, pending localStorage uploads, and required placeholders.
    const hydratedLeads = hydrateLeadsWithDocuments([lead], services);
    return hydratedLeads[0]?.documents || [];
  };

  const isAdminRejectedState = (lead) =>
    lead?.status === "Rejected" &&
    String(lead?.adminMessage || "")
      .toLowerCase()
      .includes("administrator");

  const isPrRejectedState = (lead) => {
    if (!lead || lead?.status !== "Rejected") return false;
    return !isExecutorRejectedState(lead);
  };

  const isExecutorRejectedState = (lead) => {
    if (!lead || lead?.status !== "Rejected") return false;
    const execMsg = String(lead?.executorMessage || "").trim();
    const prMsg = String(lead?.prFeedback || "").toLowerCase();
    const adminMsg = String(lead?.adminMessage || "").toLowerCase();
    
    return (
      execMsg.length > 0 ||
      prMsg.includes("executor") ||
      prMsg.includes("assignment") ||
      adminMsg.includes("executor") ||
      adminMsg.includes("assignment") ||
      prMsg.includes("rejected by executor")
    );
  };

  const getRejectionDisplayLabel = (lead) => {
    const status = lead?.status;
    if (status !== "Rejected") return "";

    if (isExecutorRejectedState(lead)) {
      const reason = getExecutorRejectionReason(lead);
      return reason ? `Rejected by Executor: ${reason}` : "Rejected by Executor";
    }

    // If it's "Rejected" and not by executor, it's by PR
    const prReason = String(lead?.prFeedback || "").trim();
    const adminReason = String(lead?.adminMessage || "").trim();
    const displayReason = prReason || adminReason;
    return displayReason ? `Rejected by PR: ${displayReason}` : "Rejected by PR";
  };

  const isDetailsMissingState = (lead) =>
    !isExecutorRejectedState(lead) &&
    !isPrRejectedState(lead) &&
    (isRejectedServiceState(lead) || hasRejectedDocuments(lead));

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
    if (isExecutorRejectedState(lead)) {
      return "Rejected by Executor. Please reupload the documents of this service from the Services page.";
    }

    if (isRejectedServiceState(lead)) {
      return "Rejected by PR. Please reupload the documents of this service from the Services page.";
    }

    const rejectedDoc = Array.isArray(lead?.documents)
      ? lead.documents.find((doc) => doc?.status === "Rejected")
      : null;
    if (rejectedDoc) return getDocumentRejectionText(rejectedDoc);

    const rejectionNote = String(lead?.prFeedback || "").trim();
    if (rejectionNote) return rejectionNote;

    return "Please review your documents and upload the missing details.";
  };

  const getDetailsMissingSignature = (lead) => {
    if (isExecutorRejectedState(lead)) {
      return `executor:${getExecutorRejectionReason(lead)}`;
    }

    if (isRejectedServiceState(lead)) {
      const rejectionNote = String(lead?.prFeedback || lead?.adminMessage || lead?.executorMessage || "").trim();
      return rejectionNote ? `service:${rejectionNote}` : "service:rejected";
    }

    const rejectionNote = String(lead?.prFeedback || "").trim();
    if (rejectionNote) return `pr:${rejectionNote}`;

    const documents = getLeadDocumentsToDisplay(lead);
    const rejectedDoc = Array.isArray(documents)
      ? documents.find((doc) => doc?.status === "Rejected")
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
    pending: leads.filter((l) =>
      ["Open", "PendingReview", "InformationRequired", "PR_Accepted", "DraftRejected", "Rejected"].includes(l.status),
    ).length,
    inProgress: leads.filter((l) =>
      ["AssignedToExecutor", "InProgress", "ExecutionFinished", "DraftSent", "DraftAccepted", "UserAccepted"].includes(l.status),
    ).length,
    completed: leads.filter((l) => l.status === "Completed").length,
    totalCommitment: leads.reduce(
      (sum, lead) => {
        // Commitment should reflect only confirmed (non-cancelled) services.
        // Use the committed lead amount, which falls back to the service recommendation.
        if (!shouldCountLeadRevenue(lead)) {
          return sum;
        }
        return sum + getCommitmentAmount(lead);
      },
      0,
    ),
  };

  function normalizeText(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function getCatalogRecommendedFee(serviceName) {
    const normalized = normalizeText(serviceName);
    const matchedService = services.find(
      (service) => normalizeText(service?.title) === normalized,
    );
    if (!matchedService) return null;

    const fee =
      parseFeeAmount(matchedService?.recommendedFees) ??
      parseFeeAmount(matchedService?.marketFees);
    return Number.isFinite(fee) && fee > 0 ? fee : null;
  }

  function getCommitmentAmount(lead) {
    const explicitLeadFee =
      parseFeeAmount(lead?.recommendedFeeAmount) ??
      parseFeeAmount(lead?.recommendedFees);
    if (Number.isFinite(explicitLeadFee) && explicitLeadFee > 0) {
      return explicitLeadFee;
    }

    const catalogFee = getCatalogRecommendedFee(lead?.serviceName);
    if (Number.isFinite(catalogFee) && catalogFee > 0) {
      return catalogFee;
    }

    return getLeadRevenueAmount(lead);
  }

  const getDisplayStatus = (lead) => {
    const status = lead?.status;
    const docs = getLeadDocumentsToDisplay(lead);
    const hasUploaded = Array.isArray(docs) && docs.some(d => {
      const s = String(d?.status || "").trim().toLowerCase();
      return ["uploaded", "accepted", "verified", "approved", "completed", "reuploaded"].includes(s) || !!d?.url || !!d?.publicId;
    });

    const rejectionLabel = getRejectionDisplayLabel(lead);
    if (rejectionLabel) return rejectionLabel;

    if (isRejectedServiceState(lead)) return "Rejected";
    if (isDetailsMissingState(lead)) return "Action Required: Details Missing";
    if (isReviewDraftState(lead)) return "Review Draft";
    if (status === "PendingReview" || (status === "Open" && hasUploaded)) return "PR Reviewing";
    if (status === "PR_Accepted") return "Documents Verified";
    if (status === "AssignedToExecutor") return "Awaiting Executor Coordination";
    if (status === "InProgress") return "Service accepted by the executor";
    if (status === "ExecutionFinished") return "PR Performing Quality Review";
    if (status === "DraftSent") return "Draft Awaiting Your Approval";
    if (status === "DraftAccepted" || status === "UserAccepted") return "Draft Accepted";
    if (status === "DraftRejected") return "Rejected by User";
    if (status === "Rejected") return "Service Rejected";
    if (status === "Completed") return "Service Completed";
    if (status === "Open") return "Pending Verification";
    return status;
  };

  const getStatusTheme = (lead) => {
    const status = lead?.status;
    const rejectionLabel = getRejectionDisplayLabel(lead);
    if (isExecutorRejectedState(lead) || rejectionLabel) {
      return { color: "#ef4444", bg: "rgba(239,68,68,0.12)" };
    }
    if (isRejectedServiceState(lead)) {
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

  const normalizeSearch = (value) => String(value || "").trim().toLowerCase();

  const leadMatchesSearch = (lead, term) => {
    if (!term) return true;

    const fieldsToMatch = [
      lead?.serviceName,
      lead?._id,
      lead?.status,
      lead?.adminMessage,
      lead?.userMessage,
      lead?.prFeedback,
      lead?.executorMessage,
      lead?.recommendedFees,
      lead?.recommendedFeeAmount,
      lead?.createdAt,
    ];

    const documentNames = Array.isArray(lead?.documents)
      ? lead.documents.flatMap((doc) => [
          doc?.name,
          doc?.originalName,
          doc?.fileName,
          doc?.filename,
          doc?.status,
        ])
      : [];

    return [...fieldsToMatch, ...documentNames].some((value) =>
      normalizeSearch(value).includes(term),
    );
  };

  const filteredLeads = leads.filter((lead) => {
    const term = normalizeSearch(serviceSearch);
    return leadMatchesSearch(lead, term);
  });

  const selectedLeadFromFiltered =
    leads.find((lead) => lead._id === expandedId && filteredLeads.some((item) => item._id === lead._id)) ||
    filteredLeads[0] ||
    null;
  const selectedLead =
    serviceSearch.trim() && filteredLeads.length === 0
      ? null
      : selectedLeadFromFiltered || leads.find((lead) => lead._id === expandedId) || leads[0] || null;
  const firstVisibleLeadId = filteredLeads[0]?._id || leads[0]?._id || null;
  const selectedStatusText = selectedLead ? getDisplayStatus(selectedLead) : "No service selected";
  const selectedStatusBadge = selectedLead
    ? getStatusTheme(selectedLead)
    : { color: "#9ca3af", bg: "rgba(255,255,255,0.04)" };

  const selectedLeadDocuments = selectedLead ? getLeadDocumentsToDisplay(selectedLead) : [];
  const uploadedDocumentCount = selectedLeadDocuments.filter((doc) => {
    const status = String(doc?.status || "").trim().toLowerCase();
    // A document is considered "uploaded" if it has a confirmed status, a URL, or a publicId from the storage provider.
    return ["uploaded", "accepted", "verified", "approved", "completed", "pending"].includes(status) && (!!doc?.url || !!doc?.publicId);
  }).length;
  const documentProgress = selectedLeadDocuments.length
    ? Math.round((uploadedDocumentCount / selectedLeadDocuments.length) * 100)
    : 0;
  const getServiceProgressPercent = (lead) => {
    if (!lead) return 0;
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
  const serviceProgressPercent = getServiceProgressPercent(selectedLead);
  const serviceDate = selectedLead?.createdAt
    ? new Date(selectedLead.createdAt).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
      })
    : "Today";

  useEffect(() => {
    if (!serviceSearch && !expandedId && firstVisibleLeadId) {
      setExpandedId(firstVisibleLeadId);
      return;
    }

    if (serviceSearch && filteredLeads.length > 0 && !filteredLeads.some((lead) => lead._id === expandedId)) {
      setExpandedId(filteredLeads[0]._id);
      return;
    }

    if (serviceSearch && filteredLeads.length === 0 && expandedId !== null) {
      setExpandedId(null);
    }
  }, [expandedId, firstVisibleLeadId, filteredLeads, serviceSearch]);

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
        setLeads(hydrateLeadsWithDocuments(leadsRes.data));

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
    <UserDashboardModern
      navigate={navigate}
      leads={leads}
      filteredLeads={filteredLeads}
      selectedLead={selectedLead}
      setSelectedLeadId={setExpandedId}
      selectedLeadDocuments={selectedLeadDocuments}
      uploadedDocumentCount={uploadedDocumentCount}
      documentProgress={documentProgress}
      serviceProgressPercent={serviceProgressPercent}
      serviceDate={serviceDate}
      stats={stats}
      getStatusTheme={getStatusTheme}
      getDisplayStatus={getDisplayStatus}
      getCommitmentAmount={getCommitmentAmount}
      formatInr={formatInr}
      selectedStatusText={selectedStatusText}
      selectedStatusBadge={selectedStatusBadge}
      dismissedDetailsMissingSignatureByLead={dismissedDetailsMissingSignatureByLead}
      getDetailsMissingSignature={getDetailsMissingSignature}
      getDetailsMissingMessage={getDetailsMissingMessage}
      handleDismissDetailsMissingMessage={handleDismissDetailsMissingMessage}
      handleDeleteRejectionMessage={handleDeleteRejectionMessage}
      isExecutorRejectedState={isExecutorRejectedState}
      isPrRejectedState={isPrRejectedState}
      isRejectedServiceState={isRejectedServiceState}
      isDetailsMissingState={isDetailsMissingState}
      isReviewDraftState={isReviewDraftState}
      getRejectionDisplayLabel={getRejectionDisplayLabel}
      draftRejectingLeadId={draftRejectingLeadId}
      draftRejectDrafts={draftRejectDrafts}
      setDraftRejectDrafts={setDraftRejectDrafts}
      openDraftRejectForm={openDraftRejectForm}
      submitDraftReject={submitDraftReject}
      handleDraftAction={handleDraftAction}
      handleDeleteService={handleDeleteService}
      uploadingId={uploadingId}
      uploadInputRef={uploadInputRef}
      handleUploadDocuments={handleUploadDocuments}
      serviceSearch={serviceSearch}
      setServiceSearch={setServiceSearch}
      messageByLead={messageByLead}
      handleMessageChange={handleMessageChange}
      handleSendMessageToPR={handleSendMessageToPR}
      handleDeleteExecutorMessage={handleDeleteExecutorMessage}
      handleDeleteAdvisorMessage={handleDeleteAdvisorMessage}
      deleteConfirm={deleteConfirm}
      handleConfirmDelete={handleConfirmDelete}
      setDeleteConfirm={setDeleteConfirm}
      viewDocument={viewDocument}
    />
  );

};

export default UserDashboard;
