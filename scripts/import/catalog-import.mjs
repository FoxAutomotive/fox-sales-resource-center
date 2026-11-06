import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validate } from "../validate.mjs";

const hash = (s) => createHash("sha256").update(s).digest("hex").slice(0, 12);
const norm = (s) =>
  s.replace(/®/g, "").replace(/\s+/g, " ").trim().toLowerCase();
const supported = new Set([
  "standard",
  "optional",
  "unavailable",
  "not-applicable",
  "unverified",
]);
const unknown = (reason) => ({ status: "unverified", conditions: reason });
const mappings = {
  engine: /\bengine\b.*(?:injection|NEW)|^(?:Single|Dual) electric motor/i,
  wheels: /\b(?:alloy|steel).*wheels\b/i,
  roof: /(?:panoramic|tilting|sliding|power).*?(?:sunroof|glass roof)/i,
  panoramicRoof: /panoramic.*(?:sunroof|glass roof)/i,
  heatedSeats: /heated(?: & actively ventilated)? front seats/i,
  ventilatedSeats: /ventilat.*front seats/i,
  heatedWheel: /heated steering wheel/i,
  remoteStart: /remote engine start feature/i,
  climate: /Climatronic|climate control/i,
  frontSeats: /Driver.?s seat|Front passenger seat|Front seats:.*adjustable/i,
  ambient: /ambient.*lighting/i,
  rearviewMirror: /Auto-dimming interior rearview mirror/i,
  keyless: /KESSY/i,
  parkingSensors: /Park Distance Control/i,
  roadSigns: /Road Sign Display/i,
  highBeam: /Light Assist/i,
  rearCamera: /Rear View Camera System/i,
  mediaConnectivity: /MIB[34]|Bluetooth|SiriusXM|USB/i,
  voiceControl: /^(?:Natural |Enhanced )?Voice [Cc]ontrol/i,
  telematics: /connected vehicle services|in-vehicle.*Wi-Fi/i,
  wipers: /windshield wipers.*rain sensor|rain sensor/i,
  steeringWheel: /Leather.*steering wheel|multi.function steering wheel/i,
  powerOutlets: /12[ -]?V.*power|power.*12[ -]?V/i,
  liftgate: /(?:power|hands-free|Easy Open).*?(?:liftgate|rear hatch)/i,
  wirelessCharging: /(?:Qi|wireless).*(?:charger|charging|inductive)/i,
  adaptiveCruiseControl: /Adaptive Cruise Control/i,
  areaView: /Area View|Overhead View Camera/i,
  parkingAutomation: /Park Assist/i,
  headUpDisplay: /Head.Up Display|Windshield.*display/i,
  upholstery: /seating surfaces/i,
  seating: /(?:Rear|2nd|3rd|second|third).*(?:seat|bench)|seating.*passenger/i,
  infotainment: /(?:touchscreen|infotainment).*display/i,
  instruments: /Digital Cockpit/i,
  audio:
    /speaker sound|Sound system:|premium sound|Harman Kardon|VW Premium Sound/i,
  phone: /App-Connect/i,
  assistance:
    /IQ\.DRIVE|Travel Assist|Lane Assist|Front Assist|Active.*(?:Blind Spot|Side Assist)|Rear Traffic Alert|Emergency Assist/i,
  advancedAssistance: /Travel Assist|Emergency Assist|Lane Change/i,
  safety:
    /airbag|Crash Response|Post-Collision Braking|Tire Pressure Monitoring/i,
  appearance: /(?:bumper|badging|roof rails)/i,
  cargoOutlet: /(?:110|115|120)[ -]?V|AC power outlet/i,
  charging: /\bAC charging capability/i,
  dcCharging: /\bDC fast charging capability/i,
};
function chooseColumn(profile, config) {
  const i = profile.columns.findIndex(
    (c) =>
      norm(c.trim) === norm(config.trim) &&
      (!c.configuration || c.configuration === config.configuration) &&
      (!c.transmission ||
        config.transmission
          .toLowerCase()
          .includes(c.transmission.toLowerCase())),
  );
  if (i < 0)
    throw new Error(`No reviewed matrix column for ${config.salesCode}`);
  return i;
}
function decode(row, index, config, report, model) {
  const cell = row.cells[index];
  let status = {
    "●": "standard",
    "○": "optional",
    "—": "unavailable",
    "–": "unavailable",
    "-": "unavailable",
  }[cell.raw];
  let basis = "manufacturer equipment symbol";
  if (/^(?:FWD|4MOTION)(?:®)? (?:trim|only)$/.test(cell.raw)) {
    status = (
      cell.raw.startsWith("FWD")
        ? config.configuration === "FWD"
        : /AWD/.test(config.configuration)
    )
      ? "standard"
      : "not-applicable";
    if (
      status === "not-applicable" &&
      /heated|washer nozzles|wheels|independent rear suspension/i.test(
        row.label,
      )
    )
      status = "unavailable";
    basis = "explicit drivetrain qualifier";
  }
  if (row.section.includes("IQ.DRIVE") && !/IQ\.DRIVE/.test(row.label)) {
    status = "standard";
    basis = "explicit membership in the configuration's IQ.DRIVE suite";
    if (model.id === "jetta-gli" && /manual/i.test(config.transmission)) {
      if (/Emergency Assist|ACC.*Stop & Go/.test(row.label))
        status = "unavailable";
      basis = `page ${row.page} explicitly says manual has all other suite features, except Emergency Assist and Stop & Go`;
    }
  }
  if (/standard, but.*deleted when/i.test(row.label)) {
    status = "standard";
    basis =
      "explicit standard equipment text overrides optional symbol; package deletion retained";
    report.exceptions.push({
      model: model.name,
      configuration: config.salesCode,
      page: row.page,
      feature: row.label,
      resolution: basis,
    });
  }
  if (
    !status &&
    /4MOTION.*trims only/i.test(row.label) &&
    !/AWD/.test(config.configuration)
  ) {
    status = "not-applicable";
    basis = "explicit AWD-only applicability; no FWD equipment inferred";
  }
  if (!status) {
    report.manualVerification.push({
      model: model.name,
      configuration: config.salesCode,
      page: row.page,
      feature: row.label,
      rawSymbol: cell.raw || "blank",
      reason: "Unrecognized/blank equipment cell; no negative claim inferred",
    });
    return unknown(
      `Order guide p. ${row.page}: cell is ${cell.raw || "blank"}; manual verification required.`,
    );
  }
  const result = {
    status,
    value: row.label,
    sourceIds: [report.sourceId],
    sourcePages: { [report.sourceId]: String(row.page) },
    manufacturerSymbol: cell.raw,
    evidenceBasis: basis,
  };
  const notes = [
    basis !== "manufacturer equipment symbol" ? basis : "",
    status === "optional"
      ? "Optional as marked; retain the stated package, ordering and production restrictions. Available does not mean installed."
      : "",
    /package|requires|only|removed|deleted|except|credit/i.test(row.label)
      ? row.label
      : "",
  ].filter(Boolean);
  if (notes.length) result.conditions = notes.join(" ");
  return result;
}
function combine(entries, sourceId) {
  if (!entries.length)
    return unknown(
      "This document does not establish this specification; no value inferred from another model or model year.",
    );
  let status = ["standard", "optional"].find((s) =>
    entries.some((e) => e.cell.status === s),
  );
  if (!status)
    status = entries.some((e) => e.cell.status === "unverified")
      ? "unverified"
      : entries.some((e) => e.cell.status === "not-applicable")
        ? "not-applicable"
        : "unavailable";
  if (status === "unverified")
    return unknown(
      "The relevant equipment row contains an unexplained cell; see source-specific equipment rows for details.",
    );
  const selected = entries.filter((e) => e.cell.status === status);
  const pages = [...new Set(selected.map((e) => e.row.page))].sort(
    (a, b) => a - b,
  );
  const result = {
    status,
    value: [...new Set(selected.map((e) => e.cell.value))].join("; "),
    sourceIds: [sourceId],
    sourcePages: { [sourceId]: pages.join(", ") },
  };
  const conditions = [
    ...new Set(selected.map((e) => e.cell.conditions).filter(Boolean)),
  ];
  if (
    entries.some((e) => e.cell.status === "optional") &&
    status === "standard"
  )
    conditions.push(
      "Additional optional alternatives are recorded individually below; the Standard label applies only to the equipment quoted here.",
    );
  if (conditions.length) result.conditions = conditions.join(" ");
  return result;
}
function optionState(option, config) {
  const i = option.optionColumns.findIndex((names) =>
    names.some((name) => norm(name) === norm(config.trim)),
  );
  if (i < 0) return "unverified";
  const raw = option.availability[i];
  if (/^[-—–](?:\s|$)/.test(raw) || /^[-—–\s]+$/.test(raw))
    return "unavailable";
  if (!raw) return "unverified";
  const restrictions = `${option.description} ${raw}`.replaceAll("®", "");
  if (
    /\bFWD(?:\s+trims?)?\s+only\b|\bSE FWD\b/i.test(restrictions) &&
    config.configuration !== "FWD"
  )
    return "unavailable";
  if (
    /\b(?:4MOTION|AWD)(?:\s+trims?)?\s+only\b/i.test(restrictions) &&
    !/AWD/.test(config.configuration)
  )
    return "unavailable";
  if (
    /\b(?:DSG\s+)?automatic(?:\s+trims?)?\s+only\b/i.test(restrictions) &&
    /manual/i.test(config.transmission)
  )
    return "unavailable";
  if (
    /\bmanual(?:\s+trims?)?\s+only\b/i.test(restrictions) &&
    !/manual/i.test(config.transmission)
  )
    return "unavailable";
  if (/NOT (?:CURRENTLY |YET )?ORDERABLE/i.test(option.description))
    return "unavailable";
  return "optional";
}
const sourceCell = (value, page, sourceId, conditions) => ({
  status: "standard",
  value,
  sourceIds: [sourceId],
  sourcePages: { [sourceId]: String(page) },
  ...(conditions ? { conditions } : {}),
});
export function importCatalog(stage, base, features) {
  if (
    stage.schemaVersion !== 1 ||
    stage.source.adapter !== "vw-order-guide-grid-v1"
  )
    throw new Error("Unsupported reviewed extraction schema");
  if (
    stage.pages.length !== stage.source.pageCount ||
    !stage.pages.every((p, i) => p.processed && p.page === i + 1)
  )
    throw new Error("Incomplete PDF page coverage");
  const scan = (value) => {
    if (value && typeof value === "object")
      for (const [key, child] of Object.entries(value)) {
        if (/invoice|dealerPrice|costPrice/i.test(key))
          throw new Error("Forbidden non-retail financial field in stage");
        scan(child);
      }
  };
  scan(stage);
  if (stage.models.length !== stage.source.models.length)
    throw new Error("Missing model sections");
  if (new Set(stage.models.map((m) => m.id)).size !== stage.models.length)
    throw new Error("Duplicate model sections");
  for (const m of stage.models) {
    const p = stage.source.models.find((p) => p.id === m.id);
    if (
      !p ||
      m.configurations.length !== p.expectedConfigurations ||
      (p.expectedOptions !== undefined &&
        m.options.length !== p.expectedOptions) ||
      p.matrixPages.some(
        (page) =>
          m.rows.filter((r) => r.page === page).length !==
          stage.source.expectedMatrixRows[String(page)],
      ) ||
      new Set(m.configurations.map((c) => c.salesCode)).size !==
        m.configurations.length ||
      m.rows.some((r) => r.cells.length !== p.columns.length)
    )
      throw new Error("Invalid or ambiguous stage alignment");
  }
  const catalog = structuredClone(base),
    sid = stage.source.sourceId;
  const digestObject = (value) =>
    createHash("sha256").update(JSON.stringify(value)).digest("hex");
  const report = {
    revisionHistory: stage.revisionHistory || "",
    financialAudit: stage.financialAudit,
    protectedVehicles: base.vehicles
      .filter(
        (v) =>
          !stage.models.some(
            (m) =>
              v.id === `${stage.source.year}-${stage.source.brand}-${m.id}`,
          ),
      )
      .map((v) => ({ id: v.id, sha256: digestObject(v) })),
    protectedExistingCells: base.vehicles
      .filter((v) =>
        stage.models.some(
          (m) => v.id === `${stage.source.year}-${stage.source.brand}-${m.id}`,
        ),
      )
      .flatMap((v) =>
        v.trims.map((t) => {
          const cells = Object.fromEntries(
            Object.entries(t.equipment).filter(
              ([, c]) => c.status !== "unverified",
            ),
          );
          return {
            vehicleId: v.id,
            trimId: t.id,
            fields: Object.keys(cells),
            sha256: digestObject(cells),
          };
        }),
      ),
    schemaVersion: 1,
    baseSha256: createHash("sha256").update(JSON.stringify(base)).digest("hex"),
    sourceId: sid,
    sourceDate: stage.source.documentDate,
    sourceTitle: stage.source.title,
    sourceYear: stage.source.year,
    sourceEdition: stage.source.edition,
    dateBasis: stage.source.dateBasis,
    yearChanges: [],
    reviewedAt: stage.source.checkedAt,
    pagesProcessed: stage.pages.length,
    models: [],
    conflicts: [],
    sourceConflicts: [],
    claimDifferences: [],
    exceptions: [],
    manualVerification: [],
    missingSpecifications: [],
    retainedTechnicalFields: [],
    options: [],
    colorReferences: [],
  };
  const existingSources = new Set(catalog.fields.map((f) => f.id));
  for (const field of [
    {
      id: "msrp",
      label: "Starting MSRP (source / date shown)",
      group: "Performance",
    },
    { id: "remoteStart", label: "Remote start", group: "Comfort" },
  ]) {
    if (!existingSources.has(field.id)) catalog.fields.push(field);
    for (const v of catalog.vehicles)
      if (v.additionalFields)
        v.additionalFields = v.additionalFields.filter(
          (f) => f.id !== field.id,
        );
  }
  const common = new Set([
    "climate",
    "frontSeats",
    "ambient",
    "rearviewMirror",
    "keyless",
    "parkingSensors",
    "roadSigns",
    "highBeam",
    "rearCamera",
    "mediaConnectivity",
    "voiceControl",
    "telematics",
    "wipers",
    "steeringWheel",
    "powerOutlets",
  ]);
  const measurementFields = new Set([
    "dimensions",
    "wheelbase",
    "groundClearance",
    "track",
    "angles",
    "fuel",
    "headroom",
    "legroom",
    "interiorRoom",
    "passengerVolume",
    "cargo",
    "chassis",
    "steering",
    "brakes",
    "weights",
    "curbWeight",
    "engineDetails",
    "drag",
    "engineDesign",
    "gearRatios",
  ]);
  for (const v of catalog.vehicles)
    if (v.brand === stage.source.brand) {
      for (const f of v.additionalFields || []) {
        if (common.has(f.id) && !catalog.fields.some((x) => x.id === f.id))
          catalog.fields.push({ ...f });
        else if (!common.has(f.id) && !measurementFields.has(f.id))
          f.comparisonScope = "model";
      }
      if (v.additionalFields)
        v.additionalFields = v.additionalFields.filter(
          (f) => !common.has(f.id),
        );
    }
  // This source is a supplied PDF. The URL identifies the manufacturer, not a public PDF download.
  const source = {
    id: sid,
    title:
      stage.source.title +
      (stage.source.edition
        ? ` — cover footer revision ${stage.source.documentDate}`
        : ` — dated ${stage.source.documentDate}`),
    kind: "verified",
    modelYear: stage.source.year,
    checkedAt: stage.source.checkedAt,
    url: stage.source.sourceUrl,
    delivery: "user-upload",
    fileName: stage.source.fileName,
    sha256: stage.source.sha256,
    pageCount: stage.source.pageCount,
    shortLabel:
      stage.source.shortLabel || `VW-O${String(stage.source.year).slice(-2)}`,
    documentDate: stage.source.documentDate,
    ...(stage.source.edition
      ? { edition: stage.source.edition, dateBasis: stage.source.dateBasis }
      : {}),
    scope:
      "Supplied manufacturer order guide; public manufacturer link is a provenance reference, not a PDF download. Only retail MSRP and retail option charges imported. Original PDF is not redistributed.",
  };
  for (const model of stage.models) {
    const profile = stage.source.models.find((m) => m.id === model.id);
    let vehicle = catalog.vehicles.find(
      (v) => v.id === `${stage.source.year}-${stage.source.brand}-${model.id}`,
    );
    const existing = !!vehicle;
    if (!vehicle) {
      vehicle = {
        id: `${stage.source.year}-${stage.source.brand}-${model.id}`,
        brand: stage.source.brand,
        model: model.name,
        year: stage.source.year,
        category: /Atlas|Tiguan|Taos|ID\.4/.test(model.name) ? "SUV" : "Car",
        summary: `${stage.source.year} ${model.name} — manufacturer order-guide equipment and retail pricing, ${stage.source.edition ? `edition ${stage.source.edition}` : `dated ${stage.source.documentDate}`}. Missing technical specifications remain explicitly Unverified.`,
        status: "verified",
        verifiedAt: stage.source.checkedAt,
        sources: [],
        trims: [],
        packages: [],
        upgrades: [],
        notes: [],
        additionalFields: [],
      };
      catalog.vehicles.push(vehicle);
    }
    vehicle.additionalFields ||= [];
    if (vehicle.quickReference && !vehicle.quickReference.optionalEquipmentIds)
      vehicle.quickReference.optionalEquipmentIds = (
        vehicle.optionalEquipment || []
      ).map((o) => o.id);
    if (!vehicle.sources.some((s) => s.id === sid))
      vehicle.sources.push(source);
    const stats = {
      model: model.name,
      vehicleId: vehicle.id,
      configurations: [],
      equipmentFieldsPopulated: 0,
      matrixRows: model.rows.length,
      codedOptions: model.options.length,
      colorRows: model.colors.length,
    };
    for (const config of model.configurations) {
      let trim = vehicle.trims.find(
        (t) =>
          t.salesCode === config.salesCode ||
          (norm(t.name) === norm(config.trim) &&
            t.configuration === config.configuration &&
            (model.id !== "jetta-gli" ||
              norm(t.equipment.transmission?.value || "").includes(
                norm(config.transmission),
              ))),
      );
      const isExisting = !!trim;
      if (!trim) {
        trim = {
          id: config.salesCode.toLowerCase(),
          name: config.trim,
          configuration:
            model.id === "jetta-gli"
              ? `${config.configuration} · ${config.transmission}`
              : config.configuration,
          sourceIds: [sid],
          equipment: {},
        };
        vehicle.trims.push(trim);
      }
      trim.manufacturerName = config.trim;
      trim.salesCode = config.salesCode;
      if (!trim.sourceIds.includes(sid)) trim.sourceIds.push(sid);
      const index = chooseColumn(profile, config);
      const entries = model.rows.map((row, n) => {
        const key = `vw-order-${hash(`${model.id}:${row.page}:${n}:${row.label}`)}`;
        if (!vehicle.additionalFields.some((f) => f.id === key))
          vehicle.additionalFields.push({
            id: key,
            label: row.label,
            group: row.group,
            comparisonScope: "model",
          });
        const cell = decode(row, index, config, report, model);
        trim.equipment[key] = cell;
        return { row, cell, key };
      });
      const incoming = {};
      for (const [field, pattern] of Object.entries(mappings))
        incoming[field] = combine(
          entries.filter((e) => pattern.test(e.row.label)),
          sid,
        );
      if (incoming.rearviewMirror.status === "unavailable")
        incoming.rearviewMirror = unknown(
          "The named auto-dimming alternatives are not offered; the guide does not describe this configuration's base mirror. A specific auto-dimming exclusion is not absence of a rearview mirror.",
        );
      if (incoming.audio.status === "unavailable")
        incoming.audio = unknown(
          "The named speaker/premium-audio alternatives are not offered; the source does not identify this configuration's base speaker count. See the separate radio equipment row.",
        );
      // A documented market-delivery installation is Optional, even when not factory standard.
      const remoteOption = model.options.find(
        (o) =>
          /Extended Range Remote Start$/i.test(o.name) &&
          /Remote Engine Start/i.test(o.description) &&
          optionState(o, config) === "optional",
      );
      if (
        remoteOption &&
        ["unavailable", "unverified"].includes(incoming.remoteStart.status)
      )
        incoming.remoteStart = {
          ...sourceCell(
            `${remoteOption.name} (${remoteOption.code}): ${remoteOption.description}`,
            remoteOption.page,
            sid,
            `Market-delivery option, not factory standard. ${remoteOption.description} Retail charge ${remoteOption.retail === null ? "TBA" : `$${remoteOption.retail}`}; confirm installed equipment and ordering eligibility.`,
          ),
          status: "optional",
        };
      // Never derive a numeric rating from an absent hitch, an option price or another trim.
      incoming.towing = combine(
        entries.filter(
          (e) =>
            e.cell.status === "standard" &&
            /towing capacity/i.test(e.row.label),
        ),
        sid,
      );
      if (incoming.engine.status === "standard") {
        const hp = incoming.engine.value.match(/(\d+) HP/i),
          torque = incoming.engine.value.match(/(\d+) ft-lbs\. torque/i);
        if (hp)
          incoming.horsepower = {
            ...structuredClone(incoming.engine),
            value: `${hp[1]} hp`,
          };
        if (torque)
          incoming.torque = {
            ...structuredClone(incoming.engine),
            value: `${torque[1]} lb-ft`,
          };
      }
      incoming.transmission = sourceCell(config.transmission, config.page, sid);
      incoming.drivetrain = sourceCell(config.configuration, config.page, sid);
      const priceNote = `Order guide ${stage.source.edition ? stage.source.edition + " (cover footer revision " + stage.source.documentDate + ")" : "dated " + stage.source.documentDate}, reviewed ${stage.source.checkedAt}; destination ${config.destination === null ? "TBA" : `$${config.destination.toLocaleString("en-US")}`} additional; prices subject to change. Excludes options, taxes and dealer charges.`;
      incoming.msrp =
        config.msrp === null
          ? unknown(
              `Retail MSRP and destination are explicitly TBA in this source (p. ${config.page}); do not substitute another model year.`,
            )
          : sourceCell(
              `$${config.msrp.toLocaleString("en-US")} starting MSRP`,
              config.page,
              sid,
              priceNote,
            );
      if (model.id !== "id4")
        for (const field of ["electricRange", "charging", "dcCharging"])
          incoming[field] = {
            ...sourceCell(
              "Not applicable — documented gasoline powertrain, not an externally charged vehicle",
              config.page,
              sid,
            ),
            status: "not-applicable",
          };
      for (const field of catalog.fields) {
        const cell =
          incoming[field.id] ||
          unknown(
            "Not specified by the reviewed order guide; additional manufacturer technical documentation required.",
          );
        const previous = trim.equipment[field.id];
        if (isExisting && previous && previous.status !== "unverified") {
          if (
            cell.status !== "unverified" &&
            (previous.status !== cell.status || previous.value !== cell.value)
          )
            (previous.status === cell.status &&
            (!["horsepower", "torque", "msrp"].includes(field.id) ||
              previous.value
                ?.match(/[0-9][0-9,.]*/)?.[0]
                .replaceAll(",", "") ===
                cell.value?.match(/[0-9][0-9,.]*/)?.[0].replaceAll(",", ""))
              ? report.claimDifferences
              : report.conflicts
            ).push({
              model: model.name,
              configuration: config.salesCode,
              field: field.id,
              existing: previous,
              incoming: cell,
              resolution:
                "Existing verified cell and all its source references retained. New source row is available separately for review; semantic equivalence is not automatically assumed.",
            });
          report.retainedTechnicalFields.push({
            model: model.name,
            configuration: config.salesCode,
            field: field.id,
          });
        } else if (cell.status !== "unverified" || !previous)
          trim.equipment[field.id] = cell;
      }
      for (const field of [
        "economy",
        "towing",
        "horsepower",
        "torque",
        "engine",
        "seating",
        "msrp",
      ])
        if (trim.equipment[field]?.status === "unverified")
          report.missingSpecifications.push({
            model: model.name,
            configuration: config.salesCode,
            field,
            reason: trim.equipment[field].conditions,
          });
      for (const field of [
        "dimensions",
        "wheelbase",
        "groundClearance",
        "legroom",
        "headroom",
        "cargo",
      ])
        if (
          !trim.equipment[field] ||
          trim.equipment[field].status === "unverified"
        )
          report.missingSpecifications.push({
            model: model.name,
            configuration: config.salesCode,
            field,
            reason:
              "Not supplied by this order guide; no technical measurement invented.",
          });
      const optionalCases = model.options.filter(
        (o) =>
          optionState(o, config) === "optional" &&
          /Factory/.test(o.section) &&
          /removed|replaced/i.test(o.description),
      );
      for (const o of optionalCases) {
        for (const field of [
          "roof",
          "panoramicRoof",
          "ventilatedSeats",
          "upholstery",
        ]) {
          if (
            model.id === "golf-r" &&
            trim.equipment[field]?.status !== "unverified" &&
            !trim.equipment[field]?.conditions?.includes(
              `Factory option ${o.code}:`,
            )
          )
            trim.equipment[field].conditions =
              `${trim.equipment[field].conditions || ""} Factory option ${o.code}: ${o.description}`.trim();
        }
      }
      stats.configurations.push({
        trim: config.trim,
        configuration: trim.configuration,
        salesCode: config.salesCode,
        trimId: trim.id,
        msrp: config.msrp,
        destination: config.destination,
        sourcePage: config.page,
      });
      stats.equipmentFieldsPopulated += Object.values(trim.equipment).filter(
        (c) => c.status !== "unverified",
      ).length;
    }
    for (const option of model.options) {
      const factory = /Factory/.test(option.section),
        credit = /Credits/.test(option.section);
      const groups = new Map();
      for (const config of model.configurations) {
        const status = credit ? "unavailable" : optionState(option, config);
        const trimId = stats.configurations.find(
          (t) => t.salesCode === config.salesCode,
        ).trimId;
        if (!groups.has(status)) groups.set(status, []);
        groups.get(status).push(trimId);
      }
      report.options.push({
        model: model.name,
        ...option,
        statusGroups: Object.fromEntries(groups),
      });
      if (credit) {
        report.exceptions.push({
          model: model.name,
          page: option.page,
          code: option.code,
          feature: option.description,
          resolution:
            "Production credit retained as a source restriction, not an orderable option.",
        });
        continue;
      }
      for (const [status, trimIds] of groups) {
        if (status === "unverified") {
          report.manualVerification.push({
            model: model.name,
            page: option.page,
            code: option.code,
            reason: "Blank option eligibility cell; no availability claimed.",
          });
          continue;
        }
        const item = {
          id: `vw-order-${option.page}-${option.code.toLowerCase()}-${status}`,
          name: `${option.name} (${option.code})`,
          status,
          description: `${option.description} Retail ${option.retail === null ? "price TBA" : `charge $${option.retail.toLocaleString("en-US")}`}.`,
          trimIds,
          conditions: `${option.section}; order guide ${stage.source.documentDate}. ${option.description} Eligibility: ${option.availability.join(" | ")}. Confirm ordering restrictions and installed equipment.`,
          sourceIds: [sid],
          sourcePages: { [sid]: String(option.page) },
          ...(factory
            ? { contentsStatus: "verified", contents: [option.description] }
            : {}),
        };
        if (factory) {
          if (!vehicle.packages.some((p) => p.id === item.id))
            vehicle.packages.push(item);
        } else {
          vehicle.listedOptions ||= [];
          if (!vehicle.listedOptions.some((p) => p.id === item.id))
            vehicle.listedOptions.push(item);
        }
      }
    }
    for (const row of model.rows) {
      const code = row.label.match(/(?:option|Package)\s+([A-Z0-9]{3})/i)?.[1];
      const option = model.options.find((o) => o.code === code);
      const rowWheel = row.label.match(/alloy\s*\(([A-Z0-9]{3})\)/i)?.[1];
      const optionWheel = option?.description.match(
        /alloy\s*\(([A-Z0-9]{3})\)/i,
      )?.[1];
      if (option && rowWheel && optionWheel && rowWheel !== optionWheel)
        report.sourceConflicts.push({
          model: model.name,
          field: "wheel code",
          optionCode: code,
          matrixPage: row.page,
          packagePage: option.page,
          matrixValue: rowWheel,
          packageValue: optionWheel,
          resolution:
            "Both source statements retained separately; manufacturer clarification needed. No wheel code guessed.",
        });
    }
    for (const conflict of report.sourceConflicts.filter(
      (c) => c.model === model.name,
    )) {
      const warning = `Manufacturer source discrepancy: package p. ${conflict.packagePage} uses ${conflict.packageValue}, equipment matrix p. ${conflict.matrixPage} uses ${conflict.matrixValue} for option ${conflict.optionCode}. Availability is established; wheel-code clarification is required.`;
      for (const t of vehicle.trims)
        for (const cell of Object.values(t.equipment))
          if (
            cell.sourceIds?.includes(sid) &&
            cell.value?.includes(conflict.optionCode) &&
            !cell.conditions?.includes(warning)
          )
            cell.conditions = `${cell.conditions || ""} ${warning}`.trim();
      for (const p of vehicle.packages)
        if (
          p.id.includes(conflict.optionCode.toLowerCase()) &&
          !p.conditions.includes(warning)
        )
          p.conditions += ` ${warning}`;
    }
    report.colorReferences.push({ model: model.name, rows: model.colors });
    if (model.id === "tiguan")
      vehicle.notes = vehicle.notes.map((n) =>
        n.startsWith("Genuine gaps:")
          ? "Earlier two-PDF review (before this order-guide import): " + n
          : n,
      );
    vehicle.notes = vehicle.notes.filter(
      (n) => !n.startsWith("Bulk order-guide import:"),
    );
    vehicle.notes.push(
      `Bulk order-guide import: ${stage.source.documentDate}, reviewed ${stage.source.checkedAt}. Every equipment-table row is recorded separately by configuration. Factory packages, paint charges, market-delivery options and services retain distinct descriptions and restrictions. MSRP excludes destination. ${stage.source.year === 2026 ? "ID.4 prices marked TBA remain Unverified." : "Prices marked TBA remain Unverified."} Missing measurements require technical specifications. Original supplied PDF is not republished. Manufacturer source link is not a PDF download URL.`,
    );
    if (model.pageNotes) {
      vehicle.sourcePageNotes = model.pageNotes.map((note) => ({
        ...note,
        sourceId: sid,
      }));
      for (const note of model.pageNotes) {
        for (const t of vehicle.trims) {
          for (const cell of Object.values(t.equipment)) {
            if (
              cell.sourceIds?.includes(sid) &&
              /\*/.test(cell.value || "") &&
              cell.sourcePages?.[sid]
                ?.split(/,\s*/)
                .includes(String(note.page)) &&
              !cell.conditions?.includes(note.text)
            ) {
              cell.conditions =
                `${cell.conditions || ""} Manufacturer page notes (apply to starred systems): ${note.text}`.trim();
            }
          }
        }
      }
    }
    // Production credits qualify equipment; they are never orderable packages.
    for (const option of model.options.filter(
      (o) => /Credits/.test(o.section) && /lacks heating/i.test(o.description),
    )) {
      for (const t of vehicle.trims) {
        const config = model.configurations.find(
          (c) => c.salesCode === t.salesCode,
        );
        if (optionState(option, config) !== "optional") continue;
        for (const [key, cell] of Object.entries(t.equipment)) {
          if (
            (key === "heatedWheel" ||
              /Heated steering wheel/i.test(cell.value || "")) &&
            cell.status === "standard"
          ) {
            const condition = `Production exception ${option.code} (p. ${option.page}): ${option.description}. Confirm the vehicle's window sticker; this is a removal credit, not an orderable option.`;
            if (!cell.conditions?.includes(condition))
              cell.conditions = `${cell.conditions || ""} ${condition}`.trim();
          }
        }
      }
    }
    if (profile.yearReview) {
      const baseline = catalog.vehicles.find(
        (v) =>
          v.id === `${stage.source.year - 1}-${stage.source.brand}-${model.id}`,
      );
      if (!baseline)
        throw new Error(`Missing baseline for ${model.name} model-year review`);
      vehicle.modelYearChanges = {
        baselineVehicleId: baseline.id,
        reviewedAt: stage.source.checkedAt,
        items: profile.yearReview.items.map((item) => ({
          ...item,
          sourceIds: [sid],
          sourcePages: { [sid]: item.pages },
          baselineSourceIds: [profile.yearReview.baselineSourceId],
          baselineSourcePages: {
            [profile.yearReview.baselineSourceId]: item.baselinePages,
          },
        })),
        gaps: profile.yearReview.gaps,
      };
      report.yearChanges.push({
        model: model.name,
        ...vehicle.modelYearChanges,
      });
    }
    if (!existing) {
      vehicle.quickReference = {
        scope: model.id === "id4" ? "electric" : "gasoline",
        groups: profile.trims.map((name) => ({
          label: name,
          trimIds: vehicle.trims
            .filter((t) => t.name === name)
            .map((t) => t.id),
          fieldIds: ["wheels", "upholstery", "heatedSeats"],
        })),
        commonFieldIds: ["adaptiveCruiseControl", "wirelessCharging"],
        powertrainTrimIds:
          stage.source.year > 2026
            ? [
                ...new Map(
                  vehicle.trims.map((t) => [
                    [
                      t.equipment.engine?.value,
                      t.equipment.transmission?.value,
                      t.equipment.drivetrain?.value,
                    ].join("|"),
                    t.id,
                  ]),
                ).values(),
              ]
            : [vehicle.trims[0].id],
        optionalEquipmentIds: [],
        caveats: [
          {
            text: `Order guide ${stage.source.documentDate}; pricing excludes destination; missing ratings/measurements and TBA prices remain Unverified. Full configuration-specific equipment, packages and source pages are in the online guide.`,
            sourceIds: [sid],
          },
        ],
      };
    }
    report.models.push(stats);
  }
  if (stage.source.coverageNote)
    catalog.coverageNotes[String(stage.source.year)] =
      stage.source.coverageNote;
  const errors = validate(catalog, features);
  if (errors.length) throw new Error(errors.join("\n"));
  report.summary = {
    models: report.models.length,
    configurations: report.models.reduce(
      (n, m) => n + m.configurations.length,
      0,
    ),
    equipmentFieldsPopulated: report.models.reduce(
      (n, m) => n + m.equipmentFieldsPopulated,
      0,
    ),
    conflictsPreserved: report.conflicts.length,
    internalSourceConflicts: report.sourceConflicts.length,
    existingClaimDifferencesPreserved: report.claimDifferences.length,
    manualVerification: report.manualVerification.length,
    missingSpecificationCells: report.missingSpecifications.length,
  };
  return { catalog, report };
}
export function markdownReport(report) {
  if (report.sourceYear !== 2026) return editionMarkdownReport(report);
  const missing = new Map();
  for (const item of report.missingSpecifications)
    missing.set(item.field, (missing.get(item.field) || 0) + 1);
  const price = (n) => (n === null ? "TBA" : `$${n.toLocaleString("en-US")}`);
  return `# Volkswagen MY26 CW41 import review

Source dated **${report.sourceDate}**; reviewed ${report.reviewedAt}. All **${report.pagesProcessed} pages** processed. The original attachment is not redistributed. Only retail MSRP, retail option charges and separately identified retail credits are extracted; dealer cost columns are excluded.

## Coverage

| Model | Configurations | Populated equipment cells | Equipment-table rows | Coded options / services |
| --- | ---: | ---: | ---: | ---: |
${report.models.map((m) => `| ${m.model} | ${m.configurations.length} | ${m.equipmentFieldsPopulated} | ${m.matrixRows} | ${m.codedOptions} |`).join("\n")}

Total: **${report.summary.configurations} configurations**, **${report.summary.equipmentFieldsPopulated} confirmed equipment cells**. The count includes canonical comparison cells, source-specific equipment rows and retained Tiguan cells; these are not all unique physical features. Source rows keep all Standard/Optional/Not Offered/Not Applicable marks individually; no trim inheritance is used. Eight new guides / 36 configurations are added; the existing seven Tiguan configurations are supplemented.

## Configuration / retail price review

Prices below exclude destination, options, tax and dealer charges. Date basis is the supplied order guide, not current retail pricing.

| Model | Exact source trim | Configuration | Sales code | MSRP | Destination | Page |
| --- | --- | --- | --- | ---: | ---: | ---: |
${report.models.flatMap((m) => m.configurations.map((c) => `| ${m.model} | ${c.trim} | ${c.configuration} | ${c.salesCode} | ${price(c.msrp)} | ${price(c.destination)} | ${c.sourcePage} |`)).join("\n")}

ID.4 MSRP and destination are explicitly TBA (p. 28); no zero or prior-year price is substituted. ID. Buzz is only a TBA contents-page reference, with no model section; no ID. Buzz guide is invented.

## Unresolved source cells

| Model / sales code | Page | Feature | Reason |
| --- | ---: | --- | --- |
${report.manualVerification.map((r) => `| ${r.model} / ${r.configuration || r.code} | ${r.page} | ${r.feature || r.code} | ${r.reason} |`).join("\n")}

The two unresolved cells are Atlas Cross Sport SE and SE w/ Technology **AWD** Hill Descent Control entries. Their source cells are blank. FWD is explicitly not applicable from the AWD-only wording; other grades' standard marks are not copied.

## Internal manufacturer discrepancies

| Model / option | Package page / code | Equipment page / code | Handling |
| --- | --- | --- | --- |
${report.sourceConflicts.map((r) => `| ${r.model} / ${r.optionCode} | ${r.packagePage} / ${r.packageValue} | ${r.matrixPage} / ${r.matrixValue} | ${r.resolution} |`).join("\n")}

Availability and package eligibility are established; wheel codes require manufacturer clarification. Both source statements and a visible condition are retained. The importer does not select a preferred code.

## Existing Tiguan preservation

Every pre-existing verified equipment cell and every source reference is preserved. The report records hashes for those cells and for every non-imported vehicle; regression tests compare them to the final catalog. **${report.summary.existingClaimDifferencesPreserved} same-status source-text differences** are recorded separately for review, without assuming semantic equivalence or overwriting richer technical data. **${report.summary.conflictsPreserved} changed-status/numeric conflicts** were found in that comparison. The three internal source discrepancies above are separate.

The order-guide Head-Up Display row (p. 22) resolves previously unknown Tiguan cells: Not Offered on S/SE and Standard on SE R-Line Black/SEL R-Line Turbo. It is supplemental evidence from this dated guide; existing source records remain. Existing technical ratings, RPM ranges, MPG, torque, dimensions and towing are unchanged. Tiguan display names and IDs remain stable; exact order-guide names (including registered marks) are retained as manufacturerName and in this report.

## Missing measurements / ratings

| Field | Unresolved configuration cells |
| --- | ---: |
${[...missing]
  .sort()
  .map(([field, n]) => `| ${field} | ${n} |`)
  .join("\n")}

These **${report.summary.missingSpecificationCells}** unresolved requested fields are a documentation gap, not an extraction failure. This document is not a full technical specification sheet. ID.4 horsepower, torque and range are not invented; FWD ID.4 towing is not derived from absence of a hitch. Existing technical data is kept where available. Other unmapped/shared features remain Unverified when no relevant source row exists; exact source equipment rows retain their resolved marks.

## Important conditions captured

- Golf R POA: solid roof, changed upholstery/driver-seat adjustment and removal of active front ventilation. The row text explicitly says roof/ventilation are standard despite an optional symbol; standard equipment is retained with the package-deletion condition.
- Jetta GLI manual: Travel Assist and ordinary ACC are supported; Stop & Go, Emergency Assist and remote engine start are not offered. DSG is decoded independently.
- Taos P35 is SE FWD only; P44 is SEL-only. Taos S FWD lacks heated front seats while S 4MOTION has them.
- Tiguan p. 18 identifies a nonorderable paddle-shifter production credit; it is recorded as a restriction, not an orderable package. Not-yet/currently-orderable options retain that status and condition.
- Factory packages, paint charges, commercial-fleet services and market-delivery accessories keep distinct source section labels, complete descriptions, codes and restrictions. No market-delivery accessory is called factory standard equipment.
- Color/interior matrices and the page-1 revision inventory are retained in the companion JSON as source reference data. Equipment conditions and priced options are displayed in the existing website views.

## Reuse and validation

See [the import workflow](../../scripts/import/README.md). The pipeline defaults to a candidate and report; local apply checks the reviewed candidate digest and unchanged base. It never merges or deploys. Changed PDFs need a new reviewed profile. Future manufacturer layouts require an extraction adapter rather than guessed column interpretation.

Validation covers the full existing Node/browser suites plus extraction geometry, privacy, idempotency, source alignment, preservation and stale-apply checks. The companion JSON contains every configuration, option/restriction, missing field, preserved source-text comparison and source-page reference.
`;
}

