# Chevrolet seven-guide import review

Reviewed November 13, 2026. Branch starts at main `327d578`.
No merge or deployment is part of this change.

## Coverage

| Model year / model | Factory trims                                           | Configurations |
| ------------------ | ------------------------------------------------------- | -------------: |
| 2026 Equinox       | LT, ACTIV, RS; FWD/AWD                                  |              6 |
| 2027 Equinox       | LT, ACTIV, RS; FWD/AWD                                  |              6 |
| 2026 Blazer        | 2LT, 3LT, RS; FWD/AWD; RS additionally selected 3.6L V6 |              8 |
| 2026 Traverse      | LT, Z71, High Country, RS; FWD/AWD except Z71 AWD       |              7 |
| 2027 Traverse      | SL, LT, Z71, High Country, RS; FWD/AWD except Z71 AWD   |              9 |
| 2026 Trax          | LS, 1RS, LT, 2RS, ACTIV; FWD                            |              5 |
| 2027 Trax          | LT, RS, ACTIV; FWD                                      |              3 |

Total: seven distinct model-years, 26 model-year trim names, 44 configurations.
2026 Equinox replaces its empty awaiting-verification placeholder. Five other
model-year records are added. The existing verified 2027 Equinox is reverified
against the new workbook and preserved exactly, including its previously verified
same-year horsepower/torque supplement and original references. Shared source
claims match; two equipment rows merely changed position. No duplicate records.

All 34 Toyota/Volkswagen vehicle records, plus the existing 2027 Equinox, are
protected by exact semantic hashes. The catalog contains 41 verified model guides.
Navigation, specials, resources, shared pop-ups, and importers for Toyota/VW are
unchanged. The only shared presentation change allows an optional shorter cited
change summary in the existing printable reference; full online data is retained.

## Evidence and review artifacts

- Original seven XLSX files: `sources/gm/`, preserved byte-for-byte, SHA-256 pinned.
- Reviewed layouts/configurations: `profiles/imports/gm-reviewed/`.
- Neutral source stages: `imports/gm-seven-2026-2027/`.
- Batch report: `gm-seven-2026-2027-report.json` and `gm-seven-2026-2027-REPORT.md`.
  These contain per-configuration counts, excluded/nonstandard source rows,
  selection derivations, missing fields, conflicts, source cells, and preservation
  hashes. Raw footnotes and manufacturer restrictions remain accessible in View
  Sources. Spreadsheet claims cite worksheet/cell addresses, not invented pages.

Across the 44 Chevrolet configurations, 4,473 catalog cells are Standard (including
shared standardized categories and source-row entries, not 4,473 unique feature
codes). The six newly generated guides account for 3,933 of those cells; the
existing 2027 Equinox contributes 540 unchanged Standard cells.

The existing standard-only sales presentation is retained: optional or unavailable
items do not appear as standard. Original S/A/--/blank indicators and restrictions
remain in source stages and verification notes. Standard-package content is
included only when explicitly established for that configuration. A conflicting
child row stays unresolved; no equipment inheritance between trims or years.
Dealer-installed accessories and administrative order controls are excluded from
factory-standard equipment. No invoice pricing is imported or published.

## Important verified distinctions

- **Equinox:** 2026 FWD CVT versus AWD eight-speed; 2027 source specifies an
  eight-speed for both. The 2026 workbook supplies no engine output: it remains
  unverified instead of inheriting 175 hp / 203 lb-ft from 2027.
- **Blazer:** standard RS 2.0L Turbo is explicitly unavailable at start of
  production. The selected RS 3.6L V6 configurations remain separate. Engine,
  transmission variant, AWD system, axle, cooling and required trailering equipment
  follow explicit source restrictions. Ratings: base 2.0L FWD 1,500 lb; 2.0L AWD
  3,250 lb; correctly equipped selected V6 4,500 lb. Read source loading/equipment
  conditions before quoting a tow rating.
