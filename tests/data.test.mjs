import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { validate } from "../scripts/validate.mjs";
import {
  eligibleOptions,
  searchVehicles,
  comparisonRows,
  resolveCell,
  sharedStandardRows,
  packageComparisonRows,
  verifiedUpgradePairs,
  comparisonBaseline,
  trimComparisonSections,
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
test("differences omit identical cells but retain different verification states", () => {
  const c = fixtureCatalog();
  const options = eligibleOptions(c);
  assert.equal(options.length, 2);
  assert.deepEqual(
    comparisonRows(c, options, { differenceOnly: true }).map((r) => r.id),
    ["heatedSeats", "ventilatedSeats", "audio"],
  );
  assert.ok(
    comparisonRows(c, options, { differenceOnly: false }).some(
      (r) => r.id === "engine",
    ),
  );
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
  assert.ok(
    v.trims.every(
      (t) =>
        t.equipment.torque.status === "standard" &&
        t.equipment.torque.value.includes("torque basis not specified"),
    ),
  );
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
    searchVehicles(catalog, features, {
      query: "Weather Package",
      brand: "toyota",
    }).vehicles.length,
    1,
  );
  assert.equal(
    searchVehicles(catalog, features, {
      query: "Weather ventilated",
      brand: "toyota",
    }).vehicles.length,
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

test("What Changes retains all four availability-state distinctions", () => {
  const c = fixtureCatalog(),
    v = c.vehicles[0];
  const states = ["standard", "optional", "unavailable", "unverified"];
  for (let i = 0; i < states.length; i++)
    for (let j = 0; j < states.length; j++) {
      for (const [k, status] of [
        [0, states[i]],
        [1, states[j]],
      ])
        v.trims[k].equipment.wheels =
          status === "unverified"
            ? { status }
            : { status, value: "Same wheel", sourceIds: ["test-source"] };
      const options = eligibleOptions(c);
      assert.equal(
        comparisonRows(c, options).some((r) => r.id === "wheels"),
        i !== j,
        `${states[i]} vs ${states[j]}`,
      );
    }
  assert.equal(
    comparisonRows(c, eligibleOptions(c), { differenceOnly: false }).length,
    c.fields.length,
  );
});
test("shared standard rows exclude shared optional, unavailable and unknown equipment", () => {
  const c = fixtureCatalog(),
    v = c.vehicles[0];
  v.trims[1].equipment.heatedSeats = structuredClone(
    v.trims[0].equipment.heatedSeats,
  );
  const shared = sharedStandardRows(c, eligibleOptions(c));
  assert.deepEqual(
    shared.map((r) => r.id),
    ["engine"],
  );
  assert.ok(
    !comparisonRows(c, eligibleOptions(c)).some((r) => r.id === "heatedSeats"),
  );
  v.trims[1].equipment.engine.conditions =
    "Different configuration restriction";
  assert.equal(sharedStandardRows(c, eligibleOptions(c)).length, 0);
  assert.ok(
    comparisonRows(c, eligibleOptions(c)).some((r) => r.id === "engine"),
  );
});
test("three-way comparison considers every selected cell and ignores citation-only differences", () => {
  const c = fixtureCatalog(),
    v = c.vehicles[0];
  const third = structuredClone(v.trims[0]);
  third.id = "third";
  third.name = "Fixture Third";
  v.trims.push(third);
  const options = eligibleOptions(c);
  assert.ok(comparisonRows(c, options).some((r) => r.id === "audio"));
  v.sources.push({ ...v.sources[0], id: "other-source" });
  third.equipment.engine.sourceIds = ["other-source"];
  assert.ok(
    !comparisonRows(c, eligibleOptions(c)).some((r) => r.id === "engine"),
  );
  third.equipment.engine.value = "Actually different engine";
  assert.ok(
    comparisonRows(c, eligibleOptions(c)).some((r) => r.id === "engine"),
  );
});
test("package differences preserve contents and never turn missing listings into Unavailable", () => {
  const c = fixtureCatalog();
  let options = eligibleOptions(c);
  let rows = packageComparisonRows(options);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].cells[0].status, "optional");
  assert.equal(rows[0].cells[1].status, "unverified");
  assert.match(rows[0].cells[0].contentsText, /Synthetic heated seats/);
  const pkg = c.vehicles[0].packages[0];
  pkg.trimIds = ["base", "plus"];
  assert.equal(packageComparisonRows(eligibleOptions(c)).length, 0);
  assert.equal(
    packageComparisonRows(eligibleOptions(c), { differenceOnly: false }).length,
    1,
  );
  pkg.trimIds = ["base"];
  pkg.contentsStatus = "unverified";
  assert.match(
    packageComparisonRows(eligibleOptions(c))[0].cells[0].contentsText,
    /Contents Unverified/,
  );
  const second = structuredClone(pkg);
  second.id = "variant";
  second.trimIds = ["plus"];
  second.contentsStatus = "verified";
  second.description = "Different verified contents";
  c.vehicles[0].packages.push(second);
  assert.equal(packageComparisonRows(eligibleOptions(c)).length, 1);
  assert.notEqual(
    packageComparisonRows(eligibleOptions(c))[0].cells[0].contentsText,
    packageComparisonRows(eligibleOptions(c))[0].cells[1].contentsText,
  );
});
test("only evidenced and configuration-matched authored upgrade edges are displayed", () => {
  const c = fixtureCatalog();
  let pairs = verifiedUpgradePairs(eligibleOptions(c).reverse());
  assert.equal(pairs.length, 1);
  assert.equal(pairs[0].gains[0].text, "Synthetic audio upgrade");
  c.vehicles[0].trims[1].configuration = "Different powertrain";
  assert.equal(verifiedUpgradePairs(eligibleOptions(c)).length, 0);
  c.vehicles[0].trims[1].configuration = c.vehicles[0].trims[0].configuration;
  c.vehicles[0].upgrades[0].gains[0].sourceIds = ["missing"];
  assert.equal(verifiedUpgradePairs(eligibleOptions(c)).length, 0);
});
test("filtering is manufacturer- and model-year-independent", () => {
  for (const brand of ["chevrolet", "toyota", "volkswagen"])
    for (const year of [2026, 2027]) {
      const v = fixtureVehicle({ brand, id: `${brand}-${year}` });
      v.year = year;
      v.sources[0].modelYear = year;
      const c = { ...catalog, vehicles: [v] },
        options = eligibleOptions(c);
      assert.equal(options.length, 2);
      assert.deepEqual(
        comparisonRows(c, options).map((r) => r.id),
        ["heatedSeats", "ventilatedSeats", "audio"],
      );
      assert.equal(sharedStandardRows(c, options).length, 1);
      assert.equal(verifiedUpgradePairs(options).length, 1);
    }
});

test("package contents order alone is not an equipment difference", () => {
  const v = fixtureVehicle();
  const pkg = v.packages[0];
  pkg.trimIds = ["base"];
  pkg.contentsStatus = "verified";
  pkg.contents = ["Synthetic roof", "Synthetic heated seats"];
  v.packages.push({
    ...structuredClone(pkg),
    id: "other-listing",
    trimIds: ["plus"],
    contents: ["Synthetic heated seats", "Synthetic roof"],
  });
  assert.equal(
    packageComparisonRows(eligibleOptions({ ...catalog, vehicles: [v] }))
      .length,
    0,
  );
  v.packages[1].contents.push("Synthetic new equipment");
  assert.equal(
    packageComparisonRows(eligibleOptions({ ...catalog, vehicles: [v] }))
      .length,
    1,
  );
});

test("baseline uses verified upgrade order, independent of selection or array ordering", () => {
  const v = fixtureVehicle();
  v.trims.reverse();
  const c = { ...catalog, vehicles: [v] };
  const options = eligibleOptions(c);
  const before = JSON.stringify(c);
  const result = trimComparisonSections(c, options);
  assert.equal(result.baseline.option.trim.id, "base");
  assert.equal(result.baseline.method, "verified-upgrade-order");
  assert.equal(
    result.baseRows.find((r) => r.id === "engine").cells[0].value,
    "Synthetic engine A",
  );
  assert.equal(JSON.stringify(c), before);
});
test("baseline updates after removing the lower trim and follows verified intermediate edges", () => {
  const v = fixtureVehicle();
  const top = structuredClone(v.trims[1]);
  top.id = "max";
  top.name = "Fixture Max";
  v.trims.push(top);
  v.upgrades.push({
    from: "Fixture Plus",
    to: "Fixture Max",
    gains: [{ text: "Synthetic gain", sourceIds: ["test-source"] }],
  });
  const c = { ...catalog, vehicles: [v] },
    o = eligibleOptions(c);
  assert.equal(comparisonBaseline(c, [o[2], o[0]]).option.trim.id, "base");
  assert.equal(comparisonBaseline(c, [o[2], o[1]]).option.trim.id, "plus");
  assert.equal(comparisonBaseline(c, []), null);
});
test("Base Equipment and What Changes do not duplicate specifications", () => {
  const v = fixtureVehicle();
  v.trims[0].equipment.horsepower = {
    status: "standard",
    value: "Synthetic 100 hp",
    sourceIds: ["test-source"],
  };
  v.trims[1].equipment.horsepower = {
    status: "standard",
    value: "Synthetic 120 hp",
    sourceIds: ["test-source"],
  };
  const c = { ...catalog, vehicles: [v] },
    o = eligibleOptions(c).reverse();
  const { baseRows, changeRows, baseline } = trimComparisonSections(c, o);
  assert.equal(baseline.option.trim.id, "base");
  assert.ok(baseRows.some((r) => r.id === "engine"));
  assert.ok(!baseRows.some((r) => r.id === "horsepower"));
  assert.ok(changeRows.some((r) => r.id === "horsepower"));
  assert.ok(baseRows.every((r) => !changeRows.some((x) => x.id === r.id)));
  assert.equal(
    changeRows.find((r) => r.id === "horsepower").cells[1].value,
    "Synthetic 100 hp",
  );
});
test("baseline never inherits optional, unavailable or unverified equipment", () => {
  const v = fixtureVehicle();
  v.trims[1].equipment.heatedSeats = structuredClone(
    v.trims[0].equipment.heatedSeats,
  );
  v.trims[0].equipment.engine.sourceIds = ["missing"];
  const c = { ...catalog, vehicles: [v] },
    o = eligibleOptions(c);
  const sections = trimComparisonSections(c, o);
  assert.ok(sections.baseRows.every((r) => r.cells[0].status === "standard"));
  assert.ok(
    !sections.baseRows.some(
      (r) =>
        r.id === "heatedSeats" ||
        r.id === "engine" ||
        r.id === "ventilatedSeats",
    ),
  );
  assert.ok(sections.changeRows.some((r) => r.id === "engine"));
  assert.equal(
    comparisonRows(c, o, { differenceOnly: false }).length,
    c.fields.length,
  );
});
test("baseline and core standard specifications work across manufacturers and years", () => {
  for (const brand of ["chevrolet", "toyota", "volkswagen"])
    for (const year of [2026, 2027]) {
      const v = fixtureVehicle({ id: `${brand}-${year}`, brand });
      v.year = year;
      v.sources[0].modelYear = year;
      for (const t of v.trims)
        for (const id of [
          "horsepower",
          "drivetrain",
          "safety",
          "infotainment",
          "upholstery",
        ])
          t.equipment[id] = {
            status: "standard",
            value: `Synthetic ${id}`,
            sourceIds: ["test-source"],
          };
      const c = { ...catalog, vehicles: [v] },
        sections = trimComparisonSections(c, eligibleOptions(c).reverse());
      assert.equal(sections.baseline.option.trim.id, "base");
      for (const id of [
        "engine",
        "horsepower",
        "drivetrain",
        "safety",
        "infotainment",
        "upholstery",
      ])
        assert.ok(
          sections.baseRows.some((r) => r.id === id),
          `${brand} ${year} ${id}`,
        );
    }
});
test("cross-model and year baselines are labeled as references rather than inferred trim ranks", () => {
  const a = fixtureVehicle(),
    b = fixtureVehicle({ id: "other-year", brand: "volkswagen" });
  b.year = 2027;
  b.sources[0].modelYear = 2027;
  const c = { ...catalog, vehicles: [a, b] };
  const o = eligibleOptions(c);
  const baseline = comparisonBaseline(c, [o[3], o[1]]);
  assert.equal(baseline.method, "cross-model-reference");
  assert.equal(baseline.option.vehicle.id, a.id);
});
test("unverified or cyclic upgrade rankings fall back transparently to catalog order", () => {
  const v = fixtureVehicle();
  v.upgrades[0].gains[0].sourceIds = ["missing"];
  let c = { ...catalog, vehicles: [v] };
  assert.equal(
    comparisonBaseline(c, eligibleOptions(c)).method,
    "catalog-order",
  );
  v.upgrades[0].gains[0].sourceIds = ["test-source"];
  v.upgrades.push({
    from: "Fixture Plus",
    to: "Fixture Base",
    gains: [{ text: "Synthetic cycle", sourceIds: ["test-source"] }],
  });
  assert.equal(
    comparisonBaseline(c, eligibleOptions(c)).method,
    "catalog-order",
  );
});

test("RAV4 audit accounts for every formerly unknown cell and every remaining unknown", async () => {
  const a = JSON.parse(
    await readFile(
      new URL("../docs/audits/2026-rav4-hybrid-audit.json", import.meta.url),
      "utf8",
    ),
  );
  const v = catalog.vehicles.find((v) => v.id === a.vehicleId);
  assert.equal(a.entries.length, 93);
  assert.equal(
    new Set(a.entries.map((e) => `${e.trimId}:${e.fieldId}`)).size,
    93,
  );
  for (const e of a.entries) {
    assert.equal(
      v.trims.find((t) => t.id === e.trimId).equipment[e.fieldId].status,
      e.after,
    );
    assert.ok(e.reason && e.brochurePages);
  }
  for (const check of a.positiveMarkChecks) {
    const cell = v.trims.find((t) => t.id === check.trimId).equipment[
      check.fieldId
    ];
    assert.equal(
      cell.status,
      check.brochureMark === "S" ? "standard" : "optional",
      `${check.trimId} ${check.fieldId}`,
    );
    assert.ok(cell.sourceIds.includes(a.brochureSourceId));
  }
  const remaining = v.trims.flatMap((t) =>
    Object.entries(t.equipment)
      .filter(([, c]) => c.status === "unverified")
      .map(([id]) => `${t.id}:${id}`),
  );
  assert.equal(remaining.length, 57);
  assert.deepEqual(
    new Set(remaining),
    new Set(
      a.entries
        .filter((e) => e.after === "unverified")
        .map((e) => `${e.trimId}:${e.fieldId}`),
    ),
  );
  assert.equal(a.entries.filter((e) => e.after === "standard").length, 9);
  assert.equal(a.entries.filter((e) => e.after === "unavailable").length, 27);
});
test("audited torque quotes the brochure without inventing an engine or system basis", () => {
  for (const t of catalog.vehicles[0].trims) {
    const c = t.equipment.torque;
    assert.equal(c.status, "standard");
    assert.match(c.value, /170 lb-ft \(231 N·m\)/);
    assert.match(c.value, /basis not specified/);
    assert.deepEqual(c.sourcePages, { "toyota-2026-rav4-brochure": "25" });
  }
});
test("HEV applicability and genuine specification gaps remain distinct", () => {
  const v = catalog.vehicles[0];
  for (const t of v.trims) {
    for (const id of ["electricRange", "charging", "dcCharging"]) {
      assert.equal(t.equipment[id].status, "unavailable");
      assert.match(t.equipment[id].value, /Not applicable/);
      assert.ok(
        t.equipment[id].sourceIds.includes("toyota-2026-rav4-brochure"),
      );
    }
    if (t.id !== "woodland-hev-awd")
      assert.equal(t.equipment.economy.status, "unverified");
    if (t.configuration.includes("FWD"))
      assert.equal(t.equipment.towing.status, "unverified");
  }
  assert.equal(
    v.trims.find((t) => t.id === "le-hev-fwd").equipment.roof.status,
    "unverified",
  );
  assert.equal(
    v.trims.find((t) => t.id === "se-hev-awd").equipment.heatedWheel.status,
    "optional",
  );
  assert.equal(
    v.trims.find((t) => t.id === "limited-hev-awd").equipment.ventilatedSeats
      .status,
    "standard",
  );
  assert.equal(
    v.sources.find((s) => s.id === "rav4-epa-lookup").kind,
    "research-target",
  );
  assert.equal(
    v.sources.find((s) => s.id === "rav4-epa-lookup").checkedAt,
    null,
  );
});
test("audit source provenance stays honest and rejects unofficial EPA lookalikes", () => {
  const v = catalog.vehicles.find((v) => v.id === "2026-toyota-rav4");
  const source = v.sources.find((s) => s.id === "rav4-epa-lookup");
  assert.equal(source.kind, "research-target");
  assert.equal(source.checkedAt, null);
  assert.ok(
    v.trims.every((t) =>
      Object.values(t.equipment).every(
        (c) => !c.sourceIds?.includes(source.id),
      ),
    ),
  );
  const rejected = structuredClone(catalog);
  rejected.vehicles[0].sources.find((s) => s.id === source.id).url =
    "https://fueleconomy.gov.evil.example/";
  assert.ok(
    validate(rejected, features).some((e) => e.includes("official HTTPS")),
  );
});

test("Tiguan covers only the seven VW-priced configurations and correct drivetrain ratings", () => {
  const v = catalog.vehicles.find((v) => v.id === "2026-volkswagen-tiguan");
  assert.equal(v.trims.length, 7);
  assert.equal(new Set(v.trims.map((t) => t.name)).size, 4);
  const expected = [
    [
      "s-fwd",
      30805,
      "201 hp",
      "207 lb-ft",
      "26 city / 34 highway / 29",
      "1,500",
      "6.6",
    ],
    [
      "s-4motion",
      32305,
      "201 hp",
      "221 lb-ft",
      "22 city / 30 highway / 25",
      "1,800",
      "7.0",
    ],
    [
      "se-fwd",
      33605,
      "201 hp",
      "207 lb-ft",
      "25 city / 32 highway / 28",
      "1,500",
      "6.6",
    ],
    [
      "se-4motion",
      35105,
      "201 hp",
      "221 lb-ft",
      "22 city / 30 highway / 25",
      "1,800",
      "7.0",
    ],
    [
      "se-r-line-black-fwd",
      37245,
      "201 hp",
      "207 lb-ft",
      "25 city / 32 highway / 28",
      "1,500",
      "6.6",
    ],
    [
      "se-r-line-black-4motion",
      38745,
      "201 hp",
      "221 lb-ft",
      "22 city / 30 highway / 25",
      "1,800",
      "7.0",
    ],
    [
      "sel-r-line-turbo-4motion",
      43085,
      "268 hp",
      "258 lb-ft",
      "22 city / 29 highway / 25",
      "1,800",
      "7.0",
    ],
  ];
  for (const [id, price, hp, torque, mpg, towing, clearance] of expected) {
    const e = v.trims.find((t) => t.id === id).equipment;
    for (const [key, text] of Object.entries({
      horsepower: hp,
      torque,
      economy: mpg,
      towing,
      groundClearance: clearance,
    }))
      assert.ok(e[key].value.startsWith(text), `${id}/${key}`);
    assert.ok(e.msrp.value.startsWith(`$${price.toLocaleString("en-US")}`));
    assert.ok(
      e.msrp.value.includes(`$${(price + 1475).toLocaleString("en-US")}`),
    );
    assert.match(e.msrp.conditions, /reviewed 2026-11-04/);
    assert.equal(e.transmission.value, "8-speed automatic");
    for (const cell of Object.values(e)) {
      if (cell.status === "unverified") assert.ok(cell.conditions);
      else
        for (const source of cell.sourceIds)
          assert.ok(cell.sourcePages[source]);
    }
  }
  assert.ok(!v.trims.some((t) => t.id === "sel-r-line-turbo-fwd"));
});

test("Tiguan matrix resolves optional and unavailable equipment without assumed carryover", () => {
  const v = catalog.vehicles.find((v) => v.id === "2026-volkswagen-tiguan");
  const expected = {
    S: ["unavailable", "unavailable", "unavailable", "unavailable"],
    SE: ["optional", "standard", "unavailable", "unavailable"],
    "SE R-Line Black": ["standard", "standard", "unavailable", "unavailable"],
    "SEL R-Line Turbo": ["standard", "standard", "standard", "standard"],
  };
  for (const t of v.trims) {
    assert.deepEqual(
      ["roof", "liftgate", "ventilatedSeats", "parkingAutomation"].map(
        (id) => t.equipment[id].status,
      ),
      expected[t.name],
    );
    for (const id of ["electricRange", "charging", "dcCharging"])
      assert.equal(t.equipment[id].status, "not-applicable");
    const unknown = Object.entries(t.equipment)
      .filter(([, c]) => c.status === "unverified")
      .map(([id]) => id)
      .sort();
    assert.deepEqual(
      unknown,
      [
        "headUpDisplay",
        "cargoOutlet",
        ...(t.name === "SE R-Line Black" ? ["curbWeight"] : []),
        ...(t.name === "SEL R-Line Turbo" ? ["mediaConnectivity"] : []),
      ].sort(),
    );
  }
  assert.match(
    v.trims.at(-1).equipment.heatedWheel.conditions,
    /delayed availability/,
  );
  assert.equal(
    v.trims.at(-1).equipment.climate.value,
    "Three-zone Climatronic with touch functionality",
  );
  const options = eligibleOptions({ ...catalog, vehicles: [v] });
  for (const row of packageComparisonRows(options, { differenceOnly: false })) {
    assert.ok(
      row.cells.every((c) => ["optional", "unavailable"].includes(c.status)),
    );
    assert.ok(row.cells.every((c) => !c.contentsText?.includes("Unverified")));
  }
  const blackRoof = packageComparisonRows(options, {
    differenceOnly: false,
  }).find((r) => r.label === "Black Roof Package");
  assert.match(blackRoof.cells.at(-1).contentsText, /Black mirror caps/);
  assert.ok(!blackRoof.cells[4].contentsText.includes("mirror caps"));
});

test("Tiguan comparison retains shared powertrain and isolates model-specific dimensions", () => {
  const v = catalog.vehicles.find((v) => v.id === "2026-volkswagen-tiguan");
  const options = eligibleOptions({ ...catalog, vehicles: [v] });
  const sections = trimComparisonSections(catalog, [options[0], options[2]]);
  assert.ok(sections.baseRows.some((r) => r.id === "horsepower"));
  assert.ok(sections.baseRows.some((r) => r.id === "wheelbase"));
  assert.ok(sections.changeRows.some((r) => r.id === "economy"));
  assert.ok(sections.changeRows.some((r) => r.id === "msrp"));
  const rav4 = eligibleOptions(catalog).filter(
    (o) => o.vehicle.id === "2026-toyota-rav4",
  );
  assert.ok(
    !comparisonRows(catalog, rav4, { differenceOnly: false }).some(
      (r) => r.id === "wheelbase",
    ),
  );
  assert.ok(
    searchVehicles(catalog, features, { query: "Tiguan 109.9" }).vehicles
      .length === 1,
  );
  const bad = structuredClone(catalog);
  bad.vehicles.find((x) => x.id === v.id).additionalFields[0].id = "engine";
  assert.ok(
    validate(bad, features).some((e) =>
      e.includes("equipment fields: duplicate"),
    ),
  );
});
