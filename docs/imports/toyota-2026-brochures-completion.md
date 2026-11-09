# 2026 Toyota brochure batch — completion notes

This batch reads all 120 pages of the four supplied Toyota brochures, including 510 equipment-table rows and the disclosure/color pages. It adds Tacoma, Sienna and Grand Highlander to the existing Model Guide system and supplements the existing RAV4 HEV guide. No layout, navigation, Specials, Volkswagen/Chevrolet catalog records or existing importers are replaced.

| Guide                 | Reviewed trim/powertrain columns | Configurations | Standard records added | Specification cells added | Exterior / interior palette names |
| --------------------- | -------------------------------: | -------------: | ---------------------: | ------------------------: | --------------------------------: |
| 2026 Tacoma           |             11 (8 trim families) |             15 |                    874 |                        85 |                            12 / 9 |
| 2026 Sienna           |                                6 |             10 |                    991 |                        80 |                             8 / 6 |
| 2026 Grand Highlander |                               10 |             14 |                  1,433 |                       140 |                            8 / 10 |
| 2026 RAV4 HEV         |                                6 |     9 existing |                    862 |                        28 |                            12 / 7 |

Counts are configuration-specific catalog cells, including canonical summaries and full manufacturer source-row representations; specification cells are a subset of standard records. Interior counts are unique descriptions (Sienna repeats two identical palette captions). Palettes are model-level references, not a claim that every color/material is offered on every trim.

## Coverage and preservation

- **Tacoma:** SR, SR5, TRD PreRunner, TRD Sport, TRD Off-Road, Limited, Trailhunter and TRD Pro, with separate i-FORCE MAX columns where supplied. RWD/4WD and the expressly supported TRD Off-Road 6MT/8AT choices remain distinct. Trailhunter and TRD Pro use i-FORCE MAX, not the gasoline-only engine. SR/Sport manual eligibility and cab/bed combinations remain pending.
- **Sienna:** LE, XLE, XSE, Woodland Edition, Limited and Platinum. FWD/AWD are separate where documented; Woodland Edition and Platinum are AWD only. The 245-hp hybrid, ECVT and manufacturer-quoted EPA estimates are cited to their brochure statements.
- **Grand Highlander:** LE, XLE, Limited, Platinum, Hybrid LE, Hybrid XLE, Hybrid Limited, Hybrid Nightshade, Hybrid MAX Limited and Hybrid MAX Platinum. Gas, hybrid and MAX powertrains retain their own outputs, transmissions and supported drives. Model-level cargo/third-row legroom explicitly retain their rating scope.
- **RAV4:** The supplied file is byte-identical to the previously reviewed HEV brochure. Its source ID/date and all **297 pre-existing equipment cells** are preserved verbatim. Added full matrix rows, mechanical details, palette references and the explicit Toyota all-new styling statement retain their own pages. No separate PHEV facts are inferred or changed.

The [machine-readable report](toyota-2026-brochures-report.json) hashes the baseline catalog, original vehicle records and individual RAV4 cells. All 20 unrelated existing vehicle records, including the separate RAV4 PHEV, retain their original hashes. Historical VW/GM/audit reports remain historical snapshots; regression tests check their baseline through the Toyota preservation ledger rather than pretending a supplemented guide is still byte-identical.

## Information still requiring review

See the [generated review report](toyota-2026-brochures-REPORT.md), each profile's hold rules and the claim-level machine report for exact configurations, values, raw symbols and pages.

- **Tacoma:** The up-to-278-hp/317-lb-ft gas marketing maximum does not establish each trim/transmission output. SR/Sport 6MT drivetrain/cab eligibility, SR/SR5 cab-sensitive seats/suspension, bed/cab permutations and manual-versus-automatic TSS applicability need configuration-specific Toyota technical/order documentation.
- **Sienna:** Both 18- and 20-inch XSE wheels are marked standard without drivetrain assignment. XLE lists both seating layouts/LATCH counts as standard. Platinum contains a literal `sienna_ottoman` footnote placeholder. Those details remain held. Limited AWD's spare-tire/ottoman restriction is retained; footnote 68 also mentions a prior 25th Anniversary Edition, which is not imported as a 2026 trim. A corrected brochure or trim/configuration order guide is needed.
- **RAV4:** Unqualified front/rear motor output is marked standard even in FWD columns, so it is held. The merge logs **162 preserved wording/status/value discrepancies**, including shorter existing summaries versus longer incoming descriptions. These are review comparisons, not 162 adjudicated factual errors. No established record is silently replaced.
- **All four:** Trim-specific exterior/interior color combinations need an official eligibility matrix. Paid-activation Digital Key claims remain in the audit stage and excluded from standard-only equipment. Missing MSRP, towing ratings, dimensions, tank capacities and other unsupported measurements remain unresolved; model-level advertised maxima are not assigned to every configuration. Official specification sheets/pricing guides can fill these gaps later.

Only Toyota's explicit all-new RAV4 styling statement is added to What's New. No other year-over-year changes are invented. Existing equipment/specification/source dialogs, automatic Why Upgrade paths, colors and one-page print guides are reused. Narrow shared support handles unassigned palettes, Toyota manufacturer highlights and hybrid/mixed print headings; a named-system search guard prevents “super-long-slide” seats plus cruise control from falsely establishing GM Super Cruise.

## Repeatable workflow and files

[Batch instructions](../../scripts/import/TOYOTA-BROCHURES.md) document PDF/stage commands, review, the existing digest/base-guarded local apply step and adding future profiles. New adapter files are `extract_toyota_pdf.py`, `toyota-catalog.mjs` and `import-toyota.mjs`; reviewed geometry/configuration profiles live in `profiles/imports/toyota/`, with extracted stages in `imports/toyota-2026-brochures/`. Standard-only filtering stays in existing shared components. New PDFs require reviewed profiles, not model-specific page code.

The local candidate was applied only after review through the existing apply guard. The importer itself remains a dry run. Original supplied PDFs are identified by SHA-256/page count/file name; the manufacturer model URLs are provenance references, not purported hosted copies of the attachments.

## Validation

- All four actual PDFs reproduce the archived stages and candidate; unchanged reimports are idempotent.
- 16 Python extractor tests and 90 Node data/importer/presentation tests pass.
- All 42 browser tests pass, covering every imported Toyota equipment/specification configuration at desktop and mobile widths, standard-only inventories, focus/scroll restoration, colors, sources, upgrade paths, comparison, Specials and print behavior.
- All 24 model guides retain one-page landscape Letter print output. Validation and production build pass.

Delivery is a review pull request only. No merge or deployment is performed.
