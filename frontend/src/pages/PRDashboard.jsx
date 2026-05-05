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
import Loader from "../components/Loader";
import ConfirmationModal from "../components/ConfirmationModal";
import {
  formatInr,
  getServicePricing,
} from "../utils/servicePricing";
import { shouldCountLeadRevenue } from "../utils/servicePricing";
import PRDashboardModern from "./PRDashboardModern";

const PRDashboard = () => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [executors, setExecutors] = useState([]);
  const [services, setServices] = useState([]);
  const [uploadingId, setUploadingId] = useState(null);
  const [messageDrafts, setMessageDrafts] = useState({});
  const [rejectDrafts, setRejectDrafts] = useState({});
  const [rejectingLeadId, setRejectingLeadId] = useState(null);
  const [docRejectDrafts, setDocRejectDrafts] = useState({});
  const [rejectingDocKey, setRejectingDocKey] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, lead: null, isLoading: false });
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const navigate = useNavigate();

  const storedUser = JSON.parse(localStorage.getItem("user"));

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

    return () => {
      clearInterval(interval);
      window.removeEventListener("pr-dashboard-refresh", handleRefreshSignal);
      window.removeEventListener("storage", handleStorage);
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
          `[PRDashboard] Fetching from: ${apiUrl}/leads and ${apiUrl}/auth/users`,
        );

        const [leadsRes, usersRes, servicesRes] = await Promise.allSettled([
          axios.get(`${apiUrl}/leads`, { headers }),
          axios.get(`${apiUrl}/auth/users`, { headers }),
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

      if (leadsRes.status === "fulfilled") {
        setLeads(Array.isArray(leadsRes.value.data) ? leadsRes.value.data : []);
      } else {
        throw leadsRes.reason;
      }

      // This endpoint may be restricted to admin in some deployments; don't block leads.
      if (usersRes.status === "fulfilled" && Array.isArray(usersRes.value.data)) {
        setExecutors(usersRes.value.data.filter((u) => u.role === "executor"));
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

  const getRequiredServiceDocumentNames = (lead) => {
    const matchedService = getMatchedService(lead);
    const requiredDocs = Array.isArray(matchedService?.documentsRequired)
      ? matchedService.documentsRequired
      : [];

    return new Set(
      requiredDocs
        .map((docName) => normalizeDocumentKey(docName))
        .filter(Boolean),
    );
  };

  const handleUpdateLeadStatus = async (leadId, status, feedback = "") => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const payload = { status };
      if (feedback) payload.prFeedback = feedback;

      await axios.patch(
        `${apiUrl}/leads/${leadId}`,
        payload,
        { headers: { Authorization: `Bearer ${storedUser.token}` } }
      );
      toast.success(`Status updated to ${status}`);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update lead");
    }
  };

  const handleDocumentStatus = async (leadId, docId, status) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      await axios.patch(
        `${apiUrl}/leads/${leadId}/documents/${docId}/status`,
        { status },
        { headers: { Authorization: `Bearer ${storedUser.token}` } }
      );
      toast.success(`Document ${status}`);
      fetchData();
    } catch (error) {
      toast.error("Failed to update document status");
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
          updatePayload.draftReadyToSend = true;
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

    await handleUpdateLeadStatus(leadId, "Rejected", reason);
    setRejectDrafts((prev) => ({ ...prev, [leadId]: "" }));
    setRejectingLeadId(null);
  };

  const getEffectiveLeadStatus = (lead) => {
    const rawStatus = String(lead?.status || "");
    const userMessage = String(lead?.userMessage || "").toLowerCase();
    const looksLikeUserDraftRejection = userMessage.includes("draft rejected by user");

    if (
      rawStatus === "DraftRejected" ||
      ((rawStatus === "InProgress" || rawStatus === "DraftSent" || rawStatus === "ExecutionFinished") &&
        looksLikeUserDraftRejection)
    ) {
      return "DraftRejected";
    }

    return rawStatus;
  };

  const getDisplayStatus = (status, lead) => {
    const s = String(status || "").trim().toLowerCase();
    
    if (s === "rejected") {
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

    const map = {
      'open': 'New Request',
      'pendingreview': 'PR Reviewing',
      'informationrequired': 'Action Required',
      'pr_accepted': 'Pending Executor Approval',
      'assignedtoexecutor': 'Coordination',
      'inprogress': 'Execution',
      'executionfinished': 'Review',
      'draftsent': 'Waiting for User Draft Approval',
      'draftrejected': 'Draft Rejected by User',
      'draftaccepted': 'Approved',
      'useraccepted': 'Approved',
      'completed': 'Done',
    };
    
    return map[s] || status;
  };

  const canManageDraftForLead = (lead) =>
    ['InProgress', 'ExecutionFinished', 'DraftSent', 'DraftRejected'].includes(lead?.status);

  const hasDraftDocument = (lead) =>
    Array.isArray(lead?.documents) && lead.documents.some((d) => d.type === 'Draft');

  const canSendDraftToClient = (lead) => {
    if (!canManageDraftForLead(lead) || !hasDraftDocument(lead)) return false;
    return lead?.draftReadyToSend === true;
  };

  function getVisibleDocuments(lead) {
    const documents = Array.isArray(lead?.documents) ? lead.documents : [];
    const serviceRejected = String(lead?.status || "").trim().toLowerCase() === "rejected";
    const requiredDocNames = getRequiredServiceDocumentNames(lead);
    const sorted = [...documents].sort((a, b) => {
      const aTime = new Date(a?.uploadedAt || a?.createdAt || 0).getTime();
      const bTime = new Date(b?.uploadedAt || b?.createdAt || 0).getTime();
      return bTime - aTime;
    });

    const grouped = new Map();
    for (const doc of sorted) {
      const key = normalizeDocumentKey(doc?.name);
      if (!key) continue;

      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(doc);
    }

    const hasAnyReplacementGroup = Array.from(grouped.values()).some((group) =>
      group.length > 1 ||
      group.some(
        (doc) =>
          !!doc?.reuploaded ||
          String(doc?.status || "").trim().toLowerCase() === "reuploaded",
      ),
    );

    return Array.from(grouped.values()).map((group) => {
      const selected =
        group.find(
          (doc) =>
            !!doc?.reuploaded ||
            String(doc?.status || "").trim().toLowerCase() === "reuploaded",
        ) || group[0];
      const hasReplacement = group.length > 1;
      const isReuploaded = !!selected?.displayReuploaded || hasReplacement || !!selected?.reuploaded || String(selected?.status || "").trim().toLowerCase() === "reuploaded";
      const normalizedStatus = String(selected?.status || "").trim().toLowerCase();
      const isPendingReviewState =
        !normalizedStatus ||
        normalizedStatus === "pending" ||
        normalizedStatus === "waiting review" ||
        normalizedStatus === "under review";

      const normalizedName = normalizeDocumentKey(selected?.name);
      const isStaleOrphanRejected =
        !isReuploaded &&
        normalizedStatus === "rejected" &&
        hasAnyReplacementGroup;
      const isNotPartOfServiceRequirements =
        requiredDocNames.size > 0 &&
        normalizedName &&
        !requiredDocNames.has(normalizedName);

      if (isStaleOrphanRejected || (serviceRejected && isNotPartOfServiceRequirements)) {
        return null;
      }

      const displayStatus = serviceRejected && !isReuploaded
        ? "Rejected"
        : isReuploaded && isPendingReviewState
          ? "Under Review"
          : selected?.status || "Waiting Review";
      
      return {
        ...selected,
        status: displayStatus,
        displayReuploaded: isReuploaded,
      };
    }).filter(Boolean);
  }

  const stats = {
    total: leads.length,
    pending: leads.filter((lead) => ["Open", "PendingReview"].includes(lead.status))
      .length,
    completed: leads.filter((lead) => lead.status === "Completed").length,
    revenue: formatInr(
      leads.reduce(
        (sum, lead) =>
          sum +
          (shouldCountLeadRevenue(lead)
            ? getServicePricing(lead?.serviceName).amount
            : 0),
        0,
      ),
    ),
  };

  const searchTerm = searchQuery.trim().toLowerCase();
  const filteredLeads = leads.filter((lead) => {
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
      String(getServicePricing(lead?.serviceName)?.amount || ""),
      formatInr(getServicePricing(lead?.serviceName)?.amount || 0),
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
      setSelectedLeadId(filteredLeads[0]._id);
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
      formatInr={formatInr}
      getServicePricing={getServicePricing}
      getEffectiveLeadStatus={getEffectiveLeadStatus}
      getDisplayStatus={getDisplayStatus}
      getVisibleDocuments={getVisibleDocuments}
      handleUpdateLeadStatus={handleUpdateLeadStatus}
      handleDocumentStatus={handleDocumentStatus}
      handleClearExecutorMessage={handleClearExecutorMessage}
      handleClearUserRejectedMessage={handleClearUserRejectedMessage}
      handleClearAdminPrMessage={handleClearAdminPrMessage}
      handleDeleteService={handleDeleteService}
      handleFileUpload={handleFileUpload}
      handleSendDraftToClient={handleSendDraftToClient}
      handleSendMessage={handleSendMessage}
      handleRejectDocumentWithMessage={handleRejectDocumentWithMessage}
      handleRejectService={handleRejectService}
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
              { label: "Completed", value: stats.completed },
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
                        {(lead.status === 'PendingReview' || lead.status === 'Open') && (
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
                                  return (
                                    <>
                                      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                        {clientDocs.map((doc) => {
                                          const docKey = `${lead._id}:${doc._id}`;
                                          const docStatus = serviceRejected ? "Rejected" : String(doc.status || "Waiting Review");
                                          const showReviewActions = !serviceRejected && ['Open', 'PendingReview', 'InformationRequired'].includes(lead.status);
                                          return (
                                            <React.Fragment key={doc._id}>
                                              <div className="pr-doc-row" style={{ padding: "16px 24px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                                <div style={{ overflow: "hidden", flex: 1 }}>
                                                  <p style={{ fontSize: "0.95rem", fontWeight: 700, color: "white", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", margin: 0 }}>{doc.name}</p>
                                                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "6px" }}>
                                                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: docStatus === 'Accepted' ? "#10b981" : docStatus === 'Rejected' ? "#ef4444" : "#f59e0b" }}></span>
                                                    <span style={{ fontSize: "0.7rem", fontWeight: 800, textTransform: "uppercase", color: docStatus === 'Accepted' ? "#10b981" : docStatus === 'Rejected' ? "#ef4444" : "#f59e0b" }}>{docStatus}</span>
                                                    {doc.displayReuploaded && (
                                                      <span style={{ fontSize: "0.65rem", fontWeight: 900, textTransform: "uppercase", color: "#38bdf8", background: "rgba(56, 189, 248, 0.12)", border: "1px solid rgba(56, 189, 248, 0.25)", padding: "2px 8px", borderRadius: "999px", letterSpacing: "0.05em" }}>
                                                        Reuploaded
                                                      </span>
                                                    )}
                                                  </div>
                                                </div>
                                                <div className="pr-doc-actions" style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                                                <button
                                                  onClick={() => viewDocument(doc.publicId, doc.url, lead._id)}
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
                                              onClick={() => viewDocument(doc.publicId, doc.url, lead._id)}
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

                                {(lead.status === 'PendingReview' || lead.status === 'Open' || lead.status === 'InformationRequired') && (
                                  <div className="pr-workflow-btns" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "15px" }}>
                                    {(() => {
                                      const clientDocs = getVisibleDocuments(lead).filter(d => d.type === 'Client');
                                      const allAccepted =
                                        clientDocs.length > 0 &&
                                        clientDocs.every((d) => d.status === 'Accepted');
                                      const anyRejected = clientDocs.some(d => d.status === 'Rejected');

                                      if (allAccepted) {
                                        return <button onClick={() => handleUpdateLeadStatus(lead._id, 'AssignedToExecutor')} style={{ padding: "1.2rem", borderRadius: "14px", background: "#10b981", color: "white", border: "none", fontWeight: 800, cursor: "pointer", fontSize: "0.9rem" }}>ACCEPT SERVICE & START COORDINATION</button>;
                                      } else if (anyRejected) {
                                        return <div style={{ padding: "1.2rem", borderRadius: "14px", background: "rgba(239, 68, 68, 0.05)", border: "1px solid rgba(239, 68, 68, 0.2)", color: "#ef4444", fontSize: "0.8rem", fontWeight: 700, textAlign: "center" }}>Documents rejected. Waiting for user to re-upload.</div>;
                                      } else {
                                        return <div style={{ padding: "1.2rem", borderRadius: "14px", background: "rgba(245, 158, 11, 0.05)", border: "1px solid rgba(245, 158, 11, 0.2)", color: "#f59e0b", fontSize: "0.8rem", fontWeight: 700, textAlign: "center" }}>Accept all documents to proceed.</div>;
                                      }
                                    })()}

                                    <button onClick={() => openRejectForm(lead._id)} style={{ padding: "1.2rem", borderRadius: "14px", background: "rgba(239, 68, 68, 0.1)", color: "#ef4444", border: "1px solid rgba(239, 68, 68, 0.2)", fontWeight: 800, cursor: "pointer" }}>REJECT ENTIRE SERVICE</button>
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

                                {(lead.status === 'AssignedToExecutor' || lead.status === 'PR_Accepted') && (
                                  <div style={{ textAlign: "center", padding: "1.5rem", background: "rgba(245, 158, 11, 0.05)", border: "1px solid rgba(245, 158, 11, 0.2)", borderRadius: "14px", color: "#f59e0b", marginTop: "1.5rem" }}>
                                    <div style={{ fontSize: "1rem", fontWeight: 800, marginBottom: "4px" }}>Waiting for Executor Approval</div>
                                    <p style={{ fontSize: "0.75rem", fontWeight: 600, margin: 0, opacity: 0.8 }}>Assigning executor... Draft delivery will be available once they accept.</p>
                                  </div>
                                )}

                                {lead.executorMessage && (
                                  <div style={{ marginTop: "1.5rem", padding: "1.5rem", background: "rgba(67, 97, 238, 0.05)", border: "1px dashed rgba(67, 97, 238, 0.3)", borderRadius: "16px", color: "var(--v-blue)" }}>
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
                                    <p style={{ fontSize: "0.9rem", fontWeight: 500, margin: 0, fontStyle: "italic", opacity: 0.9 }}>
                                      "{lead.executorMessage}"
                                    </p>
                                    <p style={{ fontSize: "0.72rem", marginTop: "8px", marginBottom: 0, opacity: 0.8 }}>
                                      Current status: {getDisplayStatus(effectiveStatus)}
                                    </p>
                                  </div>
                                )}

                                {lead.prMessage && (
                                  <div style={{ marginTop: "1.5rem", padding: "1.5rem", background: "rgba(16, 185, 129, 0.05)", border: "1px dashed rgba(16, 185, 129, 0.3)", borderRadius: "16px", color: "#10b981" }}>
                                    <div style={{ fontSize: "0.7rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "8px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                                      <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                        <MessageSquare size={14} /> Message from Admin
                                      </span>
                                      <button
                                        onClick={(e) => handleClearAdminPrMessage(lead._id, e)}
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
                                      "{lead.prMessage}"
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
                                        <input type="file" id={`final-${lead._id}`} hidden onChange={(e) => handleFileUpload(lead._id, e.target.files[0], 'Final')} />
                                        <button onClick={() => document.getElementById(`final-${lead._id}`).click()} style={{ padding: "1.2rem", borderRadius: "14px", background: "rgba(255,255,255,0.04)", color: "white", border: "1px solid rgba(255,255,255,0.1)", fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", cursor: "pointer" }}>
                                          {uploadingId === `${lead._id}-Final` ? (
                                            <><Loader2 size={18} className="animate-spin" /> UPLOADING...</>
                                          ) : (
                                            <><Upload size={18} /> UPLOAD FINAL</>
                                          )}
                                        </button>
                                        <button
                                          disabled={!lead.documents?.some(d => d.type === 'Final')}
                                          onClick={() => handleUpdateLeadStatus(lead._id, 'Completed')}
                                          style={{ padding: "1.2rem", borderRadius: "14px", background: "#10b981", color: "white", border: "none", fontWeight: 800, cursor: "pointer", opacity: lead.documents?.some(d => d.type === 'Final') ? 1 : 0.3 }}
                                        >
                                          MARK COMPLETED
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="pr-draft-btns" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                                        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                          <input type="file" id={`draft-${lead._id}`} hidden onChange={(e) => handleFileUpload(lead._id, e.target.files[0], 'Draft')} />
                                          <button
                                            disabled={!canManageDraftForLead(lead)}
                                            onClick={() => document.getElementById(`draft-${lead._id}`).click()}
                                            style={{
                                              padding: "1.2rem",
                                              borderRadius: "14px",
                                              background: canManageDraftForLead(lead) ? "rgba(67, 97, 238, 0.1)" : "rgba(255,255,255,0.02)",
                                              color: canManageDraftForLead(lead) ? "#4361ee" : "rgba(255,255,255,0.2)",
                                              border: "1px solid rgba(67, 97, 238, 0.2)",
                                              fontWeight: 800,
                                              display: "flex",
                                              alignItems: "center",
                                              justifyContent: "center",
                                              gap: "10px",
                                              cursor: canManageDraftForLead(lead) ? "pointer" : "not-allowed"
                                            }}
                                          >
                                            {uploadingId === `${lead._id}-Draft` ? (
                                              <><Loader2 size={18} className="animate-spin" /> UPLOADING...</>
                                            ) : (
                                              <><Upload size={18} /> UPLOAD DRAFT</>
                                            )}
                                          </button>
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
                                <div style={{ marginTop: "1.5rem", background: "rgba(255,255,255,0.02)", padding: "1.5rem", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.05)" }}>
                                  <div style={{ fontSize: "0.65rem", fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "1rem" }}>Communicate with Client</div>
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
