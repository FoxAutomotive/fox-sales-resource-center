// Model-specific fields extend the shared schema without adding unknown rows to other guides.
export function equipmentFields(catalog, vehicles = []) {
  return [
    ...new Map(
      [
        ...catalog.fields,
        ...vehicles.flatMap((v) => v.additionalFields || []),
      ].map((field) => [field.id, field]),
    ).values(),
  ];
}
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
    return {
      status: "unverified",
      ...(cell?.conditions ? { conditions: cell.conditions } : {}),
    };
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
  return equipmentFields(
    catalog,
    options.map((o) => o.vehicle),
  )
    .filter(
      (f) =>
        (!group || f.group === group) &&
        (f.comparisonScope !== "model" ||
          new Set(options.map((o) => o.vehicle.id)).size <= 1),
    )
    .map((field) => ({
      ...field,
      cells: options.map((o) => {
        const cell = resolveCell(o.vehicle, o.trim, field.id);
        return options.some(
          (o) => o.vehicle.equipmentScope === "standard-only",
        ) && ["optional", "unavailable"].includes(cell.status)
          ? {
              status: "not-standard",
              value: "Not standard in this configuration",
              sourceIds: cell.sourceIds,
              sourcePages: cell.sourcePages,
              sourceCells: cell.sourceCells,
            }
          : cell;
      }),
    }))
    .filter(
      (row) =>
        !options.some((o) => o.vehicle.equipmentScope === "standard-only") ||
        row.cells.some((c) => c.status === "standard") ||
        options.some((o) =>
          o.vehicle.standardOnlyMissingFields?.includes(row.id),
        ),
    )
    .filter(
      (row) =>
        !differenceOnly ||
        rowsDiffer(row.cells) ||
        (options.some((o) =>
          o.vehicle.comparisonContextFields?.includes(row.id),
        ) &&
          row.cells.every((c) => c.status === "standard")),
    );
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
export function comparisonBaseline(catalog, options) {
  if (!options.length) return null;
  const catalogPosition = (option) => {
    const model = catalog.vehicles.findIndex(
      (v) => v.id === option.vehicle.id && v.year === option.vehicle.year,
    );
    const trim = option.vehicle.trims.findIndex((t) => t.id === option.trim.id);
    return [
      model < 0 ? Number.MAX_SAFE_INTEGER : model,
      trim < 0 ? Number.MAX_SAFE_INTEGER : trim,
    ];
  };
  const ordered = [...options].sort((a, b) => {
    const x = catalogPosition(a),
      y = catalogPosition(b);
    return x[0] - y[0] || x[1] - y[1] || a.id.localeCompare(b.id);
  });
  const sameModel = options.every(
    (o) =>
      o.vehicle.id === options[0].vehicle.id &&
      o.vehicle.year === options[0].vehicle.year,
  );
  if (!sameModel)
    return { option: ordered[0], method: "cross-model-reference" };
  const vehicle = ordered[0].vehicle;
  const edges = (vehicle.upgrades || []).filter((u) =>
    u.gains.some((g) => evidenceReady(vehicle, g.sourceIds)),
  );
  const reaches = (from, to, seen = new Set()) => {
    if (from === to) return true;
    if (seen.has(from)) return false;
    seen.add(from);
    return edges
      .filter((e) => e.from === from)
      .some((e) => reaches(e.to, to, new Set(seen)));
  };
  // Prefer the lowest selected grade established by existing verified upgrade
  // relationships, even when intermediate trims are not selected. Never rank by
  // a guessed price or equipment count. Catalog order breaks configuration ties.
  const lowest = ordered.filter((a) =>
    ordered.every((b) => reaches(a.trim.name, b.trim.name)),
  );
  if (
    new Set(ordered.map((o) => o.trim.name)).size > 1 &&
    lowest.length &&
    !ordered.some(
      (b) =>
        b.trim.name !== lowest[0].trim.name &&
        reaches(b.trim.name, lowest[0].trim.name),
    )
  )
    return { option: lowest[0], method: "verified-upgrade-order" };
  return { option: ordered[0], method: "catalog-order" };
}
export function trimComparisonSections(catalog, options, { group = "" } = {}) {
  const baseline = comparisonBaseline(catalog, options);
  if (!baseline) return { baseline: null, baseRows: [], changeRows: [] };
  const allRows = comparisonRows(catalog, options, {
    differenceOnly: false,
    group,
  });
  const changeRows = allRows.filter(
    (row) =>
      rowsDiffer(row.cells) ||
      (options.some((o) =>
        o.vehicle.comparisonContextFields?.includes(row.id),
      ) &&
        row.cells.every((c) => c.status === "standard")),
  );
  const changed = new Set(changeRows.map((row) => row.id));
  const baselineIndex = options.findIndex((o) => o === baseline.option);
  // Changed specifications appear once, with the baseline value in What Changes.
  // Only the actual baseline's evidenced Standard cells qualify for Base Equipment.
  const baseRows = allRows
    .filter(
      (row) =>
        !changed.has(row.id) && row.cells[baselineIndex].status === "standard",
    )
    .map((row) => ({ ...row, cells: [row.cells[baselineIndex]] }));
  return { baseline, baseRows, changeRows };
}
export function packageComparisonRows(options, { differenceOnly = true } = {}) {
  const listings = new Map();
  for (const { vehicle } of options) {
    for (const [kind, items] of [
      ["Package", vehicle.packages || []],
      [
        "Listed option",
        [
          ...(vehicle.optionalEquipment || []),
          ...(vehicle.listedOptions || []),
        ],
      ],
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
          [
            "standard",
            "optional",
            "unavailable",
            "not-applicable",
            "unverified",
          ].includes(states[0])
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
  const normalize = (value) =>
    value
      .toLocaleLowerCase("en-US")
      .replace(/[–—-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  const normTrim = (name) => normalize(name).replace(/®/g, "").split(/\s+/);
  const normalizedQuery = normalize(query);
  const namedSystems = features
    .map((f) => normalize(f.name))
    .filter(
      (name) =>
        name.includes(" ") && ` ${normalizedQuery} `.includes(` ${name} `),
    );
  const tokens = normalizedQuery.trim().split(/\s+/).filter(Boolean);
  const tokenMatches = (haystack, token) => {
    if (!/^(s|se|sel|le|xle|xse|[0-9.]+)$/.test(token))
      return haystack.includes(token);
    const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(?<![a-z0-9.])${escaped}(?![a-z0-9.])`, "i").test(
      haystack,
    );
  };
  const vehicles = catalog.vehicles.filter((v) => {
    if (
      (brand && v.brand !== brand) ||
      (year && String(v.year) !== String(year))
    )
      return false;
    const base = `${v.year} ${v.brand} ${v.model} ${v.category}`.toLowerCase();
    const requiredFeatures = equipmentFields(catalog, [v]).filter((f) =>
      (f.searchTerms || []).some((alias) =>
        ` ${normalizedQuery} `.includes(` ${normalize(alias)} `),
      ),
    );
    const configs = eligibleOptions({ vehicles: [v] }).flatMap(({ trim }) => {
      const trimTokens = normTrim(trim.name);
      if (
        tokens.some(
          (t) => /^(s|se|sel|le|xle|xse)$/.test(t) && !trimTokens.includes(t),
        )
      )
        return [];
      // A recognized feature phrase must be evidenced in its own category;
      // unrelated words elsewhere in a configuration cannot manufacture a match.
      if (
        !requiredFeatures.every((f) =>
          ["standard", "optional"].includes(resolveCell(v, trim, f.id).status),
        )
      )
        return [];
      const cells = equipmentFields(catalog, [v]).flatMap((f) => {
        const c = resolveCell(v, trim, f.id);
        return ["standard", "optional"].includes(c.status)
          ? [
              `${f.label} ${(f.searchTerms || []).join(" ")} ${c.value || ""} ${c.featureIds?.map((id) => features.find((f) => f.id === id)?.name || "").join(" ") || ""}`,
            ]
          : [];
      });
      // A named system must occur as a phrase in an evidenced cell. For example,
      // “super-long-slide” seating plus cruise control does not establish Super Cruise.
      if (
        !namedSystems.every((name) =>
          cells.some((value) => ` ${normalize(value)} `.includes(` ${name} `)),
        )
      )
        return [];
      // Index evidenced package/option names, never their unverified contents.
      const packageNames = (v.packages || [])
        .filter(
          (p) =>
            p.trimIds.includes(trim.id) &&
            ["standard", "optional"].includes(p.status || "optional") &&
            evidenceReady(v, p.sourceIds),
        )
        .map((p) => p.name);
      const optionNames = [
        ...(v.optionalEquipment || []),
        ...(v.listedOptions || []),
      ]
        .filter(
          (o) =>
            o.trimIds.includes(trim.id) &&
            ["standard", "optional"].includes(o.status || "optional") &&
            evidenceReady(v, o.sourceIds),
        )
        .map((o) => o.name);
      return [
        normalize(
          `${base} ${trim.name} ${trim.configuration || ""} ${cells.join(" ")} ${packageNames.join(" ")} ${optionNames.join(" ")}`,
        ),
      ];
    });
    // All feature tokens must match one configuration, rather than two incompatible trims.
    return (
      eligibleOptions({ vehicles: [v] }).length
        ? configs
        : requiredFeatures.length
          ? []
          : [normalize(base)]
    ).some((haystack) => tokens.every((t) => tokenMatches(haystack, t)));
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
