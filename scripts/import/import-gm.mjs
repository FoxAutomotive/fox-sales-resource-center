import { createHash } from "node:crypto";
import { gmReviewedDigest, reverifyGmStage } from "./gm-reviewed.mjs";
// Existing review/apply contract, with independent GM workbook jobs and no publication.
import {
  readFile,
  writeFile,
  mkdir,
  copyFile,
  readdir,
} from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { resolve, basename } from "node:path";
import { importGmStage, digest } from "./gm-catalog.mjs";
const args = process.argv.slice(2),
  get = (key, fallback) =>
    args.includes(key) ? args[args.indexOf(key) + 1] : fallback;
const first = args.indexOf("--xlsx");
if (first < 0)
  throw new Error(
    "Usage: npm run import:gm -- --xlsx workbook.xlsx [more.xlsx ...] --out work/gm-review [--base data/catalog.json]",
  );
const paths = [];
for (let i = first + 1; i < args.length && !args[i].startsWith("--"); i++)
  paths.push(resolve(args[i]));
if (!paths.length) throw new Error("No workbook paths supplied");
const out = resolve(get("--out", "work/gm-review"));
await mkdir(out, { recursive: true });
const base = JSON.parse(
  await readFile(get("--base", "data/catalog.json"), "utf8"),
);
const features = JSON.parse(
  await readFile(get("--features", "data/features.json"), "utf8"),
);
let catalog = structuredClone(base);
const report = {
  schemaVersion: 1,
  baseSha256: digest(base),
  jobs: [],
  protectedVehicles: base.vehicles.map((v) => ({
    id: v.id,
    sha256: digest(v),
  })),
};
const profileFolder = resolve("profiles/imports/gm-reviewed");
const profiles = await Promise.all(
  (await readdir(profileFolder))
    .filter((f) => f.endsWith(".json"))
    .map(async (file) => ({
      file: resolve(profileFolder, file),
      data: JSON.parse(await readFile(resolve(profileFolder, file), "utf8")),
    })),
);
const seen = new Map();
for (const [index, path] of paths.entries()) {
  try {
    const folder = resolve(out, `job-${index + 1}`);
    await mkdir(folder, { recursive: true });
    const extracted = resolve(folder, "extracted.json");
    const sha = createHash("sha256")
      .update(await readFile(path))
      .digest("hex");
    const matched = profiles.find((p) => p.data.sha256 === sha);
    execFileSync(
      get("--python", "python"),
      [
        matched
          ? "scripts/import/extract_gm_reviewed.py"
          : "scripts/import/extract_gm_xlsx.py",
        "--xlsx",
        path,
        "--out",
        extracted,
        ...(matched ? ["--profile", matched.file] : []),
      ],
      { stdio: "pipe" },
    );
    const stage = JSON.parse(await readFile(extracted, "utf8"));
    stage.reviewedAt = get(
      "--reviewed-at",
      stage.reviewedAt || new Date().toISOString().slice(0, 10),
    );
    const key = `${stage.source.year}-${stage.source.model.toLowerCase()}`;
    if (seen.has(key)) {
      report.jobs.push({
        file: basename(path),
        status: seen.get(key) === stage.source.sha256 ? "duplicate" : "failed",
        reason:
          seen.get(key) === stage.source.sha256
            ? "Duplicate model-year/model in this batch; no duplicate record created"
            : "Conflicting duplicate model/year with different workbook content; first successful job retained for review",
      });
      continue;
    }
    let supplement = null;
    const supplementPath = resolve(
      "profiles/imports/gm-supplements",
      `${key.replaceAll(" ", "-")}.json`,
    );
    try {
      supplement = JSON.parse(await readFile(supplementPath, "utf8"));
    } catch (e) {
      if (e.code !== "ENOENT") throw e;
    }
    if (
      matched &&
      (stage.contentSha256 !== matched.data.expectedContentSha256 ||
        gmReviewedDigest(stage) !== matched.data.expectedContentSha256)
    )
      throw new Error("Reviewed GM stage fingerprint mismatch");
    const existing = catalog.vehicles.find(
      (v) =>
        v.id ===
        `${stage.source.year}-chevrolet-${stage.source.model.toLowerCase().replaceAll(" ", "-")}`,
    );
    if (matched?.data.reverifyAgainst && existing) {
      const archived = JSON.parse(
        await readFile(matched.data.reverifyAgainst, "utf8"),
      );
      report.jobs.push({
        file: basename(path),
        ...reverifyGmStage(stage, archived, existing),
      });
      seen.set(key, stage.source.sha256);
      await writeFile(extracted, JSON.stringify(stage, null, 2) + "\n");
      await copyFile(path, resolve(folder, basename(path)));
      continue;
    }
    const result = importGmStage(stage, catalog, features, supplement);
    catalog = result.catalog;
    seen.set(key, stage.source.sha256);
    report.jobs.push({
      file: basename(path),
      status: result.report.duplicate ? "unchanged" : "imported",
      ...result.report,
    });
    await writeFile(extracted, JSON.stringify(stage, null, 2) + "\n");
    await copyFile(path, resolve(folder, basename(path)));
  } catch (error) {
    report.jobs.push({
      file: basename(path),
      status: "failed",
      error: error.message,
    });
  }
}
report.protectedVehicles = report.protectedVehicles.filter(
  (p) => !report.jobs.some((j) => j.status === "imported" && j.id === p.id),
);
report.placeholderReplacements = base.vehicles
  .filter(
    (v) =>
      v.status === "awaiting-verification" &&
      !v.trims.length &&
      report.jobs.some((j) => j.id === v.id && j.status === "imported"),
  )
  .map((before) => ({
    id: before.id,
    before,
    afterSha256: digest(catalog.vehicles.find((v) => v.id === before.id)),
  }));
