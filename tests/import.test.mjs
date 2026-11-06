import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, mkdtemp, writeFile, rm } from "node:fs/promises";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { comparisonRows } from "../lib.js";
import { importCatalog } from "../scripts/import/catalog-import.mjs";
import { fixtureVehicle } from "./fixtures.mjs";
const read = async (path) =>
  JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));
const [stage, catalog, features, report] = await Promise.all(
  [
    "../imports/vw-my26-cw41/extracted.json",
    "../data/catalog.json",
    "../data/features.json",
    "../docs/imports/vw-my26-cw41-report.json",
  ].map(read),
);
const digest = (x) =>
  createHash("sha256").update(JSON.stringify(x)).digest("hex");
const model = (id) =>
  catalog.vehicles.find((v) => v.id === `2026-volkswagen-${id}`);
const trim = (id, code) => model(id).trims.find((t) => t.salesCode === code);

test("reviewed source covers all 49 pages, nine models, 43 unique sales configurations", () => {
  assert.equal(stage.pages.length, 49);
  assert.deepEqual(
    stage.pages.map((p) => p.page),
    Array.from({ length: 49 }, (_, i) => i + 1),
  );
  assert.equal(stage.models.length, 9);
  assert.equal(
    stage.models.reduce((n, m) => n + m.configurations.length, 0),
    43,
  );
  for (const m of stage.models) {
    assert.equal(
      new Set(m.configurations.map((c) => c.salesCode)).size,
      m.configurations.length,
    );
    assert.equal(model(m.id).trims.length, m.configurations.length);
    for (const t of model(m.id).trims)
      for (const [id, c] of Object.entries(t.equipment))
        if (id.startsWith("vw-order-") && c.status !== "unverified") {
          assert.deepEqual(c.sourceIds, [stage.source.sourceId]);
          assert.ok(c.sourcePages[stage.source.sourceId]);
        }
  }
});

test("retail-only extraction does not publish the original PDF or dealer cost values", async () => {
  const serialized = JSON.stringify({ stage, catalog, report });
  assert.ok(
    !/"(?:dealerInvoice|invoicePrice|dealerPrice|costPrice)"/i.test(serialized),
  );
  assert.equal(stage.financialAudit.passed, true);
  assert.equal(stage.financialAudit.privateValuesEmitted, false);
  assert.equal(stage.financialAudit.costColumnAmountsExcluded, 74);
  assert.equal(
    trim("atlas", "CA33PZ").equipment.msrp.value,
    "$39,310 starting MSRP",
  );
  assert.equal(
    trim("jetta-gli", "BU59V2").equipment.msrp.value,
    "$33,745 starting MSRP",
  );
  const invalid = structuredClone(stage);
  invalid.models[0].configurations[0].dealerInvoice = 999;
  assert.throws(() => importCatalog(invalid, catalog, features), /Forbidden/);
});

test("drivetrain columns and GLI transmission restrictions never inherit another configuration", () => {
  assert.equal(
    trim("taos", "CL22SZ").equipment.heatedSeats.status,
    "unavailable",
  );
  assert.equal(trim("taos", "CL22SR").equipment.heatedSeats.status, "standard");
  assert.match(trim("tiguan", "RM12PS").equipment.torque.value, /207 lb-ft/);
  assert.match(trim("tiguan", "RM12PJ").equipment.torque.value, /221 lb-ft/);
  const manual = trim("jetta-gli", "BU59V2"),
    auto = trim("jetta-gli", "BU59VZ");
  assert.equal(manual.equipment.assistance.status, "standard");
  assert.equal(manual.equipment.remoteStart.status, "unavailable");
  assert.equal(auto.equipment.remoteStart.status, "standard");
  assert.equal(manual.equipment.adaptiveCruiseControl.status, "standard");
  const emergency = Object.values(manual.equipment).find((c) =>
    c.value?.startsWith("Emergency Assist"),
  );
  assert.equal(emergency.status, "unavailable");
  const emergencyAuto = Object.values(auto.equipment).find((c) =>
    c.value?.startsWith("Emergency Assist"),
  );
  assert.equal(emergencyAuto.status, "standard");
  assert.equal(
    trim("atlas", "CA33PZ").equipment.heatedSeats.status,
    "standard",
  );
  assert.equal(
    trim("atlas", "CA33PZ").equipment.ventilatedSeats.status,
    "standard",
  );
});

