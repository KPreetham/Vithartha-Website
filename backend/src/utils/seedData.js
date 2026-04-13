import mongoose from "mongoose";
import dotenv from "dotenv";
import Service from "../models/Service.js";

dotenv.config();

const ALL_SERVICES = [
  {
    id: "gst-reg",
    title: "GST Registration",
    description:
      "Quick and compliant registration under GST with expert verification and documentation.",
    category: "Compliance",
    trigger: "GST Compliance",
    tags: ["gst", "compliance", "registration"],
  },
  {
    id: "gstr-filing",
    title: "GSTR 1 & 3B Filing",
    description:
      "From monthly compliance to reconciliation - we file your GST returns under one roof.",
    category: "Compliance",
    trigger: "GST Compliance",
    tags: ["gst", "compliance"],
  },
  /* 
  {
    id: "gst-recon",
    title: "GST 2B Reconciliation",
    description:
      "Monthly reconciliation of returns and ITC credits to prevent notice and financial loss.",
    category: "Compliance",
    trigger: "GST Compliance",
    tags: ["gst", "compliance", "audit"],
  },
  {
    id: "gst-notice",
    title: "GST Notice Management",
    description:
      "Professional handling of GST notices and departmental submissions for total peace of mind.",
    category: "Compliance",
    trigger: "GST Compliance",
    tags: ["gst", "compliance", "legal"],
  },
  {
    id: "eway-billing",
    title: "E-Way Bill & E-Invoicing",
    description:
      "Efficient generation of E-way bills and compliance with the latest E-invoicing standards.",
    category: "Compliance",
    trigger: "GST Compliance",
    tags: ["gst", "compliance"],
  },
  {
    id: "gst-health-check",
    title: "GST Health Check",
    description:
      "Complete verification of records and compliance status to ensure audit readiness.",
    category: "Compliance",
    trigger: "GST Compliance",
    tags: ["gst", "compliance", "audit"],
  },
  */
  {
    id: "itr-filing",
    title: "ITR Filing (Individuals)",
    description:
      "ITR Filing and expert consultation to ensure maximum refund and zero compliance errors.",
    category: "Tax",
    trigger: "Income Tax",
    tags: ["income-tax", "tax", "compliance"],
  },
  /*
  {
    id: "capital-gains-filing",
    title: "Capital Gains Tax Filing",
    description:
      "Expert assistance in calculating and filing taxes for stocks, crypto, and property gains.",
    category: "Tax",
    trigger: "Income Tax",
    tags: ["income-tax", "tax", "capital-gains"],
  },
  {
    id: "rental-property-itr",
    title: "Rental & House Property ITR",
    description:
      "Specialized filing for owners with rental income or home loan deductions.",
    category: "Tax",
    trigger: "Income Tax",
    tags: ["income-tax", "tax", "house-property"],
  },
  {
    id: "nri-taxation",
    title: "NRI Taxation & Compliance",
    description:
      "Strategic NRI taxation services, consultation, and cross-border compliance planning.",
    category: "Tax",
    trigger: "Income Tax",
    tags: ["income-tax", "tax", "nri"],
  },
  {
    id: "tds-returns",
    title: "TDS Payment & Returns",
    description:
      "Monthly TDS payment, return filing, and generation of digital Form 16 for employees.",
    category: "Tax",
    trigger: "Income Tax",
    tags: ["income-tax", "tax", "compliance", "tds"],
  },
  {
    id: "it-notice-management",
    title: "IT Notice Management",
    description:
      "Expert handling and response to Income Tax notices, representing your business professionally.",
    category: "Tax",
    trigger: "Income Tax",
    tags: ["income-tax", "tax", "legal"],
  },
  {
    id: "refund-assistance",
    title: "Refund Postponement/Reissue",
    description:
      "Tracking pending refunds and assisting with reissue requests through the IT department.",
    category: "Tax",
    trigger: "Income Tax",
    tags: ["income-tax", "tax"],
  },
  {
    id: "virtual-cfo",
    title: "Virtual CFO Service",
    description:
      "Digitally manage your financial reporting task. Designed to support fundamental decision making.",
    category: "Finance",
    trigger: "Virtual CFO",
    tags: ["cfo", "finance", "advisory", "established"],
  },
  {
    id: "virtual-accountant",
    title: "Virtual Accountant",
    description:
      "End-to-end bookkeeping, billing, and documentation support by our dedicated expert team.",
    category: "Finance",
    trigger: "Virtual CFO",
    tags: ["accounting", "finance", "growing"],
  },
  */
  {
    id: "company-incorporation",
    title: "Company Incorporation",
    description:
      "Incorporation of Private Limited, Public Limited, OPC, or LLP with MCA compliance.",
    category: "Legal",
    trigger: "Registration",
    tags: ["startup", "incorporation", "registration", "legal"],
  },
  /*
  {
    id: "startup-consulting",
    title: "Startup Consulting",
    description:
      "Consultation, registration set up, and assistance in unlocking other Startup India benefits.",
    category: "Advisory",
    trigger: "Registration",
    tags: ["startup", "registration", "advisory"],
  },
  {
    id: "import-export-iec",
    title: "Import & Export (IEC)",
    description:
      "Import export registration and IEC Code creation. DGFT registration and documentation.",
    category: "Legal",
    trigger: "Registration",
    tags: ["registration", "iec", "import-export"],
  },
  */
  {
    id: "mca-annual-filings",
    title: "MCA Annual Filings",
    description:
      "Annual filings compliance and management, including returns and necessary legal forms.",
    category: "Compliance",
    trigger: "Legal Advisory",
    tags: ["compliance", "legal", "mca"],
  },
  /*
  {
    id: "legal-secretarial",
    title: "Legal & Secretarial Service",
    description:
      "Property registration, Wills, Legal Documents, and various secretarial registrations.",
    category: "Legal",
    trigger: "Legal Advisory",
    tags: ["legal", "secretarial"],
  },
  {
    id: "director-pro-svc",
    title: "Director & Professional Svc",
    description:
      "Director DIN services, KYC compliance, and professional appointments management.",
    category: "Legal",
    trigger: "Legal Advisory",
    tags: ["legal", "compliance", "professional"],
  },
  {
    id: "share-transfer-esop",
    title: "Share Transfer & ESOP",
    description:
      "Share transfer registration and implementation of ESOP plans for your growing team.",
    category: "Legal",
    trigger: "Legal Advisory",
    tags: ["legal", "share-transfer", "esop"],
  },
  {
    id: "epf-esi-management",
    title: "EPF & ESI Management",
    description:
      "Registration, regular monthly compliance, and comprehensive payroll management.",
    category: "Compliance",
    trigger: "Payroll",
    tags: ["compliance", "payroll", "epf", "esi"],
  },
  {
    id: "tds-payroll-compliance",
    title: "TDS (Payroll) Compliance",
    description:
      "TDS Original Return filing and correction return filing for all your payroll needs.",
    category: "Compliance",
    trigger: "Payroll",
    tags: ["compliance", "payroll", "tds"],
  },
  {
    id: "technical-service",
    title: "Technical Service",
    description:
      "Support for Applications, Softwares, and Cloud Services for your business infrastructure.",
    category: "Advisory",
    trigger: "Payroll",
    tags: ["advisory", "technical", "cloud"],
  },
  */
];

const seedDB = async () => {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/vithartha",
    );
    await Service.deleteMany({});
    await Service.insertMany(ALL_SERVICES);
    console.log(`✅ ${ALL_SERVICES.length} Services Seeded Successfully`);
    mongoose.connection.close();
  } catch (error) {
    console.error("❌ Seeding Error:", error);
  }
};

seedDB();
