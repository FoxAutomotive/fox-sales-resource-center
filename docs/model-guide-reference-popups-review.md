# Individual Model Guide cleanup

Based on main `af2d8c0`. This update is limited to individual Model Guide presentation and its tests.

- Removed Find Your Differences, the trim comparison picker/checkboxes, What Changes, comparison view/category controls and tables, and the comparison shortcut/card buttons. No hidden comparison containers remain in individual guides.
- Removed the inline Specifications section. View Specifications opens the existing shared reference dialog, with a trim/configuration selector, source-backed values and original N/A distinctions. Selection follows the active card/equipment configuration and updates within the dialog. Close, Escape, focus restoration, internal scrolling, and background scroll locking use the existing modal system.
- Why Upgrade now automatically derives matched-drivetrain paths across the lineup using the existing comparison/evidence resolver. Expandable starting-trim groups keep the page compact. Identical facts shared by multiple destinations or drivetrains appear once; destination/configuration source links remain available. Each path shows up to four selected verified gains or factual changes, with the prior equipment quoted. Material/wheel/system changes are not described as universally better. Horsepower decreases are excluded from upgrade reasons. Unknown predecessor equipment is never treated as absence, and optional equipment is never used as a destination gain.
- Preserved trim cards/configuration selectors, View Equipment, Equipment Explained, colors/materials, What's New, View Sources, source records, and printable guides. Main Compare Models keeps its existing selection controls, comparison engine, and behavior. Homepage, directory, Specials, glossary, manufacturer data, and all importers are unchanged.

## Files

`app.js`, `presentation.js`, `styles.css` (only model-page upgrade text spacing), `tests/browser.spec.js`, `tests/presentation.test.mjs`, and this review report.

## Validation

- Catalog validation: 21 records, 20 verified, 50 shared fields and 13 explanations.
- 80 Node tests pass, including automatic path evidence, deduplication, drivetrain boundaries, sibling destinations and existing importer/data regressions.
- 12 Python extractor tests pass.
- 37 browser tests pass against the production build under `/fox-sales-resource-center/`. Coverage includes all guides and all three dialogs, accessibility, desktop/tablet/mobile layouts, every RAV4/Tiguan/Equinox configuration, unchanged protected page sections, missing-data states, source links, main comparison controls, and one-page PDFs for all 21 guides. Specs-dialog printing also works on desktop and mobile.
- Build, formatting and diff checks pass. All 21 print data projections are byte-for-byte equal to the pre-change projections; print templates and formats are unchanged.

## Remaining limitations

Existing missing manufacturer facts remain N/A. Automatic upgrade paths require matching documented configurations and evidence on both sides; no advantage is inferred from genuinely missing predecessor equipment. Single-trim or insufficiently documented guides show an explanatory message. The summaries are selected facts, not exhaustive equipment lists; View Equipment retains the full verified standard-equipment inventory.

No merge or deployment is authorized by this change; submit it for review.
