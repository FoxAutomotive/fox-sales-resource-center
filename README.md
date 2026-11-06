# Fox Automotive Sales Resource Center

A fast, responsive, static product reference for the Fox Chevrolet, Fox Toyota, and Fox Volkswagen sales teams in Rochester Hills, Michigan. Compatible with GitHub Pages at `https://foxautomotive.github.io/fox-sales-resource-center/`.

## Current status

The website architecture is implemented: manufacturer/year navigation, global search and filters, equipment glossary, model guides, evidence-gated comparisons, upgrade/package sections, landscape Letter quick references, and a Coming Soon page for Manager’s Specials.

**RAV4 HEV research is now brochure-backed.** The 2026 guide covers six hybrid grades and nine FWD/AWD configurations, with standard and available equipment checked against the supplied Toyota brochure. Eight package names are verified; their itemized contents, combinations and prices remain explicitly unverified because the brochure does not enumerate them. The brochure’s explicit maximum torque is quoted with its unspecified basis; conflicting MPG ratings remain unverified. Plug-in-specific HEV fields are labeled not applicable. See the [complete cell-level audit](docs/audits/2026-rav4-hybrid-audit.md). A separate RAV4 Plug-in Hybrid reference contains only supported press-release details; the HEV equipment table is not applied to PHEVs. Volkswagen order-guide imports now cover the 2026 lineup and eight 2027 models; see the [2027 import and year-change review](docs/imports/vw-my27-retail-cw43-REPORT.md). Equinox and unprovided model-year documentation remain pending. See [RAV4 source review](docs/2026-RAV4-SOURCES.md).

The official Fox Automotive logo appears in the header and Axel appears on the homepage on desktop and mobile. The original uploaded images are stored locally as `assets/fox-logo.png` and `assets/axel.png`; their paths are configured in `data/catalog.json`. See [artwork instructions](assets/README.md). Manufacturer navigation uses lightweight local SVG representations and accessible brand names.

## Develop locally

Node.js 24 or newer is recommended (development tools only). The website itself has **no runtime dependencies, external fonts, API keys, databases, or paid services**.

```sh
cd /workspace/fox-sales-resource-center
npm ci
npm run dev
```

The server listens on port 4173 and supports both `/` and `/fox-sales-resource-center/`. Open the latter path on your local machine when checking GitHub Pages compatibility. Do not double-click `index.html`: ES modules and JSON loading need an HTTP server.

Each cloud task already has an isolated checkout. Work in the existing repository; do not create a worktree unless explicitly requested. Live development processes must be restarted after environment restoration. No environment or website publication is performed by these commands.

```sh
npm run validate       # Verify catalog schema and source-evidence requirements
npm test               # 35 data/search/comparison validation tests
npm run test:browser   # 31 Chromium functional/layout/print/accessibility tests
npm run build          # Validate and copy only production files into dist/
```

Browser tests use `/usr/bin/chromium` locally. Set `CHROMIUM_PATH` to your installed Chromium/Chrome executable if needed. In CI, install the matching browser with `npx playwright install --with-deps chromium`; the configuration uses Playwright’s browser when `CI=true`. Sandbox environments may require permission to open a local port and launch Chromium.

Test-only synthetic equipment is isolated in `tests/fixtures.mjs` and intercepted inside browser tests. **It is never included in `dist/` or the production data.** PDF and screenshot outputs are generated under ignored `test-results/`.

## Repository map

| Path                       | Purpose                                                     |
| -------------------------- | ----------------------------------------------------------- |
| `index.html`, `styles.css` | Accessible shell, responsive design, print styling          |
| `app.js`                   | Hash routes, page rendering, controls, and print views      |
| `lib.js`                   | Shared evidence, search, and comparison rules               |
| `data/catalog.json`        | Manufacturers, model years, fields, configurations, sources |
| `data/features.json`       | Expandable equipment explanations                           |
| `assets/`                  | Local artwork and favicon                                   |
| `scripts/`                 | Static server, validation, production build                 |
| `tests/`                   | Data tests, browser flows, synthetic fixtures               |
| `.github/workflows/`       | CI checks and an optional manual Pages deployment           |

## Stage 1 product guides

The primary navigation separates Model Guides, Compare Trims, Compare Vehicles, Equipment Search, and Manager’s Specials. Compare Vehicles and Equipment Search have clearly marked Stage 2 landing pages with links to working tools; the existing comparison engine and global search remain available.

