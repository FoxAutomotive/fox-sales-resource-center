# 2026 Volkswagen Tiguan source audit

Reviewed November 4, 2026, for the U.S. market. Both user-specified PDFs returned HTTP 200 and valid PDF files. No prior-model-year data, retail estimates, third-party specification sites, or inferred trim inheritance were used.

| Reference | Official document                                                                                                                                           | Pages | Use                                                                                                                                                                       |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| VW-P      | [2026 Tiguan pricing and equipment](https://media.vw.com/assets/applications/original/19517-2026-tiguan-pricing-sheet.pdf)                                  | 1–3   | p. 1 configuration MSRP, destination, engines, exterior and initial interior rows; p. 2 interior/convenience and infotainment; p. 3 safety and option packages            |
| VW-T      | [2026 Tiguan technical specifications, final v2](https://media.vw.com/assets/applications/original/19768-2026-tiguan-technical-specifications-final-v2.pdf) | 1–2   | p. 1 engines, drivetrain, ratios, fuel, steering, seating, interior/cargo, chassis, brakes and wheels; p. 2 remaining wheels, dimensions, weights, towing and consumption |

Catalog source records retain exact URLs, SHA-256 digests, page counts and actual review date. Every confirmed equipment cell and package includes source IDs and page references. Source review means verification against these documents, not a guarantee of current retail pricing or installed equipment. No printed effective/publication date appears in VW-P; the review date is explicitly labeled and is not represented as a price effective date. VW-P says the information is preliminary and subject to change.

## Configurations and starting MSRP

All amounts below exclude the separately published $1,475 destination charge. Catalog cells also show the arithmetic total including destination. Taxes, title, registration, options and dealer charges are excluded. Source: VW-P p. 1; reviewed 2026-11-04.

| Trim             |         FWD | 4MOTION AWD |
| ---------------- | ----------: | ----------: |
| S                |     $30,805 |     $32,305 |
| SE               |     $33,605 |     $35,105 |
| SE R-Line Black  |     $37,245 |     $38,745 |
| SEL R-Line Turbo | Not offered |     $43,085 |

The SEL FWD dash is represented by the absence of that configuration, not an invented price or empty trim card.

## Technical mapping

VW-T has three powertrain columns: 201-hp FWD, 201-hp AWD and 268-hp Turbo AWD. VW-P establishes which grades use each column. Each configuration has explicit cells rather than inherited equipment.

| Configuration group               | Torque    | Consumption city/highway/combined MPG | Braked towing | Height / ground clearance |
| --------------------------------- | --------- | ------------------------------------- | ------------- | ------------------------- |
| S FWD                             | 207 lb-ft | 26 / 34 / 29                          | 1,500 lb      | 66.14 / 6.6 in            |
| SE and SE R-Line Black FWD        | 207 lb-ft | 25 / 32 / 28                          | 1,500 lb      | 66.14 / 6.6 in            |
| S, SE and SE R-Line Black 4MOTION | 221 lb-ft | 22 / 30 / 25                          | 1,800 lb      | 66.5 / 7.0 in             |
| SEL R-Line Turbo 4MOTION          | 258 lb-ft | 22 / 29 / 25                          | 1,800 lb      | 66.5 / 7.0 in             |

The second FWD consumption line follows the explicitly S-labeled line; it is mapped to the other FWD trims established in VW-P. Consumption is labeled Volkswagen-published, with no claim of independent EPA database verification. RPM ranges differ by powertrain and are retained. Fuel tanks are 14.5 gal FWD and 15.6 gal AWD. Brakes, track widths, angles, boost/compression, ratios, payload/GVWR and drag coefficients remain configuration-specific.

Interior dimensions retain both sunroof conditions: headroom 39.5/39.7 in without and 38.2/38.4 in with sunroof, front/rear. Passenger volume is explicitly without sunroof. Cargo 33.8/69.8 cu ft retains VW's third-party-testing footnote. Standard trailer hitch preparation is distinguished from an installed hitch or permission to tow without proper equipment.

## Equipment matrix coverage

Each column of VW-P was reviewed independently. S is Standard; O is Optional; dashes indicate the listed row is not offered; X identifies package eligibility. Grouped cells describe positively marked alternatives (for example, the actual wheel, seat material, mirror type, climate system, screen and sound system), without asserting every unmarked alternative is absent. Equipment absent from a source is never automatically marked Unavailable.

- Page 1 exterior: AFS headlights/DRLs, taillights, cornering/poor-weather lighting, illuminated grille/logo/rear bar, windshield insulation/heating, washer nozzles, mirror adjustment/heating/folding/puddle lights, door-handle illumination, panoramic sunroof, rail finishes, hitch preparation and all four wheel sizes.
- Page 1 comfort: stainless pedals, remote start, KESSY/proximity locking, two/three-zone Climatronic, 10/30-color ambient lighting, backlit décor and front-door exit lights.
- Page 2 comfort: rain-sensing wipers, heated wiper park, automatic headlights, each mirror alternative, 7.6L console, all seating surfaces and steering-wheel coverings, delayed heated wheel/paddles, map pocket, manual/power front-seat adjustment and memory, heated/ventilated/massage seats, rear outboard heating, fixed 60:40 seat, Smart Floor and liftgate alternatives.
- Page 2 technology: MIB4 screens, itemized radio/Bluetooth/USB for the 12.9-inch row, Digital Cockpit Pro, Atmospheres, seven-speaker/Harman Kardon systems, voice control, myVW+ with available Wi-Fi, App-Connect, wireless Apple CarPlay/Android Auto, charging and two 12-V outlets.
- Page 3 safety: all seven IQ.DRIVE functions (including assisted lane changing), Park Distance Control, Park Assist Plus, Light Assist, Area View, road-sign display, rear camera, all listed airbag positions, TPMS, post-collision braking and crash response. ABS, ESC and parking brake additionally use VW-T p. 1.
- Page 3 options: S-only $300 18-inch Wheel Package; SE-only $1,200 Panoramic Sunroof Package; $395 Black Roof Package on SE R-Line Black and SEL R-Line Turbo, with black mirror caps explicitly included only on SEL. Noneligible grades have explicit Unavailable package records, so comparisons do not introduce unnecessary Unverified cells. Standard panoramic roofs are not relabeled as optional packages.

Unexplained blanks are handled conservatively. The S black-rail cell is blank, but S silver rails are positively Standard; the model's appearance cell therefore quotes silver rails. SE's frameless-mirror cell is blank, but its framed auto-dimming mirror is positively Standard. Neither blank is used to fabricate an independent availability claim.

## Genuine unresolved information

| Field                      | Configurations                  | Reason                                                                                                                                                                                                                                                         |
| -------------------------- | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Curb weight                | SE R-Line Black FWD and 4MOTION | VW-T p. 2 labels 3,563/3,801 lb specifically for S/SE; do not carry those values into R-Line Black.                                                                                                                                                            |
| Head-up display            | All seven                       | Neither supplied document establishes availability.                                                                                                                                                                                                            |
| Cargo AC outlet            | All seven                       | VW-P p. 2 confirms a cargo **12-V** outlet, which does not establish an AC outlet.                                                                                                                                                                             |
| Radio/Bluetooth/USB detail | SEL R-Line Turbo                | VW-P p. 2 bundles these details into the 12.9-inch MIB4 row, marked dash for SEL. Its separate 15-inch row does not itemize them. Screen size, Harman Kardon, voice, phone connectivity and wireless charging are independently confirmed and remain Standard. |

The heated steering wheel with paddle shifters is Standard on SEL with an explicit delayed-availability caveat, not Unverified. Plug-in range/charging/DC charging are **Not Applicable** to the documented gasoline powertrains. Sunroof headroom and pricing limitations are qualifications rather than invented unknown equipment.

## Integration and review

The existing model page, four text-only trim cards, drivetrain selectors, categorized equipment, Trim Differences/Base Equipment, All Equipment, cross-model comparison, search and compact print reference are reused. No photo assets or placeholders are added. Optional model-local `additionalFields` extend the existing catalog and shared resolver; RAV4's field set and both RAV4 vehicle records stay unchanged. Comparisons include the union of selected models' fields; a field genuinely unresearched on a different model remains Unverified.

The compact print sheet is a summary with full source links; complete equipment and page citations remain in the online guide. The pull request contains validation/data/browser tests and build results. Deployment remains the existing manual workflow and is not invoked.

## CW41 order-guide supplement

The later bulk-import review of the supplied October 9, 2025 order guide adds source VW-O26 while preserving every existing verified cell and prior source reference. Its p. 22 Head-Up Display row resolves availability on all trims; its individual MIB4/radio/Bluetooth/USB rows resolve the earlier SEL media-detail gap. The earlier “genuine gaps” table describes the original two-PDF review, before this supplement. Technical values and ratings remain unchanged. See the [bulk-import report](imports/vw-my26-cw41-REPORT.md) for the source's three wheel-code discrepancies, source dates and ordering exceptions.
