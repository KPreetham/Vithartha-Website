import express from "express";
import {
  createLead,
  getLeads,
  getLeadById,
  updateLead,
  updateDocumentStatus,
} from "../controllers/leadController.js";
import { protect } from "../middleware/authMiddleware.js";

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

const uploadSingleFile = (req, res, next) => {
  upload.single("file")(req, res, (error) => {
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

router.post("/upload", protect, uploadSingleFile, async (req, res) => {
  try {
    if (!req.file) {
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

    const baseName =
      sanitizePart(
        req.file.originalname.split(".").slice(0, -1).join(".") || "document",
      ) || "document";
    const publicId = `${Date.now()}-${baseName}`;

    const result = await uploadToCloudinary(req.file.buffer, {
      folder: `vithartha_documents/${userFolder}`,
      resource_type: "auto",
      public_id: publicId,
    });

    const url = result?.secure_url || result?.url;
    return res.status(200).json({
      success: true,
      url,
      filename: result?.public_id || publicId,
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
router.patch("/:leadId/documents/:docId", protect, updateDocumentStatus);

export default router;
