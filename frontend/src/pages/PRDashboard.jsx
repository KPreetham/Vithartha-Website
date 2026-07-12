import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import {
  LayoutDashboard,
  FileText,
  User,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  MessageSquare,
  Users,
  Upload,
  Send,
  Loader2,
  Check,
  X,
  Target,
  Briefcase,
  Layers,
  ShieldAlert
} from "lucide-react";
import { viewDocument } from "../utils/documentViewer";
import { normalizeRole } from "../utils/roleRouting";
import Loader from "../components/Loader";
import ConfirmationModal from "../components/ConfirmationModal";
import {
  formatInr,
  getServicePricing,
  getLeadRevenueAmount,
  shouldCountLeadRevenue,
} from "../utils/servicePricing";
import PRDashboardModern from "./PRDashboardModern";
import {
  loadHiddenServiceIds,
  saveHiddenServiceIds,
} from "../utils/hiddenServiceStorage";

const PRDashboard = () => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [executors, setExecutors] = useState([]);
  const [services, setServices] = useState([]);
  const [uploadingId, setUploadingId] = useState(null);
  const [messageDrafts, setMessageDrafts] = useState({});
  const [showCommunicationBox, setShowCommunicationBox] = useState(true);
  const [rejectDrafts, setRejectDrafts] = useState({});
  const [rejectingLeadId, setRejectingLeadId] = useState(null);
  const [docRejectDrafts, setDocRejectDrafts] = useState({});
  const [rejectingDocKey, setRejectingDocKey] = useState(null);
  const [additionalDetailsDrafts, setAdditionalDetailsDrafts] = useState({});
  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const currentUserId = storedUser?._id || storedUser?.id || "";
  const [hiddenLeads, setHiddenLeads] = useState(() => loadHiddenServiceIds("pr-dashboard", currentUserId));
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, lead: null, isLoading: false });
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const navigate = useNavigate();
  const isUserRole = normalizeRole(storedUser?.role) === "user";

  useEffect(() => {
    setHiddenLeads(loadHiddenServiceIds("pr-dashboard", currentUserId));
  }, [currentUserId]);

  useEffect(() => {
    saveHiddenServiceIds("pr-dashboard", currentUserId, hiddenLeads);
  }, [currentUserId, hiddenLeads]);

  useEffect(() => {
    fetchData();
    // Auto-refresh every 30 seconds to catch new service requests immediately
    const interval = setInterval(fetchData, 30000);
    const handleRefreshSignal = () => fetchData();
    const handleStorage = (event) => {
      if (event.key === "pr-dashboard-refresh") {
        fetchData();
      }
    };

    window.addEventListener("pr-dashboard-refresh", handleRefreshSignal);
    window.addEventListener("storage", handleStorage);
    window.addEventListener("service-deleted", handleRefreshSignal);
    window.addEventListener("service-document-added", handleRefreshSignal);

    return () => {
      clearInterval(interval);
      window.removeEventListener("pr-dashboard-refresh", handleRefreshSignal);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("service-deleted", handleRefreshSignal);
      window.removeEventListener("service-document-added", handleRefreshSignal);
    };
  }, []);

  const fetchData = async () => {
    try {
      const currentUser = JSON.parse(localStorage.getItem("user"));
      if (!currentUser?.token) {
        toast.error("Please log in again to view the PR dashboard");
        navigate("/login");
        return;
      }

      const configuredApiUrl =
        import.meta.env.VITE_API_URL || "/api";
      const headers = { Authorization: `Bearer ${currentUser?.token}` };

      const tryFetch = async (apiUrl) => {
        console.log(
          `[PRDashboard] Fetching from: ${apiUrl}/leads and ${apiUrl}/auth/users`
        );

        const [leadsRes, usersRes, servicesRes] = await Promise.allSettled([
          axios.get(`${apiUrl}/leads`, { headers }),
          axios.get(`${apiUrl}/auth/pr-executors`, { headers }),
          axios.get(`${apiUrl}/services`),
        ]);

        return { leadsRes, usersRes, servicesRes };
      };

      let { leadsRes, usersRes, servicesRes } = await tryFetch(configuredApiUrl);

      // If the frontend is running without a dev proxy (e.g. preview build),
      // a relative `/api` may not be reachable. Retry with localhost backend.
      if (
        leadsRes.status === "rejected" &&
        typeof configuredApiUrl === "string" &&
        configuredApiUrl.startsWith("/")
      ) {
        ({ leadsRes, usersRes, servicesRes } = await tryFetch("http://127.0.0.1:5000/api"));
      }

      // prepare services list if available
      const servicesList = (servicesRes?.status === "fulfilled" && Array.isArray(servicesRes.value.data)) ? servicesRes.value.data : [];

      if (leadsRes.status === "fulfilled") {
        const leadsData = Array.isArray(leadsRes.value.data) ? leadsRes.value.data : [];
        setLeads(hydrateLeadsWithDocuments(leadsData, servicesList));
      } else {
        throw leadsRes.reason;
      }

      // pr-executors endpoint returns only PR/executor roles; filter to executors only for assignment dropdown.
      if (usersRes.status === "fulfilled" && Array.isArray(usersRes.value.data)) {
        setExecutors(usersRes.value.data.filter((u) => /^executor\d+$/i.test(String(u.role || "").trim())));
      } else {
        setExecutors([]);
      }

      if (servicesRes?.status === "fulfilled" && Array.isArray(servicesRes.value.data)) {
        setServices(servicesRes.value.data);
      } else {
        setServices([]);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      if (error.response) {
        console.error("Response data:", error.response.data);
        console.error("Response status:", error.response.status);
        if (error.response.status === 401) {
          toast.error("Session expired. Please log in again.");
          navigate("/login");
          return;
        }
      }
      toast.error("Failed to load dashboard data");
    } finally {
      setTimeout(() => setLoading(false), 500);
    }
  };

  const normalizeDocumentKey = (value) =>
    String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const getMatchedService = (lead) => {
    const serviceKey = normalizeDocumentKey(lead?.serviceName);
    if (!serviceKey || !Array.isArray(services)) return null;

    return (
      services.find((service) => {
        const titleKey = normalizeDocumentKey(service?.title);
        return titleKey === serviceKey || titleKey.includes(serviceKey) || serviceKey.includes(titleKey);
      }) || null
    );
  };

  // Hydration helpers (merge server docs with pending local uploads)
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

  const getCatalogServiceForLead = (lead) => {
    const target = normalizeServiceKey(lead?.serviceName);
    if (!target) return null;
    return services.find((s) => normalizeServiceKey(s?.title) === target) || null;
  };

  const getLeadRevenueWithCatalog = (lead) => {
    const catalog = getCatalogServiceForLead(lead);
    return getLeadRevenueAmount(lead, catalog);
  };

  const getPendingUploadsForService = (serviceName) => {
    const target = normalizeServiceKey(serviceName);
    if (!target) return [];

    const saved = localStorage.getItem("pending_uploads");
    if (!saved) return [];

    try {
      const parsed = JSON.parse(saved);
      const currentUserId = JSON.parse(localStorage.getItem("user"))?._id;
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
        ? options.reuploadedDocumentNames.map((name) => String(name || "").trim().toLowerCase()).filter(Boolean)
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
      const docName = String(normalizeDocumentName(selected)).trim().toLowerCase();

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

  const hydrateLeadsWithDocuments = (leadList, servicesList = []) => {
    const list = Array.isArray(leadList) ? leadList : [];
    return list.map((lead) => {
      // Required-document placeholders are sourced from THIS lead's own
      // documentsRequired field only — never the shared Service catalog.
      // A document admin requested for one user must never appear as
      // "required"/"Pending" on another user's lead for the same service.
      const leadRequiredDocNames = Array.isArray(lead?.documentsRequired) ? lead.documentsRequired : [];

      let requiredDocs = [];
      if (leadRequiredDocNames.length > 0) {
        // Identify which document names have admin-added placeholders (to preserve the flag after dedupe)
        const adminAddedDocNames = new Set(
          (Array.isArray(lead?.documents) ? lead.documents : [])
            .filter(d => d?.adminAdded === true && !d?.url && !d?.publicId && !d?.secure_url && !d?.uploadedUrl)
            .map(d => String(d?.name || "").trim().toLowerCase())
        );
        // Don't synthesize a "Pending" placeholder for a name that already has a
        // real uploaded file — otherwise it competes with the real entry for the
        // same name once merged.
        const namesWithRealUpload = new Set(
          (Array.isArray(lead?.documents) ? lead.documents : [])
            .filter(d => !!(d?.url || d?.publicId || d?.secure_url || d?.uploadedUrl))
            .map(d => String(d?.name || "").trim().toLowerCase())
        );
        requiredDocs = leadRequiredDocNames
          .filter((docName) => !namesWithRealUpload.has(String(docName || "").trim().toLowerCase()))
          .map((docName) => ({
            name: docName,
            status: "Pending",
            type: "Client",
            adminAdded: adminAddedDocNames.has(String(docName || "").trim().toLowerCase())
          }));
      }

      const pendingDocs = getPendingUploadsForService(lead?.serviceName);
      const currentDocs = Array.isArray(lead?.documents) ? lead.documents : [];
      // Filter out admin-added placeholder entries (adminAdded: true with no URL) so the document
      // only appears in the dashboard once the user has actually uploaded a file.
      const realCurrentDocs = currentDocs.filter(
        (d) => !(d?.adminAdded === true && !d?.url && !d?.publicId && !d?.secure_url && !d?.uploadedUrl)
      );
      const mergedDocsRaw = dedupeDocumentsByName([...realCurrentDocs, ...pendingDocs, ...requiredDocs], {
        reuploadedDocumentNames: lead?.reuploadedDocumentNames,
      });
      // requiredDocs (sourced from the service catalog) never carry a URL, so an
      // unresolved admin-requested one would otherwise slip through the merge above
      // (only realCurrentDocs was filtered) and show up as a "Pending" document
      // before the client has uploaded anything.
      const mergedDocs = mergedDocsRaw.filter(
        (d) => !(d?.adminAdded === true && !d?.url && !d?.publicId && !d?.secure_url && !d?.uploadedUrl)
      );

      const executorRejected = (lead) => {
        if (!lead || lead?.status !== "Rejected") return false;
        // In PR dashboard we show service-level executor rejections even before notifying the client —
        // this is intentional so PR sees the staging state and can act on it.
        // The gate (prNotifiedClientServiceRejection) only affects other dashboards.
        const execMsg = String(lead?.executorMessage || "").trim();
        const prMsg = String(lead?.prFeedback || "").toLowerCase();
        const adminMsg = String(lead?.adminMessage || "").toLowerCase();
        const executorIndicators = ["executor", "assignment rejected", "rejected by executor"];
        return (
          execMsg.length > 0 ||
          executorIndicators.some((ind) => prMsg.includes(ind)) ||
          executorIndicators.some((ind) => adminMsg.includes(ind))
        );
      };

      const executorRejectedFlag = executorRejected(lead);
      const serviceRejected = String(lead?.status || "").trim().toLowerCase() === "rejected";
      const draftRejected = String(lead?.status || "").trim().toLowerCase() === "draftrejected";

      const finalDocs = mergedDocs.map((doc) => {
        let resolvedStatus = doc?.status || "Pending";
        if (serviceRejected) {
          resolvedStatus = "Rejected";
        } else if (draftRejected && String(doc?.type || "").trim().toLowerCase() === "draft") {
          resolvedStatus = "Rejected";
        }

        return {
          ...doc,
          status: resolvedStatus,
          // Preserve the per-document executorRejected flag from the DB.
          // Only fall back to the lead-level check when the lead itself is Rejected by executor.
          executorRejected: doc?.executorRejected ?? (executorRejectedFlag && serviceRejected),
          prNotifiedClient: doc?.prNotifiedClient ?? false,
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

  const getRequiredServiceDocumentNames = (lead) => {
    // Sourced from this specific lead's own documentsRequired — not the shared
    // Service catalog — so a document requested for one user never counts as
    // "required" for another user's lead on the same service.
    const requiredDocs = Array.isArray(lead?.documentsRequired) ? lead.documentsRequired : [];

    return new Set(
      requiredDocs
        .map((docName) => normalizeDocumentKey(docName))
        .filter(Boolean),
    );
  };

  const PR_SERVICE_POST_DECISION_STATUSES = new Set([
    "pr_accepted",
    "assignedtoexecutor",
    "inprogress",
    "executionfinished",
    "draftsent",
    "draftrejected",
    "draftaccepted",
    "completed",
    "closed",
  ]);

  const isPrServiceDecisionFinalized = (lead) => {
    if (!lead) return false;
    const statusLower = String(lead.status || "").trim().toLowerCase();
    if (!statusLower) return false;
    if (statusLower === "rejected") return true;
    return PR_SERVICE_POST_DECISION_STATUSES.has(statusLower);
  };

  const mergeUpdatedLead = (leadId, updatedLead) => {
    if (!updatedLead) return;
    setLeads((prev) =>
      hydrateLeadsWithDocuments(
        prev.map((item) =>
          String(item._id) === String(leadId) ? { ...item, ...updatedLead } : item
        ),
        services
      )
    );
  };

  const handleUpdateLeadStatus = async (leadId, status, feedback = "", extraFields = {}) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const payload = { status, ...extraFields };
      if (feedback) payload.prFeedback = feedback;

      const response = await axios.patch(
        `${apiUrl}/leads/${leadId}`,
        payload,
        { headers: { Authorization: `Bearer ${storedUser.token}` } }
      );
      mergeUpdatedLead(leadId, response.data?.lead);
      toast.success(`Status updated to ${status}`);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update lead");
    }
  };

  const handleDocumentStatus = async (leadId, docId, status) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const response = await axios.patch(
        `${apiUrl}/leads/${leadId}/documents/${docId}/status`,
        { status },
        { headers: { Authorization: `Bearer ${storedUser.token}` } }
      );
      mergeUpdatedLead(leadId, response.data?.lead);
      toast.success(`Document ${status}`);
      fetchData();
    } catch (error) {
      toast.error("Failed to update document status");
    }
  };

  // PR clicks "Notify Client" on an executor-rejected document —
  // sets doc.status = "Rejected" + lead.status = "InformationRequired" so the user sees it
  const handleNotifyClientDocRejection = async (leadId, docId) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const response = await axios.patch(
        `${apiUrl}/leads/${leadId}/documents/${docId}/notify-client`,
        {},
        { headers: { Authorization: `Bearer ${storedUser.token}` } }
      );
      mergeUpdatedLead(leadId, response.data?.lead);
      toast.success("Client notified — document marked as rejected");
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to notify client");
    }
  };

  // PR clicks "Notify Client" for a service-level executor rejection —
  // opens the gate so the rejection becomes visible to the user/admin/executor dashboards
  const handleNotifyClientServiceRejection = async (leadId) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const response = await axios.patch(
        `${apiUrl}/leads/${leadId}/notify-client-service-rejection`,
        {},
        { headers: { Authorization: `Bearer ${storedUser.token}` } }
      );
      mergeUpdatedLead(leadId, response.data?.lead);
      toast.success("Client notified — service rejection is now visible to the user");
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to notify client");
    }
  };

  const handleAssignExecutor = async (leadId, executorId) => {
    if (!executorId) return;
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      await axios.patch(
        `${apiUrl}/leads/${leadId}/assign`,
        { executorId, status: "AssignedToExecutor" },
        { headers: { Authorization: `Bearer ${storedUser.token}` } }
      );
      toast.success("Lead assigned to executor");
      fetchData();
    } catch (error) {
      toast.error("Failed to assign executor");
    }
  };

  const handleClearExecutorMessage = async (leadId, e) => {
    if (e) e.stopPropagation();
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      await axios.patch(
        `${apiUrl}/leads/${leadId}`,
        { executorMessage: "" },
        { headers: { Authorization: `Bearer ${storedUser.token}` } }
      );
      toast.success("Executor message removed");
      fetchData();
    } catch (error) {
      toast.error("Failed to remove executor message");
    }
  };

  const handleClearUserRejectedMessage = async (leadId, e) => {
    if (e) e.stopPropagation();
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      await axios.patch(
        `${apiUrl}/leads/${leadId}`,
        { userMessage: "" },
        { headers: { Authorization: `Bearer ${storedUser.token}` } }
      );
      toast.success("User rejection message removed");
      fetchData();
    } catch (error) {
      toast.error("Failed to remove user rejection message");
    }
  };

  const handleClearAdminPrMessage = async (leadId, e) => {
    if (e) e.stopPropagation();
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      await axios.patch(
        `${apiUrl}/leads/${leadId}`,
        { adminToPrMessage: "" },
        { headers: { Authorization: `Bearer ${storedUser.token}` } }
      );
      toast.success("Admin message removed");
      fetchData();
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
    setDeleteConfirm((prev) => ({ ...prev, isLoading: true }));
    setHiddenLeads((prev) => (prev.includes(lead._id) ? prev : [...prev, lead._id]));
    setExpandedId((prev) => (prev === lead._id ? null : prev));
    toast.success("Service hidden from this dashboard");
    setDeleteConfirm({ isOpen: false, lead: null, isLoading: false });
  };

  const handleFileUpload = async (leadId, file, type) => {
    if (!file) return;
    const loadingToast = toast.loading(`Uploading ${type}...`);
    setUploadingId(`${leadId}-${type}`);

    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await axios.post(`${apiUrl}/leads/upload`, formData, {
        headers: { Authorization: `Bearer ${storedUser.token}` },
      });

      if (uploadRes.data.success) {
        const updatePayload = {
          $push: {
            documents: {
              name: `${type.toUpperCase()} - ${file.name}`,
              url: uploadRes.data.url,
              publicId: uploadRes.data.filename,
              type: type,
              status: "Accepted",
              uploadedAt: new Date(),
            },
          },
        };

        if (type === "Draft") {
          // Once the draft is uploaded, move the lead into the review-complete stage.
          updatePayload.status = "ExecutionFinished";
          updatePayload.draftReadyToSend = true;
        } else if (type === "Final") {
          updatePayload.status = "Completed";
        }

        await axios.patch(`${apiUrl}/leads/${leadId}`, updatePayload, {
          headers: { Authorization: `Bearer ${storedUser.token}` },
        });

        toast.success(`${type} uploaded successfully`, { id: loadingToast });
        fetchData();
      }
    } catch (error) {
      toast.error(`Upload failed`, { id: loadingToast });
    } finally {
      setUploadingId(null);
    }
  };

  const openRejectForm = (leadId) => {
    setExpandedId(leadId);
    setRejectingLeadId(leadId);
  };

  const handleSendDraftToClient = async (leadId) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      await axios.patch(
        `${apiUrl}/leads/${leadId}`,
        {
          status: "DraftSent",
          userMessage: "",
          draftReadyToSend: false,
        },
        { headers: { Authorization: `Bearer ${storedUser.token}` } }
      );
      toast.success("Draft sent to client");
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send draft");
    }
  };

  const handleSendMessage = async (leadId, message, target = "user") => {
    const trimmedMessage = String(message || "").trim();
    if (!trimmedMessage) {
      toast.error(`Please enter a message for the ${target}`);
      return;
    }

    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const payload = {};
      if (target === "user") payload.prFeedback = trimmedMessage;
      else if (target === "admin") payload.prMessage = trimmedMessage;
      else if (target === "executor") payload.prToExecutorMessage = trimmedMessage;

      await axios.patch(
        `${apiUrl}/leads/${leadId}`,
        payload,
        { headers: { Authorization: `Bearer ${storedUser.token}` } },
      );

      toast.success(`Message sent to ${target}`);
      setMessageDrafts((prev) => ({ ...prev, [leadId]: "" }));
      fetchData();
    } catch (error) {
      toast.error(`Failed to send message to ${target}`);
    }
  };

  const openDocRejectForm = (leadId, doc) => {
    setExpandedId(leadId);
    setRejectingDocKey(`${leadId}:${doc._id}`);
  };

  const handleRejectDocumentWithMessage = async (leadId, doc) => {
    const docKey = `${leadId}:${doc._id}`;
    const reason = String(docRejectDrafts[docKey] || "").trim();
    if (!reason) {
      toast.error("Please enter a rejection message for the client");
      return;
    }

    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      await axios.patch(
        `${apiUrl}/leads/${leadId}/documents/${doc._id}/status`,
        { status: "Rejected", rejectionMessage: reason },
        { headers: { Authorization: `Bearer ${storedUser.token}` } }
      );

      await axios.patch(
        `${apiUrl}/leads/${leadId}`,
        {
          status: "InformationRequired",
          prFeedback: `Document Rejected: ${doc.name}. Reason: ${reason}`,
        },
        { headers: { Authorization: `Bearer ${storedUser.token}` } }
      );

      toast.success("Rejection message sent to client");
      setDocRejectDrafts((prev) => ({ ...prev, [docKey]: "" }));
      setRejectingDocKey(null);
      fetchData();
    } catch (error) {
      toast.error("Failed to reject document");
    }
  };

  const handleRejectService = async (leadId) => {
    const reason = String(rejectDrafts[leadId] || "").trim();
    if (!reason) {
      toast.error("Please enter a rejection message for the user");
      return;
    }

    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const response = await axios.patch(
        `${apiUrl}/leads/${leadId}`,
        { status: "Rejected", prFeedback: reason },
        { headers: { Authorization: `Bearer ${storedUser.token}` } }
      );
      mergeUpdatedLead(leadId, response.data?.lead);
      setRejectDrafts((prev) => ({ ...prev, [leadId]: "" }));
      setRejectingLeadId(null);
      toast.success("Service rejected");
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to reject service");
    }
  };

  const handleNotifyAdminAdditionalDetails = async (leadId) => {
    const message = String(additionalDetailsDrafts[leadId] || "").trim();
    if (!message) {
      toast.error("Please enter additional details before notifying admin");
      return;
    }

    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const response = await axios.patch(
        `${apiUrl}/leads/${leadId}`,
        { prAdditionalDetailsMessage: message },
        { headers: { Authorization: `Bearer ${storedUser.token}` } }
      );
      mergeUpdatedLead(leadId, response.data?.lead);
      setAdditionalDetailsDrafts((prev) => ({ ...prev, [leadId]: "" }));
      toast.success("Admin notified");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to notify admin");
    }
  };

  const getEffectiveLeadStatus = (lead) => {
    const rawStatus = String(lead?.status || "");
    const userMessage = String(lead?.userMessage || "").toLowerCase();
    const looksLikeUserDraftRejection = userMessage.includes("draft rejected by user");
    const hasFinalDocument = Array.isArray(lead?.documents)
      && lead.documents.some((doc) => {
        const docType = String(doc?.type || "").trim().toLowerCase();
        const docName = String(doc?.name || "").trim().toLowerCase();
        return docType === "final" || docName.startsWith("final");
      });

    if (
      rawStatus === "DraftRejected" ||
      ((rawStatus === "InProgress" || rawStatus === "ExecutionFinished") &&
        looksLikeUserDraftRejection)
    ) {
      return "DraftRejected";
    }

    if (hasFinalDocument && rawStatus !== "Rejected" && rawStatus !== "InformationRequired") {
      return "Completed";
    }

    return rawStatus;
  };

  const isPrReuploadReviewState = (lead) => {
    if (!lead) return false;
    const statusLower = String(lead?.status || "").trim().toLowerCase();
    if (!["rejected", "informationrequired"].includes(statusLower)) return false;

    // Use the raw backend documents to check for reuploads, because getVisibleDocuments
    // forces all document statuses to "Rejected" for a rejected lead — which would always
    // make hasRejected true and prevent this function from returning true.
    const rawDocs = Array.isArray(lead?.documents) ? lead.documents : [];

    // A lead has reuploaded docs if any document is flagged reuploaded,
    // OR if the backend reuploadedDocumentNames list is non-empty.
    const hasReuploaded =
      rawDocs.some((d) => !!d?.reuploaded || String(d?.status || "").toLowerCase() === "reuploaded") ||
      (Array.isArray(lead?.reuploadedDocumentNames) && lead.reuploadedDocumentNames.length > 0);

    // Check if any raw (non-reuploaded) document still has an explicit Rejected status
    // indicating there are still unresolved rejections from the backend
    const hasStillRejectedDoc = rawDocs.some(
      (d) =>
        String(d?.status || "").toLowerCase() === "rejected" &&
        !d?.reuploaded
    );

    const execMsg = String(lead?.executorMessage || "").toLowerCase();
    const prMsg = String(lead?.prFeedback || "").toLowerCase();
    const adminMsg = String(lead?.adminMessage || "").toLowerCase();
    const executorIndicators = ["executor", "assignment rejected", "rejected by executor"];
    const isExecutorOrigin = execMsg.length > 0 || executorIndicators.some(ind => prMsg.includes(ind) || adminMsg.includes(ind));

    return hasReuploaded && !isExecutorOrigin && !hasStillRejectedDoc;
  };

  const getDisplayStatus = (status, lead) => {
    const s = String(status || "").trim().toLowerCase();
    
    if (s === "rejected") {
      // Service-level executor rejection waiting for PR to notify client
      if (lead?.executorServiceRejected === true && lead?.prNotifiedClientServiceRejection !== true) {
        return "Rejected by Executor (Notify Client)";
      }

      // If the user has already resubmitted their documents, show "PR Reviewing" instead
      if (isPrReuploadReviewState(lead)) {
        return "PR Reviewing";
      }

      const execMsg = String(lead?.executorMessage || "").toLowerCase();
      const prMsg = String(lead?.prFeedback || "").toLowerCase();
      const adminMsg = String(lead?.adminMessage || "").toLowerCase();
      
      const isExecutor = 
        execMsg.length > 0 || 
        prMsg.includes("executor") || 
        prMsg.includes("assignment") ||
        adminMsg.includes("executor") ||
        adminMsg.includes("assignment");

      if (isExecutor) {
        return "Rejected by Executor";
      }
      return "Rejected by PR";
    }

    // Build executor label dynamically from the lead's assignedExecutor field
    const executorLabel = (() => {
      const raw = String(lead?.assignedExecutor || "").trim().toLowerCase();
      const m = raw.match(/^executor(\d+)$/);
      if (m) return `Executor ${m[1]}`;
      if (raw) return raw.charAt(0).toUpperCase() + raw.slice(1);
      return "Executor";
    })();

    const map = {
      'open': 'New Request',
      'pendingreview': 'PR Reviewing',
      'informationrequired': isPrReuploadReviewState(lead) ? 'PR Reviewing' : 'Rejected by PR',
      'pr_accepted': 'Pending Executor Assignment',
      'assignedtoexecutor': `Assigned to ${executorLabel}`,
      'inprogress': `Accepted by ${executorLabel}`,
      'executionfinished': lead?.draftSentToPR ? 'Review the Draft' : 'Draft Uploaded',
      'draftsent': 'Waiting for User Draft Approval',
      'draftrejected': (() => {
        if (!lead?.draftSentToPR) return 'Draft Rejected by User';
        // draftSentToPR persists from previous cycle — only treat as a new draft if the
        // latest draft doc is NOT in "Rejected" state (i.e. executor actually re-sent one).
        const latestDraft = Array.isArray(lead?.documents)
          ? [...lead.documents]
              .sort((a, b) => new Date(b?.uploadedAt || b?.createdAt || 0) - new Date(a?.uploadedAt || a?.createdAt || 0))
              .find((d) => String(d?.type || "").trim().toLowerCase() === "draft")
          : null;
        const latestDraftRejected = String(latestDraft?.status || "").trim().toLowerCase() === "rejected";
        return latestDraftRejected ? 'Draft Rejected by User' : 'Review the Draft';
      })(),
      'draftaccepted': 'Draft Accepted',
      'useraccepted': 'Draft Accepted',
      'completed': 'Service Completed',
    };
    
    return map[s] || status;
  };

  const isAutomatedExecutorMessage = (msg) => {
    const lower = String(msg || "").trim().toLowerCase();
    if (!lower) return false;
    return (
      lower.includes("assignment rejected by executor") ||
      lower.includes("assignment rejected") ||
      lower.includes("rejected by executor") ||
      lower.includes("executor rejected")
    );
  };

  const canManageDraftForLead = (lead) =>
    ['InProgress', 'ExecutionFinished', 'DraftSent', 'DraftRejected', 'DraftAccepted', 'UserAccepted', 'Completed'].includes(lead?.status);

  // Draft upload belongs to the assigned executor — PR only handles unassigned services.
  const canUploadDraftForLead = (lead) => {
    const hasExecutor = !!(lead?.assignedExecutor || lead?.executorId);
    if (hasExecutor) return false;
    return ['InProgress', 'ExecutionFinished', 'DraftSent', 'DraftRejected', 'DraftAccepted', 'UserAccepted'].includes(lead?.status);
  };

  const hasDraftDocument = (lead) =>
    Array.isArray(lead?.documents) && lead.documents.some((d) => d.type === 'Draft');

  const canSendDraftToClient = (lead) => {
    if (!canManageDraftForLead(lead) || !hasDraftDocument(lead)) return false;
    return lead?.draftReadyToSend === true;
  };

  function getVisibleDocuments(lead) {
    // Filter out admin-added placeholder entries (adminAdded: true with no URL) so the document
    // only appears in the dashboard once the user has actually uploaded a file.
    const allDocuments = Array.isArray(lead?.documents) ? lead.documents : [];
    const documents = allDocuments.filter(
      (d) => !(d?.adminAdded === true && !d?.url && !d?.publicId && !d?.secure_url && !d?.uploadedUrl)
    );
    const serviceRejected = String(lead?.status || "").trim().toLowerCase() === "rejected";
    const isExecutorRejectedLead = (item) => {
      if (!item || String(item?.status || "").trim().toLowerCase() !== "rejected") return false;
      const execMsg = String(item?.executorMessage || "").toLowerCase();
      const prMsg = String(item?.prFeedback || "").toLowerCase();
      const adminMsg = String(item?.adminMessage || "").toLowerCase();
      return (
        execMsg.length > 0 ||
        prMsg.includes("executor") ||
        prMsg.includes("assignment") ||
        adminMsg.includes("executor") ||
        adminMsg.includes("assignment") ||
        prMsg.includes("rejected by executor")
      );
    };
    const executorRejectedService = serviceRejected && isExecutorRejectedLead(lead);
    const requiredDocNames = getRequiredServiceDocumentNames(lead);
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
      const key = normalizeDocumentKey(doc?.name);
      if (!key) continue;

      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(doc);
    }

    const collapsed = Array.from(grouped.values()).map((group) => {
      const selected =
        group.find(
          (doc) =>
            !!doc?.reuploaded ||
            String(doc?.status || "").trim().toLowerCase() === "reuploaded",
        ) || group[0];
      const hasReplacement = group.length > 1;
      const isReuploaded = !!selected?.displayReuploaded || hasReplacement || !!selected?.reuploaded || String(selected?.status || "").trim().toLowerCase() === "reuploaded";
      const normalizedStatus = String(selected?.status || "").trim().toLowerCase();
      const isDraftDocument = String(selected?.type || "").trim().toLowerCase() === "draft";
      const isPendingReviewState =
        !normalizedStatus ||
        normalizedStatus === "pending" ||
        normalizedStatus === "waiting review" ||
        normalizedStatus === "under review";

      const normalizedName = normalizeDocumentKey(selected?.name);
      const isNotPartOfServiceRequirements =
        requiredDocNames.size > 0 &&
        normalizedName &&
        !requiredDocNames.has(normalizedName);

      const draftRejected = String(lead?.status || "").trim().toLowerCase() === "draftrejected";
      const draftAccepted = ["draftaccepted", "useraccepted", "completed"].includes(String(lead?.status || "").trim().toLowerCase());
      const draftShared = ["draftsent", "draftrejected", "draftaccepted", "useraccepted", "completed"].includes(String(lead?.status || "").trim().toLowerCase());
      const displayStatus = isDraftDocument
        ? draftRejected
            ? "Draft Rejected"
            : draftAccepted
              ? "Accepted"
              : isReuploaded
                ? "Draft Shared"
                : draftShared
                ? "Draft Shared"
                : "Draft Uploaded"
        : executorRejectedService || serviceRejected
          ? "Rejected"
        : isReuploaded && isPendingReviewState
          ? "Under Review"
          : selected?.status || "Waiting Review";
      
      return {
        ...selected,
        status: displayStatus,
        displayReuploaded: isDraftDocument ? isReuploaded : serviceRejected ? false : isReuploaded,
      };
    }).filter(Boolean);

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
    total: visibleLeads.length,
    pending: visibleLeads.filter((lead) => ["Open", "PendingReview"].includes(getEffectiveLeadStatus(lead)))
      .length,
    inProgress: visibleLeads.filter((lead) =>
      !["Open", "PendingReview"].includes(getEffectiveLeadStatus(lead)) && getEffectiveLeadStatus(lead) !== "Completed"
    ).length,
    completed: visibleLeads.filter((lead) => getEffectiveLeadStatus(lead) === "Completed").length,
    revenueValue: visibleLeads.reduce(
      (sum, lead) =>
        sum +
        (shouldCountLeadRevenue(lead)
          ? getLeadRevenueWithCatalog(lead)
          : 0),
      0,
    ),
    revenue: formatInr(
      visibleLeads.reduce(
        (sum, lead) =>
          sum +
          (shouldCountLeadRevenue(lead)
            ? getLeadRevenueAmount(lead)
            : 0),
        0,
      ),
    ),
  };

  const getServicesByStatus = (status) => {
    if (status === "pending") {
      return visibleLeads.filter((lead) => ["Open", "PendingReview"].includes(getEffectiveLeadStatus(lead)));
    }
    if (status === "inProgress") {
      return visibleLeads.filter((lead) =>
        !["Open", "PendingReview"].includes(getEffectiveLeadStatus(lead)) && getEffectiveLeadStatus(lead) !== "Completed"
      );
    }
    if (status === "completed") {
      return visibleLeads.filter((lead) => getEffectiveLeadStatus(lead) === "Completed");
    }
    return [];
  };

  const getTotalRevenueBreakdown = () => {
    const pendingLeads = visibleLeads.filter((lead) => ["Open", "PendingReview"].includes(getEffectiveLeadStatus(lead)));
    const inProgressLeads = visibleLeads.filter((lead) =>
      !["Open", "PendingReview"].includes(getEffectiveLeadStatus(lead)) && getEffectiveLeadStatus(lead) !== "Completed"
    );
    const completedLeads = visibleLeads.filter((lead) => getEffectiveLeadStatus(lead) === "Completed");

    return {
      pending: pendingLeads.reduce((sum, lead) => sum + (shouldCountLeadRevenue(lead) ? getLeadRevenueWithCatalog(lead) : 0), 0),
      inProgress: inProgressLeads.reduce((sum, lead) => sum + (shouldCountLeadRevenue(lead) ? getLeadRevenueWithCatalog(lead) : 0), 0),
      completed: completedLeads.reduce((sum, lead) => sum + (shouldCountLeadRevenue(lead) ? getLeadRevenueWithCatalog(lead) : 0), 0),
      total: stats.revenueValue,
      high: stats.revenueValue,
      small: stats.revenueValue,
    };
  };

  const searchTerm = searchQuery.trim().toLowerCase();
  const filteredLeads = visibleLeads.filter((lead) => {
    if (!searchTerm) return true;
    const docs = Array.isArray(lead?.documents) ? lead.documents : [];
    const docText = docs
      .flatMap((doc) => [doc?.name, doc?.status, doc?.type, doc?.rejectionMessage])
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const searchable = [
      lead?.name,
      lead?.email,
      lead?.serviceName,
      lead?.status,
      lead?.prMessage,
      lead?.prFeedback,
      lead?.executorMessage,
      lead?.userMessage,
      lead?._id,
      lead?.createdAt ? new Date(lead.createdAt).toLocaleDateString("en-IN") : "",
      String(getLeadRevenueWithCatalog(lead) || ""),
      formatInr(getLeadRevenueWithCatalog(lead) || 0),
      docText,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return searchable.includes(searchTerm);
  });

  useEffect(() => {
    if (!filteredLeads.length) {
      if (selectedLeadId !== null) setSelectedLeadId(null);
      return;
    }
    if (!filteredLeads.some((lead) => lead._id === selectedLeadId)) {
      setSelectedLeadId(filteredLeads[0]?._id || null);
    }
  }, [filteredLeads, selectedLeadId]);

  const activeLead = filteredLeads.find((lead) => lead._id === selectedLeadId) || filteredLeads[0] || null;

  if (loading) return <Loader minimal={true} />;

  return (
    <PRDashboardModern
      navigate={navigate}
      filteredLeads={filteredLeads}
      activeLead={activeLead}
      selectedLeadId={selectedLeadId}
      setSelectedLeadId={setSelectedLeadId}
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
      stats={stats}
      getServicesByStatus={getServicesByStatus}
      getTotalRevenueBreakdown={getTotalRevenueBreakdown}
      formatInr={formatInr}
      getServicePricing={getServicePricing}
      getEffectiveLeadStatus={getEffectiveLeadStatus}
      isPrServiceDecisionFinalized={isPrServiceDecisionFinalized}
      getDisplayStatus={getDisplayStatus}
      getVisibleDocuments={getVisibleDocuments}
      getLeadRevenueAmount={getLeadRevenueWithCatalog}
      handleUpdateLeadStatus={handleUpdateLeadStatus}
      handleDocumentStatus={handleDocumentStatus}
      handleNotifyClientDocRejection={handleNotifyClientDocRejection}
      handleNotifyClientServiceRejection={handleNotifyClientServiceRejection}
      handleClearExecutorMessage={handleClearExecutorMessage}
      handleClearUserRejectedMessage={handleClearUserRejectedMessage}
      handleClearAdminPrMessage={handleClearAdminPrMessage}
      handleDeleteService={handleDeleteService}
      handleFileUpload={handleFileUpload}
      handleSendDraftToClient={handleSendDraftToClient}
      handleSendMessage={handleSendMessage}
      handleRejectDocumentWithMessage={handleRejectDocumentWithMessage}
      handleRejectService={handleRejectService}
      handleNotifyAdminAdditionalDetails={handleNotifyAdminAdditionalDetails}
      additionalDetailsDrafts={additionalDetailsDrafts}
      setAdditionalDetailsDrafts={setAdditionalDetailsDrafts}
      uploadingId={uploadingId}
      messageDrafts={messageDrafts}
      setMessageDrafts={setMessageDrafts}
      rejectDrafts={rejectDrafts}
      setRejectDrafts={setRejectDrafts}
      rejectingLeadId={rejectingLeadId}
      setRejectingLeadId={setRejectingLeadId}
      openRejectForm={openRejectForm}
      docRejectDrafts={docRejectDrafts}
      setDocRejectDrafts={setDocRejectDrafts}
      rejectingDocKey={rejectingDocKey}
      setRejectingDocKey={setRejectingDocKey}
      openDocRejectForm={openDocRejectForm}
      canManageDraftForLead={canManageDraftForLead}
      canSendDraftToClient={canSendDraftToClient}
      viewDocument={viewDocument}
      deleteConfirm={deleteConfirm}
      handleConfirmDelete={handleConfirmDelete}
      setDeleteConfirm={setDeleteConfirm}
      executors={executors}
    />
  );

  const styles = {
    container: {
      maxWidth: "1200px",
      margin: "0 auto",
      padding: "0 2rem",
      width: "100%",
    },
    header: {
      textAlign: "center",
      marginBottom: "3rem",
      marginTop: "1.5rem",
    },
    leadCard: {
      background: "rgba(255, 255, 255, 0.02)",
      border: "1px solid rgba(255, 255, 255, 0.08)",
      borderRadius: "28px",
      marginBottom: "1rem",
      overflow: "hidden",
      transition: "all 0.3s ease",
    },
    leadHeader: {
      padding: "1.8rem 2.2rem",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
    },
    badge: (status) => ({
      padding: "6px 14px",
      borderRadius: "99px",
      fontSize: "0.65rem",
      fontWeight: "800",
      textTransform: "uppercase",
      letterSpacing: "0.05em",
      background:
        status === 'DraftRejected'
          ? "rgba(239, 68, 68, 0.1)"
          : (status === 'PendingReview' || status === 'Open')
            ? "rgba(245, 158, 11, 0.1)"
            : "rgba(16, 185, 129, 0.1)",
      color:
        status === 'DraftRejected'
          ? "#ef4444"
          : (status === 'PendingReview' || status === 'Open')
            ? "#f59e0b"
            : "#10b981",
      border: `1px solid ${status === 'DraftRejected'
          ? "rgba(239, 68, 68, 0.2)"
          : (status === 'PendingReview' || status === 'Open')
            ? "rgba(245, 158, 11, 0.2)"
            : "rgba(16, 185, 129, 0.2)"
        }`,
    })
  };

  const mobileStyles = `
    @media (max-width: 768px) {
      .pr-dashboard-page {
        padding-top: 100px !important;
      }
      .pr-container {
        padding: 0 1rem !important;
      }
      .pr-stats-grid {
        grid-template-columns: repeat(2, 1fr) !important;
      }
      .pr-lead-header {
        flex-direction: column !important;
        align-items: flex-start !important;
        gap: 1.2rem !important;
        padding: 1.2rem 1rem !important;
      }
      .pr-lead-info {
        width: 100% !important;
      }
      .pr-header-actions {
        width: 100% !important;
        justify-content: space-between !important;
        flex-wrap: wrap !important;
      }
      .pr-action-btns {
        width: 100% !important;
        display: flex !important;
        gap: 8px !important;
        margin-bottom: 8px !important;
      }
      .pr-action-btns button {
        flex: 1 !important;
        justify-content: center !important;
      }
      .pr-expanded-content {
        padding: 1.5rem 1rem !important;
      }
      .pr-doc-row {
        flex-direction: column !important;
        align-items: stretch !important;
        gap: 1rem !important;
        padding: 1rem !important;
      }
      .pr-doc-actions {
        width: 100% !important;
        flex-wrap: wrap !important;
        gap: 8px !important;
      }
      .pr-doc-actions button {
        flex: 1 !important;
        min-width: 100px !important;
        height: 38px !important;
        font-size: 0.65rem !important;
      }
      .pr-workflow-btns, .pr-draft-btns {
        grid-template-columns: 1fr !important;
      }
      .pr-chat-input {
        flex-direction: column !important;
      }
      .pr-chat-input button {
        width: 100% !important;
        height: 50px !important;
        justify-content: center !important;
      }
      .pr-chat-input input {
        width: 100% !important;
      }
      .pr-modal-actions {
        flex-direction: column !important;
      }
      .pr-modal-actions button {
        width: 100% !important;
      }
    }
    @media (max-width: 480px) {
      .pr-stats-grid {
        grid-template-columns: 1fr !important;
      }
    }
  `;

  return (
    <div className="pr-dashboard-page" style={{ minHeight: "100vh", background: "var(--bg)", paddingTop: "200px", color: "var(--text)" }}>
      <style>{mobileStyles}</style>
      <div className="pr-container" style={styles.container}>

        <header style={styles.header}>
          {/* <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ 
              display: "inline-flex", 
              alignItems: "center", 
              gap: "8px", 
              padding: "6px 14px", 
              borderRadius: "99px", 
              background: "rgba(16, 185, 129, 0.1)", 
              color: "#10b981", 
              fontSize: "0.65rem", 
              fontWeight: "900",
              textTransform: "uppercase",
              marginBottom: "1rem"
            }}
          >
            <Briefcase size={14} /> Service Operations
          </motion.div> */}
          <h1 style={{ fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 600, marginBottom: "0.5rem" }}>
            PR <span style={{ color: "var(--v-green)" }}>Dashboard</span>
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "1rem", maxWidth: "600px", margin: "0 auto" }}>
            Efficiency control for client verifications and service lifecycle management.
          </p>
        </header>

        <section>
          <div
            className="pr-stats-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "1rem",
              marginBottom: "1.8rem",
            }}
          >
            {[
              { label: "Total Requests", value: stats.total },
              { label: "Pending Review", value: stats.pending },
              { label: "Completed Services", value: stats.completed },
              { label: "Revenue", value: stats.revenue },
            ].map((item, idx) => (
              <div
                key={idx}
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "20px",
                  padding: "1.8rem 1.2rem",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  textAlign: "center"
                }}
              >
                <div
                  style={{
                    fontSize: "0.9rem",
                    color: "#f5f5f5",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    fontWeight: 500,
                    marginBottom: "0.6rem",
                  }}
                >
                  {item.label}
                </div>
                <div style={{ fontSize: "1.85rem", fontWeight: 800, color: "var(--text)", lineHeight: 1 }}>
                  {item.value}
                </div>
              </div>
            ))}
          </div>

          <h2 style={{ fontSize: "1.4rem", fontWeight: 600, marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "15px" }}>
            <LayoutDashboard size={22} style={{ color: "var(--v-green)" }} /> All User Services

          </h2>

          <div className="requests-queue">
            {leads.length === 0 ? (
              <div style={{ textAlign: "center", padding: "6rem", background: "rgba(255,255,255,0.01)", border: "1px dashed rgba(255,255,255,0.08)", borderRadius: "32px" }}>
                <p style={{ color: "var(--text-muted)" }}>No user services found.</p>
              </div>
            ) : (
              leads.map((lead) => {
                const effectiveStatus = getEffectiveLeadStatus(lead);
                const serviceAccepted = ["PR_Accepted", "AssignedToExecutor", "InProgress", "ExecutionFinished", "DraftSent", "DraftRejected", "DraftAccepted", "UserAccepted", "Completed"].includes(lead.status);
                const canMarkCompleted = Array.isArray(lead.documents) && lead.documents.some((doc) => doc.type === "Final") && lead.status !== "Completed";
                const recommendedFee = getServicePricing(lead?.serviceName);
                return (
                  <div key={lead._id} style={{
                    ...styles.leadCard,
                    borderColor: expandedId === lead._id ? "rgba(16, 185, 129, 0.4)" : "rgba(255,255,255,0.08)",
                    boxShadow: expandedId === lead._id ? "0 25px 50px -12px rgba(0,0,0,0.5)" : "none"
                  }}>
                    <div className="pr-lead-header" style={styles.leadHeader} onClick={() => setExpandedId(expandedId === lead._id ? null : lead._id)}>
                      <div className="pr-lead-info" style={{ display: "flex", alignItems: "center", gap: "20px" }}>
                        <div style={{ width: "54px", height: "54px", flexShrink: 0, background: expandedId === lead._id ? "var(--v-green)" : "rgba(255,255,255,0.04)", color: expandedId === lead._id ? "white" : "var(--text-secondary)", borderRadius: "16px", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.3s" }}>
                          <FileText size={28} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h3 style={{ fontSize: "1.25rem", fontWeight: 700, wordBreak: "break-word" }}>{lead.serviceName}</h3>
                          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px", display: "flex", flexDirection: "column", gap: "2px" }}>
                            <span>{lead.name} ({lead.email})</span>
                            <span style={{ color: "#10b981", fontWeight: 800 }}>
                              Recommended Fee: {formatInr(recommendedFee.amount)}
                            </span>
                            <span style={{ color: "rgba(255,255,255,0.65)" }}>
                              Pricing Basis: {recommendedFee.displayPrice}
                            </span>
                            <span style={{ color: "rgba(255,255,255,0.4)" }}>
                              ID: {lead._id.slice(-6).toUpperCase()} | {lead.user?.profile?.companyName || "Individual"} | {lead.user?.profile?.industry || "Retail/Service"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="pr-header-actions" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        {!isPrServiceDecisionFinalized(lead) && (
                          <div className="pr-action-btns" style={{ display: "flex", gap: "8px" }} onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handleUpdateLeadStatus(lead._id, 'PR_Accepted')}
                              style={{ padding: "8px 16px", borderRadius: "10px", background: "#10b981", color: "white", border: "none", fontSize: "0.7rem", fontWeight: "900", cursor: "pointer", boxShadow: "0 4px 12px rgba(16,185,129,0.2)" }}
                            >
                              ACCEPT
                            </button>
                            <button
                              onClick={() => openRejectForm(lead._id)}
                              style={{ padding: "8px 16px", borderRadius: "10px", background: "rgba(239, 68, 68, 0.14)", color: "#ffffff", border: "1px solid rgba(239, 68, 68, 0.35)", fontSize: "0.7rem", fontWeight: "900", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "8px" }}
                            >
                              <X size={14} strokeWidth={2.8} /> REJECT
                            </button>
                          </div>
                        )}
                        <span style={styles.badge(effectiveStatus)}>{getDisplayStatus(effectiveStatus)}</span>
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

                          <ChevronDown size={22} style={{
                            transform: expandedId === lead._id ? "rotate(180deg)" : "rotate(0)",
                            transition: "transform 0.3s ease",
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
                          style={{ overflow: "hidden" }}
                        >
                          <div className="pr-expanded-content" style={{ padding: "2.5rem" }}>
                            {/* Vertical Stack Layout */}
                            <div style={{ display: "flex", flexDirection: "column", gap: "3rem" }}>

                              {/* Document Verification - Full Width */}
                              <div className="column" style={{ width: "100%" }}>
                                <h4 style={{ fontSize: "0.65rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.15em", color: "var(--text-muted)", marginBottom: "1.5rem" }}>Client Files (All must be accepted)</h4>
                                {(() => {
                                  const clientDocs = getVisibleDocuments(lead).filter(
                                    (d) => d.type === "Client",
                                  );
                                  const serviceRejected = String(lead?.status || "").trim().toLowerCase() === "rejected";
                                  const draftRejected = String(lead?.status || "").trim().toLowerCase() === "draftrejected";
                                  return (
                                    <>
                                      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                              {clientDocs.map((doc) => {
                                          const docKey = `${lead._id}:${doc._id}`;
                                          const isDraftDocument = String(doc?.type || "").trim().toLowerCase() === "draft";
                                          const docStatus = serviceRejected || (draftRejected && isDraftDocument)
                                            ? "Rejected"
                                            : String(doc.status || "Waiting Review");
                                          const showReviewActions = !serviceRejected && !isPrServiceDecisionFinalized(lead);
                                          return (
                                            <React.Fragment key={doc._id}>
                                              <div className="pr-doc-row" style={{ padding: "16px 24px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                                <div style={{ overflow: "hidden", flex: 1 }}>
                                                  <p style={{ fontSize: "0.95rem", fontWeight: 700, color: "white", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", margin: 0 }}>{doc.name}</p>
                                                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "6px" }}>
                                                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: docStatus === 'Accepted' ? "#10b981" : docStatus === 'Rejected' ? "#ef4444" : "#f59e0b" }}></span>
                                                    <span style={{ fontSize: "0.7rem", fontWeight: 800, textTransform: "uppercase", color: docStatus === 'Accepted' ? "#10b981" : docStatus === 'Rejected' ? "#ef4444" : "#f59e0b" }}>{docStatus}</span>
                                                    {doc.displayReuploaded && (
                                                      <span style={{ fontSize: "0.65rem", fontWeight: 900, textTransform: "uppercase", color: "#16a34a", background: "rgba(22, 163, 74, 0.12)", border: "1px solid rgba(22, 163, 74, 0.25)", padding: "2px 8px", borderRadius: "999px", letterSpacing: "0.05em" }}>
                                                        Draft Shared
                                                      </span>
                                                    )}
                                                  </div>
                                                </div>
                                                <div className="pr-doc-actions" style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                                                <button
    onClick={() => viewDocument(doc.publicId, doc.url || doc.secure_url || doc.uploadedUrl || doc.viewUrl, lead._id)}
                                                  title="View Document"
                                                  style={{ background: "rgba(255,255,255,0.04)", border: "none", color: "var(--text-secondary)", cursor: "pointer", height: "42px", padding: "0 15px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", fontSize: "0.75rem", fontWeight: 700 }}
                                                >
                                                  <ExternalLink size={16} /> VIEW
                                                </button>
                                                  {showReviewActions && (
                                                    <>
                                                      <button
                                                        onClick={() => handleDocumentStatus(lead._id, doc._id, 'Accepted')}
                                                        style={{ background: docStatus === 'Accepted' ? "#10b981" : "rgba(16, 185, 129, 0.1)", border: "none", color: docStatus === 'Accepted' ? "white" : "#10b981", cursor: "pointer", height: "42px", padding: "0 20px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", fontSize: "0.75rem", fontWeight: 900 }}
                                                      >
                                                        <Check size={18} /> ACCEPT
                                                      </button>
                                                      <button
                                                        onClick={() => openDocRejectForm(lead._id, doc)}
                                                        style={{ background: docStatus === 'Rejected' ? "#ef4444" : "rgba(239, 68, 68, 0.14)", border: "1px solid rgba(239, 68, 68, 0.35)", color: "white", cursor: "pointer", height: "42px", padding: "0 20px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", fontSize: "0.75rem", fontWeight: 900 }}
                                                      >
                                                        <X size={18} strokeWidth={2.8} /> REJECT
                                                      </button>
                                                    </>
                                                  )}
                                                </div>
                                              </div>

                                              {rejectingDocKey === docKey && (
                                                <div
                                                  style={{
                                                    marginTop: "0.6rem",
                                                    marginBottom: "0.3rem",
                                                    padding: "1rem",
                                                    borderRadius: "12px",
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
                                                      marginBottom: "0.55rem",
                                                    }}
                                                  >
                                                    Send Rejection Message to Client
                                                  </div>
                                                  <textarea
                                                    value={docRejectDrafts[docKey] || ""}
                                                    onChange={(e) =>
                                                      setDocRejectDrafts((prev) => ({
                                                        ...prev,
                                                        [docKey]: e.target.value,
                                                      }))
                                                    }
                                                    rows={3}
                                                    placeholder={`Explain why ${doc.name} was rejected...`}
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
                                                  <div className="pr-modal-actions" style={{ display: "flex", gap: "10px", marginTop: "0.7rem" }}>
                                                    <button
                                                      onClick={() => handleRejectDocumentWithMessage(lead._id, doc)}
                                                      style={{
                                                        padding: "0.65rem 0.95rem",
                                                        borderRadius: "10px",
                                                        border: "none",
                                                        background: "#ef4444",
                                                        color: "white",
                                                        fontSize: "0.78rem",
                                                        fontWeight: 800,
                                                        cursor: "pointer",
                                                      }}
                                                    >
                                                      Reject and Notify Client
                                                    </button>
                                                    <button
                                                      onClick={() => setRejectingDocKey(null)}
                                                      style={{
                                                        padding: "0.65rem 0.95rem",
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
                                            </React.Fragment>
                                          );
                                        })}
                                      </div>
                                    </>
                                  );
                                })()}
                              </div>

                              {/* PR Uploaded Draft / Final Files */}
                              {(() => {
                                const prDocs = getVisibleDocuments(lead).filter(
                                  (d) => ["Draft", "Final"].includes(d.type),
                                );

                                if (prDocs.length === 0) return null;

                                return (
                                  <div className="column" style={{ width: "100%" }}>
                                    <h4 style={{ fontSize: "0.65rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.15em", color: "var(--text-muted)", marginBottom: "1.5rem", marginTop: "1.5rem" }}>Draft & Final Files</h4>
                                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                      {prDocs.map((doc) => {
                                        const isDraft = doc.type === "Draft";
                                        const isFinal = doc.type === "Final";
                                        return (
                                          <div
                                            key={doc._id}
                                            style={{
                                              padding: "16px 24px",
                                              background: "rgba(255,255,255,0.02)",
                                              border: "1px solid rgba(255,255,255,0.05)",
                                              borderRadius: "14px",
                                              display: "flex",
                                              alignItems: "center",
                                              justifyContent: "space-between",
                                              gap: "12px",
                                            }}
                                          >
                                            <div style={{ overflow: "hidden", flex: 1 }}>
                                              <p style={{ fontSize: "0.95rem", fontWeight: 700, color: "white", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", margin: 0 }}>
                                                {doc.name}
                                              </p>
                                              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "6px", flexWrap: "wrap" }}>
                                                <span style={{ fontSize: "0.7rem", fontWeight: 800, textTransform: "uppercase", color: isDraft ? "#8b5cf6" : "#10b981", background: isDraft ? "rgba(139,92,246,0.12)" : "rgba(16,185,129,0.12)", borderRadius: "999px", padding: "3px 8px" }}>
                                                  {isDraft ? "Draft" : "Final"}
                                                </span>
                                                <span style={{ fontSize: "0.7rem", fontWeight: 800, textTransform: "uppercase", color: doc.status === "Accepted" ? "#10b981" : doc.status === "Rejected" ? "#ef4444" : "#f59e0b" }}>
                                                  {doc.status || "Waiting Review"}
                                                </span>
                                                {doc.displayReuploaded && (
                                                  <span style={{ fontSize: "0.65rem", fontWeight: 900, textTransform: "uppercase", color: "#38bdf8", background: "rgba(56, 189, 248, 0.12)", border: "1px solid rgba(56, 189, 248, 0.25)", padding: "2px 8px", borderRadius: "999px", letterSpacing: "0.05em" }}>
                                                    Reuploaded
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                            <button
            onClick={() => viewDocument(doc.publicId, doc.url || doc.secure_url || doc.uploadedUrl || doc.viewUrl, lead._id)}
                                              title="View Document"
                                              style={{ background: "rgba(255,255,255,0.04)", border: "none", color: "var(--text-secondary)", cursor: "pointer", height: "42px", padding: "0 15px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", fontSize: "0.75rem", fontWeight: 700 }}
                                            >
                                              <ExternalLink size={16} /> VIEW
                                            </button>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })()}

                              {/* Workflow Controls - Bottom Area */}
                              <div className="column" style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "2rem" }}>
                                <h4 style={{ fontSize: "0.65rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.15em", color: "var(--text-muted)", marginBottom: "1.5rem" }}>Workflow Controls</h4>

                                {(() => {
                                  if (serviceAccepted) {
                                    return (
                                      <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#10b981", fontSize: "1rem", fontWeight: 800, padding: "8px 16px", background: "rgba(16,185,129,0.1)", borderRadius: 12, border: "1px solid rgba(16,185,129,0.2)" }}>
                                        <CheckCircle size={20} /> ACCEPTED BY EXECUTOR
                                      </div>
                                    );
                                  }

                                  if (isPrServiceDecisionFinalized(lead)) {
                                    return null;
                                  }

                                  return (
                                    <div className="pr-workflow-btns" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "15px" }}>
                                      {(() => {
                                        const clientDocs = getVisibleDocuments(lead).filter(d => d.type === 'Client');
                                        const allAccepted =
                                          clientDocs.length > 0 &&
                                          clientDocs.every((d) => d.status === 'Accepted');
                                        const anyRejected = clientDocs.some(d => d.status === 'Rejected');

                                        return (
                                          <button
                                            onClick={() => handleUpdateLeadStatus(lead._id, 'AssignedToExecutor')}
                                            disabled={!allAccepted}
                                            style={{
                                              padding: "1.2rem",
                                              borderRadius: "14px",
                                              background: allAccepted ? "#10b981" : "rgba(255,255,255,0.05)",
                                              color: allAccepted ? "white" : "rgba(255,255,255,0.2)",
                                              border: allAccepted ? "none" : "1px solid rgba(255,255,255,0.1)",
                                              fontWeight: 800,
                                              cursor: allAccepted ? "pointer" : "not-allowed",
                                              fontSize: "0.9rem"
                                            }}
                                          >
                                            ACCEPT SERVICE & START COORDINATION
                                          </button>
                                        );
                                      })()}

                                      <button onClick={() => openRejectForm(lead._id)} style={{ padding: "1.2rem", borderRadius: "14px", background: "rgba(239, 68, 68, 0.1)", color: "#ef4444", border: "1px solid rgba(239, 68, 68, 0.2)", fontWeight: 800, cursor: "pointer" }}>REJECT ENTIRE SERVICE</button>
                                    </div>
                                  );
                                })()}

                                {rejectingLeadId === lead._id && !isPrServiceDecisionFinalized(lead) && (
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
                                      Send Rejection Message to User
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
                                      placeholder="Explain clearly why this service is rejected..."
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
                                    <div className="pr-modal-actions" style={{ display: "flex", gap: "10px", marginTop: "0.7rem" }}>
                                      <button
                                        onClick={() => handleRejectService(lead._id)}
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
                                        Reject Service and Notify User
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

                                {lead.executorMessage && (
                                  <div style={{ marginTop: "1.5rem", padding: "1.5rem", background: "rgba(59,130,246,0.05)", border: "1px dashed rgba(59,130,246,0.3)", borderRadius: "16px", color: "#3b82f6" }}>
                                    <div style={{ fontSize: "0.7rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "8px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                                      <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                        <MessageSquare size={14} /> Message from Executor
                                      </span>
                                      <button
                                        onClick={(e) => handleClearExecutorMessage(lead._id, e)}
                                        title="Remove message"
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
                                    <p style={{ fontSize: "0.9rem", fontWeight: 500, margin: 0, fontStyle: "italic", opacity: 0.95 }}>
                                      "{lead.executorMessage}"
                                    </p>
                                  </div>
                                )}

                                {effectiveStatus === 'DraftRejected' && String(lead.userMessage || '').trim() && (
                                  <div
                                    style={{
                                      marginTop: '1.2rem',
                                      padding: '1.2rem',
                                      borderRadius: '14px',
                                      background: 'rgba(239, 68, 68, 0.06)',
                                      border: '1px solid rgba(239, 68, 68, 0.22)',
                                      color: '#fecaca',
                                    }}
                                  >
                                    <div style={{ fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.55rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                      <span>Message from User (Draft Rejected by User)</span>
                                      <button
                                        onClick={(e) => handleClearUserRejectedMessage(lead._id, e)}
                                        title="Remove message"
                                        style={{
                                          border: '1px solid rgba(239, 68, 68, 0.35)',
                                          background: 'rgba(239, 68, 68, 0.18)',
                                          color: '#ffffff',
                                          width: '24px',
                                          height: '24px',
                                          borderRadius: '999px',
                                          cursor: 'pointer',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                        }}
                                      >
                                        <X size={14} strokeWidth={2.8} />
                                      </button>
                                    </div>
                                    <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.45 }}>
                                      {lead.userMessage}
                                    </p>
                                  </div>
                                )}

                                {/* Draft Management Area - Only visible after executor acceptance */}
                                {['InProgress', 'ExecutionFinished', 'DraftSent', 'DraftRejected', 'DraftAccepted', 'UserAccepted'].includes(lead.status) && (
                                  <div style={{ marginTop: "1.5rem", padding: "1.5rem", background: "rgba(16, 185, 129, 0.02)", border: "1px solid rgba(16, 185, 129, 0.1)", borderRadius: "16px" }}>
                                    <div style={{ fontSize: "0.7rem", fontWeight: 900, color: "#10b981", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "1rem" }}>Draft & Completion Management</div>

                                    {lead.status === 'DraftAccepted' || lead.status === 'UserAccepted' ? (
                                      <div className="pr-draft-btns" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                                        {isUserRole && (
                                          <>
                                            <input type="file" id={`final-${lead._id}`} hidden onChange={(e) => handleFileUpload(lead._id, e.target.files[0], 'Final')} />
                                            <button onClick={() => document.getElementById(`final-${lead._id}`).click()} style={{ padding: "1.2rem", borderRadius: "14px", background: "rgba(255,255,255,0.04)", color: "white", border: "1px solid rgba(255,255,255,0.1)", fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", cursor: "pointer" }}>
                                              {uploadingId === `${lead._id}-Final` ? (
                                                <><Loader2 size={18} className="animate-spin" /> UPLOADING...</>
                                              ) : (
                                                <><Upload size={18} /> UPLOAD FINAL</>
                                              )}
                                            </button>
                                          </>
                                        )}
                                        <button
                                          disabled={!canMarkCompleted}
                                          onClick={() => handleUpdateLeadStatus(lead._id, 'Completed')}
                                          style={{ padding: "1.2rem", borderRadius: "14px", background: "#10b981", color: "white", border: "none", fontWeight: 800, cursor: canMarkCompleted ? "pointer" : "not-allowed", opacity: canMarkCompleted ? 1 : 0.3 }}
                                        >
                                          MARK COMPLETED
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="pr-draft-btns" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                                        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                          {isUserRole && (
                                            <>
                                              <input type="file" id={`draft-${lead._id}`} hidden onChange={(e) => handleFileUpload(lead._id, e.target.files[0], 'Draft')} />
                                              <button
                                                disabled={!canUploadDraftForLead(lead)}
                                                onClick={() => document.getElementById(`draft-${lead._id}`).click()}
                                                style={{
                                                  padding: "1.2rem",
                                                  borderRadius: "14px",
                                                  background: canUploadDraftForLead(lead) ? "rgba(67, 97, 238, 0.1)" : "rgba(255,255,255,0.02)",
                                                  color: canUploadDraftForLead(lead) ? "#4361ee" : "rgba(255,255,255,0.2)",
                                                  border: "1px solid rgba(67, 97, 238, 0.2)",
                                                  fontWeight: 800,
                                                  display: "flex",
                                                  alignItems: "center",
                                                  justifyContent: "center",
                                                  gap: "10px",
                                                  cursor: canUploadDraftForLead(lead) ? "pointer" : "not-allowed"
                                                }}
                                              >
                                                {uploadingId === `${lead._id}-Draft` ? (
                                                  <><Loader2 size={18} className="animate-spin" /> UPLOADING...</>
                                                ) : (
                                                  <><Upload size={18} /> {canUploadDraftForLead(lead) ? "UPLOAD DRAFT" : "DRAFT DISABLED"}</>
                                                )}
                                              </button>
                                            </>
                                          )}
                                        </div>

                                        <button
                                          disabled={!canSendDraftToClient(lead) || uploadingId === `${lead._id}-Draft`}
                                          onClick={() => handleSendDraftToClient(lead._id)}
                                          style={{
                                            padding: "1.2rem",
                                            borderRadius: "14px",
                                            background: canSendDraftToClient(lead) ? "#10b981" : "rgba(255,255,255,0.02)",
                                            color: canSendDraftToClient(lead) ? "white" : "rgba(255,255,255,0.2)",
                                            border: "none",
                                            fontWeight: 800,
                                            cursor: canSendDraftToClient(lead) ? "pointer" : "not-allowed"
                                          }}
                                        >
                                          SEND DRAFT TO CLIENT
                                        </button>

                                        {lead.status === 'ExecutionFinished' && (
                                          <div style={{ gridColumn: "span 2", padding: "12px", background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.2)", borderRadius: "12px", fontSize: "0.8rem", color: "#10b981", fontWeight: 800, textAlign: "center" }}>
                                            Executor has finished work. Review and Send to Client.
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )}

                                {['Open', 'PendingReview', 'InformationRequired', 'PR_Accepted', 'AssignedToExecutor'].includes(lead.status) && (
                                  <div style={{ marginTop: "1.5rem", padding: "1.2rem 1.4rem", background: "rgba(245, 158, 11, 0.05)", border: "1px solid rgba(245, 158, 11, 0.18)", borderRadius: "16px", color: "#f59e0b", fontSize: "0.78rem", fontWeight: 700, textAlign: "center" }}>
                                    Draft controls will appear after the executor accepts this service.
                                  </div>
                                )}

                                {/* Direct Messaging to Client - Now at Bottom */}
                                {showCommunicationBox && (
                                  <div style={{ marginTop: "1.5rem", background: "rgba(255,255,255,0.02)", padding: "1.5rem", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.05)", position: "relative" }}>
                                    <button
                                      type="button"
                                      onClick={() => setShowCommunicationBox(false)}
                                      aria-label="Close message box"
                                      title="Close message box"
                                      style={{
                                        position: "absolute",
                                        top: 12,
                                        right: 12,
                                        width: 28,
                                        height: 28,
                                        borderRadius: 999,
                                        border: "1px solid rgba(255,255,255,0.1)",
                                        background: "rgba(0,0,0,0.2)",
                                        color: "white",
                                        display: "inline-flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        cursor: "pointer",
                                      }}
                                    >
                                      <X size={16} />
                                    </button>
                                    <div style={{ fontSize: "0.65rem", fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "1rem", paddingRight: 36 }}>Communicate with Client</div>
                                    <div className="pr-chat-input" style={{ display: "flex", gap: "10px" }}>
                                      <input
                                        placeholder="Type instructions or missing info details here..."
                                        value={messageDrafts[lead._id] || ""}
                                        onChange={(e) => setMessageDrafts({ ...messageDrafts, [lead._id]: e.target.value })}
                                        style={{ flex: 1, padding: "1rem", borderRadius: "12px", background: "rgba(0,0,0,0.2)", color: "white", border: "1px solid rgba(255,255,255,0.1)", outline: "none", fontSize: "0.85rem" }}
                                      />
                                      <button
                                        onClick={() => {
                                          handleSendMessageToClient(lead._id, messageDrafts[lead._id]);
                                        }}
                                        style={{ width: "50px", height: "50px", borderRadius: "12px", background: "#4361ee", color: "white", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                                      >
                                        <Send size={18} />
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })
            )}
          </div>
        </section>

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

export default PRDashboard;
