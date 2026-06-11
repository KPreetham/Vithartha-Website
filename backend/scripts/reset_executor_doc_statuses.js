/**
 * One-time migration: Reset all Client/UserUpload document statuses to "Pending"
 * on leads that are currently in "AssignedToExecutor" or "PR_Accepted" state.
 *
 * This ensures executors see fresh "Pending" status on all documents when they
 * receive an assigned service, rather than inheriting the PR's "Accepted" statuses.
 *
 * Safe to run multiple times (idempotent — only touches docs that aren't already Pending).
 *
 * Run: node backend/scripts/reset_executor_doc_statuses.js
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import Lead from "../src/models/Lead.js";

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI;
if (!MONGO_URI) {
  console.error("MONGODB_URI is not set. Aborting.");
  process.exit(1);
}

const CLIENT_TYPES = new Set(["client", "userupload", ""]);

(async () => {
  try {
    await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 8000 });
    console.log("Connected to MongoDB\n");

    // Find all leads assigned to executor (either status)
    const leads = await Lead.find({
      status: { $in: ["AssignedToExecutor", "PR_Accepted"] },
      isDeleted: { $ne: true },
    });

    console.log(`Found ${leads.length} lead(s) in AssignedToExecutor / PR_Accepted state\n`);

    let updatedLeads = 0;
    let totalDocsReset = 0;

    for (const lead of leads) {
      if (!Array.isArray(lead.documents) || lead.documents.length === 0) continue;

      let changed = false;
      const updatedDocs = lead.documents.map((doc) => {
        const docType = String(doc?.type || "").trim().toLowerCase();
        // Only reset client-type docs that are not already Pending
        if (CLIENT_TYPES.has(docType) && String(doc?.status || "").trim().toLowerCase() !== "pending") {
          changed = true;
          totalDocsReset++;
          return { ...doc.toObject(), status: "Pending", rejectionMessage: "" };
        }
        return doc;
      });

      if (changed) {
        lead.documents = updatedDocs;
        lead.updatedAt = Date.now();
        await lead.save();
        updatedLeads++;
        console.log(`  [RESET] Lead "${lead.serviceName}" (${lead._id}) — documents reset to Pending`);
      } else {
        console.log(`  [OK]    Lead "${lead.serviceName}" (${lead._id}) — already all Pending`);
      }
    }

    console.log(`\nDone. Updated ${updatedLeads} lead(s), reset ${totalDocsReset} document(s) to Pending.`);
  } catch (err) {
    console.error("Error:", err.message || err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
})();
