import mongoose from "mongoose";

const leadSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
  name: { type: String, required: true },
  email: { type: String, required: true },
  serviceName: { type: String, required: true },
  cost: { type: Number, default: 1000 },
  status: {
    type: String,
    enum: [
      "Open",
      "InProgress",
      "DraftSent",
      "UserAccepted",
      "Completed",
      "Closed",
      "Rejected",
    ],
    default: "Open",
  },
  notes: [String],
  documents: [
    {
      name: String,
      url: String,
      type: {
        type: String,
        enum: ["UserUpload", "Draft", "Final"],
        default: "UserUpload",
      },
      status: {
        type: String,
        enum: ["Pending", "Accepted", "Rejected"],
        default: "Pending",
      },
      uploadedAt: { type: Date, default: Date.now },
    },
  ],
  adminMessage: { type: String, default: "" },
  userMessage: { type: String, default: "" },
  updatedAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Lead", leadSchema);
