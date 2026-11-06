// Read-only sales views. Manufacturer records and import classifications stay untouched.
import { comparisonRows, resolveCell } from "./lib.js";
export const coreFields = [
  "engine",
  "horsepower",
  "torque",
  "transmission",
  "drivetrain",
];
export const specificationFields = new Set([
  ...coreFields,
  "economy",
  "towing",
  "fuel",
  "dimensions",
  "wheelbase",
  "groundClearance",
  "track",
  "angles",
  "headroom",
  "legroom",
  "interiorRoom",
  "passengerVolume",
  "cargo",
  "seating",
  "wheels",
  "tires",
  "weights",
  "curbWeight",
  "chassis",
  "brakes",
  "steering",
  "engineDetails",
  "engineDesign",
  "gearRatios",
  "electricRange",
  "charging",
  "dcCharging",
  "msrp",
]);
export const salesText = (value) =>
  String(value ?? "").replace(/\bUnverified\b/gi, "N/A");
export function standardText(value) {
  return String(value ?? "")
    .replace(
      /\s*[-–—]\s*(?:(?:requires\s+)?(?:factory\s+)?option(?:al)?\b|part of .*package|standard, but .*deleted)[^;]*/gi,
      "",
    )
    .replace(/\s*\*+$/g, "")
    .trim();
}
export function salesCell(cell) {
  if (["optional", "unavailable", "not-standard"].includes(cell.status))
    return {
      status: "not-standard",
      sourceIds: cell.sourceIds,
      sourcePages: cell.sourcePages,
      sourceCells: cell.sourceCells,
      sourceSections: cell.sourceSections,
    };
  if (["unverified", "not-applicable"].includes(cell.status))
    return { ...cell, value: undefined, conditions: undefined };
  return {
    ...cell,
    value: standardText(cell.value),
    conditions: cell.conditions
      ? salesText(
          cell.conditions
            .split(/(?<=[.!?])\s+(?=[A-Z])/)
            .filter((text) => !/\boptional|package\b/i.test(text))
            .join(" "),
        ) || undefined
      : undefined,
  };
}
export function salesOptions(options) {
  const vehicles = new Map();
  return options.map((option) => {
    if (!vehicles.has(option.vehicle.id)) {
      const raw = option.vehicle;
      vehicles.set(raw.id, {
        ...raw,
        equipmentScope: "standard-only",
        comparisonContextFields: coreFields,
        standardOnlyMissingFields: [...specificationFields],
        packages: [],
        optionalEquipment: [],
        listedOptions: [],
        trims: raw.trims.map((trim) => ({
          ...trim,
          equipment: Object.fromEntries(
            Object.entries(trim.equipment).map(([id, cell]) => [
              id,
              salesCell(resolveCell(raw, trim, id)),
            ]),
          ),
        })),
      });
    }
    const vehicle = vehicles.get(option.vehicle.id);
    return {
      ...option,
      vehicle,
      trim: vehicle.trims.find((trim) => trim.id === option.trim.id),
    };
  });
}
export function standardReasons(catalog, options) {
  const priority = [
    "heatedSeats",
    "heatedWheel",
    "ventilatedSeats",
    "roof",
    "liftgate",
    "wirelessCharging",
    "frontSeats",
    "climate",
    "upholstery",
    "wheels",
    "audio",
    "infotainment",
    "horsepower",
    "assistance",
    "advancedAssistance",
  ];
  const result = [];
  for (let i = 0; i < options.length; i++)
    for (let j = i + 1; j < options.length; j++) {
      let from = options[i],
        to = options[j];
      if (
        from.vehicle.id !== to.vehicle.id ||
        from.trim.name === to.trim.name ||
        from.trim.configuration !== to.trim.configuration
      )
        continue;
      const order = from.vehicle.trims.map((t) => t.id);
      if (order.indexOf(from.trim.id) > order.indexOf(to.trim.id))
        [from, to] = [to, from];
      const rows = comparisonRows(catalog, [from, to], {
        differenceOnly: true,
      });
      const gains = priority
        .flatMap((id) => {
          const row = rows.find((r) => r.id === id);
          if (!row) return [];
          const [before, after] = row.cells;
          if (
            after.status !== "standard" ||
            !["standard", "not-standard"].includes(before.status) ||
            (before.value === after.value && before.status === after.status)
          )
            return [];
          return [{ label: row.label, cell: after, before }];
        })
        .slice(0, 4);
      if (gains.length) result.push({ from, to, gains });
    }
  return result;
}
export function visibleYearChanges(vehicle) {
  return (vehicle.modelYearChanges?.items || []).flatMap((item) => {
    const sentences = item.text
      .split(/(?<=[.!?])\s+(?=[A-Z])/)
      .filter((text) => !/\b(?:optional|package|factory option)\b/i.test(text));
    return sentences.length ? [{ ...item, text: sentences.join(" ") }] : [];
  });
}
export function printView(catalog, vehicle, options) {
  const projected = salesOptions(options);
  const view = projected[0]?.vehicle || {
    ...vehicle,
    equipmentScope: "standard-only",
    packages: [],
    optionalEquipment: [],
    listedOptions: [],
  };
  const pairs = standardReasons(catalog, projected);
  const upgrades = pairs.slice(0, 3).map(({ from, to, gains }) => ({
    from: from.trim.name,
    to: to.trim.name,
    gains: [
      {
        text: `${gains[0].label}: ${gains[0].cell.value}`,
        sourceIds: gains[0].cell.sourceIds,
      },
    ],
  }));
  const quickReference = vehicle.quickReference
    ? {
        ...vehicle.quickReference,
        standardSpecFields: vehicle.quickReference.standardSpecFields || [
          "engine",
          "transmission",
          "torque",
          "towing",
          "fuel",
          "dimensions",
          "cargo",
        ],
        caveats: vehicle.quickReference.caveats
          .map((c) => ({ ...c, text: salesText(c.text) }))
          .filter((c) => !/\boptional|package\b/i.test(c.text)),
      }
    : undefined;
  return {
    vehicle: {
      ...view,
      upgrades,
      quickReference,
      modelYearChanges: vehicle.modelYearChanges
        ? { ...vehicle.modelYearChanges, items: visibleYearChanges(vehicle) }
        : undefined,
    },
    options: projected,
  };
}
