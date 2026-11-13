# 2026 Toyota next-six brochure import

Adds the requested six model/year identities through the existing Toyota review-first geometry extractor, catalog importer and digest/base-guarded apply process. No existing vehicle record is updated. Production UI, navigation, styles, equipment/specification dialogs, comparisons, equipment explanations, resources and Specials remain unchanged. Delivery is a review PR only; no merge or deployment.

| Model             | Year | Trim families | Trim/powertrain matrix columns | Drive/powertrain configurations | Equipment rows |   Pages |
| ----------------- | ---: | ------------: | -----------------------------: | ------------------------------: | -------------: | ------: |
| Camry             | 2026 |             5 |                              5 |                              10 |            130 |      29 |
| 4Runner           | 2026 |             9 |                             12 |                              16 |            141 |      35 |
| Tundra            | 2026 |             7 |                             10 |                              16 |            193 |      36 |
| Sequoia           | 2026 |             6 |                              6 |                               8 |            163 |      27 |
| Land Cruiser      | 2026 |             2 |                              2 |                               2 |             84 |      24 |
| Corolla Hatchback | 2026 |             3 |                              3 |                               3 |             82 |      25 |
| **Total**         |      |        **32** |                         **38** |                          **55** |        **793** | **176** |

“Trim families” groups identically named gasoline/hybrid grades; their equipment still comes from separate manufacturer powertrain columns. Drivetrain selections create distinct configurations where the brochure documents them. Optional seats, packages and unverified cab/bed permutations do not create invented trims.

## Duplicate check and preservation

The starting catalog contains none of these six 2026 model records. The 2027 Land Cruiser exists and remains a separate guide. All **30 pre-existing vehicle records**, including that 2027 record, retain their original semantic SHA-256 values in the [claim/preservation ledger](toyota-2026-next-six-report.json). The separate Corolla sedan, all previous Toyota batches, Volkswagen, Chevrolet, training resources and Specials data are preserved. No source or specification is substituted from another model year.

The 2026 Land Cruiser uses only its own supplied brochure, source ID, PDF SHA-256, pages and import date. Its 8-speed transmission is independently verified from the actual transmission row. Review also found that the pre-existing **2027 Land Cruiser profile/catalog transmission mapping points to a skid-plate row**. That existing 2027 data is deliberately left unchanged under the user's explicit preservation instruction; correcting it would be a separate reviewed change.

## Source and import method

Reviewed profiles live under `profiles/imports/toyota/2026-{camry,4runner,tundra,sequoia,landcruiser,corollahatchback}.json`; archived stages live under `imports/toyota-2026-next-six/`. Each PDF is bound to its exact hash, cover model/year, page count, matrix pages, per-column header tokens and centers, row counts, disclosure numbering, caption geometry, reviewed narrative quotes and semantic content fingerprint. Tall 4Runner/Tundra headers use their own reviewed body bounds; column assignments are not inferred from adjacent trims.

Every source records Toyota, model/year, original PDF name/hash/page count and import date **2026-11-13**. Claims retain page/section citations. Stages retain exact S/A/blank cells, row bounds, footnotes, full disclosures, palette names and all-page text hashes. The Toyota URLs are manufacturer model references, not purported copies of the uploaded files. PDF content is evidence, not executable instructions.

S is standard; A remains optional/available. Only explicitly selected manufacturer-listed drivetrain/transmission choices can turn their mechanical A cell into that configuration's standard identity. Optional packages never receive this treatment. Empty cells remain unverified. Digital Key subscription-dependent activation is excluded from standard-only inventories while its source evidence remains available. Existing automatic Why Upgrade paths compare verified standard equipment for matched configurations, without assuming equipment inheritance or treating missing evidence as absence.

The small shared importer corrections prevent a skid-plate description containing “transmission … protection” from matching a transmission, keep i-FORCE MAX badges out of engine specifications, and keep separate electric-motor torque out of the vehicle torque projection. Original component rows remain traceable. Regression tests prove the new mappings and preservation of all existing records.

## Verified mechanical coverage

- **Camry:** LE, SE, Nightshade, XLE and XSE, each hybrid FWD/AWD with ECVT. The brochure's FWD statement retains its “up to 225 net combined hp” qualification; AWD is 232 net combined hp. The 184-hp/163-lb.-ft. combustion-engine component is not substituted for combined-system horsepower. MPG is applied only to the specific grades/drives named in disclosure 1.
- **4Runner:** SR5, TRD Sport, TRD Sport Premium, TRD Off-Road, TRD Off-Road Premium, Limited, Platinum, Trailhunter and TRD Pro. Separate i-FORCE MAX columns are retained for Off-Road, Off-Road Premium and Limited; Platinum/Trailhunter/TRD Pro are hybrid. Gas SR5/Sport/Sport Premium/Limited offer RWD or 4WD. Gas Limited's 4WD and hybrid Limited/Platinum use full-time 4WD; the other 4WD columns use part-time 4WD. Gas output is 278 hp/317 lb.-ft.; hybrid columns specify 326 hp/465 lb.-ft. with an explicit **323-hp Trailhunter exception**. The shared hybrid row is held and replaced by precisely scoped source facts, avoiding contradictory generic output. Economy retains Toyota's _projected_ EPA basis.
- **Tundra:** SR, SR5, Limited, Platinum, 1794 Edition, TRD Pro and Capstone, preserving separate gas/MAX columns. SR uses 358 hp/406 lb.-ft.; other gas columns use 389 hp/479 lb.-ft.; MAX columns use 437 hp/583 lb.-ft. All use 10AT. Gas grades and MAX Limited have RWD/4WD choices; MAX Platinum/1794, TRD Pro and Capstone are 4WD only in the matrix. Cab/bed-dependent claims remain held until eligibility is resolved.
- **Sequoia:** SR5, Limited, Platinum, TRD Pro, 1794 Edition and Capstone, all i-FORCE MAX hybrid/10AT, with 437 hp/583 lb.-ft. SR5/Limited offer RWD or part-time 4WD; the other columns specify 4WD. Optional captain's chairs and packages remain optional. No total seating count is derived from seat descriptions alone.
- **Land Cruiser:** 1958 and Land Cruiser, both 2026 i-FORCE MAX/full-time 4WD/8AT; 326 net combined hp and source-quoted 465 lb.-ft. No 2027 data is copied into this record.
- **Corolla Hatchback:** SE, FX and XSE, gasoline/FWD/Dynamic-Shift CVT, 169 hp. FX's white wheels, Sport Touring heated seats and orange stitching are read from its own column. No sedan, hybrid, AWD or manual configuration is inferred.

