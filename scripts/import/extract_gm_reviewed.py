"""Profile-verified GM workbook batches; preserves exact cells, symbols and restrictions."""

import argparse, hashlib, json, re
from pathlib import Path
import openpyxl
from extract_gm_xlsx import clean, status, EQUIPMENT_SHEETS


def extract(path, profile):
    path = Path(path)
    raw = path.read_bytes()
    if hashlib.sha256(raw).hexdigest() != profile["sha256"]:
        raise ValueError("Workbook differs from reviewed profile")
    w = openpyxl.load_workbook(path, data_only=True)
    formulas = openpyxl.load_workbook(path, data_only=False)
    if any(c.data_type == "f" for s in formulas for row in s for c in row):
        raise ValueError("Formula cells require review")
    if {s.title: [s.max_row, s.max_column] for s in w} != profile["sheets"]:
        raise ValueError("Worksheet inventory changed")
    configs = profile["configurations"]
    rows = []
    for name in EQUIPMENT_SHEETS:
        s = w[name]
        header = next(
            (r for r in s if str(r[2].value or "").strip() == "Description"), None
        )
        if not header or [str(c.value or "") for c in header[3:]] != profile["headers"]:
            raise ValueError("GM column alignment differs: " + name)
        for row in s.iter_rows(min_row=header[0].row + 1):
            label = str(row[2].value or "").strip()
            if not label or not any(c.value is not None for c in row[3:]):
                continue
            symbols = [clean(c.value) for c in row[3:]]
            if any(
                v and not re.fullmatch(r"(?:S|A(?:/D)?|D|■|□)\d*|--", v)
                for v in symbols
            ):
                raise ValueError("Unknown equipment symbol: " + str(symbols))
            rows.append(
                {
                    "code": clean(row[0].value or row[1].value),
                    "description": label,
                    "sheet": name,
                    "row": row[0].row,
                    "descriptionCell": f"{name}!C{row[0].row}",
                    "cells": [
                        {
                            "raw": symbols[c["column"] - 4],
                            "status": status(symbols[c["column"] - 4]),
                            "ref": f"{name}!{openpyxl.utils.get_column_letter(c['column'])}{row[0].row}",
                        }
                        for c in configs
                    ],
                }
            )
    result = {
        "schemaVersion": 1,
        "adapter": "gm-fleet-reviewed-v2",
        "reviewedAt": profile["reviewedAt"],
        "profileId": profile["id"],
        "source": {
            "year": profile["year"],
            "model": profile["model"],
            "fileName": path.name,
            "sha256": profile["sha256"],
            "identityBasis": "User-supplied model/year and SHA-256-reviewed workbook profile; NEW and download suffixes are not model names",
            "sheets": [
                {"name": s.title, "rows": s.max_row, "columns": s.max_column} for s in w
            ],
        },
        "configurations": configs,
        "equipment": rows,
        "tables": {
            n: [[c.value for c in r] for r in w[n]]
            for n in [
                "Highlights",
                "Dimensions",
                "Specs",
                "Color and Trim",
                "Engine Axles",
                "Trailering Specs",
            ]
            if n in w
        },
        "reviewNotes": profile.get("notes", []),
    }

    payload = {
        key: result[key]
        for key in ["source", "configurations", "equipment", "tables", "reviewNotes"]
    }
    fingerprint = hashlib.sha256(
        json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode()
    ).hexdigest()
    if (
        profile.get("expectedContentSha256")
        and fingerprint != profile["expectedContentSha256"]
    ):
        raise ValueError("Reviewed GM extracted-content fingerprint changed")
    result["contentSha256"] = fingerprint
    return result


if __name__ == "__main__":
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--xlsx", required=True)
    p.add_argument("--profile", required=True)
    p.add_argument("--out", required=True)
    a = p.parse_args()
    result = extract(a.xlsx, json.loads(Path(a.profile).read_text()))
    Path(a.out).parent.mkdir(parents=True, exist_ok=True)
    Path(a.out).write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
