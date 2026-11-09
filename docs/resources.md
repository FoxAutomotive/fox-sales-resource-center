# Resources library

The Resources link opens `#/resources`. Published entries are grouped by their category; empty categories are omitted. Each entry has a direct route at `#/resources/RESOURCE_ID`. Draft and missing IDs show an unavailable message and a link back to the library.

## Add or update a resource

Edit `data/resources.json`. No route, page template or PDF copy needs to be added. The catalog supports Sales Training, Forms & Documents, and Quick Reference. Add a category record when another category is needed.

Each resource includes:

- `id`: unique lowercase, hyphenated identifier used in its URL.
- `title`: library title; `heading`: document title; optional `subtitle`.
- `category`: a category ID from the manifest.
- `description`: short library description.
- `published`: `true` to list and expose the resource, `false` to withhold it from the interface.
- Optional `revisedOn`: valid ISO date, displayed in the document header.
- `content`: the document blocks described below.

Example:

```json
{
  "id": "appointment-checklist",
  "title": "Appointment checklist",
  "heading": "Appointment checklist",
  "category": "quick-reference",
  "description": "Prepare for an agreed customer visit.",
  "published": true,
  "content": [
    {
      "type": "section",
      "title": "Before the visit",
      "blocks": [
        {
          "type": "list",
          "items": [
            "Confirm the appointment.",
            "Prepare the vehicle information."
          ]
        }
      ]
    }
  ]
}
```

## Content blocks

- `section`: `title`, child `blocks`, and optional `note: true` for training notes. Headings nest automatically beneath the document title; keep nesting at five levels or fewer.
- `paragraph`: `text`.
- `list`: nonempty `items` of text.
- `exchange`: `turns`, each with `speaker` (`Salesperson` or `Customer`) and `paragraphs`. Group a question and response together to keep the example intact in print.
- `table`: `headers` and `rows` with matching column counts. First-column cells are row headings.

Text supports `**bold**` emphasis. HTML is escaped. The same renderer and document are used for reading and printing. `resources.js` provides grouping, validation and rendering; `app.js` only loads the catalog and connects routes/actions. Loading failures are isolated from vehicle guides and offers, with retry and stale-request protection.

## Printing and validation

Print / Save as PDF calls the browser's print interface. Scoped CSS uses portrait Letter paper with 0.65-inch margins, removes website navigation/footer/buttons, retains headings and notes with Fox Automotive page footers and page numbers, and avoids page breaks inside dialogue exchanges and table rows. Model Guide print styles and landscape Letter references are preserved.

Run `npm run validate`, `npm test`, `npm run test:extractor`, `npm run test:browser`, and `npm run build`. Build validation checks the manifest before copying it into `dist/` with `resources.js`. Browser tests check desktop/mobile navigation and reading, future entries, drafts, direct links, failures, print invocation and actual PDF output. PDF checks confirm Letter dimensions, complete training text, no navigation/actions or blank pages, and intact dialogue exchanges. The original resource's 221 prose/list/table entries also have a regression fingerprint verified against the supplied training text.

The initial resource contains the full Ask → Listen → Adjust → Appoint framework, all eight inbound script steps and four discovery scenarios, manager coaching/evaluation, and the final reminder. No vehicle catalog, offers, importer or Product Guide presentation changes are required.
