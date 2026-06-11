const DEFAULT_SERVICE_PRICE = 1;

const SERVICE_PRICE_BOOK = [
  { match: ["gst registration"], amount: 1 },
  { match: ["gstr 1 & 3b filing", "gstr 1 and 3b filing", "gstr filing"], amount: 1 },
  { match: ["itr filing (individuals)", "itr filing"], amount: 1 },
  { match: ["capital gains tax filing", "capital gains"], amount: 1 },
  { match: ["rental & house property itr", "house property"], amount: 1 },
  { match: ["nri taxation & compliance", "nri taxation"], amount: 1 },
  { match: ["company incorporation"], amount: 1 },
  { match: ["virtual cfo service", "virtual cfo"], amount: 1 },
  { match: ["virtual accountant"], amount: 1 },
  { match: ["gst 2b reconciliation", "2b reconciliation"], amount: 1 },
  { match: ["gst notice management"], amount: 1 },
  { match: ["e-way bill & e-invoicing", "e-way bill", "e invoicing"], amount: 1 },
  { match: ["gst health check"], amount: 1 },
  { match: ["tds payment & returns", "tds payment", "tds returns"], amount: 1 },
  { match: ["it notice management", "income tax notice"], amount: 1 },
  { match: ["refund postponement/reissue", "refund reissue", "refund postponement"], amount: 1 },
  { match: ["startup consulting"], amount: 1 },
  { match: ["import & export (iec)", "import export", "iec"], amount: 1 },
  { match: ["mca annual filings", "mca filing"], amount: 1 },
  { match: ["legal & secretarial service", "secretarial service"], amount: 1 },
  { match: ["director & professional svc", "director professional"], amount: 1 },
  { match: ["share transfer & esop", "share transfer", "esop"], amount: 1 },
  { match: ["epf & esi management", "epf", "esi management"], amount: 1 },
  { match: ["tds (payroll) compliance", "payroll tds"], amount: 1 },
  { match: ["technical service"], amount: 1 },
];

const normalize = (value) => String(value || "").trim().toLowerCase();

export const parseFeeAmount = (value) => {
  const text = String(value || "").trim();
  if (!text) return null;

  const normalized = text.toLowerCase().replace(/,/g, "");
  const match = normalized.match(/(\d+(?:\.\d+)?)(\s*[km])?/i);
  if (!match) return null;

  const amount = Number(match[1]);
  if (!Number.isFinite(amount) || amount <= 0) return null;

  const suffix = String(match[2] || "").trim().toLowerCase();
  if (suffix === "k") return Math.round(amount * 1000);
  if (suffix === "m") return Math.round(amount * 1000000);
  return Math.round(amount);
};

export const getServicePriceAmount = (serviceName) => {
  const normalized = normalize(serviceName);
  const matched = SERVICE_PRICE_BOOK.find((item) =>
    item.match.some((needle) => normalized.includes(needle)),
  );
  return matched?.amount || DEFAULT_SERVICE_PRICE;
};

export const resolveLeadCost = ({
  serviceName,
  cost,
  recommendedFeeAmount,
  recommendedFees,
  serviceRecommendedFees,
}) => {
  const explicitFee =
    parseFeeAmount(recommendedFeeAmount) ??
    parseFeeAmount(recommendedFees) ??
    parseFeeAmount(serviceRecommendedFees) ??
    parseFeeAmount(cost);
  if (Number.isFinite(explicitFee) && explicitFee > 0) return explicitFee;

  const mapped = getServicePriceAmount(serviceName);
  if (mapped !== DEFAULT_SERVICE_PRICE) return mapped;

  const numericCost = Number(cost);
  if (Number.isFinite(numericCost) && numericCost > 0) return numericCost;

  return DEFAULT_SERVICE_PRICE;
};
