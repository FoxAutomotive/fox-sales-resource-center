# Fox Automotive Sales Resource Center

A fast, responsive, static product reference for the Fox Chevrolet, Fox Toyota, and Fox Volkswagen sales teams in Rochester Hills, Michigan. Compatible with GitHub Pages at `https://foxautomotive.github.io/fox-sales-resource-center/`.

## Current status

The website architecture is implemented: manufacturer/year navigation, global search and filters, equipment glossary, model guides, evidence-gated comparisons, upgrade/package sections, landscape Letter quick references, and a Coming Soon page for Manager’s Specials.

**RAV4 HEV research is now brochure-backed.** The 2026 guide covers six hybrid grades and nine FWD/AWD configurations, with standard and available equipment checked against the supplied Toyota brochure. Eight package names are verified; their itemized contents, combinations and prices remain explicitly unverified because the brochure does not enumerate them. Conflicting torque/MPG claims remain unverified. A separate RAV4 Plug-in Hybrid reference contains only supported press-release details; the HEV equipment table is not applied to PHEVs. Tiguan, Equinox, the remaining 2026 lineup and all 2027 model-year research remain pending. See [RAV4 source review](docs/2026-RAV4-SOURCES.md).

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
npm test               # 17 data/search/comparison validation tests
npm run test:browser   # 17 Chromium functional/layout/print/accessibility tests
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
