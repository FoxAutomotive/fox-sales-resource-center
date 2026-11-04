# Maintaining the vehicle library

## Research a model year before entering claims

Use official U.S. manufacturer brochures, specification PDFs, equipment matrices, and model-year releases. For fuel economy and emissions, official EPA/FuelEconomy.gov records are also supported; match the exact vehicle/powertrain/drivetrain and rating basis before citing a value. Record the exact model year and the date you actually reviewed the material. Prefer stable year-specific document links over live model pages, which may change to the next year. Keep a note of document title, revision, relevant page/table, and any production or drivetrain caveat in the source title or the vehicle notes.

Unreviewed source links remain **research targets only**. The RAV4 guide now also records a reviewed, user-supplied brochure; see [its source audit](2026-RAV4-SOURCES.md). At implementation time the environment’s outbound policy denied access to manufacturer sites, so none of the three requested initial guides was represented as verified. See [research status](RESEARCH.md).

For each reviewed guide:

1. Confirm model name, year, U.S. retail availability, trim structure, and configurations. Treat different powertrains/drivetrains as separate configurations when equipment depends on them.
2. Add reviewed source records. Each needs a unique ID, official HTTPS URL, descriptive title, `kind: "verified"`, `modelYear`, and actual `checkedAt` date (`YYYY-MM-DD`). Retain unresolved sources as `research-target` with `checkedAt: null`.
3. Add trim/configuration records with source IDs for their identity. IDs must be unique within a model. Use `configuration` to distinguish drivetrain and powertrain variants; repeat the trim name if needed, but use distinct IDs.
4. Populate each equipment field from evidence, with one of the four states. An omitted field renders as Unverified. Do not use `unavailable` for a missing source or an empty brochure cell unless the document’s legend establishes that meaning.
5. Attach `sourceIds` to every confirmed equipment cell. Include both a readable `value` and any `conditions`. Optional equipment requires conditions describing the package or other availability requirements. Use `featureIds` to associate a cell with a general glossary term for search.
6. Add factory packages with their source IDs, included equipment description, eligible `trimIds`, and conditions. Add upgrade gains only when both trims and the differences are verified for the same year/configuration.
7. Set the guide’s `status: "verified"` and `verifiedAt` only after reviewing its trim identity. A verified guide can still have individual unverified cells; these stay labeled. Known-versus-unverified cells count as differences in verification, not proof of a physical equipment difference.
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

Only eligible, source-verified configurations appear in the comparison pickers. Model guides and cross-model comparisons accept two to four configurations and default to **Trim Differences**. The model picker initially chooses two different trim names with matching configuration labels where possible; users can change that selection. **All Equipment** restores every equipment field, including shared unknowns.

Rows are identical only when availability status, equipment value, conditions, technology references and displayed package contents match across every selected configuration. Source IDs, dates and citation pages do not create equipment differences. All-Unverified rows are identical and hidden in What Changes; Standard/Optional/Unavailable versus Unverified rows remain visible with an explanation that this is a verification difference. No unknown is relabeled as Unavailable. The default view has two visible sections. **Base Equipment** shows unchanged, verified Standard cells from the identified baseline only; it never includes optional, unavailable or unverified cells. **What Changes** shows differing equipment/statuses with all selected configurations, marking the baseline column. Changed core specifications belong only in What Changes, preserving their baseline values without duplicating equipment between the sections. Category filters apply to both equipment sections. **All Equipment** is a separate, complete table.

The baseline is recalculated from the current selection, not click order. Within one model/year, verified source-authored upgrade relationships (including intermediate unselected grades) establish the lowest selected grade when possible. Catalog trim order breaks configuration ties. Unrelated or cyclic/unverified upgrade orderings fall back to the existing catalog order with a visible explanation; no MSRP or equipment-count rank is inferred. Cross-model/year comparisons use a stable catalog-order reference and explicitly state that those vehicles have no common trim hierarchy. No equipment inheritance is inferred: each displayed cell passes its own evidence check.

Packages and listed options use the same availability/content filtering in their own section, which retains context when an equipment category is selected. Same-name listings can be compared across models; eligibility, descriptions, restrictions, source labels and unknown contents remain visible. An absent source-verified listing becomes Unverified, not Unavailable. Name-only package verification never becomes an invented contents list.

**Why Upgrade?** shows the first existing verified gain for source-authored upgrade edges only when both selected trims belong to the same model/year and have matching configuration labels. Reversed selection order is supported; no upgrade is synthesized for arbitrary trims, different powertrain/drivetrain contexts, model years or manufacturers. Full upgrade details remain in the unchanged model guide. These rules are generic across brands and model years; they do not populate missing 2027 data.

Comparison selection and view controls do not change stored data or the full-model print reference. Print rendering explicitly requests all equipment and still uses all of the model’s configurations.

## Glossary

`data/features.json` stores general explanations: name, brand, category, summary, how it works, customer value, limitations, official reference URL, and review date. `verifiedAt: null` displays an editorial-review-pending label. Confirm and qualify every explanation against official documentation before marking reviewed. A general glossary entry never establishes equipment availability on any vehicle.

## Artwork, printing, and deployment

See [artwork instructions](../assets/README.md) and [publishing instructions](../README.md#publish-to-github-pages). Quick references derive from the same records as the screen. Shared powertrain equipment is retained in print; comparison controls do not change printed data. Pending guides print a prominent warning rather than an empty specification grid. Keep source URLs and window-sticker reminders in every print sheet.

Every claim is publicly visible. Review changes in a pull request and avoid unapproved incentives or confidential information. The included deployment workflow is manual; ordinary pushes only run checks.

## Brochure-sourced options and compact quick references

Equipment cells may include `sourcePages`, a map from source ID to page ranges. A user-supplied PDF source records `delivery: "user-upload"`, filename, SHA-256 and page count; its manufacturer reference link is not represented as a successful download URL.

A package with verified name/grade listing but unknown contents uses `contentsStatus: "unverified"` and `eligibilityScope: "grade"`. Do not invent an itemized `contents` array or infer bundles from package names. `optionalEquipment` stores separately confirmed available features with conditions, source IDs and eligible grade/configuration references. Available does not mean installed.

`quickReference` stores configuration groups, field IDs, representative powertrain configuration IDs and sourced caveats. It does not duplicate equipment specifications. The print renderer reads the live cells, resolves unknowns, groups towing ratings, lists package contents status and retains provenance. Validation requires each configuration to appear exactly once in the print groups. Review the PDF whenever the content grows: one-page output must remain readable and must not be forced by clipping or hiding facts. HEV and PHEV records and print sheets remain separate.
