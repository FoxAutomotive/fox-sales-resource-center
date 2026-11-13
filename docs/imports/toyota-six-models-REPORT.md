# Toyota brochure import review

Default dry-run only. No publication or production catalog write occurred.

| Model | Matrix trim columns | Configurations | Equipment rows | Standard records added | Missing spec cells | Preserved claim discrepancies | Review items |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 2027 Land Cruiser | 2 | 2 | 84 | 172 | 22 | 0 | 2 |
| 2027 Prius | 8 | 8 | 85 | 680 | 80 | 0 | 6 |
| 2027 Prius Plug-in Hybrid | 4 | 4 | 89 | 380 | 41 | 0 | 4 |
| 2026 Corolla | 6 | 8 | 89 | 704 | 98 | 0 | 0 |
| 2026 Corolla Cross | 6 | 9 | 94 | 719 | 84 | 0 | 6 |
| 2026 Highlander | 7 | 7 | 119 | 735 | 72 | 0 | 6 |

Full claim-level values, citations, exact raw S/A symbols, scope restrictions and preservation hashes are recorded in report.json and each extracted source stage.

## Review before applying

- Blank cells remain unverified; A never becomes standard equipment except explicit selected mechanical configuration identities.
- Existing verified cells, source references, source dates and configuration identities win over incoming wording/value/status differences.
- Colors are manufacturer model-level palettes. Trim/interior combinations are not inferred.
- See each profile's notes and hold rules; unresolved cab, seating, wheel, motor and paid-activation cases remain excluded or N/A.
- MSRP and technical measurements absent from these brochures are not invented.

## 2027 Land Cruiser

Specifications added: 16 verified cells. Exterior palette: 8 names; interior palette: 5 unique names. Trim-specific combinations remain N/A.

Missing specification fields (per-configuration details in report.json): economy, towing, seating, dimensions, wheelbase, groundClearance, headroom, legroom, cargo, fuel, msrp.

Manual review / excluded claims:
- p. 3 narrative says leather, but p. 14/17 say SofTex standard and leather optional. Upholstery held pending Toyota clarification.

Preserved discrepancies: 0. Existing verified claims remain authoritative; exact incoming/current values and pages are in report.json.

- p. 3 narrative calls Land Cruiser leather-trimmed; p. 14 grades and p. 17 matrix establish SofTex standard and leather A (optional). Upholstery claims held pending correction; neither leather nor SofTex published as verified standard upholstery.
- p. 5 towing is up to 6000 lb; configuration-specific rating remains unavailable.
- Full-time 4WD row uses 4-Wheel spelling; explicit selected drivetrain row retained.
- Exterior/interior palettes are model-level only; trim/color combinations unverified.
- No explicit model-year change statement verified; What’s New remains unavailable.
- Measurements and configuration-specific ratings not established by the brochure remain unavailable.

## 2027 Prius

Specifications added: 80 verified cells. Exterior palette: 7 names; interior palette: 5 unique names. Trim-specific combinations remain N/A.

Missing specification fields (per-configuration details in report.json): towing, seating, dimensions, wheelbase, groundClearance, headroom, legroom, cargo, fuel, msrp.

Manual review / excluded claims:
- Factory capability is recorded in the stage, but activation depends on Remote Connect. Excluded from standard-only equipment; not reclassified as absent.

Preserved discrepancies: 0. Existing verified claims remain authoritative; exact incoming/current values and pages are in report.json.

- Exterior/interior palettes are model-level only; trim/color combinations unverified.
- No explicit model-year change statement verified; What’s New remains unavailable.
- Measurements and configuration-specific ratings not established by the brochure remain unavailable.

## 2027 Prius Plug-in Hybrid

Specifications added: 39 verified cells. Exterior palette: 7 names; interior palette: 3 unique names. Trim-specific combinations remain N/A.

Missing specification fields (per-configuration details in report.json): economy, towing, seating, dimensions, wheelbase, groundClearance, headroom, legroom, cargo, fuel, msrp.

Manual review / excluded claims:
- Factory capability is recorded in the stage, but activation depends on Remote Connect. Excluded from standard-only equipment; not reclassified as absent.
- Nightshade-specific black/gray-stitching seat row is also standard; retain the specific row only.

Preserved discrepancies: 0. Existing verified claims remain authoritative; exact incoming/current values and pages are in report.json.

