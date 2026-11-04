export function evidenceReady(vehicle, sourceIds = []) {
  return (
    sourceIds.length > 0 &&
    sourceIds.every((id) =>
      vehicle.sources.some(
        (s) =>
          s.id === id &&
          s.kind === "verified" &&
          s.modelYear === vehicle.year &&
          /^\d{4}-\d{2}-\d{2}$/.test(s.checkedAt || ""),
      ),
    )
  );
}
export function resolveCell(vehicle, trim, fieldId) {
  const cell = trim.equipment?.[fieldId];
  if (
    !cell ||
    cell.status === "unverified" ||
    !evidenceReady(vehicle, cell.sourceIds)
  )
    return { status: "unverified" };
  return cell;
}
export function eligibleOptions(catalog) {
  return catalog.vehicles.flatMap((vehicle) =>
    vehicle.status === "verified" && vehicle.verifiedAt
      ? vehicle.trims
          .filter((trim) => evidenceReady(vehicle, trim.sourceIds))
          .map((trim) => ({ id: `${vehicle.id}:${trim.id}`, vehicle, trim }))
      : [],
  );
}
// Source citations do not change equipment. Availability, content and conditions do.
export function equipmentKey(cell) {
  return JSON.stringify([
    cell.status,
    cell.value || "",
    cell.conditions || "",
    [...(cell.featureIds || [])].sort(),
    cell.contentsKey || cell.contentsText || "",
  ]);
}
export function rowsDiffer(cells) {
  return cells.length >= 2 && new Set(cells.map(equipmentKey)).size > 1;
}
export function comparisonRows(
  catalog,
  options,
  { differenceOnly = true, group = "" } = {},
) {
  return catalog.fields
    .filter((f) => !group || f.group === group)
    .map((field) => ({
      ...field,
      cells: options.map((o) => resolveCell(o.vehicle, o.trim, field.id)),
    }))
    .filter((row) => !differenceOnly || rowsDiffer(row.cells));
}
export function sharedStandardRows(catalog, options, { group = "" } = {}) {
  if (options.length < 2) return [];
  return comparisonRows(catalog, options, {
    differenceOnly: false,
    group,
  }).filter(
    (row) =>
      row.cells.every((c) => c.status === "standard") && !rowsDiffer(row.cells),
  );
}
export function packageComparisonRows(options, { differenceOnly = true } = {}) {
  const listings = new Map();
  for (const { vehicle } of options) {
    for (const [kind, items] of [
      ["Package", vehicle.packages || []],
      ["Listed option", vehicle.optionalEquipment || []],
    ]) {
      for (const item of items) {
        if (!evidenceReady(vehicle, item.sourceIds)) continue;
        const key = `${kind}:${item.name.trim().toLowerCase()}`;
        if (!listings.has(key))
          listings.set(key, {
            id: key,
            label: item.name,
            group: kind,
            items: [],
          });
        const row = listings.get(key);
        if (
          !row.items.some(
            (x) => x.vehicleId === vehicle.id && x.item.id === item.id,
          )
        )
          row.items.push({ vehicleId: vehicle.id, item });
      }
    }
  }
  return [...listings.values()]
    .map(({ items, ...row }) => ({
      ...row,
      cells: options.map(({ vehicle, trim }) => {
        const matches = items
          .filter(
            (x) =>
              x.vehicleId === vehicle.id && x.item.trimIds.includes(trim.id),
          )
          .map((x) => x.item);
        if (!matches.length)
          return {
            status: "unverified",
            value:
              "No source-verified listing for this configuration. This is not proof of unavailability.",
          };
        const states = [
          ...new Set(matches.map((item) => item.status || "optional")),
        ];
        const status =
          states.length === 1 &&
          ["standard", "optional", "unavailable", "unverified"].includes(
            states[0],
          )
            ? states[0]
            : "unverified";
        const contents = matches.flatMap((item) => {
          if (row.group !== "Package") return [];
          if (item.contentsStatus === "unverified")
            return ["Contents Unverified"];
          if (!item.contents?.length) return [item.description];
          return item.contents.map((content) => {
            if (typeof content === "string") return content;
            return evidenceReady(vehicle, content.sourceIds)
              ? content.text
              : "Contents Unverified";
          });
        });
        return {
          status,
          value: [...new Set(matches.map((x) => x.description))].join("; "),
          conditions: [...new Set(matches.map((x) => x.conditions))]
            .filter(Boolean)
            .join("; "),
          contentsText: [...new Set(contents)].join("; "),
          contentsKey: [...new Set(contents)].sort(),
          sourceIds: [...new Set(matches.flatMap((x) => x.sourceIds))],
          sourcePages: Object.assign(
            {},
            ...matches.map((x) => x.sourcePages || {}),
          ),
        };
      }),
    }))
    .filter((row) => !differenceOnly || rowsDiffer(row.cells));
}
export function verifiedUpgradePairs(options) {
  const result = [];
  for (const from of options)
    for (const to of options) {
      if (
        from === to ||
        from.vehicle.id !== to.vehicle.id ||
        from.vehicle.year !== to.vehicle.year
      )
        continue;
      // Never reuse a same-name upgrade across drivetrain/powertrain variants.
      if ((from.trim.configuration || "") !== (to.trim.configuration || ""))
        continue;
      for (const upgrade of from.vehicle.upgrades || []) {
        if (upgrade.from !== from.trim.name || upgrade.to !== to.trim.name)
          continue;
        const gains = upgrade.gains.filter((g) =>
          evidenceReady(from.vehicle, g.sourceIds),
        );
        if (gains.length) result.push({ from, to, gains });
      }
    }
  return result;
}
export function searchVehicles(
  catalog,
  features,
  { query = "", brand = "", year = "" } = {},
) {
  const tokens = query
    .toLocaleLowerCase("en-US")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const vehicles = catalog.vehicles.filter((v) => {
    if (
      (brand && v.brand !== brand) ||
      (year && String(v.year) !== String(year))
    )
      return false;
    const base = `${v.year} ${v.brand} ${v.model} ${v.category}`.toLowerCase();
    const configs = eligibleOptions({ vehicles: [v] }).map(({ trim }) => {
      const cells = catalog.fields.flatMap((f) => {
        const c = resolveCell(v, trim, f.id);
        return ["standard", "optional"].includes(c.status)
          ? [
              `${f.label} ${c.value || ""} ${c.featureIds?.map((id) => features.find((f) => f.id === id)?.name || "").join(" ") || ""}`,
            ]
          : [];
      });
      // Index evidenced package/option names, never their unverified contents.
      const packageNames = (v.packages || [])
        .filter(
          (p) => p.trimIds.includes(trim.id) && evidenceReady(v, p.sourceIds),
        )
        .map((p) => p.name);
      const optionNames = (v.optionalEquipment || [])
        .filter(
          (o) => o.trimIds.includes(trim.id) && evidenceReady(v, o.sourceIds),
        )
        .map((o) => o.name);
      return `${base} ${trim.name} ${trim.configuration || ""} ${cells.join(" ")} ${packageNames.join(" ")} ${optionNames.join(" ")}`.toLowerCase();
    });
    // All feature tokens must match one configuration, rather than two incompatible trims.
    return (configs.length ? configs : [base]).some((haystack) =>
      tokens.every((t) => haystack.includes(t)),
    );
  });
  const glossary = features.filter(
    (f) =>
      (!brand || f.brand === brand) &&
      tokens.every((t) =>
        `${f.name} ${f.brand} ${f.category} ${f.summary}`
          .toLowerCase()
          .includes(t),
      ),
  );
  return { vehicles, glossary };
}
