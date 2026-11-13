import { createHash } from "node:crypto";
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importGmStage, digest } from "../scripts/import/gm-catalog.mjs";
import {
  gmReviewedDigest,
  prepareReviewedGm,
  reverifyGmStage,
} from "../scripts/import/gm-reviewed.mjs";
import { validate } from "../scripts/validate.mjs";
import { searchVehicles, eligibleOptions } from "../lib.js";
import { modelUpgradePaths, salesOptions } from "../presentation.js";
const read = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url)));
const catalog = read("../data/catalog.json"),
  features = read("../data/features.json"),
  report = read("../docs/imports/gm-seven-2026-2027-report.json");
const keys = [
  "2026-equinox",
  "2027-equinox",
  "2026-blazer",
  "2026-traverse",
  "2027-traverse",
  "2026-trax",
  "2027-trax",
];
const stages = keys.map((key) =>
  read(`../imports/gm-seven-2026-2027/${key}.extracted.json`),
);
const model = (key) =>
  catalog.vehicles.find(
    (v) => v.id === key.replace(/^(\d+)-/, "$1-chevrolet-"),
  );
const trim = (key, id) => model(key).trims.find((t) => t.id === id);
test("Reviewed Chevrolet batch covers seven unique model-years and 44 configurations with pinned sources", () => {
  assert.deepEqual(validate(catalog, features), []);
  assert.deepEqual(
    keys.map((key) => [key, model(key).trims.length]),
    keys.map((key, i) => [key, [6, 6, 8, 7, 9, 5, 3][i]]),
  );
  for (const [i, stage] of stages.entries()) {
    const profile = read(`../profiles/imports/gm-reviewed/${keys[i]}.json`);
    assert.equal(gmReviewedDigest(stage), profile.expectedContentSha256);
    assert.equal(stage.contentSha256, profile.expectedContentSha256);
    assert.equal(stage.source.sha256, profile.sha256);
    const raw = readFileSync(
      new URL(`../sources/gm/${stage.source.fileName}`, import.meta.url),
    );
    assert.equal(
      createHash("sha256").update(raw).digest("hex"),
      profile.sha256,
    );
    assert.equal(
      catalog.vehicles.filter((v) => v.id === model(keys[i]).id).length,
      1,
    );
  }
});
test("Toyota, Volkswagen and existing verified Equinox records remain exact; only the empty placeholder is replaced", () => {
  assert.equal(report.protectedVehicles.length, 35);
  for (const prior of report.protectedVehicles)
    assert.equal(
      digest(catalog.vehicles.find((v) => v.id === prior.id)),
      prior.sha256,
      prior.id,
    );
  assert.equal(report.placeholderReplacements.length, 1);
  const replacement = report.placeholderReplacements[0];
  assert.equal(replacement.id, "2026-chevrolet-equinox");
  assert.equal(replacement.before.status, "awaiting-verification");
  assert.equal(replacement.before.trims.length, 0);
  assert.equal(digest(model("2026-equinox")), replacement.afterSha256);
  const old = read("../imports/gm-2027-equinox/extracted.json"),
    checked = reverifyGmStage(stages[1], old, model("2027-equinox"));
  assert.equal(checked.status, "reverified");
  assert.equal(checked.movedRows.length, 2);
  const changed = structuredClone(stages[1]);
  changed.equipment[0].description += " changed";
  assert.throws(
    () => reverifyGmStage(changed, old, model("2027-equinox")),
    /differs/,
  );
});
test("Each reviewed import is idempotent and rejects changed source claims before merging", () => {
  const before = digest(catalog);
  for (const stage of stages.filter(
    (s) => s.source.model !== "Equinox" || s.source.year !== 2027,
  )) {
    const result = importGmStage(stage, catalog, features);
    assert.equal(digest(result.catalog), before);
    assert.equal(result.report.duplicate, true);
  }
  assert.equal(digest(catalog), before);
  const changed = structuredClone(stages[5]);
  changed.equipment[0].cells[0].raw = "A";
  assert.throws(() => importGmStage(changed, catalog, features), /fingerprint/);
});
test("Source choices promote only evidenced mechanical or standard-package members, never unavailable rows", () => {
  for (const stage of stages) {
    const decoded = prepareReviewedGm(stage);
    for (const change of decoded.selectionChecks.filter(
      (c) => c.status === "standard",
    )) {
      assert.match(change.raw, /^(?:A|S|■|□)/);
      assert.ok(change.descriptionCell);
      assert.ok(change.ref);
      assert.ok(
        change.reason.includes("selected") ||
          change.reason.includes("standard package"),
      );
    }
    for (const [index, c] of decoded.configurations.entries())
      for (const row of decoded.equipment)
        if (row.cells[index].raw === "--")
          assert.notEqual(
            row.cells[index].status,
            "standard",
            `${stage.source.model}/${c.id}/${row.code}`,
          );
  }
});
test("Powertrains, standard seating and towing remain configuration/year specific", () => {
  assert.match(
    trim("2026-equinox", "lt-fwd").equipment.transmission.value,
    /CVT/,
  );
  assert.match(
    trim("2026-equinox", "lt-awd").equipment.transmission.value,
    /8-speed/,
  );
  assert.match(
    trim("2027-equinox", "lt-fwd").equipment.transmission.value,
    /8-speed/,
  );
  assert.equal(
    trim("2026-equinox", "lt-fwd").equipment.horsepower.status,
    "unverified",
  );
  assert.deepEqual(
    model("2026-trax").trims.map((t) => t.name),
    ["LS", "1RS", "LT", "2RS", "ACTIV"],
  );
  assert.deepEqual(
    model("2027-trax").trims.map((t) => t.name),
    ["LT", "RS", "ACTIV"],
  );
  assert.equal(
    trim("2026-trax", "lt-fwd").equipment.horsepower.value,
    "137 hp",
  );
  assert.equal(
    trim("2027-trax", "lt-fwd").equipment.horsepower.value,
    "140 hp",
  );
  assert.match(
    trim("2026-trax", "lt-fwd").equipment.engine.value,
    /@ 2500 rpm/,
  );
  assert.match(
    trim("2027-trax", "lt-fwd").equipment.engine.value,
    /@ 4000 rpm/,
  );
  assert.equal(
    trim("2027-trax", "lt-fwd").equipment.adaptiveCruiseControl.status,
    "standard",
  );
  assert.equal(
    trim("2026-trax", "lt-fwd").equipment.adaptiveCruiseControl.status,
    "not-standard",
  );
  assert.equal(
    trim("2027-trax", "lt-fwd").equipment.heatedSeats.status,
    "not-standard",
  );
  assert.equal(
    trim("2027-trax", "rs-fwd").equipment.heatedSeats.status,
    "standard",
  );
  assert.equal(
    trim("2026-blazer", "rs-fwd-lsy").equipment.horsepower.value,
    "228 hp",
  );
  assert.equal(
    trim("2026-blazer", "rs-fwd-lgx").equipment.horsepower.value,
    "308 hp",
  );
  for (const [id, rating] of [
    ["2lt-fwd", "1500 lb"],
    ["2lt-awd", "3250 lb"],
    ["rs-fwd-lgx", "4500 lb"],
    ["rs-awd-lgx", "4500 lb"],
  ])
    assert.match(
      trim("2026-blazer", id).equipment.towing.value,
      new RegExp(rating),
    );
  assert.equal(
    trim("2026-blazer", "rs-fwd-lsy").equipment.curbWeight.status,
    "unverified",
  );
  assert.match(
    trim("2026-blazer", "rs-fwd-lsy").equipment.engine.conditions,
    /Not available at start of production/,
  );
  for (const key of ["2026-traverse", "2027-traverse"])
    for (const t of model(key).trims) {
      assert.match(t.equipment.seating.value, /^7 passengers/);
      assert.match(t.equipment.towing.value, /5000 lb/);
      assert.equal(t.equipment.msrp.status, "unverified");
    }
  assert.ok(model("2027-traverse").notes.some((n) => n.includes("1SL/2SL")));
  assert.match(
    trim("2027-traverse", "high-country-fwd").equipment.drivetrain.conditions,
    /late availability/,
  );
});
test("Factory-standard cross-model evidence supports actual Super Cruise and preserves documented source conflicts", () => {
  const found = searchVehicles(catalog, features, { query: "Super Cruise" })
    .vehicles.map((v) => v.id)
    .sort();
  assert.deepEqual(found, [
    "2026-chevrolet-traverse",
    "2027-chevrolet-traverse",
  ]);
  for (const key of ["2026-traverse", "2027-traverse"]) {
    assert.equal(
      trim(key, "lt-fwd").equipment.superCruise.status,
      "not-standard",
    );
    assert.equal(
      trim(key, "high-country-fwd").equipment.superCruise.status,
      "standard",
    );
    assert.match(
      trim(key, "high-country-fwd").equipment.superCruise.value,
      /3 years/,
    );
    const r = report.jobs.find((j) => j.id === model(key).id);
    assert.ok(r.ambiguous.some((a) => a.feature === "UKM"));
  }
  for (const v of catalog.vehicles.filter((v) =>
    keys.some((k) => model(k) === v),
  ))
    for (const t of v.trims)
      for (const c of Object.values(t.equipment))
        if (c.status === "standard") {
          assert.ok(c.sourceIds?.length);
          assert.ok(c.sourceCells || c.sourceSections || c.sourcePages);
        }
});

