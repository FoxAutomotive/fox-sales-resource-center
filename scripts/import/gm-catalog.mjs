import {
  prepareReviewedGm,
  reviewedColors,
  reviewedTechnical,
} from "./gm-reviewed.mjs";
import { createHash } from "node:crypto";
import { validate } from "../validate.mjs";
export const digest = (value) =>
  createHash("sha256")
    .update(typeof value === "string" ? value : JSON.stringify(value))
    .digest("hex");
const slug = (text) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
const main = (text) =>
  text
    .split(/\n\s*\d+[.:]/)[0]
    .replace(/\([A-Z0-9]{3}\)\s*/g, "")
    .replace(/\s+/g, " ")
    .trim();
const unknown = (reason) => ({ status: "unverified", conditions: reason });
// Category/feature mappings describe GM terminology, not an individual model or trim.
const mappings = {
  engine: /^Engine,/,
  transmission: /^Transmission,/,
  drivetrain: /^(?:Front|All)-wheel drive$/,
  wheels: /^Wheels,/,
  appearance: /^(?:Door handles,|Mirror caps,|Roof rails)/,
  tires: /^Tires,/,
  heatedSeats: /^Seats, heated driver and front passenger/,
  heatedWheel: /^Steering wheel, heated/,
  ventilatedSeats: /^(?:Seat, ventilated|Seats, ventilated)/,
  rearHeatedSeats: /^Seats, heated, rear/,
  wirelessCharging: /^Wireless Phone Charging/,
  liftgate: /^Liftgate, (?:AutoSense|.*power)/,
  manualLiftgate: /^Liftgate, rear manual/,
  climate: /^Air conditioning,/,
  frontSeats: /^Seat adjuster,/,
  adaptiveCruiseControl: /^Adaptive Cruise Control/,
  rearCamera: /^HD Rear Vision Camera/,
  areaView: /^HD Surround Vision/,
  roof: /^Sunroof,/,
  panoramicRoof: /^Sunroof,.*panoramic/,
  remoteStart: /^Remote Start$/,
  keyless: /^Keyless Open and Start/,
  infotainment: /^11\.3.*display/,
  instruments: /^Driver Information Center/,
  phone: /^Wireless Apple CarPlay/,
  voiceControl: /^11\.3.*Natural Voice Recognition/,
  mediaConnectivity: /^USB ports,/,
  telematics:
    /^(?:5G vehicle connectivity|OnStar services capable|Wi-Fi Hotspot capable|OnStar Basics)/,
  audio: /^Audio system feature,/,
  safety:
    /^(?:Airbags?,|Airbag,|Buckle to Drive|Teen Driver|Safety Alert Seat|Rear Seat Reminder|Occupant Presence|Seat Belt)/,
  assistance:
    /^(?:Enhanced Automatic Emergency Braking|Lane Keep Assist|Forward Collision Alert|Front Pedestrian and Bicyclist Braking|Following Distance Indicator|Blind Zone Steering Assist)/,
  advancedAssistance:
    /^(?:Rear Cross Traffic Braking|Reverse Automatic Braking|Side Bicyclist Alert|Intersection Automatic Emergency Braking)/,
  parkingSensors: /^Rear Park Assist/,
  rearviewMirror: /^Mirror, inside rearview/,
  steeringWheelType: /^Steering wheel, (?:3-spoke|sport)/,
  wipers: /^Wipers, front rain/,
  highBeam: /^IntelliBeam/,
  powerOutlets: /^Power outlet,.*12-volt/,
  roadSigns: /^Traffic Sign Recognition/,
  wiperPark: /^Heated wiper park/,
};
const technical = {
  steeringWheelType: ["Steering wheel type", "Comfort"],
  dimensions: ["Exterior dimensions", "Performance"],
  wheelbase: ["Wheelbase", "Performance"],
  groundClearance: ["Ground clearance", "Performance"],
  headroom: ["Headroom without sunroof", "Comfort"],
  legroom: ["Legroom", "Comfort"],
  interiorRoom: ["Shoulder / hip room", "Comfort"],
  passengerVolume: ["Passenger volume", "Comfort"],
  cargo: ["Cargo capacity", "Comfort"],
  fuel: ["Fuel tank capacity (approximate)", "Performance"],
  curbWeight: ["Curb weight", "Performance"],
  weights: ["Gross vehicle weight rating", "Performance"],
  track: ["Track width", "Performance"],
  tires: ["Standard tires", "Exterior"],
  rearHeatedSeats: ["Heated rear seats", "Comfort"],
  manualLiftgate: ["Manual liftgate", "Convenience"],
  wiperPark: ["Heated wiper park", "Comfort"],
};
const group = (text) =>
  /^(?:Airbag|Buckle|Teen Driver|Safety|Rear Seat Reminder|Occupant|Seat Belt|Blind|Enhanced|Lane Keep|Forward Collision|Front Pedestrian|Following Distance|Intersection|Rear Cross|Reverse Automatic|Side Bicyclist|Rear Park|HD Rear|IntelliBeam)/i.test(
    text,
  )
    ? "Safety"
    : /^(?:Engine|Transmission|Front-wheel|All-wheel|Alternator|Axle|Automatic Stop|Battery|Brake|Drive Mode|Exhaust|Fuel|GVWR|Suspension|Vehicle health)/i.test(
          text,
        )
      ? "Performance"
      : /^(?:Door handles|Glass|Headlamps|Heated wiper|Liftgate|Mechanical jack|Mirror caps|Mirrors, outside|Roof rails|Shutters|Tail lamps|Tire|Wheel|Window, rear|Wipers)/i.test(
            text,
          )
        ? "Exterior"
        : /(?:display|Audio|USB|OnStar|Wi-Fi|Google|SiriusXM|connectivity|Infotainment|Remote Start|Keyless)/i.test(
              text,
            )
          ? "Technology"
          : "Comfort";
