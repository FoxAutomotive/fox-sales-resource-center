"""Synthetic Toyota S/A geometry tests; no manufacturer PDF needed in CI."""

import importlib.util
from pathlib import Path
import unittest
import fitz

spec = importlib.util.spec_from_file_location(
    "extract_toyota_pdf",
    Path(__file__).parents[2] / "scripts/import/extract_toyota_pdf.py",
)
extractor = importlib.util.module_from_spec(spec)
spec.loader.exec_module(extractor)


class ToyotaGeometryTests(unittest.TestCase):
    def sample(self):
        doc = fitz.open()
        page = doc.new_page(width=612, height=792)
        page.insert_text((320, 65), "Base", fontsize=7)
        page.insert_text((440, 65), "Plus", fontsize=7)
        page.insert_text((35, 105), "Heated front seats", fontsize=6.75)
        page.insert_text((338, 105), "A", fontsize=6.75)
        page.insert_text((458, 105), "S", fontsize=6.75)
        page.insert_text((35, 130), "Heated steering wheel with", fontsize=6.75)
        page.insert_text((35, 140), "manufacturer-specific controls", fontsize=6.75)
        page.insert_text((458, 135), "S", fontsize=6.75)
        profile = {
            "columnCenters": [340.25, 460.25],
            "bodyTop": 77,
            "rowCounts": {"1": 2},
            "columns": [{"headerTokens": ["Base"]}, {"headerTokens": ["Plus"]}],
            "pageCategories": {"1": "Interior"},
        }
        return doc, page, profile

    def test_multiline_descriptions_and_detached_symbols_keep_columns(self):
        doc, page, profile = self.sample()
        rows = extractor.matrix_page(page, 1, profile)
        self.assertEqual(rows[0]["symbols"], ["A", "S"])
        self.assertEqual(rows[1]["symbols"], ["", "S"])
        self.assertIn("manufacturer-specific controls", rows[1]["label"])
        self.assertTrue(all(row["category"] == "Interior" for row in rows))
        doc.close()

    def test_blank_is_not_confirmed_absence(self):
        doc, page, profile = self.sample()
        self.assertEqual(extractor.matrix_page(page, 1, profile)[1]["symbols"][0], "")
        doc.close()

    def test_row_count_or_header_drift_fails_closed(self):
        doc, page, profile = self.sample()
        profile["rowCounts"]["1"] = 3
        with self.assertRaisesRegex(ValueError, "expected 3 rows"):
            extractor.matrix_page(page, 1, profile)
        profile["rowCounts"]["1"] = 2
        profile["columns"][1]["headerTokens"] = ["Wrong grade"]
        with self.assertRaisesRegex(ValueError, "missing header"):
            extractor.matrix_page(page, 1, profile)
        doc.close()

    def test_unknown_equipment_symbol_is_not_silently_standard(self):
        doc, page, profile = self.sample()
        page.insert_text((338, 135), "X", fontsize=6.75)
        with self.assertRaisesRegex(ValueError, "unrecognized equipment symbol"):
            extractor.matrix_page(page, 1, profile)
        doc.close()


if __name__ == "__main__":
    unittest.main()
