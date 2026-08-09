import Lead from "../models/Lead.js";
import ReuploadedDocument from "../models/ReuploadedDocument.js";
import Service from "../models/Service.js";
import { parseFeeAmount, resolveLeadCost } from "../utils/servicePricing.js";
import jwt from "jsonwebtoken";
import axios from "axios";
import {
  normalizeDocumentUrl,
  uniqueValues,
  parseCloudinaryAssetUrl,
  buildCloudinarySignedUrl,
  tryCloudinaryResourceLookup,
} from "../utils/cloudinaryDocuments.js";

const escapeRegExp = (value) =>
  String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const normalizeRole = (role) => String(role || "").trim().toLowerCase();

const isDraftSentStatus = (status) => {
  return ["ExecutionFinished", "DraftSent", "DraftAccepted", "DraftRejected", "UserAccepted", "Completed"].includes(status);
};

const filterUnsentDraftsForResponse = (leadOrLeads, role) => {
  const normalizedRole = normalizeRole(role);
  const isExecutorRole = normalizedRole === "executor" ||
    /^executor\d+$/.test(normalizedRole);
  if (normalizedRole !== "user" && !isExecutorRole) {
    return leadOrLeads;
  }

  const collapseDuplicateDraftDocuments = (documents) => {
    if (!Array.isArray(documents) || documents.length <= 1) return documents;

    const draftDocuments = [...documents]
      .filter((doc) => String(doc?.type || "").trim().toLowerCase() === "draft")
      .sort((a, b) => {
        const aTime = new Date(a?.uploadedAt || a?.createdAt || 0).getTime();
        const bTime = new Date(b?.uploadedAt || b?.createdAt || 0).getTime();
        return bTime - aTime;
      });

    if (draftDocuments.length <= 1) return documents;

    const latestDraft = draftDocuments[0];
    return documents.filter((doc) => {
      if (String(doc?.type || "").trim().toLowerCase() !== "draft") return true;
      return doc === latestDraft;
    });
  };

  const filterLeadDocs = (lead) => {
    if (!lead) return lead;
    const leadObj = typeof lead.toObject === "function" ? lead.toObject() : lead;
    if (leadObj.documents) {
      leadObj.documents = collapseDuplicateDraftDocuments(leadObj.documents);
    }
    if (isDraftSentStatus(leadObj.status)) {
      return leadObj;
    }
    if (leadObj.documents) {
      leadObj.documents = leadObj.documents.filter(
        (doc) => String(doc.type || "").trim().toLowerCase() !== "draft"
      );
    }
    return leadObj;
  };

  if (Array.isArray(leadOrLeads)) {
    return leadOrLeads.map(filterLeadDocs);
  }
  return filterLeadDocs(leadOrLeads);
};
const normalizeDocumentName = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const DEFAULT_DOCUMENT_LINK_LIFETIME_SECONDS = 8;

const getDocumentLinkLifetimeSeconds = () => {
  const parsedValue = Number.parseInt(process.env.DOCUMENT_LINK_LIFETIME_SECONDS, 10);
  return Number.isFinite(parsedValue) && parsedValue > 0
    ? parsedValue
    : DEFAULT_DOCUMENT_LINK_LIFETIME_SECONDS;
};

const toPlainObject = (value) =>
  value && typeof value.toObject === "function" ? value.toObject() : { ...value };

const attachReuploadMetadata = async (leadOrLeads) => {
  const list = Array.isArray(leadOrLeads) ? leadOrLeads : [leadOrLeads].filter(Boolean);
  if (list.length === 0) return Array.isArray(leadOrLeads) ? [] : null;

  const leads = list.map(toPlainObject);
  const leadIds = [...new Set(leads.map((lead) => String(lead?._id || "").trim()).filter(Boolean))];
  const records = leadIds.length
    ? await ReuploadedDocument.find({ lead: { $in: leadIds } }).sort({ updatedAt: -1, createdAt: -1 })
    : [];

  const recordsByLead = new Map();
  for (const record of records) {
    const leadKey = String(record.lead || "").trim();
    const normalizedName = normalizeDocumentName(record.normalizedDocumentName || record.documentName);
    if (!leadKey || !normalizedName) continue;
    if (!recordsByLead.has(leadKey)) recordsByLead.set(leadKey, new Map());
    const leadMap = recordsByLead.get(leadKey);
    if (!leadMap.has(normalizedName)) {
      leadMap.set(normalizedName, record.toObject ? record.toObject() : { ...record });
    }
  }

  const annotate = (lead) => {
    const leadKey = String(lead?._id || "").trim();
    const leadRecords = recordsByLead.get(leadKey) || new Map();
    const reuploadedDocumentNames = Array.from(leadRecords.values()).map(
      (record) => record.documentName,
    );
    const reuploadedNameSet = new Set(
      reuploadedDocumentNames.map((name) => normalizeDocumentName(name)).filter(Boolean),
    );

    return {
      ...lead,
      documents: Array.isArray(lead.documents)
        ? lead.documents.map((doc) => ({
          ...doc,
          displayReuploaded:
            reuploadedNameSet.has(normalizeDocumentName(doc?.name)) ||
            !!doc?.reuploaded ||
            String(doc?.status || "").trim().toLowerCase() === "reuploaded",
        }))
        : [],
      reuploadedDocumentNames,
      reuploadedDocuments: Array.from(leadRecords.values()),
    };
  };

  const annotated = leads.map(annotate);
  return Array.isArray(leadOrLeads) ? annotated : annotated[0];
};

const persistReuploadedDocuments = async ({
  lead,
  incomingDocuments,
  reuploadedNames,
  sourceRole,
}) => {
  const normalizedNames = new Set(
    Array.isArray(reuploadedNames)
      ? reuploadedNames.map((name) => normalizeDocumentName(name)).filter(Boolean)
      : [],
  );
  if (!lead || normalizedNames.size === 0) return;

  const docs = Array.isArray(incomingDocuments) ? incomingDocuments : [];
  const docsToStore = docs.filter((doc) =>
    normalizedNames.has(normalizeDocumentName(doc?.name)),
  );
  if (docsToStore.length === 0) return;

  await Promise.all(
    docsToStore.map((doc) =>
      ReuploadedDocument.updateOne(
        {
          lead: lead._id,
          normalizedDocumentName: normalizeDocumentName(doc?.name),
        },
        {
          $set: {
            lead: lead._id,
            user: lead.user?._id || lead.user || null,
            serviceName: lead.serviceName,
            documentName: doc?.name || "",
            normalizedDocumentName: normalizeDocumentName(doc?.name),
            url: doc?.url || "",
            publicId: doc?.publicId || "",
            sourceRole: normalizeRole(sourceRole).toUpperCase(),
            sourceLeadStatus: String(lead?.status || "").trim(),
            sourceDocumentStatus: String(doc?.status || "").trim(),
            reuploadedAt: new Date(),
          },
          $setOnInsert: {
            createdAt: new Date(),
          },
        },
        { upsert: true },
      ),
    ),
  );

  // Update the lead to mark it as having these specific reuploaded names
  await Lead.findByIdAndUpdate(lead._id, {
    $addToSet: { reuploadedDocumentNames: { $each: Array.from(normalizedNames) } }
  });
};