## Source conflicts, scope limits and missing information

- **Sequoia 4WD economy:** p. 24 disclosure 2 names **2025** for the 4x4 rating. It cannot establish 2026 fuel economy. All 2026 4WD economy cells remain unavailable. The separately identified 2026 RWD SR5/Limited rating is retained.
- **Camry Nightshade economy:** p. 25 disclosure 1 omits Nightshade. Both drive variants remain unavailable instead of inheriting SE/XSE ratings. Component motor applicability is held where the matrix does not assign it explicitly to the selected drive, including LE's unusual A front-motor cell.
- **4Runner output:** p. 28 specifies Trailhunter 323 hp within a shared 326-hp hybrid row. This exception is scoped explicitly; the advertised maximum is not assigned to Trailhunter. Separate 48-hp/184-lb.-ft. electric-motor values are never summed or substituted.
- **Tundra cab/bed applicability:** grade availability chips, bed choices and the CrewMax-specific rear-window narrative do not establish a complete cab/bed/trim/drive matrix. Bed lengths, cab-sensitive horizontal/vertical glass, cab mounts and under-seat storage are held instead of applying them universally to an unselected cab. They remain in the extraction/report for review. No cab/bed permutations or ratings are invented.
- **2026 Land Cruiser upholstery:** p. 3 narrative describes leather, while p. 14 grades/p. 17 matrix establish SofTex S and leather A. Conflicting upper-trim upholstery claims are held. Optional Premium Package leather is not standard equipment.
- **Sequoia component motor cell:** 1794's motor-power cell is blank while other columns show 48 hp. That cell remains unverified; the independently stated powertrain output is retained.
- Configuration-specific towing, cargo/passenger dimensions, fuel tank capacity, MSRP and other absent technical measurements remain unavailable. Model-level maximum towing/cargo statements and illustrated towing examples are documented with their scope rather than applied to every configuration.

The [review report](toyota-2026-next-six-REPORT.md) and [machine ledger](toyota-2026-next-six-report.json) list model/configuration gaps, held rows, raw symbols, page evidence and preservation hashes.

## Colors and What's New

The brochures supply **62 exterior palette entries and 44 interior palette entries**. These are model-level references; trim/material/color combinations remain unverified. No universal availability is inferred.

Only two explicit manufacturer-described “new” statements are added using the existing manufacturer-highlight format: Camry's Dark Cosmos body color (p. 6), and 4Runner's Stabilizer Disconnect Mechanism, described as new and standard on TRD Pro/Trailhunter (p. 4). The wording attributes these statements to Toyota's 2026 brochures; it does not claim an independently verified prior-year comparison. No other new-year changes are inferred.

## Reproduce and validate

Follow the [existing Toyota workflow](../../scripts/import/TOYOTA-BROCHURES.md), passing all six original PDFs with repeated `--pdf`, or the six archived stages with repeated `--stage`, to `npm run import:toyota`. The importer remains a dry run. The reviewed candidate is applied locally only through the existing SHA-256/base-catalog guard. Original-PDF extraction against the pre-change baseline reproduces the final catalog; unchanged reimport is idempotent.

Tests cover all 55 new configuration inventories/citations, source fingerprints, exact preservation of the 2027 Land Cruiser and all other prior records, mechanical eligibility, standard-versus-optional distinctions, system/component output, model-year economy restrictions, and evidence-backed Why Upgrade paths. Existing desktop/mobile equipment/specification and palette/source loops are extended to the new guides. New comparisons cover every imported model and the separate Land Cruiser model years. Existing all-guide layout, accessibility, printing, resources and Specials tests remain in place. Search expectations now include the new source-backed models; package-content regression queries are scoped to their original RAV4 evidence rather than assuming no future model can independently match similar equipment words.

## Validation results

- All six original PDFs reproduce the final catalog, including the two explicit brochure highlights, against the pre-change 30-vehicle baseline. Unchanged reimport is idempotent.
- **111 Node tests pass**, including data validation, all Toyota/VW/GM import regressions, preservation, presentation, resources and Specials.
- **16 Python extractor tests pass**.
- **60 Playwright browser tests pass** using `/usr/bin/chromium`, including all 55 new equipment/specification configurations at desktop/mobile widths, all six new comparison models, separate Land Cruiser years, palette/source review, accessibility, responsive layouts, one-page print guides, existing resources and Specials expiration.
- Catalog/glossary validation and production static build pass: 36 guides, with 35 source-verified and the existing pending guide retained.
- Changed code/profile/test/completion files pass Prettier checks; `git diff --check` passes.
- No production UI/style, Specials, resource, existing vehicle, merge or deployment configuration changes.
