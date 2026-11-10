import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { activeOffers, dealershipDate, validateSpecials } from "../specials.js";
const data = JSON.parse(
  await readFile(new URL("../data/specials.json", import.meta.url)),
);
test("spreadsheet offers validate and preserve exact source values", () => {
  assert.deepEqual(validateSpecials(data), []);
  assert.deepEqual(
    data.offers
      .filter((o) => o.manufacturer === "toyota")
      .map((o) => [
        o.monthlyPayment,
        o.paymentIncludingTax,
        o.dueAtSigning,
        o.downPayment,
      ]),
    [
      [199, 211, 2999, 2287],
      [351, 372, 2999, 2135],
      [269, 285, 2999, 2216],
      [502, 507, 2999, 1984],
    ],
  );
  assert.equal(data.offers[1].trim, "SR5 Double Cab 4WD");
  assert.ok(
    data.offers
      .filter((o) => o.manufacturer === "toyota")
      .every((o) => o.vinLast8.length === 8 && !o.vin),
  );
});
test("expiration is inclusive in dealership time and never deletes records", () => {
  assert.equal(dealershipDate(new Date("2026-12-01T04:59:59Z")), "2026-11-30");
  assert.equal(
    activeOffers(data, { now: new Date("2026-12-01T04:59:59Z") }).length,
    14,
  );
  assert.equal(
    activeOffers(data, { now: new Date("2026-12-01T05:00:00Z") }).length,
    0,
  );
  assert.equal(data.offers.length, 16);
});
test("filters combine and support future brands, types, and multiple offers per vehicle", () => {
  const future = {
    ...data,
    offers: [
      ...data.offers,
      ...["finance", "purchase"].map((type) => ({
        ...data.offers[0],
        id: type,
        manufacturer: "volkswagen",
        type,
      })),
    ],
  };
  const now = new Date("2026-11-05T12:00:00Z");
  assert.deepEqual(validateSpecials(future), []);
  assert.equal(activeOffers(future, { now }).length, 18);
  assert.equal(
    activeOffers(future, { now, manufacturer: "volkswagen", type: "finance" })
      .length,
    1,
  );
  assert.equal(
    activeOffers(future, { now, manufacturer: "toyota", type: "purchase" })
      .length,
    0,
  );
});
test("validation rejects invalid dates, duplicates, unknown categories and invalid money", () => {
  for (const change of [
    { expiresOn: "2026-02-30" },
    { manufacturer: "unknown" },
    { type: "unknown" },
    { monthlyPayment: -1 },
    { vinLast8: "bad" },
    { source: null },
  ]) {
    assert.ok(
      validateSpecials({ ...data, offers: [{ ...data.offers[0], ...change }] })
        .length,
    );
  }
  assert.ok(
    validateSpecials({ ...data, offers: [data.offers[0], data.offers[0]] })
      .length,
  );
});

test("approved November Volkswagen figures, qualifications and missing details stay exact", () => {
  const offers = data.offers.filter((o) => o.manufacturer === "volkswagen");
  assert.deepEqual(
    offers.map((o) => [
      o.year,
      o.model,
      o.trim,
      o.monthlyPayment,
      o.rebate,
      o.qualification,
    ]),
    [
      [2027, "Jetta", "Sport", 373.25, 500, "Everyone Qualifies"],
      [2027, "Taos", "S", 405, 500, "Everyone Qualifies"],
      [
        2026,
        "Tiguan",
        "S",
        409.83,
        1950,
        "Costco Executive Membership Required",
      ],
      [
        2026,
        "Atlas Cross Sport",
        "SE",
        560.4,
        4750,
        "Costco Executive Membership Required",
      ],
      [
        2026,
        "Atlas",
        "SE",
        572.6,
        1250,
        "Costco Executive Membership Required",
      ],
    ],
  );
  const catalog = JSON.parse(
    readFileSync(new URL("../data/catalog.json", import.meta.url)),
  );
  for (const offer of offers) {
    const guide = catalog.vehicles.find((v) => v.id === offer.vehicleId);
    assert.equal(guide.year, offer.year);
    assert.equal(guide.brand, offer.manufacturer);
    assert.equal(guide.model, offer.guideModel || offer.model);
    assert.equal(offer.dueAtSigning, 2000);
    assert.equal(offer.signingAmountType, "total-out-of-pocket");
    assert.equal(offer.termMonths, 36);
    assert.equal(offer.annualMileage, 10000);
    assert.equal(offer.expiresOn, "2026-11-30");
    assert.equal(offer.paymentPrecision, 2);
    assert.equal(offer.lender, undefined);
    assert.equal(offer.downPayment, undefined);
    assert.ok(Object.values(offer.leaseDetails).every((v) => v === null));
    assert.equal(offer.source.kind, "approved-internal");
    assert.equal(
      offer.creditQualification,
      "Lease payments subject to approved credit through the applicable leasing company. Not all customers will qualify.",
    );
  }
  assert.equal(
    activeOffers(data, {
      manufacturer: "volkswagen",
      type: "lease",
      now: new Date("2026-12-01T04:59:59Z"),
    }).length,
    5,
  );
  assert.equal(
    activeOffers(data, {
      manufacturer: "volkswagen",
      now: new Date("2026-12-01T05:00:00Z"),
    }).length,
    0,
  );
});
test("lease detail validation distinguishes unknown, zero, confirmed N/A and invalid values", () => {
  const offer = structuredClone(
    data.offers.find((o) => o.manufacturer === "volkswagen"),
  );
  offer.leaseDetails = {
    creditTier: null,
    securityDeposit: 0,
    residualValue: "N/A",
    moneyFactor: 0.00125,
    residualPercentage: 55,
    lienholder: "Confirmed company",
  };
  assert.deepEqual(validateSpecials({ ...data, offers: [offer] }), []);
  for (const changes of [
    { rebate: -1 },
    { paymentPrecision: 1 },
    { signingAmountType: "down-plus-fees" },
    { leaseDetails: { residualPercentage: 101 } },
    { leaseDetails: { moneyFactor: "TBD" } },
    { leaseDetails: { unrecognized: null } },
    {
      source: {
        kind: "approved-internal",
        title: "Provided figures",
        section: "Offers",
        providedOn: "invalid",
      },
    },
  ])
    assert.ok(
      validateSpecials({ ...data, offers: [{ ...offer, ...changes }] }).length,
    );
});

