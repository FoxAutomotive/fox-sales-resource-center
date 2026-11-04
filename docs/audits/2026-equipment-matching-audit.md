# Equipment verification and cross-brand matching audit — 2026-11-04

## Scope and source limitation

This change audits the retained manufacturer-cited records and the November 3 brochure ledger. **The original supplied `rav4_ebrochure.pdf` is not available in this workspace. Direct reinspection is blocked pending reattachment.** A read-only request to Toyota's official 2026 brochure path returned HTTP 403 and HTML, not a PDF. Neither the source review date nor the original brochure review is falsely updated. This PR remains a draft for that reason.

The prior source audit explicitly records unexplained LE heating/roof blanks. Those cannot be converted to Not Offered merely because other grades have S/A marks. No new measurement, MPG or towing research is included. A complete current-state cell ledger is in [2026-equipment-matching-audit.json](2026-equipment-matching-audit.json), including every RAV4 HEV configuration, source references and specific unknown reasons. The older ledger remains historical; tests account explicitly for the Not Applicable migration.

## Corrections and retained positive equipment

- All 27 HEV plug-in-range/charging/DC-charging cells now use the separate **Not Applicable** status instead of Unavailable, preserving source citations and explanations.
- All 57 existing Unverified cells now display the prior audit's page-specific explanation rather than an unexplained badge. No unknown availability is fabricated.
- Heated front seats remain **Standard** on SE, XLE Premium, Woodland, XSE and Limited (seven FWD/AWD configurations), per retained B1 p. 22 evidence. LE FWD/AWD remain genuinely unresolved in the retained audit.
- Heated steering wheel remains **Available (Optional)** on SE, XLE Premium and XSE (five configurations), **Standard** on Woodland/Limited (two), and unresolved on LE FWD/AWD. Source: retained B1 p. 21 S/A checks. Package contents and prerequisites are not invented.
- Surround-view camera availability now has a shared row: retained Toyota PVM claims on Woodland/XSE/Limited are Standard, including Woodland's Multi-Terrain Monitor distinction. RAV4 PHEV camera rows use only that guide's own release-backed claims; no HEV carryover. Other camera availability remains Unverified where no exclusion is established.
- Full-Speed Range DRCC from the already documented standard TSS 4.0 suite and VW ACC with Stop & Go from IQ.DRIVE appear together under Adaptive cruise control. This maps the category; it does not assert equal operating capabilities or include Traffic Jam Assist.
- The panoramic roof has a dedicated row: XSE's conventional moonroof remains Standard while the panoramic upgrade is Optional; Limited's panoramic moonroof is Standard. VW's panoramic sunroof retains each matrix status. A conventional roof never proves a panoramic roof is available or absent.
- VW delayed heated-wheel wording now applies only to the positively marked SEL configuration. Unavailable wheels no longer display an irrelevant delayed-production condition; SE-only sunroof package wording is removed from nonoptional configurations.

## Cross-brand terminology and search

Shared IDs preserve the original manufacturer descriptions, conditions and citations. Heated seats/front seats and heated wheel/steering wheel use consistent labels. Sunroof/moonroof, panoramic roofs, surround-view/360-degree/PVM/Area View and adaptive cruise/DRCC/ACC use category-specific search aliases.

Recognized feature phrases must match a Standard or Optional cell in that category on **one actual configuration**. Unverified, Not Offered and Not Applicable never establish availability. Word boundaries prevent LE from matching XLE and SE from matching SEL; numeric boundaries prevent a 12.9-inch screen from satisfying a 9-speaker query. Package names remain insufficient evidence of unspecified package contents.

The UI labels are Standard, Available (Optional), Not Offered, Not Applicable and Unverified. The underlying status IDs remain backward compatible. Layout, navigation, cards, comparison controls and print structure are preserved.

## Remaining HEV unknowns by field

These counts include explicit new category rows. A new row can expose a genuine gap without changing any established availability.

| Field                | Configuration count |
| -------------------- | ------------------: |
| `advancedAssistance` |                   4 |
| `areaView`           |                   6 |
| `cargoOutlet`        |                   8 |
| `economy`            |                   8 |
| `headUpDisplay`      |                   8 |
| `heatedSeats`        |                   2 |
| `heatedWheel`        |                   2 |
| `liftgate`           |                   2 |
| `panoramicRoof`      |                   5 |
| `parkingAutomation`  |                   7 |
| `roof`               |                   2 |
| `towing`             |                   3 |
| `ventilatedSeats`    |                   7 |
| `wirelessCharging`   |                   4 |

Technical gaps (fuel economy and FWD towing) are preserved. Existing unresolved equipment includes LE heating/roof, trim-specific ventilation/HUD/cargo AC outlet/wireless charging/advanced assistance/parking automation blanks; exact per-trim reasons are in the ledger. New surround-view/panoramic categories retain unknowns where current evidence establishes neither availability nor exclusion. Eight named package contents remain unverified.

## Documentation needed

1. Reattach the original 30-page Toyota brochure (recorded SHA-256 `b3bf909f6220343c8548ee9b004935317679a8c5e1444537083821e3896075a1`) to complete direct S/A table reinspection.
2. If its blanks remain unexplained, an official Toyota ordering/equipment guide with an explicit not-offered legend or trim-specific package eligibility is needed, especially for LE front-seat and steering-wheel heating. A single window sticker verifies that vehicle's installed equipment, not all possible configurations.
3. An official package-content/order guide is needed for the eight named HEV packages. Separate PHEV equipment documentation is needed for remaining PHEV gaps. Technical sheets/EPA records can resolve measurements later; they are outside this audit's research scope.

## Validation

Run the full existing data and browser suites, validation, formatting and build. Added regressions cover all nine HEV heating configurations, LE versus Tiguan SE unknown/standard/not-offered distinctions, both manufacturer's cruise and camera descriptions, XSE conventional-versus-panoramic roofs, source-loss behavior and alias false-positive prevention. No automatic merge or deployment.
