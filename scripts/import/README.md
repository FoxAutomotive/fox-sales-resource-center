# Manufacturer PDF import workflow

The import pipeline is separate from the website. It reads a PDF, generates a price-safe extraction, maps it into the existing catalog, validates it, and writes a candidate plus a review report. **The default command never changes the production catalog or publishes anything.**

The first adapter supports the supplied Volkswagen MY26 CW41 guide dated October 9, 2025. It processes all 49 pages: revision/contents page, nine model sections, price/configuration tables, every equipment-table row, factory packages, paid paint options, optional services, market-delivery accessories, and color/interior reference tables. See [the completed review report](../../docs/imports/vw-my26-cw41-REPORT.md).

## Run a dry-run from a PDF

Use Python 3.12+ and Node 24, matching CI. Keep the original PDF outside the repository or inside ignored `work/`; it contains nonpublic financial columns and is never copied into the website or committed.

```sh
python -m venv work/import-venv
work/import-venv/bin/python -m pip install -r scripts/import/requirements.txt
npm ci
npm run import:pdf -- --pdf "/absolute/path/to/VW MY26 Price and Order Guide for CW41-2025.pdf" --python work/import-venv/bin/python --out work/vw-review
```

The wrapper selects exactly one reviewed profile by the PDF's SHA-256. Alternatively pass `--profile profiles/imports/vw-my26-cw41.json`. An unknown or changed PDF requires a new reviewed profile; it is not parsed with guessed coordinates. `--base` and `--features` can select isolated input files for research or tests.

Outputs:

- `extracted.json`: sanitized, presentation-independent source stage. Exact descriptions, symbols, row bounding boxes, pages, configurations, option codes, retail prices and restrictions remain traceable. No invoice values or full page text are emitted.
- `catalog.candidate.json`: proposed production catalog using existing `vehicles`, `trims`, `equipment`, `sources`, `packages` and model-local `additionalFields`.
- `REPORT.md`: readable coverage, all configurations/MSRP, missing fields, source discrepancies and exceptions.
- `report.json`: complete review detail, including existing-vs-incoming claims, ordering restrictions, unresolved cells, color/interior references, and preservation hashes.

For a repeat run using the already sanitized extraction, without needing the original PDF:

```sh
node scripts/import/catalog-import.mjs --stage imports/vw-my26-cw41/extracted.json --base data/catalog.json --features data/features.json --out work/vw-review
```

Reimporting an unchanged stage is idempotent: no duplicate vehicles, trims, packages, sources or repeated conditions. It does not refresh source review dates automatically.

## Review and apply locally

Inspect both the candidate and report. Confirm coverage, column alignment, source-specific exceptions, all missing fields and conflicts. A same-status wording difference is not automatically declared equivalent. Existing verified cells win by default; the new source row stays separately available for review. A real changed-status/numeric conflict is flagged rather than silently overwriting established data. Reviewers resolve discrepancies through an evidence-backed adapter/profile correction or a separately reviewed catalog correction.

After reviewing the exact candidate, obtain its SHA-256 and apply it locally:

```sh
sha256sum work/vw-review/catalog.candidate.json
npm run import:apply -- --review-dir work/vw-review --expected-sha256 REPLACE_WITH_REVIEWED_CANDIDATE_SHA256 --catalog data/catalog.json --features data/features.json
npx prettier --write data/catalog.json
npm run validate
npm test
npm run test:extractor
npm run test:browser
npm run build
npm run format:check
```

Apply rejects a changed candidate or a catalog changed since the dry-run. It validates again and replaces the local catalog atomically. It has no GitHub merge, push or deployment action. Open a pull request after testing; the existing deployment workflow stays manual.

## Extraction and verification rules

`extract_pdf.py` uses PyMuPDF word geometry and the PDF's actual cell rectangles. It does not split tables on arbitrary whitespace. The reviewed profile defines model/trim identity, page sections and column order; sales configurations, prices, descriptions, symbols and equipment values come from the PDF. Taos's seven configuration columns, Tiguan's drivetrain-qualified cells, GLI's manual/DSG columns and vertically grouped IQ.DRIVE members are handled explicitly. Profiles also pin the source hash, page count and each equipment table's row count. Missing pages, column drift and row-count changes fail closed.

- Filled/open circles become Standard/Optional; explicit dashes become Not Offered. Blank cells remain Unverified unless explicit applicability wording resolves them.
- FWD/4MOTION/automatic/manual and factory/MDO restrictions are retained independently for each actual sales configuration. An available market-delivery installation is Optional, with its delivery basis shown; it is not mislabeled factory Standard.
- Suite membership follows each configuration's own documented suite, including GLI's explicit manual exceptions; it is not trim-to-trim inheritance.
- Textual exceptions can qualify a symbol. Golf R roof and ventilation are explicitly standard but removed by POA; the optional symbol is retained in source metadata and the package deletion is shown in the conditions.
- Every confirmed cell has a source ID and page. Package descriptions include actual contents and restrictions. Paid services and MDO items are kept distinct from factory packages.
- `listedOptions` extends the optional-item structure with explicit positive/negative eligibility. The same equipment and comparison components display those states, avoiding invented Unverified cells for known package exclusions.
- ID.4 TBA prices remain Unverified with a TBA reason. An absent hitch never establishes a zero towing rating; missing horsepower, torque, MPG, dimensions, legroom or cargo measurements are not filled from another year.
- Existing Tiguan verified cells and source references are preserved. Unknown fields can be filled when an explicit new source row resolves them. Non-imported vehicles, including both RAV4 guides, remain unchanged.

