# 2027 Chevrolet Equinox — standard equipment review

Reviewed November 6, 2026. Primary source: user-supplied **2027 Chevrolet Truck Equinox Export.xlsx**, preserved byte-for-byte under `sources/gm/`. All ten sheets are inventoried. Exact worksheet/cell citations accompany imported claims. The original source has no explicit publication/effective date; its file name and the user's request establish model/year, and the review date is not represented as a manufacturer publication date.

The first Chevrolet guide uses the existing model page, three trim cards and six configurations: LT FWD/AWD, RS FWD/AWD and ACTIV FWD/AWD. Optional equipment/packages, fleet-only options, dealer-installed accessories and order controls are excluded from the salesperson guide. No prior-year facts are carried forward.

| Trim  | Standard source equipment entries per drivetrain | Published standard fields per drivetrain |
| ----- | -----------------------------------------------: | ---------------------------------------: |
| LT    |                                               92 |                                       87 |
| RS    |                                              100 |                                       94 |
| ACTIV |                                              100 |                                       94 |

Source counts refer to deduplicated equipment entries. Published fields combine related equipment and add verified technical measurements; they are not the same count as individual physical features. FWD/AWD have equal counts but separate, correctly sourced specifications. All **70** standard-package member/configuration checks pass. No ambiguous equipment indicators were found in the supplied matrix. Ninety-four excluded worksheet rows/highlight entries include repeated source listings, not 94 unique features.

## Equipment verification

Convenience Package I content is standard on all six configurations, including remote start, heated front seats and a heated steering wheel. Convenience Package II content is standard on RS/ACTIV: power driver seat/lumbar, wireless phone charging, dual-zone climate, rain-sensing wipers, heated wiper park, hands-free power liftgate, humidity/windshield sensor, Universal Home Remote and sunglass holder. Individual child rows independently confirm these states. LT does not receive this optional package's contents as standard.

Convenience Package III and Safety and Technology Package are nonstandard. Ventilated seats, rear seat heating, surround vision, interior/connected cameras, camera mirror, fog lamps and sign recognition are not listed as standard features. Their optional availability is not presented. Not standard does not mean Not Offered. The enhanced braking/lane-keeping descriptions follow the workbook's explicit safety-assist replacement footnote and individual standard rows.

Standard wheels/tires are 17-inch Grazen Metallic/235/65R17 all-season for LT, 17-inch Dark Android/235/65R17 all-terrain for ACTIV, and 19-inch Carbon flash/235/55R19 all-season for RS. Optional wheel/tire upgrades are excluded.

## Verified specifications

