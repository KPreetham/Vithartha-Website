import mongoose from "mongoose";
import dotenv from "dotenv";
import Service from "../models/Service.js";

dotenv.config();

// PAN Card and Aadhaar Card are required for every service.
// Additional service-specific docs follow.
const ALL_SERVICES = [
  {
    id: "gst-reg",
    title: "GST Registration",
    description:
      "Quick and compliant registration under GST with expert verification and documentation.",
    category: "Compliance",
    trigger: "GST Compliance",
    tags: ["gst", "compliance", "registration"],
    documentsRequired: [
      "PAN Card",
      "Aadhaar Card",
      "Business Address Proof",
      "Bank Statement / Cancelled Cheque",
      "Certificate of Incorporation / Partnership Deed",
    ],
  },
  {
    id: "gstr-filing",
    title: "GSTR 1 & 3B Filing",
    description:
      "From monthly compliance to reconciliation - we file your GST returns under one roof.",
    category: "Compliance",
    trigger: "GST Compliance",
    tags: ["gst", "compliance"],
    documentsRequired: [
      "PAN Card",
      "Aadhaar Card",
      "GST Certificate",
      "Sales Register / Invoices",
      "Purchase Register / Input Invoices",
    ],
  },
  {
    id: "itr-filing",
    title: "ITR Filing (Individuals)",
    description:
      "ITR Filing and expert consultation to ensure maximum refund and zero compliance errors.",
    category: "Tax",
    trigger: "Income Tax",
    tags: ["income-tax", "tax", "compliance"],
    documentsRequired: [
      "PAN Card",
      "Aadhaar Card",
      "Form 16 (Part A & B)",
      "Bank Statements",
      "Form 26AS / AIS / TIS",
    ],
  },
  {
    id: "company-incorporation",
    title: "Company Incorporation",
    description:
      "Incorporation of Private Limited, Public Limited, OPC, or LLP with MCA compliance.",
    category: "Legal",
    trigger: "Registration",
    tags: ["startup", "incorporation", "registration", "legal"],
    documentsRequired: [
      "PAN Card",
      "Aadhaar Card",
      "Address Proof (Directors)",
      "Passport Size Photographs",
      "Registered Office Address Proof",
      "NOC from Owner (if rented)",
    ],
  },
  {
    id: "mca-annual-filings",
    title: "MCA Annual Filings",
    description:
      "Annual filings compliance and management, including returns and necessary legal forms.",
    category: "Compliance",
    trigger: "Legal Advisory",
    tags: ["compliance", "legal", "mca"],
    documentsRequired: [
      "PAN Card",
      "Aadhaar Card",
      "Certificate of Incorporation",
      "Audited Financial Statements",
      "Board Resolution",
    ],
  },
];

const seedDB = async () => {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/vithartha",
    );
    await Service.deleteMany({});
    await Service.insertMany(ALL_SERVICES);
    console.log("✅ Services seeded successfully");
    mongoose.connection.close();
  } catch (error) {
    console.error("❌ Seeding Error:", error);
  }
};

seedDB();
