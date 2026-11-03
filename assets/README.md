# Brand artwork

The original Fox Automotive logo and Axel artwork are required to finish the requested branding. Images embedded in the original chat were not available as downloadable local files. Do not treat the typographic header or text panel as the supplied official artwork.

1. Add the supplied, approved files locally, preferably optimized PNG/WebP with real transparency for Axel. A checkerboard visible in an image may be baked into the pixels; check the original file before use.
2. Use `assets/fox-logo.png` and `assets/axel.png` (or other local supported image formats).
3. Set `branding.logo` and `branding.axel` in `data/catalog.json` to `./assets/fox-logo.png` and `./assets/axel.png` respectively.
4. Run validation, open the homepage on desktop and mobile, and confirm legibility. The logo uses `object-fit: contain`; Axel is a supporting homepage image.

Until configured, the site makes no missing-artwork requests and displays deliberate text fallbacks. It never substitutes externally hosted artwork or an invented mascot. `favicon.svg` is a simple site initial, not the official Fox logo.

Manufacturer marks are small locally drawn SVG representations used with text labels. Replace with approved manufacturer assets if brand standards require it; the `marks` map in `app.js` controls these shapes.
