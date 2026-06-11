/**
 * Migration: Ensure "PAN Card" and "Aadhaar Card" appear exactly once at the
 * top of every service's documentsRequired, removing any duplicates.
 *
 * Safe to run multiple times — idempotent.
 *
 * Run: node backend/scripts/add_pan_aadhar_to_services.js
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import Service from "../src/models/Service.js";

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI;
if (!MONGO_URI) {
  console.error("MONGODB_URI is not set. Aborting.");
  process.exit(1);
}

const REQUIRED_DOCS = ["PAN Card", "Aadhaar Card"];
const normalize = (s) => String(s || "").trim().toLowerCase();

/**
 * Given the current documentsRequired array:
 * 1. Strip out ALL occurrences of PAN Card / Aadhaar Card (case-insensitive).
 * 2. Deduplicate what remains (keep first occurrence, case-insensitive).
 * 3. Prepend exactly one "PAN Card" then one "Aadhaar Card".
 */
const buildCleanList = (existing) => {
  const universalNorm = new Set(REQUIRED_DOCS.map(normalize));

  // Remove all existing PAN / Aadhaar entries (handles duplicates from prior runs)
  const rest = (Array.isArray(existing) ? existing : []).filter(
    (d) => !universalNorm.has(normalize(d))
  );

  // Deduplicate remaining docs (preserve first occurrence)
  const seen = new Set();
  const dedupedRest = rest.filter((d) => {
    const key = normalize(d);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return [...REQUIRED_DOCS, ...dedupedRest];
};

(async () => {
  try {
    await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 8000 });
    console.log("Connected to MongoDB");

    const services = await Service.find({});
    console.log(`Found ${services.length} service(s)\n`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const service of services) {
      const current = Array.isArray(service.documentsRequired)
        ? service.documentsRequired
        : [];
      const clean = buildCleanList(current);

      // Skip if already identical (avoid unnecessary writes)
      const unchanged =
        clean.length === current.length &&
        clean.every((d, i) => normalize(d) === normalize(current[i]));

      if (unchanged) {
        console.log(`  [OK]      "${service.title}"`);
        skippedCount++;
        continue;
      }

      await Service.updateOne(
        { _id: service._id },
        { $set: { documentsRequired: clean, updatedAt: Date.now() } }
      );
      updatedCount++;
      console.log(`  [UPDATED] "${service.title}" → [${clean.join(", ")}]`);
    }

    console.log(`\nDone. Updated: ${updatedCount} | Already correct: ${skippedCount}`);
  } catch (err) {
    console.error("Error:", err.message || err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
})();
