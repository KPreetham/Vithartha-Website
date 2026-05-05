import mongoose from "mongoose";

const reuploadedDocumentSchema = new mongoose.Schema(
  {
    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lead",
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
      index: true,
    },
    serviceName: { type: String, required: true },
    documentName: { type: String, required: true },
    normalizedDocumentName: { type: String, required: true, index: true },
    url: { type: String, default: "" },
    publicId: { type: String, default: "" },
    sourceRole: { type: String, default: "" },
    sourceLeadStatus: { type: String, default: "" },
    sourceDocumentStatus: { type: String, default: "" },
    reuploadedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

reuploadedDocumentSchema.index(
  { lead: 1, normalizedDocumentName: 1 },
  { unique: true },
);

export default mongoose.model("ReuploadedDocument", reuploadedDocumentSchema);
