const DEFAULT_SERVICE_PRICE = 1000;

const SERVICE_PRICE_BOOK = [
  {
    match: ["gst registration"],
    amount: 1499,
    displayPrice: "Rs. 1,499",
  },
  {
    match: ["gstr 1 & 3b filing", "gstr 1 and 3b filing", "gstr filing"],
    amount: 899,
    displayPrice: "Rs. 899/month",
  },
  {
    match: ["itr filing (individuals)", "itr filing"],
    amount: 1299,
    displayPrice: "Rs. 1,299",
  },
  /*
  {
    match: ["capital gains tax filing", "capital gains"],
    amount: 2499,
    displayPrice: "Rs. 2,499",
  },
  {
    match: ["rental & house property itr", "house property"],
    amount: 1499,
    displayPrice: "Rs. 1,499",
  },
  {
    match: ["nri taxation & compliance", "nri taxation"],
    amount: 2999,
    displayPrice: "Rs. 2,999",
  },
  */
  {
    match: ["company incorporation"],
    amount: 999,
    displayPrice: "Rs. 999 + govt fees",
  },
  /*
  {
    match: ["virtual cfo service", "virtual cfo"],
    amount: 25000,
    displayPrice: "Rs. 25,000/month",
  },
  {
    match: ["virtual accountant"],
    amount: 15000,
    displayPrice: "Rs. 15,000/month",
  },
  {
    match: ["gst 2b reconciliation", "2b reconciliation"],
    amount: 1299,
    displayPrice: "Rs. 1,299/month",
  },
  {
    match: ["gst notice management"],
    amount: 1999,
    displayPrice: "Rs. 1,999",
  },
  {
    match: ["e-way bill & e-invoicing", "e-way bill", "e invoicing"],
    amount: 999,
    displayPrice: "Rs. 999/month",
  },
  {
    match: ["gst health check"],
    amount: 2499,
    displayPrice: "Rs. 2,499",
  },
  {
    match: ["tds payment & returns", "tds payment", "tds returns"],
    amount: 1199,
    displayPrice: "Rs. 1,199/month",
  },
  {
    match: ["it notice management", "income tax notice"],
    amount: 1999,
    displayPrice: "Rs. 1,999",
  },
  {
    match: ["refund postponement/reissue", "refund reissue", "refund postponement"],
    amount: 899,
    displayPrice: "Rs. 899",
  },
  {
    match: ["startup consulting"],
    amount: 1999,
    displayPrice: "Rs. 1,999",
  },
  {
    match: ["import & export (iec)", "import export", "iec"],
    amount: 2499,
    displayPrice: "Rs. 2,499 + govt fees",
  },
  */
  {
    match: ["mca annual filings", "mca filing"],
    amount: 3499,
    displayPrice: "Rs. 3,499/year",
  },
  /*
  {
    match: ["legal & secretarial service", "secretarial service"],
    amount: 2999,
    displayPrice: "Rs. 2,999",
  },
  {
    match: ["director & professional svc", "director professional"],
    amount: 1499,
    displayPrice: "Rs. 1,499",
  },
  {
    match: ["share transfer & esop", "share transfer", "esop"],
    amount: 3999,
    displayPrice: "Rs. 3,999",
  },
  {
    match: ["epf & esi management", "epf", "esi management"],
    amount: 1499,
    displayPrice: "Rs. 1,499/month",
  },
  {
    match: ["tds (payroll) compliance", "payroll tds"],
    amount: 999,
    displayPrice: "Rs. 999/month",
  },
  {
    match: ["technical service"],
    amount: 1999,
    displayPrice: "Rs. 1,999/month",
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
    displayPrice: "Rs. 1,000",
  };
};

export const getLeadRevenueAmount = (lead) => {
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

export const hasRejectedDocuments = (lead) =>
  Array.isArray(lead?.documents) &&
  lead.documents.some((doc) => String(doc?.status || "").trim().toLowerCase() === "rejected");

export const shouldCountLeadRevenue = (lead) => {
  const status = String(lead?.status || "").trim();
  if (!status) return true;

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