test("November Chevrolet offers preserve exact figures, eligibility, down payments and lender tiers", () => {
  const offers = data.offers.filter((o) => o.manufacturer === "chevrolet");
  assert.deepEqual(
    offers.map((o) => [
      o.year,
      o.model,
      o.trim,
      o.msrp,
      o.monthlyPayment,
      o.downPayment,
      o.termMonths,
      o.lender,
      o.leaseDetails.creditTier,
      o.expiresOn,
    ]),
    [
      [
        2026,
        "Silverado",
        "Crew Cab 2FL 4x4",
        54095,
        189,
        999,
        24,
        "GM Financial",
        "A+",
        "2026-11-30",
      ],
      [
        2026,
        "Equinox",
        "LT FWD, Previous CTP",
        33170,
        239,
        999,
        36,
        "GM Financial",
        "A+",
        "2026-11-30",
      ],
      [
        2026,
        "Trax",
        "LS",
        25150,
        239,
        1999,
        36,
        "MSUFCU",
        "Super Tier",
        "2026-11-15",
      ],
      [
        2026,
        "Blazer",
        "LT FWD",
        38815,
        249,
        1999,
        24,
        "GM Financial",
        "A+",
        "2026-11-30",
      ],
      [
        2026,
        "Colorado",
        "4x4 Work Truck",
        41175,
        288,
        2799,
        36,
        "GM Financial",
        "A+",
        "2026-11-30",
      ],
      [
        2026,
        "Equinox EV",
        "LT2, Previous CTP",
        43690,
        369,
        3899,
        24,
        "GM Financial",
        "A+",
        "2026-11-30",
      ],
      [
        2026,
        "Traverse",
        "AWD LT",
        47505,
        459,
        2799,
        36,
        "MSUFCU",
        "Super Tier",
        "2026-11-15",
      ],
    ],
  );
  for (const o of offers) {
    assert.equal(o.type, "lease");
    assert.equal(o.annualMileage, 10000);
    assert.equal(
      o.qualification,
      "GM Employee or Eligible Family Member pricing required.",
    );
    assert.equal(
      o.creditQualification,
      `${o.lender} ${o.leaseDetails.creditTier} credit approval required.`,
    );
    assert.equal(o.leaseDetails.securityDeposit, 0);
    assert.match(
      o.notes,
      /GM Rewards Credit Card signup and a minimum \$1,000 charge to the card at delivery required/,
    );
    assert.match(
      o.notes,
      /Tax, title, CVR, and documentation fees are additional/,
    );
    assert.match(
      o.notes,
      /down payment is not total due at signing or total out-of-pocket/,
    );
    for (const field of [
      "dueAtSigning",
      "signingAmountType",
      "sellingPrice",
      "rebate",
      "paymentIncludingTax",
      "vin",
      "stockNumber",
      "vehicleId",
    ])
      assert.equal(o[field], undefined, `${o.id} ${field}`);
    assert.equal(o.source.kind, "approved-internal");
    if (["Equinox", "Equinox EV"].includes(o.model))
      assert.match(o.notes, /Previous CTP unit/);
    if (o.model === "Silverado")
      assert.match(o.notes, /^Chevrolet Lease Loyalty required/);
    else if (o.model === "Equinox EV")
      assert.match(o.notes, /^Chevrolet EV Lease Loyalty required/);
    else assert.match(o.notes, /^Lease Loyalty or Lease Conquest required/);
  }
});
test("Chevrolet offers expire individually at dealership midnight without extension or deletion", () => {
  const before = JSON.stringify(data);
  for (const [time, expected] of [
    ["2026-11-16T04:59:59Z", 7],
    ["2026-11-16T05:00:00Z", 5],
    ["2026-12-01T04:59:59Z", 5],
    ["2026-12-01T05:00:00Z", 0],
  ])
    assert.equal(
      activeOffers(data, {
        manufacturer: "chevrolet",
        type: "lease",
        now: new Date(time),
      }).length,
      expected,
    );
  assert.equal(JSON.stringify(data), before);
  assert.equal(
    data.offers.filter((o) => o.manufacturer === "chevrolet").length,
    7,
  );
});
test("Existing Toyota and Volkswagen offer records remain unchanged", async () => {
  const { createHash } = await import("node:crypto");
  assert.equal(
    createHash("sha256")
      .update(
        JSON.stringify(
          data.offers.filter((o) => o.manufacturer !== "chevrolet"),
        ),
      )
      .digest("hex"),
    "3ccf5a05c1c0a651102301e93a314a6882b1d4e2c20b638c286b09428b109bc1",
  );
});
