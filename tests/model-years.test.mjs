import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import {
  importCatalog,
  markdownReport,
} from "../scripts/import/catalog-import.mjs";
import { validate } from "../scripts/validate.mjs";
import { eligibleOptions, searchVehicles, comparisonRows } from "../lib.js";
const load = async (path) =>
  JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));
const [catalog, features, stage, report] = await Promise.all(
  [
    "../data/catalog.json",
    "../data/features.json",
    "../imports/vw-my27-retail-cw43/extracted.json",
    "../docs/imports/vw-my27-retail-cw43-report.json",
  ].map(load),
);
const model = (id) =>
  catalog.vehicles.find((v) => v.id === `2027-volkswagen-${id}`);
const trim = (id, code) => model(id).trims.find((t) => t.salesCode === code);
const cell = (id, code, field) => trim(id, code).equipment[field];
const digest = (x) =>
  createHash("sha256").update(JSON.stringify(x)).digest("hex");
test("2027 imports all 41 reviewed pages, eight models and 38 configurations without changing existing vehicles", () => {
  assert.equal(stage.pages.length, 41);
  assert.equal(stage.models.length, 8);
  assert.equal(report.summary.configurations, 38);
  assert.equal(report.summary.equipmentFieldsPopulated, 6120);
  assert.equal(report.summary.manualVerification, 0);
  assert.equal(report.protectedVehicles.length, 12);
  for (const p of report.protectedVehicles)
    assert.equal(
      digest(catalog.vehicles.find((v) => v.id === p.id)),
      p.sha256,
      p.id,
    );
  for (const m of stage.models) {
    assert.equal(model(m.id).trims.length, m.configurations.length);
    assert.equal(model(m.id).additionalFields.length, m.rows.length);
    assert.deepEqual(
      model(m.id).trims.map((t) => t.name),
      m.configurations.map((c) => c.trim),
    );
    for (const t of model(m.id).trims) {
      for (const c of Object.values(t.equipment))
        if (c.status !== "unverified") {
          assert.deepEqual(c.sourceIds, [stage.source.sourceId]);
          assert.ok(c.sourcePages[stage.source.sourceId]);
        }
    }
  }
  assert.equal(
    eligibleOptions(catalog).filter((o) => o.vehicle.year === 2027).length,
    38,
  );
  assert.equal(
    searchVehicles(catalog, features, { year: "2027", brand: "volkswagen" })
      .vehicles.length,
    8,
  );
  assert.equal(
    searchVehicles(catalog, features, { year: "2027", brand: "toyota" })
      .vehicles.length,
    0,
  );
  assert.equal(model("id4"), undefined);
});
test("drivetrain qualifiers resolve Taos heating, wheels and package restrictions independently", () => {
  assert.equal(cell("taos", "CL22SZ", "heatedSeats").status, "unavailable");
  assert.equal(cell("taos", "CL22SR", "heatedSeats").status, "standard");
  assert.equal(cell("taos", "CL27SZ", "heatedSeats").status, "unavailable");
  assert.equal(cell("taos", "CL27SR", "heatedSeats").status, "standard");
  assert.match(cell("taos", "CL27SZ", "wheels").value, /18” black.*F04/);
  assert.match(cell("taos", "CL27SR", "wheels").value, /18” black.*48J/);
  assert.match(cell("taos", "CL26SR", "wheels").value, /19” black.*53P/);
  const packages = model("taos").packages.filter(
    (p) => p.name.includes("(P01)") && p.status === "optional",
  );
  assert.deepEqual(packages.flatMap((p) => p.trimIds).sort(), [
    "cl23sr",
    "cl23sz",
  ]);
  const luggage = model("taos").listedOptions.find(
    (p) => p.name.includes("(SLN)") && p.status === "optional",
  );
  assert.ok(
    luggage.trimIds.every(
      (id) =>
        model("taos").trims.find((t) => t.id === id).configuration === "FWD",
    ),
  );
});
test("new-year powertrains, TBA pricing and genuine technical gaps do not inherit 2026", () => {
  for (const id of ["atlas", "atlas-cross-sport"]) {
    assert.equal(model(id).trims.length, 6);
    for (const t of model(id).trims) {
      assert.equal(t.equipment.horsepower.value, "282 hp");
      assert.equal(t.equipment.torque.value, "258 lb-ft");
    }
  }
  assert.equal(cell("tiguan", "RM12PS", "torque").value, "207 lb-ft");
  assert.equal(cell("tiguan", "RM12PJ", "torque").value, "221 lb-ft");
  assert.equal(cell("tiguan", "RM14QJ", "horsepower").value, "268 hp");
  assert.equal(model("jetta-gli").trims.length, 1);
  assert.match(
    cell("jetta-gli", "BU59VZ", "transmission").value,
    /7-speed DSG/,
  );
  for (const m of stage.models)
    for (const t of model(m.id).trims)
      assert.equal(t.equipment.economy.status, "unverified");
  assert.ok(
    catalog.vehicles.find((v) => v.id === "2026-volkswagen-tiguan").trims[0]
      .equipment.economy.value,
  );
  assert.ok(
    model("atlas-cross-sport").trims.every(
      (t) => t.equipment.msrp.status === "unverified",
    ),
  );
  assert.match(cell("tiguan", "RM12PS", "msrp").value, /31,205/);
  assert.match(cell("golf-r", "DA1BPT", "msrp").value, /51,500/);
});
test("production exceptions, source conflicts and service/region notes remain visible", () => {
  assert.equal(cell("tiguan", "RM1VPS", "heatedWheel").status, "standard");
  assert.match(cell("tiguan", "RM1VPS", "heatedWheel").conditions, /2PD/);
  assert.doesNotMatch(
    cell("tiguan", "RM14QJ", "heatedWheel").conditions || "",
    /2PD/,
  );
  assert.ok(!model("tiguan").packages.some((p) => p.name.includes("2PD")));
  assert.equal(report.sourceConflicts.length, 1);
  assert.equal(report.sourceConflicts[0].optionCode, "PJ2");
  assert.match(model("atlas").sourcePageNotes[0].text, /Puerto Rico/);
  assert.match(
    cell("atlas", "DJ15WJ", "parkingAutomation").conditions,
    /Puerto Rico/,
  );
  assert.equal(cell("atlas", "DJ13WS", "voiceControl").status, "standard");
  assert.match(cell("golf-r", "DA1BPT", "appearance").value, /Black Edition/);
});
test("year-change claims require a matching baseline and page-specific sources for both years", () => {
  assert.deepEqual(validate(catalog, features), []);
  for (const m of stage.models) {
    const review = model(m.id).modelYearChanges;
    assert.equal(review.baselineVehicleId, `2026-volkswagen-${m.id}`);
    assert.ok(review.items.length >= 2);
    assert.ok(
      review.items.every(
        (i) =>
          i.sourcePages[stage.source.sourceId] &&
          i.baselineSourcePages["vw-my26-order-cw41-2025"],
      ),
    );
  }
  const broken = structuredClone(catalog);
  broken.vehicles.find(
    (v) => v.id === model("atlas").id,
  ).modelYearChanges.items[0].baselineSourcePages = {};
  assert.ok(
    validate(broken, features).some((e) =>
      e.includes("source pages for both years"),
    ),
  );
  const old = catalog.vehicles.find((v) => v.id === "2026-volkswagen-tiguan");
  const rows = comparisonRows(catalog, [
    {
      vehicle: old,
      trim: old.trims.find((t) => t.id === "se-r-line-black-fwd"),
    },
    { vehicle: model("tiguan"), trim: trim("tiguan", "RM1VPS") },
  ]);
  assert.deepEqual(
    rows.find((r) => r.id === "heatedWheel").cells.map((c) => c.status),
    ["unavailable", "standard"],
  );
  assert.equal(
    rows.find((r) => r.id === "economy").cells[1].status,
    "unverified",
  );
});
test("2027 import remains idempotent and report text uses the current edition", () => {
  assert.deepEqual(importCatalog(stage, catalog, features).catalog, catalog);
  const incomplete = structuredClone(stage);
  incomplete.models[0].options.pop();
  assert.throws(
    () => importCatalog(incomplete, catalog, features),
    /alignment/,
  );
  const markdown = markdownReport(report);
  assert.match(markdown, /CW43-2026/);
  assert.doesNotMatch(markdown, /Eight new guides \/ 36|49 pages.*processed/);
});
