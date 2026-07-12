import mongoose from "mongoose";

const serviceSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  aboutInfo: { type: String, default: "" },
  icon: { type: String, default: "FileText" },
  trigger: { type: String, required: false },
  tags: [String],
  documentsRequired: [String],
  marketFees: { type: String, default: "" },
  recommendedFees: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Service", serviceSchema);
