import { assertHistoricalVehicle } from "./historical-preservation.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdtempSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  importToyotaBatch,
  toyotaContentDigest,
} from "../scripts/import/toyota-catalog.mjs";
import { resolveCell, searchVehicles } from "../lib.js";
const read = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url)));
const catalog = read("../data/catalog.json"),
  features = read("../data/features.json");
const entries = ["tacoma", "sienna", "grandhighlander", "rav4"].map((key) => {
  const profile = read(`../profiles/imports/toyota/2026-${key}.json`);
  return {
    profile,
    stage: read(
      `../imports/toyota-2026-brochures/${profile.id}.extracted.json`,
    ),
  };
});
const report = read("../docs/imports/toyota-2026-brochures-report.json");
const hash = (value) =>
  createHash("sha256")
    .update(typeof value === "string" ? value : JSON.stringify(value))
    .digest("hex");
const vehicle = (key) =>
  catalog.vehicles.find((v) => v.id === `2026-toyota-${key}`);

test("Toyota batch covers all supplied pages and matrix columns with reviewed fingerprints", () => {
  assert.deepEqual(
    entries.map((e) => [
      e.profile.model,
      e.stage.pageInventory.length,
      e.stage.rows.length,
      e.profile.columns.length,
      e.profile.configs.length,
    ]),
    [
      ["Tacoma", 34, 114, 11, 15],
      ["Sienna", 25, 124, 6, 10],
      ["Grand Highlander", 31, 126, 10, 14],
      ["RAV4", 30, 146, 6, 9],
    ],
  );
  for (const { profile, stage } of entries) {
    assert.equal(toyotaContentDigest(stage), profile.expectedContentSha256);
    assert.equal(stage.source.sha256, profile.sha256);
    assert.equal(Object.keys(stage.disclosures).length, profile.lastDisclosure);
    assert.deepEqual(
      stage.pageInventory.map((p) => p.page),
      Array.from({ length: profile.pageCount }, (_, i) => i + 1),
    );
  }
});
test("Toyota import is idempotent and preserves unrelated vehicles and historical source claims", () => {
  const before = JSON.stringify(catalog),
    result = importToyotaBatch(entries, catalog, features);
  assert.equal(JSON.stringify(result.catalog), before);
  assert.equal(JSON.stringify(catalog), before);
  assert.ok(result.report.models.every((m) => m.standardEquipmentAdded === 0));
  for (const record of report.preservedVehicles)
    assertHistoricalVehicle(catalog, record);
  const rav = vehicle("rav4"),
    reviewed = report.models.find((m) => m.id === rav.id);
  for (const prior of reviewed.baselineCells) {
    const current = rav.trims.find((t) => t.id === prior.configuration)
      .equipment[prior.field];
    const resolution = reviewed.resolvedFields.find(
      (r) => r.configuration === prior.configuration && r.field === prior.field,
    );
    assert.equal(
      hash(current),
      resolution ? hash(resolution.incoming) : prior.sha256,
    );
  }
  assert.equal(
    rav.sources.filter((s) => s.sha256 === entries[3].profile.sha256).length,
    1,
  );
  assert.equal(
    rav.sources.find((s) => s.sha256 === entries[3].profile.sha256).checkedAt,
    "2026-11-03",
  );
});
test("Every Toyota standard matrix claim comes from its own S column or a declared mechanical choice", () => {
  for (const { profile, stage } of entries) {
    const v = catalog.vehicles.find((v) => v.id === profile.vehicleId);
    for (const config of profile.configs) {
      const trim = v.trims.find((t) => t.id === config.id);
      for (const row of stage.rows) {
        const id = `toyota-brochure-${hash(row.label).slice(0, 12)}`,
          c = trim.equipment[id];
        if (!c || c.status === "unverified") continue;
        if (c.status === "standard")
          assert.ok(
            row.symbols[config.column] === "S" ||
              row.label === config.driveRow ||
              row.label === config.transmissionRow ||
              (profile.model === "RAV4" &&
                config.drive === "AWD" &&
                /236 net combined/.test(row.label)),
            `${profile.model} ${config.id} ${row.label}`,
          );
        if (c.status === "optional")
          assert.equal(row.symbols[config.column], "A");
        assert.ok(c.sourceIds.length);
        // Identical repeated rows share one canonical source-row record.
        const duplicatePages = stage.rows
          .filter(
            (r) =>
              r.label === row.label &&
              r.symbols[config.column] === row.symbols[config.column],
          )
          .map((r) => String(r.page));
        assert.ok(
          Object.values(c.sourcePages).some((page) =>
            duplicatePages.includes(page),
          ),
        );
      }
    }
  }
});
test("Toyota source ambiguities remain unresolved instead of inheriting equipment", () => {
  for (const v of catalog.vehicles.filter((v) => v.brand === "toyota"))
    for (const trim of v.trims) {
      const heated = trim.equipment.heatedSeats;
      if (heated?.value)
        assert.match(
          heated.value,
          /front|passenger/i,
          `${v.id}/${trim.id}: a heated wheel does not establish heated seats`,
        );
    }
  const sienna = vehicle("sienna");
  for (const trim of sienna.trims.filter((t) => t.name === "XSE"))
    assert.equal(trim.equipment.wheels.status, "unverified");
  for (const trim of sienna.trims.filter((t) => t.name === "XLE"))
    assert.equal(trim.equipment.seating.status, "unverified");
  assert.equal(
    sienna.trims.find((t) => t.name === "Platinum").equipment.seating.value,
    "7 passengers (ottoman applicability separately flagged for review)",
  );
  assert.equal(
    sienna.trims.find((t) => t.name === "LE" && t.configuration.endsWith("FWD"))
      .equipment.economy.value,
    "36 city / 36 highway / 36 combined mpg (manufacturer quotes EPA estimates)",
  );
  assert.match(
    sienna.trims.find((t) => t.name === "LE" && t.configuration.endsWith("AWD"))
      .equipment.economy.value,
    /35 city \/ 36 highway \/ 35 combined/,
  );
  assert.ok(
    !sienna.trims.some(
      (t) =>
        ["Woodland Edition", "Platinum"].includes(t.name) &&
        t.configuration.endsWith("FWD"),
    ),
  );
  const tacoma = vehicle("tacoma");
  assert.ok(
    !tacoma.trims.some(
      (t) => t.name === "TRD PreRunner" && !t.configuration.includes("RWD"),
    ),
  );
  for (const trim of tacoma.trims) {
    if (trim.configuration.startsWith("i-FORCE MAX"))
      assert.match(trim.equipment.horsepower.value, /326/);
    else assert.equal(trim.equipment.horsepower.status, "unverified");
  }
  const gh = vehicle("grand-highlander");
  for (const trim of gh.trims.filter((t) => t.name.startsWith("Hybrid MAX"))) {
    assert.match(trim.equipment.horsepower.value, /362 net combined hp/);
    assert.match(trim.equipment.transmission.value, /6-speed/);
    assert.match(trim.equipment.torque.value, /400 lb/);
  }
  assert.equal(
    resolveCell(vehicle("rav4"), vehicle("rav4").trims[0], "areaView").status,
    "unverified",
  );
});
test("Toyota palettes preserve manufacturer names without inventing trim-color combinations", () => {
  for (const { profile } of entries) {
    const v = catalog.vehicles.find((v) => v.id === profile.vehicleId);
    assert.ok(v.colors.exteriors.length);
    assert.ok(
      v.colors.exteriors.every(
        (c) =>
          c.availability === "unverified" &&
          c.trims.length === 0 &&
          c.sourceIds.length &&
          c.sourcePages,
      ),
    );
    assert.ok(
      v.colors.referenceInteriors.every(
        (c) => c.availability === "unverified" && !c.trim && c.sourceIds.length,
      ),
    );
  }
  assert.equal(
    vehicle("rav4").colors.exteriors.find((c) => c.name === "Wind Chill Pearl")
      .extraCost,
    true,
  );
  assert.deepEqual(
    vehicle("rav4").modelYearChanges.items.map((i) => i.sourcePages),
    [{ "toyota-2026-rav4-brochure": "3" }],
  );
  assert.equal(vehicle("sienna").modelYearChanges, undefined);
});
test("Existing verified Toyota numeric claims win and conflicts appear in the review", () => {
  const base = structuredClone(catalog),
    v = base.vehicles.find((v) => v.id === "2026-toyota-sienna");
  v.trims[0].equipment.horsepower.value = "999 synthetic retained hp";
  const result = importToyotaBatch([entries[1]], base, features);
  assert.equal(
    result.catalog.vehicles.find((v) => v.id === "2026-toyota-sienna").trims[0]
      .equipment.horsepower.value,
    "999 synthetic retained hp",
  );
  assert.ok(
    result.report.conflicts.some(
      (c) =>
        c.field === "horsepower" &&
        c.existing.value === "999 synthetic retained hp" &&
        /245/.test(c.incoming.value),
    ),
  );
});
test("Changed Toyota stage content fails closed and a failed batch leaves no stale candidate", () => {
  const bad = structuredClone(entries[1]);
  bad.stage.rows[0].symbols[0] = "S";
  bad.stage.rows[0].label = "Unsupported synthetic claim";
  assert.throws(
    () => importToyotaBatch([bad], catalog, features),
    /fingerprint/,
  );
  const dir = mkdtempSync(join(tmpdir(), "toyota-failed-"));
  try {
    writeFileSync(join(dir, "stage.json"), JSON.stringify(bad.stage));
    writeFileSync(join(dir, "catalog.candidate.json"), "stale");
    writeFileSync(join(dir, "report.json"), "stale");
    assert.throws(() =>
      execFileSync(
        process.execPath,
        [
          "scripts/import/import-toyota.mjs",
          "--stage",
          join(dir, "stage.json"),
          "--out",
          dir,
        ],
        { cwd: resolve("."), stdio: "pipe" },
      ),
    );
    assert.equal(existsSync(join(dir, "catalog.candidate.json")), false);
    assert.equal(existsSync(join(dir, "report.json")), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
test("Named system searches do not combine Toyota seating language with cruise-control claims", () => {
  assert.equal(
    searchVehicles(catalog, features, {
      query: "Super Cruise",
      brand: "toyota",
    }).vehicles.length,
    0,
  );
  assert.ok(
    searchVehicles(catalog, features, {
      query: "Sienna heated steering wheel",
    }).vehicles.some((v) => v.id === "2026-toyota-sienna"),
  );
});

const expansion = [
  "2027-landcruiser",
  "2027-prius",
  "2027-priuspluginhybrid",
  "2026-corolla",
  "2026-corollacross",
  "2026-highlander",
].map((key) => {
  const profile = read(`../profiles/imports/toyota/${key}.json`);
  return {
    profile,
    stage: read(`../imports/toyota-six-models/${profile.id}.extracted.json`),
  };
});
const expansionReport = read("../docs/imports/toyota-six-models-report.json");
const expanded = (model) =>
  catalog.vehicles.find(
    (v) =>
      v.model === model && expansion.some((e) => e.profile.vehicleId === v.id),
  );
test("six-model Toyota batch pins all 158 pages, 560 rows and 38 configurations without changing any prior vehicle", () => {
  assert.deepEqual(
    expansion.map((e) => e.profile.configs.length),
    [2, 8, 4, 8, 9, 7],
  );
  assert.equal(
    expansion.reduce((n, e) => n + e.stage.pageInventory.length, 0),
    158,
  );
  assert.equal(
    expansion.reduce((n, e) => n + e.stage.rows.length, 0),
    560,
  );
  assert.equal(expansionReport.preservedVehicles.length, 24);
  for (const record of expansionReport.preservedVehicles)
    assertHistoricalVehicle(catalog, record);
  for (const { profile, stage } of expansion) {
    assert.equal(toyotaContentDigest(stage), profile.expectedContentSha256);
    assert.equal(stage.source.year, profile.year);
    const v = expanded(profile.model);
    assert.equal(catalog.vehicles.filter((x) => x.id === v.id).length, 1);
    assert.equal(
      new Set(v.trims.map((t) => t.name)).size,
      new Set(profile.configs.map((c) => c.name)).size,
    );
    assert.equal(v.sources[0].checkedAt, "2026-11-13");
    assert.ok(v.sources[0].shortLabel.endsWith(String(v.year).slice(-2)));
    assert.equal(v.modelYearChanges, undefined);
    for (const config of profile.configs) {
      const t = v.trims.find((t) => t.id === config.id);
      assert.equal(t.equipment.drivetrain.status, "standard");
      assert.equal(t.equipment.transmission.status, "standard");
      for (const row of stage.rows) {
        const id = `toyota-brochure-${hash(row.label).slice(0, 12)}`;
        const c = t.equipment[id];
        if (!c || c.status !== "standard") continue;
        assert.ok(
          row.symbols[config.column] === "S" ||
            [config.driveRow, config.transmissionRow].includes(row.label),
          `${v.id}/${config.id}/${row.label}`,
        );
        assert.ok(
          stage.rows.some(
            (other) =>
              other.label === row.label &&
              c.sourcePages[profile.id]
                .split(", ")
                .includes(String(other.page)),
          ),
        );
      }
    }
  }
  assert.deepEqual(
    importToyotaBatch(expansion, catalog, features).catalog,
    catalog,
  );
});
test("Prius HEV output and plug-in range/charging never carry over between models", () => {
  for (const t of expanded("Prius").trims) {
    assert.match(
      t.equipment.horsepower.value,
      t.configuration.includes("AWD") ? /196/ : /194/,
    );
    assert.equal(t.equipment.electricRange.status, "not-applicable");
    assert.equal(t.equipment.charging.status, "not-applicable");
  }
  for (const t of expanded("Prius Plug-in Hybrid").trims) {
    assert.match(t.equipment.horsepower.value, /220/);
    assert.equal(t.equipment.electricRange.status, "standard");
    assert.match(
      t.equipment.electricRange.value,
      t.name === "SE" ? /44/ : /39/,
    );
    assert.match(t.equipment.charging.value, /Level 2/);
    assert.equal(t.equipment.dcCharging.status, "unverified");
    if (t.name === "SE") assert.equal(t.equipment.economy.status, "unverified");
  }
});
test("gas/hybrid and AWD applicability, source conflicts and optional equipment remain scoped", () => {
  for (const model of ["Corolla", "Corolla Cross"])
    for (const t of expanded(model).trims) {
      if (t.name.startsWith("Hybrid"))
        assert.equal(t.equipment.horsepower.status, "unverified");
      else assert.match(t.equipment.horsepower.value, /169/);
    }
  assert.equal(
    expanded("Corolla").trims.some(
      (t) => t.name === "Hybrid XLE" && t.configuration.includes("AWD"),
    ),
    false,
  );
  for (const t of expanded("Highlander").trims) {
    assert.match(t.configuration, /AWD/);
    assert.match(t.equipment.seating.value, /7 passengers/);
    if (!t.name.startsWith("Hybrid"))
      assert.match(t.equipment.horsepower.value, /265/);
  }
  const cruiser = expanded("Land Cruiser");
  assert.equal(
    cruiser.trims.find((t) => t.name === "Land Cruiser").equipment.upholstery
      .status,
    "unverified",
  );
  assert.equal(
    cruiser.trims.find((t) => t.name === "Land Cruiser").equipment.roof.status,
    "optional",
  );
  for (const t of expanded("Corolla Cross").trims.filter(
    (t) => !t.name.startsWith("Hybrid") && t.configuration.includes("AWD"),
  ))
    assert.doesNotMatch(
      t.equipment.chassis.value || "",
      /Torsion beam|Multi-link rear/,
    );
});
test("all six guides reuse source-backed matched-configuration upgrade paths", async () => {
  const { modelUpgradePaths } = await import("../presentation.js");
  const { eligibleOptions } = await import("../lib.js");
  for (const { profile } of expansion) {
    const options = eligibleOptions(catalog).filter(
      (o) => o.vehicle.id === profile.vehicleId,
    );
    const paths = modelUpgradePaths(catalog, options);
    assert.ok(paths.length, profile.model);
    for (const p of paths)
      for (const gain of p.gains) {
        assert.equal(gain.cell.status, "standard");
        assert.ok(gain.cell.sourceIds.includes(profile.id));
        assert.ok(gain.cell.sourcePages[profile.id]);
      }
  }
});

const nextSix = [
  "camry",
  "4runner",
  "tundra",
  "sequoia",
  "landcruiser",
  "corollahatchback",
].map((key) => {
  const profile = read(`../profiles/imports/toyota/2026-${key}.json`);
  return {
    profile,
    stage: read(`../imports/toyota-2026-next-six/${profile.id}.extracted.json`),
  };
});
const nextReport = read("../docs/imports/toyota-2026-next-six-report.json");
const nextVehicle = (model) =>
  catalog.vehicles.find((v) => v.year === 2026 && v.model === model);
test("next six Toyota brochures pin 176 pages, 793 rows, 32 trim families and 55 configurations", () => {
  assert.deepEqual(
    nextSix.map((e) => e.profile.configs.length),
    [10, 16, 16, 8, 2, 3],
  );
  assert.equal(
    nextSix.reduce((n, e) => n + e.stage.pageInventory.length, 0),
    176,
  );
  assert.equal(
    nextSix.reduce((n, e) => n + e.stage.rows.length, 0),
    793,
  );
  assert.equal(
    nextSix.reduce(
      (n, e) => n + new Set(e.profile.configs.map((c) => c.name)).size,
      0,
    ),
    32,
  );
  for (const { profile, stage } of nextSix) {
    assert.equal(toyotaContentDigest(stage), profile.expectedContentSha256);
    assert.equal(stage.source.sha256, profile.sha256);
    assert.equal(stage.source.year, 2026);
    assert.equal(Object.keys(stage.disclosures).length, profile.lastDisclosure);
    const v = nextVehicle(profile.model);
    assert.equal(catalog.vehicles.filter((x) => x.id === v.id).length, 1);
    assert.equal(v.trims.length, profile.configs.length);
    if (["Camry", "4Runner"].includes(profile.model)) {
      assert.equal(v.modelYearChanges.basis, "manufacturer-highlights");
      assert.equal(v.modelYearChanges.items.length, 1);
      assert.ok(v.modelYearChanges.items[0].sourcePages[profile.id]);
    } else assert.equal(v.modelYearChanges, undefined);
    for (const config of profile.configs) {
      const t = v.trims.find((t) => t.id === config.id);
      assert.equal(t.equipment.transmission.status, "standard");
      assert.equal(t.equipment.drivetrain.status, "standard");
      assert.doesNotMatch(
        t.equipment.transmission.value,
        /skid plate|protection/i,
      );
      assert.doesNotMatch(t.equipment.engine.value, /badge|emblem/i);
      for (const row of stage.rows) {
        const c =
          t.equipment[`toyota-brochure-${hash(row.label).slice(0, 12)}`];
        if (c?.status !== "standard") continue;
        assert.ok(
          row.symbols[config.column] === "S" ||
            [config.driveRow, config.transmissionRow].includes(row.label),
          `${v.id}/${t.id}/${row.label}`,
        );
        assert.ok(
          stage.rows.some(
            (r) =>
              r.label === row.label &&
              c.sourcePages[profile.id].split(", ").includes(String(r.page)),
          ),
        );
      }
    }
  }
});
test("next Toyota batch preserves all 30 prior vehicles, particularly the separate 2027 Land Cruiser", () => {
  assert.equal(nextReport.preservedVehicles.length, 30);
  for (const prior of nextReport.preservedVehicles)
    assertHistoricalVehicle(catalog, prior);
  const prior = nextReport.preservedVehicles.find(
    (v) => v.id === "2027-toyota-land-cruiser",
  );
  assert.ok(prior);
  const old = catalog.vehicles.find((v) => v.id === prior.id),
    added = nextVehicle("Land Cruiser");
  assert.equal(old.sources[0].modelYear, 2027);
  assert.equal(added.sources[0].modelYear, 2026);
  assert.notEqual(old.sources[0].sha256, added.sources[0].sha256);
  for (const t of added.trims) {
    assert.match(t.equipment.transmission.value, /8-speed/);
    assert.deepEqual(t.equipment.transmission.sourceIds, [
      "toyota-2026-land-cruiser-brochure",
    ]);
    const skid = Object.entries(t.equipment).find(
      ([id, c]) =>
        id.startsWith("toyota-brochure-") &&
        /Front skid plate with engine, transmission/.test(c.value || ""),
    );
    assert.equal(skid?.[1].status, "standard");
  }
  assert.deepEqual(
    importToyotaBatch(nextSix, catalog, features).catalog,
    catalog,
  );
});
test("Camry output is scoped to FWD/AWD and omitted Nightshade economy is never inferred", () => {
  for (const t of nextVehicle("Camry").trims) {
    assert.match(t.configuration, /Hybrid/);
    assert.match(
      t.equipment.horsepower.value,
      t.configuration.includes("AWD") ? /232/ : /225/,
    );
    assert.doesNotMatch(t.equipment.horsepower.value, /184/);
    assert.equal(
      t.equipment.economy.status,
      t.name === "Nightshade" ? "unverified" : "standard",
    );
    assert.equal(t.equipment.charging.status, "not-applicable");
  }
});
test("4Runner uses its own Trailhunter power exception and part/full-time drivetrain evidence", () => {
  const v = nextVehicle("4Runner");
  for (const t of v.trims) {
    const hybrid = t.configuration.startsWith("Hybrid");
    assert.match(
      t.equipment.horsepower.value,
      t.name === "Trailhunter" ? /323/ : hybrid ? /326/ : /278/,
    );
    assert.match(t.equipment.torque.value, hybrid ? /465/ : /317/);
    assert.doesNotMatch(t.equipment.torque.value, /184/);
    if (t.configuration.includes("RWD"))
      assert.match(t.equipment.drivetrain.value, /Rear-Wheel/);
    else
      assert.match(
        t.equipment.drivetrain.value,
        ["Limited", "Platinum"].includes(t.name) ? /Full-time/ : /Part-time/,
      );
    assert.match(t.equipment.economy.value, /projected EPA/);
    assert.equal(t.equipment.infotainment.status, "standard");
  }
  const stage = nextSix.find((e) => e.profile.model === "4Runner").stage;
  const third = stage.rows.find((r) =>
    r.label.startsWith("50/50 split, fold-flat third-row"),
  );
  assert.ok(third);
  const field = `toyota-brochure-${hash(third.label).slice(0, 12)}`;
  assert.equal(
    v.trims.find((t) => t.id === "sr5-rwd").equipment[field].status,
    "optional",
  );
  assert.equal(
    v.trims.some((t) => t.equipment[field].status === "standard"),
    false,
  );
});
test("Tundra and Sequoia keep powertrain outputs separate from electric-motor ratings and previous-year economy", () => {
  for (const t of nextVehicle("Tundra").trims) {
    const hybrid = t.configuration.startsWith("Hybrid");
    assert.match(
      t.equipment.horsepower.value,
      hybrid ? /437/ : t.name === "SR" ? /358/ : /389/,
    );
    assert.match(
      t.equipment.torque.value,
      hybrid ? /583/ : t.name === "SR" ? /406/ : /479/,
    );
    assert.doesNotMatch(t.equipment.engine.value, /tailgate badge/);
    assert.equal(t.equipment.economy.status, "unverified");
  }
  for (const t of nextVehicle("Sequoia").trims) {
    assert.match(t.equipment.horsepower.value, /437/);
    assert.match(t.equipment.torque.value, /583/);
    assert.equal(
      t.equipment.economy.status,
      t.configuration.includes("RWD") ? "standard" : "unverified",
    );
    if (t.configuration.includes("RWD"))
      assert.ok(["SR5", "Limited"].includes(t.name));
  }
  assert.match(
    nextSix.find((e) => e.profile.model === "Sequoia").stage.disclosures["2"],
    /2025 Sequoia/,
  );
});
test("Corolla Hatchback and optional packages remain distinct from sedan, hybrid and standard equipment", () => {
  const v = nextVehicle("Corolla Hatchback");
  assert.deepEqual(
    v.trims.map((t) => t.name),
    ["SE", "FX", "XSE"],
  );
  for (const t of v.trims) {
    assert.equal(t.configuration, "Gasoline · FWD");
    assert.match(t.equipment.horsepower.value, /169/);
    assert.match(t.equipment.transmission.value, /CVT/);
    assert.equal(t.equipment.economy.status, "unverified");
    assert.equal(t.equipment.wheels.status, "standard");
  }
  const limited = nextVehicle("Land Cruiser").trims.find(
    (t) => t.name === "Land Cruiser",
  );
  assert.equal(limited.equipment.roof.status, "optional");
  assert.equal(limited.equipment.upholstery.status, "unverified");
  for (const { profile } of nextSix) {
    const x = nextVehicle(profile.model);
    assert.ok(
      x.colors.exteriors.every(
        (c) => !c.trims.length && c.availability === "unverified",
      ),
    );
  }
});
test("all six new Toyota guides have evidence-backed Why Upgrade paths within matching mechanical configurations", async () => {
  const { modelUpgradePaths } = await import("../presentation.js");
  const { eligibleOptions } = await import("../lib.js");
  for (const { profile } of nextSix) {
    const paths = modelUpgradePaths(
      catalog,
      eligibleOptions(catalog).filter(
        (o) => o.vehicle.id === profile.vehicleId,
      ),
    );
    assert.ok(paths.length, profile.model);
    for (const path of paths) {
      assert.equal(path.from.trim.configuration, path.to.trim.configuration);
      for (const g of path.gains) {
        assert.equal(g.cell.status, "standard");
        assert.ok(g.cell.sourceIds.includes(profile.id));
        assert.ok(g.cell.sourcePages[profile.id]);
      }
    }
  }
});