export const createLead = async (req, res) => {
  try {
    const {
      user,
      name,
      email,
      serviceName,
      cost,
      recommendedFeeAmount,
      recommendedFees,
      documents,
    } = req.body;
    console.log(
      `[LeadController] Creating lead for ${email}. Documents:`,
      documents?.length || 0,
    );

    const serviceRecord = await Service.findOne({
      title: new RegExp(`^${escapeRegExp(String(serviceName || "").trim())}$`, "i"),
    });

    const resolvedCost = resolveLeadCost({
      serviceName,
      cost,
      recommendedFeeAmount,
      recommendedFees,
      serviceRecommendedFees: serviceRecord?.recommendedFees,
    });
    const resolvedRecommendedFee =
      parseFeeAmount(serviceRecord?.recommendedFees) ??
      parseFeeAmount(recommendedFeeAmount) ??
      parseFeeAmount(recommendedFees) ??
      resolvedCost;

    const newLead = new Lead({
      user: user || null,
      name,
      email,
      serviceName,
      cost: resolvedCost,
      recommendedFeeAmount: resolvedRecommendedFee,
      recommendedFees: serviceRecord?.recommendedFees || recommendedFees || "",
      ourFee: serviceRecord?.recommendedFees || recommendedFees || "",
      marketFees: serviceRecord?.marketFees || "",
      workingDays: serviceRecord?.workingDays ?? 2,
      documents: Array.isArray(documents) ? documents : [],
    });

    await newLead.save();
    res
      .status(201)
      .json({
        success: true,
        message: "Interest recorded effectively",
        lead: newLead,
      });
  } catch (error) {
    console.error("Error creating lead:", error);
    res
      .status(500)
      .json({ success: false, message: "Server Error recording interest" });
  }
};

