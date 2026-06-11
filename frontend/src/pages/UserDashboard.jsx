import React, { useState, useRef, useCallback, useEffect } from "react";
import { getStatusLabel, resolveExecutorLabel } from "../utils/statusLabels";
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
import {
  loadHiddenServiceIds,
  saveHiddenServiceIds,
} from "../utils/hiddenServiceStorage";


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
  getServicePricing,
  parseFeeAmount,
  parseAllFeeAmounts,
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
  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const currentUserId = storedUser?._id || storedUser?.id || "";
  const [hiddenLeads, setHiddenLeads] = useState(() => loadHiddenServiceIds("user-dashboard", currentUserId));
  const [dismissedDetailsMissingSignatureByLead, setDismissedDetailsMissingSignatureByLead] = useState(() => {
    try {
      const saved = localStorage.getItem("dismissedDetailsMissingSignatureByLead");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [dismissedAdminDocsByLead, setDismissedAdminDocsByLead] = useState(() => {
    try {
      const saved = localStorage.getItem("dismissedAdminDocsByLead");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, lead: null, isLoading: false });
  const uploadInputRef = useRef(null);
  const navigate = useNavigate();
  const isAdmin = storedUser?.role === "admin";

  useEffect(() => {
    setHiddenLeads(loadHiddenServiceIds("user-dashboard", currentUserId));
  }, [currentUserId]);

  useEffect(() => {
    saveHiddenServiceIds("user-dashboard", currentUserId, hiddenLeads);
  }, [currentUserId, hiddenLeads]);

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
    const latestDraft = sorted.find((doc) => String(doc?.type || "").trim().toLowerCase() === "draft");
    const latestFinal = sorted.find((doc) => String(doc?.type || "").trim().toLowerCase() === "final");
    const nonSpecialDocs = sorted.filter((doc) => {
      const type = String(doc?.type || "").trim().toLowerCase();
      return type !== "draft" && type !== "final";
    });

    const grouped = new Map();
    for (const doc of nonSpecialDocs) {
      const key = normalizeServiceKey(normalizeDocumentName(doc));
      if (!key) continue;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(doc);
    }

    const collapsed = Array.from(grouped.values()).map((group) => {
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

    const appendedDocs = [];

    if (latestDraft) {
      const latestDraftName = normalizeText(normalizeDocumentName(latestDraft));
      const latestDraftCount = sorted.filter((doc) => String(doc?.type || "").trim().toLowerCase() === "draft").length;
      appendedDocs.push({
        ...latestDraft,
        name: normalizeDocumentName(latestDraft),
        displayReuploaded:
          reuploadedDocumentNames.has(latestDraftName) ||
          latestDraftCount > 1 ||
          !!latestDraft?.displayReuploaded ||
          !!latestDraft?.reuploaded ||
          String(latestDraft?.status || "").trim().toLowerCase() === "reuploaded",
      });
    }

    if (latestFinal) {
      const latestFinalName = normalizeText(normalizeDocumentName(latestFinal));
      const latestFinalCount = sorted.filter((doc) => String(doc?.type || "").trim().toLowerCase() === "final").length;
      appendedDocs.push({
        ...latestFinal,
        name: normalizeDocumentName(latestFinal),
        displayReuploaded:
          reuploadedDocumentNames.has(latestFinalName) ||
          latestFinalCount > 1 ||
          !!latestFinal?.displayReuploaded ||
          !!latestFinal?.reuploaded ||
          String(latestFinal?.status || "").trim().toLowerCase() === "reuploaded",
      });
    }

    return [...collapsed, ...appendedDocs];
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
        // Identify which document names have admin-added placeholders (to preserve the flag after dedupe)
        const adminAddedDocNames = new Set(
          (Array.isArray(lead?.documents) ? lead.documents : [])
            .filter(d => d?.adminAdded === true && !d?.url && !d?.publicId && !d?.secure_url && !d?.uploadedUrl)
            .map(d => String(d?.name || "").trim().toLowerCase())
        );
        requiredDocs = matchedService.documentsRequired.map(docName => ({
          name: docName,
          status: "Pending",
          type: "Client",
          adminAdded: adminAddedDocNames.has(String(docName || "").trim().toLowerCase())
        }));
      }

      const pendingDocs = getPendingUploadsForService(lead?.serviceName);
      const currentDocs = Array.isArray(lead?.documents) ? lead.documents : [];
      // Filter out admin-added placeholder entries (adminAdded: true with no URL) so the document
      // only appears in the dashboard once the user has actually uploaded a file. The requiredDocs
      // list (from service.documentsRequired) still includes it so the user is prompted to upload.
      const realCurrentDocs = currentDocs.filter(
        (d) => !(d?.adminAdded === true && !d?.url && !d?.publicId && !d?.secure_url && !d?.uploadedUrl)
      );
      const mergedDocs = dedupeDocumentsByName(
        [...realCurrentDocs, ...pendingDocs, ...requiredDocs],
        {
          reuploadedDocumentNames: lead?.reuploadedDocumentNames,
        },
      );

      const executorRejected = isExecutorRejectedState(lead);
      // A staged service-level executor rejection (not yet notified to client) should
      // NOT change doc statuses or show any rejection state to the user.
      const isExecutorServiceRejectionPending =
        lead?.executorServiceRejected === true &&
        lead?.prNotifiedClientServiceRejection !== true;
      const serviceRejected =
        !isExecutorServiceRejectionPending &&
        String(lead?.status || "").trim().toLowerCase() === "rejected";
      const draftRejected = String(lead?.status || "").trim().toLowerCase() === "draftrejected";

      let finalDocs = mergedDocs.map(doc => {
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

      // Filter out draft documents that haven't been sent yet
      const isDraftSent = ["DraftSent", "DraftAccepted", "DraftRejected", "UserAccepted", "Completed"].includes(lead?.status);
      if (!isDraftSent) {
        finalDocs = finalDocs.filter(doc => String(doc?.type || "").trim().toLowerCase() !== "draft");
      }

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
    const handleServiceDeleted = async () => {
      try {
        const user = JSON.parse(localStorage.getItem("user"));
        const apiUrl = import.meta.env.VITE_API_URL;
        const userId = user?._id || user?.id;
        if (!apiUrl) return;

        const [leadsRes, servicesRes] = await Promise.all([
          axios.get(`${apiUrl}/leads?userId=${userId}`, {
            headers: user?.token ? { Authorization: `Bearer ${user.token}` } : undefined,
          }).catch(() => ({ data: [] })),
          axios.get(`${apiUrl}/services`).catch(() => ({ data: [] })),
        ]);

        const fetchedServices = Array.isArray(servicesRes.data) ? servicesRes.data : [];
        const fetchedLeads = Array.isArray(leadsRes.data) ? leadsRes.data : [];

        setServices(fetchedServices);
        setLeads(hydrateLeadsWithDocuments(fetchedLeads, fetchedServices));
      } catch (err) {
        console.error("Error refreshing dashboard after service deletion:", err);
      }
    };

    const handleServiceDocumentAdded = async () => {
      try {
        const user = JSON.parse(localStorage.getItem("user"));
        const apiUrl = import.meta.env.VITE_API_URL;
        const userId = user?._id || user?.id;
        if (!apiUrl) return;

        const [leadsRes, servicesRes] = await Promise.all([
          axios.get(`${apiUrl}/leads?userId=${userId}`, {
            headers: user?.token ? { Authorization: `Bearer ${user.token}` } : undefined,
          }).catch(() => ({ data: [] })),
          axios.get(`${apiUrl}/services`).catch(() => ({ data: [] })),
        ]);

        const fetchedServices = Array.isArray(servicesRes.data) ? servicesRes.data : [];
        const fetchedLeads = Array.isArray(leadsRes.data) ? leadsRes.data : [];

        setServices(fetchedServices);
        setLeads(hydrateLeadsWithDocuments(fetchedLeads, fetchedServices));
      } catch (err) {
        console.error("Error refreshing dashboard after service document addition:", err);
      }
    };

    window.addEventListener("service-deleted", handleServiceDeleted);
    window.addEventListener("service-document-added", handleServiceDocumentAdded);
    return () => {
      window.removeEventListener("service-deleted", handleServiceDeleted);
      window.removeEventListener("service-document-added", handleServiceDocumentAdded);
    };
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
      const serviceRejected = ["rejected", "informationrequired"].includes(String(lead?.status || "").trim().toLowerCase());
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

        // Clear the dismissal signature for this lead so the refreshed state is shown cleanly
        if (isReuploadFlow) {
          setDismissedDetailsMissingSignatureByLead((prev) => {
            const updated = { ...prev };
            delete updated[leadId];
            localStorage.setItem("dismissedDetailsMissingSignatureByLead", JSON.stringify(updated));
            return updated;
          });
        }
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
    if (!lead) return;

    setDeleteConfirm((prev) => ({ ...prev, isLoading: true }));
    setHiddenLeads((prev) => (prev.includes(lead._id) ? prev : [...prev, lead._id]));
    setExpandedId((prev) => (prev === lead._id ? null : prev));
    toast.success(`${lead?.serviceName || "this service"} removed from this dashboard`);
    setDeleteConfirm({ isOpen: false, lead: null, isLoading: false });
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

  // Only count a document as "rejected" for the user if the PR has explicitly notified the client.
  // executorRejected docs where prNotifiedClient is false are invisible to the user.
  const hasRejectedDocuments = (lead) =>
    Array.isArray(lead?.documents) &&
    lead.documents.some((doc) => {
      if (doc?.status !== "Rejected") return false;
      // If the rejection came from the executor, only count it once PR has notified the client
      if (doc?.executorRejected && !doc?.prNotifiedClient) return false;
      return true;
    });

  const isRejectedServiceState = (lead) => {
    // Staged executor service rejection — not yet visible to user
    if (lead?.executorServiceRejected === true && lead?.prNotifiedClientServiceRejection !== true) {
      return false;
    }
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

  // Get the list of new admin-added documents that the user has not yet uploaded.
  // These docs have an admin-added placeholder entry in the lead's documents (adminAdded: true, no URL).
  const getPendingAdminAddedDocuments = (lead) => {
    if (!lead) return [];
    const currentDocs = Array.isArray(lead?.documents) ? lead.documents : [];

    // Find documents that have an admin-added placeholder (adminAdded: true, no URL)
    const adminAddedPlaceholders = currentDocs.filter((d) => {
      return d?.adminAdded === true && !d?.url && !d?.publicId && !d?.secure_url && !d?.uploadedUrl;
    });

    // Return the names of those placeholders that the user hasn't uploaded yet
    // (the placeholder itself has no URL, so check if there's no other entry with a URL for the same name)
    return adminAddedPlaceholders
      .map((d) => String(d?.name || "").trim())
      .filter((name) => name)
      .filter((name) => {
        const target = name.toLowerCase();
        return !currentDocs.some((d) => {
          const docName = String(d?.name || "").trim().toLowerCase();
          const hasUrl = d?.url || d?.publicId || d?.secure_url || d?.uploadedUrl;
          return docName === target && hasUrl;
        });
      });
  };

  const getLeadDocumentsToDisplay = (lead) => {
    if (!lead) return [];
    // We utilize the centralized hydration logic to ensure consistency across the dashboard.
    // This merges backend docs, pending localStorage uploads, and required placeholders.
    const hydratedLeads = hydrateLeadsWithDocuments([lead], services);
    const docs = hydratedLeads[0]?.documents || [];
    // Filter out admin-added placeholder entries (adminAdded: true with no URL) so the document
    // only appears in the dashboard once the user has actually uploaded a file.
    return docs.filter(
      (d) => !(d?.adminAdded === true && !d?.url && !d?.publicId && !d?.secure_url && !d?.uploadedUrl)
    );
  };

  const isAdminRejectedState = (lead) =>
    lead?.status === "Rejected" &&
    String(lead?.adminMessage || "")
      .toLowerCase()
      .includes("administrator");

  const isPrRejectedState = (lead) => {
    if (!lead || lead?.status !== "Rejected") return false;
    // If the executor rejected the service but PR hasn't notified the client yet,
    // suppress ALL rejection state from the user — they should see nothing yet.
    if (lead?.executorServiceRejected === true && lead?.prNotifiedClientServiceRejection !== true) {
      return false;
    }
    return !isExecutorRejectedState(lead);
  };

  const isExecutorRejectedState = (lead) => {
    if (!lead || lead?.status !== "Rejected") return false;
    // If the executor rejected the service but PR hasn't notified the client yet,
    // hide the rejection from user/admin dashboards — only PR can see it.
    if (lead?.executorServiceRejected === true && lead?.prNotifiedClientServiceRejection !== true) {
      return false;
    }
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

  const isDetailsMissingState = (lead) => {
    // If executor rejection is pending PR notification, don't treat as "details missing" for the user
    const hasPendingExecutorRejection = Array.isArray(lead?.documents) &&
      lead.documents.some((d) => d?.executorRejected && !d?.prNotifiedClient);
    if (hasPendingExecutorRejection) return false;

    return (
      !isExecutorRejectedState(lead) &&
      !isPrRejectedState(lead) &&
      (isRejectedServiceState(lead) || hasRejectedDocuments(lead))
    );
  };

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

  const getEffectiveLeadStatus = (lead) => {
    const rawStatus = String(lead?.status || "").trim();
    const lowerStatus = rawStatus.toLowerCase();
    const hasFinalDocument = Array.isArray(lead?.documents)
      && lead.documents.some((doc) => String(doc?.type || "").trim().toLowerCase() === "final");

    if (lowerStatus === "draftrejected") return "DraftRejected";
    if (hasFinalDocument && !["rejected", "informationrequired"].includes(lowerStatus)) {
      return "Completed";
    }

    return rawStatus;
  };

  const isReviewDraftState = (lead) => {
    if (isDetailsMissingState(lead)) return false;
    if (lead?.status === "DraftRejected") return false;
    if (lead?.status === "DraftSent") return true;
    return hasDraftDocument(lead) && hasDraftReviewInstruction(lead);
  };

  const getDetailsMissingMessage = (lead) => {
    if (isExecutorRejectedState(lead)) {
      return "Rejected by Executor. Please reupload the documents of this service from the Services page.";
    }

    const rejectionNote = String(lead?.prFeedback || "").trim();
    if (rejectionNote) return rejectionNote;

    if (isRejectedServiceState(lead)) {
      return "Rejected by PR. Please reupload the documents of this service from the Services page.";
    }

    const rejectedDoc = Array.isArray(lead?.documents)
      ? lead.documents.find((doc) => doc?.status === "Rejected")
      : null;
    if (rejectedDoc) return getDocumentRejectionText(rejectedDoc);

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
    setDismissedDetailsMissingSignatureByLead((prev) => {
      const updated = {
        ...prev,
        [leadId]: signature,
      };
      // Use the SAME key as the initializer so the dismissal persists across refreshes
      localStorage.setItem("dismissedDetailsMissingSignatureByLead", JSON.stringify(updated));
      return updated;
    });
  };

  const visibleLeads = leads.filter((lead) => {
    if (hiddenLeads.includes(lead._id)) return false;
    const serviceKey = normalizeServiceKey(lead?.serviceName);
    if (!serviceKey) return false;
    const serviceExists = services.some(
      (s) => normalizeServiceKey(s?.title) === serviceKey
    );
    return serviceExists;
  });

  const stats = {
    pending: visibleLeads.filter((l) => {
      // Staged executor rejection looks like "Rejected" to the DB but should count as inProgress for the user
      if (l?.executorServiceRejected === true && l?.prNotifiedClientServiceRejection !== true) return false;
      return ["Open", "PendingReview", "InformationRequired", "PR_Accepted", "DraftRejected", "Rejected"].includes(l.status);
    }).length,
    inProgress: visibleLeads.filter((l) => {
      // Staged executor rejection: treat as inProgress from the user's perspective
      if (l?.executorServiceRejected === true && l?.prNotifiedClientServiceRejection !== true) return true;
      return ["AssignedToExecutor", "InProgress", "ExecutionFinished", "DraftSent", "DraftAccepted", "UserAccepted"].includes(getEffectiveLeadStatus(l));
    }).length,
    completed: visibleLeads.filter((l) => getEffectiveLeadStatus(l) === "Completed").length,
    totalCommitment: visibleLeads.reduce(
      (sum, lead) => {
        if (!shouldCountLeadRevenue(lead)) return sum;
        return sum + getCommitmentAmount(lead);
      },
      0,
    ),
    totalCommitmentHigh: visibleLeads.reduce(
      (sum, lead) => {
        if (!shouldCountLeadRevenue(lead)) return sum;
        return sum + getCommitmentPair(lead).high;
      },
      0,
    ),
    totalCommitmentSmall: visibleLeads.reduce(
      (sum, lead) => {
        if (!shouldCountLeadRevenue(lead)) return sum;
        return sum + getCommitmentPair(lead).small;
      },
      0,
    ),
  };

  const getServicesByStatus = (status) => {
    if (status === "pending") {
      return visibleLeads.filter((l) => {
        if (l?.executorServiceRejected === true && l?.prNotifiedClientServiceRejection !== true) return false;
        return ["Open", "PendingReview", "InformationRequired", "PR_Accepted", "DraftRejected", "Rejected"].includes(l.status);
      });
    }
    if (status === "inProgress") {
      return visibleLeads.filter((l) => {
        if (l?.executorServiceRejected === true && l?.prNotifiedClientServiceRejection !== true) return true;
        return ["AssignedToExecutor", "InProgress", "ExecutionFinished", "DraftSent", "DraftAccepted", "UserAccepted"].includes(getEffectiveLeadStatus(l));
      });
    }
    if (status === "completed") {
      return visibleLeads.filter((l) => getEffectiveLeadStatus(l) === "Completed");
    }
    return [];
  };

  const getTotalRevenueBreakdown = () => {
    const pendingLeads = visibleLeads.filter((l) => {
      if (l?.executorServiceRejected === true && l?.prNotifiedClientServiceRejection !== true) return false;
      return ["Open", "PendingReview", "InformationRequired", "PR_Accepted", "DraftRejected", "Rejected"].includes(l.status);
    });
    const inProgressLeads = visibleLeads.filter((l) => {
      if (l?.executorServiceRejected === true && l?.prNotifiedClientServiceRejection !== true) return true;
      return ["AssignedToExecutor", "InProgress", "ExecutionFinished", "DraftSent", "DraftAccepted", "UserAccepted"].includes(getEffectiveLeadStatus(l));
    });
    const completedLeads = visibleLeads.filter((l) => getEffectiveLeadStatus(l) === "Completed");

    return {
      pending: pendingLeads.reduce((sum, l) => sum + (shouldCountLeadRevenue(l) ? getCommitmentAmount(l) : 0), 0),
      inProgress: inProgressLeads.reduce((sum, l) => sum + (shouldCountLeadRevenue(l) ? getCommitmentAmount(l) : 0), 0),
      completed: completedLeads.reduce((sum, l) => sum + (shouldCountLeadRevenue(l) ? getCommitmentAmount(l) : 0), 0),
      total: stats.totalCommitment,
      high: stats.totalCommitmentHigh,
      small: stats.totalCommitmentSmall,
    };
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

  function getCommitmentPair(lead) {
    const catalogService = services.find(s => normalizeText(s?.title) === normalizeText(lead?.serviceName));
    const catalogOurFeeAmount = parseFeeAmount(catalogService?.recommendedFees);
    if (Number.isFinite(catalogOurFeeAmount) && catalogOurFeeAmount > 0) {
      return { high: catalogOurFeeAmount, small: catalogOurFeeAmount };
    }
    const leadRaw = lead?.recommendedFees || lead?.recommendedFeeAmount || "";
    const leadAmounts = parseAllFeeAmounts(leadRaw);
    if (leadAmounts.length >= 1) {
      const ourFee = leadAmounts[0];
      if (Number.isFinite(ourFee) && ourFee > 0) return { high: ourFee, small: ourFee };
    }
    const catalogAmounts = parseAllFeeAmounts(catalogService?.marketFees || "");
    if (catalogAmounts.length >= 1) {
      const ourFee = catalogAmounts[0];
      if (Number.isFinite(ourFee) && ourFee > 0) return { high: ourFee, small: ourFee };
    }
    const pricing = getServicePricing(lead?.serviceName);
    return { high: pricing.amount, small: pricing.amount };
  }

  function getCommitmentAmount(lead) {
    return getCommitmentPair(lead).high;
  }

  const getDisplayStatus = (lead) => {
    const status = getEffectiveLeadStatus(lead);
    const docs = getLeadDocumentsToDisplay(lead);
    const hasUploaded = Array.isArray(docs) && docs.some(d => {
      const s = String(d?.status || "").trim().toLowerCase();
      return ["uploaded", "accepted", "verified", "approved", "completed", "reuploaded"].includes(s) || !!d?.url || !!d?.publicId;
    });

    if (status === "DraftRejected") return "Draft Rejected by User";

    if (status === "ExecutionFinished" && lead?.draftSentToPR) {
      return `Draft Sent to PR by ${resolveExecutorLabel(lead)}`;
    }

    // Executor rejected the service but PR hasn't clicked "Notify Client" yet —
    // show as "Executor X Reviewing" so the client sees normal in-progress state.
    if (lead?.executorServiceRejected === true && lead?.prNotifiedClientServiceRejection !== true) {
      const executorLabel = resolveExecutorLabel(lead);
      return `${executorLabel} Reviewing`;
    }

    const rejectionLabel = getRejectionDisplayLabel(lead);
    if (rejectionLabel) return rejectionLabel;

    if (isRejectedServiceState(lead)) return "Rejected";
    if (isDetailsMissingState(lead)) return "Rejected by PR";
    if (isReviewDraftState(lead)) return "Review Draft";
    if (status === "InformationRequired") {
      const hydrated = getLeadDocumentsToDisplay(lead);
      const hasRejectedDoc = Array.isArray(hydrated) && hydrated.some(d => String(d?.status || "").trim().toLowerCase() === "rejected");
      if (!hasRejectedDoc) return "PR Reviewing";
      return "Service rejected by PR. Action required.";
    }
    if (status === "PendingReview" || (status === "Open" && hasUploaded)) return "PR Reviewing";
    // When executor is reviewing the service — don't show "Rejected" yet if not notified
    if (status === "AssignedToExecutor" || status === "PR_Accepted") {
      const hasPendingExecutorRejection = Array.isArray(lead?.documents) &&
        lead.documents.some((d) => d?.executorRejected && !d?.prNotifiedClient);
      if (hasPendingExecutorRejection) return "Executor Reviewing";
    }
    return getStatusLabel(status, lead, "user");
  };

  const getStatusTheme = (lead) => {
    const status = getEffectiveLeadStatus(lead);

    if (status === "ExecutionFinished" && lead?.draftSentToPR) {
      return { color: "#7c3aed", bg: "rgba(124,58,237,0.1)" };
    }
    // Executor rejected the service but PR hasn't clicked "Notify Client" yet —
    // treat it as in-progress so the user sees a green/progress theme.
    if (lead?.executorServiceRejected === true && lead?.prNotifiedClientServiceRejection !== true) {
      return { color: "#10b981", bg: "rgba(16,185,129,0.1)" };
    }

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
    if (status === "DraftRejected") {
      return { color: "#16a34a", bg: "rgba(22,163,74,0.1)" };
    }
    if (isReviewDraftState(lead)) {
      return { color: "#16a34a", bg: "rgba(22,163,74,0.1)" };
    }
    if (status === "Completed") {
      return { color: "#10b981", bg: "rgba(16,185,129,0.1)" };
    }
    if (["InProgress", "AssignedToExecutor"].includes(status)) {
      return { color: "#10b981", bg: "rgba(16,185,129,0.1)" };
    }
    if (
      status === "InformationRequired" ||
      status === "DraftRejected" ||
      status === "Rejected"
    ) {
      if (status === "InformationRequired") {
        const hydrated = getLeadDocumentsToDisplay(lead);
        const hasRejectedDoc = Array.isArray(hydrated) && hydrated.some(d => String(d?.status || "").trim().toLowerCase() === "rejected");
        if (!hasRejectedDoc) {
          return { color: "#f59e0b", bg: "rgba(245,158,11,0.1)" };
        }
      }
      return { color: "#ef4444", bg: "rgba(239,68,68,0.12)" };
    }
    if (status === "DraftSent") {
      return { color: "#16a34a", bg: "rgba(22,163,74,0.1)" };
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

  const filteredLeads = visibleLeads.filter((lead) => {
    const term = normalizeSearch(serviceSearch);
    return leadMatchesSearch(lead, term);
  });

  const selectedLeadFromFiltered =
    visibleLeads.find((lead) => lead._id === expandedId && filteredLeads.some((item) => item._id === lead._id)) ||
    filteredLeads[0] ||
    null;
  const selectedLead =
    serviceSearch.trim() && filteredLeads.length === 0
      ? null
      : selectedLeadFromFiltered || visibleLeads.find((lead) => lead._id === expandedId) || visibleLeads[0] || null;
  const firstVisibleLeadId = filteredLeads[0]?._id || visibleLeads[0]?._id || null;
  const selectedStatusText = selectedLead ? getDisplayStatus(selectedLead) : "No service selected";
  const selectedStatusBadge = selectedLead
    ? getStatusTheme(selectedLead)
    : { color: "#9ca3af", bg: "rgba(255,255,255,0.04)" };

  const selectedLeadDocuments = selectedLead ? getLeadDocumentsToDisplay(selectedLead) : [];
  const selectedLeadPendingAdminDocs = selectedLead ? getPendingAdminAddedDocuments(selectedLead) : [];
  const selectedLeadPendingAdminDocsDismissed = selectedLead ? dismissedAdminDocsByLead[selectedLead._id] === true : false;
  const handleDismissAdminDocsBanner = useCallback((leadId) => {
    setDismissedAdminDocsByLead((prev) => {
      const next = { ...prev, [leadId]: true };
      try {
        localStorage.setItem("dismissedAdminDocsByLead", JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);
  const uploadedDocumentCount = selectedLeadDocuments.filter((doc) => {
    // Keep the count stable after rejections by counting any document that still has a stored file.
    // This preserves the visible upload count even when the backend marks the service/document as rejected.
    return Boolean(
      doc?.url ||
      doc?.secure_url ||
      doc?.uploadedUrl ||
      doc?.viewUrl ||
      doc?.publicId ||
      doc?.filename ||
      doc?.fileName
    );
  }).length;
  const documentProgress = selectedLeadDocuments.length
    ? Math.round((uploadedDocumentCount / selectedLeadDocuments.length) * 100)
    : 0;
  const getServiceProgressPercent = (lead) => {
    if (!lead) return 0;

    // Staged executor service rejection — PR hasn't notified client yet.
    // Show InProgress-level progress so nothing unusual appears.
    if (lead?.executorServiceRejected === true && lead?.prNotifiedClientServiceRejection !== true) {
      return 60;
    }

    // Maintain parity with Admin and PR dashboard calculations
    if (isExecutorRejectedState(lead)) return 20;

    // DraftRejected must be checked before isDetailsMissingState — the backend marks the
    // draft document as "Rejected" when the user rejects it, which would make
    // isDetailsMissingState() return true and incorrectly set progress to 20.
    const status = String(getEffectiveLeadStatus(lead) || "").trim();
    if (status === "DraftRejected") return 70;

    if (isDetailsMissingState(lead)) return 20;
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
      selectedLeadPendingAdminDocs={selectedLeadPendingAdminDocs}
      selectedLeadPendingAdminDocsDismissed={selectedLeadPendingAdminDocsDismissed}
      handleDismissAdminDocsBanner={handleDismissAdminDocsBanner}
      uploadedDocumentCount={uploadedDocumentCount}
      documentProgress={documentProgress}
      serviceProgressPercent={serviceProgressPercent}
      serviceDate={serviceDate}
      stats={stats}
      getServicesByStatus={getServicesByStatus}
      getTotalRevenueBreakdown={getTotalRevenueBreakdown}
      getStatusTheme={getStatusTheme}
      getDisplayStatus={getDisplayStatus}
      getCommitmentAmount={getCommitmentAmount}
      getCommitmentPair={getCommitmentPair}
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
      handleDeleteAdvisorMessage={handleDeleteAdvisorMessage}
      deleteConfirm={deleteConfirm}
      handleConfirmDelete={handleConfirmDelete}
      setDeleteConfirm={setDeleteConfirm}
      viewDocument={viewDocument}
    />
  );

};

export default UserDashboard;
