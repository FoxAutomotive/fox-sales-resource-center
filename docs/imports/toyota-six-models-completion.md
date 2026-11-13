# Six-model Toyota Product Guide expansion

Imports the six requested guides using the supplied model-year-specific Toyota PDFs. This is a data/importer expansion: application markup, styles, navigation, dialogs, manufacturer filters and Specials data are unchanged. No merge or deployment is authorized or performed.

| Model                               | Year | Trim families | Configurations | Equipment rows | PDF pages |
| ----------------------------------- | ---: | ------------: | -------------: | -------------: | --------: |
| Land Cruiser                        | 2027 |             2 |              2 |             84 |        24 |
| Prius                               | 2027 |             4 |              8 |             85 |        28 |
| Prius Plug-in Hybrid                | 2027 |             4 |              4 |             89 |        27 |
| Corolla (gasoline and hybrid)       | 2026 |             6 |              8 |             89 |        24 |
| Corolla Cross (gasoline and hybrid) | 2026 |             6 |              9 |             94 |        27 |
| Highlander (gasoline and hybrid)    | 2026 |             7 |              7 |            119 |        28 |
| **Total**                           |      |        **29** |         **38** |        **560** |   **158** |

## Existing records and preservation

The initial catalog had no records for these six model/year identities. All six are new records; no duplicate guides or trim/configuration identities are created. All 24 pre-existing vehicle records retain their exact semantic SHA-256 values in the [preservation report](toyota-six-models-report.json). Existing Toyota (including Sienna), Volkswagen, Chevrolet, equipment explanations, training resources and Specials data are unchanged. The extra supplied Sienna PDF is outside this six-model import; its guide already exists.

The existing review-first Toyota extractor/import/apply workflow is reused. Each PDF has a reviewed SHA-256/layout profile, per-column header/geometry checks, matrix row counts, continuous disclosure checks, exact narrative quote selectors and a semantic content fingerprint. Archived stages retain original S/A/blank cells, footnotes, page/row positions, all-page text hashes, palettes and disclosure text. Source records record manufacturer/model/year, original file name/hash/page count, import date (2026-11-13), and claim-specific PDF pages/sections. Manufacturer URLs are model references, not purported hosted copies of the attachments.

Optional/available/package features are retained in source/audit data and excluded from standard equipment. The only A-to-standard selection is a manufacturer-listed drivetrain/transmission explicitly selected as the configuration identity. Missing cells do not establish absence. Existing automatic Why Upgrade paths use verified standard-equipment differences and matching mechanical configurations; no generic marketing upgrade text is added.

## Mechanical coverage

- **Land Cruiser:** 1958 and Land Cruiser, both i-FORCE MAX/full-time 4WD/8AT; 326 net combined hp and source-quoted 465 lb.-ft.
- **Prius:** LE, XLE, Nightshade and Limited in FWD/AWD. Toyota's matrix separately establishes 194-hp FWD and 196-hp AWD system output; the combustion engine's 150 hp is never substituted for system output.
- **Prius Plug-in Hybrid:** SE, XSE, Nightshade and XSE Premium; FWD/ECVT, 220-hp system output. Source-quoted EPA electric range is up to 44 miles for SE and 39 miles for other trims. Standard-outlet/Level 2 capability is documented; no charging time, charging rate, usable battery capacity or DC support is inferred.
- **Corolla:** LE/SE/XSE gasoline FWD, Hybrid LE/SE FWD or AWD, Hybrid XLE FWD. No unsupported Hybrid XLE AWD is created. Gas engine output is 169 hp; the hybrid engine component's 96 hp is not a combined-system rating.
- **Corolla Cross:** L/LE/XLE gasoline FWD or AWD; Hybrid S/SE/XSE AWD. Gas engine output is 169 hp. Hybrid engine component output is not treated as system horsepower. EPA and _projected_ EPA estimates retain their respective manufacturer rating bases.
- **Highlander:** XLE/XSE/Limited/Platinum gasoline AWD and Hybrid XLE/Limited/Platinum electronic AWD. Gas XLE uses conventional AWD; other gasoline grades use torque-vectoring AWD. Gas engine output is 265 hp/310 lb.-ft. Standard seven-seat layouts and optional eight-seat layouts remain separate equipment states, without duplicating trim records for optional seats.

