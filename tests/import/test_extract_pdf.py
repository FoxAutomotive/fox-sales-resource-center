"""Synthetic geometry tests keep the invoice-bearing original out of CI/public files."""

import importlib.util
import tempfile
import unittest
from pathlib import Path
import fitz

spec = importlib.util.spec_from_file_location(
    "extract_pdf", Path(__file__).parents[2] / "scripts/import/extract_pdf.py"
)
extractor = importlib.util.module_from_spec(spec)
spec.loader.exec_module(extractor)
FONT_BUFFER = fitz.Font("cjk").buffer


class PdfExtractionTests(unittest.TestCase):
    def grid(self, columns=2, blank=False):
        doc = fitz.open()
        page = doc.new_page(width=612, height=792)
        page.insert_font(fontname="source", fontbuffer=FONT_BUFFER)
        for y, label in [(80, "Heated front seats"), (100, "Heated steering wheel")]:
            page.draw_rect(fitz.Rect(50, y, 340, y + 20), fill=(1, 1, 1), color=None)
            page.insert_text((54, y + 13), label, fontsize=7, fontname="source")
            for i in range(columns):
                left = 340 + i * 70
                page.draw_rect(
                    fitz.Rect(left, y, left + 70, y + 20), fill=(1, 1, 1), color=None
                )
                symbol = "●" if i == 0 else "○"
                if y == 100:
                    symbol = "—" if i == 0 else "●"
                if not (blank and y == 100 and i == 1):
                    page.insert_text(
                        (left + 30, y + 13), symbol, fontsize=7, fontname="source"
                    )
        return doc, page

    def test_symbols_stay_in_their_actual_columns(self):
        doc, page = self.grid()
        rows = extractor.matrix(page, 1, {"columns": [{"trim": "S"}, {"trim": "SE"}]})
        self.assertEqual(
            [r["label"] for r in rows], ["Heated front seats", "Heated steering wheel"]
        )
        self.assertEqual(
            [[c["raw"] for c in r["cells"]] for r in rows], [["●", "○"], ["—", "●"]]
        )
        doc.close()

    def test_blank_is_not_a_dash(self):
        doc, page = self.grid(blank=True)
        rows = extractor.matrix(page, 1, {"columns": [{}, {}]})
        self.assertEqual(rows[1]["cells"][1]["raw"], "")
        doc.close()

    def test_column_drift_fails_closed(self):
        doc, page = self.grid(columns=3)
        with self.assertRaisesRegex(ValueError, "grid columns"):
            extractor.matrix(page, 1, {"columns": [{}, {}]})
        doc.close()

    def test_changed_document_hash_requires_a_new_review(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "changed.pdf"
            path.write_bytes(b"not the reviewed file")
            with self.assertRaisesRegex(ValueError, "hash differs"):
                extractor.extract(path, {"sha256": "0" * 64})

    def test_retail_option_column_excludes_adjacent_invoice(self):
        doc = fitz.open()
        page = doc.new_page(width=612, height=792)
        for x, y, s in [
            (43, 50, "Factory Option Packages"),
            (365, 75, "Invoice"),
            (402, 75, "Retail"),
            (41, 105, "P01"),
            (70, 105, "Roof Package"),
            (145, 105, "Power panoramic roof. SE only."),
            (368, 105, "$999"),
            (402, 105, "$1200"),
            (472, 105, "SE"),
        ]:
            page.insert_text((x, y), s, fontsize=7)
        page.draw_rect(fitz.Rect(36, 120, 576, 120.3), fill=(1, 1, 1), color=None)
        options = extractor.coded_options(page, 1, {"optionColumns": [["SE"]]})
        self.assertEqual(len(options), 1)
        self.assertEqual(options[0]["retail"], 1200)
        self.assertNotIn("999", str(options))
        self.assertNotIn("invoice", str(options).lower())
        audit = extractor.audit_financial_columns(doc, {"options": options})
        self.assertTrue(audit["passed"])
        self.assertEqual(audit["costColumnAmountsExcluded"], 1)
        with self.assertRaisesRegex(ValueError, "Private cost-column"):
            extractor.audit_financial_columns(doc, {"retail": 999})
        doc.close()


if __name__ == "__main__":
    unittest.main()
