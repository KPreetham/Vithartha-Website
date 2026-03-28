import mongoose from "mongoose";

const serviceSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  icon: { type: String, default: "FileText" },
  category: {
    type: String,
    enum: ["Compliance", "Finance", "Legal", "Advisory", "Tax"],
    required: true,
  },
  trigger: { type: String, required: false },
  tags: [String],
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Service", serviceSchema);
