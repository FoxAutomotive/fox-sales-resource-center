import test from "node:test";
import assert from "node:assert/strict";
import { readFile, mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { importGmStage, digest } from "../scripts/import/gm-catalog.mjs";
import { validate } from "../scripts/validate.mjs";
import { comparisonRows, eligibleOptions, searchVehicles } from "../lib.js";
const load = async (path) =>
  JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));
const [catalog, features, stage, supplement, report] = await Promise.all(
  [
    "../data/catalog.json",
    "../data/features.json",
    "../imports/gm-2027-equinox/extracted.json",
    "../profiles/imports/gm-supplements/2027-equinox.json",
    "../docs/imports/gm-2027-equinox-report.json",
  ].map(load),
);
const vehicle = catalog.vehicles.find((v) => v.id === "2027-chevrolet-equinox");
const base = {
  ...catalog,
  vehicles: catalog.vehicles.filter((v) => v.id !== vehicle.id),
};
const trim = (name, drive = "FWD") =>
  vehicle.trims.find((t) => t.name === name && t.configuration === drive);
const archive = resolve("sources/gm/2027 Chevrolet Truck Equinox Export.xlsx");

test("GM original workbook and all existing Toyota/VW records remain preserved", async () => {
  const bytes = await readFile(archive);
  const { createHash } = await import("node:crypto");
  assert.equal(
    createHash("sha256").update(bytes).digest("hex"),
    stage.source.sha256,
  );
  assert.equal(report.protectedVehicles.length, 20);
  for (const p of report.protectedVehicles)
    assert.equal(
      digest(catalog.vehicles.find((v) => v.id === p.id)),
      p.sha256,
      p.id,
    );
  assert.deepEqual(
    [...new Set(vehicle.trims.map((t) => t.name))],
    ["LT", "ACTIV", "RS"],
  );
  assert.equal(vehicle.trims.length, 6);
  assert.equal(
    eligibleOptions(catalog).filter((o) => o.vehicle.id === vehicle.id).length,
    6,
  );
});

test("standard packages keep their verified children without promoting optional packages", () => {
  const job = report.jobs[0];
  assert.equal(job.standardPackageChecks.length, 70);
  assert.ok(job.standardPackageChecks.every((c) => c.confirmed));
  assert.deepEqual(job.standardCounts, {
    "LT FWD": 92,
    "LT AWD": 92,
    "ACTIV FWD": 100,
    "ACTIV AWD": 100,
    "RS FWD": 100,
    "RS AWD": 100,
  });
  for (const t of vehicle.trims) {
    assert.equal(t.equipment.heatedSeats.status, "standard");
    assert.equal(t.equipment.heatedWheel.status, "standard");
    assert.equal(t.equipment.adaptiveCruiseControl.status, "standard");
    for (const field of [
      "roof",
      "panoramicRoof",
      "areaView",
      "ventilatedSeats",
      "rearHeatedSeats",
    ])
      assert.equal(t.equipment[field].status, "not-standard");
    assert.ok(
      Object.values(t.equipment).every(
        (c) => !["optional", "unavailable"].includes(c.status),
      ),
    );
  }
  assert.equal(trim("LT").equipment.wirelessCharging.status, "not-standard");
  assert.match(trim("LT").equipment.frontSeats.value, /6-way manual/);
  assert.match(trim("LT").equipment.upholstery.value, /Cloth/);
  for (const name of ["RS", "ACTIV"]) {
    assert.equal(trim(name).equipment.wirelessCharging.status, "standard");
    assert.equal(trim(name).equipment.liftgate.status, "standard");
    assert.match(trim(name).equipment.frontSeats.value, /8-way power/);
    assert.match(trim(name).equipment.climate.value, /dual-zone/);
  }
  assert.match(trim("ACTIV").equipment.upholstery.value, /Sueded Microfiber/);
  assert.match(trim("RS").equipment.upholstery.value, /Evotex/);
  assert.equal(vehicle.packages.length, 0);
  assert.ok(!JSON.stringify(vehicle).includes("Convenience Package III"));
  assert.equal(
    searchVehicles(catalog, features, {
      brand: "chevrolet",
      year: "2027",
      query: "ventilated seats",
    }).vehicles.length,
    0,
  );
});

test("FWD/AWD technical facts and standard tire sizes match workbook columns", () => {
  for (const t of vehicle.trims) {
    assert.match(t.equipment.engine.value, /1.5L Turbo DOHC 4-cylinder/);
    assert.match(t.equipment.transmission.value, /8-speed automatic/);
    assert.equal(t.equipment.horsepower.value, "175 hp");
    assert.equal(t.equipment.torque.value, "203 lb-ft");
    assert.equal(
      t.equipment.fuel.value,
      t.configuration === "FWD"
        ? "14.8 U.S. gal (56.0 L)"
        : "15.6 U.S. gal (59.0 L)",
    );
    assert.match(t.equipment.dimensions.value, /183.20.*74.90.*65.60/);
    assert.match(t.equipment.wheelbase.value, /107.50/);
    assert.match(t.equipment.headroom.value, /40.00.*39.20/);
    assert.doesNotMatch(t.equipment.headroom.value, /38.20|37.80/);
    assert.match(t.equipment.legroom.value, /40.90.*39.90/);
    assert.match(t.equipment.cargo.value, /63.5.*29.8/);
    assert.match(t.equipment.seating.value, /5 passengers/);
    for (const f of [
      "economy",
      "towing",
      "groundClearance",
      "passengerVolume",
      "msrp",
    ])
      assert.equal(t.equipment[f].status, "unverified");
  }
  assert.match(trim("LT").equipment.curbWeight.value, /3428/);
  assert.match(trim("LT", "AWD").equipment.curbWeight.value, /3583/);
  assert.match(trim("RS", "AWD").equipment.curbWeight.value, /3629/);
  assert.match(trim("ACTIV").equipment.tires.value, /235\/65R17, all-terrain/);
  assert.match(trim("RS").equipment.tires.value, /235\/55R19/);
});

