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
  assert.equal(
    eligibleOptions({
      ...catalog,
      vehicles: catalog.vehicles.filter((v) => v.status !== "verified"),
    }).length,
    0,
  ));
test("model, manufacturer and year filters compose", () => {
  assert.equal(
    searchVehicles(catalog, features, {
      query: "2026 RAV4",
      brand: "toyota",
      year: "2026",
    }).vehicles.length,
    2,
  );
  assert.equal(
    searchVehicles(catalog, features, { query: "RAV4", year: "2027" }).vehicles
      .length,
    0,
  );
});
test("feature searches do not infer pending equipment or use generic glossary as model evidence", () => {
  assert.equal(
    searchVehicles(
      {
        ...catalog,
        vehicles: catalog.vehicles.filter((v) => v.status !== "verified"),
      },
      features,
      { query: "heated seats" },
    ).vehicles.length,
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

test("RAV4 HEV brochure covers six grades and nine configurations without PHEV carryover", () => {
  const v = catalog.vehicles.find((v) => v.id === "2026-toyota-rav4");
  assert.equal(v.trims.length, 9);
  assert.equal(new Set(v.trims.map((t) => t.name)).size, 6);
  assert.equal(
    v.trims.filter((t) => t.configuration.includes("FWD")).length,
    3,
  );
  const xse = v.trims.find((t) => t.id === "xse-hev-awd");
  assert.equal(
    xse.equipment.infotainment.value,
    "12.9-inch Toyota Audio Multimedia",
  );
  assert.equal(xse.equipment.audio.value, "6 speakers");
  assert.equal(xse.equipment.parkingAutomation.status, "optional");
  assert.equal(
    v.trims.find((t) => t.id === "limited-hev-awd").equipment.parkingAutomation
      .status,
    "standard",
  );
  assert.ok(v.trims.every((t) => t.equipment.torque.status === "unverified"));
});
test("package names are evidenced without invented contents", () => {
  const v = catalog.vehicles.find((v) => v.id === "2026-toyota-rav4");
  assert.equal(v.packages.length, 8);
  assert.ok(
    v.packages.every(
      (p) =>
        p.contentsStatus === "unverified" &&
        !p.contents?.length &&
        p.sourceIds.includes("toyota-2026-rav4-brochure"),
    ),
  );
  assert.ok(
    v.packages.every((p) => p.trimIds.every((id) => !id.includes("phev"))),
  );
  const bad = structuredClone(catalog);
  bad.vehicles[0].packages[0].contents = ["Invented bundle"];
  assert.ok(
    validate(bad, features).some((e) =>
      e.includes("unverified package cannot"),
    ),
  );
});
test("PHEV stays separate with no HEV brochure equipment or package evidence", () => {
  const v = catalog.vehicles.find(
    (v) => v.id === "2026-toyota-rav4-plug-in-hybrid",
  );
  assert.equal(v.trims.length, 4);
  assert.equal(v.packages.length, 0);
  for (const t of v.trims)
    for (const cell of Object.values(t.equipment))
      assert.ok(!cell.sourceIds?.includes("toyota-2026-rav4-brochure"));
  assert.equal(
    v.trims.find((t) => t.id === "se-phev-awd").equipment.dcCharging.status,
    "unavailable",
  );
  assert.equal(
    v.trims.find((t) => t.id === "xse-phev-awd").equipment.dcCharging.status,
    "standard",
  );
  assert.equal(
    v.trims.find((t) => t.id === "woodland-phev-awd").equipment.infotainment
      .status,
    "unverified",
  );
});
test("brochure provenance and print references remain valid", () => {
  const v = catalog.vehicles[0];
  const source = v.sources.find((s) => s.delivery === "user-upload");
  assert.equal(source.pageCount, 30);
  assert.match(source.sha256, /^[a-f0-9]{64}$/);
  const bad = structuredClone(catalog);
  bad.vehicles[0].quickReference.groups[0].trimIds.push("missing");
  assert.ok(validate(bad, features).some((e) => e.includes("print groups")));
  const badOption = structuredClone(catalog);
  badOption.vehicles[0].optionalEquipment[0].sourceIds = [];
  assert.ok(
    validate(badOption, features).some((e) =>
      e.includes("optional item missing"),
    ),
  );
});

test("package-name searches never infer unverified package contents", () => {
  assert.equal(
    searchVehicles(catalog, features, { query: "Weather Package" }).vehicles
      .length,
    1,
  );
  assert.equal(
    searchVehicles(catalog, features, { query: "Weather ventilated" }).vehicles
      .length,
    0,
  );
  assert.equal(
    searchVehicles(catalog, features, { query: "XSE 9-speaker" }).vehicles
      .length,
    0,
  );
  const v = catalog.vehicles[0];
  assert.equal(
    v.trims.find((t) => t.id === "se-hev-awd").equipment.liftgate.status,
    "optional",
  );
  assert.equal(
    v.trims.find((t) => t.id === "xle-premium-hev-awd").equipment.liftgate
      .status,
    "standard",
  );
});
