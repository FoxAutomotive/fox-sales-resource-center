# Toyota brochure import review

Default dry-run only. No publication or production catalog write occurred.

| Model | Matrix trim columns | Configurations | Equipment rows | Standard records added | Missing spec cells | Preserved claim discrepancies | Review items |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 2026 Camry | 5 | 10 | 130 | 968 | 102 | 0 | 24 |
| 2026 4Runner | 12 | 16 | 141 | 1576 | 160 | 0 | 12 |
| 2026 Tundra | 10 | 16 | 193 | 1762 | 176 | 0 | 78 |
| 2026 Sequoia | 6 | 8 | 163 | 988 | 86 | 0 | 0 |
| 2026 Land Cruiser | 2 | 2 | 84 | 174 | 22 | 0 | 3 |
| 2026 Corolla Hatchback | 3 | 3 | 82 | 281 | 33 | 0 | 0 |

Full claim-level values, citations, exact raw S/A symbols, scope restrictions and preservation hashes are recorded in report.json and each extracted source stage.

## Review before applying

- Blank cells remain unverified; A never becomes standard equipment except explicit selected mechanical configuration identities.
- Existing verified cells, source references, source dates and configuration identities win over incoming wording/value/status differences.
- Colors are manufacturer model-level palettes. Trim/interior combinations are not inferred.
- See each profile's notes and hold rules; unresolved cab, seating, wheel, motor and paid-activation cases remain excluded or N/A.
- MSRP and technical measurements absent from these brochures are not invented.

## 2026 Camry

Specifications added: 88 verified cells. Exterior palette: 14 names; interior palette: 8 unique names. Trim-specific combinations remain N/A.

Missing specification fields (per-configuration details in report.json): towing, seating, dimensions, wheelbase, groundClearance, headroom, legroom, cargo, fuel, msrp, economy.

Manual review / excluded claims:
- Motor rows do not explicitly resolve FWD/AWD selection; LE front motor is A while other trim front motors are S. No component rating is promoted through drivetrain selection.
- Factory capability is recorded in the stage, but activation depends on Remote Connect. Excluded from standard-only equipment; not reclassified as absent.

Preserved discrepancies: 0. Existing verified claims remain authoritative; exact incoming/current values and pages are in report.json.

- Camry is hybrid only; 184 hp on p. 24 is the combustion-engine component, not combined-system horsepower. The p. 4 FWD statement is up to 225 net combined hp; AWD is 232 net combined hp.
- p. 25 disclosure 1 omits Nightshade. Nightshade fuel economy remains unavailable; no SE/XSE inheritance.
- Exterior/interior palettes are manufacturer model-level references; trim-specific color/material eligibility remains unverified.
- What’s New retains only the manufacturer-described brochure highlight. No independent prior-year comparison is established. Unsupported technical measurements, MSRP and configuration-specific ratings are not invented.

## 2026 4Runner

Specifications added: 144 verified cells. Exterior palette: 9 names; interior palette: 10 unique names. Trim-specific combinations remain N/A.

Missing specification fields (per-configuration details in report.json): towing, seating, dimensions, wheelbase, groundClearance, headroom, legroom, cargo, fuel, msrp.

Manual review / excluded claims:
- Shared hybrid row includes a distinct Trailhunter 323-hp exception. Full shared row held; reviewed engine/system horsepower/torque facts are scoped to each hybrid column.
- Factory capability is recorded in the stage, but activation depends on Remote Connect. Excluded from standard-only equipment; not reclassified as absent.

Preserved discrepancies: 0. Existing verified claims remain authoritative; exact incoming/current values and pages are in report.json.

- Matrix has 12 powertrain/trim columns and 16 drive/powertrain configurations across nine trim families. Gas Limited offers RWD or full-time 4WD; Limited hybrid and Platinum use full-time 4WD; other 4WD configurations use part-time 4WD.
- p. 28 explicitly gives Trailhunter 323 hp; other hybrid columns use 326 hp. Do not copy the advertised up-to-326 maximum onto Trailhunter.
- p. 7 advertises up to 90.2 cu. ft. cargo with all seats folded; p. 4 advertises up to 6000-lb towing. These maxima do not establish each selected configuration rating.
- Third-row seat is A on SR5 and gasoline Limited only. No standard third row or total seating capacity is inferred.
- Trailhunter header token is clipped to Trailhunte by its narrow table cell; header check uses Trailhunt within that column, with the full trim title independently reviewed on p. 21.
- Exterior/interior palettes are manufacturer model-level references; trim-specific color/material eligibility remains unverified.
- What’s New retains only the manufacturer-described brochure highlight. No independent prior-year comparison is established. Unsupported technical measurements, MSRP and configuration-specific ratings are not invented.

## 2026 Tundra

Specifications added: 128 verified cells. Exterior palette: 9 names; interior palette: 8 unique names. Trim-specific combinations remain N/A.

Missing specification fields (per-configuration details in report.json): economy, towing, seating, dimensions, wheelbase, groundClearance, headroom, legroom, cargo, fuel, msrp.

Manual review / excluded claims:
- Cab/bed eligibility is not resolved by this trim/drive record. Cab/bed-dependent rows are held until a cab/bed-specific manufacturer applicability matrix is verified.

Preserved discrepancies: 0. Existing verified claims remain authoritative; exact incoming/current values and pages are in report.json.

