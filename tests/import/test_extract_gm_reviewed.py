"""Reviewed multi-model GM layout/source guards; source workbooks are local fixtures."""

import hashlib
import importlib.util
import json
import sys
import tempfile
import unittest
from pathlib import Path
import openpyxl

ROOT = Path(__file__).parents[2]
sys.path.insert(0, str(ROOT / "scripts/import"))
import extract_gm_reviewed as extractor


class ReviewedGmTests(unittest.TestCase):
    def test_all_seven_sources_are_hash_bound_and_keep_exact_columns(self):
        counts = []
        for path in sorted((ROOT / "profiles/imports/gm-reviewed").glob("*.json")):
            profile = json.loads(path.read_text())
            source = next(
                p
                for p in (ROOT / "sources/gm").glob(
                    f'{profile["year"]} Chevrolet Truck *{profile["model"]} Export*.xlsx'
                )
                if hashlib.sha256(p.read_bytes()).hexdigest() == profile["sha256"]
            )
            stage = extractor.extract(source, profile)
            self.assertEqual(stage["contentSha256"], profile["expectedContentSha256"])
            self.assertTrue(
                all(
                    len(row["cells"]) == len(profile["configurations"])
                    for row in stage["equipment"]
                )
            )
            counts.append(
                (profile["year"], profile["model"], len(stage["configurations"]))
            )
        self.assertEqual(
            counts,
            [
                (2026, "Blazer", 8),
                (2026, "Equinox", 6),
                (2026, "Traverse", 7),
                (2026, "Trax", 5),
                (2027, "Equinox", 6),
                (2027, "Traverse", 9),
                (2027, "Trax", 3),
            ],
        )

    def modified(self, operation, update_hash):
        profile = json.loads(
            (ROOT / "profiles/imports/gm-reviewed/2027-trax.json").read_text()
        )
        source = ROOT / "sources/gm/2027 Chevrolet Truck NEW Trax Export.xlsx"
        with tempfile.TemporaryDirectory() as folder:
            workbook = openpyxl.load_workbook(source)
            operation(workbook)
            path = Path(folder) / source.name
            workbook.save(path)
            if update_hash:
                profile["sha256"] = hashlib.sha256(path.read_bytes()).hexdigest()
            return extractor.extract(path, profile)

    def test_changed_workbook_requires_new_review(self):
        with self.assertRaisesRegex(ValueError, "reviewed profile"):
            self.modified(
                lambda w: setattr(w["Mechanical"]["D25"], "value", "A"), False
            )

    def test_column_drift_and_unknown_symbols_fail_closed(self):
        with self.assertRaisesRegex(ValueError, "column alignment"):
            self.modified(
                lambda w: setattr(w["Interior"]["D2"], "value", "Wrong trim"), True
            )
        with self.assertRaisesRegex(ValueError, "Unknown equipment symbol"):
            self.modified(lambda w: setattr(w["Interior"]["D3"], "value", "?"), True)

    def test_unreviewed_content_and_formula_cells_fail_closed(self):
        with self.assertRaisesRegex(ValueError, "fingerprint"):
            self.modified(lambda w: setattr(w["Mechanical"]["D25"], "value", "A"), True)
        with self.assertRaisesRegex(ValueError, "Formula cells"):
            self.modified(lambda w: setattr(w["Specs"]["B3"], "value", "=1+1"), True)


if __name__ == "__main__":
    unittest.main()
