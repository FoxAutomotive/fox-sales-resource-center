import { createHash } from "node:crypto";
export const gmReviewedDigest = (stage) =>
  createHash("sha256")
    .update(
      JSON.stringify(
        Object.fromEntries(
          [
            "source",
            "configurations",
            "equipment",
            "tables",
            "reviewNotes",
          ].map((key) => [key, stage[key]]),
        ),
      ),
    )
    .digest("hex");
// Source-profile helpers for GM layouts beyond the original Equinox export.
const noteParts = (row) => [
  ...row.description.matchAll(/(?:^|\n)(\d+)[.:]\s*([\s\S]*?)(?=\n\d+[.:]|$)/g),
];
export function prepareReviewedGm(input) {
  if (gmReviewedDigest(input) !== input.contentSha256)
    throw new Error("Reviewed GM content fingerprint changed");
  if (
    new Set(input.configurations.map((c) => c.id)).size !==
    input.configurations.length
  )
    throw new Error("Duplicate reviewed GM configuration ID");
  const stage = structuredClone(input);
  const selections = [];
  for (const row of stage.equipment) {
    row.conditions = row.cells.map((cell) =>
      noteParts(row)
        .filter((n) => (cell.raw.match(/\d+/g) || []).includes(n[1]))
        .map((n) => `${n[1]}. ${n[2].trim()}`)
        .join(" "),
    );
    for (const [i, config] of stage.configurations.entries()) {
      const cell = row.cells[i],
        label = row.description.split(/\n\d+[.:]/)[0];
      if (stage.source.model !== "Blazer") continue;
      let selected;
      if (/^Engine,/.test(label)) selected = row.code === config.engineCode;
      else if (/^Transmission,/.test(label))
        selected = row.code === (config.engineCode === "LGX" ? "M3V" : "M3T");
      else if (/^Advanced All-Wheel Drive/.test(label))
        selected = config.trim === "RS" && config.drive === "AWD";
      else if (/^All-wheel drive/.test(label))
        selected = config.drive === "AWD";
      else if (/^Axle, 3\.(47|49)/.test(label))
        selected = label.includes(
          config.engineCode === "LGX" ? "3.49" : "3.47",
        );
      else if (row.code === "V92")
        selected = config.drive === "AWD" || config.engineCode === "LGX";
      else if (row.code === "V08") selected = config.engineCode === "LGX";
      else if (row.code === "PZ8" && config.trim === "RS")
        selected = config.drive === "AWD" || config.engineCode === "LGX";
      if (selected === undefined) continue;
      if (selected && !/^(S|A|■|□)/.test(cell.raw))
        throw new Error(
          `Unsupported selected mechanical configuration: ${config.id}/${row.code}`,
        );
      const status = selected ? "standard" : "not-standard";
      if (cell.status !== status)
        selections.push({
          configuration: config.id,
          code: row.code,
          raw: cell.raw,
          status,
          ref: cell.ref,
          descriptionCell: row.descriptionCell,
          reason:
            "Explicit selected engine/drivetrain or manufacturer footnote; not an equipment-package upgrade.",
        });
      cell.status = status;
      row.conditions[i] = [
        row.conditions[i],
        selected
          ? "Selected mechanical configuration; original S/A symbol and manufacturer restrictions are retained in the reviewed stage."
          : "Different selected powertrain/drivetrain.",
      ]
        .filter(Boolean)
        .join(" ");
    }
  }
  // A standard package's explicitly named RPO is included, even if the component's
  // individual row says A. A conflicting -- remains unresolved and is reported.
  for (let pass = 0; pass < 3; pass++)
    for (const parent of stage.equipment) {
      const text = parent.description.split(/\n\d+[.:]/)[0],
        start = text.toLowerCase().indexOf("includes");
      if (start < 0 || /LPO,|fleet.only/i.test(text)) continue;
      for (const match of text.slice(start).matchAll(/\(([A-Z0-9]{3})\)/g))
        for (const child of stage.equipment.filter(
          (r) => r.code === match[1] && r !== parent,
        ))
          for (let i = 0; i < stage.configurations.length; i++) {
            if (
              parent.cells[i].status === "standard" &&
              child.cells[i].raw === "--" &&
              child.cells[i].status === "not-standard"
            ) {
              child.cells[i].status = "unverified";
              child.conditions[i] =
                `Source disagreement: ${parent.descriptionCell} lists ${child.code} in a standard package, while ${child.cells[i].ref} is --. Manufacturer confirmation required.`;
            }
            if (
              parent.cells[i].status !== "standard" ||
              child.cells[i].status !== "not-standard" ||
              !/^A/.test(child.cells[i].raw)
            )
              continue;
            child.cells[i].status = "standard";
            child.conditions[i] = [
              child.conditions[i],
              `Included RPO ${child.code} in factory-standard ${text.split(",")[0]}; package ${parent.descriptionCell}, ${parent.cells[i].ref}.`,
            ]
              .filter(Boolean)
              .join(" ");
            selections.push({
              configuration: stage.configurations[i].id,
              code: child.code,
              raw: child.cells[i].raw,
              status: "standard",
              ref: child.cells[i].ref,
              descriptionCell: parent.descriptionCell,
              packageRef: parent.cells[i].ref,
              reason:
                "Explicit member of this configuration's standard package; optional packages never promoted.",
            });
          }
    }
  stage.selectionChecks = selections;
  return stage;
}
export function reviewedColors(stage, sid) {
  const table = stage.tables["Color and Trim"],
    interior = table.findIndex((r) => r[0] === "Decor Level"),
    exterior = table.findIndex((r) => r[0] === "Exterior Solid Paint");
  if (interior < 0 || exterior < 0)
    throw new Error("Unrecognized GM color/trim matrix");
  const colors = { interiors: [], exteriors: [] };
  const notesText = table
    .map((r) => String(r[0] || ""))
    .filter((t) => /(?:^|\n)\d+[.:]/.test(t))
    .join("\n");
  const colorNotes = new Map(
    [
      ...notesText.matchAll(/(?:^|\n)(\d+)[.:]\s*([\s\S]*?)(?=\n\d+[.:]|$)/g),
    ].map((m) => [m[1], m[2].trim()]),
  );
  for (let i = interior + 1; i < exterior; i++) {
    const row = table[i];
    for (const trim of [
      ...new Set(
        stage.configurations
          .filter((c) => c.colorDecor === row[0])
          .map((c) => c.trim),
      ),
    ])
      for (let col = 4; col < row.length; col++)
        if (row[col] && row[col] !== "--")
          colors.interiors.push({
            trim,
            name: String(table[interior][col]),
            material: String(row[3]),
            standard: false,
            colorColumn: col,
            sourceIds: [sid],
            sourceCells: {
              [sid]: [
                `Color and Trim!A${i + 1}`,
                `Color and Trim!D${i + 1}`,
                `Color and Trim!${String.fromCharCode(65 + col)}${i + 1}`,
              ],
            },
          });
  }
  for (let i = exterior + 1; i < table.length; i++) {
    const row = table[i];
    if (!row[2] || !row[0] || !row.slice(4).some((v) => /^A/.test(String(v))))
      continue;
    const eligible = colors.interiors.filter((c) =>
      /^A/.test(String(row[c.colorColumn] || "")),
    );
    const refs = String(row[0]).match(/(\d+)$/)?.[1];
    const restrictions = refs ? colorNotes.get(refs) || "" : "";
    const notOrderable =
      /no longer available|built out|not available for ordering/i.test(
        restrictions,
      );
    colors.exteriors.push({
      name:
        String(row[0])
          .replace(/^NEW!\s*/, "")
          .replace(/\d+$/, "")
          .trim() +
        (notOrderable ? " (not available to order per source)" : ""),
      ...(restrictions ? { conditions: restrictions } : {}),
      trims: [...new Set(eligible.map((c) => c.trim))],
      interiorNames: [...new Set(eligible.map((c) => c.name))],
      extraCost: /Extra cost/i.test(restrictions),
      sourceIds: [sid],
      sourceCells: {
        [sid]: [
          `Color and Trim!A${i + 1}`,
          ...eligible.map(
            (c) =>
              `Color and Trim!${String.fromCharCode(65 + c.colorColumn)}${i + 1}`,
          ),
        ],
      },
    });
  }
  return colors;
}
export function reviewedTechnical(stage, config, equipment, sid) {
  const claim = (value, refs, conditions) => ({
    status: "standard",
    value,
    sourceIds: [sid],
    sourceCells: { [sid]: refs },
    ...(conditions ? { conditions } : {}),
  });
  const unknown = (reason) => ({ status: "unverified", conditions: reason });
  const c = stage.configurations.findIndex((x) => x.id === config.id);
  const engines = stage.equipment.filter(
    (r) => /^Engine,/.test(r.description) && r.cells[c].status === "standard",
  );
  const text = engines[0]?.description || "",
    refs = engines.flatMap((r) => [r.descriptionCell, r.cells[c].ref]);
  for (const [key, pattern, unit] of [
    ["horsepower", /(\d+)\s*hp\b/i, "hp"],
    ["torque", /(\d+)\s*lb-ft/i, "lb-ft"],
  ]) {
    const match = text.match(pattern);
    if (match)
      equipment[key] = claim(
        `${match[1]} ${unit}`,
        refs,
        "Manufacturer engine rating for the selected powertrain; full rpm/basis is retained in the engine description.",
      );
  }
  const mech = stage.equipment.find(
    (r) =>
      /^(?:All-wheel drive|Front-wheel drive|Drivetrain, front-wheel drive)/.test(
        r.description,
      ) && r.cells[c].status === "standard",
  );
  equipment.drivetrain = claim(
    config.drive,
    [
      ...(mech ? [mech.descriptionCell, mech.cells[c].ref] : []),
      `Specs!${String.fromCharCode(65 + config.specColumn)}1`,
    ],
    [
      "Selected manufacturer-listed configuration, verified against equipment/header and specification columns.",
      config.reviewNote,
    ]
      .filter(Boolean)
      .join(" "),
  );
  const colors = reviewedColors(stage, sid).interiors.filter(
    (x) => x.trim === config.trim,
  );
  const materials = [...new Set(colors.map((x) => x.material))];
  equipment.upholstery =
    materials.length === 1
      ? claim(
          `${materials[0]} — ${[...new Set(colors.map((x) => x.name))].join(" / ")}`,
          colors.flatMap((x) => x.sourceCells[sid]),
          "Manufacturer decor-level material and eligible interior colors; colors are availability references, not inventory.",
        )
      : unknown(
          "Color and Trim lists multiple materials for this decor level without resolving standard versus available material; manufacturer confirmation required.",
        );
  const spec = (pattern, key, unit = "") => {
    const table = stage.tables.Specs,
      entries = table
        .map((r, i) => ({ r, i }))
        .filter(
          ({ r }) =>
            pattern.test(String(r[0])) &&
            r[config.specColumn] &&
            !/^(?:--|TBD|N\/A)$/i.test(String(r[config.specColumn]).trim()),
        );
    if (entries.length)
      equipment[key] = claim(
        entries
          .map(
            ({ r }) => `${r[0]}: ${String(r[config.specColumn]).trim()}${unit}`,
          )
          .join("; "),
        entries.map(
          ({ i }) =>
            `Specs!${String.fromCharCode(65 + config.specColumn)}${i + 1}`,
        ),
      );
  };
  spec(/^Passenger volume/i, "passengerVolume");
  const clearance = stage.tables.Dimensions.map((row, index) => ({
    row,
    index,
  })).filter(
    ({ row }) =>
      /^Ground clearance/i.test(String(row[0])) &&
      row[config.dimensionColumn] &&
      !/^(?:--|TBD)$/i.test(String(row[config.dimensionColumn]).trim()),
  );
  if (clearance.length)
    equipment.groundClearance = claim(
      clearance
        .map(
          ({ row }) =>
            `${row[0]}: ${String(row[config.dimensionColumn])
              .trim()
              .replace(/([\d.]+)\s*\(([^)]+)\)/, "$1 in ($2 mm)")}`,
        )
        .join("; "),
      clearance.map(
        ({ index }) =>
          `Dimensions!${String.fromCharCode(65 + config.dimensionColumn)}${index + 1}`,
      ),
    );
  const tow = stage.tables["Trailering Specs"];
  if (tow) {
    let rowIndex;
    if (stage.source.model === "Traverse")
      rowIndex = tow.findIndex(
        (r) =>
          String(r[0]).includes(config.trim) &&
          (!/SL/.test(String(r[0])) || config.trim === "SL"),
      );
    if (stage.source.model === "Blazer")
      rowIndex =
        config.engineCode === "LGX"
          ? config.drive === "AWD"
            ? 9
            : 8
          : config.drive === "AWD"
            ? 6
            : 4;
    const column =
      stage.source.model === "Blazer" && config.engineCode === "LGX" ? 4 : 2;
    const value = tow[rowIndex]?.[column];
    if (value && !/^(--|TBD)$/.test(String(value)))
      equipment.towing = claim(
        `${String(value).replace(/([\d.]+)\s*\(([^)]+)\)/, "$1 lb ($2 kg)")} — maximum trailer rating with the documented selected factory tow equipment`,
        [
          `Trailering Specs!${String.fromCharCode(65 + column)}${rowIndex + 1}`,
          "Trailering Specs!A1",
        ],
        `${tow[0][0]} No optional tow upgrade is assumed; Blazer FWD V6 includes its required V92 equipment.`,
      );
  }
}

