import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { getDigestIntervalMs } from "../utils/emailDigestConfig.js";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: function() { return !this.googleId; } },
  googleId: { type: String, unique: true, sparse: true },
  role: {
    type: String,
    default: "user",
    validate: {
      validator: (v) => /^(user|admin|pr\d*|executor\d*)$/i.test(v),
      message: (p) => `"${p.value}" is not a valid role`,
    },
  },
  profile: {
    companyName: String,
    phone: String,
    businessStage: String,
    industry: String,
  },
  onboardingResponses: { type: mongoose.Schema.Types.Mixed },
  recommendedServices: [
    { type: mongoose.Schema.Types.ObjectId, ref: "Service" },
  ],
  createdAt: { type: Date, default: Date.now },
  // Recurring documents-digest schedule (see services/documentEmailService.js).
  // lastDocumentDigestAt marks the start of the window for "newly completed
  // since last time"; nextDocumentDigestAt is when the next digest is due.
  lastDocumentDigestAt: { type: Date, default: null },
  nextDocumentDigestAt: { type: Date, default: null },
});

userSchema.pre("save", async function () {
  if (this.isNew && !this.nextDocumentDigestAt) {
    this.nextDocumentDigestAt = new Date(Date.now() + getDigestIntervalMs());
  }
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 10);
});

export default mongoose.model("User", userSchema);
