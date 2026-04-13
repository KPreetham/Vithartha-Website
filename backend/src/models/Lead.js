import mongoose from "mongoose";

const leadSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
  name: { type: String, required: true },
  email: { type: String, required: true },
  serviceName: { type: String, required: true },
  cost: { type: Number, default: 0 },
  status: {
    type: String,
    enum: [
      "Open",
      "PendingReview",
      "InformationRequired",
      "PR_Accepted",
      "AssignedToExecutor",
      "InProgress",
      "ExecutionFinished",
      "DraftSent",
      "DraftAccepted",
      "DraftRejected",
      "Completed",
      "Closed",
      "Rejected",
    ],
    default: "Open",
  },
  prId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  executorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  prFeedback: { type: String, default: "" },
  notes: [String],
  documents: [
    {
      name: String,
      url: String,
      reuploaded: { type: Boolean, default: false },
      rejectionMessage: { type: String, default: "" },
      type: {
        type: String,
        enum: ["UserUpload", "Client", "Draft", "Final", "ExecutionResult"],
        default: "Client",
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
  prMessage: { type: String, default: "" },
  userMessage: { type: String, default: "" },
  executorMessage: { type: String, default: "" },
  draftReadyToSend: { type: Boolean, default: false },
  updatedAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Lead", leadSchema);