- SE gas-only economy conflicts: p. 6 says 51 combined MPG; p. 23 disclosure 8 says 53 city/51 highway/52 combined. SE economy remains unavailable pending Toyota correction. Disclosure 8 independently states SE electric-operation 127 combined MPGe.
- Charging rate/time, usable battery capacity and DC charging support are not established; no Prius HEV charging inferences.
- Nightshade seating has both gray-stitching-specific and generic SofTex rows marked standard; generic row held to avoid conflicting upholstery descriptions.
- Exterior/interior palettes are model-level only; trim/color combinations unverified.
- No explicit model-year change statement verified; What’s New remains unavailable.
- Measurements and configuration-specific ratings not established by the brochure remain unavailable.

## 2026 Corolla

Specifications added: 62 verified cells. Exterior palette: 15 names; interior palette: 9 unique names. Trim-specific combinations remain N/A.

Missing specification fields (per-configuration details in report.json): economy, towing, seating, dimensions, wheelbase, groundClearance, headroom, legroom, cargo, fuel, msrp, horsepower, torque.

Manual review / excluded claims:

Preserved discrepancies: 0. Existing verified claims remain authoritative; exact incoming/current values and pages are in report.json.

- Hybrid 96 hp/105 lb-ft is the combustion-engine component; combined-system horsepower is absent. No Corolla Hybrid system rating inferred.
- Brochure does not provide configuration-specific fuel economy, dimensions, tank capacity, cargo volume or towing ratings.
- Exterior/interior palettes are model-level only; trim/color combinations unverified.
- No explicit model-year change statement verified; What’s New remains unavailable.
- Measurements and configuration-specific ratings not established by the brochure remain unavailable.

## 2026 Corolla Cross

Specifications added: 78 verified cells. Exterior palette: 11 names; interior palette: 8 unique names. Trim-specific combinations remain N/A.

Missing specification fields (per-configuration details in report.json): towing, seating, dimensions, wheelbase, headroom, legroom, cargo, fuel, msrp, horsepower.

Manual review / excluded claims:
- Gas AWD rear suspension not explicitly assigned; S torsion beam / A multi-link table does not resolve selected drive.

Preserved discrepancies: 0. Existing verified claims remain authoritative; exact incoming/current values and pages are in report.json.

- Hybrid 150 hp/139 lb.-ft. matrix row is the gasoline engine component, not a combined-system rating. Combined-system horsepower is not stated in this brochure.
- Gas AWD rear suspension applicability unresolved: torsion-beam row S and multi-link row A do not explicitly assign drivetrain. Both held for AWD pending technical documentation.
- Exterior/interior palettes are model-level only; trim/color combinations unverified.
- No explicit model-year change statement verified; What’s New remains unavailable.
- Measurements and configuration-specific ratings not established by the brochure remain unavailable.

## 2026 Highlander

Specifications added: 61 verified cells. Exterior palette: 5 names; interior palette: 6 unique names. Trim-specific combinations remain N/A.

Missing specification fields (per-configuration details in report.json): towing, dimensions, wheelbase, groundClearance, headroom, legroom, cargo, fuel, msrp, engine, horsepower, torque.

Manual review / excluded claims:
- Manufacturer matrix text is visibly truncated: hybrid engine ends intelligent; motor row ends two front. Full technical description requires corrected source.

Preserved discrepancies: 0. Existing verified claims remain authoritative; exact incoming/current values and pages are in report.json.

- 2026 matrix supports AWD only: gas XLE uses AWD; XSE/Limited/Platinum torque-vectoring AWD; all hybrid columns electronic on-demand AWD.
- Gas towing is an up-to-5000-lb model/powertrain maximum on p. 4, not assigned as a configuration rating. Hybrid combined-system horsepower is not stated.
- 7-passenger captain-chair layout is standard. Optional 8-passenger bench is recorded as available only on XLE, Hybrid XLE and gasoline Limited.
- Exterior/interior palettes are model-level only; trim/color combinations unverified.
- No explicit model-year change statement verified; What’s New remains unavailable.
- Measurements and configuration-specific ratings not established by the brochure remain unavailable.


## Apply the reviewed candidate locally

Use the existing import:apply command with this directory and the exact candidate SHA-256. That operation revalidates and checks the unchanged base catalog. Then run all tests/build and prepare a PR. Do not merge or deploy automatically.
