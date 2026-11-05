# Current Specials maintenance

The main navigation opens `#/specials`. Update `data/specials.json` to change offers; no page-layout edits are required. Product Guide data is separate and unchanged.

## Data format

`schemaVersion: 1`, `timeZone: America/Detroit`, and `offers` are required. Each offer has an independent unique `id`, `manufacturer` (`toyota`, `volkswagen`, `chevrolet`), numeric `year`, exact `model` and `trim`, `type` (`lease`, `finance`, `purchase`), and inclusive ISO `expiresOn` date. Multiple offers may reference the same vehicle.

Optional numeric fields: `monthlyPayment`, `dueAtSigning`, `termMonths`, `annualMileage`, `msrp`, `sellingPrice`, `paymentIncludingTax`, `downPayment`, `apr` (percent), `purchasePrice`. Dollar values are numbers, without currency symbols. Optional text: `stockNumber`, `vinLast8`, `vin` (full 17 characters only), `lender`, `notes`. Omit unknown fields; do not use zero as a substitute for missing information. Zero is a valid confirmed amount. Empty fields are not rendered.

Each offer records `source.file`, `source.sheet`, and `source.column`. Future spreadsheet imports should produce this same JSON format, preserve cell provenance, then run validation and review before committing. There is no automatic import or manufacturer integration in this change.

## Initial workbook provenance

User-supplied `FOX-VW-LEASE-SPECIALS.xlsx`, `Sheet1`, columns B (Corolla), C (Tacoma), D (Camry), F (Tundra). Column E has no vehicle offer and was excluded. Despite the filename, every populated offer is Toyota.

Row mapping: manufacturer 1; model/trim 2; year 3; VIN last eight 4; stock 5; down payment 6; total due at signing 7; monthly payment 8; payment with tax 9; selling price 11; MSRP 13; term 14; annual miles 15; expiration 16; lender 17. Gross cap cost and rebate cells are blank and were omitted. The original workbook is not bundled with the website.

Values are transcribed, not recalculated. The lender labels `ADVIA CU` and `ADVIA` are preserved exactly. Tacoma's documented trim includes Double Cab. Tundra's payment including tax is **$507** beside a **$502** base payment, as supplied; confirm that unusual relationship with management before relying on it. No tax rate, qualifications, or additional fee breakdown was supplied. Those fields remain absent.

## Expiration and review

Offers remain active through their expiration date in the dealership's America/Detroit time zone. They disappear at the next local midnight. An open page checks for a date change every second and on visibility changes. Expired records stay in the JSON. Empty manufacturers show a no-current-offers message; filters compose with expiration checks.

Before review, run `npm run validate`, `npm test`, `npm run test:extractor`, `npm run test:browser`, `npm run build`, and `npm run format:check`. Validation is also part of every production build. Review source values, especially money, lender spelling and VIN completeness. The browser suite covers navigation, both filters, details, responsive card geometry, midnight expiration, editable data fixtures, loading recovery, and existing guides/comparisons.