report.resultVehicles = report.jobs
  .filter((j) => j.id)
  .map((j) => ({
    id: j.id,
    sha256: digest(catalog.vehicles.find((v) => v.id === j.id)),
  }));
await writeFile(
  resolve(out, "catalog.candidate.json"),
  JSON.stringify(catalog, null, 2) + "\n",
);
await writeFile(
  resolve(out, "report.json"),
  JSON.stringify(report, null, 2) + "\n",
);
const jobs = report.jobs;
const md = `# GM workbook import review\n\nCandidate only; no publication. Original workbooks are preserved per job.\n\n${jobs
  .map(
    (j) =>
      `## ${j.file}\n\nStatus: ${j.status}\n\n${
        j.error ||
        j.reason ||
        `Model: ${j.id}\n\n| Configuration | Unique source equipment entries standard |\n| --- | ---: |\n${Object.entries(
          j.standardCounts,
        )
          .map(([name, n]) => `| ${name} | ${n} |`)
          .join(
            "\n",
          )}\n\nMissing requested specifications: ${(j.missing || []).join(", ") || "none newly identified"}.

All unresolved shared categories/specifications: ${(j.unverifiedFields || []).join(", ")}.\n\nAmbiguous classifications: ${(j.ambiguous || []).length}; excluded nonstandard source rows/change notes: ${(j.excluded || []).length}.`
      }`,
  )
  .join(
    "\n\n",
  )}\n\n${report.protectedVehicles.length} existing vehicles protected by source-record hashes. The companion report contains exact cells and exclusion reasons. All successful jobs share one validated candidate. Failures are isolated; review successful jobs and failures before digest-checked apply. Repeat imports of unchanged sources are no-ops; conflicting sources require review.\n`;
await writeFile(resolve(out, "REPORT.md"), md);
console.log(
  JSON.stringify(
    jobs.map((j) => ({
      file: j.file,
      status: j.status,
      id: j.id,
      error: j.error,
    })),
  ),
);
if (jobs.every((j) => ["failed", "duplicate"].includes(j.status)))
  process.exitCode = 1;
