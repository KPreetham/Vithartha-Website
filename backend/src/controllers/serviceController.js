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

export const createService = async (req, res) => {
  try {
    const { title, description, category, marketFees, recommendedFees, workingDays, documentsRequired } = req.body;

    if (!title || !description || !category) {
      return res
        .status(400)
        .json({ success: false, message: "Title, description, and category are required" });
    }

    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + Date.now();

    const service = await Service.create({
      id: slug,
      title,
      description,
      category,
      marketFees: marketFees || "",
      recommendedFees: recommendedFees || "",
      workingDays: workingDays || 2,
      documentsRequired: deduplicateDocs(documentsRequired),
    });

    res.status(201).json({ success: true, service });
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
    const workingDaysRaw = req.body?.workingDays;
    const workingDays = Number.isFinite(Number(workingDaysRaw)) && Number(workingDaysRaw) > 0
      ? Math.round(Number(workingDaysRaw))
      : undefined;

    const updateData = { ...req.body };
    delete updateData._id;
    delete updateData.id;
    delete updateData.__v;
    delete updateData.createdAt;

    if (workingDays !== undefined) {
      updateData.workingDays = workingDays;
    }
    if (Array.isArray(updateData.documentsRequired)) {
      updateData.documentsRequired = deduplicateDocs(updateData.documentsRequired);
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

    // Propagate fee and working-days changes to all matching leads immediately
    const leadUpdate = {};
    if (service.recommendedFees != null) {
      leadUpdate.recommendedFees = service.recommendedFees;
      leadUpdate.ourFee = service.recommendedFees;
      const parsed = parseFeeAmount(service.recommendedFees);
      if (parsed != null && parsed > 0) leadUpdate.recommendedFeeAmount = parsed;
    }
    if (service.marketFees != null) leadUpdate.marketFees = service.marketFees;
    if (service.workingDays != null) leadUpdate.workingDays = service.workingDays;

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
    const { marketFees = "", recommendedFees = "", workingDays } = req.body || {};
    const normalizeFee = (value) => {
      const raw = String(value || "").trim();
      if (!raw) return "";
      return /^rs\.?\s*/i.test(raw)
        ? raw.replace(/^rs\.?\s*/i, "Rs. ").trim()
        : `Rs. ${raw}`;
    };
    const normalizeDays = (value) => {
      const parsed = Number(value);
      return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : undefined;
    };
    const nextMarketFee = normalizeFee(marketFees);
    const nextRecommendedFee = normalizeFee(recommendedFees);
    const nextWorkingDays = normalizeDays(workingDays);

    const service = await Service.findByIdAndUpdate(
      id,
      {
        $set: {
          marketFees: nextMarketFee,
          recommendedFees: nextRecommendedFee,
          ...(nextWorkingDays !== undefined ? { workingDays: nextWorkingDays } : {}),
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
