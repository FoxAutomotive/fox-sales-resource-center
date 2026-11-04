// One-command dry-run: PDF -> sanitized extraction -> validated candidate + review report.
import { readFile, readdir, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const args = process.argv.slice(2),
  option = (key, fallback) =>
    args.includes(key) ? args[args.indexOf(key) + 1] : fallback;
if (!args.includes("--pdf"))
  throw new Error(
    "Usage: npm run import:pdf -- --pdf /path/to/source.pdf [--profile reviewed-profile.json] [--out work/review] [--base data/catalog.json]",
  );
const pdf = resolve(option("--pdf"));
let profile = option("--profile");
if (!profile) {
  const sha = createHash("sha256")
    .update(await readFile(pdf))
    .digest("hex");
  const directory = resolve(root, "profiles/imports");
  const matches = [];
  for (const name of await readdir(directory))
    if (name.endsWith(".json")) {
      const path = resolve(directory, name);
      if (JSON.parse(await readFile(path, "utf8")).sha256 === sha)
        matches.push(path);
    }
  if (matches.length !== 1)
    throw new Error(
      "No unique reviewed profile for this PDF. Create/review a manufacturer layout profile; no data was imported.",
    );
  profile = matches[0];
}
const out = resolve(option("--out", resolve(root, "work/import-review")));
await mkdir(out, { recursive: true });
const stage = resolve(out, "extracted.json");
execFileSync(
  option("--python", "python"),
  [
    resolve(root, "scripts/import/extract_pdf.py"),
    "--pdf",
    pdf,
    "--profile",
    resolve(profile),
    "--out",
    stage,
  ],
  { stdio: "inherit" },
);
execFileSync(
  process.execPath,
  [
    resolve(root, "scripts/import/catalog-import.mjs"),
    "--stage",
    stage,
    "--base",
    resolve(option("--base", resolve(root, "data/catalog.json"))),
    "--features",
    resolve(option("--features", resolve(root, "data/features.json"))),
    "--out",
    out,
  ],
  { stdio: "inherit" },
);
console.log(
  "Dry-run complete. Review REPORT.md, report.json and catalog.candidate.json; nothing was published or applied.",
);
