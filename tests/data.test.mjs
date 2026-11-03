import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { validate } from "../scripts/validate.mjs";
import {
  eligibleOptions,
  searchVehicles,
  comparisonRows,
  resolveCell,
} from "../lib.js";
import { fixtureVehicle } from "./fixtures.mjs";
const catalog = JSON.parse(
  await readFile(new URL("../data/catalog.json", import.meta.url), "utf8"),
);
const features = JSON.parse(
  await readFile(new URL("../data/features.json", import.meta.url), "utf8"),
);
const fixtureCatalog = () => ({
  ...structuredClone(catalog),
  vehicles: [fixtureVehicle()],
});
test("published catalog and glossary pass evidence validation", () =>
  assert.deepEqual(validate(catalog, features), []));
test("pending guides never become comparison options", () =>
  assert.equal(eligibleOptions(catalog).length, 0));
test("model, manufacturer and year filters compose", () => {
  assert.equal(
    searchVehicles(catalog, features, {
      query: "2026 RAV4",
      brand: "toyota",
      year: "2026",
    }).vehicles.length,
    1,
  );
  assert.equal(
    searchVehicles(catalog, features, { query: "RAV4", year: "2027" }).vehicles
      .length,
    0,
  );
});
test("feature searches do not infer pending equipment or use generic glossary as model evidence", () => {
  assert.equal(
    searchVehicles(catalog, features, { query: "heated seats" }).vehicles
      .length,
    0,
  );
  assert.equal(
    searchVehicles(catalog, features, { query: "Super Cruise" }).vehicles
      .length,
    0,
  );
  assert.equal(
    searchVehicles(catalog, features, { query: "Super Cruise" }).glossary
      .length,
    1,
  );
});
test("differences omit identical and unverified cells", () => {
  const c = fixtureCatalog();
  const options = eligibleOptions(c);
  assert.equal(options.length, 2);
  assert.deepEqual(
    comparisonRows(c, options, { differenceOnly: true }).map((r) => r.id),
    ["heatedSeats", "audio"],
  );
  assert.ok(comparisonRows(c, options).some((r) => r.id === "engine"));
});
test("equipment without source evidence degrades to unverified", () => {
  const v = fixtureVehicle();
  v.trims[0].equipment.engine.sourceIds = ["missing"];
  assert.deepEqual(resolveCell(v, v.trims[0], "engine"), {
    status: "unverified",
  });
  assert.ok(
    validate({ ...catalog, vehicles: [v] }, features).some((e) =>
      e.includes("missing evidence"),
    ),
  );
});
test("a prior-year source cannot establish current-year equipment", () => {
  const v = fixtureVehicle();
  v.sources[0].modelYear = 2025;
  assert.equal(eligibleOptions({ ...catalog, vehicles: [v] }).length, 0);
  assert.equal(resolveCell(v, v.trims[0], "engine").status, "unverified");
});
test("search feature combinations must occur in one verified configuration", () => {
  const c = fixtureCatalog();
  c.vehicles[0].trims[0].equipment.roof = {
    status: "standard",
    value: "Synthetic panoramic roof",
    sourceIds: ["test-source"],
  };
  c.vehicles[0].trims[1].equipment.wheels = {
    status: "standard",
    value: "Synthetic special wheels",
    sourceIds: ["test-source"],
  };
  assert.equal(
    searchVehicles(c, features, { query: "panoramic wheels" }).vehicles.length,
    0,
  );
  assert.equal(
    searchVehicles(c, features, { query: "heated audio" }).vehicles.length,
    1,
  );
});
test("unavailable equipment does not match a feature availability search", () => {
  assert.equal(
    searchVehicles(fixtureCatalog(), features, { query: "ventilated" }).vehicles
      .length,
    0,
  );
});
test("optional equipment requires configuration or package conditions", () => {
  const c = fixtureCatalog();
  delete c.vehicles[0].trims[0].equipment.heatedSeats.conditions;
  assert.ok(
    validate(c, features).some((e) => e.includes("optional equipment needs")),
  );
});
test("verified guides, upgrades, and packages require source evidence", () => {
  const c = fixtureCatalog();
  assert.deepEqual(validate(c, features), []);
  c.vehicles[0].upgrades[0].gains[0].sourceIds = [];
  c.vehicles[0].packages[0].sourceIds = [];
  assert.ok(validate(c, features).some((e) => e.includes("upgrade gain")));
  assert.ok(validate(c, features).some((e) => e.includes("package missing")));
});
test("duplicate IDs, fabricated dates and insecure URLs fail validation", () => {
  const c = fixtureCatalog();
  c.vehicles.push(structuredClone(c.vehicles[0]));
  c.vehicles[0].sources[0].checkedAt = "2026-02-30";
  c.vehicles[0].sources[0].url = "http://example.com";
  const errors = validate(c, features);
  assert.ok(errors.some((e) => e.includes("duplicate")));
  assert.ok(errors.some((e) => e.includes("source required")));
});