- Engine: 1.5L turbo DOHC four-cylinder, SIDI/VVT. Eight-speed automatic on both FWD and AWD, independently confirmed by Mechanical and Engine Axles.
- Output: 175 hp and 203 lb-ft, supplemented from [Chevrolet's explicitly 2027 U.S. Equinox page](https://www.chevrolet.com/suvs/equinox), Performance & Capability section. Reviewed source snapshot hash and exact section locators are recorded in the supplemental manifest. The workbook alone does not supply these ratings.
- Body dimensions: 183.20-inch length, 74.90-inch body width, 65.60-inch height; 107.50-inch wheelbase. Track: 63.80 inches front / 63.90 rear.
- Standard-roof headroom: 40.00 inches front / 39.20 rear. Legroom: 40.90 / 39.90; shoulder room: 57.70 / 55.80; hip room: 54.20 / 51.70. Optional-sunroof measurements are excluded.
- Seating: five, from the explicit 2-front/3-rear capacity. Cargo: 29.8 cu ft behind row two; maximum 63.5 cu ft with row two folded.
- Approximate fuel tank: FWD 14.8 U.S. gallons; AWD 15.6. GVWR: 4,850 lb. Curb weight: LT 3,428/3,583 lb, ACTIV 3,452/3,607 lb, RS 3,474/3,629 lb, FWD/AWD respectively.

Imperial and metric quantities from the source remain available in the online details.

## Colors and year changes

Eight paint colors are retained with trim eligibility: Polar White Tricoat, Reef Blue Metallic, Summit White, Mosaic Black Metallic, Radiant Red Tintcoat, Autumn Harvest Metallic, Sterling Gray Metallic and Lakeshore Blue Metallic. Extra-cost paint markers are preserved as color reference information. Autumn Harvest is LT/ACTIV only; Summit White is LT only. Roof references include Mosaic Black Metallic and Summit White with their documented paint combinations.

Standard interiors are LT Black cloth, ACTIV Maple Sugar Sueded Microfiber, and RS Black with Red accents Evotex. Additional LT Black/Artemis Gray Evotex combinations remain color/material references, without changing LT's standard upholstery claim. Manufacturer color names are preserved; references do not claim current dealer inventory.

GM Highlights explicitly document new Autumn Harvest paint, eight-speed automatic for FWD, RS Torch Red-only stitching replacing the red/blue combination, and deletions of Cacti Green and CVT. The new connected/interior camera change is excluded because it belongs to a nonstandard package. No redesign or other trim change is invented.

## Missing and unresolved information

The workbook does not provide horsepower/torque, EPA fuel economy, ground clearance, passenger volume, tow ratings or MSRP. The reviewed Chevrolet page resolves horsepower/torque. Its model-wide properly-equipped **up to 1,500-lb** towing headline does not establish the configuration-specific limits, so per-configuration tow cells remain Unverified. No hitch installation or zero tow rating is inferred.

Fuel economy, ground clearance, passenger volume and configuration MSRP remain Unverified. Additional 2027 manufacturer technical/trailering documentation, configuration pricing and EPA ratings are needed. No AWD price increment or older-year measurement is guessed. Shared comparison categories not established by this export (such as steering-wheel covering, ambient lighting, head-up display, AC cargo outlet and automated parking) also remain unresolved rather than being called unavailable or standard.

## Delivery and reuse

The [machine-generated review](imports/gm-2027-equinox-REPORT.md), companion JSON, neutral extraction and archived workbook support review. All 20 existing vehicle records are protected by preservation hashes; Toyota, Volkswagen, Current Specials, styling and unrelated navigation are preserved. The only model-page additions are generic standard-only mode, cell citations, color references and manufacturer-Highlights support.

See [GM import instructions](../scripts/import/GM-XLSX.md) to add the next workbook or process a batch. Failures are isolated per file, duplicates are avoided, changed verified sources are flagged, and the existing candidate/digest-checked apply workflow validates before publication.

Chevrolet’s manufacturer view defaults to its latest verified model year (2027) and shows Chevrolet-specific coverage. The 2026 placeholder remains accessible through the unchanged year tabs; Toyota and Volkswagen defaults are preserved.

## Files added or modified

| Files                                                                                       | Purpose                                                                                                                        |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `data/catalog.json`                                                                         | Equinox records and Chevrolet-only coverage/default-year metadata                                                              |
| `app.js`, `lib.js`, `styles.css`                                                            | Scoped standard-only rendering, mechanical context, workbook citations, colors and panel containment; global glossary retained |
| `scripts/import/extract_gm_xlsx.py`, `gm-catalog.mjs`, `import-gm.mjs`                      | Neutral extraction, catalog mapping and independent batch review                                                               |
| `scripts/validate.mjs`                                                                      | Spreadsheet source/cell validation and standard-only states                                                                    |
| `scripts/import/requirements.txt`, `package.json`                                           | Pinned workbook dependency and import/test commands                                                                            |
| `sources/gm/2027 Chevrolet Truck Equinox Export.xlsx`                                       | Original workbook, unchanged                                                                                                   |
| `profiles/imports/gm-supplements/2027-equinox.json`                                         | Reviewed manufacturer output facts and source locators                                                                         |
| `imports/gm-2027-equinox/extracted.json`, `docs/imports/gm-2027-equinox-*`                  | Reproducible source stage and generated review reports                                                                         |
| `tests/gm-import.test.mjs`, `tests/import/test_extract_gm_xlsx.py`, `tests/browser.spec.js` | Equipment, specification, color, batch, malformed-input and browser coverage                                                   |
| `tests/model-years.test.mjs`                                                                | Keep the existing 2027 Volkswagen count assertion scoped to Volkswagen                                                         |
| `README.md`, `scripts/import/README.md`, `scripts/import/GM-XLSX.md`, this report           | Source review, limitations and reuse instructions                                                                              |

## Validation results

All 70 Node data/import/unit tests, 12 Python extraction tests and 47 Chromium browser tests pass. Coverage includes all three trim comparisons, shared-engine context in Differences Only, optional-equipment exclusion, standard-package children, FWD/AWD tank/weight selection, colors, accessibility, 320px/390px mobile layouts and one-page printing. Existing Toyota/VW guides and Current Specials pass their regression tests. Data validation, production build, formatting and diff checks also pass. Original-source hash, all 20 existing vehicle records, both other-brand records and the shared field definitions were independently checked for preservation.
