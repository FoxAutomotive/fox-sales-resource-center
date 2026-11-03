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
export function comparisonRows(
  catalog,
  options,
  { differenceOnly = false, group = "" } = {},
) {
  return catalog.fields
    .filter((f) => !group || f.group === group)
    .map((field) => ({
      ...field,
      cells: options.map((o) => resolveCell(o.vehicle, o.trim, field.id)),
    }))
    .filter((row) => {
      if (!differenceOnly) return true;
      if (
        row.cells.length < 2 ||
        row.cells.some((c) => c.status === "unverified")
      )
        return false;
      return (
        new Set(
          row.cells.map((c) =>
            JSON.stringify([c.status, c.value || "", c.conditions || ""]),
          ),
        ).size > 1
      );
    });
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
      return `${base} ${trim.name} ${trim.configuration || ""} ${cells.join(" ")}`.toLowerCase();
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
