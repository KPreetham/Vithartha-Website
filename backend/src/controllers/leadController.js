import Lead from "../models/Lead.js";
import ReuploadedDocument from "../models/ReuploadedDocument.js";
import Service from "../models/Service.js";
import { parseFeeAmount, resolveLeadCost } from "../utils/servicePricing.js";
import jwt from "jsonwebtoken";
import axios from "axios";

const escapeRegExp = (value) =>
  String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const normalizeRole = (role) => String(role || "").trim().toLowerCase();
const normalizeDocumentName = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

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
      // PR should see all user services so newly submitted requests are always visible.
      query = {};
    } else if (userRole === "executor") {
      // Executor sees leads assigned to them OR unassigned leads waiting for approval
      query = {
        $or: [
          { executorId: req.user._id },
          { 
            status: { $in: ["PR_Accepted", "AssignedToExecutor"] }, 
            $or: [{ executorId: { $exists: false } }, { executorId: null }] 
          }
        ]
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
    const hydratedLeads = await attachReuploadMetadata(leads);
    res.status(200).json(hydratedLeads);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const assignLead = async (req, res) => {
  try {
    const { id } = req.params;
    const { prId, executorId, status } = req.body;

    const lead = await Lead.findById(id);
    if (!lead) return res.status(404).json({ message: "Lead not found" });

    if (prId) lead.prId = prId;
    if (executorId) lead.executorId = executorId;
    if (status) lead.status = status;

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
    res.status(200).json(hydratedLead);
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
    const isExecutor = normalizeRole(req.user.role) === 'executor';
    const isAdmin = normalizeRole(req.user.role) === 'admin';

    // PR can update if assigned or if the lead is not yet picked up by any PR
    const canPRUpdate = isPR && (!lead.prId || lead.prId.toString() === req.user._id.toString());
    // Executor can update if assigned
    const canExecutorUpdate = isExecutor && (!lead.executorId || lead.executorId.toString() === req.user._id.toString());

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

    const pushedDocuments = req.body?.$push?.documents;
    const hasIncomingDocuments = !!pushedDocuments;
    const reuploadedDocumentNames = Array.isArray(req.body?.reuploadedDocumentNames)
      ? req.body.reuploadedDocumentNames
      : [];
    
    const normalizedReuploads = new Set(
      reuploadedDocumentNames
        .map((name) => normalizeDocumentName(name))
        .filter(Boolean)
    );

    let inferredReuploads = new Set(normalizedReuploads);

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

      const currentDocumentNames = new Set(
        currentDocuments
          .map((doc) => normalizeDocumentName(doc?.name))
          .filter(Boolean)
      );

      // Identify which incoming documents are actually reuploads
      for (const doc of incomingDocsRaw) {
        const incomingName = normalizeDocumentName(doc?.name);
        const markedReupload =
          String(doc?.status || "").trim().toLowerCase() === "reuploaded" ||
          !!doc?.reuploaded;
        // A document is a reupload if it's explicitly marked OR it replaces an existing document
        if (incomingName && (currentDocumentNames.has(incomingName) || markedReupload)) {
          inferredReuploads.add(incomingName);
        }
      }

      // If we are reuploading, we need to replace existing versions of those documents
      if (inferredReuploads.size > 0) {
        const preservedDocuments = currentDocuments.filter((doc) => {
          const docName = normalizeDocumentName(doc?.name);
          return !inferredReuploads.has(docName);
        });

        const taggedIncomingDocuments = incomingDocsRaw.map((doc) => {
          const docName = normalizeDocumentName(doc?.name);
          const isReupload = inferredReuploads.has(docName);
          return {
            ...doc,
            name: doc?.name || "",
            reuploaded: isReupload,
            status: isReupload ? "Pending" : (doc?.status || "Pending"),
          };
        });

        const allDocuments = [...preservedDocuments, ...taggedIncomingDocuments];
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
          
          if (stillRejectedDocs.length > 0) {
            updateData.status = "Rejected";
          } else {
            updateData.status = "PendingReview";
            // Clear previous rejection messages when moving back to review
            updateData.executorMessage = "";
            updateData.prFeedback = "";
          }
        }
      }
      
      // Final validation for specific status transitions
      const finalDocs = updateData.documents || currentDocuments;
      
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
      }
    }

    // Perform the update
    const updatedLead = await Lead.findByIdAndUpdate(id, updateData, { new: true });

    if (!updatedLead) {
        return res.status(404).json({ success: false, message: "Lead not found after update" });
    }

    // Persist to ReuploadedDocuments table for history/tracking
    if (inferredReuploads.size > 0) {
      // Re-calculate incoming docs to store (only those that were reuploaded)
      const currentFinalDocs = Array.isArray(updatedLead.documents) ? updatedLead.documents : [];
      const docsToPersist = currentFinalDocs.filter(d => inferredReuploads.has(normalizeDocumentName(d.name)));

      await persistReuploadedDocuments({
        lead: updatedLead,
        incomingDocuments: docsToPersist,
        reuploadedNames: Array.from(inferredReuploads),
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
    const isExecutor = normalizeRole(req.user.role) === "executor";
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

    // Check if user is authorized to update status on this lead (Admin or Assigned PR or Client Owner)
    const isOwner = lead.user?.toString() === req.user._id.toString();
    const isAssignedPR = lead.prId?.toString() === req.user._id.toString();
    const isAdmin = normalizeRole(req.user.role) === "admin";
    const isPR = normalizeRole(req.user.role) === "pr";

    if (!isAdmin && !isOwner && !isAssignedPR && !isPR) {
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

    doc.status = status;
    doc.rejectionMessage =
      status === "Rejected" ? String(rejectionMessage || "").trim() : "";
    lead.updatedAt = Date.now();
    await lead.save();

    res.status(200).json({ success: true, lead });
  } catch (error) {
    console.error("Error updating document status:", error);
    res
      .status(500)
      .json({ success: false, message: "Error updating document status" });
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
        const isExecutor = normalizeRole(req.user.role) === "executor";
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
    
    // Generate a signed URL that expires in 1 hour
    const signedUrl = cloudinary.url(publicId, {
      sign_url: true,
      type: 'authenticated',
      resource_type: 'auto',
      secure: true,
      expires_at: Math.floor(Date.now() / 1000) + 3600 
    });

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

    if (!resolvedPublicId) {
      return res.status(400).json({ success: false, message: "Public ID is required" });
    }

    // Authorization check (same logic as getSignedUrl)
    if (id) {
      const lead = await Lead.findById(id);
      if (!lead) return res.status(404).json({ success: false, message: "Lead not found" });

      const leadUserId = lead.user?._id || lead.user;
      const isOwner = leadUserId && leadUserId.toString() === req.user._id.toString();
      const isAdmin = normalizeRole(req.user.role) === "admin";
      const isPR = normalizeRole(req.user.role) === "pr";
      const isExecutor = normalizeRole(req.user.role) === "executor";
      const isAssignedPR = lead.prId && lead.prId.toString() === req.user._id.toString();
      const isAssignedExecutor = lead.executorId && lead.executorId.toString() === req.user._id.toString();

      if (!isAdmin && !isOwner && !isPR && !isExecutor && !isAssignedPR && !isAssignedExecutor) {
        return res.status(403).json({ success: false, message: "Not authorized" });
      }

      const matchingDoc = Array.isArray(lead.documents)
        ? lead.documents.find((doc) => {
            if (!doc) return false;
            const docPublicId = String(doc.publicId || "").trim();
            const docUrl = String(doc.url || "").trim();
            const docName = String(doc.name || "").trim();
            return (
              docPublicId === resolvedPublicId ||
              docUrl === resolvedPublicId ||
              docName === resolvedPublicId
            );
          })
        : null;

      return res.json({
        success: true,
        token: jwt.sign(
          {
            publicId: resolvedPublicId,
            leadId: id,
            userId: req.user._id,
            documentUrl: matchingDoc?.url || "",
          },
          process.env.JWT_SECRET || "fallback_secret",
          { expiresIn: "10s" },
        ),
      });
    } else {
      const isAdmin = normalizeRole(req.user.role) === "admin";
      const isPR = normalizeRole(req.user.role) === "pr";
      if (!isAdmin && !isPR) return res.status(403).json({ success: false, message: "Not authorized" });
    }

    // Create a one-time use token valid for 10 seconds
    const tokenPayload = { publicId: resolvedPublicId, leadId: id, userId: req.user._id };
    if (id) {
      const lead = await Lead.findById(id);
      const matchingDoc = Array.isArray(lead?.documents)
        ? lead.documents.find((doc) => {
            if (!doc) return false;
            const docPublicId = String(doc.publicId || "").trim();
            const docUrl = String(doc.url || "").trim();
            const docName = String(doc.name || "").trim();
            return (
              docPublicId === resolvedPublicId ||
              docUrl === resolvedPublicId ||
              docName === resolvedPublicId
            );
          })
        : null;

      tokenPayload.documentUrl = matchingDoc?.url || "";
      tokenPayload.documentName = matchingDoc?.name || "";
    }

    const token = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET || "fallback_secret",
      { expiresIn: "5s" }
    );

    res.json({ success: true, token });
  } catch (error) {
    console.error("Error generating view token:", error);
    res.status(500).json({ success: false, message: "Server error" });
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
    const targetUrl = String(documentUrl || "").trim();

    if (!targetUrl) {
      return res.status(400).send("Document URL is missing");
    }

    const response = await axios.get(targetUrl, { responseType: "stream" });
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