Verified model guides group configuration records into trim cards. Each card shows the selected configuration’s engine, output, drivetrain, economy, and up to five source-backed standard highlights. Highlights favor documented differences, but are not exclusive-equipment claims. Configuration selectors never inherit facts from another configuration. View Equipment opens the matching categorized details; Compare Trims adds that configuration to the existing two-to-four selection workflow.

Performance, Comfort, Technology, Safety, Convenience, Exterior, and Packages expand independently. All existing fields, availability labels, conditions, glossary links, source references, and package caveats remain available. Pending guides remain evidence-gated. The RAV4’s six HEV grades demonstrate the layout, separately from PHEV.

Trim cards are complete without vehicle photography: model-year/brand context, trim title, configuration, core specifications, equipment highlights, and actions fill the card without reserved image space or placeholders. Photography is deferred until manufacturer-approved files are provided. No vehicle photos are downloaded or published in this change.

The optional future `trim.image` hook remains available. Add a local file under `assets/vehicles/<manufacturer>/<year>/<model>/` and metadata with `src`, descriptive `alt`, matching `modelYear` and `trimName`, verified `sourceIds`, and any required `credit`. No card code changes are needed. Records belong to the existing manufacturer/model-year/model/trim in `data/catalog.json`; no equipment claims change. Verify permissions for the intended use and any derivatives before adding files. The renderer accepts local assets only; missing, unverified, mismatched, or failed images reserve no space. Fox branding, Axel, comparison behavior, and print references remain intact.

## Compare trims

Model guides and the existing comparison workspace (`#/compare`) open in **Trim Differences**. Choose two to four configurations; model guides include a **Choose trims to compare** picker. **Base Equipment** stays visible and identifies the baseline trim, showing its verified standard specifications that do not change. **What Changes** contains only differing equipment or availability, including the baseline value when a core specification changes. Each equipment field appears in just one section. **All Equipment** restores the complete comparison as a separate view.

The baseline updates automatically. Verified upgrade relationships identify the lowest selected grade where possible; catalog order breaks configuration ties. When there is no verified ordering, the fallback is stated. Different models or years use a clearly labeled catalog-order reference rather than an invented shared trim rank. No equipment is assumed to carry over. Different availability or verification statuses remain visible, including known-versus-Unverified comparisons. An unknown is not proof that a feature is absent. Differing package/option listings retain their contents and conditions; missing listings remain Unverified. **Why Upgrade?** displays existing source-authored upgrade text only for configuration-matched trim pairs. The full model guide and its print sheet remain independent of the selected comparison subset.

## Update the product library

Read [the maintenance guide](docs/MAINTAINING.md) before adding claims. Add a new model-year record to `data/catalog.json`; the UI, search, comparison picker, and print view discover it automatically. Never copy equipment into a new model year without reviewing that year’s official U.S. documentation.

A link is not proof that someone reviewed a source. Source records have separate `research-target` and `verified` states, review dates, and model years. Each verified trim, equipment claim, package, and upgrade gain must cite reviewed source IDs. Unknown information stays unverified. `npm run validate` rejects inconsistent evidence.

## Publish to GitHub Pages

Publishing is a separate, deliberate action; it has **not** been performed.

1. Review the site, current content limitations, source records, and artwork. Commit and push the reviewed files to the repository. Ordinary pushes run checks only, not deployment.
2. In repository **Settings → Pages → Build and deployment**, select **GitHub Actions** as the source. This requires repository administration access.
3. In **Actions → Deploy GitHub Pages → Run workflow**, select the branch containing the reviewed site and run the workflow manually.
4. The workflow installs locked development dependencies, validates data, runs unit tests, builds `dist/`, uploads it, and deploys with GitHub’s Pages actions.
5. After deployment succeeds, verify the project URL, direct hash links, search, mobile navigation, and a printed model guide. Do not claim deployment succeeded until GitHub reports it.

Alternatively, upload the contents of `dist/` using your own existing Pages workflow. All production URLs are relative; do not add a leading slash to assets or JSON paths. Hash routes do not need a server rewrite or custom 404 handler.

## Accuracy and public access

This is an internal reference hosted on a **public** website. Do not commit customer information, employee data, credentials, confidential pricing, private documents, or unapproved offers. Confirm actual equipment against the vehicle’s window sticker. Service availability, driver-assistance limitations, packages, and drivetrain conditions must remain visible.

Manager’s Specials intentionally has no offer-entry or publishing functionality.
