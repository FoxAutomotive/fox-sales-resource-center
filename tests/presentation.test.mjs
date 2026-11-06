import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fixtureVehicle } from "./fixtures.mjs";
import { eligibleOptions, comparisonRows, resolveCell } from "../lib.js";
import {
  salesCell,
  salesOptions,
  salesText,
  standardText,
  standardReasons,
  modelUpgradePaths,
  printView,
  visibleYearChanges,
} from "../presentation.js";
const catalog = JSON.parse(
  readFileSync(new URL("../data/catalog.json", import.meta.url)),
);

test("sales projection preserves raw records, classifications, numerical values and citations", () => {
  const before = JSON.stringify(catalog),
    options = eligibleOptions(catalog),
    projected = salesOptions(options);
  assert.equal(projected.length, options.length);
  for (let i = 0; i < options.length; i++) {
    assert.notEqual(projected[i].vehicle, options[i].vehicle);
    assert.deepEqual(projected[i].vehicle.packages, []);
    for (const [id, raw] of Object.entries(options[i].trim.equipment)) {
      const original = resolveCell(options[i].vehicle, options[i].trim, id),
        cell = resolveCell(projected[i].vehicle, projected[i].trim, id);
      if (original.status === "standard") {
        assert.equal(cell.status, "standard");
        assert.equal(cell.value, standardText(raw.value));
        assert.deepEqual(cell.sourceIds, raw.sourceIds);
        assert.deepEqual(cell.sourcePages, raw.sourcePages);
        // Removing source ordering footnotes must not remove numerical specification values.
        if (
          [
            "horsepower",
            "torque",
            "towing",
            "dimensions",
            "cargo",
            "fuel",
            "economy",
            "groundClearance",
          ].includes(id)
        )
          assert.equal(cell.value, raw.value);
      } else if (["optional", "unavailable"].includes(original.status)) {
        assert.equal(cell.status, "not-standard");
        assert.equal(cell.value, undefined);
        assert.equal(cell.conditions, undefined);
      } else assert.equal(cell.status, original.status);
    }
  }
  assert.equal(JSON.stringify(catalog), before);
});
test("N/A remains display-only and does not merge unknown with not offered", () => {
  assert.equal(
    salesText("Unverified / 175 hp / unverified"),
    "N/A / 175 hp / N/A",
  );
  assert.equal(salesCell({ status: "unverified" }).status, "unverified");
  assert.equal(
    salesCell({ status: "not-applicable" }).status,
    "not-applicable",
  );
  assert.equal(
    salesCell({ status: "unavailable", sourceIds: ["source"] }).status,
    "not-standard",
  );
  assert.deepEqual(
    salesCell({
      status: "optional",
      value: "Upgrade",
      conditions: "Package",
      sourceIds: ["source"],
    }).sourceIds,
    ["source"],
  );
});
test("standard package-included features stay standard and verified; optional conditions stay in raw data", () => {
  const cell = {
    status: "standard",
    value: "Heated front seats",
    conditions: "Included in standard package",
    sourceIds: ["manufacturer"],
  };
  assert.equal(salesCell(cell).value, cell.value);
  assert.equal(salesCell(cell).status, "standard");
  assert.equal(cell.conditions, "Included in standard package");
  assert.equal(
    standardText("Standard speaker system - option premium audio"),
    "Standard speaker system",
  );
});
test("Differences Only preserves common standard engine and excludes optional-only equipment", () => {
  const vehicle = fixtureVehicle(),
    c = { ...catalog, vehicles: [vehicle] },
    options = salesOptions(eligibleOptions(c));
  const rows = comparisonRows(c, options, { differenceOnly: true });
  assert.ok(
    rows.some(
      (r) =>
        r.id === "engine" &&
        r.cells.every((c) => c.value === "Synthetic engine A"),
    ),
  );
  const heated = rows.find((r) => r.id === "heatedSeats");
  assert.deepEqual(
    heated.cells.map((c) => c.status),
    ["not-standard", "standard"],
  );
  assert.ok(!rows.some((r) => r.id === "ventilatedSeats"));
});
test("Why Upgrade follows selected matching trims and uses verified standard gains, never missing evidence", () => {
  const vehicle = fixtureVehicle(),
    c = { ...catalog, vehicles: [vehicle] },
    projected = salesOptions(eligibleOptions(c));
  const reasons = standardReasons(c, projected);
  assert.equal(reasons.length, 1);
  assert.equal(reasons[0].from.trim.id, "base");
  assert.ok(
    reasons[0].gains.some((g) => g.cell.value === "Synthetic heated seats"),
  );
  assert.ok(
    reasons[0].gains.every(
      (g) => g.cell.status === "standard" && g.before.status !== "unverified",
    ),
  );
  assert.deepEqual(standardReasons(c, projected.slice(0, 1)), []);
  const mixed = [
    projected[0],
    {
      ...projected[1],
      trim: { ...projected[1].trim, configuration: "Other drive" },
    },
  ];
  assert.deepEqual(standardReasons(c, mixed), []);
  vehicle.trims[0].equipment.heatedSeats = { status: "unverified" };
  const revised = standardReasons(c, salesOptions(eligibleOptions(c)));
  assert.ok(
    revised.every((r) =>
      r.gains.every((g) => g.label !== "Heated front seats"),
    ),
  );
});
test("print projection is independent of selected UI state and does not alter source quick references", () => {
  const before = JSON.stringify(catalog);
  for (const vehicle of catalog.vehicles) {
    const options = eligibleOptions(catalog).filter(
      (o) => o.vehicle.id === vehicle.id,
    );
    const print = printView(catalog, vehicle, options);
    assert.equal(print.vehicle.equipmentScope, "standard-only");
    assert.deepEqual(print.vehicle.packages, []);
    assert.equal(print.options.length, options.length);
    if (vehicle.quickReference)
      assert.deepEqual(
        print.vehicle.quickReference.groups,
        vehicle.quickReference.groups,
      );
  }
  assert.equal(JSON.stringify(catalog), before);
});
test("What’s New retains standard changes and keeps optional-package source details out of the sales view", () => {
  const v = {
    modelYearChanges: {
      items: [
        {
          text: "Heated seats are now standard. New optional package.",
          sourceIds: ["document"],
        },
      ],
    },
  };
  assert.equal(visibleYearChanges(v)[0].text, "Heated seats are now standard.");
  assert.equal(
    v.modelYearChanges.items[0].text,
    "Heated seats are now standard. New optional package.",
  );
});

