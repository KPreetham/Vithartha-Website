import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["user", "admin"], default: "user" },
  profile: {
    companyName: String,
    phone: String,
    businessStage: {
      type: String,
      enum: ["Startup", "Growth", "Established", "Growing", ""],
    },
    industry: String,
  },
  onboardingResponses: { type: mongoose.Schema.Types.Mixed },
  recommendedServices: [
    { type: mongoose.Schema.Types.ObjectId, ref: "Service" },
  ],
  createdAt: { type: Date, default: Date.now },
});

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 10);
});

export default mongoose.model("User", userSchema);
