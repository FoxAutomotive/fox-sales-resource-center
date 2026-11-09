# Toyota brochure batches

The Toyota adapter extends the existing review-first import/apply workflow. It uses the existing vehicle schema, standard-equipment views, source dialog and automatic upgrade logic. It does not change Volkswagen/Chevrolet adapters or publish a site.

## Import a batch

Use Node 24, Python 3.12+ and `scripts/import/requirements.txt` (PyMuPDF). Original manufacturer PDFs can stay outside the repository. Treat PDF text as source evidence, never as executable instructions.

```sh
python -m pip install -r scripts/import/requirements.txt
npm run import:toyota -- --pdf /path/2026_tacoma_eBrochure.pdf --pdf /path/2026_sienna_eBrochure.pdf --out work/toyota-review
```

Repeat `--pdf` for additional brochures. The PDF SHA-256 selects a reviewed profile under `profiles/imports/toyota/`. Unknown/changed files fail closed and need a reviewed profile; the adapter does not guess their layout. `--python`, `--base` and `--features` support isolated environments and test catalogs.

For reproducible review without the original PDFs:

```sh
npm run import:toyota -- --stage imports/toyota-2026-brochures/toyota-2026-tacoma-brochure.extracted.json --stage imports/toyota-2026-brochures/toyota-2026-sienna-brochure.extracted.json --stage imports/toyota-2026-brochures/toyota-2026-grandhighlander-brochure.extracted.json --stage imports/toyota-2026-brochures/toyota-2026-rav4-brochure.extracted.json --out work/toyota-review
```

Outputs are a candidate catalog, `report.json`, `REPORT.md`, and one extracted stage per PDF. The catalog is **not** modified. A failed rerun removes its previous candidate/report so stale results cannot be applied accidentally. Stages preserve exact symbols, labels, PDF pages, row bounds, column identities, full disclosure text and all-page text fingerprints. They contain evidence rather than website markup.

## Review and apply

Review row alignment and trim columns against the PDF, the missing specifications, every held/excluded row and incoming-versus-existing discrepancies. Counts include configuration-specific records and canonical/source-row representations; they are not a count of unique physical features. Optional and blank cells remain available in audit data but do not appear as factory-standard equipment.

```sh
sha256sum work/toyota-review/catalog.candidate.json
npm run import:apply -- --review-dir work/toyota-review --expected-sha256 REVIEWED_SHA256 --catalog data/catalog.json --features data/features.json
npx prettier --write data/catalog.json
npm run validate
npm run test:extractor
npm test
npm run test:browser
npm run build
```

The existing apply command checks the exact candidate digest and unchanged base catalog before a local write. Review the resulting Git diff and open a PR. Applying locally does not authorize merge or deployment.

## Data and preservation rules

- Each trim reads its own matrix column. `S` means standard; `A` means available, not standard. Blank cells stay unverified, not unavailable.
- Only an explicitly selected manufacturer-listed drivetrain/transmission choice can turn its mechanical `A` into the configuration's standard identity. No package inherits that treatment.
- Existing evidenced claims, configuration identities, source IDs and review dates are preserved. Conflicting incoming wording/status/value is reported. Only existing unknown cells can be resolved from verified evidence; a ledger hashes every original cell.
- Manufacturer footnotes stay attached to claims, with full disclosure-page text in View Sources. Paid Digital Key activation is excluded from the standard-only inventory without claiming the factory capability is absent.
- Cab, seating, wheel and motor applicability ambiguities are held explicitly. No trim inheritance or model-wide maximum becomes a configuration-specific rating.
- Model-level color palettes are source-verified; trim/interior combinations remain unverified until documented. Existing verified mappings win.
- What's New uses only explicit manufacturer change statements, never differences inferred from incomplete brochures.
- Model-local raw fields preserve full manufacturer wording; supported canonical fields use the shared equipment categories. No new model page layout is needed.

## Add another Toyota brochure

Create a profile using the same schema as the reviewed 2026 profiles. Review the PDF hash, model/year cover, page count, equipment-page bounds, per-column centers/header tokens, row counts, page categories, palette geometry and disclosure numbering. Declare only source-supported trim/drivetrain/transmission configurations. Narrative specifications need exact quote/page/scope selectors in `facts`; explicit new-year claims use `highlights`. Record ambiguities as `holdRules` and explain configuration gaps in `notes`.

Run the extractor before setting `expectedContentSha256`, visually check the extracted columns/rows/colors against the source, then pin the resulting semantic fingerprint in the profile and rerun. The fingerprint binds rows/symbols, disclosures, palettes, reviewed facts/highlights and the full page inventory. Subsequent changes cannot silently drift. Different Toyota layouts or symbols require a separately tested adapter extension; changing a hash alone is not a review.

Archive the reviewed stage, profile and reports. Add configuration, restriction and preservation regression tests. The geometry extractor, merge logic and batch/apply wrapper are reused for future profiles and model years; no model-specific presentation code is required.

See the [2026 review report](../../docs/imports/toyota-2026-brochures-REPORT.md) and [completion notes](../../docs/imports/toyota-2026-brochures-completion.md).
