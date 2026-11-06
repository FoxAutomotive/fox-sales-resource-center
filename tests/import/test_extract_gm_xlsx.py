"""Real export geometry and targeted malformed-workbook cases; no network required."""
import importlib.util
import tempfile
import unittest
from pathlib import Path
import openpyxl
spec = importlib.util.spec_from_file_location("extract_gm", Path(__file__).parents[2] / "scripts/import/extract_gm_xlsx.py")
extractor = importlib.util.module_from_spec(spec)
spec.loader.exec_module(extractor)
SOURCE = Path(__file__).parents[2] / "sources/gm/2027 Chevrolet Truck Equinox Export.xlsx"

class GmExtractionTests(unittest.TestCase):
    def test_symbols_and_identity_do_not_confuse_body_code_with_model_year(self):
        data = extractor.extract(SOURCE)
        self.assertEqual(data["source"]["year"], 2027)
        self.assertEqual(data["source"]["model"], "Equinox")
        self.assertEqual([c["drive"] for c in data["configurations"]], ["FWD", "AWD"] * 3)
        self.assertEqual(len(data["source"]["sheets"]), 10)
        for raw in ["S", "S1", "■", "□"]:
            self.assertEqual(extractor.status(raw), "standard")
        for raw in ["A", "A1", "A/D1", "D", "--"]:
            self.assertEqual(extractor.status(raw), "not-standard")
        self.assertEqual(extractor.status(""), "unverified")

    def mutate(self, operation):
        with tempfile.TemporaryDirectory() as directory:
            workbook = openpyxl.load_workbook(SOURCE)
            operation(workbook)
            path = Path(directory) / SOURCE.name
            workbook.save(path)
            return extractor.extract(path)

    def test_shifted_configuration_header_fails_closed(self):
        with self.assertRaisesRegex(ValueError, "column alignment"):
            self.mutate(lambda w: setattr(w["Exterior"]["D3"], "value", "Wrong trim"))

    def test_conflicting_drivetrain_indicators_fail_closed(self):
        with self.assertRaisesRegex(ValueError, "Ambiguous drivetrain"):
            self.mutate(lambda w: setattr(w["Mechanical"]["E4"], "value", "S"))

    def test_formula_exports_require_values_review(self):
        with self.assertRaisesRegex(ValueError, "Formula cells"):
            self.mutate(lambda w: setattr(w["Specs"]["B3"], "value", "=1+1"))

    def test_engine_axle_transmission_mismatch_requires_review(self):
        with self.assertRaisesRegex(ValueError, "standard transmission for AWD"):
            self.mutate(lambda w: setattr(w["Engine Axles"]["C5"], "value", "A"))

if __name__ == "__main__":
    unittest.main()
