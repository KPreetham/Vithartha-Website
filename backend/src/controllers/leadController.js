import Lead from "../models/Lead.js";
import { resolveLeadCost } from "../utils/servicePricing.js";

export const createLead = async (req, res) => {
  try {
    const { user, name, email, serviceName, cost, documents } = req.body;
    console.log(
      `[LeadController] Creating lead for ${email}. Documents:`,
      documents?.length || 0,
    );

    const newLead = new Lead({
      user: user || null,
      name,
      email,
      serviceName,
      cost: resolveLeadCost({ serviceName, cost }),
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

    if (req.user.role === "admin") {
      // Admin sees everything unless filtered
      const { userId, prId, executorId } = req.query;
      if (userId) query.user = userId;
      if (prId) query.prId = prId;
      if (executorId) query.executorId = executorId;
    } else if (req.user.role === "PR") {
      // PR sees leads assigned to them or unassigned leads they need to pick up
      query = {
        $or: [{ prId: req.user._id }, { prId: { $exists: false } }, { prId: null }],
      };
    } else if (req.user.role === "executor") {
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

    const leads = await Lead.find(query)
      .populate("user", "name email profile")
      .populate("prId", "name email")
      .populate("executorId", "name email")
      .sort({ createdAt: -1 });
    res.status(200).json(leads);
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

    res.status(200).json(lead);
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
    const isPR = req.user.role === 'PR';
    const isExecutor = req.user.role === 'executor';
    const isAdmin = req.user.role === 'admin';

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

    const updateData = { ...req.body, updatedAt: Date.now() };

    if (
      updateData.status === "AssignedToExecutor" ||
      updateData.status === "DraftSent" ||
      updateData.status === "Completed" ||
      updateData.status === "PendingReview"
    ) {
      const pushedDocuments = req.body?.$push?.documents;
      const currentDocuments = Array.isArray(lead.documents)
        ? lead.documents
        : [];
      const incomingDocuments = pushedDocuments?.$each
        ? pushedDocuments.$each
        : pushedDocuments
          ? [pushedDocuments]
          : [];
      const reuploadedDocumentNames = Array.isArray(
        req.body?.reuploadedDocumentNames,
      )
        ? req.body.reuploadedDocumentNames
        : [];
      const normalizedReuploads = new Set(
        reuploadedDocumentNames.map((name) => String(name || "").trim()),
      );

      const preservedDocuments = normalizedReuploads.size
        ? currentDocuments.filter((doc) => {
            const docName = String(doc?.name || "").trim();
            return !(
              doc?.status === "Rejected" && normalizedReuploads.has(docName)
            );
          })
        : currentDocuments;

      const taggedIncomingDocuments = incomingDocuments.map((doc) => {
        const docName = String(doc?.name || "").trim();
        return {
          ...doc,
          reuploaded: normalizedReuploads.has(docName),
        };
      });

      const allDocuments = [...preservedDocuments, ...taggedIncomingDocuments];

      if (normalizedReuploads.size > 0) {
        updateData.documents = allDocuments;
        delete updateData.$push;
      }

      if (updateData.status === "DraftSent") {
        const hasDraft = allDocuments.some((doc) => doc?.type === "Draft");
        if (!hasDraft) {
          return res.status(400).json({
            success: false,
            message: "Draft must be uploaded before sending it to user.",
          });
        }
      }

      if (updateData.status === "Completed") {
        const hasFinal = allDocuments.some((doc) => doc?.type === "Final");
        if (!hasFinal) {
          return res.status(400).json({
            success: false,
            message: "Final return must be uploaded before completing service.",
          });
        }
      }
    }

    let updatedLead;
    updatedLead = await Lead.findByIdAndUpdate(id, updateData, { new: true });

    res.status(200).json({ success: true, lead: updatedLead });
  } catch (error) {
    console.error("Error updating lead:", error);
    res.status(500).json({ success: false, message: "Error updating lead" });
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
    const isAdmin = req.user.role === "admin";
    const isPR = req.user.role === "PR";
    const isExecutor = req.user.role === "executor";
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

    await Lead.findByIdAndDelete(id);

    res.status(200).json({ success: true, message: "Lead deleted" });
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
    const isAdmin = req.user.role === "admin";
    const isPR = req.user.role === "PR";

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
