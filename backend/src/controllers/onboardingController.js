import Service from "../models/Service.js";
import User from "../models/User.js";

// Mapping of user paths/needs to specific services
const SERVICE_MAPPINGS = {
  startingBusiness: "Company Incorporation",
  filing: "ITR Filing (Individuals)",
  scaling: "Virtual CFO Service",
  compliance: "GST Registration",
};

// Granular flags for specific income tax scenarios
const GRANULAR_TAX_MAPPINGS = {
  salaried: "ITR Filing (Individuals)",
  capitalGains: "Capital Gains Tax Filing",
  houseProperty: "Rental & House Property ITR",
  otherSources: "ITR Filing (Individuals)",
};

const NEED_TO_SERVICE_MAP = {
  "gst compliance": "GST Registration",
  "income tax": "ITR Filing (Individuals)",
  "capital gains": "Capital Gains Tax Filing",
  "virtual cfo": "Virtual CFO Service",
  registration: "Company Incorporation",
  "legal advisory": "Legal & Secretarial Service",
  payroll: "EPF & ESI Management",
  startingbusiness: "Company Incorporation",
  itrfiling: "ITR Filing (Individuals)",
  salaried: "ITR Filing (Individuals)",
  capitalgains: "Capital Gains Tax Filing",
  houseproperty: "Rental & House Property ITR",
  othersources: "ITR Filing (Individuals)",
};

export const getRecommendations = async (req, res) => {
  const { 
    path, 
    needs = [], 
    businessStage, 
    salaried, 
    capitalGains, 
    houseProperty, 
    otherSources 
  } = req.body;

  try {
    const allServices = await Service.find({}).sort({ title: 1 });
    let personalisedServiceTitles = new Set();

    // STRICT MODE: If user selected a specific path like "starting", honor explicit needs first.
    if (path === "starting") {
      const explicitNeeds = Array.isArray(needs) ? needs : [];

      if (explicitNeeds.length > 0 && !explicitNeeds.includes("startingBusiness")) {
        explicitNeeds.forEach((need) => {
          const normalizedNeed = String(need).toLowerCase().trim();
          const mappedTitle = NEED_TO_SERVICE_MAP[normalizedNeed];
          if (mappedTitle) personalisedServiceTitles.add(mappedTitle);
        });
      } else {
        // Fallback startup bundle only when no explicit selections were made.
        personalisedServiceTitles.add(SERVICE_MAPPINGS.startingBusiness);
      }
    } 
    // For other specific paths
    else if (path === "filing") {
      // Check for granular tax flags
      const granularTitles = new Set();
      
      if (salaried || needs.includes("salaried")) {
        granularTitles.add(GRANULAR_TAX_MAPPINGS.salaried);
      }
      if (capitalGains || needs.includes("capitalGains") || needs.includes("Capital Gains")) {
        granularTitles.add(GRANULAR_TAX_MAPPINGS.capitalGains);
      }
      if (houseProperty || needs.includes("houseProperty") || needs.includes("House Property")) {
        granularTitles.add(GRANULAR_TAX_MAPPINGS.houseProperty);
      }
      if (otherSources || needs.includes("otherSources") || needs.includes("Other Sources")) {
        granularTitles.add(GRANULAR_TAX_MAPPINGS.otherSources);
      }
      
      // If no granular flags, show basic ITR filing only
      if (granularTitles.size === 0) {
        personalisedServiceTitles.add("ITR Filing (Individuals)");
      } else {
        granularTitles.forEach((title) => personalisedServiceTitles.add(title));
      }
    }
    // For "having" path (Have a Business)
    else if (path === "having") {
      // Map the needs selections to specific services
      if (needs && needs.length > 0) {
        needs.forEach((need) => {
          const normalizedNeed = String(need).toLowerCase().trim();
          const mappedTitle = NEED_TO_SERVICE_MAP[normalizedNeed];
          if (mappedTitle) personalisedServiceTitles.add(mappedTitle);
        });
      }
    }
    // For other paths or if needs array is provided
    else if (needs && needs.length > 0) {
      needs.forEach((need) => {
        const normalizedNeed = String(need).toLowerCase().trim();
        const mappedTitle = NEED_TO_SERVICE_MAP[normalizedNeed];
        if (mappedTitle) personalisedServiceTitles.add(mappedTitle);
      });
    }

    // Filter personalised services from all services
    const personalisedServices = allServices.filter((s) =>
      personalisedServiceTitles.has(s.title)
    );

    res.status(200).json({
      success: true,
      data: personalisedServices,
      summary: `Found ${personalisedServices.length} personalised services tailored for your profile.`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