test("Golf R standard equipment deleted by POA remains explicitly conditional", () => {
  const t = trim("golf-r", "DA1RPT");
  for (const field of ["roof", "panoramicRoof", "ventilatedSeats"]) {
    assert.equal(t.equipment[field].status, "standard");
    assert.match(t.equipment[field].conditions, /POA/);
    assert.match(t.equipment[field].conditions, /removed|deleted|replaced/);
  }
  const p = model("golf-r").packages.find(
    (p) => p.id.includes("poa") && p.status === "optional",
  );
  assert.match(p.description, /solid roof/);
  assert.match(p.description, /ventilation removed/);
});

test("package eligibility, contents and nonorderable production exceptions are explicit", () => {
  const v = model("taos"),
    fwd = trim("taos", "CL23SZ"),
    awd = trim("taos", "CL23SR");
  assert.ok(
    v.packages
      .find((p) => p.id.includes("p35") && p.status === "optional")
      .trimIds.includes(fwd.id),
  );
  assert.ok(
    v.packages
      .find((p) => p.id.includes("p35") && p.status === "unavailable")
      .trimIds.includes(awd.id),
  );
  for (const v of catalog.vehicles.filter(
    (v) => v.brand === "volkswagen" && v.year === 2026,
  ))
    for (const p of v.packages.filter((p) => p.id.startsWith("vw-order-"))) {
      assert.equal(p.contentsStatus, "verified");
      assert.ok(p.contents.length);
      assert.ok(p.sourcePages[stage.source.sourceId]);
    }
  const cross = model("atlas-cross-sport");
  const roadside = cross.listedOptions.filter((p) => p.name.includes("(ARK)"));
  assert.ok(
    roadside
      .find((p) => p.status === "unavailable")
      .trimIds.includes(trim("atlas-cross-sport", "CMD3PZ").id),
  );
  assert.ok(
    roadside
      .find((p) => p.status === "optional")
      .trimIds.includes(trim("atlas-cross-sport", "CMD3PR").id),
  );
  const gliOptions = model("jetta-gli").listedOptions.filter((p) =>
    p.name.includes("(EXU)"),
  );
  assert.ok(
    gliOptions
      .find((p) => p.status === "unavailable")
      .trimIds.includes(trim("jetta-gli", "BU59V2").id),
  );
  assert.ok(
    gliOptions
      .find((p) => p.status === "optional")
      .trimIds.includes(trim("jetta-gli", "BU59VZ").id),
  );
  assert.equal(
    trim("atlas", "CA33PZ").equipment.remoteStart.status,
    "optional",
  );
  assert.match(
    trim("atlas", "CA33PZ").equipment.remoteStart.conditions,
    /Market-delivery/,
  );
  const notOrderable = model("tiguan").listedOptions.find((p) =>
    p.name.includes("EXR"),
  );
  assert.equal(notOrderable.status, "unavailable");
  assert.match(notOrderable.conditions, /NOT YET ORDERABLE/);
  assert.ok(
    !model("tiguan").listedOptions.some((p) =>
      p.name.includes("Paddle Shifter Credit"),
    ),
  );
});

test("TBA prices and missing measurements stay unknown without erasing Tiguan or other vehicles", () => {
  for (const t of model("id4").trims) {
    assert.equal(t.equipment.msrp.status, "unverified");
    assert.match(t.equipment.msrp.conditions, /TBA/);
    assert.equal(t.equipment.horsepower.status, "unverified");
    assert.equal(t.equipment.torque.status, "unverified");
  }
  for (const protectedVehicle of report.protectedVehicles)
    assert.equal(
      digest(catalog.vehicles.find((v) => v.id === protectedVehicle.id)),
      protectedVehicle.sha256,
    );
  for (const p of report.protectedExistingCells) {
    const t = catalog.vehicles
      .find((v) => v.id === p.vehicleId)
      .trims.find((t) => t.id === p.trimId);
    assert.equal(
      digest(Object.fromEntries(p.fields.map((f) => [f, t.equipment[f]]))),
      p.sha256,
    );
  }
  assert.equal(report.sourceConflicts.length, 3);
  assert.equal(report.manualVerification.length, 2);
});

test("import is idempotent and rejects incomplete pages, duplicate sales codes and changed column counts", () => {
  assert.deepEqual(importCatalog(stage, catalog, features).catalog, catalog);
  for (const modify of [
    (s) => s.pages.pop(),
    (s) => s.models.pop(),
    (s) => s.models[0].rows.pop(),
    (s) => s.models[0].configurations.pop(),
    (s) => s.models[0].configurations.push(s.models[0].configurations[0]),
    (s) => s.models[0].rows[0].cells.pop(),
  ]) {
    const invalid = structuredClone(stage);
    modify(invalid);
    assert.throws(() => importCatalog(invalid, catalog, features));
  }
});

