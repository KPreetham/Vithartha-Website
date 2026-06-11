import express from "express";
import {
  createLead,
  getLeads,
  getLeadById,
  updateLead,
  deleteLead,
  updateDocumentStatus,
  notifyClientDocumentRejection,
  notifyClientServiceRejection,
  assignLead,
  updatePrFeedback,
  getSignedUrl,
  generateViewToken,
  streamDocument,
} from "../controllers/leadController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

import multer from "multer";
import { Readable } from "stream";
import { cloudinary } from "../config/cloudinary.js";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      const fileTypeError = new Error(
        "Unsupported file type. Allowed: PDF, JPG, PNG, DOC, DOCX",
      );
      fileTypeError.statusCode = 400;
      return cb(fileTypeError);
    }
    cb(null, true);
  },
});

const sanitizePart = (value) =>
  (value || "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);

const uploadFiles = (req, res, next) => {
  upload.any()(req, res, (error) => {
    if (!error) return next();

    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        return res
          .status(400)
          .json({
            success: false,
            message: "File is too large. Maximum size is 10MB.",
          });
      }
      return res
        .status(400)
        .json({
          success: false,
          message: error.message || "Invalid upload request.",
        });
    }

    return res
      .status(error.statusCode || 500)
      .json({ success: false, message: error.message || "Upload failed." });
  });
};

const uploadToCloudinary = (buffer, options) =>
  new Promise((resolve, reject) => {
    const cloudinaryStream = cloudinary.uploader.upload_stream(
      options,
      (error, result) => {
        if (error) return reject(error);
        return resolve(result);
      },
    );

    Readable.from(buffer).pipe(cloudinaryStream);
  });

const router = express.Router();

router.post("/upload", protect, uploadFiles, async (req, res) => {
  try {
    const files = Array.isArray(req.files) ? req.files : [];

    if (files.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No file uploaded" });
    }

    if (
      !process.env.CLOUDINARY_CLOUD_NAME ||
      !process.env.CLOUDINARY_API_KEY ||
      !process.env.CLOUDINARY_API_SECRET
    ) {
      return res.status(500).json({
        success: false,
        message:
          "Server upload configuration is missing. Please set Cloudinary environment variables.",
      });
    }

    const userFolder =
      req.user?.role === "admin"
        ? "admin_uploads"
        : sanitizePart(req.user?.email) || "vithartha_general";

    const uploadedFiles = await Promise.all(
      files.map(async (file, index) => {
        const baseName =
          sanitizePart(
            file.originalname.split(".").slice(0, -1).join(".") || "document",
          ) || `document_${index + 1}`;
        const publicId = `${Date.now()}-${index + 1}-${baseName}`;

        const result = await uploadToCloudinary(file.buffer, {
          folder: `vithartha_documents/${userFolder}`,
          resource_type: "auto",
          public_id: publicId,
          type: 'authenticated'
        });

        if (!result || Number(result.bytes || 0) <= 0) {
          throw new Error(
            `Cloudinary returned an empty file for ${file.originalname}. Please upload the document again.`,
          );
        }

        return {
          url: result?.secure_url || result?.url,
          filename: result?.public_id || publicId,
          originalName: file.originalname,
        };
      }),
    );

    const firstFile = uploadedFiles[0] || {};
    return res.status(200).json({
      success: true,
      url: firstFile.url,
      filename: firstFile.filename,
      files: uploadedFiles,
    });
  } catch (error) {
    console.error("Cloudinary upload failed:", error?.message || error);
    return res.status(500).json({
      success: false,
      message: "Document upload failed. Please try again.",
      detail:
        process.env.NODE_ENV === "production" ? undefined : error?.message,
    });
  }
});

router.post("/", protect, createLead);
router.get("/", protect, getLeads);
router.get("/:id", protect, getLeadById);
router.patch("/:id", protect, updateLead);
router.delete("/:id", protect, deleteLead);
router.patch("/:id/assign", protect, assignLead);
router.patch("/:id/pr-feedback", protect, updatePrFeedback);

router.get("/signed-url/:publicId", protect, getSignedUrl);
router.get(/^\/view-token\/(.+)/, protect, (req, res) => {
  req.params.publicId = req.params[0];
  return generateViewToken(req, res);
});
router.get("/stream/:token", streamDocument); // Guarded by token in controller

// Update individual document status
router.patch(
  "/:id/documents/:docId/status",
  protect,
  authorize("PR", "admin", "executor", "executorN"),
  updateDocumentStatus
);

// PR notifies client of executor-rejected document (makes it visible to user)
router.patch(
  "/:id/documents/:docId/notify-client",
  protect,
  authorize("PR", "admin"),
  notifyClientDocumentRejection
);

// PR notifies client of executor-rejected entire service (makes it visible to user/admin)
router.patch(
  "/:id/notify-client-service-rejection",
  protect,
  authorize("PR", "admin"),
  notifyClientServiceRejection
);

export default router;
