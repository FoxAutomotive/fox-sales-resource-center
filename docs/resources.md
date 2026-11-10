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

### Full salesperson training PDFs

The ten completed salesperson PDFs supplied in `Fox_Automotive_Salesperson_Training_10_Modules.zip` are installed in `assets/training/full/`. Each file is copied byte-for-byte from its ZIP entry, with a descriptive module-number/title filename. The ten editable Word documents are not extracted into the repository or included in the site build. No PDF pages, formatting, examples, scripts, colors or tables are regenerated or edited.

All ten `fullTraining` fields point to the corresponding PDF. The existing **View Full Training** action appears beside Read Quick Guide and Print Quick Guide in the catalog and on each Quick Guide page. It opens a new tab (`target="_blank"`, `rel="noopener"`), leaving printing/downloading to the browser's PDF viewer. PDFs are not embedded in Quick Guides.

Validation accepts PDF paths directly under `assets/training/` or under `assets/training/full/`, rejects unsafe paths, and checks that referenced files exist and have a PDF header. The build copies the assets unchanged; the development server serves them as `application/pdf`.

See [the installed-file report](full-salesperson-training.md) and [source hashes/page counts](full-salesperson-training-files.json). All 68 supplied pages were checked against the previously supplied combined salesperson edition for identical extracted text and rendered pixels. These are the salesperson editions, not substitute trainer/classroom files. A manifest preservation hash checks that every resource property other than `fullTraining`, including Quick Guide wording, titles, numbering and formatting, remains unchanged.

Module 8 has a source-title discrepancy: the supplied Markdown says “Deal Structure & Objection Control”; the request names it “Deal Structure, Trade Control & Objection Isolation.” The catalog/document header uses the requested title and the source Markdown heading remains unchanged in the body.

No deployment or merge is part of this change. The completed training installation is delivered as a review pull request.