test("Reviewed print summaries retain only cited source changes and equipment stays complete online", () => {
  for (const key of keys.filter((key) => key !== "2027-equinox")) {
    const v = model(key);
    assert.ok(v.quickReference.modelYearChangeItems.length <= 5);
    for (const item of v.quickReference.modelYearChangeItems)
      assert.ok(
        v.modelYearChanges.items.some(
          (full) => JSON.stringify(full) === JSON.stringify(item),
        ),
      );
    assert.ok(v.quickReference.standardSpecFields.includes("towing"));
    assert.ok(v.trims.every((t) => Object.keys(t.equipment).length > 50));
  }
});

test("All Chevrolet guides have sourced upgrade paths; AutoSense liftgates and manual gates use shared categories", () => {
  for (const key of keys) {
    const v = model(key);
    const options = salesOptions(
      eligibleOptions(catalog).filter((o) => o.vehicle.id === v.id),
    );
    const paths = modelUpgradePaths(catalog, options);
    assert.ok(paths.length > 0, key);
    for (const path of paths)
      for (const gain of path.gains) assert.equal(gain.cell.status, "standard");
  }
  for (const key of ["2026-traverse", "2027-traverse"])
    for (const t of model(key).trims) {
      assert.equal(t.equipment.liftgate.status, "standard");
      assert.match(t.equipment.liftgate.value, /AutoSense Power Liftgate/);
      assert.equal(t.equipment.steeringWheelType.status, "standard");
    }
  for (const key of ["2026-trax", "2027-trax"])
    for (const t of model(key).trims)
      assert.equal(t.equipment.manualLiftgate.status, "standard");
});
