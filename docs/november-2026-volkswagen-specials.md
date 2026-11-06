# November 2026 Volkswagen lease specials

These five internal offers use the user-approved working figures supplied November 6, 2026. They are not independently reconstructed manufacturer lease calculations.

| Vehicle                              | Monthly payment | Total due at signing | Rebate already included | Qualification                        |
| ------------------------------------ | --------------: | -------------------: | ----------------------: | ------------------------------------ |
| 2027 Volkswagen Jetta Sport          |         $373.25 |               $2,000 |                    $500 | Everyone Qualifies                   |
| 2027 Volkswagen Taos S               |         $405.00 |               $2,000 |                    $500 | Everyone Qualifies                   |
| 2026 Volkswagen Tiguan S             |         $409.83 |               $2,000 |                  $1,950 | Costco Executive Membership Required |
| 2026 Volkswagen Atlas Cross Sport SE |         $560.40 |               $2,000 |                  $4,750 | Costco Executive Membership Required |
| 2026 Volkswagen Atlas SE             |         $572.60 |               $2,000 |                  $1,250 | Costco Executive Membership Required |

Each lease has a 36-month term, 10,000 annual miles, and expires November 30, 2026. The existing dealership-date expiration filter hides all five after that date without deleting historical records.

Payments are displayed exactly as supplied, including cents/trailing zeroes. Rebates are already reflected in payments and are never subtracted again. The $2,000 is the total out of pocket, not a down payment plus additional first payment, taxes, or fees. The separately unknown down-payment breakdown stays TBD.

“Everyone Qualifies” refers only to the absence of special membership/loyalty requirements. Every card displays: “Lease payments subject to approved credit through the applicable leasing company. Not all customers will qualify.” Only the three specified offers have Costco Executive requirements.

## Editable data and missing information

Records stay in `data/specials.json`, using the existing card/filter/expiration implementation. No layout, stylesheet, navigation, vehicle record, or importer changes are needed.

Backward-compatible optional fields:

- `paymentPrecision: 2` preserves the approved payment's two decimal places; existing Toyota formatting is unchanged.
- `signingAmountType: "total-out-of-pocket"` clarifies the existing `dueAtSigning` value without calculating additional charges.
- `rebate`, `qualification`, and `creditQualification` supply the approved card content. Qualifications are explicit per offer, never inferred from manufacturer.
- `vehicleId` links only when the existing verified guide's manufacturer, model and year match. The explicit `guideModel` mapping handles the existing guide name “Jetta 1.5T” while retaining the supplied “Jetta Sport” offer title. An absent or mismatched guide never suppresses an offer or creates a new vehicle record.
- `leaseDetails` opts into explicit pending details. Named fields include lienholder, residual value/percentage, money factor, acquisition/disposition fees, security deposit and credit tier. `null` displays TBD, `"N/A"` displays N/A, and numeric zero remains zero (`$0` for money). Numeric/text field types are validated.
- With `leaseDetails` present, missing existing detail fields (stock, VIN, MSRP, selling price, leasing company, tax-inclusive payment, down payment) display TBD. Other existing offers continue omitting absent details as before.
- `source.kind: "approved-internal"` records the supplied title, source section and provided-on date. Existing spreadsheet provenance is retained and still validated.

No leasing company, tax treatment, credit tier, residual, money factor, fee or deposit has been inferred. No public advertising disclosures or incentive-combination claims are generated.

## Verification

All four prior Toyota records and their rendered card HTML are unchanged; Chevrolet has no existing offers and remains unchanged. The five specials link to their matching existing model-year guides.

Catalog validation, 82 Node/importer tests, 12 Python extractor tests, 39 browser tests against the production build at `/fox-sales-resource-center/`, formatting and build checks pass. Browser coverage checks exact cents, totals, rebates, the two qualification groups, TBD/zero/N/A distinctions, filters, correct-year links, desktop/mobile cards, and dealership-midnight expiration. Existing Product Guide regression coverage remains intact.

Review through a pull request; do not merge or deploy automatically.
