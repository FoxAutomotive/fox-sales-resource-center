# Toyota brochure import review

Default dry-run only. No publication or production catalog write occurred.

| Model                 | Matrix trim columns | Configurations | Equipment rows | Standard records added | Missing spec cells | Preserved claim discrepancies | Review items |
| --------------------- | ------------------: | -------------: | -------------: | ---------------------: | -----------------: | ----------------------------: | -----------: |
| 2026 Tacoma           |                  11 |             15 |            114 |                    874 |                185 |                             0 |           33 |
| 2026 Sienna           |                   6 |             10 |            124 |                    991 |                102 |                             0 |           13 |
| 2026 Grand Highlander |                  10 |             14 |            126 |                   1433 |                112 |                             0 |           11 |
| 2026 RAV4             |                   6 |              9 |            146 |                    862 |                 92 |                           162 |           14 |

Full claim-level values, citations, exact raw S/A symbols, scope restrictions and preservation hashes are recorded in report.json and each extracted source stage.

## Review before applying

- Blank cells remain unverified; A never becomes standard equipment except explicit selected mechanical configuration identities.
- Existing verified cells, source references, source dates and configuration identities win over incoming wording/value/status differences.
- Colors are manufacturer model-level palettes. Trim/interior combinations are not inferred.
- See each profile's notes and hold rules; unresolved cab, seating, wheel, motor and paid-activation cases remain excluded or N/A.
- MSRP and technical measurements absent from these brochures are not invented.

## 2026 Tacoma

Specifications added: 85 verified cells. Exterior palette: 12 names; interior palette: 9 unique names. Trim-specific combinations remain N/A.

Missing specification fields (per-configuration details in report.json): horsepower, torque, economy, towing, seating, dimensions, wheelbase, groundClearance, headroom, legroom, cargo, fuel, msrp.

Manual review / excluded claims:

- SR/SR5 cab-specific seats and rear suspension cannot be assigned without a verified cab configuration.
- Factory capability is recorded in the stage, but activation depends on Remote Connect. Excluded from standard-only equipment; not reclassified as absent.
- Manual/automatic-specific TSS suite descriptions are not explicitly assigned to the optional automatic configuration.

Preserved discrepancies: 0. Existing verified claims remain authoritative; exact incoming/current values and pages are in report.json.

- SR and TRD Sport list an available 6MT, but its drivetrain/cab eligibility is not established. Those manual combinations are pending, not invented.
- SR/SR5 Double Cab and XtraCab, and bed-length combinations require a configuration-specific technical/order document. Grade-level equipment with cab-sensitive wording is held for review.
- The gas engine marketing maximum (up to 278 hp / 317 lb.-ft.) does not establish each trim/transmission output; gas horsepower and torque remain unverified.

## 2026 Sienna

Specifications added: 80 verified cells. Exterior palette: 8 names; interior palette: 6 unique names. Trim-specific combinations remain N/A.

Missing specification fields (per-configuration details in report.json): torque, towing, dimensions, wheelbase, groundClearance, headroom, legroom, cargo, fuel, msrp, seating.

Manual review / excluded claims:

- XLE has both 7- and 8-passenger layouts and both LATCH counts marked Standard; selected seating layout is unresolved.
- The XSE column marks both 18-inch and 20-inch wheels Standard without resolving drivetrain applicability.
- Manufacturer PDF contains an unresolved sienna_ottoman footnote placeholder. Ottoman restrictions require review.

Preserved discrepancies: 0. Existing verified claims remain authoritative; exact incoming/current values and pages are in report.json.

- Woodland Edition and Platinum have no FWD row; no FWD configuration is created for them.
- The brochure quotes a model-level maximum of up to 3,500 lb towing on p. 8, not a configuration-specific rating. Vehicle-specific towing is pending.
- Footnote 68 says spare-tire selection on Limited AWD removes second-row ottomans; equipment claims retain this manufacturer restriction.

## 2026 Grand Highlander

Specifications added: 140 verified cells. Exterior palette: 8 names; interior palette: 10 unique names. Trim-specific combinations remain N/A.

Missing specification fields (per-configuration details in report.json): economy, towing, dimensions, wheelbase, groundClearance, headroom, fuel, msrp.

Manual review / excluded claims:

- Factory capability is recorded in the stage, but activation depends on Remote Connect. Excluded from standard-only equipment; not reclassified as absent.

Preserved discrepancies: 0. Existing verified claims remain authoritative; exact incoming/current values and pages are in report.json.

- Gas, Hybrid and Hybrid MAX use separate source columns, engines, transmissions and drivetrains. No specification is carried between powertrains.
- Cargo and third-row legroom on p. 3 are explicitly model-level brochure figures, not individual seat/wheel configuration measurements.

## 2026 RAV4

Specifications added: 28 verified cells. Exterior palette: 12 names; interior palette: 7 unique names. Trim-specific combinations remain N/A.

Missing specification fields (per-configuration details in report.json): economy, towing, seating, dimensions, wheelbase, groundClearance, headroom, legroom, cargo, fuel, msrp.

Manual review / excluded claims:

- Rear motor output is marked S even in FWD columns; do not assign unqualified front/rear output to every configuration.
- Factory capability is recorded in the stage, but activation depends on Remote Connect. Excluded from standard-only equipment; not reclassified as absent.

Preserved discrepancies: 162. Existing verified claims remain authoritative; exact incoming/current values and pages are in report.json.

## Apply the reviewed candidate locally

Use the existing import:apply command with this directory and the exact candidate SHA-256. That operation revalidates and checks the unchanged base catalog. Then run all tests/build and prepare a PR. Do not merge or deploy automatically.
