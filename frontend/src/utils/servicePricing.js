const DEFAULT_SERVICE_PRICE = 1;

const SERVICE_PRICE_BOOK = [
  {
    match: ["gst registration"],
    amount: 1,
    displayPrice: "Rs. 1",
  },
  {
    match: ["gstr 1 & 3b filing", "gstr 1 and 3b filing", "gstr filing"],
    amount: 1,
    displayPrice: "Rs. 1",
  },
  {
    match: ["itr filing (individuals)", "itr filing"],
    amount: 1,
    displayPrice: "Rs. 1",
  },
  /*
  {
    match: ["capital gains tax filing", "capital gains"],
    amount: 1,
    displayPrice: "Rs. 1",
  },
  {
    match: ["rental & house property itr", "house property"],
    amount: 1,
    displayPrice: "Rs. 1",
  },
  {
    match: ["nri taxation & compliance", "nri taxation"],
    amount: 1,
    displayPrice: "Rs. 1",
  },
  */
  {
    match: ["company incorporation"],
    amount: 1,
    displayPrice: "Rs. 1",
  },
  /*
  {
    match: ["virtual cfo service", "virtual cfo"],
    amount: 1,
    displayPrice: "Rs. 1",
  },
  {
    match: ["virtual accountant"],
    amount: 1,
    displayPrice: "Rs. 1",
  },
  {
    match: ["gst 2b reconciliation", "2b reconciliation"],
    amount: 1,
    displayPrice: "Rs. 1",
  },
  {
    match: ["gst notice management"],
    amount: 1,
    displayPrice: "Rs. 1",
  },
  {
    match: ["e-way bill & e-invoicing", "e-way bill", "e invoicing"],
    amount: 1,
    displayPrice: "Rs. 1",
  },
  {
    match: ["gst health check"],
    amount: 1,
    displayPrice: "Rs. 1",
  },
  {
    match: ["tds payment & returns", "tds payment", "tds returns"],
    amount: 1,
    displayPrice: "Rs. 1",
  },
  {
    match: ["it notice management", "income tax notice"],
    amount: 1,
    displayPrice: "Rs. 1",
  },
  {
    match: ["refund postponement/reissue", "refund reissue", "refund postponement"],
    amount: 1,
    displayPrice: "Rs. 1",
  },
  {
    match: ["startup consulting"],
    amount: 1,
    displayPrice: "Rs. 1",
  },
  {
    match: ["import & export (iec)", "import export", "iec"],
    amount: 1,
    displayPrice: "Rs. 1",
  },
  */
  {
    match: ["mca annual filings", "mca filing"],
    amount: 1,
    displayPrice: "Rs. 1",
  },
  /*
  {
    match: ["legal & secretarial service", "secretarial service"],
    amount: 1,
    displayPrice: "Rs. 1",
  },
  {
    match: ["director & professional svc", "director professional"],
    amount: 1,
    displayPrice: "Rs. 1",
  },
  {
    match: ["share transfer & esop", "share transfer", "esop"],
    amount: 1,
    displayPrice: "Rs. 1",
  },
  {
    match: ["epf & esi management", "epf", "esi management"],
    amount: 1,
    displayPrice: "Rs. 1",
  },
  {
    match: ["tds (payroll) compliance", "payroll tds"],
    amount: 1,
    displayPrice: "Rs. 1",
  },
  {
    match: ["technical service"],
    amount: 1,
    displayPrice: "Rs. 1",
  },
  */
];

const normalize = (value) => String(value || "").trim().toLowerCase();

export const parseAllFeeAmounts = (value) => {
  const text = String(value || "").trim();
  if (!text) return [];

  const normalized = text.toLowerCase().replace(/,/g, "");
  // Find all matches of numbers possibly followed by k or m
  const matches = [...normalized.matchAll(/(\d+(?:\.\d+)?)(\s*[km])?/gi)];
  const amounts = [];
  for (const match of matches) {
    let amount = Number(match[1]);
    const suffix = String(match[2] || "").trim().toLowerCase();
    if (suffix === "k") amount *= 1000;
    else if (suffix === "m") amount *= 1000000;
    amounts.push(Math.round(amount));
  }
  return amounts;
};

export const parseFeeAmount = (value) => {
  const amounts = parseAllFeeAmounts(value);
  return amounts.length > 0 ? amounts[0] : null;
};

export const getSmallFeeAmount = (value) => {
  const amounts = parseAllFeeAmounts(value);
  if (amounts.length === 0) return null;
  return Math.min(...amounts);
};

export const getServicePricing = (serviceName) => {
  const normalized = normalize(serviceName);
  const matched = SERVICE_PRICE_BOOK.find((item) =>
    item.match.some((needle) => normalized.includes(needle)),
  );

  if (matched) {
    return {
      amount: matched.amount,
      displayPrice: matched.displayPrice,
    };
  }

  return {
    amount: DEFAULT_SERVICE_PRICE,
    displayPrice: "Rs. 1",
  };
};

export const getLeadRevenueAmount = (lead, catalogService = null) => {
  if (catalogService) {
    const catalogFee = parseFeeAmount(catalogService?.recommendedFees);
    if (Number.isFinite(catalogFee) && catalogFee > 0) return catalogFee;
  }

  const raw = lead?.recommendedFees || lead?.recommendedFeeAmount || lead?.cost || "";
  const fee = getSmallFeeAmount(raw);
  
  if (Number.isFinite(fee) && fee > 0) {
    return fee;
  }

  const mapped = getServicePricing(lead?.serviceName).amount;
  if (mapped !== DEFAULT_SERVICE_PRICE) return mapped;

  const numericCost = Number(lead?.cost);
  if (Number.isFinite(numericCost) && numericCost > 0) return numericCost;

  return DEFAULT_SERVICE_PRICE;
};

export const getOurFeeAmount = (lead) => {
  if (Number.isFinite(lead?.recommendedFeeAmount) && lead.recommendedFeeAmount > 0) {
    return lead.recommendedFeeAmount;
  }
  const fromString = parseFeeAmount(lead?.recommendedFees);
  if (Number.isFinite(fromString) && fromString > 0) return fromString;
  const cost = Number(lead?.cost);
  if (Number.isFinite(cost) && cost > 0) return cost;
  return 0;
};

export const hasRejectedDocuments = (lead) =>
  Array.isArray(lead?.documents) &&
  lead.documents.some((doc) => String(doc?.status || "").trim().toLowerCase() === "rejected");

export const shouldCountLeadRevenue = (lead) => {
  const status = String(lead?.status || "").trim();
  if (!status) return true;

  if (status === "Completed") {
    return true;
  }

  // A staged executor rejection has status "Rejected" but the PR hasn't notified
  // the client yet — treat it as active/in-progress for revenue counting purposes.
  if (status === "Rejected" && lead?.executorServiceRejected === true && lead?.prNotifiedClientServiceRejection !== true) {
    return true;
  }

  if (["Rejected", "Closed", "DraftRejected"].includes(status)) {
    return false;
  }

  if (hasRejectedDocuments(lead)) {
    return false;
  }

  return true;
};

export const formatInr = (amount) =>
  Number(amount || 0).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });
