// Optional lease reference details: null means TBD, "N/A" means confirmed inapplicable.
export const leaseDetailFields = [
  { id: "lienholder", label: "Lienholder", format: "text" },
  { id: "residualValue", label: "Residual value", format: "currency" },
  { id: "residualPercentage", label: "Residual percentage", format: "percent" },
  { id: "moneyFactor", label: "Money factor", format: "number" },
  { id: "acquisitionFee", label: "Acquisition fee", format: "currency" },
  { id: "dispositionFee", label: "Disposition fee", format: "currency" },
  { id: "securityDeposit", label: "Security deposit", format: "currency" },
  { id: "creditTier", label: "Credit tier", format: "text" },
];
export const manufacturers = {
  toyota: "Toyota",
  volkswagen: "Volkswagen",
  chevrolet: "Chevrolet",
};
export const offerTypes = {
  lease: "Lease",
  finance: "Finance",
  purchase: "Purchase",
};
export function dealershipDate(now = new Date(), timeZone = "America/Detroit") {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type) => parts.find((p) => p.type === type).value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
export function activeOffers(
  data,
  { manufacturer = "", type = "", now = new Date() } = {},
) {
  const today = dealershipDate(now, data.timeZone);
  return data.offers.filter(
    (o) =>
      o.expiresOn >= today &&
      (!manufacturer || o.manufacturer === manufacturer) &&
      (!type || o.type === type),
  );
}
const validDate = (value) =>
  typeof value === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(Date.parse(value)) &&
  new Date(value).toISOString().slice(0, 10) === value;
export function validateSpecials(data) {
  const errors = [];
  if (data?.schemaVersion !== 1 || !Array.isArray(data?.offers))
    return ["Specials: expected schemaVersion 1 and offers array"];
  try {
    dealershipDate(new Date(), data.timeZone);
  } catch {
    errors.push("Specials: invalid timeZone");
  }
  if (!data.timeZone) errors.push("Specials: timeZone required");
  const ids = new Set();
  for (const o of data.offers) {
    const fail = (message) =>
      errors.push(`Specials ${o.id || "unknown"}: ${message}`);
    if (!o.id || ids.has(o.id)) fail("unique id required");
    ids.add(o.id);
    if (!Object.hasOwn(manufacturers, o.manufacturer))
      fail("unknown manufacturer");
    if (!Object.hasOwn(offerTypes, o.type)) fail("unknown offer type");
    if (!Number.isInteger(o.year) || o.year < 1900 || !o.model || !o.trim)
      fail("year, model and trim required");
    if (!validDate(o.expiresOn)) fail("valid expiresOn date required");
    if (o.source?.kind === "approved-internal") {
      if (
        typeof o.source.title !== "string" ||
        !o.source.title.trim() ||
        typeof o.source.section !== "string" ||
        !o.source.section.trim() ||
        !validDate(o.source.providedOn)
      )
        fail(
          "approved internal source requires title, section and providedOn date",
        );
    } else if (!o.source?.file || !o.source?.sheet || !o.source?.column)
      fail("spreadsheet source required");
    if (
      o.paymentPrecision !== undefined &&
      ![0, 2].includes(o.paymentPrecision)
    )
      fail("invalid paymentPrecision");
    if (
      o.signingAmountType !== undefined &&
      o.signingAmountType !== "total-out-of-pocket"
    )
      fail("invalid signingAmountType");
    if (o.leaseDetails !== undefined) {
      if (
        o.type !== "lease" ||
        !o.leaseDetails ||
        typeof o.leaseDetails !== "object" ||
        Array.isArray(o.leaseDetails)
      )
        fail("invalid leaseDetails");
      else
        for (const [key, value] of Object.entries(o.leaseDetails)) {
          const field = leaseDetailFields.find((f) => f.id === key);
          if (!field) {
            fail(`unknown lease detail ${key}`);
            continue;
          }
          if (value === null || value === "N/A") continue;
          if (
            field.format === "text"
              ? typeof value !== "string" || !value.trim()
              : typeof value !== "number" ||
                !Number.isFinite(value) ||
                value < 0 ||
                (field.format === "percent" && value > 100)
          )
            fail(`invalid lease detail ${key}`);
        }
    }
    for (const key of [
      "monthlyPayment",
      "dueAtSigning",
      "termMonths",
      "annualMileage",
      "msrp",
      "sellingPrice",
      "paymentIncludingTax",
      "downPayment",
      "apr",
      "purchasePrice",
      "rebate",
    ]) {
      if (
        o[key] !== undefined &&
        (typeof o[key] !== "number" || !Number.isFinite(o[key]) || o[key] < 0)
      )
        fail(`invalid ${key}`);
    }
    for (const key of [
      "stockNumber",
      "vinLast8",
      "vin",
      "lender",
      "notes",
      "qualification",
      "creditQualification",
      "vehicleId",
      "guideModel",
    ]) {
      if (
        o[key] !== undefined &&
        (typeof o[key] !== "string" || !o[key].trim())
      )
        fail(`invalid ${key}`);
    }
    if (o.vinLast8 && !/^[A-HJ-NPR-Z0-9]{8}$/.test(o.vinLast8))
      fail("invalid VIN suffix");
    if (o.vin && !/^[A-HJ-NPR-Z0-9]{17}$/.test(o.vin)) fail("invalid VIN");
  }
  return errors;
}
