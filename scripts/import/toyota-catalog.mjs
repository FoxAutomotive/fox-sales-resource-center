// Presentation-independent Toyota brochure merge. Existing verified claims win.
import { createHash } from "node:crypto";
import { evidenceReady } from "../../lib.js";
import { validate } from "../validate.mjs";
const digest = (value) =>
  createHash("sha256")
    .update(typeof value === "string" ? value : JSON.stringify(value))
    .digest("hex");
const unknown = (conditions) => ({ status: "unverified", conditions });
const patterns = {
  engine:
    /^(?:i-FORCE|Hybrid(?: MAX)? powertrain|Hybrid—|Gasoline engine|\d\.\d-liter.*4-cylinder)/i,
  horsepower:
    /\b(?:net combined hp|combined net hp|Hybrid system net power|\d+ hp @|maximum horsepower)\b/i,
  torque: /Max\. Torque:|\d+ lb\.-ft\./i,
  transmission:
    /^(?:(?:\d+-speed|Direct Shift-8AT|Dynamic-Shift|Electronically controlled|Continuously Variable).*Transmission|Manual Transmission)/i,
  drivetrain:
    /^Front-Wheel Drive|^Rear-Wheel Drive|^4WDemand|^Full-time 4-Wheel Drive|^All-Wheel Drive \(AWD\)$|^Electronic On-Demand|^Dynamic Torque (?:Control AWD|Vectoring All-Wheel Drive)|^Full-Time Electronic All-Wheel Drive/i,
  wheels: /\d+-in\..*wheels/i,
  appearance: /grille|bumper|emblem|badg|roof rails/i,
  roof: /moonroof|sunroof/i,
  panoramicRoof: /panoramic.*(?:moonroof|sunroof)/i,
  seating: /^[78]-passenger seating/i,
  upholstery: /trimmed.*seats|seats.*trimmed/i,
  heatedSeats:
    /heated[^;]{0,100}(?:front seats|front passenger seats)|front seats[^;]{0,60}heated/i,
  ventilatedSeats: /ventilated.*(?:front seats|front passenger|driver)/i,
  heatedWheel: /heated.*steering wheel|steering wheel.*heated/i,
  frontSeats:
    /(?:manually|power-?)\s*adjustable.*(?:driver|passenger)|driver.*adjustable/i,
  infotainment:
    /Toyota Audio Multimedia.*(?:touchscreen|display)|(?:touchscreen|display).*Toyota Audio Multimedia/i,
  instruments: /gauge cluster|Combination meter/i,
  audio: /Toyota Audio Multimedia|speaker.*(?:audio|JBL)|JBL.*speaker/i,
  phone: /Apple CarPlay|Android Auto/i,
  mediaConnectivity: /USB|Bluetooth|SiriusXM/i,
  assistance: /Toyota Safety Sense/i,
  adaptiveCruiseControl: /Dynamic Radar Cruise Control/i,
  highBeam: /Automatic High Beams/i,
  roadSigns: /Road Sign Assist/i,
  safety:
    /airbags|Star Safety|seatbelts|seatbelt|LATCH|child-protector|Tire Pressure|rear-seat reminder/i,
  wirelessCharging: /wireless (?:smartphone )?charging|Qi.*charging/i,
  headUpDisplay: /Head-Up Display/i,
  cargoOutlet: /(?:120V|120V).*power|AC power (?:supply|outlet)/i,
  advancedAssistance:
    /Traffic Jam Assist|Lane Change Assist|Front Cross-Traffic/i,
  parkingAutomation: /Advanced Park/i,
  liftgate: /power.*(?:liftgate|tailgate)|(?:liftgate|tailgate).*power/i,
  areaView: /^(?:3D )?Panoramic View Monitor/i,
  keyless: /Smart Key System|keyless entry/i,
  climate: /automatic climate control|air conditioning/i,
  ambient: /ambient.*lighting/i,
  wipers: /windshield wipers|de-icer|rain-sensing/i,
  rearviewMirror: /rearview mirror/i,
  steeringWheel: /steering wheel/i,
  powerOutlets: /12V|12-volt/i,
  parkingSensors: /Parking Assist|Parking.*Sonar/i,
  rearCamera: /backup camera|Backup Guide Monitor/i,
};
Object.assign(patterns, {
  tires: /\d+(?:-in\.|-inch|\/).*tires|all-terrain tires/i,
  chassis: /suspension|stabilizer|rear spring/i,
  brakes: /disc brakes|Electronically Controlled Braking|regenerative braking/i,
  steering: /Electric Power Steering|rack-and-pinion/i,
});
const specNames = {
  dimensions: "Exterior dimensions",
  wheelbase: "Wheelbase",
  groundClearance: "Ground clearance",
  headroom: "Headroom",
  legroom: "Legroom",
  interiorRoom: "Shoulder / hip room",
  passengerVolume: "Passenger volume",
  cargo: "Cargo capacity",
  fuel: "Fuel tank capacity",
  tires: "Standard tires",
  chassis: "Chassis / suspension",
  brakes: "Brakes",
  steering: "Steering system",
};
function group(row) {
  if (
    /audio|USB|charging|gauge cluster|Combination meter|Head-Up|power outlet|power supply|AC power/i.test(
      row.label,
    )
  )
    return "Technology";
  if (/Safety/.test(row.category)) return "Safety";
  if (/Mechanical/.test(row.category)) return "Performance";
  if (/Interior/.test(row.category)) return "Comfort";
  if (/Audio/.test(row.category)) return "Technology";
  return "Exterior";
}
function cell(stage, source, row, status, value = row.label, conditions = "") {
  const restrictions = (row.footnotes || [])
    .map((n) => stage.disclosures[n] || "")
    .filter((text) =>
      /spare tire|not available on manual transmissions|ottomans are removed/i.test(
        text,
      ),
    )
    .join(" ");
  const footnotes = row.footnotes?.length
    ? `Manufacturer footnotes ${row.footnotes.join(", ")}; see View Sources and brochure disclosure pages ${stage.disclosurePages.join(", ")}.`
    : "";
  return {
    status,
    value,
    sourceIds: [source.id],
    sourcePages: { [source.id]: String(row.page) },
    sourceSections: {
      [source.id]:
        row.section ||
        `Equipment matrix${row.sourceColumn ? `, ${row.sourceColumn}` : ""}, row ${row.label}`,
    },
    ...(conditions || footnotes || restrictions
      ? {
          conditions: [conditions, footnotes, restrictions]
            .filter(Boolean)
            .join(" "),
        }
      : {}),
  };
}
function decode(stage, profile, config, source, row, manual) {
  row = { ...row, sourceColumn: profile.columns[config.column].name };
  const symbol = row.symbols[config.column];
  if (!symbol)
    return unknown(
      "Empty manufacturer table cell; no claim of unavailability is inferred.",
    );
  const cite = {
    model: profile.model,
    configuration: config.id,
    page: row.page,
    label: row.label,
    symbol,
  };
  const notes = (row.footnotes || [])
    .map((n) => stage.disclosures[n] || "")
    .join(" ");
  if (
    /Digital Key capability/.test(row.label) &&
    /requires|subscription required/.test(row.label)
  ) {
    manual.push({
      ...cite,
      type: "excluded-paid-activation",
      reason:
        "Factory capability is recorded in the stage, but activation depends on Remote Connect. Excluded from standard-only equipment; not reclassified as absent.",
    });
    return { status: "excluded" };
  }
  const hold = profile.holdRules.find(
    (rule) =>
      (!rule.columns || rule.columns.includes(config.column)) &&
      (!rule.drive || rule.drive === config.drive) &&
      (!rule.transmission || rule.transmission === config.transmission) &&
      new RegExp(rule.pattern, "i").test(row.label),
  );
  if (hold) {
    manual.push({
      ...cite,
      type: "ambiguous-applicability",
      reason: hold.reason,
    });
    return unknown(
      `Held for review: ${hold.reason} Source ${source.id}, PDF p. ${row.page}.`,
    );
  }
  if (
    config.transmission === "6MT" &&
    /Not available on manual transmissions/i.test(notes)
  )
    return cell(
      stage,
      source,
      row,
      "not-applicable",
      "Not applicable to the selected manual transmission",
      "Manufacturer footnote excludes manual transmissions.",
    );
  // Explicit selected mechanical configuration overrides an A indicating availability,
  // never an equipment package. The profile's row must contain S or A in this column.
  if (row.label === config.driveRow || row.label === config.transmissionRow)
    return cell(
      stage,
      source,
      row,
      "standard",
      row.label,
      "Selected manufacturer-listed mechanical configuration. Original S/A symbol retained in import stage.",
    );
  if (patterns.drivetrain.test(row.label))
    return cell(
      stage,
      source,
      row,
      "not-applicable",
      "Not applicable to the selected drivetrain",
      "Different manufacturer-listed drive configuration.",
    );
  if (patterns.transmission.test(row.label))
    return cell(
      stage,
      source,
      row,
      "not-applicable",
      "Not applicable to the selected transmission",
    );
  if (profile.model === "RAV4" && /Hybrid powertrain:/.test(row.label)) {
    const isAWD = config.drive === "AWD",
      high = /236 net/.test(row.label);
    return cell(
      stage,
      source,
      row,
      high === isAWD ? "standard" : "not-applicable",
      high === isAWD ? row.label : "Not applicable to the selected drivetrain",
      "Output follows the selected FWD/AWD powertrain; raw symbols retained.",
    );
  }
  if (
    profile.model === "RAV4" &&
    /Power output \(front\/rear\)/.test(row.label)
  ) {
    manual.push({
      ...cite,
      type: "unspecified-basis",
      reason:
        "Rear motor output is marked S even in FWD columns; do not assign unqualified front/rear output to every configuration.",
    });
    return unknown(
      "Brochure motor-output basis conflicts with FWD applicability; verification required.",
    );
  }
  if (
    profile.model === "Sienna" &&
    /Permanent magnet synchronous motors/.test(row.label)
  ) {
    const rear = /one rear/.test(row.label);
    if (rear !== (config.drive === "AWD"))
      return cell(
        stage,
        source,
        row,
        "not-applicable",
        "Motor layout does not apply to the selected drivetrain",
      );
  }
  return cell(
    stage,
    source,
    row,
    symbol === "S" ? "standard" : "optional",
    row.label,
    symbol === "A"
      ? "Manufacturer marks A = Available; not factory-standard. Package/ordering conditions require confirmation."
      : "",
  );
}
function combine(cells, reason) {
  const standard = cells.filter((c) => c.status === "standard"),
    optional = cells.filter((c) => c.status === "optional");
  const selected = standard.length ? standard : optional;
  if (!selected.length) return unknown(reason);
  const first = structuredClone(selected[0]);
  first.value = [...new Set(selected.map((c) => c.value))].join("; ");
  first.sourcePages = Object.fromEntries(
    first.sourceIds.map((id) => [
      id,
      [
        ...new Set(
          selected.flatMap((c) => (c.sourcePages[id] || "").split(", ")),
        ),
      ]
        .filter(Boolean)
        .sort((a, b) => Number(a) - Number(b))
        .join(", "),
    ]),
  );
  first.conditions = [
    ...new Set(selected.map((c) => c.conditions).filter(Boolean)),
  ].join(" ");
  return first;
}
function summarize(field, value) {
  if (field === "horsepower") {
    const match = value.match(
      /(\d+)\s+(?:net combined hp|combined net hp|hp)(?:\s*@\s*([\d,]+)\s*rpm)?/i,
    );
    return match
      ? `${match[1]} ${/combined/.test(match[0]) ? "net combined hp" : "hp"}${match[2] ? ` @ ${match[2]} rpm` : ""}`
      : value;
  }
  if (field === "torque") {
    const match = value.match(/(\d+)\s*lb\.-ft\.(?:\s*@\s*([\d,-]+)\s*rpm)?/i);
    return match
      ? `${match[1]} lb.-ft.${match[2] ? ` @ ${match[2]} rpm` : ""} (brochure torque basis retained; no motor/engine summing)`
      : value;
  }
  if (field === "seating") {
    const values = [
      ...new Set([...value.matchAll(/([78])-passenger/g)].map((m) => m[1])),
    ];
    return values.length === 1
      ? `${values[0]} passengers (manufacturer-listed seating layout)`
      : value;
  }
  return value;
}
const safeRow = (row) => `toyota-brochure-${digest(row.label).slice(0, 12)}`;
export function toyotaContentDigest(stage) {
  return digest({
    rows: stage.rows.map(({ bbox, ...row }) => row),
    disclosures: stage.disclosures,
    colors: stage.colors,
    facts: stage.facts,
    highlights: stage.highlights || [],
    pageInventory: stage.pageInventory,
  });
}
export function importToyotaBatch(entries, base, features) {
  const catalog = structuredClone(base),
    report = {
      schemaVersion: 1,
      adapter: "toyota-sa-brochure-v1",
      baseSha256: digest(base),
      models: [],
      conflicts: [],
      manualVerification: [],
      preservedVehicles: [],
      sourceMatches: [],
      baseVehicles: base.vehicles.map((v) => ({ id: v.id, sha256: digest(v) })),
    };
  const changed = new Set();
  for (const { stage, profile } of entries) {
    if (
      stage.adapter !== report.adapter ||
      stage.source.year !== profile.year ||
      stage.source.model !== profile.model ||
      stage.source.sha256 !== profile.sha256 ||
      stage.source.pageCount !== profile.pageCount ||
      stage.rows.some((row) => row.symbols.length !== profile.columns.length)
    )
      throw new Error("Toyota stage/profile mismatch");
    if (
      !profile.expectedContentSha256 ||
      toyotaContentDigest(stage) !== profile.expectedContentSha256
    )
      throw new Error(
        "Toyota extracted content differs from reviewed fingerprint",
      );
    if (
      stage.pageInventory.length !== profile.pageCount ||
      stage.pageInventory.some((p, i) => p.page !== i + 1) ||
      stage.rows.some(
        (row) =>
          !profile.matrixPages.includes(row.page) ||
          !row.label ||
          !row.symbols.every((symbol) => ["S", "A", ""].includes(symbol)),
      )
    )
      throw new Error("Invalid Toyota page inventory or matrix symbol");
    for (const page of profile.matrixPages)
      if (
        stage.rows.filter((row) => row.page === page).length !==
        profile.rowCounts[String(page)]
      )
        throw new Error("Toyota matrix row coverage changed");
    const existing = catalog.vehicles.find((v) => v.id === profile.vehicleId);
    const v = existing || {
      id: profile.vehicleId,
      brand: "toyota",
      model: profile.model,
      year: profile.year,
      category:
        profile.category ||
        (profile.model === "Tacoma"
          ? "Pickup"
          : profile.model === "Sienna"
            ? "Minivan"
            : "SUV"),
      status: "verified",
      verifiedAt: profile.reviewedAt,
      summary: `${profile.year} ${profile.model}: manufacturer brochure equipment by trim and declared mechanical configuration.`,
      sources: [],
      trims: [],
      packages: [],
      upgrades: [],
      notes: [],
    };
    const same = v.sources.find((s) => s.sha256 === stage.source.sha256);
    const source = same || {
      id: profile.id,
      title: `Toyota ${profile.year} ${profile.model} eBrochure — supplied PDF, ${stage.source.pageCount} pages`,
      url:
        profile.modelUrl ||
        `https://www.toyota.com/${profile.model.toLowerCase().replaceAll(" ", "")}/`,
      kind: "verified",
      modelYear: profile.year,
      checkedAt: profile.reviewedAt,
      delivery: "user-upload",
      fileName: stage.source.fileName,
      sha256: stage.source.sha256,
      pageCount: stage.source.pageCount,
      shortLabel: `TY-${profile.model === "Grand Highlander" ? "GH" : profile.model.toUpperCase()}${String(profile.year).slice(-2)}`,
      scope:
        "Equipment tables use S = Standard and A = Available. Blank cells are not proof of unavailability. The URL opens the manufacturer model reference, not the supplied attachment.",
    };
    if (!same) v.sources.push(source);
    report.sourceMatches.push({
      model: profile.model,
      sourceId: source.id,
      reused: !!same,
      sha256: source.sha256,
    });
    const result = {
      id: v.id,
      model: profile.model,
      year: profile.year,
      columns: profile.columns.length,
      configurations: profile.configs.length,
      matrixRows: stage.rows.length,
      pagesProcessed: stage.pageInventory.length,
      baselineFieldCount: existing
        ? base.vehicles
            .find((old) => old.id === v.id)
            .trims.reduce((n, t) => n + Object.keys(t.equipment).length, 0)
        : 0,
      baselineCells: existing
        ? base.vehicles
            .find((old) => old.id === v.id)
            .trims.flatMap((t) =>
              Object.entries(t.equipment).map(([field, c]) => ({
                configuration: t.id,
                field,
                status: c.status,
                sha256: digest(c),
              })),
            )
        : [],
      resolvedFields: [],
      standardEquipmentAdded: 0,
      specificationsAdded: [],
      colors: {},
      missingSpecifications: [],
      conflicts: [],
      manualVerification: [],
    };
    v.additionalFields = v.additionalFields || [];
    for (const [id, label] of Object.entries(specNames))
      if (
        !catalog.fields.some((f) => f.id === id) &&
        !v.additionalFields.some((f) => f.id === id) &&
        (stage.facts.some((fact) => fact.field === id) ||
          (patterns[id] &&
            stage.rows.some((row) => patterns[id].test(row.label))))
      )
        v.additionalFields.push({
          id,
          label,
          group: ["tires"].includes(id) ? "Exterior" : "Performance",
          comparisonScope: "model",
        });
    const rowFields = new Map();
    for (const row of stage.rows) {
      const id = safeRow(row);
      rowFields.set(id, row);
      if (!v.additionalFields.some((f) => f.id === id))
        v.additionalFields.push({
          id,
          label: row.label,
          group: group(row),
          comparisonScope: "model",
        });
    }
    for (const config of profile.configs) {
      if (config.column < 0 || config.column >= profile.columns.length)
        throw new Error("Unknown Toyota column");
      let trim = v.trims.find((t) => t.id === config.id);
      if (!trim) {
        trim = {
          id: config.id,
          name: config.name,
          configuration: config.configuration,
          sourceIds: [source.id],
          equipment: {},
        };
        v.trims.push(trim);
      }
      // Existing structure is immutable: a profile cannot relabel an established configuration.
      if (
        trim.name !== config.name ||
        trim.configuration !== config.configuration
      )
        throw new Error(
          `Existing Toyota trim identity conflicts: ${config.id}`,
        );
      const decoded = stage.rows.map((row) => ({
        row,
        cell: decode(
          stage,
          profile,
          config,
          source,
          row,
          result.manualVerification,
        ),
      }));
      function merge(field, incoming) {
        const old = trim.equipment[field];
        if (!incoming || incoming.status === "excluded") return;
        if (
          old &&
          old.status !== "unverified" &&
          evidenceReady(v, old.sourceIds)
        ) {
          if (
            incoming.status !== "unverified" &&
            (old.status !== incoming.status || old.value !== incoming.value)
          )
            result.conflicts.push({
              configuration: config.id,
              field,
              existing: old,
              incoming,
              action:
                "Preserved existing verified record; wording/status/value discrepancy requires review.",
            });
          return;
        }
        if (incoming.status === "unverified" && old) return;
        if (
          base.vehicles
            .find((vehicle) => vehicle.id === v.id)
            ?.trims.find((t) => t.id === config.id)?.equipment[field]
            ?.status === "unverified" &&
          incoming.status !== "unverified"
        )
          result.resolvedFields.push({
            configuration: config.id,
            field,
            previous: old,
            incoming,
            action: "Resolved only from the newly reviewed brochure evidence.",
          });
        trim.equipment[field] = incoming;
        if (incoming.status === "standard") {
          result.standardEquipmentAdded++;
          if (
            [
              "engine",
              "horsepower",
              "torque",
              "transmission",
              "drivetrain",
              "economy",
              "towing",
              ...Object.keys(specNames),
            ].includes(field)
          )
            result.specificationsAdded.push({
              configuration: config.id,
              field,
              value: incoming.value,
              pages: incoming.sourcePages,
            });
        }
      }
      for (const { row, cell: c } of decoded) merge(safeRow(row), c);
      for (const [field, pattern] of Object.entries(patterns)) {
        if (
          !catalog.fields.some((f) => f.id === field) &&
          !v.additionalFields.some((f) => f.id === field)
        )
          continue;
        const candidates = decoded
          .filter(
            ({ row }) =>
              pattern.test(row.label) &&
              !(field === "engine" && /badge|emblem/i.test(row.label)) &&
              !(
                field === "torque" && /electric motor torque/i.test(row.label)
              ) &&
              !(
                field === "horsepower" &&
                config.powertrain !== "gasoline" &&
                !/net combined hp|combined net hp|Hybrid system net power/i.test(
                  row.label,
                )
              ) &&
              !(field === "roof" && /roof rails|roof-mounted/.test(row.label)),
          )
          .map(({ cell }) => cell);
        const c = combine(
          candidates,
          "No unambiguous manufacturer standard/available statement in the reviewed brochure for this configuration.",
        );
        if (c.status !== "unverified") c.value = summarize(field, c.value);
        merge(field, c);
      }
      // Engine rows contain exact powertrain-specific output figures, not a model-wide maximum.
      const engines = decoded.filter(
        ({ row, cell }) =>
          patterns.engine.test(row.label) && cell.status === "standard",
      );
      for (const field of ["horsepower", "torque"]) {
        const selected = engines.filter(({ row }) =>
          field === "horsepower"
            ? /\d+\s+(?:net combined hp|combined net hp|hp @)/i.test(row.label)
            : /\d+ lb\.-ft\./i.test(row.label),
        );
        if (
          selected.length &&
          !(field === "horsepower" && config.powertrain !== "gasoline")
        ) {
          const c = combine(
            selected.map((x) => x.cell),
            "",
          );
          c.value = summarize(field, c.value);
          merge(field, c);
        }
      }
      for (const fact of stage.facts) {
        if (
          !Object.entries(fact.where || {}).every(
            ([key, value]) => config[key] === value,
          )
        )
          continue;
        merge(
          fact.field,
          cell(
            stage,
            source,
            {
              label: fact.quote,
              page: fact.page,
              footnotes: [],
              section: "Reviewed brochure narrative/disclosure quote",
            },
            "standard",
            fact.value,
            "Manufacturer brochure statement; scope/rating basis retained.",
          ),
        );
      }
      for (const field of [
        ...catalog.fields.map((f) => f.id),
        ...Object.keys(specNames).filter((id) =>
          v.additionalFields.some((f) => f.id === id),
        ),
      ])
        if (!trim.equipment[field])
          trim.equipment[field] = unknown(
            "Not established for this configuration by the supplied brochure.",
          );
      // Plug-in-only references are explicitly inapplicable to these gasoline/HEV configurations.
      for (const field of config.powertrain === "plug-in-hybrid"
        ? []
        : ["electricRange", "charging", "dcCharging"])
        if (trim.equipment[field].status === "unverified")
          merge(
            field,
            cell(
              stage,
              source,
              {
                label: config.driveRow,
                page: stage.rows.find((r) => r.label === config.driveRow).page,
                footnotes: [],
              },
              "not-applicable",
              "Not applicable: this is not a plug-in configuration",
            ),
          );
    }
    // Do not publish conditional paid-service rows as factory-standard equipment.
    v.additionalFields = v.additionalFields.filter(
      (f) =>
        !f.id.startsWith("toyota-brochure-") ||
        v.trims.some((t) => t.equipment[f.id]),
    );
    const priorColors = v.colors || { exteriors: [], interiors: [] };
    v.colors = {
      ...priorColors,
      exteriors: [...priorColors.exteriors],
      interiors: [...priorColors.interiors],
      referenceInteriors: [...(priorColors.referenceInteriors || [])],
    };
    for (const [kind, items] of Object.entries(stage.colors)) {
      const target =
        kind === "exteriors" ? v.colors.exteriors : v.colors.referenceInteriors;
      let added = 0;
      for (const item of items) {
        const name = item.name.replace(/-\s+/g, "-");
        if (target.some((c) => c.name === name)) continue;
        target.push({
          name,
          ...(kind === "exteriors"
            ? { trims: [] }
            : {
                material:
                  "Manufacturer palette reference; trim combinations not established",
              }),
          availability: "unverified",
          sourceIds: [source.id],
          sourcePages: { [source.id]: String(item.page) },
          ...(item.footnotes.length ? { footnotes: item.footnotes } : {}),
          ...(item.footnotes.some((n) =>
            /Extra-cost color/i.test(stage.disclosures[n]),
          )
            ? { extraCost: true }
            : {}),
        });
        added++;
      }
      result.colors[kind] = {
        added,
        paletteOnly: true,
        trimAvailability:
          "Unverified — no manufacturer trim/color matrix is provided.",
      };
    }
    v.notes = [
      ...new Set([
        ...v.notes,
        ...profile.notes,
        "Brochure palette is manufacturer-confirmed; trim-specific exterior/interior combinations remain unverified. No all-trim color availability is inferred.",
        "Equipment is read directly from each trim's own S/A matrix column. Empty cells are not treated as Not Offered. Optional/package and paid activation details are not standard-equipment gains.",
      ]),
    ];
    v.sourcePageNotes = v.sourcePageNotes || [];
    for (const [page, text] of Object.entries(stage.disclosurePageText))
      if (
        !v.sourcePageNotes.some(
          (n) =>
            n.sourceId === source.id &&
            n.page === Number(page) &&
            n.text === text,
        )
      )
        v.sourcePageNotes.push({
          sourceId: source.id,
          page: Number(page),
          text,
        });
    if (stage.highlights?.length && !v.modelYearChanges) {
      v.modelYearChanges = {
        basis: "manufacturer-highlights",
        reviewedAt: profile.reviewedAt,
        sourceDescription:
          "Changes explicitly identified by Toyota in the supplied model-year brochure.",
        items: stage.highlights.map((item) => ({
          text: item.text,
          sourceIds: [source.id],
          sourcePages: { [source.id]: String(item.page) },
        })),
        gaps: [],
      };
    }
    if (!v.quickReference) {
      const groups = [...new Set(v.trims.map((t) => t.name))].map((name) => ({
        label: name,
        trimIds: v.trims.filter((t) => t.name === name).map((t) => t.id),
        fieldIds: ["wheels"],
      }));
      v.quickReference = {
        scope: profile.model === "Sienna" ? "hybrid" : "mixed",
        groups,
        commonFieldIds: [],
        powertrainTrimIds: [
          ...new Map(
            v.trims.map((t) => {
              const config = profile.configs.find((c) => c.id === t.id);
              return [
                config.powertrain + config.drive + config.transmission,
                t.id,
              ];
            }),
          ).values(),
        ].slice(0, 4),
        standardSpecFields: ["transmission"],
        caveats: [
          {
            text: "Brochure equipment only. Missing technical measurements, configuration restrictions and MSRP remain N/A. Confirm the vehicle's actual window sticker and owner's manual.",
            sourceIds: [source.id],
          },
        ],
      };
    }
    const specs = [
      "engine",
      "horsepower",
      "torque",
      "transmission",
      "drivetrain",
      "economy",
      "towing",
      "seating",
      "dimensions",
      "wheelbase",
      "groundClearance",
      "headroom",
      "legroom",
      "cargo",
      "fuel",
      "msrp",
    ];
    result.missingSpecifications = v.trims.flatMap((t) =>
      specs
        .filter(
          (f) =>
            !t.equipment[f] ||
            t.equipment[f]?.status === "unverified" ||
            (f === "seating" &&
              /total seating capacity remains Unverified/.test(
                t.equipment[f]?.value || "",
              )),
        )
        .map((field) => ({ configuration: t.id, field })),
    );
    result.conflicts = [
      ...new Map(
        result.conflicts.map((item) => [JSON.stringify(item), item]),
      ).values(),
    ];
    report.conflicts.push(
      ...result.conflicts.map((c) => ({ model: profile.model, ...c })),
    );
    report.manualVerification.push(...result.manualVerification);
    report.models.push(result);
    if (!existing) catalog.vehicles.push(v);
    changed.add(v.id);
  }
  for (const { profile } of entries) {
    const key = String(profile.year);
    const marker = `Toyota ${profile.year} ${profile.model} brochure coverage:`;
    if (!catalog.coverageNotes[key]?.includes(marker))
      catalog.coverageNotes[key] =
        (catalog.coverageNotes[key] || "") +
        ` ${marker} reviewed equipment and scoped specifications; see configuration-level applicability notes.`;
  }
  for (const v of base.vehicles)
    if (!changed.has(v.id)) {
      if (
        JSON.stringify(v) !==
        JSON.stringify(catalog.vehicles.find((c) => c.id === v.id))
      )
        throw new Error("Unrelated vehicle changed");
      report.preservedVehicles.push({ id: v.id, sha256: digest(v) });
    }
  const errors = validate(catalog, features);
  if (errors.length) throw new Error(errors.join("\n"));
  return { catalog, report };
}
