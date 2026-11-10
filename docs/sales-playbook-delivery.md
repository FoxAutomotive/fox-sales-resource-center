# Sales Playbook delivery report

Status: quick-guide implementation prepared for review. **Not merged or deployed.** Full original training is blocked on the missing Sales Academy PDF.

## Quick guides

All ten approved Markdown strings are retained verbatim in `data/resources.json`; SHA-256 regression checks verify equality with the supplied ZIP. Reading and printing share the same DOM and source. The Resources link already existed and is reused without duplicate navigation. The Playbook is one catalog section, ordered numerically, with the requested description and meaningful module summaries.

| Module                                                 | Quick-guide route               | Full Academy PDF         |
| ------------------------------------------------------ | ------------------------------- | ------------------------ |
| 1. The Standard                                        | `#/resources/sales-playbook-01` | Awaiting original source |
| 2. Types of Guests                                     | `#/resources/sales-playbook-02` | Awaiting original source |
| 3. The First Five Minutes                              | `#/resources/sales-playbook-03` | Awaiting original source |
| 4. Needs Assessment                                    | `#/resources/sales-playbook-04` | Awaiting original source |
| 5. Vehicle Presentation                                | `#/resources/sales-playbook-05` | Awaiting original source |
| 6. The Test Drive                                      | `#/resources/sales-playbook-06` | Awaiting original source |
| 7. The Commitment Close                                | `#/resources/sales-playbook-07` | Awaiting original source |
| 8. Deal Structure, Trade Control & Objection Isolation | `#/resources/sales-playbook-08` | Awaiting original source |
| 9. Protect the Yes                                     | `#/resources/sales-playbook-09` | Awaiting original source |
| 10. Professional Discipline                            | `#/resources/sales-playbook-10` | Awaiting original source |

## Source issues and outstanding work

The uploaded `Fox_Automotive_Sales_Playbook_10_Quick_Guides.pdf` contains 20 quick-reference pages, two per module. It does not contain the complete original Academy modules, worksheets, manager instructions or evaluation/sign-off pages requested in the brief. `Fox_Automotive_Sales_Academy_All_10_Modules.pdf` was not attached. **Zero full-training PDFs have been extracted.** Their boundaries and completeness cannot be verified without that source. Each guide currently explains that full training awaits the original Academy PDF; no incorrect or dead full-training links are presented.

Once supplied, extract ten complete original modules into `assets/training/` and populate each `fullTraining` manifest entry. Links are already implemented and tested to use the corresponding PDF path and open a new tab. Validation checks safe PDF paths and that referenced targets exist and have PDF headers. Reading/downloading/printing the actual original PDFs remains unverified until they are supplied.

Module 8's source heading is “Deal Structure & Objection Control”; the requested library title is “Deal Structure, Trade Control & Objection Isolation.” The library/header follows the request; the Markdown source retains its original heading without editing.

## Existing phone training and website scope

The inbound phone training remains a separate resource. Only the top-level “Part Three: Manager Coaching” section was removed, including manager evaluation and manager training expectations. The framework, established scripts, discovery/timing questions, trade/lease scenarios, conditional appointments, objections, follow-up and final reminder remain unchanged. Their retained content has its own regression fingerprint.

No homepage, model data, vehicle specifications, equipment, comparison, specials, inventory or importer code was changed. Changes to shared application code are confined to Resources rendering/actions. Existing print styles remain intact; quick-guide additions are scoped to quick guides.

## Printing and verification

The catalog's Print Quick Guide action opens the matching reading page and invokes browser print after fonts/rendering are ready. Each reading page also has Print / Save as PDF and Back to Resources actions. Letter portrait paper, Fox branding, professional margins, hidden navigation/actions and section break protection use the same document as the website.

Verified locally:

- `npm run validate`: passed.
- `npm test`: 95 tests passed.
- `npm run test:extractor`: 16 tests passed.
- `npm run test:browser`: 49 tests passed, including existing model-guide, comparison, specials, navigation, accessibility and Resources regressions.
- `npm run build`: passed; the production static bundle includes the updated manifest and renderer.
- Each of the ten guides generated **exactly two Letter pages** at both 1280px and 390px browser widths (20 PDFs checked). Tests verified full on-screen text in the PDFs, no blank pages, correct paper dimensions, hidden navigation/actions, both print entry points and Back to Resources.
- Full-training link mapping/new-tab attributes were tested with a fixture manifest. Actual original-training content and PDF interactions are blocked by the missing source.
- Approved Markdown fingerprints passed for all ten modules. Desktop output was visually reviewed; mobile overflow checks passed.

The ten quick-guide routes above are implemented in the review branch, not published to the live site.