const excluded = (text) =>
  /^(?:LPO,|Emissions|Commercial|Removes |Deleted |Mobile Service Plus)/i.test(
    text,
  ) || /Fleet orders only|fleet-only/i.test(text);
function records(stage, report) {
  const label = (text) =>
    stage.adapter === "gm-fleet-reviewed-v2"
      ? text
          .split(/\n\s*\d+[.:]/)[0]
          .replace(/\s+/g, " ")
          .trim()
      : main(text);
  const byCode = new Map();
  for (const row of stage.equipment) {
    const description = label(row.description);
    if (
      !description ||
      /^(?:Standard Equipment|Chevy Safety Assist, includes|Infotainment, High)/.test(
        description,
      ) ||
      /Package.*includes/i.test(description) ||
      excluded(row.description)
    )
      continue;
    const key = row.code || description.toLowerCase();
    if (!byCode.has(key)) byCode.set(key, []);
    byCode.get(key).push(row);
  }
  return [...byCode.values()].map((rows) => ({
    description: label(rows[0].description)
      .replace(/\(OnStar Fleet Basics for Fleet\)/g, "")
      .replace(/^OnStar Basics .*$/, () => {
        const years = rows[0].description.match(
          /OnStar Basics is standard for (\d+) years/i,
        )?.[1];
        return years ? `OnStar Basics, ${years} years` : "OnStar Basics";
      }),
    rows,
    cells: stage.configurations.map((config, index) => {
      const states = new Set(rows.map((r) => r.cells[index].status));
      if (states.size > 1 || states.has("unverified")) {
        report.ambiguous.push({
          feature: label(rows[0].description),
          configuration: config.header,
          refs: rows.map((r) => r.cells[index].ref),
          reason: "Conflicting or unrecognized GM equipment indicators",
        });
        return { status: "unverified", refs: [] };
      }
      return {
        status: [...states][0],
        refs: rows.map((r) => r.cells[index].ref),
      };
    }),
  }));
}
export function importGmStage(stage, base, features, supplement = null) {
  const reviewed = stage.adapter === "gm-fleet-reviewed-v2";
  if (reviewed) stage = prepareReviewedGm(stage);
  const map = reviewed
    ? {
        ...mappings,
        drivetrain: /^(?:Drivetrain, front|Front|All)-wheel drive/,
        heatedWheel: /^Steering wheel, heated/,
        panoramicRoof: /^Sunroof,.*panoramic/i,
        wirelessCharging: /^Wireless (?:Phone Charging|Charging)/,
        remoteStart: /^Remote (?:Start|vehicle starter)/,
        infotainment: /^(?:11\.3.*display|Audio system,)/,
        phone: /Apple CarPlay|Android Auto/i,
        keyless: /^Keyless (?:Open|Start)/,
        rearHeatedSeats: /^Seats, heated.*rear/i,
        rearCamera: /^(?:HD )?Rear Vision Camera/,
        powerOutlets: /^Power outlet,/,
        wipers: /^(?:Wipers|Windshield wipers),.*(?:rain|Rainsense)/i,
        voiceControl: /Natural Voice Recognition|advanced voice recognition/i,
        assistance:
          /^(?:Automatic Emergency Braking|Enhanced Automatic Emergency Braking|Lane Keep Assist|Forward Collision Alert|Front Pedestrian|Following Distance|Blind Zone)/,
        advancedAssistance:
          /^(?:Rear Cross Traffic|Reverse Automatic|Side Bicyclist|Intersection)/,
        parkingSensors: /^(?:Rear Park Assist|Front and Rear Park Assist)/,
        superCruise: /^Super Cruise,/,
        liftgate:
          /^(?:Liftgate,.*(?:power|AutoSense)|AutoSense Power Liftgate)/,
        manualLiftgate: /^Liftgate, (?:rear )?manual/,
        steeringWheelType: /^Steering wheel, (?!heated)/,
      }
    : mappings;
  if (
    (!reviewed && stage.adapter !== "gm-fleet-xlsx-v1") ||
    stage.schemaVersion !== 1 ||
    !stage.configurations.length
  )
    throw new Error("Unsupported GM stage");
  if (
    stage.equipment.some((r) => r.cells.length !== stage.configurations.length)
  )
    throw new Error("GM configuration alignment changed");
  const id = `${stage.source.year}-chevrolet-${slug(stage.source.model)}`;
  const existing = base.vehicles.find((v) => v.id === id);
  const report = {
    id,
    source: stage.source,
    ambiguous: [],
    missing: [],
    excluded: [],
    standardCounts: {},
    duplicate: false,
    ...(reviewed
      ? {
          selectionChecks: stage.selectionChecks,
          reviewNotes: stage.reviewNotes,
        }
      : {}),
  };
  if (
    supplement &&
    (supplement.year !== stage.source.year ||
      supplement.model !== stage.source.model)
  )
    throw new Error("Supplement belongs to a different model/year");
  const supplementalDigest = digest(supplement);
  const baseErrors = validate(base, features);
  if (baseErrors.length) throw new Error(baseErrors.join("\n"));
  if (
    existing &&
    existing.status === "awaiting-verification" &&
    !existing.trims.length &&
    reviewed
  ) {
    report.replacedPlaceholder = existing.id;
    base = {
      ...base,
      vehicles: base.vehicles.filter((v) => v.id !== existing.id),
    };
  } else if (existing) {
    if (
      existing.importProvenance?.sha256 !== stage.source.sha256 ||
      existing.importProvenance?.supplementalDigest !== supplementalDigest
    )
      throw new Error(
        "Model/year already exists with different verified source content; review the conflict before replacing it",
      );
    return {
      catalog: structuredClone(base),
      report: {
        ...report,
        duplicate: true,
        standardCounts: existing.importProvenance.standardCounts,
        missing: existing.standardOnlyMissingFields.filter((f) =>
          existing.trims.some((t) => t.equipment[f]?.status === "unverified"),
        ),
        unverifiedFields: [
          ...new Set(
            existing.trims.flatMap((t) =>
              Object.entries(t.equipment)
                .filter(([, c]) => c.status === "unverified")
                .map(([f]) => f),
            ),
          ),
        ],
        publishedStandardCounts: Object.fromEntries(
          existing.trims.map((t) => [
            `${t.name} ${t.configuration}`,
            Object.values(t.equipment).filter((c) => c.status === "standard")
              .length,
          ]),
        ),
      },
    };
  }
  const catalog = structuredClone(base),
    sid = `gm-xlsx-${stage.source.year}-${slug(stage.source.model)}`;
  const source = {
    id: sid,
    title: `GM Fleet Order Guide — ${stage.source.year} Chevrolet ${stage.source.model}`,
    kind: "verified",
    modelYear: stage.source.year,
    checkedAt: stage.reviewedAt,
    url: "https://www.gmfleetorderguide.com/",
    shortLabel: `GM-X${String(stage.source.year).slice(-2)}`,
    delivery: "user-upload",
    format: "xlsx",
    fileName: stage.source.fileName,
    repositoryPath: `sources/gm/${stage.source.fileName}`,
    sha256: stage.source.sha256,
    sheets: stage.source.sheets,
    scope:
      "Supplied workbook; citations identify worksheet cells. Original workbook is preserved in the repository; the GM link is a manufacturer provenance reference.",
  };
  const v = {
    id,
    brand: "chevrolet",
    year: stage.source.year,
    model: stage.source.model,
    category: supplement?.category || (reviewed ? "SUV" : "Vehicle"),
    status: "verified",
    verifiedAt: stage.reviewedAt,
    summary: `${stage.source.year} ${stage.source.model} — factory-standard equipment and source-verified specifications. Choose a drivetrain within each trim.`,
    equipmentScope: "standard-only",
    sources: [source, ...(supplement ? [supplement.source] : [])],
    trims: [],
    packages: [],
    upgrades: [],
    notes: [],
    additionalFields: [],
  };
  if (!catalog.years.includes(v.year)) catalog.years.push(v.year);
  const equipment = structuredClone(stage.equipment);
  const packageRows = [
    ...new Map(
      equipment
        .filter(
          (r) =>
            /Package.*includes/i.test(r.description.split("\n")[0]) &&
            !excluded(r.description),
        )
        .map((r) => [r.code || r.description, r]),
    ).values(),
  ];
  report.standardPackageChecks = [];
  for (const parent of packageRows) {
    const text = parent.description.split(/\n\s*\d+[.:]/)[0];
    const members = [...text.matchAll(/\(([A-Z0-9]{3})\)/g)];
    for (const [memberIndex, match] of members.entries()) {
      const code = match[1];
      let children = equipment.filter((r) => r.code === code);
      if (
        !children.length &&
        parent.cells.some((c) => c.status === "standard")
      ) {
        const description = text
          .slice(
            match.index + match[0].length,
            members[memberIndex + 1]?.index ?? text.length,
          )
          .replace(/^[,;\s]+|[,;\s]+$/g, "")
          .replace(/\s+and$/, "");
        const child = {
          ...parent,
          code,
          description,
          cells: parent.cells.map((c) => ({
            ...c,
            status: c.status === "standard" ? "standard" : "unverified",
          })),
        };
        equipment.push(child);
        children = [child];
      }
      for (const [index, c] of parent.cells.entries())
        if (c.status === "standard") {
          const confirmed =
            children.length > 0 &&
            children.every((r) => r.cells[index].status === "standard");
          report.standardPackageChecks.push({
            package: parent.code,
            member: code,
            configuration: stage.configurations[index].header,
            confirmed,
            ref: c.ref,
          });
          if (!confirmed)
            report.ambiguous.push({
              feature: code,
              configuration: stage.configurations[index].header,
              reason:
                "Standard package content conflicts with individual equipment indicators",
              refs: [c.ref],
            });
        }
    }
  }
  const known = records({ ...stage, equipment }, report);
  const evidence = (value, refs, status = "standard") => ({
    status,
    value,
    sourceIds: [sid],
    sourceCells: { [sid]: [...new Set(refs)] },
  });
  const combine = (entries, index) => {
    const standard = entries.filter(
      (r) => r.cells[index].status === "standard",
    );
    if (standard.length) {
      const result = evidence(
        [...new Set(standard.map((r) => r.description))].join("; "),
        standard.flatMap((r) => r.cells[index].refs),
      );
      if (reviewed) {
        const conditions = [
          ...new Set(
            standard.flatMap((r) =>
              r.rows.map((row) => row.conditions?.[index]).filter(Boolean),
            ),
          ),
        ];
        if (conditions.length) result.conditions = conditions.join(" ");
        result.sourceCells[sid] = [
          ...new Set([
            ...result.sourceCells[sid],
            ...standard.flatMap((r) =>
              r.rows.map((row) => row.descriptionCell),
            ),
          ]),
        ];
      }
      return result;
    }
    if (
      !entries.length ||
      entries.some((r) => r.cells[index].status === "unverified")
    )
      return unknown(
        "The reviewed workbook does not establish this standard-equipment specification; verification required.",
      );
    return evidence(
      "Not standard in this configuration",
      entries.flatMap((r) => r.cells[index].refs),
      "not-standard",
    );
  };
  const addField = (key, label, category, scope) => {
    if (
      !catalog.fields.some((f) => f.id === key) &&
      !v.additionalFields.some((f) => f.id === key)
    )
      v.additionalFields.push({
        id: key,
        label,
        group: category,
        ...(scope ? { comparisonScope: scope } : {}),
      });
  };
  for (const [key, [label, category]] of Object.entries(technical))
    addField(key, label, category === "Convenience" ? "Comfort" : category);
  if (reviewed) {
    if (stage.equipment.some((r) => /^Super Cruise,/.test(r.description)))
      addField(
        "superCruise",
        "Super Cruise hands-free driver assistance",
        "Safety",
      );
    else delete map.superCruise;
  }
  const mapped = new Set();
  for (const [key, pattern] of Object.entries(map))
    for (const r of known) if (pattern.test(r.description)) mapped.add(r);
  // Canonical summaries replace corresponding source rows; only unmapped standard facts add detailed rows.
  const detailed = new Map();
  for (const r of known.filter(
    (r) => !mapped.has(r) && r.cells.some((c) => c.status === "standard"),
  )) {
    const key = slug(r.description);
    if (!detailed.has(key)) detailed.set(key, []);
    detailed.get(key).push(r);
  }
  for (const [key, rows] of detailed)
    addField(
      `gm-${digest(key).slice(0, 12)}`,
      rows[0].description,
      group(rows[0].description),
      "model",
    );
  report.publishedStandardCounts = {};
  const tables = stage.tables;
  const dimensions = tables.Dimensions,
    specs = tables.Specs;
  const tableColumn = (table, trim) => {
    const row = table.find((r) =>
      r.slice(1).some((c) => String(c).includes("FWD and AWD")),
    );
    const col = row?.findIndex(
      (c, i) => i > 0 && new RegExp(`\\b${trim}\\b`, "i").test(String(c)),
    );
    if (!row || col < 1)
      throw new Error(`No unambiguous specification column for ${trim}`);
    return col;
  };
  const findSpec = (table, pattern, trim, drive, sheet) => {
    const config = reviewed ? trim : null;
    const col = reviewed
      ? sheet === "Specs"
        ? config.specColumn
        : config.dimensionColumn
      : tableColumn(table, trim);
    const rows = table
      .map((r, i) => ({ r, i }))
      .filter(
        ({ r }) =>
          pattern.test(String(r[0] || "")) &&
          !(
            reviewed
              ? /(?:optional|with|w\/)\s*(?:a |the )?sunroof|available.*seating|seating.*available/i
              : /optional sunroof/i
          ).test(String(r[0])) &&
          (!reviewed ||
            !/^Curb weight/i.test(String(r[0])) ||
            !/\b(?:LS|1RS|LT|2RS|ACTIV|RS)\b/.test(String(r[0])) ||
            new RegExp(`\\b${config.trim}\\b`).test(String(r[0]))) &&
          (!reviewed ||
            !config.engineCode ||
            !/Curb weight/i.test(String(r[0])) ||
            !/2\.0L|3\.6L/.test(String(r[0])) ||
            String(r[0]).includes(
              config.engineCode === "LGX" ? "3.6L" : "2.0L",
            )) &&
          (!/\bFWD\b/.test(String(r[0])) || drive === "FWD") &&
          (!/\bAWD\b/.test(String(r[0])) || drive === "AWD"),
      );
    return rows.map(({ r, i }) => ({
      label: r[0],
      value: String(r[col] || "").trim(),
      ref: `${sheet}!${String.fromCharCode(65 + col)}${i + 1}`,
    }));
  };
  const value = (entries, unit = "") =>
    entries
      .map((e) =>
        e.value.replace(
          /([\d.]+)\s*\(([^)]+)\)/,
          (_, a, b) =>
            `${a}${unit ? " " + unit.split("|")[0] : ""} (${b}${unit.includes("|") ? " " + unit.split("|")[1] : ""})`,
        ),
      )
      .join(" / ");
  if (reviewed) v.colors = reviewedColors(stage, sid);
  else {
    const colors = tables["Color and Trim"];
    const interiorHeader = colors.findIndex((r) => r[0] === "Decor Level");
    const colorHeader = colors.findIndex(
      (r) => r[0] === "Exterior Solid Paint",
    );
    const names = colors[interiorHeader].slice(4).map(String);
    v.colors = { interiors: [], exteriors: [] };
    for (let i = interiorHeader + 1; i < colorHeader; i++) {
      const r = colors[i];
      if (!r[0] || !r[3]) continue;
      const trim = stage.configurations
        .map((c) => c.trim)
        .find((t) => new RegExp(`^${t}(?:$| with )`).test(r[0]));
      if (!trim) continue;
      for (let c = 4; c < r.length; c++)
        if (r[c] && r[c] !== "--")
          v.colors.interiors.push({
            trim,
            name: names[c - 4],
            material: r[3],
            standard: r[0] === trim,
            sourceIds: [sid],
            sourceCells: {
              [sid]: [
                `Color and Trim!D${i + 1}`,
                `Color and Trim!${String.fromCharCode(65 + c)}${i + 1}`,
              ],
            },
            colorColumn: c,
          });
    }
    for (let i = colorHeader + 1; i < colors.length; i++) {
      const r = colors[i];
      if (!r[2] || !r[0]) continue;
      const interiors = v.colors.interiors.filter((c) =>
        String(r[c.colorColumn]).startsWith("A"),
      );
      v.colors.exteriors.push({
        name: String(r[0])
          .replace(/^NEW!\s*/, "")
          .replace(/\d+$/, "")
          .trim(),
        trims: [...new Set(interiors.map((c) => c.trim))],
        interiorNames: [...new Set(interiors.map((c) => c.name))],
        extraCost: /\d$/.test(r[0]),
        sourceIds: [sid],
        sourceCells: {
          [sid]: [
            `Color and Trim!A${i + 1}`,
            `Color and Trim!E${i + 1}:H${i + 1}`,
          ],
        },
      });
    }
    const exteriorByCode = new Map();
    for (let i = colorHeader + 1; i < colors.length; i++)
      if (colors[i][2])
        exteriorByCode.set(
          colors[i][2],
          v.colors.exteriors.find(
            (c) =>
              c.name ===
              String(colors[i][0])
                .replace(/^NEW!\s*/, "")
                .replace(/\d+$/, "")
                .trim(),
          ),
        );
    v.colors.roofs = [];
    for (let i = 0; i < colors.length; i++) {
      const text = String(colors[i][0] || "");
      if (!text.startsWith("•")) continue;
      for (const bullet of text.split("•").filter(Boolean)) {
        const title = /\([A-Z0-9]{3}\)\s*(.+?Roof)\s+available/i.exec(
          bullet,
        )?.[1];
        if (!title) continue;
        const positive = bullet.replace(/Not available on[^.]+/gi, "");
        const trims = [
          ...new Set(
            [...positive.matchAll(/available on\s+([^.]+)/gi)].flatMap((m) =>
              stage.configurations
                .map((c) => c.trim)
                .filter((name) => new RegExp(`\\b${name}\\b`).test(m[1])),
            ),
          ),
        ];
        const excludedColors = [...bullet.matchAll(/\(([A-Z0-9]{3})\)/g)]
          .map((m) => exteriorByCode.get(m[1])?.name)
          .filter(Boolean);
        v.colors.roofs.push({
          name: title,
          trims,
          combinations: trims.map((trim) => ({
            trim,
            exteriors: v.colors.exteriors
              .filter(
                (c) =>
                  c.trims.includes(trim) && !excludedColors.includes(c.name),
              )
              .map((c) => c.name),
          })),
          sourceIds: [sid],
          sourceCells: { [sid]: [`Color and Trim!A${i + 1}`] },
        });
      }
    }
  }
  for (const [index, c] of stage.configurations.entries()) {
    const t = {
      id: reviewed ? c.id : slug(`${c.trim}-${c.drive}`),
      name: c.trim,
      configuration: c.configuration || c.drive,
      sourceIds: [sid],
      equipment: {},
    };
    for (const f of catalog.fields)
      t.equipment[f.id] = map[f.id]
        ? combine(
            known.filter((r) => map[f.id].test(r.description)),
            index,
          )
        : unknown(
            "Not established by the reviewed workbook; additional model-year-specific manufacturer documentation is required.",
          );
    for (const [key, pattern] of Object.entries(map))
      if (!catalog.fields.some((f) => f.id === key))
        t.equipment[key] = combine(
          known.filter((r) => pattern.test(r.description)),
          index,
        );
    for (const [key, rows] of detailed)
      t.equipment[`gm-${digest(key).slice(0, 12)}`] = combine(rows, index);
    if (t.equipment.voiceControl.status === "standard")
      t.equipment.voiceControl.value = "Natural Voice Recognition";
    if (t.equipment.infotainment.status === "standard")
      t.equipment.infotainment.value = t.equipment.infotainment.value.replace(
        /, Natural Voice Recognition and Phone Integration.*$/,
        "",
      );
    const standardInterior = v.colors.interiors.find(
      (i) => i.trim === c.trim && i.standard,
    );
    if (standardInterior)
      t.equipment.upholstery = evidence(
        `${standardInterior.material} — ${standardInterior.name}`,
        standardInterior.sourceCells[sid],
      );
    const assignments = {
      wheelbase: [dimensions, /^Wheelbase$/, "in|mm", "Dimensions"],
      dimensions: [
        dimensions,
        reviewed
          ? /^(?:Overall length|Body width|Overall width(?:, without mirrors)?|Overall height)$/
          : /^(?:Overall length|Body width|Overall height)$/,
        "in|mm",
        "Dimensions",
      ],
      headroom: [dimensions, /^Head room/, "in|mm", "Dimensions"],
      legroom: [dimensions, /^Leg room/, "in|mm", "Dimensions"],
      interiorRoom: [dimensions, /^(Shoulder|Hip) room/, "in|mm", "Dimensions"],
      track: [dimensions, /track width/, "in|mm", "Dimensions"],
      fuel: [specs, /^Fuel capacity/, "U.S. gal|L", "Specs"],
      curbWeight: [specs, /^Curb Weight/, "lb|kg", "Specs"],
      weights: [specs, /^Gross Vehicle Weight/, "lb|kg", "Specs"],
      cargo: [specs, /^Cargo volume/, "cu ft|L", "Specs"],
      seating: [specs, /^Seating capacity/, "", "Specs"],
    };
    for (const [field, [table, pattern, unit, sheet]] of Object.entries(
      assignments,
    )) {
      const entries = findSpec(
        table,
        reviewed ? new RegExp(pattern.source, "i") : pattern,
        reviewed ? c : c.trim,
        c.drive,
        sheet,
      ).filter(
        (e) => e.value && (!reviewed || !/^(?:--|TBD|N\/A)$/i.test(e.value)),
      );
      if (!entries.length) {
        t.equipment[field] = unknown("Not provided in the reviewed workbook.");
        continue;
      }
      let text = value(entries, unit);
      if (field === "seating" && /^\d+(?:\/\d+)+$/.test(entries[0].value)) {
        const seats = entries[0].value.split("/").map(Number);
        text = `${seats.reduce((a, b) => a + b, 0)} passengers (${seats.join(" / ")} by row)`;
        if (!reviewed)
          text = `${seats[0] + seats[1]} passengers (${seats[0]} front / ${seats[1]} rear)`;
      } else if (entries.length > 1)
        text = entries
          .map((e) => `${e.label.replace(/,.*$/, "")}: ${value([e], unit)}`)
          .join("; ");
      // Preserve positional labels in paired measurements and cargo capacities.
      if (
        ["headroom", "legroom", "interiorRoom", "cargo", "track"].includes(
          field,
        )
      )
        text = entries
          .map(
            (e) =>
              `${e.label.replace(/,?\s*(?:cu\. ft\.|lbs\.).*$/i, "")}: ${value([e], unit)}`,
          )
          .join("; ");
      t.equipment[field] = evidence(
        text,
        entries.map((e) => e.ref),
      );
    }
    for (const field of ["groundClearance", "passengerVolume"])
      t.equipment[field] = unknown(
        "Not supplied by the Dimensions/Specs worksheets or reviewed supplemental manufacturer source.",
      );
    for (const field of ["electricRange", "charging", "dcCharging"])
      t.equipment[field] = evidence(
        "Not applicable — documented gasoline powertrain",
        known
          .filter((r) => map.engine.test(r.description))
          .flatMap((r) => r.cells[index].refs),
        "not-applicable",
      );
    if (reviewed) reviewedTechnical(stage, c, t.equipment, sid);
    for (const [field, fact] of Object.entries(supplement?.facts || {}))
      t.equipment[field] = {
        status: "standard",
        value: fact.value,
        sourceIds: [supplement.source.id],
        sourceSections: { [supplement.source.id]: fact.locator },
      };
    for (const f of v.additionalFields)
      t.equipment[f.id] ||= unknown("Not established by the workbook.");
    report.standardCounts[reviewed ? c.id : `${c.trim} ${c.drive}`] =
      known.filter((r) => r.cells[index].status === "standard").length;
    report.publishedStandardCounts[reviewed ? c.id : `${c.trim} ${c.drive}`] =
      Object.values(t.equipment).filter((c) => c.status === "standard").length;
    v.trims.push(t);
  }
  report.unverifiedFields = [
    ...new Set(
      v.trims.flatMap((t) =>
        Object.entries(t.equipment)
          .filter(([, c]) => c.status === "unverified")
          .map(([field]) => field),
      ),
    ),
  ];
  const highlights = tables.Highlights;
  let section = "";
  const changes = [];
  for (let i = 0; i < highlights.length; i++) {
    const text = String(highlights[i][0] || "");
    if (!text.startsWith("*")) {
      section = text;
      continue;
    }
    const codes = [...text.matchAll(/\(([A-Z0-9]{3})\)/g)].map((m) => m[1]);
    const matching = known.filter((r) =>
      r.rows.some((row) => codes.includes(row.code)),
    );
    if (
      matching.length &&
      matching.every((r) => r.cells.every((c) => c.status !== "standard"))
    ) {
      report.excluded.push({
        sheet: "Highlights",
        row: i + 1,
        reason:
          "Change concerns nonstandard optional equipment; excluded from standard-only page",
      });
      continue;
    }
    changes.push({
      text: `${/Deletions/i.test(section) ? "Deleted: " : ""}${main(text.replace(/^\*\s*/, ""))}`,
      sourceIds: [sid],
      sourceCells: { [sid]: [`Highlights!A${i + 1}`] },
    });
  }
  v.modelYearChanges = {
    basis: "manufacturer-highlights",
    reviewedAt: stage.reviewedAt,
    items: changes,
    gaps: [],
  };
  const baseTrim = v.trims[0];
  for (const name of [...new Set(v.trims.map((t) => t.name))].slice(1)) {
    const target = v.trims.find(
      (t) => t.name === name && t.configuration === baseTrim.configuration,
    );
    const gains = ["wirelessCharging", "liftgate", "frontSeats", "climate"]
      .filter(
        (f) =>
          target?.equipment[f]?.status === "standard" &&
          target.equipment[f].value !== baseTrim.equipment[f]?.value &&
          v.trims
            .filter((t) => t.name === name)
            .every(
              (t) =>
                t.equipment[f]?.status === "standard" &&
                t.equipment[f].value === target.equipment[f].value,
            ),
      )
      .slice(0, 3)
      .map((f) => ({
        text: `${name} standard equipment: ${target.equipment[f].value}`,
        sourceIds: [sid],
        sourceCells: {
          [sid]: [
            ...new Set(
              v.trims
                .filter((t) => t.name === name)
                .flatMap((t) => t.equipment[f].sourceCells?.[sid] || []),
            ),
          ],
        },
      }));
    if (gains.length) v.upgrades.push({ from: baseTrim.name, to: name, gains });
  }
  const core = ["engine", "horsepower", "torque", "transmission", "drivetrain"];
  v.comparisonContextFields = core;
  v.standardOnlyMissingFields = [
    "economy",
    "towing",
    "groundClearance",
    "passengerVolume",
    "msrp",
  ];
  v.quickReference = {
    scope: "gasoline",
    groups: [...new Set(v.trims.map((t) => t.name))].map((name) => ({
      label: name,
      trimIds: v.trims.filter((t) => t.name === name).map((t) => t.id),
      fieldIds: ["wheels", "upholstery", "frontSeats"],
    })),
    commonFieldIds: [
      "heatedSeats",
      "heatedWheel",
      "adaptiveCruiseControl",
      "infotainment",
    ],
    powertrainTrimIds: [
      ...new Map(v.trims.map((t) => [t.configuration, t.id])).values(),
    ],
    optionalEquipmentIds: [],
    standardSpecFields: [
      "engine",
      "transmission",
      "torque",
      "fuel",
      "dimensions",
      "wheelbase",
      "headroom",
      "legroom",
      "interiorRoom",
      "cargo",
      "seating",
    ],
    caveats: [
      {
        text: "Factory-standard equipment only. EPA fuel economy, configuration-specific towing, ground clearance, passenger volume and MSRP require verification. Source cells and complete equipment/color references are in the online guide.",
        sourceIds: [sid],
      },
    ],
  };
  for (const field of [
    "economy",
    "towing",
    "groundClearance",
    "passengerVolume",
    "msrp",
  ]) {
    report.missing.push(field);
  }
  report.excluded.push(
    ...stage.equipment
      .filter((r) => !r.cells.some((c) => c.status === "standard"))
      .map((r) => ({
        sheet: r.sheet,
        row: r.row,
        reason: "Not factory-standard for any configuration",
      })),
  );
  v.notes.push(
    "Factory-standard retail equipment is shown. Color references describe manufacturer combinations and do not represent dealership inventory.",
  );
  v.notes.push(...(supplement?.researchNotes || []));
  if (reviewed) {
    v.notes.push(...stage.reviewNotes);
    v.notes.push(
      ...new Map(
        stage.equipment
          .filter((r) => r.description.includes("\n"))
          .map((r) => [
            r.description,
            `Manufacturer workbook notes (${r.descriptionCell}): ${r.description}`,
          ]),
      ).values(),
    );
    v.notes.push(
      ...stage.tables["Color and Trim"].flatMap((row, i) =>
        row[0] && /(?:^|\n)(?:•|\d+[.:])/.test(String(row[0]))
          ? [
              `Manufacturer color restrictions (Color and Trim!A${i + 1}): ${row[0]}`,
            ]
          : [],
      ),
    );
    v.quickReference.caveats[0].text =
      "Factory-standard equipment for the selected configuration only. N/A marks unresolved or inapplicable figures. Production and towing restrictions remain in the online guide. Paint eligibility is not inventory.";
    // The printed reference is a summary; full measurements and changes stay online.
    v.quickReference.standardSpecFields = [
      "transmission",
      "torque",
      "fuel",
      "dimensions",
      "wheelbase",
      "cargo",
      "seating",
      "towing",
    ];
    const importantChanges = changes.filter((item) =>
      /engine|models\b|Adaptive Cruise|infotainment|Information Center|Braking|Super Cruise|camera/i.test(
        item.text,
      ),
    );
    v.quickReference.modelYearChangeItems = (
      importantChanges.length ? importantChanges : changes
    ).slice(0, 5);
    v.quickReference.powertrainTrimIds = [
      ...new Map(v.trims.map((t) => [t.configuration, t.id])).values(),
    ];
    v.quickReference.commonFieldIds = v.quickReference.commonFieldIds.filter(
      (key) =>
        v.trims.every(
          (t) =>
            t.equipment[key]?.status === "standard" &&
            t.equipment[key].value === v.trims[0].equipment[key].value,
        ),
    );
    v.standardOnlyMissingFields = v.standardOnlyMissingFields.filter((key) =>
      v.trims.some((t) => t.equipment[key]?.status === "unverified"),
    );
    report.missing = v.standardOnlyMissingFields;
  }
  v.importProvenance = {
    adapter: stage.adapter,
    sha256: stage.source.sha256,
    supplementalDigest,
    standardCounts: report.standardCounts,
  };
  catalog.vehicles.push(v);
  const brand = catalog.brands.find((b) => b.id === v.brand);
  const guides = catalog.vehicles.filter(
    (vehicle) =>
      vehicle.brand === v.brand &&
      vehicle.year === v.year &&
      vehicle.status === "verified",
  );
  brand.coverageNotes ||= {};
  brand.coverageNotes[String(v.year)] =
    `${v.year} Chevrolet: ${guides.length} manufacturer-source-verified standard-equipment guide${guides.length === 1 ? "" : "s"}, ${guides.reduce((n, vehicle) => n + vehicle.trims.length, 0)} configurations. Missing technical specifications remain Unverified. Color references are not inventory claims.`;
  brand.defaultYear = Math.max(
    ...catalog.vehicles
      .filter(
        (vehicle) => vehicle.brand === v.brand && vehicle.status === "verified",
      )
      .map((vehicle) => vehicle.year),
  );
  const errors = validate(catalog, features);
  if (errors.length) throw new Error(errors.join("\n"));
  return { catalog, report };
}