test("local apply refuses an unreviewed candidate digest and stale base", async () => {
  const dir = await mkdtemp(join(tmpdir(), "vw-import-"));
  try {
    await writeFile(
      join(dir, "catalog.candidate.json"),
      JSON.stringify(catalog),
    );
    await writeFile(
      join(dir, "report.json"),
      JSON.stringify({ baseSha256: "stale" }),
    );
    await writeFile(join(dir, "base.json"), JSON.stringify(catalog));
    await writeFile(join(dir, "features.json"), JSON.stringify(features));
    const run = (sha) =>
      spawnSync(
        process.execPath,
        [
          "scripts/import/apply-import.mjs",
          "--review-dir",
          dir,
          "--expected-sha256",
          sha,
          "--catalog",
          join(dir, "base.json"),
          "--features",
          join(dir, "features.json"),
        ],
        { encoding: "utf8" },
      );
    assert.match(run("wrong").stderr, /Candidate changed/);
    assert.match(run(digest(catalog)).stderr, /Catalog changed/);
    assert.deepEqual(
      JSON.parse(await readFile(join(dir, "base.json"), "utf8")),
      catalog,
    );
    const initial = { ...catalog, importReviewMarker: true };
    await writeFile(join(dir, "base.json"), JSON.stringify(initial));
    await writeFile(
      join(dir, "report.json"),
      JSON.stringify({ baseSha256: digest(initial) }),
    );
    const applied = run(digest(catalog));
    assert.equal(applied.status, 0, applied.stderr);
    assert.deepEqual(
      JSON.parse(await readFile(join(dir, "base.json"), "utf8")),
      catalog,
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("numeric source conflicts are flagged without overwriting verified Tiguan output", () => {
  const changed = structuredClone(stage);
  const row = changed.models
    .find((m) => m.id === "tiguan")
    .rows.find(
      (r) => r.label.includes("201 HP") && r.label.includes("207 ft-lbs"),
    );
  row.label = row.label.replace("201 HP", "999 HP");
  const result = importCatalog(changed, catalog, features);
  assert.ok(
    result.report.conflicts.some(
      (c) => c.field === "horsepower" && c.incoming.value === "999 hp",
    ),
  );
  assert.equal(
    result.catalog.vehicles
      .find((v) => v.id === model("tiguan").id)
      .trims.find((t) => t.salesCode === "RM12PS").equipment.horsepower.value,
    trim("tiguan", "RM12PS").equipment.horsepower.value,
  );
});

test("PDF wrapper refuses unknown documents before selecting an adapter", async () => {
  const dir = await mkdtemp(join(tmpdir(), "unknown-pdf-"));
  try {
    const path = join(dir, "unknown.pdf");
    await writeFile(path, "unrecognized document fixture");
    const result = spawnSync(
      process.execPath,
      [
        "scripts/import/import-pdf.mjs",
        "--pdf",
        path,
        "--out",
        join(dir, "review"),
      ],
      { encoding: "utf8" },
    );
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /No unique reviewed profile/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("source-specific matrix rows do not create false cross-brand unknowns beside canonical features", () => {
  const rv = catalog.vehicles.find((v) => v.id === "2026-toyota-rav4");
  const vw = model("tiguan");
  const rows = comparisonRows(
    catalog,
    [
      { vehicle: rv, trim: rv.trims[2] },
      { vehicle: vw, trim: trim("tiguan", "RM13PS") },
    ],
    { differenceOnly: false },
  );
  assert.ok(rows.every((r) => !r.id.startsWith("vw-order-")));
  assert.equal(rows.filter((r) => r.id === "heatedSeats").length, 1);
  const climate = comparisonRows(
    catalog,
    [
      { vehicle: model("atlas"), trim: trim("atlas", "CA33PZ") },
      { vehicle: vw, trim: trim("tiguan", "RM13PS") },
    ],
    { differenceOnly: false },
  ).find((r) => r.id === "climate");
  assert.ok(climate.cells.every((c) => c.status === "standard"));
  const sameModel = comparisonRows(
    catalog,
    [
      { vehicle: vw, trim: vw.trims[0] },
      { vehicle: vw, trim: vw.trims[2] },
    ],
    { differenceOnly: false },
  );
  assert.ok(sameModel.some((r) => r.id.startsWith("vw-order-")));
});