- Ten trim/powertrain columns yield 16 drive/powertrain configurations across seven trim families. SR/SR5/gas Limited/gas Platinum/gas 1794 and hybrid Limited offer RWD/4WD; hybrid Platinum/1794, TRD Pro and Capstone are 4WD only in the matrix.
- SR uses 358 hp/406 lb.-ft.; other gas columns use 389 hp/479 lb.-ft.; i-FORCE MAX columns use 437 hp/583 lb.-ft. Separate motor 48-hp/184-lb.-ft. values are not combined arithmetically.
- Cab availability chips and bed options require an explicit eligibility matrix before creating cab/bed permutations. p. 12 ties vertical rear glass to CrewMax; unselected cab/bed-dependent windows, bed lengths, mounts and storage are held.
- p. 4 maximum 12000-lb towing and illustrated towing examples do not establish ratings for every configuration. Fuel economy, dimensions, fuel capacity and cab/bed-specific ratings remain unavailable.
- Exterior/interior palettes are manufacturer model-level references; trim-specific color/material eligibility remains unverified.
- No explicit model-year change statement is verified in the brochure; What’s New remains unavailable. Unsupported technical measurements, MSRP and configuration-specific ratings are not invented.

## 2026 Sequoia

Specifications added: 66 verified cells. Exterior palette: 9 names; interior palette: 8 unique names. Trim-specific combinations remain N/A.

Missing specification fields (per-configuration details in report.json): towing, seating, dimensions, wheelbase, groundClearance, headroom, legroom, cargo, fuel, msrp, economy.

Manual review / excluded claims:

Preserved discrepancies: 0. Existing verified claims remain authoritative; exact incoming/current values and pages are in report.json.

- Hybrid-only model. SR5/Limited support RWD or part-time 4WD; Platinum/TRD Pro/1794 Edition/Capstone have 4WD only in the supplied 2026 matrix.
- p. 24 disclosure 2 explicitly identifies the 4x4 economy figure as 2025, not 2026. No 2026 4WD fuel economy is imported from it.
- p. 3 advertises up to 9500-lb towing; illustrated towing figures elsewhere depend on vehicle/options and are not used as every configuration rating.
- Second-row bench is S on SR5/Limited; captain chairs are A on Limited and S on remaining trims. Total seating capacity is not inferred from seat diagrams or names.
- The 1794 electric-motor power cell is blank while other hybrid columns show 48 hp; it remains unverified for 1794. All columns independently specify the hybrid powertrain rating.
- Exterior/interior palettes are manufacturer model-level references; trim-specific color/material eligibility remains unverified.
- No explicit model-year change statement is verified in the brochure; What’s New remains unavailable. Unsupported technical measurements, MSRP and configuration-specific ratings are not invented.

## 2026 Land Cruiser

Specifications added: 16 verified cells. Exterior palette: 8 names; interior palette: 5 unique names. Trim-specific combinations remain N/A.

Missing specification fields (per-configuration details in report.json): economy, towing, seating, dimensions, wheelbase, groundClearance, headroom, legroom, cargo, fuel, msrp.

Manual review / excluded claims:
- Digital Key activation requires an active Remote Connect subscription. Retain source evidence; exclude from factory-standard equipment rather than imply paid activation is included.
- 2026 p. 3 narrative says leather; 2026 p. 14/17 say SofTex standard, leather available. Conflicting upholstery claims held pending manufacturer clarification.

Preserved discrepancies: 0. Existing verified claims remain authoritative; exact incoming/current values and pages are in report.json.

- This is the separate 2026 Land Cruiser record using only the 2026 supplied PDF. Existing 2027 vehicle/source/equipment data is preserved byte-for-byte semantically.
- 2026 p. 3 calls upper-trim seats leather, but p. 14/17 establish SofTex S and leather A. Both upholstery rows held; optional leather is not promoted to standard.
- p. 5 quotes 6000-lb towing as a model-level claim; selected-configuration towing verification remains pending.
- Exterior/interior palettes are manufacturer model-level references; trim-specific color/material eligibility remains unverified.
- No explicit model-year change statement is verified in the brochure; What’s New remains unavailable. Unsupported technical measurements, MSRP and configuration-specific ratings are not invented.

## 2026 Corolla Hatchback

Specifications added: 27 verified cells. Exterior palette: 13 names; interior palette: 5 unique names. Trim-specific combinations remain N/A.

Missing specification fields (per-configuration details in report.json): economy, towing, seating, dimensions, wheelbase, groundClearance, headroom, legroom, cargo, fuel, msrp.

Manual review / excluded claims:

Preserved discrepancies: 0. Existing verified claims remain authoritative; exact incoming/current values and pages are in report.json.

- SE, FX and XSE are gasoline/FWD/Dynamic-Shift CVT only in the brochure. No Corolla sedan, hybrid, AWD or manual configuration is inferred.
- FX Sport Touring heated seats and orange stitching are read from the FX column, not inherited from SE or XSE.
- Fuel economy, dimensions, seating count, cargo capacity and tank capacity are not established by the supplied brochure.
- Exterior/interior palettes are manufacturer model-level references; trim-specific color/material eligibility remains unverified.
- No explicit model-year change statement is verified in the brochure; What’s New remains unavailable. Unsupported technical measurements, MSRP and configuration-specific ratings are not invented.


## Apply the reviewed candidate locally

Use the existing import:apply command with this directory and the exact candidate SHA-256. That operation revalidates and checks the unchanged base catalog. Then run all tests/build and prepare a PR. Do not merge or deploy automatically.