## Source inconsistencies and unavailable information

- **Prius Plug-in Hybrid SE economy:** p. 6 says 51 combined MPG; p. 23 disclosure 8 says 53 city/51 highway/52 combined gas-only MPG. The conflicting SE gas-economy field remains unavailable; both source statements are retained. Other trims' p. 23 gas-only MPG/MPGe and all trims' electric range are independently scoped.
- **Land Cruiser upholstery:** p. 3 narrative calls the upper trim leather-trimmed; p. 14 grades/p. 17 matrix establish SofTex standard and leather available. Both conflicting upper-trim upholstery rows are held. No leather package becomes standard equipment.
- **Highlander hybrid mechanical text:** p. 23 visibly truncates the hybrid engine description after “intelligent” and the motor description after “two front”. These incomplete rows are held rather than completed from another year/model. Combined-system hybrid horsepower is absent.
- **Corolla Cross gasoline AWD suspension:** the torsion-beam row is S and multi-link rear row A without a drivetrain assignment. Both rear-suspension claims are held for gas AWD configurations; FWD and hybrid facts remain independently scoped.
- **Prius Plug-in Hybrid Nightshade:** both a trim-specific gray-stitching seat row and generic SofTex seat row are marked S. The specific row is retained and the generic row held.
- Corolla/Corolla Cross hybrid combined-system horsepower is not stated. Unsupported dimensions, cargo/passenger measurements, fuel tank capacity, configuration-specific towing ratings, MSRP and other measurements remain unavailable. Advertised towing maxima are documented in guide notes with their scope; they are not copied to every configuration.
- Exterior and interior palettes are source-backed model-level references. Trim/color combinations remain unavailable. No explicit model-year change statements were verified, so no inferred What's New entries are added, including for 2027.

The [review report](toyota-six-models-REPORT.md) lists missing fields per model; the [machine report](toyota-six-models-report.json) includes configuration-level gaps, held claims and preservation hashes.

## Reproduce and validate

Use the [existing workflow](../../scripts/import/TOYOTA-BROCHURES.md). Pass all six original PDFs with repeated `--pdf`, or all six archived stage files under `imports/toyota-six-models/` with repeated `--stage`, to `npm run import:toyota`. The command remains a dry run. The candidate was reviewed and locally applied with the existing digest/base guard. Importing the six original PDFs against the pre-change catalog reproduces the final catalog; unchanged reimports are idempotent.

Adapter extensions recognize these brochures' CVT, engine, torque-vectoring AWD and system-output wording, select hybrid system horsepower without substituting combustion-engine horsepower, keep PHEV charging gaps distinct from HEV not-applicable states, and use the actual model year in source labels. A scoped hold rule can distinguish drivetrain applicability. The existing VW reimport preserves an already-present coverage note and its appended Toyota coverage instead of erasing the latter.

Tests extend the existing desktop/mobile equipment/specification loops to all 38 new configurations, palette/source checks to all six guides, all-guide layout/print checks, and HEV/PHEV/gasoline comparisons. New data regressions verify standard-only matrix claims, source fingerprints, original-record hashes, drivetrain eligibility, horsepower/range isolation, optional equipment and unresolved source conflicts. Search expectations include the new guides. Specials clock tests freeze their initial clock before page loading so catalog load time cannot cross the one-second-to-midnight boundary; production Specials code/data are unchanged.

## Validation results

- All six actual PDF extractions reproduce the final catalog in the declared import order against the pre-change baseline; unchanged reimports are idempotent.
- 104 Node data/importer/presentation/resource/Specials tests pass.
- 16 Python extractor tests pass.
- 56 Playwright browser tests pass using `/usr/bin/chromium`, including desktop/mobile equipment and specification checks for all 38 new configurations, comparisons, scoped palettes/sources, accessibility, responsive layouts, one-page model print guides, existing resources and Specials expiration.
- Catalog/glossary validation and production static build pass.
- `git diff --check` passes. No production application UI/style files, Specials records, existing vehicle records, merge or deployment configuration are changed.
