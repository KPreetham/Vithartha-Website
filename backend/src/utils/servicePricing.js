const DEFAULT_SERVICE_PRICE = 1000;

const SERVICE_PRICE_BOOK = [
  { match: ["gst registration"], amount: 1499 },
  { match: ["gstr 1 & 3b filing", "gstr 1 and 3b filing", "gstr filing"], amount: 899 },
  { match: ["itr filing (individuals)", "itr filing"], amount: 1299 },
  { match: ["capital gains tax filing", "capital gains"], amount: 2499 },
  { match: ["rental & house property itr", "house property"], amount: 1499 },
  { match: ["nri taxation & compliance", "nri taxation"], amount: 2999 },
  { match: ["company incorporation"], amount: 999 },
  { match: ["virtual cfo service", "virtual cfo"], amount: 25000 },
  { match: ["virtual accountant"], amount: 15000 },
  { match: ["gst 2b reconciliation", "2b reconciliation"], amount: 1299 },
  { match: ["gst notice management"], amount: 1999 },
  { match: ["e-way bill & e-invoicing", "e-way bill", "e invoicing"], amount: 999 },
  { match: ["gst health check"], amount: 2499 },
  { match: ["tds payment & returns", "tds payment", "tds returns"], amount: 1199 },
  { match: ["it notice management", "income tax notice"], amount: 1999 },
  { match: ["refund postponement/reissue", "refund reissue", "refund postponement"], amount: 899 },
  { match: ["startup consulting"], amount: 1999 },
  { match: ["import & export (iec)", "import export", "iec"], amount: 2499 },
  { match: ["mca annual filings", "mca filing"], amount: 3499 },
  { match: ["legal & secretarial service", "secretarial service"], amount: 2999 },
  { match: ["director & professional svc", "director professional"], amount: 1499 },
  { match: ["share transfer & esop", "share transfer", "esop"], amount: 3999 },
  { match: ["epf & esi management", "epf", "esi management"], amount: 1499 },
  { match: ["tds (payroll) compliance", "payroll tds"], amount: 999 },
  { match: ["technical service"], amount: 1999 },
];

const normalize = (value) => String(value || "").trim().toLowerCase();

export const getServicePriceAmount = (serviceName) => {
  const normalized = normalize(serviceName);
  const matched = SERVICE_PRICE_BOOK.find((item) =>
    item.match.some((needle) => normalized.includes(needle)),
  );
  return matched?.amount || DEFAULT_SERVICE_PRICE;
};

export const resolveLeadCost = ({ serviceName, cost }) => {
  const mapped = getServicePriceAmount(serviceName);
  if (mapped !== DEFAULT_SERVICE_PRICE) return mapped;

  const numericCost = Number(cost);
  if (Number.isFinite(numericCost) && numericCost > 0) return numericCost;

  return DEFAULT_SERVICE_PRICE;
};
