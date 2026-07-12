import Service from "../models/Service.js";
import Lead from "../models/Lead.js";
import { parseFeeAmount } from "../utils/servicePricing.js";

// Canonicalize common PAN / Aadhaar spelling variants so duplicates using
// different casings or spellings collapse to a single canonical name.
const canonicalDocName = (raw) => {
  const s = String(raw || "").trim();
  const lower = s.toLowerCase();
  if (/^pan\b/.test(lower)) return "PAN Card";
  if (/^(aadhar|aadhaar|adhar|adhaar)\b/.test(lower)) return "Aadhaar Card";
  return s;
};

// Return a deduplicated list: first occurrence of each case-insensitive name wins.
const deduplicateDocs = (docs) => {
  if (!Array.isArray(docs)) return [];
  const seen = new Set();
  return docs
    .map(canonicalDocName)
    .filter((name) => {
      if (!name) return false;
      const key = name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

// Like deduplicateDocs but does NOT canonicalize names (e.g. forcing any
// "PAN ..." name back to "PAN Card"). Used on generic updates (renames,
// deletes) where the admin's exact typed name must be preserved — only
// exact case-insensitive duplicates are collapsed.
const dedupeDocsPreservingNames = (docs) => {
  if (!Array.isArray(docs)) return [];
  const seen = new Set();
  return docs
    .map((d) => String(d || "").trim())
    .filter((name) => {
      if (!name) return false;
      const key = name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

export const createService = async (req, res) => {
  try {
    const { title, description, aboutInfo, marketFees, recommendedFees, documentsRequired } = req.body;

    if (!title || !description || !aboutInfo) {
      return res
        .status(400)
        .json({ success: false, message: "Title, description, and about the service are required" });
    }

    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + Date.now();

    const service = await Service.create({
      id: slug,
      title,
      description,
      aboutInfo,
      marketFees: marketFees || "",
      recommendedFees: recommendedFees || "",
      documentsRequired: deduplicateDocs(documentsRequired),
    });

    res.status(201).json({ success: true, service });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const bulkImportServices = async (req, res) => {
  try {
    const services = Array.isArray(req.body) ? req.body : req.body?.services;

    if (!Array.isArray(services) || services.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Request body must be a non-empty array of services",
      });
    }

    const docs = [];
    const rejected = [];

    services.forEach((raw, index) => {
      const title = String(raw?.title || "").trim();
      const description = String(raw?.description || "").trim();

      if (!title || !description) {
        rejected.push({
          index,
          title: title || undefined,
          reason: "Missing required field: title and description are required",
        });
        return;
      }

      const slug =
        String(raw?.id || "").trim() ||
        `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${Date.now()}-${index}`;

      docs.push({
        id: slug,
        title,
        description,
        aboutInfo: raw?.aboutInfo || "",
        icon: raw?.icon || "FileText",
        trigger: raw?.trigger || undefined,
        tags: Array.isArray(raw?.tags) ? raw.tags : [],
        documentsRequired: deduplicateDocs(raw?.documentsRequired),
        marketFees: raw?.marketFees || "",
        recommendedFees: raw?.recommendedFees || "",
      });
    });

    if (docs.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid services to import",
        rejected,
      });
    }

    let inserted = [];
    const failed = [...rejected];

    try {
      inserted = await Service.insertMany(docs, { ordered: false });
    } catch (bulkError) {
      inserted = bulkError.insertedDocs || [];
      const writeErrors = bulkError.writeErrors || [];
      writeErrors.forEach((writeError) => {
        const docIndex = writeError.index;
        failed.push({
          index: docIndex,
          title: docs[docIndex]?.title,
          reason: writeError.errmsg || "Insert failed (possibly a duplicate id)",
        });
      });
    }

    res.status(201).json({
      success: true,
      insertedCount: inserted.length,
      failedCount: failed.length,
      services: inserted,
      failed,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getServices = async (req, res) => {
  try {
    const services = await Service.find({}).sort({ title: 1 });
    res.status(200).json(services);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getServiceById = async (req, res) => {
  try {
    const service = await Service.findOne({ id: req.params.id });
    if (!service)
      return res
        .status(404)
        .json({ success: false, message: "Service not found" });
    res.status(200).json(service);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateService = async (req, res) => {
  try {
    const { id } = req.params;

    const updateData = { ...req.body };
    delete updateData._id;
    delete updateData.id;
    delete updateData.__v;
    delete updateData.createdAt;

    if (Array.isArray(updateData.documentsRequired)) {
      updateData.documentsRequired = dedupeDocsPreservingNames(updateData.documentsRequired);
    }
    updateData.updatedAt = Date.now();

    const service = await Service.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!service) {
      return res
        .status(404)
        .json({ success: false, message: "Service not found" });
    }

    // Propagate fee changes to all matching leads immediately
    const leadUpdate = {};
    if (service.recommendedFees != null) {
      leadUpdate.recommendedFees = service.recommendedFees;
      leadUpdate.ourFee = service.recommendedFees;
      const parsed = parseFeeAmount(service.recommendedFees);
      if (parsed != null && parsed > 0) leadUpdate.recommendedFeeAmount = parsed;
    }
    if (service.marketFees != null) leadUpdate.marketFees = service.marketFees;

    if (Object.keys(leadUpdate).length > 0) {
      await Lead.updateMany(
        { serviceName: new RegExp(`^${service.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
        { $set: leadUpdate }
      );
    }

    res.status(200).json({ success: true, service });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteService = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || id === "undefined" || id === "null") {
      return res
        .status(400)
        .json({ success: false, message: "Invalid service id" });
    }
    const service = await Service.findByIdAndDelete(id);

    if (!service) {
      return res
        .status(404)
        .json({ success: false, message: "Service not found" });
    }

    const serviceTitle = String(service.title || "").trim();
    let deletedLeadsCount = 0;
    if (serviceTitle) {
      const escapedTitle = serviceTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const leadDeleteResult = await Lead.deleteMany({
        serviceName: { $regex: `^${escapedTitle}$`, $options: "i" },
      });
      deletedLeadsCount = leadDeleteResult.deletedCount || 0;
    }

    res.status(200).json({
      success: true,
      message: "Service deleted successfully",
      deletedLeadsCount,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const addDocumentToService = async (req, res) => {
  try {
    const { id } = req.params;
    const { documentName, markAsAdminAdded = true } = req.body || {};
    const trimmedName = canonicalDocName(String(documentName || "").trim());

    if (!id || id === "undefined" || id === "null") {
      return res
        .status(400)
        .json({ success: false, message: "Invalid service id" });
    }
    if (!trimmedName) {
      return res
        .status(400)
        .json({ success: false, message: "Document name is required" });
    }

    const service = await Service.findById(id);
    if (!service) {
      return res
        .status(404)
        .json({ success: false, message: "Service not found" });
    }

    const storedDocs = Array.isArray(service.documentsRequired)
      ? service.documentsRequired
      : [];
    // Check both exact and canonical match so PAN/Aadhaar variants are caught
    const normalizedStored = storedDocs.map((d) => canonicalDocName(String(d || "").trim()).toLowerCase());
    if (normalizedStored.includes(trimmedName.toLowerCase())) {
      return res
        .status(409)
        .json({ success: false, message: "This document is already added" });
    }

    const nextDocumentsRequired = deduplicateDocs([...storedDocs, trimmedName]);
    const updatedService = await Service.findByIdAndUpdate(
      id,
      {
        $set: {
          documentsRequired: nextDocumentsRequired,
          updatedAt: Date.now(),
        },
      },
      { new: true, runValidators: true },
    );

    const serviceTitle = String(updatedService.title || "").trim();
    let updatedLeadsCount = 0;
    if (serviceTitle) {
      const escapedTitle = serviceTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const leadFilter = {
        serviceName: { $regex: `^${escapedTitle}$`, $options: "i" },
      };
      const placeholderDoc = {
        name: trimmedName,
        url: "",
        publicId: "",
        reuploaded: false,
        rejectionMessage: "",
        type: "Client",
        status: "Pending",
        adminAdded: !!markAsAdminAdded,
        uploadedAt: new Date(),
      };
      const leadUpdateResult = await Lead.updateMany(leadFilter, {
        $push: { documents: placeholderDoc },
        $set: { updatedAt: Date.now() },
      });
      updatedLeadsCount = leadUpdateResult.modifiedCount || 0;
    }

    res.status(200).json({
      success: true,
      message: "Document added and propagated to existing leads",
      service: updatedService,
      updatedLeadsCount,
      addedDocument: trimmedName,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: error.message });
  }
};

export const updateServiceFeesForAllLeads = async (req, res) => {
  try {
    const { id } = req.params;
    const { marketFees = "", recommendedFees = "" } = req.body || {};
    const normalizeFee = (value) => {
      const raw = String(value || "").trim();
      if (!raw) return "";
      return /^rs\.?\s*/i.test(raw)
        ? raw.replace(/^rs\.?\s*/i, "Rs. ").trim()
        : `Rs. ${raw}`;
    };
    const nextMarketFee = normalizeFee(marketFees);
    const nextRecommendedFee = normalizeFee(recommendedFees);

    const service = await Service.findByIdAndUpdate(
      id,
      {
        $set: {
          marketFees: nextMarketFee,
          recommendedFees: nextRecommendedFee,
        },
      },
      {
        new: true,
        runValidators: true,
      },
    );
    if (!service) {
      return res.status(404).json({ success: false, message: "Service not found" });
    }

    const escapedTitle = String(service.title || "")
      .trim()
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const leadFilter = escapedTitle
      ? {
          serviceName: { $regex: `^${escapedTitle}$`, $options: "i" },
        }
      : { _id: null };

    const leadUpdateResult = await Lead.updateMany(leadFilter, {
      $set: {
        recommendedFees: nextRecommendedFee || nextMarketFee,
        updatedAt: Date.now(),
      },
    });

    res.status(200).json({
      success: true,
      service,
      updatedLeadsCount: leadUpdateResult.modifiedCount || 0,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