export function reverifyGmStage(incoming, archived, existing) {
  const rows = (stage) =>
    stage.equipment
      .map((row) =>
        JSON.stringify([
          row.sheet,
          row.code,
          row.description,
          row.cells.map((c) => c.raw),
        ]),
      )
      .sort();
  if (
    incoming.source.year !== archived.source.year ||
    incoming.source.model !== archived.source.model ||
    existing.importProvenance?.sha256 !== archived.source.sha256 ||
    JSON.stringify(rows(incoming)) !== JSON.stringify(rows(archived))
  )
    throw new Error(
      "Existing GM source content differs; claim-level review required",
    );
  for (const key of Object.keys(archived.tables))
    if (
      JSON.stringify(incoming.tables[key]) !==
      JSON.stringify(archived.tables[key])
    )
      throw new Error("Existing GM specifications/highlights differ: " + key);
  const movedRows = incoming.equipment.flatMap((row) => {
    const old = archived.equipment.find(
      (r) =>
        r.sheet === row.sheet &&
        r.code === row.code &&
        r.description === row.description,
    );
    return old && old.row !== row.row
      ? [
          {
            sheet: row.sheet,
            code: row.code,
            description: row.description,
            previousRow: old.row,
            currentRow: row.row,
          },
        ]
      : [];
  });
  return {
    id: existing.id,
    source: incoming.source,
    status: "reverified",
    reason:
      "All shared equipment descriptions/indicators, specifications, colors and highlights match the archived verified workbook; only row ordering changed. Existing verified record and citations are preserved against that archived source.",
    movedRows,
    standardCounts: existing.importProvenance.standardCounts,
  };
}
