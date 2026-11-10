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

Run `npm run validate`, `npm test`, `npm run test:extractor`, `npm run test:browser`, and `npm run build`. Build validation checks the manifest before copying it into `dist/` with `resources.js`. Browser tests check desktop/mobile navigation and reading, future entries, drafts, direct links, failures, print invocation and actual PDF output. PDF checks confirm Letter dimensions, complete training text, no navigation/actions or blank pages, and intact dialogue exchanges. The retained salesperson phone content has a regression fingerprint, and all ten approved Markdown strings have SHA-256 fingerprints checked against the supplied ZIP.

The initial resource contains the full Ask → Listen → Adjust → Appoint framework, all eight inbound script steps and four discovery scenarios, and the final reminder; manager-only coaching/evaluation is excluded from the salesperson-facing document. No vehicle catalog, offers, importer or Product Guide presentation changes are required.

## Fox Automotive Sales Playbook

The `sales-playbook` category contains ten published quick guides, sorted by `moduleNumber` (1–10). Category descriptions are optional. Each guide's `content` contains one `markdown` block whose `text` is the **verbatim UTF-8 source** from the approved ZIP, including its original heading and formatting. Edit that source only when new approved copy is supplied. The same escaped renderer powers reading and printing; there is no separate print copy. The renderer supports the supplied headings, italic/bold emphasis, line breaks and numbered lists. Existing block-based resources continue to work.

Catalog actions open `#/resources/sales-playbook-NN` and `#/resources/sales-playbook-NN?print`. The latter waits for rendering and fonts before opening the browser print dialog. Quick-guide print styles use portrait Letter paper and the existing Fox branding/footer, hide navigation/actions, and keep short sections intact. Actual browser-generated PDFs are checked for complete text, Letter size, no blank pages, and a maximum of three pages on desktop/mobile.

### Original full training is missing

The supplied PDF is `Fox_Automotive_Sales_Playbook_10_Quick_Guides.pdf`: **20 pages, two quick-reference pages per module**. It is not the requested `Fox_Automotive_Sales_Academy_All_10_Modules.pdf` (described in the request as 118 pages). Do not relabel these quick guides as full training. No original Academy module has been extracted or published.

All ten `fullTraining` values remain `null`; the site explains that the original Academy PDF is awaited. When that source arrives:

1. Identify the original module boundaries, including worksheets/coaching/evaluation pages; check any cover or table of contents separately.
2. Extract original pages without rewriting them, then verify complete content and correct boundaries in all ten outputs.
3. Place PDFs in `assets/training/` and set each corresponding `fullTraining` to its relative PDF path, for example `assets/training/Fox_Sales_Academy_Module_01_The_Standard.pdf`.
4. Validation rejects unsafe paths and missing/non-PDF targets. The build copies all assets. The development server serves PDFs as `application/pdf`.
5. The catalog and document then automatically show **View Full Training** links with `target="_blank"` and `rel="noopener"`. Verify actual PDF viewing, downloading and printing after supplying the source.

Module 8 has a source-title discrepancy: the supplied Markdown says “Deal Structure & Objection Control”; the request names it “Deal Structure, Trade Control & Objection Isolation.” The catalog/document header uses the requested title and the source Markdown heading remains unchanged in the body.

No deployment or merge is part of this change. The PR remains draft until the missing original training source can be supplied and verified.
