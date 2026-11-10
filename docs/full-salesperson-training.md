# Full salesperson training installation

Source: `Fox_Automotive_Salesperson_Training_10_Modules.zip`, supplied November 10, 2026. Ten individual PDFs were copied directly from the ZIP; files were renamed to identify the module number and title. PDF bytes were not rewritten, split, summarized, reformatted or regenerated. The ten Word documents were not extracted into the repository or published.

| Module | Title                                               | Pages | Installed PDF                                                                                                                                                                                                      |
| -----: | --------------------------------------------------- | ----: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
|      1 | The Standard                                        |     7 | [Fox_Salesperson_Training_Module_01_The_Standard.pdf](../assets/training/full/Fox_Salesperson_Training_Module_01_The_Standard.pdf)                                                                                 |
|      2 | Types of Guests                                     |     6 | [Fox_Salesperson_Training_Module_02_Types_of_Guests.pdf](../assets/training/full/Fox_Salesperson_Training_Module_02_Types_of_Guests.pdf)                                                                           |
|      3 | The First Five Minutes                              |     6 | [Fox_Salesperson_Training_Module_03_The_First_Five_Minutes.pdf](../assets/training/full/Fox_Salesperson_Training_Module_03_The_First_Five_Minutes.pdf)                                                             |
|      4 | Needs Assessment                                    |     6 | [Fox_Salesperson_Training_Module_04_Needs_Assessment.pdf](../assets/training/full/Fox_Salesperson_Training_Module_04_Needs_Assessment.pdf)                                                                         |
|      5 | Vehicle Presentation                                |     6 | [Fox_Salesperson_Training_Module_05_Vehicle_Presentation.pdf](../assets/training/full/Fox_Salesperson_Training_Module_05_Vehicle_Presentation.pdf)                                                                 |
|      6 | The Test Drive                                      |     5 | [Fox_Salesperson_Training_Module_06_The_Test_Drive.pdf](../assets/training/full/Fox_Salesperson_Training_Module_06_The_Test_Drive.pdf)                                                                             |
|      7 | The Commitment Close                                |     6 | [Fox_Salesperson_Training_Module_07_The_Commitment_Close.pdf](../assets/training/full/Fox_Salesperson_Training_Module_07_The_Commitment_Close.pdf)                                                                 |
|      8 | Deal Structure, Trade Control & Objection Isolation |    10 | [Fox_Salesperson_Training_Module_08_Deal_Structure_Trade_Control_and_Objection_Isolation.pdf](../assets/training/full/Fox_Salesperson_Training_Module_08_Deal_Structure_Trade_Control_and_Objection_Isolation.pdf) |
|      9 | Protect the Yes                                     |     9 | [Fox_Salesperson_Training_Module_09_Protect_the_Yes.pdf](../assets/training/full/Fox_Salesperson_Training_Module_09_Protect_the_Yes.pdf)                                                                           |
|     10 | Professional Discipline                             |     7 | [Fox_Salesperson_Training_Module_10_Professional_Discipline.pdf](../assets/training/full/Fox_Salesperson_Training_Module_10_Professional_Discipline.pdf)                                                           |

All 68 pages match the earlier supplied combined salesperson edition in extracted text and rendered pixels. Individual first pages identify the correct module/title. All PDFs are unencrypted and permit both printing and high-quality printing. No trainer/classroom files have been substituted.

Every existing Playbook catalog entry and Quick Guide page now uses its existing **View Full Training** action to open the corresponding PDF in a new tab. The PDF viewer provides printing and downloading. No PDF is embedded in the Quick Guide. **Read Quick Guide** and **Print Quick Guide** retain their existing behavior.

The [file provenance report](full-salesperson-training-files.json) records each original ZIP entry, installed path, byte length, page count and SHA-256. It also records a preservation hash for the entire resource manifest excluding only `fullTraining`, covering Quick Guide content, wording, metadata, titles, numbering and formatting.

The only shared implementation change allows the requested `assets/training/full/` subdirectory in the existing resource/path validators; legacy `assets/training/*.pdf` paths remain supported. Existing PDF header/existence checks run during build, which copies assets unchanged. No page renderer, design, navigation, Model Guide, comparison or Specials changes are needed.

## Quality checks

- Source ZIP PDF bytes match all ten installed SHA-256 values. No editable Word files are included.
- Data regression checks preserve the complete Quick Guide records; unsafe training paths are rejected.
- Desktop/mobile browser checks cover all ten catalog/detail links, real new tabs, standard browser downloads, PDF HTTP responses, original hashes, correct module titles/page counts, complete page rendering, and high-quality printing permissions. They do not depend on browser-private PDF toolbar markup.
- Existing Quick Guide read/print and full-site regression tests are run before delivery.
- All ten PDFs can be parsed/rendered and have printing permissions; browser-native PDF toolbar behavior may vary by device.

Validation passed: **100 Node tests, 16 Python extractor tests, 54 browser tests**, catalog/resource validation, formatting, diff checks and the production build. Portable PDF tests exercise all ten new tabs and browser downloads on desktop/mobile, confirm original hashes after download, and render all 68 pages with printing permissions checked. Native toolbar controls were additionally verified with the local system browser during the original installation. Existing Quick Guide reading/printing and all other sections pass regression checks.

No files failed extraction or verification. Delivery is a review pull request only; no merge or deployment is performed.

## CI compatibility correction — November 10, 2026

Both the [push run](https://github.com/FoxAutomotive/fox-sales-resource-center/actions/runs/42880016300) and [pull-request run](https://github.com/FoxAutomotive/fox-sales-resource-center/actions/runs/42880124069) passed extraction, catalog validation and all 100 Node tests. The browser step passed 52 existing cases, then both new PDF cases timed out at `tests/training-pdfs.spec.js:46`, waiting 15 seconds for a `chrome-extension://` viewer frame.

The original local configuration selected system Chromium 154, while Actions used Playwright's pinned Chromium 141.0.7390.37 (build 1194). Installing that exact browser locally and running with `CI=1` reproduced both failures. The tests had assumed a browser-private PDF viewer frame layout that this version does not expose; neither the training files nor Playbook data caused the failure.

The browser configuration now defaults to Playwright's pinned browser both locally and in CI. `CHROMIUM_PATH` remains an explicit debugging override. The PDF tests retain every module/link/hash check and use standard browser downloads rather than private viewer controls. They additionally inspect the actual downloaded PDFs for correct module titles/page counts, render every page, and verify unrestricted high-quality printing. No tests are skipped, no timeout is inflated to hide the mismatch, and no training PDF or Playbook content changes are needed.

The complete validation sequence was repeated locally with `CI=1`, no `CHROMIUM_PATH` override and the exact Chromium 141 build used by Actions before updating PR #27. All 16 extractor tests, 100 Node tests, 54 browser tests, catalog validation, build, formatting and diff checks passed. All ten PDF assets, `data/resources.json` and the source/hash report remain unchanged by this correction.
