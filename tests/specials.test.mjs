import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { activeOffers, dealershipDate, validateSpecials } from "../specials.js";
const data = JSON.parse(
  await readFile(new URL("../data/specials.json", import.meta.url)),
);
test("spreadsheet offers validate and preserve exact source values", () => {
  assert.deepEqual(validateSpecials(data), []);
  assert.deepEqual(
    data.offers.map((o) => [
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
  assert.ok(data.offers.every((o) => o.vinLast8.length === 8 && !o.vin));
});
test("expiration is inclusive in dealership time and never deletes records", () => {
  assert.equal(dealershipDate(new Date("2026-12-01T04:59:59Z")), "2026-11-30");
  assert.equal(
    activeOffers(data, { now: new Date("2026-12-01T04:59:59Z") }).length,
    4,
  );
  assert.equal(
    activeOffers(data, { now: new Date("2026-12-01T05:00:00Z") }).length,
    0,
  );
  assert.equal(data.offers.length, 4);
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
  assert.equal(activeOffers(future, { now }).length, 6);
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