test("standard views retain operating limits, delayed availability and production removals", () => {
  const options = salesOptions(eligibleOptions(catalog));
  const tiguan = options.find(
    (o) =>
      o.vehicle.id === "2027-volkswagen-tiguan" &&
      o.trim.name === "SE R-Line® Black",
  );
  assert.match(tiguan.trim.equipment.heatedWheel.conditions, /2PD/);
  assert.match(
    visibleYearChanges(tiguan.vehicle)
      .map((i) => i.text)
      .join(" "),
    /production credit 2PD/,
  );
  const rav4 = options.find((o) => o.vehicle.id === "2026-toyota-rav4");
  assert.match(
    rav4.trim.equipment.torque.conditions,
    /does not identify engine-only or combined-system torque/,
  );
  for (const option of options)
    for (const cell of Object.values(option.trim.equipment))
      if (cell.status === "standard")
        assert.doesNotMatch(cell.value || "", / - optional in SE/);
});

test("automatic upgrade paths deduplicate matching drivetrains without inventing unknown or optional gains", () => {
  const v = fixtureVehicle();
  const clone = (trim, drive) => ({
    ...structuredClone(trim),
    id: `${trim.id}-${drive}`,
    configuration: drive,
  });
  v.trims = v.trims.flatMap((trim) => [clone(trim, "FWD"), clone(trim, "AWD")]);
  v.additionalFields = [
    {
      id: "duplicateHeated",
      label: "Alternate heated seats",
      group: "Comfort",
    },
  ];
  for (const trim of v.trims)
    trim.equipment.duplicateHeated = structuredClone(
      trim.equipment.heatedSeats,
    );
  const c = { ...catalog, vehicles: [v] },
    before = JSON.stringify(c);
  const paths = modelUpgradePaths(c, eligibleOptions(c));
  const forward = paths.find(
    (p) =>
      p.from.trim.name === "Fixture Base" && p.to.trim.name === "Fixture Plus",
  );
  assert.deepEqual(
    forward.configurations.map((c) => c.name),
    ["FWD", "AWD"],
  );
  assert.equal(
    forward.gains.filter((g) => g.cell.value === "Synthetic heated seats")
      .length,
    1,
  );
  for (const path of paths) {
    assert.ok(
      path.gains.every(
        (g) =>
          g.cell.status === "standard" &&
          ["standard", "not-standard"].includes(g.before.status),
      ),
    );
    for (const config of path.configurations)
      assert.equal(
        v.trims.find((t) => t.id === config.from).configuration,
        v.trims.find((t) => t.id === config.to).configuration,
      );
  }
  assert.equal(JSON.stringify(c), before);
  v.trims.find((t) => t.id === "base-AWD").equipment.heatedSeats = {
    status: "unverified",
  };
  v.trims.find((t) => t.id === "base-AWD").equipment.duplicateHeated = {
    status: "unverified",
  };
  const revised = modelUpgradePaths(c, eligibleOptions(c));
  assert.ok(
    revised
      .filter(
        (p) =>
          p.from.trim.name === "Fixture Base" &&
          p.configurations.some((c) => c.name === "AWD"),
      )
      .every((p) =>
        p.gains.every((g) => g.cell.value !== "Synthetic heated seats"),
      ),
  );
});

test("automatic Equinox paths include sibling destinations and retain verified source evidence", () => {
  const options = eligibleOptions(catalog).filter(
    (o) => o.vehicle.id === "2027-chevrolet-equinox",
  );
  const paths = modelUpgradePaths(catalog, options);
  for (const [from, to] of [
    ["LT", "RS"],
    ["LT", "ACTIV"],
    ["RS", "ACTIV"],
  ]) {
    const path = paths.find(
      (p) => p.from.trim.name === from && p.to.trim.name === to,
    );
    assert.ok(path, `${from} -> ${to}`);
    assert.ok(path.gains.every((g) => g.cell.sourceIds.length));
  }
  assert.deepEqual(modelUpgradePaths(catalog, []), []);
});
