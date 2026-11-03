# Maintaining the vehicle library

## Research a model year before entering claims

Use official U.S. manufacturer brochures, specification PDFs, equipment matrices, and model-year releases. Record the exact model year and the date you actually reviewed the material. Prefer stable year-specific document links over live model pages, which may change to the next year. Keep a note of document title, revision, relevant page/table, and any production or drivetrain caveat in the source title or the vehicle notes.

The initial source links are **research targets only**. At implementation time the environment’s outbound policy denied access to manufacturer sites, so none of the three requested initial guides was represented as verified. See [research status](RESEARCH.md).

For each reviewed guide:

1. Confirm model name, year, U.S. retail availability, trim structure, and configurations. Treat different powertrains/drivetrains as separate configurations when equipment depends on them.
2. Add reviewed source records. Each needs a unique ID, official HTTPS URL, descriptive title, `kind: "verified"`, `modelYear`, and actual `checkedAt` date (`YYYY-MM-DD`). Retain unresolved sources as `research-target` with `checkedAt: null`.
3. Add trim/configuration records with source IDs for their identity. IDs must be unique within a model. Use `configuration` to distinguish drivetrain and powertrain variants; repeat the trim name if needed, but use distinct IDs.
4. Populate each equipment field from evidence, with one of the four states. An omitted field renders as Unverified. Do not use `unavailable` for a missing source or an empty brochure cell unless the document’s legend establishes that meaning.
5. Attach `sourceIds` to every confirmed equipment cell. Include both a readable `value` and any `conditions`. Optional equipment requires conditions describing the package or other availability requirements. Use `featureIds` to associate a cell with a general glossary term for search.
6. Add factory packages with their source IDs, included equipment description, eligible `trimIds`, and conditions. Add upgrade gains only when both trims and the differences are verified for the same year/configuration.
7. Set the guide’s `status: "verified"` and `verifiedAt` only after reviewing its trim identity. A verified guide can still have individual unverified cells; these stay labeled and do not count as confirmed differences.
8. Run validation, tests, and build. Review the model page, search results, cross-brand comparison, source references, and print preview. Ensure the printed sheet stays readable on one landscape Letter page before publishing a populated model. Very large trim lineups may need concise wording or a dedicated follow-up print-layout improvement; never clip or silently drop claims to fit.

## Schema example (illustrative only, not real vehicle data)

This example demonstrates shape. Never copy these fictional values into production.

```json
{
  "id": "2026-brand-example",
  "brand": "toyota",
  "model": "EXAMPLE ONLY",
  "year": 2026,
  "category": "SUV",
  "summary": "A concise description without unsupported claims.",
  "status": "verified",
  "verifiedAt": "2026-11-03",
  "sources": [
    {
      "id": "equipment-document",
      "title": "Exact U.S. model-year equipment document, revision, relevant page",
      "url": "https://www.toyota.com/REPLACE-WITH-ACTUAL-DOCUMENT",
      "kind": "verified",
      "modelYear": 2026,
      "checkedAt": "2026-11-03"
    }
  ],
  "trims": [
    {
      "id": "example-awd",
      "name": "EXAMPLE TRIM",
      "configuration": "EXAMPLE AWD powertrain",
      "sourceIds": ["equipment-document"],
      "equipment": {
        "heatedSeats": {
          "status": "optional",
          "value": "EXAMPLE front-seat heating",
          "conditions": "EXAMPLE: requires a named factory package",
          "sourceIds": ["equipment-document"]
        },
        "assistance": { "status": "unverified" }
      }
    }
  ],
  "packages": [],
  "upgrades": [],
  "notes": ["Document revision and configuration caveats go here."]
}
```

Supported field IDs and categories are defined in `catalog.fields`. Adding a field there automatically adds it to model equipment tables and comparisons; assign one of the existing Performance, Exterior, Comfort, Technology, or Safety groups so it also appears in the print summary. Add a new manufacturer to `catalog.brands`, and add its approved mark to the map in `app.js` if needed. Add future years to `catalog.years` and `coverageNotes`; a year filter never manufactures model records.

Equipment state semantics:

| State       | Meaning                                                 | Evidence requirement                                     |
| ----------- | ------------------------------------------------------- | -------------------------------------------------------- |
| Standard    | Included on this exact configuration                    | Reviewed model-year source IDs                           |
| Optional    | Available for this configuration, subject to conditions | Reviewed source IDs plus package/availability conditions |
| Unavailable | Confirmed not offered                                   | Reviewed source IDs                                      |
| Unverified  | No confirmed information                                | No value or source claim; can also omit field            |

Package records: `{id, name, description, trimIds, conditions, sourceIds}`. Upgrade records: `{from, to, gains: [{text, sourceIds}]}`. `from` and `to` are exact trim names. Put drivetrain-dependent qualifications in each gain’s text; use separate guide comparisons if two same-name trim configurations make an upgrade ambiguous.

## Search and comparison behavior

Search is local and case insensitive. It combines manufacturer and year filters with all query terms. Model identity is searchable even for pending guides. Equipment, trim, and technology matches require a source-verified guide and trim; equipment must be Standard or Optional with reviewed evidence. All feature terms must match **one configuration**, preventing a result based on two incompatible trims. Optional matches do not imply the feature is installed—read the conditions and actual window sticker.

Only eligible, source-verified configurations appear in the comparison picker. It accepts two to four configurations. Differences-only mode hides shared rows and any row with an unverified cell. Show all equipment to expose those unknowns. A blank comparison never implies equivalence. Package and drivetrain conditions remain visible with the relevant cell. Cross-brand comparisons use these same rules.

## Glossary

`data/features.json` stores general explanations: name, brand, category, summary, how it works, customer value, limitations, official reference URL, and review date. `verifiedAt: null` displays an editorial-review-pending label. Confirm and qualify every explanation against official documentation before marking reviewed. A general glossary entry never establishes equipment availability on any vehicle.

## Artwork, printing, and deployment

See [artwork instructions](../assets/README.md) and [publishing instructions](../README.md#publish-to-github-pages). Quick references derive from the same records as the screen. Shared powertrain equipment is retained in print; comparison controls do not change printed data. Pending guides print a prominent warning rather than an empty specification grid. Keep source URLs and window-sticker reminders in every print sheet.

Every claim is publicly visible. Review changes in a pull request and avoid unapproved incentives or confidential information. The included deployment workflow is manual; ordinary pushes only run checks.