function editionMarkdownReport(report) {
  const missing = new Map();
  for (const item of report.missingSpecifications)
    missing.set(item.field, (missing.get(item.field) || 0) + 1);
  const price = (n) => (n === null ? "TBA" : `$${n.toLocaleString("en-US")}`);
  return `# ${report.sourceTitle} — import review

Reviewed ${report.reviewedAt}. ${report.pagesProcessed} pages processed. ${report.dateBasis || ""}

## Coverage

| Model | Configurations | Populated equipment cells | Matrix rows | Coded options/services |
| --- | ---: | ---: | ---: | ---: |
${report.models.map((m) => `| ${m.model} | ${m.configurations.length} | ${m.equipmentFieldsPopulated} | ${m.matrixRows} | ${m.codedOptions} |`).join("\n")}

${report.summary.configurations} configurations; ${report.summary.equipmentFieldsPopulated} confirmed cells (canonical summaries plus detailed source rows, not unique physical features). No trim or prior-year equipment inheritance. ${report.protectedVehicles.length} existing vehicles protected by preservation hashes. Original PDF is not redistributed; only retail prices are emitted.

## Configuration / retail price review

MSRP excludes destination, options, taxes and dealer charges. Prices use this document edition, not a current retail quote.

| Model | Exact trim | Configuration | Sales code | MSRP | Destination | Page |
| --- | --- | --- | --- | ---: | ---: | ---: |
${report.models.flatMap((m) => m.configurations.map((c) => `| ${m.model} | ${c.trim} | ${c.configuration} | ${c.salesCode} | ${price(c.msrp)} | ${price(c.destination)} | ${c.sourcePage} |`)).join("\n")}

## What's new — reviewed comparisons

${report.yearChanges.map((m) => `### ${m.model}\n\n${m.items.map((i) => `- ${i.text} (2026 pp. ${i.baselinePages}; 2027 pp. ${i.pages})`).join("\n")}\n\nOpen questions: ${m.gaps.join(" ")}`).join("\n\n")}

## Missing specifications

| Field | Unresolved configuration cells |
| --- | ---: |
${[...missing].map(([f, n]) => `| ${f} | ${n} |`).join("\n")}

The guide is not a technical specification listing. No previous-year fuel economy, measurements or ratings are substituted. Atlas Cross Sport retail/destination and option prices are explicitly TBA. ID.4 is absent; no 2027 ID.4 guide is invented.

## Conflicts and manual verification

${report.sourceConflicts.map((c) => `- ${c.model}: option ${c.optionCode}, package p. ${c.packagePage} uses ${c.packageValue}; matrix p. ${c.matrixPage} uses ${c.matrixValue}. Both retained; manufacturer clarification required.`).join("\n") || "No internal numeric/code conflicts detected."}

${report.manualVerification.length} unresolved matrix/option cells; ${report.conflicts.length} conflicts with existing same-year cells. Production credits, region/service footnotes and configuration restrictions are retained. Full per-cell gaps, options, exceptions and preservation hashes are in the companion report.json.

## Repeatability

Run the existing PDF import with the reviewed SHA-256 profile, review this report and candidate, then apply the exact candidate digest locally. The importer never publishes. See scripts/import/README.md. Model-year comparison notes are reviewed profile annotations with citations for both years, not an automatic assumption that wording or missing listings prove changes.
`;
}

async function main() {
  const args = process.argv.slice(2),
    get = (key) => args[args.indexOf(key) + 1];
  for (const key of ["--stage", "--base", "--features", "--out"])
    if (!args.includes(key)) throw new Error(`Missing ${key}`);
  const [stage, base, features] = await Promise.all(
    ["--stage", "--base", "--features"].map(async (key) =>
      JSON.parse(await readFile(get(key), "utf8")),
    ),
  );
  const result = importCatalog(stage, base, features),
    out = resolve(get("--out"));
  await mkdir(out, { recursive: true });
  await writeFile(
    resolve(out, "catalog.candidate.json"),
    JSON.stringify(result.catalog, null, 2) + "\n",
  );
  await writeFile(
    resolve(out, "report.json"),
    JSON.stringify(result.report, null, 2) + "\n",
  );
  await writeFile(resolve(out, "REPORT.md"), markdownReport(result.report));
  console.log(JSON.stringify(result.report.summary));
  console.log(
    `Review candidate and report in ${out}. Production catalog was not modified.`,
  );
}
if (process.argv[1] === fileURLToPath(import.meta.url))
  main().catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  });
