#!/usr/bin/env node
// Review-first batch adapter; never writes the catalog, pushes, merges or deploys.
import { readFile, writeFile, mkdir, readdir, rm } from "node:fs/promises";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { importToyotaBatch } from "./toyota-catalog.mjs";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const args = process.argv.slice(2),
  pdfs = [],
  stages = [];
let out = join(root, "work/toyota-review"),
  basePath = join(root, "data/catalog.json"),
  featuresPath = join(root, "data/features.json"),
  python = "python";
for (let i = 0; i < args.length; i++) {
  const key = args[i],
    value = args[++i];
  if (!value) throw new Error(`Missing value for ${key}`);
  if (key === "--pdf") pdfs.push(resolve(value));
  else if (key === "--stage") stages.push(resolve(value));
  else if (key === "--out") out = resolve(value);
  else if (key === "--base") basePath = resolve(value);
  else if (key === "--features") featuresPath = resolve(value);
  else if (key === "--python") python = value;
  else throw new Error(`Unknown argument ${key}`);
}
if (!pdfs.length && !stages.length)
  throw new Error("Use --pdf PATH (repeatable) or --stage PATH (repeatable)");
const profileDir = join(root, "profiles/imports/toyota");
const profiles = await Promise.all(
  (await readdir(profileDir))
    .filter((f) => f.endsWith(".json"))
    .map(async (f) => ({
      file: join(profileDir, f),
      data: JSON.parse(await readFile(join(profileDir, f), "utf8")),
    })),
);
await mkdir(out, { recursive: true });
// A failed rerun must not leave a previous candidate that could be mistaken for this batch.
for (const file of ["catalog.candidate.json", "report.json", "REPORT.md"])
  await rm(join(out, file), { force: true });
const entries = [],
  seen = new Set();
function add(stage) {
  const matches = profiles.filter(
    (p) =>
      p.data.id === stage.profileId && p.data.sha256 === stage.source.sha256,
  );
  if (matches.length !== 1)
    throw new Error("Stage does not match exactly one reviewed Toyota profile");
  if (seen.has(stage.source.sha256))
    throw new Error("Duplicate brochure in batch; import each source once");
  seen.add(stage.source.sha256);
  entries.push({ stage, profile: matches[0].data });
}
for (const pdf of pdfs) {
  const sha = createHash("sha256")
    .update(await readFile(pdf))
    .digest("hex");
  const matches = profiles.filter((p) => p.data.sha256 === sha);
  if (matches.length !== 1)
    throw new Error(
      "Unknown/changed Toyota PDF. Review a new hash/layout profile; no guessed import was performed.",
    );
  const profile = matches[0];
  if (!/^[a-z0-9-]+$/.test(profile.data.id))
    throw new Error("Unsafe profile ID");
  const target = join(out, profile.data.id + ".extracted.json");
  execFileSync(
    python,
    [
      join(root, "scripts/import/extract_toyota_pdf.py"),
      "--pdf",
      pdf,
      "--profile",
      profile.file,
      "--out",
      target,
    ],
    { stdio: "pipe" },
  );
  add(JSON.parse(await readFile(target, "utf8")));
}
for (const path of stages) add(JSON.parse(await readFile(path, "utf8")));
const base = JSON.parse(await readFile(basePath, "utf8")),
  features = JSON.parse(await readFile(featuresPath, "utf8"));
const result = importToyotaBatch(entries, base, features);
await writeFile(
  join(out, "catalog.candidate.json"),
  JSON.stringify(result.catalog, null, 2) + "\n",
);
await writeFile(
  join(out, "report.json"),
  JSON.stringify(result.report, null, 2) + "\n",
);
const r = result.report;
const lines = [
  "# Toyota brochure import review",
  "",
  "Default dry-run only. No publication or production catalog write occurred.",
  "",
  "| Model | Matrix trim columns | Configurations | Equipment rows | Standard records added | Missing spec cells | Preserved claim discrepancies | Review items |",
  "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
  ...r.models.map(
    (m) =>
      `| ${m.year} ${m.model} | ${m.columns} | ${m.configurations} | ${m.matrixRows} | ${m.standardEquipmentAdded} | ${m.missingSpecifications.length} | ${m.conflicts.length} | ${m.manualVerification.length} |`,
  ),
  "",
  "Full claim-level values, citations, exact raw S/A symbols, scope restrictions and preservation hashes are recorded in report.json and each extracted source stage.",
  "",
  "## Review before applying",
  "",
  "- Blank cells remain unverified; A never becomes standard equipment except explicit selected mechanical configuration identities.",
  "- Existing verified cells, source references, source dates and configuration identities win over incoming wording/value/status differences.",
  "- Colors are manufacturer model-level palettes. Trim/interior combinations are not inferred.",
  "- See each profile's notes and hold rules; unresolved cab, seating, wheel, motor and paid-activation cases remain excluded or N/A.",
  "- MSRP and technical measurements absent from these brochures are not invented.",
  "",
  ...r.models.flatMap((m) => [
    `## ${m.year} ${m.model}`,
    "",
    `Specifications added: ${m.specificationsAdded.length} verified cells. Exterior palette: ${m.colors.exteriors.added} names; interior palette: ${m.colors.interiors.added} unique names. Trim-specific combinations remain N/A.`,
    "",
    `Missing specification fields (per-configuration details in report.json): ${[...new Set(m.missingSpecifications.map((item) => item.field))].join(", ") || "None"}.`,
    "",
    "Manual review / excluded claims:",
    ...[...new Set(m.manualVerification.map((item) => item.reason))].map(
      (reason) => `- ${reason}`,
    ),
    "",
    `Preserved discrepancies: ${m.conflicts.length}. Existing verified claims remain authoritative; exact incoming/current values and pages are in report.json.`,
    "",
    ...entries
      .find((e) => e.profile.vehicleId === m.id)
      .profile.notes.map((n) => `- ${n}`),
    "",
  ]),
  "",
  "## Apply the reviewed candidate locally",
  "",
  "Use the existing import:apply command with this directory and the exact candidate SHA-256. That operation revalidates and checks the unchanged base catalog. Then run all tests/build and prepare a PR. Do not merge or deploy automatically.",
  "",
];
await writeFile(join(out, "REPORT.md"), lines.join("\n"));
console.log(
  `Reviewed ${entries.length} Toyota brochures; candidate and report written to ${out}. Catalog unchanged.`,
);
