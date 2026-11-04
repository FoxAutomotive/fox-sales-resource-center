# 2026 Toyota RAV4 source review

Reviewed November 3, 2026 (America/New_York). This review updates the existing guide; it does not change the Fox Automotive screen design or artwork.

## B1 — supplied Toyota eBrochure

The user supplied `rav4_ebrochure.pdf`, titled **2026 RAV4**, 30 pages. Its SHA-256 is recorded in the catalog source metadata, along with filename, page count, delivery method, model year and review date. The original remains in task attachments; it is not republished as a 22 MB website download. The source’s manufacturer link goes to the official Toyota model page, not to a claimed successful download of this attachment.

- Pages 17–18: six HEV grade summaries and named options/packages.
- Pages 20–25: HEV equipment matrix, with **S = Standard** and **A = Available**.
- Pages 8–14 and 26–29: technology explanations and operating limitations.
- Page 30: regional availability/package-combination caveats.

These tables have columns for LE, SE, XLE Premium, Woodland, XSE and Limited, with hybrid mechanical specifications. They do **not** provide a separate PHEV/GR SPORT equipment matrix. PHEV photos and general electrified-powertrain text elsewhere in the brochure do not establish PHEV trim-equipment availability.

The six HEV grades produce nine explicit configurations: LE/SE/XLE Premium each FWD or AWD; Woodland/XSE/Limited AWD only. The catalog materializes these configurations separately. Optional equipment retains conditions rather than being promoted to standard. An unexplained blank in an S/A table is treated as **Unverified**, not proof of **Unavailable**.

## Verified HEV package names; contents not enumerated

| Package name               | Grade(s) listed in B1 | Itemized contents |
| -------------------------- | --------------------- | ----------------- |
| Convenience Package        | SE                    | Unverified        |
| Moonroof Package           | SE, Woodland          | Unverified        |
| Weather Package            | SE                    | Unverified        |
| XLE Driver Assist Package  | XLE Premium           | Unverified        |
| Panoramic Moonroof Package | XLE Premium, XSE      | Unverified        |
| XSE Driver Assist Package  | XSE                   | Unverified        |
| JBL Premium Audio Package  | XSE                   | Unverified        |
| 20-In. Wheel Package       | Limited               | Unverified        |

The 10-inch color Head-Up Display is a separately named Limited option, not assumed to be another factory package. Feature-table A marks verify individual feature availability. They do not define which features must be ordered together, nor complete package contents, prices, regional/drivetrain restrictions or installed equipment. The guide presents these individual options separately from packages. All package records explicitly label contents as unverified.

Examples checked against the matrix: LE/SE/XLE Premium/Woodland have 10.5-inch screens with six speakers; XSE has a 12.9-inch screen with six speakers as standard; Limited has a 12.9-inch screen with nine-speaker JBL as standard. XSE’s JBL package is named, but its full contents are not inferred. Heated steering wheel is A on SE/XLE Premium/XSE and S on Woodland/Limited. Advanced Park is A on XSE and S on Limited. Panoramic moonroof is A on XLE Premium/XSE and S on Limited; the regular moonroof is S on XSE and A on SE/Woodland.

## T1 — Toyota’s 2026 U.S. press release

[The Next Adventure Begins: 2026 RAV4 Arrives this Winter](https://pressroom.toyota.com/the-next-adventure-begins-2026-rav4-arrives-this-winter/), originally October 22, 2025; page says updated May 8, 2026. Read successfully.

This source explicitly lists the HEV/PHEV powertrain matrix and four AWD PHEV grades (SE, Woodland, XSE, GR SPORT). Only claims supported by the release are retained in a **separate RAV4 Plug-in Hybrid guide**. No B1 equipment or packages are carried into that guide. Its badge and summary identify the limited release-only verification scope; detailed equipment and packages await separate specifications.

PHEV charging is configuration-specific: SE/GR SPORT have 7-kW/J1772 AC charging only; XSE/Woodland have 11-kW/CCS1 with DC capability. Release-estimated electric ranges and consumption are clearly labeled manufacturer estimates rather than verified EPA ratings. No charging behavior, output, transmission type or range is copied between HEV and PHEV merely because trim names match.

## Conflicts and remaining unknowns

- T1 contains conflicting HEV fuel-economy summaries and inconsistent XSE/Limited numbers. B1 provides no MPG table to resolve them. Those cells remain Unverified. Woodland HEV’s consistent 41/35/38 manufacturer estimates are labeled as such, not EPA results.
- T1 lists Woodland PHEV at either 37 or 38 combined mpg and GR SPORT at either 36 or 37; those cells remain Unverified. SE/XSE PHEV 43/36/40 manufacturer estimates are explicitly qualified.
- B1 p. 25 gives “Max. Torque: 170 lb.-ft.” without a clear engine/system basis; T1 gives 163 lb-ft for the HEV engine and 172 in its HEV XSE line. The audit now reports the explicit brochure-listed maximum of 170 lb-ft (231 N·m) as Standard, with the unspecified basis stated in the value. It is not labeled engine-only or combined-system torque, and the incompatible release figures are not substituted or summed. PHEV’s 172 lb-ft in T1 is explicitly engine-only; no total-system torque is inferred.
- T1 supports LE AWD towing up to 1,750 lb and XLE Premium/SE/XSE/Limited/Woodland AWD up to 3,500 lb with conditions. B1’s general “up to 3500” headline is not used to assign a capacity to every configuration. FWD/GR SPORT limits remain Unverified.
- Total seating capacity, missing PHEV screen/audio/roof availability and PHEV transmission type are not filled from prior years or the HEV table.
- Named package contents, prices, complete combinations and exact drivetrain/region restrictions are not itemized by the provided brochure.

At review, the requested [model](https://www.toyota.com/rav4/) and [feature](https://www.toyota.com/rav4/features/) pages returned Toyota HTTP 403 responses. The separate media kits link detailed PDFs on `toyota-cms-media.s3.amazonaws.com`, whose CONNECT request the environment proxy denied. Those unsuccessful reads are not claimed as reviewed evidence. No network-policy changes or publication were performed for this guide.

## Maintenance and print

Source IDs B1 and T1 resolve to the catalog’s reviewed source objects. Equipment cells and package records include brochure page references. Optional-item evidence and compact-print references are validated. The print guide derives trim facts and package caveats from those same records; HEV and PHEV have separate sheets. Test coverage checks source separation, unknown package contents, optional-vs-standard distinctions, search/comparison behavior and one-page landscape Letter output.

## Complete data-quality re-audit

[Cell-level audit](audits/2026-rav4-hybrid-audit.md) and [machine-readable ledger](audits/2026-rav4-hybrid-audit.json) cover all 93 formerly Unverified HEV cells. Nine explicit brochure torque values and 27 plug-in-only applicability cells are resolved; 57 remain genuinely unestablished by the reviewed sources. Every remaining cell has a page-specific reason. The HEV/PHEV distinction comes from the brochure’s powertrain classification, not equipment transfer from another grade. Toyota technical-PDF and EPA CONNECT failures remain documented access blockers, not evidence that ratings do not exist.
