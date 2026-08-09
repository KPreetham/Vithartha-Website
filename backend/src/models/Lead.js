import mongoose from "mongoose";

const leadSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
  name: { type: String, required: true },
  email: { type: String, required: true },
  serviceName: { type: String, required: true },
  cost: { type: Number, default: 0 },
  recommendedFeeAmount: { type: Number, default: 0 },
  recommendedFees: { type: String, default: "" },
  ourFee: { type: String, default: "" },
  marketFees: { type: String, default: "" },
  workingDays: { type: Number, default: 2 },
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
  assignedExecutor: { type: String, default: "" },
  prId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  executorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  prFeedback: { type: String, default: "" },
  notes: [String],
  documents: [
    {
      name: String,
      url: String,
      publicId: String,
      reuploaded: { type: Boolean, default: false },
      rejectionMessage: { type: String, default: "" },
      executorRejected: { type: Boolean, default: false },  // executor flagged; PR hasn't notified client yet
      prNotifiedClient: { type: Boolean, default: false },  // PR clicked "Notify Client" — now visible to user
      executorAccepted: { type: Boolean, default: false },  // executor explicitly accepted this doc
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
      adminAdded: { type: Boolean, default: false },
      uploadedAt: { type: Date, default: Date.now },
    },
  ],
  documentsRequired: { type: [String], default: [] },
  documentsSentToUser: { type: Boolean, default: false },
  // Note attached by admin when requesting documents — shown only on this
  // specific user's dashboard, scoped to this one lead/service.
  documentsRequiredNote: { type: String, default: "" },
  adminMessage: { type: String, default: "" },
  adminToPrMessage: { type: String, default: "" },
  prMessage: { type: String, default: "" },
  userMessage: { type: String, default: "" },
  executorMessage: { type: String, default: "" },
  prToExecutorMessage: { type: String, default: "" },
  adminToExecutorMessage: { type: String, default: "" },
  draftReadyToSend: { type: Boolean, default: false },
  draftSentToPR: { type: Boolean, default: false },
  // When executor rejects the entire service, PR must click "Notify Client" before
  // the rejection becomes visible to the user/admin. Until then only PR can see it.
  executorServiceRejected: { type: Boolean, default: false },
  prNotifiedClientServiceRejection: { type: Boolean, default: false },
  reuploadedDocumentNames: [String],
  // Set by PR from the "Additional details" box under Service Status Control
  // when a service is sent to them for review; visible only on the Admin
  // Dashboard as a dismissible notification for this specific lead.
  prAdditionalDetailsMessage: { type: String, default: "" },
  // Initial-submission payment gate: the user must complete a Razorpay
  // payment before the first-ever document submission for a lead can be
  // confirmed/sent to admin. Not required again on later reupload cycles.
  paymentStatus: { type: String, enum: ["Pending", "Paid"], default: "Pending" },
  paymentAmount: { type: Number, default: 0 },
  razorpayOrderId: { type: String, default: "" },
  razorpayPaymentId: { type: String, default: "" },
  paymentVerifiedAt: { type: Date },
  // True once the client has clicked "Submit" with the current set of
  // admin-required documents — used to keep the Submit button disabled
  // afterwards. Reset to false any time a document is uploaded/reuploaded
  // so the button re-enables only when something actually changed.
  initialSubmissionConfirmed: { type: Boolean, default: false },
  isDeleted: { type: Boolean, default: false },
  updatedAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  // Set the moment status transitions into "Completed"; used by the
  // recurring documents-digest sweep (see services/documentEmailService.js)
  // to know which completed services fall inside a user's digest window.
  completedAt: { type: Date },
});

export default mongoose.model("Lead", leadSchema);
