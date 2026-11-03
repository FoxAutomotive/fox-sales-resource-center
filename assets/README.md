# Brand artwork

The official images uploaded to `main` are included without pixel changes:

| Local file     | Original uploaded filename                     |
| -------------- | ---------------------------------------------- |
| `fox-logo.png` | `fox-automotive-logo%2820261103-181909%29.png` |
| `axel.png`     | `axle%20sales%20guy%286%29.png`                |

`branding.logo` and `branding.axel` in `data/catalog.json` reference these files. The logo appears in the header; Axel appears on the homepage on desktop and mobile. Paths are relative so they work under the GitHub Pages repository subpath.

The header's CSS frame removes only the logo image's outer white margins from the displayed area; the original PNG is preserved and the full mark remains visible. Axel is displayed as supplied, including its light checkerboard background. Neither source file has been redrawn, cropped, or otherwise edited.

To replace artwork, add the approved file locally, update its catalog path if necessary, and verify desktop and mobile layouts. When paths are null or an image fails to load, the existing text fallbacks remain available. `favicon.svg` is a simple site initial, not the official Fox logo.

Manufacturer marks are small locally drawn SVG representations used with text labels. Replace with approved manufacturer assets if brand standards require it; the `marks` map in `app.js` controls these shapes.
