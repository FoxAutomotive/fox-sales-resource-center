# GM Fleet Order Guide Excel imports

This adapter reads values-only GM workbook exports and produces the same catalog candidate/review files as the existing PDF workflow. It imports **retail factory-standard equipment**. It does not publish or change the site directly.

## Run one file or a batch

```sh
python -m pip install -r scripts/import/requirements.txt
npm run import:gm -- --xlsx "sources/gm/2027 Chevrolet Truck Equinox Export.xlsx" --out work/gm-review
npm run import:gm -- --xlsx "/path/to/first export.xlsx" "/path/to/second export.xlsx" --out work/gm-batch
```

Each path after `--xlsx` and before the next flag is processed independently. An unreadable/unsupported file becomes a failed job; later files continue. Exact duplicate model-year/model inputs are skipped. Conflicting duplicate sources are flagged. Previously imported identical workbook/supplement hashes are no-ops, not duplicate vehicle records. A changed source for an existing verified model requires conflict review rather than silent replacement.

The source identity comes from the original filename convention: `<year> Chevrolet [Truck or Car] <model> Export.xlsx`. The manufacturer/model/year must be checked in the report. Codes such as `1PT26` are GM body/model codes and **are not interpreted as a 2026 model year**. Unknown filename/layout conventions fail rather than invent identity. Preserve the original filename when archiving or importing. No year is inferred from the computer clock.

`--base`, `--features`, `--out`, `--python`, and `--reviewed-at` support isolated review and repeatable checks. Supplemental manufacturer facts, when independently reviewed, live in `profiles/imports/gm-supplements/<year>-<model-slug>.json`. They are explicitly scoped to one model/year and source; the importer does not fetch or reuse prior-year facts automatically.

## Review, preserve, apply

Each job folder contains a copy of the original workbook and a neutral `extracted.json`, including raw indicators, full descriptions/footnotes and worksheet/cell addresses. The batch writes `catalog.candidate.json`, `report.json`, and `REPORT.md`. Review successful jobs, exclusions, conflicts and missing information before applying a partial-success batch.

Archive accepted originals under `sources/gm/` using their original filenames. The supplied Equinox workbook is preserved byte-for-byte there. Neither that directory nor import scratch files are included in the static website build. The catalog records the archive path, file hash and full sheet inventory.

```sh
sha256sum work/gm-review/catalog.candidate.json
npm run import:apply -- --review-dir work/gm-review --expected-sha256 REVIEWED_DIGEST --catalog data/catalog.json --features data/features.json
npx prettier --write data/catalog.json
npm run validate
npm test
npm run test:extractor
npm run test:browser
npm run build
npm run format:check
```

Local apply uses the existing digest/base checks and revalidates the candidate. It never merges, deploys or publishes. Commit the accepted source, neutral extraction and review report with the catalog change.

## Interpretation rules

- Header alignment is checked across the equipment worksheets. FWD/AWD comes from explicit standard drive rows in Mechanical, cross-checked with Engine Axles; no trim or drivetrain inheritance is used.
- `S` and numbered `S` are standard. Filled/open equipment-group squares mean included/default equipment, with original symbols retained. `A`, `A/D`, `D` and explicit dashes establish **not standard**, without implying that all of those states mean unavailable. Unknown/blank/conflicting cells are flagged.
- Duplicate codes/descriptions across worksheets are consolidated. Conflicting standard indicators become Unverified; a preferred worksheet does not silently win. Source rows grouped in a shared category retain all supporting addresses.
- Explicit contents of a **standard** package are retained. Direct child rows are checked independently; missing child rows can be represented from explicit standard-package contents. Contradictory parent/child indicators require review. Optional-package contents are never promoted to standard.
- Dealer-installed LPO items, non-retail/fleet-only entries, optional packages, administrative order controls and ordering footnotes are excluded from the salesperson equipment display. Raw source descriptions remain in the review extraction.
- `equipmentScope: standard-only` is model-scoped. Its supported `not-standard` cell state is different from Not Offered and Unverified. Only standard facts and genuine technical gaps appear in equipment details. Comparisons involving these guides project optional availability to Not standard and omit package/option tables. Existing Toyota/VW-only views keep their previous availability states.
- Differences Only retains the model's verified core mechanical context in the existing comparison table. It does not add a Base Equipment section.
- Dimensions preserve the worksheet's trim/drive scope. Optional-sunroof measurements are not used for the standard roof. Tank size and curb weight are selected independently for FWD/AWD. Unknown EPA ratings, tow limits or dimensions stay unknown.
- Color references are the stated exception to standard-only equipment: all verified available paint/interior combinations remain visible, with standard interiors labeled separately from additional material/color references. Roof colors show supported paint combinations; no GM ordering codes are displayed.
- What's New uses the manufacturer's Highlights, without inventing a prior-year comparison. Changes concerning optional-only hardware are excluded, while color changes remain eligible. No Toyota/VW model-year record is modified.

## Scope of reuse

Batch processing is ready for exports in this reviewed GM sheet/header family. The mapping is based on GM descriptions, not Equinox-specific application code or hardcoded trim arrays. Different GM layouts, transmission matrices, manufacturer symbols or filename conventions need a reviewed adapter extension; unsupported layouts fail independently in a batch. There is no administration UI or incentive integration.
