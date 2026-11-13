// Historical importer snapshots remain authoritative for their original cells.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
const digest = (value) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
const review = JSON.parse(
  readFileSync(
    new URL(
      "../docs/imports/toyota-2026-brochures-report.json",
      import.meta.url,
    ),
  ),
);
const gmReview = JSON.parse(
  readFileSync(
    new URL("../docs/imports/gm-seven-2026-2027-report.json", import.meta.url),
  ),
);
export function assertHistoricalVehicle(catalog, prior) {
  const current = catalog.vehicles.find((v) => v.id === prior.id);
  assert.ok(current, prior.id);
  if (digest(current) === prior.sha256) return;
  const replaced = gmReview.placeholderReplacements.find(
    (r) => r.id === prior.id,
  );
  if (replaced) {
    assert.equal(replaced.before.status, "awaiting-verification");
    assert.equal(
      replaced.before.trims.length,
      0,
      "Only an empty placeholder may use this replacement ledger",
    );
    assert.equal(
      digest(replaced.before),
      prior.sha256,
      "Historical baseline must match the archived empty placeholder",
    );
    assert.equal(
      digest(current),
      replaced.afterSha256,
      "Imported Chevrolet claims must match their reviewed candidate",
    );
    return;
  }
  const extension = review.models.find(
    (m) => m.id === prior.id && m.baselineFieldCount > 0,
  );
  if (!extension) return assert.equal(digest(current), prior.sha256, prior.id);
  assert.equal(
    review.baseVehicles.find((v) => v.id === prior.id)?.sha256,
    prior.sha256,
  );
  assert.equal(extension.baselineCells.length, extension.baselineFieldCount);
  assert.equal(
    new Set(extension.baselineCells.map((c) => `${c.configuration}:${c.field}`))
      .size,
    extension.baselineFieldCount,
  );
  for (const cell of extension.baselineCells) {
    const resolution = extension.resolvedFields.find(
      (r) => r.configuration === cell.configuration && r.field === cell.field,
    );
    if (resolution)
      assert.equal(
        cell.status,
        "unverified",
        "Only an old unknown may be resolved",
      );
    assert.equal(
      digest(
        current.trims.find((t) => t.id === cell.configuration)?.equipment[
          cell.field
        ],
      ),
      resolution ? digest(resolution.incoming) : cell.sha256,
      `${prior.id}/${cell.configuration}/${cell.field}`,
    );
  }
}
