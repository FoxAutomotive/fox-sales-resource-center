// Explicit local apply after reviewing the exact candidate and report. Never publishes.
import { createHash } from "node:crypto";
import { readFile, writeFile, rename } from "node:fs/promises";
import { resolve } from "node:path";
import { validate } from "../validate.mjs";
const args = process.argv.slice(2);
const get = (key) => args[args.indexOf(key) + 1];
for (const key of [
  "--review-dir",
  "--expected-sha256",
  "--catalog",
  "--features",
])
  if (!args.includes(key)) throw new Error(`Missing ${key}`);
const review = resolve(get("--review-dir"));
const bytes = await readFile(resolve(review, "catalog.candidate.json"));
const digest = createHash("sha256").update(bytes).digest("hex");
if (digest !== get("--expected-sha256"))
  throw new Error(
    "Candidate changed since review; review the new candidate before applying",
  );
const report = JSON.parse(
  await readFile(resolve(review, "report.json"), "utf8"),
);
const current = JSON.parse(await readFile(get("--catalog"), "utf8"));
if (
  createHash("sha256").update(JSON.stringify(current)).digest("hex") !==
  report.baseSha256
)
  throw new Error(
    "Catalog changed since extraction; regenerate the candidate against the latest base",
  );
const candidate = JSON.parse(bytes),
  features = JSON.parse(await readFile(get("--features"), "utf8"));
const errors = validate(candidate, features);
if (errors.length) throw new Error(errors.join("\n"));
const temporary = get("--catalog") + ".import-tmp";
await writeFile(temporary, bytes);
await rename(temporary, get("--catalog"));
console.log(
  `Applied reviewed candidate ${digest} locally. No publication performed.`,
);