- **Traverse:** standard seven-seat layouts remain separate from available
  eight-seat layouts. Both years document 328 hp / 326 lb-ft and standard tow
  equipment supporting a 5,000-lb maximum with manufacturer loading conditions.
  Super Cruise is standard on High Country/RS with the stated three-year included
  service, rather than being assumed standard across the range.
- **Trax:** 2026 has five trims and 137 hp; 2027 has LT/RS/ACTIV and 140 hp. Torque
  RPM differs. 2027 adds standard Adaptive Cruise Control, enhanced safety systems,
  11.3-inch Google Built-In infotainment and an 11-inch Driver Information Center.
  Optional LT heated seats/wheel are not shown as standard.
- Meaningful differences and Why Upgrade use verified standard gains and matched
  configurations. The full source Highlights are retained for year-specific
  change notes; they are manufacturer statements rather than an assumed redesign.

## Unresolved information / manufacturer confirmation needed

- **2027 Traverse SL identity:** equipment headers call 1SL/2SL “LT”; Specs and
  Color and Trim call them “SL.” They remain separate source groups, visibly
  documented in View Sources and drivetrain verification notes. Confirm the
  retail trim name and orderability before quoting.
- **Traverse enhanced Lane Keep Assist (UKM), both years:** Safety Package 1 lists
  it as included while High Country/RS component cells say `--` (four affected
  configurations each year). No assumption about Super Cruise replacing it is
  made. Manufacturer correction is required. Report ambiguity counts include
  both package-level and row-level checks, not eight distinct conflicting systems.
- **2027 Traverse High Country** is explicitly late availability at Color and
  Trim!A21. The unscoped trailering late-availability note is also preserved. No
  production dates are inferred. Blazer RS 2.0L has the start-of-production
  restriction above.
- EPA fuel economy and MSRP are missing from these supplied sources. Equinox and
  Trax towing ratings are not supplied. 2026 Equinox horsepower/torque, Equinox
  ground clearance, Traverse fuel/curb-weight figures and Blazer RS 2.0L TBD curb
  weights remain unresolved where applicable. See each report's complete
  `unverifiedFields` list, including genuinely undocumented equipment categories.
- Traverse interior material choices do not consistently identify a standard
  material for LT/SL. Supported palette choices remain visible, without selecting
  one as standard. Paint built-out/unavailable restrictions are preserved; numeric
  footnotes alone never establish an extra-cost paint.
- Some source change notes repeat the same system description on both sides
  (2027 Trax Lane Keep Assist/heated wheel) without explaining a difference.
  Manufacturer clarification is needed to describe those as a meaningful update.

Needed supplements are model-year-specific Chevrolet technical/EPA and retail
pricing documents, plus clarification of the Traverse naming/UKM contradictions
and late-availability dates. Missing facts have not been invented.

## Reuse

See `scripts/import/GM-XLSX.md`. The existing batch/review/digest-checked apply
workflow now supports source-bound profiles for these additional GM sheet
layouts. Future exports need independent source/layout/configuration review and
new pinned fingerprints; presentation code and trim arrays do not need to be
recreated. A new model year never inherits unsupported prior-year facts.

## Validation

- `npm run validate`: 41 verified model guides; passed.
- `npm test`: 119 passed.
- `npm run test:extractor`: 20 passed.
- `npm run test:browser`: 63 passed with pinned Chromium, including all 44
  Chevrolet configurations at desktop/mobile, independent model-year comparisons,
  all 41 one-page Letter printable guides, accessibility, and existing Toyota/VW,
  Resources, training PDFs, navigation and Current Specials regressions.
- `npm run build`: passed.
- Complete seven-file CLI reimport: six unchanged, one reverified, zero catalog
  changes or duplicates.
- Changed-file formatting and `git diff --check`: passed.
- Repository-wide `npm run format:check`: 14 pre-existing Toyota report/extraction
  artifacts still warn. Each is byte-identical to main and also fails formatting
  there; they were preserved to keep this import scoped to Chevrolet. This command
  is not part of the Site checks workflow. No validation or test check was removed.