The extractor limits monetary reads to retail column geometry. A second independent header/column audit checks that private-only currency values do not occur in the stage; it emits counts only. The current source excludes 74 distinct private-only currency values. The Node importer rejects non-retail financial fields. Tests verify retail selection next to a distinct cost value, rejection of a contaminated stage, and known source price examples. Do not commit the original PDF, screenshots of financial pages, or unsanitized extraction files. The static build copies only site code, `data/` and `assets/`, not import scratch files or the source attachment.

## Reuse for future model years or other manufacturers

1. Retain the new document privately and record its exact manufacturer/model year/date/hash and page count. Never let the current date imply a new model year or price effective date.
2. For the same VW table family, create a new profile defining the source identity, exact model/trim names, page sections, expected row counts and reviewed column layout. Most extraction/mapping code is reused. Verify new symbols and exceptions before enabling that profile.
3. For a different layout, add an extraction adapter that emits the same stage contract: source metadata, complete page inventory, model configurations, equipment rows with per-column symbols, coded options/eligibility, and page references. Toyota's S/A tables and Chevrolet ordering documents require their own layout/symbol rules; the current adapter does not claim to parse them automatically. Scanned PDFs need an OCR adapter and additional alignment review.
4. Map equivalent equipment into shared categories while preserving manufacturer's terminology and conditions. Keep a source-row field for every detailed claim that is not represented in a canonical summary.
5. Add representative layout/negative tests and a sanitized fixture. Run dry-run, inspect missing/conflicting fields, then apply the reviewed digest locally and prepare a PR.

The neutral mapping/merge/validation/report/apply stages and the website's presentation can be reused; document-specific extraction remains an explicit, reviewable boundary. This avoids manually coding each model and prevents a new PDF layout from silently corrupting existing vehicle data.

Source-specific rows use `comparisonScope: "model"`: they remain in the model’s full equipment and same-model trim views, but do not create duplicate cross-brand rows falsely showing another manufacturer as Unverified. Shared categories (including climate, front-seat adjustment, mirrors, keyless access, media, parking assistance and the primary requested features) carry cross-model comparisons. Model-specific technical measurements remain visible when genuinely comparable; missing measurement evidence stays Unverified.

## Reviewed 2027 Volkswagen edition

The same adapter now supports the retail-only **MY27 CW43-2026** edition: 41 pages, eight models, 38 configurations. See [the 2027 review](../../docs/imports/vw-my27-retail-cw43-REPORT.md). The profile is `profiles/imports/vw-my27-retail-cw43.json`; its SHA-256 selects it automatically.

```sh
npm run import:pdf -- --pdf "/absolute/path/to/VW MY27 RETAIL Price and Order Guide for CW43-2026 - with priced Golf family & Unpriced ACS.pdf" --out work/vw27-review
```

The reviewed profile supplies shifted price-column bounds and per-table option bounds. The extractor reads the actual PDF descriptions, retail amounts, symbols and restrictions; model data is not hand-coded in presentation files. Configuration and matrix-row counts remain pinned, with optional expected option counts for new profiles. Retail-only parsing is enabled explicitly by the profile; the older adjacent-invoice layout retains its safeguards. Engine cells spanning FWD/AWD rows and starred equipment-page footnotes are retained. AWD-only heating/wheel alternatives distinguish Not Offered from inapplicable powertrain rows. Production removal credits qualify equipment and remain nonorderable.

`yearReview` annotations in each reviewed model profile describe meaningful changes with page citations for **both** years and explicit open questions. They are evidence-reviewed editorial conclusions, not an automatic claim that a text diff or a missing listing proves removal. The mapper connects them to the existing prior-year vehicle without modifying that record or reusing its equipment. Validation requires a matching previous-year brand/model and verified sources with valid pages on both sides. The existing model page renders this optional section using existing styles; guides without annotations retain their original presentation.

For 2028, add a new document profile, verify column/symbol alignment and exceptions, and review model-year notes against both editions. Missing technical ratings stay unknown. Update the new year's coverage note only. Re-run the dry-run/review/digest-checked apply process above and all regression checks. No separate import system or year-specific page is needed.

The source identifies its release as **CW43-2026** and has a **9/28/26 cover-footer revision date**. That footer is recorded as `documentDate` with an explicit `dateBasis`; it is not presented as a guessed October publication date. Individual model footer revisions vary. The original attachment and rendered inspection pages are not committed or bundled in the static site.
