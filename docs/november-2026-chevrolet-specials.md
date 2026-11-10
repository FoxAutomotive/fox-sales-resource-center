# November 2026 Chevrolet lease specials

Seven user-provided offers were added to `data/specials.json`, using the existing Current Specials cards, filters, expandable details and expiration handling. The source is recorded as approved internal information provided November 10, 2026. All nine existing Toyota/Volkswagen offer records are preserved.

| Model year / model | Trim / configuration |    MSRP | Monthly payment | Down payment | Months | Lender / credit tier | Expires           |
| ------------------ | -------------------- | ------: | --------------: | -----------: | -----: | -------------------- | ----------------- |
| 2026 Silverado     | Crew Cab 2FL 4x4     | $54,095 |            $189 |         $999 |     24 | GM Financial A+      | November 30, 2026 |
| 2026 Equinox       | LT FWD, Previous CTP | $33,170 |            $239 |         $999 |     36 | GM Financial A+      | November 30, 2026 |
| 2026 Trax          | LS                   | $25,150 |            $239 |       $1,999 |     36 | MSUFCU Super Tier    | November 15, 2026 |
| 2026 Blazer        | LT FWD               | $38,815 |            $249 |       $1,999 |     24 | GM Financial A+      | November 30, 2026 |
| 2026 Colorado      | 4x4 Work Truck       | $41,175 |            $288 |       $2,799 |     36 | GM Financial A+      | November 30, 2026 |
| 2026 Equinox EV    | LT2, Previous CTP    | $43,690 |            $369 |       $3,899 |     24 | GM Financial A+      | November 30, 2026 |
| 2026 Traverse      | AWD LT               | $47,505 |            $459 |       $2,799 |     36 | MSUFCU Super Tier    | November 15, 2026 |

All amounts are USD. Each offer requires GM Employee or Eligible Family Member pricing, the specified lender/tier's credit approval, 10,000 annual miles, and GM Rewards Credit Card signup with a minimum $1,000 charge at delivery. No security deposit is required; the existing structured deposit field records $0. Tax, title, CVR and documentation fees are additional.

Silverado requires Chevrolet Lease Loyalty. Equinox EV requires Chevrolet EV Lease Loyalty. The other five require Lease Loyalty or Lease Conquest. Both Equinox offers retain the Previous CTP designation.

## Down payment and missing information

The listed cash amounts are **down payments**, not total due at signing or total out-of-pocket. `dueAtSigning` and `signingAmountType` are deliberately absent. The existing fact list now displays a Down payment row when only that amount is supplied, while all Toyota due-at-signing and Volkswagen total-out-of-pocket labels/values remain unchanged. Full Offer Details explains that signing totals have not been provided.

No total is calculated from the down payment, monthly payment, card charge or additional fees. Missing stock/VIN, selling price, tax-inclusive payment and other lease calculations remain unprovided; the existing lease-details presentation shows TBD where applicable. No new guide link is inferred, including for the 2026 Equinox (the existing Chevrolet guide is a different model year).

## Expiration and review

Dates remain offer-specific and inclusive in the existing America/Detroit dealership timezone. Trax and Traverse disappear from active offers at midnight after November 15; the other five disappear at midnight after November 30. Records remain in the data file. No automatic date extension or deletion was added.

Regression checks cover exact figures and qualifications, zero security deposits, missing signing totals, preservation of Toyota/VW records, filters, desktop/mobile cards, expandable details, and the two expiration boundaries. Validation passed: 98 Node tests, 16 Python extractor tests, 52 browser tests, catalog validation, formatting, diff checks and the production build. No page redesign, vehicle-data edits, merge or deployment is part of this update.
