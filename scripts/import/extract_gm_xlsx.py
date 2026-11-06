"""GM Fleet Order Guide XLSX -> neutral, cell-addressed extraction. No catalog writes."""
import argparse
import hashlib
import json
import re
from pathlib import Path
import openpyxl

EQUIPMENT_SHEETS = ["Standard Equipment", "Equipment Groups", "Interior", "Exterior", "Mechanical"]


def clean(value):
    return re.sub(r"\s+", " ", str(value or "")).strip()


def status(value):
    raw = clean(value)
    if re.fullmatch(r"(?:S|■|□)\d*", raw):
        return "standard"
    if re.fullmatch(r"(?:A(?:/D)?|D)\d*|--", raw):
        return "not-standard"
    return "unverified"


def extract(path):
    path = Path(path)
    # Model identifiers such as 1PT26 are body codes, never model-year evidence.
    match = re.fullmatch(r"(20\d{2}) Chevrolet (?:Truck |Car )?(.+?) Export", path.stem, re.I)
    # Archived sources use a stable repository filename; the original filename is supplied separately.
    if not match:
        raise ValueError("Cannot establish model/year: use the original '<year> Chevrolet [Truck] <model> Export.xlsx' filename")
    year, model = int(match[1]), match[2].strip()
    workbook = openpyxl.load_workbook(path, data_only=True)
    required = EQUIPMENT_SHEETS + ["Highlights", "Engine Axles", "Color and Trim", "Dimensions", "Specs"]
    if any(name not in workbook.sheetnames for name in required):
        raise ValueError("Missing required GM export worksheets")
    formulas = openpyxl.load_workbook(path, data_only=False)
    if any(cell.data_type == "f" for sheet in formulas for row in sheet for cell in row):
        raise ValueError("Formula cells require an explicitly reviewed values-only export")
    header_row = next((r for r in workbook["Standard Equipment"].iter_rows() if clean(r[2].value) == "Description"), None)
    if not header_row:
        raise ValueError("No GM equipment header")
    headers = [clean(c.value) for c in header_row[3:] if c.value]
    if len(set(headers)) != len(headers):
        raise ValueError("Duplicate configuration headers")
    mechanical = workbook["Mechanical"]
    drives = [r for r in mechanical.values if re.fullmatch(r"(?:Front|All)-wheel drive", clean(r[2]), re.I)]
    configs = []
    for index, header in enumerate(headers, 4):
        trim = str(header_row[index - 1].value).split("\n")[0].strip()
        choices = [r[2] for r in drives if status(r[index - 1]) == "standard"]
        if len(choices) != 1:
            raise ValueError(f"Ambiguous drivetrain for {header}")
        configs.append({"trim": trim, "header": header, "column": openpyxl.utils.get_column_letter(index),
                        "drive": "FWD" if choices[0].lower().startswith("front") else "AWD"})
    axle_rows = list(workbook["Engine Axles"].values)
    axle_header = next((i for i, r in enumerate(axle_rows) if clean(r[0]) == "Model" and clean(r[1]) == "Engine"), None)
    if axle_header is None or len(axle_rows[axle_header]) < 3:
        raise ValueError("Unrecognized Engine Axles table")
    for drive in {config["drive"] for config in configs}:
        matching = [r for r in axle_rows[axle_header + 1:] if clean(r[0]) == drive]
        if len(matching) != 1 or status(matching[0][2]) != "standard":
            raise ValueError(f"Engine Axles does not confirm the standard transmission for {drive}")
    records = []
    for name in EQUIPMENT_SHEETS:
        sheet = workbook[name]
        found = next((r for r in sheet.iter_rows() if clean(r[2].value) == "Description"), None)
        if not found or [clean(c.value) for c in found[3:]] != headers:
            raise ValueError(f"Configuration column alignment differs on {name}")
        for row in sheet.iter_rows(min_row=found[0].row + 1):
            description = str(row[2].value or "").strip()
            if not description or not any(c.value for c in row[3:]):
                continue
            records.append({"code": clean(row[0].value or row[1].value), "description": description,
                            "sheet": name, "row": row[0].row, "descriptionCell": f"{name}!C{row[0].row}",
                            "cells": [{"raw": clean(c.value), "status": status(c.value),
                                       "ref": f"{name}!{c.coordinate}"} for c in row[3:]]})
    return {"schemaVersion": 1, "adapter": "gm-fleet-xlsx-v1", "source": {
        "year": year, "model": model, "fileName": path.name,
        "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
        "identityBasis": "Original user-supplied export filename; model/body codes are not interpreted as years",
        "sheets": [{"name": s.title, "rows": s.max_row, "columns": s.max_column} for s in workbook]},
        "configurations": configs, "equipment": records,
        "tables": {name: [[c.value for c in row] for row in workbook[name]]
                   for name in ["Highlights", "Engine Axles", "Color and Trim", "Dimensions", "Specs"]}}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--xlsx", required=True)
    parser.add_argument("--out", required=True)
    args = parser.parse_args()
    result = extract(args.xlsx)
    Path(args.out).parent.mkdir(parents=True, exist_ok=True)
    Path(args.out).write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    print(f"Extracted {result['source']['model']} {result['source']['year']}: {len(result['configurations'])} configurations, {len(result['equipment'])} source rows")