export const getLeads = async (req, res) => {
  try {
    let query = {};
    const userRole = normalizeRole(req.user.role);

    if (userRole === "admin") {
      // Admin sees everything unless filtered
      const { userId, prId, executorId } = req.query;
      if (userId) query.user = userId;
      if (prId) query.prId = prId;
      if (executorId) query.executorId = executorId;
    } else if (userRole === "pr") {
      // PR should see all user services so newly submitted requests are always visible,
      // except brand-new "Open" leads — those stay admin-only until the admin has
      // collected the required documents and forwarded the lead for PR review.
      query = { status: { $ne: "Open" } };
    } else if (userRole === "executor") {
      // Generic "executor" role: sees leads assigned to them by executorId ObjectId
      query = {
        status: { $ne: "Open" },
        executorId: req.user._id,
      };
    } else if (/^executor\d+$/.test(userRole)) {
      // Named executor roles (executor1, executor2, …): see leads where assignedExecutor
      // matches their role (case-insensitive) OR where their executorId ObjectId is set.
      query = {
        status: { $ne: "Open" },
        $or: [
          { assignedExecutor: { $regex: new RegExp(`^${escapeRegExp(userRole)}$`, "i") } },
          { executorId: req.user._id },
        ],
      };
    } else {
      // Regular user sees their own leads
      query.user = req.user._id;
    }

    // Always exclude soft-deleted leads from regular dashboard views
    query.isDeleted = { $ne: true };

    const leads = await Lead.find(query)
      .populate("user", "name email profile")
      .populate("prId", "name email")
      .populate("executorId", "name email")
      .sort({ createdAt: -1 });

    // Enrich leads with current service fees from the catalog
    const uniqueServiceNames = [...new Set(leads.map((l) => String(l.serviceName || "").trim()).filter(Boolean))];
    const serviceRecords = uniqueServiceNames.length
      ? await Service.find({ title: { $in: uniqueServiceNames.map((n) => new RegExp(`^${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i")) } }).select("title recommendedFees marketFees workingDays").lean()
      : [];
    const serviceDataMap = {};
    for (const svc of serviceRecords) {
      serviceDataMap[String(svc.title || "").trim().toLowerCase()] = svc;
    }

    const enrichedLeads = leads.map((lead) => {
      const obj = lead.toObject ? lead.toObject() : lead;
      const svcKey = String(obj.serviceName || "").trim().toLowerCase();
      const svcData = serviceDataMap[svcKey];
      if (svcData) {
        if (svcData.recommendedFees) {
          obj.recommendedFees = svcData.recommendedFees;
          obj.ourFee = svcData.recommendedFees;
          const parsed = parseFeeAmount(svcData.recommendedFees);
          if (parsed != null && parsed > 0) obj.recommendedFeeAmount = parsed;
        }
        if (svcData.marketFees) obj.marketFees = svcData.marketFees;
        if (svcData.workingDays != null) obj.workingDays = svcData.workingDays;
      }
      return obj;
    });

    const hydratedLeads = await attachReuploadMetadata(enrichedLeads);
    const filteredLeads = filterUnsentDraftsForResponse(hydratedLeads, req.user.role);
    res.status(200).json(filteredLeads);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const assignLead = async (req, res) => {
  try {
    const { id } = req.params;
    const { prId, executorId, status, assignedExecutor } = req.body;

    const lead = await Lead.findById(id);
    if (!lead) return res.status(404).json({ message: "Lead not found" });

    if (prId) lead.prId = prId;
    if (executorId) lead.executorId = executorId;
    if (status) lead.status = status;
    if (assignedExecutor) lead.assignedExecutor = assignedExecutor;

    lead.updatedAt = Date.now();
    await lead.save();

    res.status(200).json({ success: true, lead });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updatePrFeedback = async (req, res) => {
  try {
    const { id } = req.params;
    const { feedback, status } = req.body;

    const lead = await Lead.findById(id);
    if (!lead) return res.status(404).json({ message: "Lead not found" });

    lead.prFeedback = feedback;
    if (status) lead.status = status;
    lead.updatedAt = Date.now();

    await lead.save();
    res.status(200).json({ success: true, lead });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const setDocumentsRequired = async (req, res) => {
  try {
    const { id } = req.params;
    const { documentsRequired } = req.body;

    if (!Array.isArray(documentsRequired)) {
      return res.status(400).json({ success: false, message: "documentsRequired must be an array" });
    }

    const cleanedNames = [
      ...new Set(
        documentsRequired
          .map((name) => String(name || "").trim())
          .filter(Boolean),
      ),
    ];

    const lead = await Lead.findByIdAndUpdate(
      id,
      { $set: { documentsRequired: cleanedNames, updatedAt: Date.now() } },
      { new: true },
    );

    if (!lead) {
      return res.status(404).json({ success: false, message: "Lead not found" });
    }

    res.status(200).json({ success: true, lead });
  } catch (error) {
    console.error("Error setting documents required:", error);
    res.status(500).json({ success: false, message: "Error setting documents required" });
  }
};

export const sendDocumentsToUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { note } = req.body;
    const lead = await Lead.findById(id);

    if (!lead) {
      return res.status(404).json({ success: false, message: "Lead not found" });
    }

    if (!Array.isArray(lead.documentsRequired) || lead.documentsRequired.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Add at least one required document before sending to the user",
      });
    }

    if (typeof note === "string") {
      lead.documentsRequiredNote = note.trim();
    }

    const existingNames = new Set(
      (Array.isArray(lead.documents) ? lead.documents : []).map((doc) =>
        String(doc?.name || "").trim().toLowerCase(),
      ),
    );

    lead.documentsRequired.forEach((name) => {
      const trimmedName = String(name || "").trim();
      if (!trimmedName || existingNames.has(trimmedName.toLowerCase())) return;
      lead.documents.push({
        name: trimmedName,
        type: "Client",
        status: "Pending",
        adminAdded: true,
      });
      existingNames.add(trimmedName.toLowerCase());
    });

    lead.documentsSentToUser = true;
    lead.updatedAt = Date.now();
    await lead.save();

    // Deliberately NOT propagated to the Service catalog: documents requested
    // for one user's lead must stay scoped to that lead only. Writing them onto
    // the shared Service.documentsRequired list would leak this specific
    // request onto every other user who picked the same service (they'd see a
    // "required" document they were never actually asked for).

    res.status(200).json({ success: true, lead });
  } catch (error) {
    console.error("Error sending documents to user:", error);
    res.status(500).json({ success: false, message: "Error sending documents to user" });
  }
};

export const getLeadById = async (req, res) => {
  try {
    const { id } = req.params;
    const lead = await Lead.findById(id)
      .populate("user", "name email profile")
      .populate("prId", "name email")
      .populate("executorId", "name email");

    if (!lead)
      return res
        .status(404)
        .json({ success: false, message: "Lead not found" });

    // Check if user is authorized to view this lead
    const leadUserId = lead.user?._id || lead.user;
    if (
      req.user.role !== "admin" &&
      (!leadUserId || leadUserId.toString() !== req.user._id.toString())
    ) {
      return res
        .status(403)
        .json({
          success: false,
          message: "Not authorized to access this lead",
        });
    }

    const hydratedLead = await attachReuploadMetadata(lead);
    const filteredLead = filterUnsentDraftsForResponse(hydratedLead, req.user.role);
    res.status(200).json(filteredLead);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
export const updateLead = async (req, res) => {
  try {
    const { id } = req.params;
    const lead = await Lead.findById(id);

    if (!lead) {
      return res
        .status(404)
        .json({ success: false, message: "Lead not found" });
    }

    // Check if user is authorized to update this lead
    const leadUserId = lead.user?._id || lead.user;
    const isOwner = leadUserId && leadUserId.toString() === req.user._id.toString();
    const isPR = normalizeRole(req.user.role) === 'pr';
    const normalizedRole = normalizeRole(req.user.role);
    const isExecutor = normalizedRole === 'executor' || /^executor\d+$/.test(normalizedRole);
    const isAdmin = normalizeRole(req.user.role) === 'admin';

    // PR can update if assigned or if the lead is not yet picked up by any PR
    const canPRUpdate = isPR && (!lead.prId || lead.prId.toString() === req.user._id.toString());
    // Executor can update if assigned
    const canExecutorUpdate = isExecutor && (
      (!lead.executorId || lead.executorId.toString() === req.user._id.toString()) ||
      (/^executor\d+$/.test(normalizedRole) && lead.assignedExecutor?.toLowerCase() === normalizedRole)
    );

    if (!isAdmin && !isOwner && !canPRUpdate && !canExecutorUpdate) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this lead",
      });
    }

    // If a PR is accepting/updating an 'Open' or 'PendingReview' lead, assign them as the prId automatically
    if (isPR && !lead.prId) {
      req.body.prId = req.user._id;
    }

    // If an executor is accepting an unassigned lead, assign them as the executorId automatically
    if (isExecutor && (!lead.executorId || lead.executorId.toString() === req.user._id.toString())) {
      if (req.body.status === 'InProgress') {
        req.body.executorId = req.user._id;
      }
    }

    const isRejectedService = (item) => {
      if (!item) return false;
      const status = String(item.status || "").trim().toLowerCase();
      if (status === "rejected") return true;
      // InformationRequired means PR has told client to reupload (executor or PR rejected docs)
      if (status === "informationrequired") return true;

      const rejectionText = [
        item.executorMessage,
        item.prFeedback,
        item.adminMessage,
        item.prToExecutorMessage,
        item.adminToExecutorMessage,
      ]
        .map((value) => String(value || "").trim().toLowerCase())
        .join(" ");

      return (
        rejectionText.includes("rejected by executor") ||
        rejectionText.includes("assignment rejected") ||
        rejectionText.includes("rejected by pr") ||
        rejectionText.includes("service rejected")
      );
    };

    const updateData = { ...req.body, updatedAt: Date.now() };

    // Detect executor rejecting the entire service — set the staging flag so PR must
    // click "Notify Client" before the rejection becomes visible outside the PR dashboard.
    const isExecutorRole = isExecutor;
    const isServiceRejectionByExecutor =
      isExecutorRole &&
      String(updateData.status || "").trim() === "Rejected" &&
      String(updateData.executorMessage || "").trim().length > 0;

    if (isServiceRejectionByExecutor) {
      updateData.executorServiceRejected = true;
      updateData.prNotifiedClientServiceRejection = false;
    }

    // When admin accepts the service and forwards it to PR, reset the admin-reviewed
    // client document statuses back to Pending so PR performs its own independent
    // accept/reject review — mirroring how AssignedToExecutor resets PR-reviewed
    // documents for the executor's own review below.
    if (updateData.status === "PendingReview" && lead.status === "Open") {
      const currentDocuments = Array.isArray(lead.documents)
        ? lead.documents.map((doc) =>
            typeof doc.toObject === "function" ? doc.toObject() : { ...doc }
          )
        : [];

      updateData.documents = currentDocuments.map((doc) => {
        const docType = String(doc?.type || "").trim().toLowerCase();
        if (docType === "client" || docType === "userupload" || docType === "") {
          return { ...doc, status: "Pending", rejectionMessage: "" };
        }
        return doc;
      });
    }

    // If PR accepts a service that already has an executor assigned (reupload flow),
    // skip PR_Accepted and go directly to AssignedToExecutor so the PR dashboard
    // shows the correct "Assigned to ExecutorX" status instead of "Pending Executor Assignment".
    if (updateData.status === "PR_Accepted") {
      const existingExecutor = String(lead.assignedExecutor || "").trim();
      if (existingExecutor) {
        updateData.status = "AssignedToExecutor";
        updateData.assignedExecutor = existingExecutor;
      }
    }

    // When PR assigns service to executor, reset Client document statuses so the
    // executor performs their own independent review — but PRESERVE docs the PR
    // already accepted so the PR dashboard continues to show "Accepted" for those.
    if (updateData.status === "AssignedToExecutor") {
      const currentDocuments = Array.isArray(lead.documents)
        ? lead.documents.map((doc) =>
            typeof doc.toObject === "function" ? doc.toObject() : { ...doc }
          )
        : [];

      updateData.documents = currentDocuments.map((doc) => {
        const docType = String(doc?.type || "").trim().toLowerCase();
        const docStatus = String(doc?.status || "").trim().toLowerCase();
        // Only reset Client-uploaded docs that haven't been explicitly accepted by the PR.
        // Docs the PR already marked "Accepted" keep that status so the PR dashboard
        // still shows "Accepted" for them; the executor sees "Pending" for everything
        // via the executor-specific display logic, not the raw DB status.
        if ((docType === "client" || docType === "userupload" || docType === "") && docStatus !== "accepted") {
          return { ...doc, status: "Pending", rejectionMessage: "" };
        }
        return doc;
      });
    }

    if (updateData.status === "DraftRejected") {
      const rawRejectionMessage = String(
        updateData.rejectionMessage || updateData.userMessage || "",
      ).trim();
      const rejectionMessage = rawRejectionMessage.replace(
        /^Draft rejected by user:\s*/i,
        "",
      ).trim() || rawRejectionMessage;

      const currentDocuments = Array.isArray(lead.documents)
        ? lead.documents.map((doc) =>
          typeof doc.toObject === "function" ? doc.toObject() : { ...doc },
        )
        : [];

      updateData.documents = currentDocuments.map((doc) => {
        if (String(doc?.type || "").trim() !== "Draft") {
          return doc;
        }

        return {
          ...doc,
          status: "Rejected",
          rejectionMessage,
        };
      });
    }

    const pushedDocuments = req.body?.$push?.documents;
    const hasIncomingDocuments = !!pushedDocuments;

    // PR/admin rejecting the whole service or requesting more info (not the
    // reupload-merge flow, which has its own status recovery logic below)
    // starts a brand-new review cycle. Clear any stale "reuploaded" markers
    // left over from a previous cycle so the dashboards don't misreport this
    // fresh rejection as "already resubmitted, pending PR re-review" — this
    // matters even when no specific document is marked Rejected (e.g. a
    // direct service-level rejection), since otherwise a stale reuploaded
    // flag on any document keeps the lead looking resubmitted.
    const nextStatus = String(updateData.status || "").trim();
    const isDirectServiceRejectionByReviewer =
      (isAdmin || isPR) &&
      (nextStatus === "Rejected" || nextStatus === "InformationRequired") &&
      !hasIncomingDocuments;

    if (isDirectServiceRejectionByReviewer) {
      updateData.reuploadedDocumentNames = [];
      updateData.documents = (Array.isArray(lead.documents) ? lead.documents : []).map((doc) => {
        const plainDoc = typeof doc.toObject === "function" ? doc.toObject() : { ...doc };
        return { ...plainDoc, reuploaded: false };
      });
      await ReuploadedDocument.deleteMany({ lead: lead._id });
      // Fresh rejection cycle — clear any stale "already resubmitted" confirmation
      // left over from a prior cycle so the Services page shows this rejection.
      updateData.initialSubmissionConfirmed = false;
    }

    const reuploadedDocumentNames = Array.isArray(req.body?.reuploadedDocumentNames)
      ? req.body.reuploadedDocumentNames
      : [];

    const normalizedReuploads = new Set(
      reuploadedDocumentNames
        .map((name) => normalizeDocumentName(name))
        .filter(Boolean)
    );

    let inferredReuploads = new Set(normalizedReuploads);
    // Names that are genuinely being reuploaded (as opposed to a document
    // replacing an admin-requested placeholder for the first time) — used for
    // the per-document `reuploaded` flag/display AND for what gets persisted to
    // the ReuploadedDocument audit trail below. Declared here (not just inside
    // the merge block) so it's still in scope when we persist after saving.
    let trueReuploadNames = new Set(normalizedReuploads);

    if (
      updateData.status === "AssignedToExecutor" ||
      updateData.status === "DraftSent" ||
      updateData.status === "Completed" ||
      updateData.status === "PendingReview" ||
      hasIncomingDocuments ||
      normalizedReuploads.size > 0
    ) {
      // Get current documents as plain objects to avoid Mongoose internal state issues
      const currentDocuments = Array.isArray(lead.documents)
        ? lead.documents.map(d => (typeof d.toObject === 'function' ? d.toObject() : d))
        : [];

      const incomingDocsRaw = pushedDocuments?.$each
        ? pushedDocuments.$each
        : pushedDocuments
          ? [pushedDocuments]
          : Array.isArray(req.body.documents)
            ? req.body.documents
            : [];

      const incomingDraftDocs = incomingDocsRaw.filter(
        (doc) => String(doc?.type || "").trim().toLowerCase() === "draft",
      );
      const existingDraftDocs = currentDocuments.filter(
        (doc) => String(doc?.type || "").trim().toLowerCase() === "draft",
      );
      const shouldReplaceDraftDocs = incomingDraftDocs.length > 0 && existingDraftDocs.length > 0;

      const incomingFinalDocs = incomingDocsRaw.filter(
        (doc) => String(doc?.type || "").trim().toLowerCase() === "final",
      );
      const existingFinalDocs = currentDocuments.filter(
        (doc) => String(doc?.type || "").trim().toLowerCase() === "final",
      );
      const shouldReplaceFinalDocs = incomingFinalDocs.length > 0 && existingFinalDocs.length > 0;

      const currentDocumentNames = new Set(
        currentDocuments
          .map((doc) => normalizeDocumentName(doc?.name))
          .filter(Boolean)
      );
      // Names that already have an uploaded FILE (not just an admin-requested
      // placeholder with no file yet). The very first upload against a document
      // the admin requested replaces a same-named placeholder, but it is not a
      // "reupload" — only a document that already had a file counts as one.
      const currentDocumentNamesWithFile = new Set(
        currentDocuments
          .filter((doc) => !!(doc?.url || doc?.publicId || doc?.secure_url || doc?.uploadedUrl))
          .map((doc) => normalizeDocumentName(doc?.name))
          .filter(Boolean)
      );
      // Count how many incoming documents share each name — used to catch the
      // case where several files are uploaded for the same document name at once.
      // A document name must resolve to a single stored file, so same-named
      // incoming entries must go through the merge/collapse path below rather
      // than accumulating as separate copies.
      const incomingNameCounts = new Map();
      for (const doc of incomingDocsRaw) {
        const n = normalizeDocumentName(doc?.name);
        if (!n) continue;
        incomingNameCounts.set(n, (incomingNameCounts.get(n) || 0) + 1);
      }

      // Identify which incoming documents replace an existing entry (placeholder
      // or real file) so the stale entry gets removed below.
      for (const doc of incomingDocsRaw) {
        const incomingName = normalizeDocumentName(doc?.name);
        const markedReupload =
          String(doc?.status || "").trim().toLowerCase() === "reuploaded" ||
          !!doc?.reuploaded;
        const hasSameNameSibling = incomingName && (incomingNameCounts.get(incomingName) || 0) > 1;
        if (
          incomingName &&
          (
            currentDocumentNames.has(incomingName) ||
            markedReupload ||
            hasSameNameSibling ||
            (shouldReplaceDraftDocs && String(doc?.type || "").trim().toLowerCase() === "draft") ||
            (shouldReplaceFinalDocs && String(doc?.type || "").trim().toLowerCase() === "final")
          )
        ) {
          inferredReuploads.add(incomingName);
        }
        // Only a document that already had an uploaded file (or was explicitly
        // marked as a reupload) is a TRUE reupload.
        if (incomingName && (currentDocumentNamesWithFile.has(incomingName) || markedReupload)) {
          trueReuploadNames.add(incomingName);
        }
      }

      // If we are reuploading, we need to replace existing versions of those documents
      if (inferredReuploads.size > 0) {
        // Names the admin explicitly requested (placeholder entries). When a reupload
        // replaces a same-named document, the surviving entry must inherit this flag —
        // otherwise the very first upload of an admin-requested document would silently
        // erase the "admin requested this" marker along with the placeholder it replaces.
        const adminAddedNames = new Set(
          currentDocuments
            .filter((doc) => doc?.adminAdded === true)
            .map((doc) => normalizeDocumentName(doc?.name))
            .filter(Boolean),
        );

        const preservedDocuments = currentDocuments.filter((doc) => {
          const docName = normalizeDocumentName(doc?.name);
          if (inferredReuploads.has(docName)) return false;
          if (shouldReplaceDraftDocs && String(doc?.type || "").trim().toLowerCase() === "draft") return false;
          if (shouldReplaceFinalDocs && String(doc?.type || "").trim().toLowerCase() === "final") return false;
          return true;
        });

        const taggedIncomingDocuments = incomingDocsRaw.map((doc) => {
          const docName = normalizeDocumentName(doc?.name);
          const isDraftDoc = String(doc?.type || "").trim().toLowerCase() === "draft";
          const isFinalDoc = String(doc?.type || "").trim().toLowerCase() === "final";
          const isReupload = trueReuploadNames.has(docName) || (shouldReplaceDraftDocs && isDraftDoc) || (shouldReplaceFinalDocs && isFinalDoc);
          const isFinal = String(doc?.type || "").trim().toLowerCase() === "final";

          return {
            ...doc,
            name: doc?.name || "",
            reuploaded: isReupload,
            status: isFinal ? "Accepted" : (isReupload ? "Pending" : (doc?.status || "Pending")),
            adminAdded: doc?.adminAdded === true || adminAddedNames.has(docName),
          };
        });

        const allDocumentsRaw = [...preservedDocuments, ...taggedIncomingDocuments];
        // Collapse duplicate client documents by name — each document name must
        // map to a single stored file. When multiple files are uploaded for the
        // same document (or a re-upload arrives), the latest one overrides the
        // rest instead of accumulating multiple copies. Draft/Final documents are
        // exempt (they have their own replace handling above). Iterating from the
        // end keeps the newest occurrence of each name (incoming docs are appended
        // last), while unshift preserves the original ordering.
        const seenClientNames = new Set();
        const allDocuments = [];
        for (let i = allDocumentsRaw.length - 1; i >= 0; i--) {
          const doc = allDocumentsRaw[i];
          const type = String(doc?.type || "").trim().toLowerCase();
          if (type === "draft" || type === "final") {
            allDocuments.unshift(doc);
            continue;
          }
          const key = normalizeDocumentName(doc?.name);
          if (key && seenClientNames.has(key)) continue;
          if (key) seenClientNames.add(key);
          allDocuments.unshift(doc);
        }
        updateData.documents = allDocuments;

        // Clean up the update payload to avoid conflicts between $set and $push
        delete updateData.$push;
        delete updateData.reuploadedDocumentNames;

        // Logic for status transition if it was rejected
        if (isRejectedService(lead)) {
          // Check if there are any REMAINING rejected documents that haven't been reuploaded
          const stillRejectedDocs = preservedDocuments.filter(d =>
            String(d?.status || "").trim().toLowerCase() === "rejected"
          );

          // Whether the rejection was on the whole service ("Rejected") or on
          // one or more individual documents ("InformationRequired"), reuploading
          // an admin-required document here only stages the file — it should
          // NOT silently resubmit the lead on its own. The lead stays in its
          // rejected state (whole-service or per-document) until the user
          // explicitly clicks "Submit" (a separate request), even once every
          // required document has been reuploaded.
          const originalStatusLower = String(lead.status || "").trim().toLowerCase();
          const isWholeServiceRejection = originalStatusLower === "rejected";
          const isInformationRequiredRejection = originalStatusLower === "informationrequired";
          const requiredDocNames = Array.isArray(lead.documentsRequired) ? lead.documentsRequired : [];
          const requiresManualResubmit =
            (isWholeServiceRejection || isInformationRequiredRejection) && requiredDocNames.length > 0;

          if (stillRejectedDocs.length > 0 || requiresManualResubmit) {
            updateData.status = isInformationRequiredRejection ? "InformationRequired" : "Rejected";
          } else {
            updateData.status = "PendingReview";
            // Clear previous rejection messages when moving back to review
            updateData.executorMessage = "";
            updateData.prFeedback = "";
            updateData.adminMessage = "";
            // Clear the service-level executor rejection staging flags
            updateData.executorServiceRejected = false;
            updateData.prNotifiedClientServiceRejection = false;
          }
        }
      }

      // Final validation for specific status transitions
      // Include both existing/merged documents AND any incoming $push documents
      // that haven't been merged (i.e. brand-new docs that aren't reuploads)
      const mergedDocs = updateData.documents || currentDocuments;
      const finalDocs = updateData.documents
        ? mergedDocs
        : [...mergedDocs, ...incomingDocsRaw];

      if (updateData.status === "DraftSent") {
        const hasDraft = finalDocs.some((doc) => doc?.type === "Draft");
        if (!hasDraft) {
          return res.status(400).json({
            success: false,
            message: "Draft must be uploaded before sending it to user.",
          });
        }
      }

      if (updateData.status === "Completed") {
        const hasFinal = finalDocs.some((doc) => doc?.type === "Final");
        if (!hasFinal) {
          return res.status(400).json({
            success: false,
            message: "Final return must be uploaded before completing service.",
          });
        }
        // Stamp the completion time (only on the transition into Completed)
        // so the delayed documents-email sweep knows when to start counting.
        if (lead.status !== "Completed") {
          updateData.completedAt = new Date();
        }
      }
    }

    // Perform the update
    let updatedLead;
    if (updateData.status === "AssignedToExecutor") {
      console.log(`[updateLead] Assigning ${id} with data:`, JSON.stringify(updateData));
      lead.set(updateData);
      lead.updatedAt = Date.now();
      try {
        updatedLead = await lead.save();
        console.log(`[updateLead] Save successful for ${id}, status: ${updatedLead.status}, assignedExecutor: ${updatedLead.assignedExecutor}`);
      } catch (saveErr) {
        console.error(`[updateLead] Save FAILED for ${id}:`, saveErr.message);
        return res.status(500).json({ success: false, message: saveErr.message });
      }
    } else {
      updatedLead = await Lead.findByIdAndUpdate(id, updateData, { new: true });
    }

    if (!updatedLead) {
      return res.status(404).json({ success: false, message: "Lead not found after update" });
    }

    // Persist to ReuploadedDocuments table for history/tracking. Uses
    // trueReuploadNames (not the broader inferredReuploads) so the very first
    // upload against an admin-requested placeholder isn't recorded as a
    // reupload — that persisted record is what drives the "Reuploaded" badge
    // shown across dashboards via displayReuploaded.
    if (trueReuploadNames.size > 0) {
      // Re-calculate incoming docs to store (only those that were reuploaded)
      const currentFinalDocs = Array.isArray(updatedLead.documents) ? updatedLead.documents : [];
      const docsToPersist = currentFinalDocs.filter((d) =>
        trueReuploadNames.has(normalizeDocumentName(d.name)) ||
        (String(d?.type || "").trim().toLowerCase() === "draft" && currentFinalDocs.filter((doc) => String(doc?.type || "").trim().toLowerCase() === "draft").length === 1),
      );

      await persistReuploadedDocuments({
        lead: updatedLead,
        incomingDocuments: docsToPersist,
        reuploadedNames: Array.from(trueReuploadNames),
        sourceRole: req.user?.role || "User",
      });
    }

    const hydratedUpdatedLead = await attachReuploadMetadata(updatedLead);
    res.status(200).json({ success: true, lead: hydratedUpdatedLead });
  } catch (error) {
    console.error("Error updating lead:", error);
    res.status(500).json({ success: false, message: "Error updating lead: " + error.message });
  }
};

export const deleteLead = async (req, res) => {
  try {
    const { id } = req.params;
    const lead = await Lead.findById(id);

    if (!lead) {
      return res.status(404).json({ success: false, message: "Lead not found" });
    }

    const leadUserId = lead.user?._id || lead.user;
    const isOwner = leadUserId && leadUserId.toString() === req.user._id.toString();
    const isAdmin = normalizeRole(req.user.role) === "admin";
    const isPR = normalizeRole(req.user.role) === "pr";
    const normalizedRole = normalizeRole(req.user.role);
    const isExecutor = normalizedRole === "executor" || /^executor\d+$/.test(normalizedRole);
    const isAssignedPR =
      lead.prId && lead.prId.toString() === req.user._id.toString();
    const isAssignedExecutor =
      lead.executorId && lead.executorId.toString() === req.user._id.toString();
    const canPRDelete = isPR && (isAssignedPR || !lead.prId);
    const canExecutorDelete =
      isExecutor && (isAssignedExecutor || !lead.executorId);

    if (!isAdmin && !isOwner && !canPRDelete && !canExecutorDelete) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this lead",
      });
    }

    lead.isDeleted = true;
    lead.updatedAt = Date.now();
    await lead.save();

    res.status(200).json({ success: true, message: "Lead removed from view" });
  } catch (error) {
    console.error("Error deleting lead:", error);
    res.status(500).json({ success: false, message: "Error deleting lead" });
  }
};

export const updateDocumentStatus = async (req, res) => {
  try {
    const { id, docId } = req.params;
    const { status, rejectionMessage } = req.body;

    if (!["Accepted", "Rejected"].includes(status)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid status" });
    }

    const lead = await Lead.findById(id);
    if (!lead)
      return res
        .status(404)
        .json({ success: false, message: "Lead not found" });

    const isOwner = lead.user?.toString() === req.user._id.toString();
    const isAssignedPR = lead.prId?.toString() === req.user._id.toString();
    const isAdmin = normalizeRole(req.user.role) === "admin";
    const isPR = normalizeRole(req.user.role) === "pr";
    const normalizedRole = normalizeRole(req.user.role);
    const isExecutor = normalizedRole === "executor" ||
      /^executor\d+$/.test(normalizedRole);
    const isAssignedExecutor = isExecutor && (
      (lead.executorId && lead.executorId.toString() === req.user._id.toString()) ||
      (lead.assignedExecutor && lead.assignedExecutor.toLowerCase() === normalizedRole)
    );

    if (!isAdmin && !isOwner && !isAssignedPR && !isPR && !isAssignedExecutor) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update document status for this lead",
      });
    }

    const doc = lead.documents.id(docId);
    if (!doc)
      return res
        .status(404)
        .json({ success: false, message: "Document not found" });

    if (isAssignedExecutor && !isAdmin && !isPR) {
      // Executor rejection: hold in staging state — client cannot see it yet.
      if (status === "Rejected") {
        doc.executorRejected = true;
        doc.rejectionMessage = String(rejectionMessage || "").trim();
        doc.prNotifiedClient = false;
        doc.executorAccepted = false;
        doc.status = "Pending";
      } else {
        // Executor accepting a document
        doc.status = "Accepted";
        doc.executorAccepted = true;
        doc.executorRejected = false;
        doc.prNotifiedClient = false;
        doc.rejectionMessage = "";
      }
    } else {
      // PR / Admin rejection: immediately visible to client
      doc.status = status;
      doc.rejectionMessage = status === "Rejected" ? String(rejectionMessage || "").trim() : "";
      doc.executorRejected = false;
      doc.prNotifiedClient = status === "Rejected";
      // This is a fresh decision on this document — clear any stale "reuploaded"
      // flag left over from an earlier review cycle so status displays (which
      // treat a still-reuploaded doc as "already resubmitted") reflect this
      // rejection instead of a prior, unrelated resubmission.
      doc.reuploaded = false;
    }

    lead.updatedAt = Date.now();
    await lead.save();

    if (!(isAssignedExecutor && !isAdmin && !isPR)) {
      const normalizedDocName = normalizeDocumentName(doc.name);
      if (normalizedDocName) {
        await ReuploadedDocument.deleteMany({ lead: lead._id, normalizedDocumentName: normalizedDocName });
        await Lead.findByIdAndUpdate(lead._id, { $pull: { reuploadedDocumentNames: normalizedDocName } });
      }
    }

    const hydratedLead = await attachReuploadMetadata(lead);
    res.status(200).json({ success: true, lead: hydratedLead });
  } catch (error) {
    console.error("Error updating document status:", error);
    res.status(500).json({ success: false, message: "Error updating document status" });
  }
};

// PR clicks "Notify Client" on executor-rejected doc — makes it visible to the user
export const notifyClientDocumentRejection = async (req, res) => {
  try {
    const { id, docId } = req.params;

    const lead = await Lead.findById(id);
    if (!lead) return res.status(404).json({ success: false, message: "Lead not found" });

    const isAdmin = normalizeRole(req.user.role) === "admin";
    const isPR = normalizeRole(req.user.role) === "pr";
    const isAssignedPR = lead.prId?.toString() === req.user._id.toString();

    if (!isAdmin && !isPR && !isAssignedPR) {
      return res.status(403).json({ success: false, message: "Only PR can notify client" });
    }

    const doc = lead.documents.id(docId);
    if (!doc) return res.status(404).json({ success: false, message: "Document not found" });

    if (!doc.executorRejected) {
      return res.status(400).json({ success: false, message: "Document is not pending client notification" });
    }

    // Now make the rejection visible to the client
    doc.status = "Rejected";
    doc.prNotifiedClient = true;

    // Set lead to InformationRequired so the client knows to reupload
    lead.status = "InformationRequired";
    lead.prFeedback = `Document rejected: ${doc.name}. ${doc.rejectionMessage ? `Reason: ${doc.rejectionMessage}` : "Please reupload."}`;
    lead.updatedAt = Date.now();
    await lead.save();

    res.status(200).json({ success: true, lead });
  } catch (error) {
    console.error("Error notifying client:", error);
    res.status(500).json({ success: false, message: "Error notifying client" });
  }
};

// PR clicks "Notify Client" for a service-level executor rejection —
// sets prNotifiedClientServiceRejection = true so the rejection becomes
// visible to the user, admin, and appears as "Rejected by Executor" everywhere.
export const notifyClientServiceRejection = async (req, res) => {
  try {
    const { id } = req.params;

    const lead = await Lead.findById(id);
    if (!lead) return res.status(404).json({ success: false, message: "Lead not found" });

    const isAdmin = normalizeRole(req.user.role) === "admin";
    const isPR = normalizeRole(req.user.role) === "pr";

    if (!isAdmin && !isPR) {
      return res.status(403).json({ success: false, message: "Only PR or admin can notify client" });
    }

    if (!lead.executorServiceRejected) {
      return res.status(400).json({ success: false, message: "Service has not been rejected by executor" });
    }

    if (lead.prNotifiedClientServiceRejection) {
      return res.status(400).json({ success: false, message: "Client has already been notified" });
    }

    // Open the gate — user, admin, and other dashboards can now see the rejection
    lead.prNotifiedClientServiceRejection = true;
    // This is a fresh rejection cycle becoming visible to the client — clear any
    // stale confirmation from a prior submission so the Services page correctly
    // shows the rejection/reupload state again instead of masking it.
    lead.initialSubmissionConfirmed = false;
    lead.updatedAt = Date.now();
    await lead.save();

    res.status(200).json({ success: true, lead });
  } catch (error) {
    console.error("Error notifying client of service rejection:", error);
    res.status(500).json({ success: false, message: "Error notifying client" });
  }
};

export const getSignedUrl = async (req, res) => {
  try {
    const { publicId } = req.params;
    const { id } = req.query; // lead id

    if (!publicId) {
      return res.status(400).json({ success: false, message: "Public ID is required" });
    }

    // Authorization check: Ensure the user has access to the lead that contains this document
    if (id) {
      const lead = await Lead.findById(id);
      if (!lead) {
        return res.status(404).json({ success: false, message: "Lead not found" });
      }

      const leadUserId = lead.user?._id || lead.user;
      const isOwner = leadUserId && leadUserId.toString() === req.user._id.toString();
      const isAdmin = normalizeRole(req.user.role) === "admin";
      const isPR = normalizeRole(req.user.role) === "pr";
      const normalizedRole = normalizeRole(req.user.role);
      const isExecutor = normalizedRole === "executor" || /^executor\d+$/.test(normalizedRole);
      const isAssignedPR = lead.prId && lead.prId.toString() === req.user._id.toString();
      const isAssignedExecutor = lead.executorId && lead.executorId.toString() === req.user._id.toString();

      if (!isAdmin && !isOwner && !isPR && !isExecutor && !isAssignedPR && !isAssignedExecutor) {
        return res.status(403).json({ success: false, message: "Not authorized to access this document" });
      }
    } else {
      // If no lead ID provided, only admin/pr can access by publicId alone
      const isAdmin = normalizeRole(req.user.role) === "admin";
      const isPR = normalizeRole(req.user.role) === "pr";
      if (!isAdmin && !isPR) {
        return res.status(403).json({ success: false, message: "Not authorized to access this document" });
      }
    }

    const { cloudinary } = await import("../config/cloudinary.js");

    const buildUrl = (resourceType = "auto") => {
      return cloudinary.url(publicId, {
        sign_url: true,
        type: 'authenticated',
        resource_type: resourceType,
        secure: true,
        expires_at: Math.floor(Date.now() / 1000) + 3600
      });
    };

    // If it's a PDF, we might need resource_type: 'raw'
    // We return a signed URL. Since this is for client-side direct access, 
    // we can't easily try multiple, but 'auto' is usually best.
    // However, if we know it's a PDF, we can prefer 'raw'.
    const signedUrl = buildUrl("auto");

    res.status(200).json({ success: true, url: signedUrl });
  } catch (error) {
    console.error("Error generating signed URL:", error);
    res.status(500).json({ success: false, message: "Error generating signed URL" });
  }
};

// 1. Generate a very short-lived token for document viewing
export const generateViewToken = async (req, res) => {
  try {
    const { publicId } = req.params;
    const { id } = req.query; // lead id
    const resolvedPublicId = String(publicId || "").trim();

    const getDocUrl = (doc) => {
      const url = String(doc?.url || doc?.secure_url || doc?.uploadedUrl || doc?.viewUrl || "").trim();
      return url.replace(/^http:/, "https:"); // Normalize to https for matching
    };

    if (!resolvedPublicId) {
      return res.status(400).json({ success: false, message: "Public ID is required" });
    }

    let matchingDoc = null;

    // Authorization check
    if (id) {
      const lead = await Lead.findById(id);
      if (!lead) return res.status(404).json({ success: false, message: "Lead not found" });

      const leadUserId = lead.user?._id || lead.user;
      const isAdmin = normalizeRole(req.user.role) === "admin";
      const isPR = normalizeRole(req.user.role) === "pr";
      const normalizedRole = normalizeRole(req.user.role);
      const isExecutor = normalizedRole === "executor" || /^executor\d+$/.test(normalizedRole);
      const isOwner = leadUserId && leadUserId.toString() === req.user._id.toString();
      const isAssignedPR = lead.prId && lead.prId.toString() === req.user._id.toString();
      const isAssignedExecutor = lead.executorId && lead.executorId.toString() === req.user._id.toString();

      if (!isAdmin && !isOwner && !isPR && !isExecutor && !isAssignedPR && !isAssignedExecutor) {
        return res.status(403).json({ success: false, message: "Not authorized" });
      }

      matchingDoc = Array.isArray(lead.documents)
        ? lead.documents.find((doc) => {
          if (!doc) return false;
          const docPublicId = String(doc.publicId || "").trim();
          const docUrl = getDocUrl(doc);
          const docName = String(doc.name || "").trim();

          // Exact matches
          if (docPublicId === resolvedPublicId || docUrl === resolvedPublicId || docName === resolvedPublicId) return true;

          // Fuzzy matches for public IDs (ignoring folder/version prefix)
          const getBasename = (str) => String(str).split("/").pop().split(".")[0];
          const candidateBasename = getBasename(resolvedPublicId);
          if (candidateBasename && (getBasename(docPublicId) === candidateBasename || getBasename(docUrl) === candidateBasename)) return true;

          return false;
        })
        : null;
    } else {
      const isAdmin = normalizeRole(req.user.role) === "admin";
      const isPR = normalizeRole(req.user.role) === "pr";
      if (!isAdmin && !isPR) {
        return res.status(403).json({ success: false, message: "Not authorized" });
      }
    }

    const finalDocumentUrl = getDocUrl(matchingDoc) || (resolvedPublicId.startsWith("http") ? resolvedPublicId : "");
    const finalDocumentName = String(matchingDoc?.name || "").trim() || (resolvedPublicId.startsWith("http") ? resolvedPublicId.split("/").pop() : "");
    const { cloudinary } = await import("../config/cloudinary.js");
    const lookupPublicIds = uniqueValues([
      String(matchingDoc?.publicId || "").trim(),
      resolvedPublicId.startsWith("http") ? "" : resolvedPublicId,
      finalDocumentUrl ? parseCloudinaryAssetUrl(finalDocumentUrl)?.publicId : "",
    ]);

    if (lookupPublicIds.length > 0) {
      const asset = await tryCloudinaryResourceLookup(
        cloudinary,
        lookupPublicIds,
        ["image", "raw", "auto", "video"],
        ["authenticated", "upload"],
      );

      if (asset && Number(asset.bytes || 0) === 0) {
        return res.status(422).json({
          success: false,
          message:
            "This document is stored in Cloudinary as an empty file, so it cannot be viewed. Please re-upload it.",
        });
      }
    }

    const token = jwt.sign(
      {
        publicId: resolvedPublicId.startsWith("http") ? "" : resolvedPublicId,
        leadId: id,
        userId: req.user._id,
        documentUrl: finalDocumentUrl,
        documentName: finalDocumentName,
      },
      process.env.JWT_SECRET || "fallback_secret",
      { expiresIn: `${getDocumentLinkLifetimeSeconds()}s` }
    );

    res.json({ success: true, token });
  } catch (error) {
    console.error("Error generating view token:", error);
    res.status(500).json({ success: false, message: "Error generating view token" });
  }
};

// 2. Stream the document from Cloudinary through our backend
export const streamDocument = async (req, res) => {
  try {
    const { token } = req.params;
    if (!token) return res.status(400).send("Token required");

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback_secret");
    } catch (err) {
      return res.status(401).send("Link expired or invalid. Please try viewing the document again from the dashboard.");
    }

    const { publicId, documentUrl, documentName } = decoded;
    const resolvedDocumentUrl = normalizeDocumentUrl(documentUrl);
    const resolvedDocumentName = String(documentName || "").trim();
    const fileExtension = (resolvedDocumentName.split(".").pop() || "").trim().toLowerCase();
    const { cloudinary } = await import("../config/cloudinary.js");
    const parsedDocumentUrl = parseCloudinaryAssetUrl(resolvedDocumentUrl);
    const candidatePublicIds = uniqueValues([
      publicId,
      parsedDocumentUrl?.publicId,
      parsedDocumentUrl?.publicIdWithFormat,
    ]);
    const candidateResourceTypes = uniqueValues([
      parsedDocumentUrl?.resourceType,
      "image",
      "raw",
      "auto",
      "video",
    ]);
    const candidateDeliveryTypes = uniqueValues([
      parsedDocumentUrl?.deliveryType,
      "authenticated",
      "upload",
    ]);
    const candidateFormats = uniqueValues([
      parsedDocumentUrl?.format,
      fileExtension,
    ]);

    const candidates = new Set();
    const addCandidate = (candidate) => {
      const normalizedCandidate = normalizeDocumentUrl(candidate);
      if (normalizedCandidate) {
        candidates.add(normalizedCandidate);
      }
    };

    const addSignedCandidates = (resolvedPublicId) => {
      for (const resourceType of candidateResourceTypes) {
        for (const deliveryType of candidateDeliveryTypes) {
          addCandidate(
            buildCloudinarySignedUrl(cloudinary, resolvedPublicId, {
              resourceType,
              deliveryType,
              expirationSeconds: getDocumentLinkLifetimeSeconds(),
            }),
          );

          for (const format of candidateFormats) {
            addCandidate(
              buildCloudinarySignedUrl(cloudinary, resolvedPublicId, {
                resourceType,
                deliveryType,
                format,
                expirationSeconds: getDocumentLinkLifetimeSeconds(),
              }),
            );
          }
        }
      }
    };

    if (resolvedDocumentUrl) {
      addCandidate(resolvedDocumentUrl);
    }

    for (const resolvedPublicId of candidatePublicIds) {
      addSignedCandidates(resolvedPublicId);
    }

    if (parsedDocumentUrl?.normalizedUrl) {
      addCandidate(parsedDocumentUrl.normalizedUrl);
    }

    const uniqueCandidates = Array.from(candidates).filter(Boolean);

    if (uniqueCandidates.length === 0) {
      return res.status(400).send("Document identifier is missing");
    }

    let response;
    let lastError;

    const attemptCandidates = async (urls) => {
      for (const targetUrl of urls) {
        try {
          console.log(`[Stream] Attempting: ${targetUrl}`);
          const candidateResponse = await axios.get(targetUrl, {
            responseType: "stream",
            timeout: 10000,
            headers: { Accept: "*/*" },
            validateStatus: (status) => status === 200,
          });

          if (candidateResponse) {
            console.log(
              `[Stream] Success with candidate: ${targetUrl.slice(0, 80)}...`,
            );
            return candidateResponse;
          }
        } catch (fetchError) {
          lastError = fetchError;
          console.error(
            `[Stream] Candidate failed (${fetchError.response?.status || "Error"}): ${targetUrl}`,
          );
        }
      }

      return null;
    };

    response = await attemptCandidates(uniqueCandidates);

    if (!response && publicId) {
      console.log(
        `[Stream] Fast candidates failed. Querying Cloudinary API for exact asset details: ${publicId}`,
      );
      try {
        const asset = await tryCloudinaryResourceLookup(
          cloudinary,
          candidatePublicIds.length > 0 ? candidatePublicIds : [publicId],
          candidateResourceTypes,
          candidateDeliveryTypes,
        );

        if (asset) {
          const exactCandidates = [
            asset.secure_url,
            asset.url,
            buildCloudinarySignedUrl(cloudinary, asset.public_id, {
              resourceType: asset.resource_type,
              deliveryType: asset.type,
              format: asset.format,
              expirationSeconds: getDocumentLinkLifetimeSeconds(),
            }),
            buildCloudinarySignedUrl(cloudinary, asset.public_id, {
              resourceType: asset.resource_type,
              deliveryType: asset.type,
              expirationSeconds: getDocumentLinkLifetimeSeconds(),
            }),
          ];

          if (asset.public_id && asset.public_id !== publicId) {
            exactCandidates.push(
              buildCloudinarySignedUrl(cloudinary, asset.public_id, {
                resourceType: asset.resource_type,
                deliveryType: asset.type,
                format: asset.format,
                expirationSeconds: getDocumentLinkLifetimeSeconds(),
              }),
            );
          }

          console.log(`[Stream] Attempting exact Cloudinary asset candidates`);
          response = await attemptCandidates(exactCandidates.filter(Boolean));
        }
      } catch (apiError) {
        console.error(`[Stream] Cloudinary API fallback failed: ${apiError.message}`);
      }
    }

    if (!response) {
      throw lastError || new Error("All streaming candidates and API fallback failed");
    }
    const fallbackName = String(documentName || publicId || "document").split("/").pop();

    res.setHeader("Cache-Control", "no-store, private, max-age=0");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Content-Type", response.headers["content-type"] || "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${fallbackName}"`);

    response.data.pipe(res);
  } catch (error) {
    console.error("Streaming error:", error.message);
    res.status(500).send("Error retrieving document");
  }
};