test("colors preserve trim and material eligibility and GM changes omit optional cameras", () => {
  assert.equal(vehicle.colors.exteriors.length, 8);
  assert.equal(vehicle.colors.interiors.length, 5);
  assert.equal(vehicle.colors.roofs.length, 2);
  const color = (name) => vehicle.colors.exteriors.find((c) => c.name === name);
  assert.deepEqual(color("Autumn Harvest Metallic").trims, ["LT", "ACTIV"]);
  assert.deepEqual(color("Summit White").trims, ["LT"]);
  assert.deepEqual(color("Reef Blue Metallic").trims, ["ACTIV", "RS"]);
  const gray = vehicle.colors.interiors.find((c) => c.name === "Artemis Gray");
  assert.equal(gray.trim, "LT");
  assert.equal(gray.standard, false);
  assert.ok(
    !vehicle.colors.roofs
      .find((c) => /Mosaic Black/.test(c.name))
      .combinations.find((c) => c.trim === "LT")
      .exteriors.includes("Mosaic Black Metallic"),
  );
  const changes = JSON.stringify(vehicle.modelYearChanges.items);
  for (const text of [
    "Autumn Harvest",
    "Eight Speed",
    "Torch Red",
    "Cacti Green",
    "CVT",
  ])
    assert.ok(changes.includes(text));
  assert.ok(!changes.includes("Connected Cameras"));
});

test("Differences Only keeps common engine context without optional availability or a base panel", () => {
  const options = ["LT", "RS", "ACTIV"].map((name) => ({
    vehicle,
    trim: trim(name),
  }));
  const rows = comparisonRows(catalog, options);
  assert.ok(rows.find((r) => r.id === "engine"));
  assert.deepEqual(
    rows.find((r) => r.id === "wirelessCharging").cells.map((c) => c.status),
    ["not-standard", "standard", "standard"],
  );
  assert.ok(!rows.find((r) => r.id === "areaView"));
  assert.ok(
    rows.every((r) =>
      r.cells.every((c) => !["optional", "unavailable"].includes(c.status)),
    ),
  );
  const vw = catalog.vehicles.find((v) => v.id === "2027-volkswagen-tiguan");
  const mixed = comparisonRows(
    catalog,
    [options[0], { vehicle: vw, trim: vw.trims[2] }],
    { differenceOnly: false },
  );
  assert.ok(mixed.every((r) => r.cells.every((c) => c.status !== "optional")));
});

test("GM imports are idempotent and changed sources or bad references require review", () => {
  assert.deepEqual(
    importGmStage(stage, base, features, supplement).catalog,
    catalog,
  );
  assert.deepEqual(
    importGmStage(stage, catalog, features, supplement).catalog,
    catalog,
  );
  const changed = structuredClone(stage);
  changed.source.sha256 = "0".repeat(64);
  assert.throws(
    () => importGmStage(changed, catalog, features, supplement),
    /different verified source/,
  );
  const broken = structuredClone(catalog);
  broken.vehicles.find(
    (v) => v.id === vehicle.id,
  ).trims[0].equipment.engine.sourceCells[vehicle.sources[0].id] = [
    "Mechanical!D99999",
  ];
  assert.ok(
    validate(broken, features).some((e) =>
      e.includes("invalid worksheet/cell"),
    ),
  );
  const conflict = structuredClone(stage);
  conflict.equipment.find(
    (r) => r.sheet === "Standard Equipment" && r.code === "KA1",
  ).cells[0].status = "not-standard";
  const result = importGmStage(conflict, base, features, supplement);
  assert.ok(result.report.ambiguous.length);
  assert.equal(
    result.catalog.vehicles.at(-1).trims[0].equipment.heatedSeats.status,
    "unverified",
  );
});

test("GM batch isolates failed files and rejects duplicate vehicle records", async () => {
  const temp = await mkdtemp(join(tmpdir(), "gm-batch-"));
  try {
    const basePath = join(temp, "base.json");
    await writeFile(basePath, JSON.stringify(base));
    const bad = join(temp, "broken.xlsx");
    await writeFile(bad, "not an Excel file");
    execFileSync(
      process.execPath,
      [
        "scripts/import/import-gm.mjs",
        "--xlsx",
        bad,
        archive,
        archive,
        "--base",
        basePath,
        "--out",
        temp,
      ],
      { stdio: "pipe" },
    );
    const batch = JSON.parse(await readFile(join(temp, "report.json"), "utf8"));
    assert.deepEqual(
      batch.jobs.map((j) => j.status),
      ["failed", "imported", "duplicate"],
    );
    const candidate = JSON.parse(
      await readFile(join(temp, "catalog.candidate.json"), "utf8"),
    );
    assert.equal(
      candidate.vehicles.filter((v) => v.id === vehicle.id).length,
      1,
    );
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
});

test("GM service duration is read from each export rather than carried to future models", () => {
  const future = structuredClone(stage);
  for (const row of future.equipment)
    if (row.description.startsWith("OnStar Basics"))
      row.description = row.description.replace(
        "standard for 8 years",
        "standard for 6 years",
      );
  const result = importGmStage(future, base, features, supplement);
  assert.match(
    result.catalog.vehicles.at(-1).trims[0].equipment.telematics.value,
    /OnStar Basics, 6 years/,
  );
});
