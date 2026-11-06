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

    def test_retail_only_option_bounds_keep_trim_columns_and_full_name(self):
        doc = fitz.open()
        page = doc.new_page(width=612, height=792)
        for x, y, value in [
            (43, 50, "Factory Option Packages"), (393, 75, "Retail"),
            (393, 85, "Price"), (74, 85, "Option"), (490, 85, "Trim Availability"),
            (41, 109, "P16"), (63, 101, "Panoramic Sunroof"), (63, 111, "Package"),
            (145, 109, "Power sliding roof. SE only."), (405, 109, "$1200"),
            (466, 109, "-"), (497, 109, "SE"), (530, 109, "-"), (561, 109, "-"),
        ]:
            page.insert_text((x, y), value, fontsize=7)
        page.draw_rect(fitz.Rect(36, 123, 576, 123.3), fill=(1, 1, 1), color=None)
        model = {"optionColumns": [["S"], ["SE"], ["SEL"], ["Premium"]],
                 "optionBounds": [450, 481.5, 513, 544.5, 576]}
        self.assertEqual(extractor.coded_options(page, 1, model), [])
        result = extractor.coded_options(page, 1, model, retail_only=True)
        self.assertEqual(result[0]["name"], "Panoramic Sunroof Package")
        self.assertEqual(result[0]["availability"], ["-", "SE", "-", "-"])
        self.assertEqual(result[0]["retail"], 1200)
        doc.close()

    def test_reviewed_pricing_bounds_read_shifted_sales_code_and_full_transmission(self):
        doc = fitz.open()
        page = doc.new_page(width=612, height=792)
        for x, y, value in [
            (74, 100, "Descriptions"), (43, 140, "SE"), (175, 140, "2.0T 4-cyl."),
            (250, 140, "FWD"), (310, 140, "8-speed Automatic w/ Tiptronic"),
            (470, 140, "DJ13WS"), (530, 140, "$41610"),
            (310, 200, "Destination"), (530, 200, "$1525"),
        ]:
            page.insert_text((x, y), value, fontsize=7)
        model = {"id": "atlas", "trims": ["SE"], "pricingBounds": {
            "code": [400, 510], "engine": [155, 225], "drive": [225, 300], "transmission": [300, 445]}}
        result = extractor.configurations(page, 2, model)
        self.assertEqual(result[0]["salesCode"], "DJ13WS")
        self.assertEqual(result[0]["transmission"], "8-speed Automatic w/ Tiptronic")
        self.assertEqual(result[0]["msrp"], 41610)
        self.assertEqual(result[0]["destination"], 1525)
        doc.close()

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
