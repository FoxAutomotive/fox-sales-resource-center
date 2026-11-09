"""Toyota S/A eBrochure geometry adapter. A reviewed hash/layout profile is required."""

import argparse
import hashlib
import json
import re
from pathlib import Path
import fitz


def compact(text):
    return re.sub(r"\s+", " ", text).strip()


def spans(block):
    return [span for line in block.get("lines", []) for span in line["spans"]]


def matrix_page(page, number, profile):
    centers = profile["columnCenters"]
    left_end = centers[0] - (centers[1] - centers[0]) / 2
    rows, headings, labels, mark_groups = [], [], [], []
    for block in page.get_text("dict")["blocks"]:
        if (
            block["type"] != 0
            or block["bbox"][1] < profile["bodyTop"]
            or block["bbox"][1] > 760
        ):
            continue
        ss = spans(block)
        left = [s for s in ss if s["bbox"][0] < left_end]
        if left:
            labels.append(
                {
                    "spans": left,
                    "top": min(s["bbox"][1] for s in left),
                    "bottom": max(s["bbox"][3] for s in left),
                }
            )
        for s in ss:
            if s["bbox"][0] > left_end and s["text"].strip() not in ("S", "A", ""):
                raise ValueError(
                    f"Page {number}: unrecognized equipment symbol {s['text']!r}"
                )
            if s["bbox"][0] <= left_end or s["text"].strip() not in ("S", "A"):
                continue
            y = (s["bbox"][1] + s["bbox"][3]) / 2
            group = next((g for g in mark_groups if abs(g["y"] - y) < 2), None)
            if group is None:
                group = {"y": y, "marks": []}
                mark_groups.append(group)
            group["marks"].append(s)
    merged = []
    for label in sorted(labels, key=lambda l: l["top"]):
        if merged and label["top"] - merged[-1]["bottom"] <= 1.1:
            merged[-1]["spans"] += label["spans"]
            merged[-1]["bottom"] = max(merged[-1]["bottom"], label["bottom"])
        else:
            merged.append(label)
    labels = merged
    used = set()
    for group in mark_groups:
        candidates = [
            (i, l)
            for i, l in enumerate(labels)
            if l["top"] - 1 <= group["y"] <= l["bottom"] + 1
        ]
        if len(candidates) != 1:
            raise ValueError(
                f"Page {number}: row at {group['y']}: expected one description, got {len(candidates)}"
            )
        i, label = candidates[0]
        if i in used:
            raise ValueError(f"Page {number}: description spans multiple symbol rows")
        used.add(i)
        left = label["spans"]
        text = compact(" ".join(s["text"] for s in left if not (s["flags"] & 1)))
        refs = [
            int(n)
            for s in left
            if s["flags"] & 1
            for n in re.findall(r"\d+", s["text"])
        ]
        cells = [""] * len(centers)
        for s in group["marks"]:
            x = (s["bbox"][0] + s["bbox"][2]) / 2
            col = min(range(len(centers)), key=lambda i: abs(centers[i] - x))
            if abs(centers[col] - x) > 2 or cells[col]:
                raise ValueError(f"Page {number}: duplicate or drifting column at {x}")
            cells[col] = s["text"].strip()
        rows.append(
            {
                "page": number,
                "bbox": [
                    34.5,
                    round(label["top"], 3),
                    581.25,
                    round(label["bottom"], 3),
                ],
                "label": text,
                "rawLabel": compact(" ".join(s["text"] for s in left)),
                "footnotes": sorted(set(refs)),
                "symbols": cells,
            }
        )
    headings = [
        {"y": l["top"], "text": compact(" ".join(s["text"] for s in l["spans"]))}
        for i, l in enumerate(labels)
        if i not in used
    ]
    rows.sort(key=lambda r: r["bbox"][1])
    current = profile["pageCategories"][str(number)]
    for row in rows:
        prior = [h for h in headings if h["y"] < row["bbox"][1]]
        if prior:
            current = prior[-1]["text"]
        row["category"] = current
    if len(rows) != profile["rowCounts"][str(number)]:
        raise ValueError(
            f"Page {number}: expected {profile['rowCounts'][str(number)]} rows, got {len(rows)}"
        )
    # Header text is independently checked in each column, not inferred from marks.
    for i, name in enumerate(profile["columns"]):
        half = (centers[1] - centers[0]) / 2
        text = page.get_textbox(
            fitz.Rect(
                centers[i] - half + 1, 45, centers[i] + half - 1, profile["bodyTop"]
            )
        ).lower()
        for token in name["headerTokens"]:
            if token.lower() not in text:
                raise ValueError(
                    f"Page {number}: column {i} missing header token {token}: {text!r}"
                )
    return rows


def palette(page, section):
    top, bottom = section["y"]
    centers = section["centers"]
    buckets = {}
    for b in page.get_text("dict")["blocks"]:
        if b["type"] != 0:
            continue
        for line in b["lines"]:
            ss = line["spans"]
            if not ss or not top < line["bbox"][1] < bottom:
                continue
            band = next(
                (
                    i
                    for i, (a, z) in enumerate(section["bands"])
                    if a <= line["bbox"][1] <= z
                ),
                None,
            )
            if band is None:
                continue
            for s in ss:
                x = (s["bbox"][0] + s["bbox"][2]) / 2
                col = min(range(len(centers)), key=lambda i: abs(centers[i] - x))
                cell = buckets.setdefault((band, col), {"parts": [], "footnotes": []})
                if s["flags"] & 1 or (s["size"] < 6 and s["text"].strip().isdigit()):
                    cell["footnotes"] += [int(n) for n in re.findall(r"\d+", s["text"])]
                else:
                    cell["parts"].append(s["text"])
    return [
        {
            "name": compact(" ".join(v["parts"])),
            "footnotes": sorted(set(v["footnotes"])),
            "page": page.number + 1,
        }
        for _, v in sorted(buckets.items())
        if compact(" ".join(v["parts"]))
    ]


def extract(pdf_path, profile):
    pdf_bytes = Path(pdf_path).read_bytes()
    digest = hashlib.sha256(pdf_bytes).hexdigest()
    if digest != profile["sha256"]:
        raise ValueError(
            "PDF hash differs from reviewed profile; review layout before importing"
        )
    doc = fitz.open(pdf_path)
    if len(doc) != profile["pageCount"]:
        raise ValueError("PDF page count changed")
    texts = [p.get_text(sort=True) for p in doc]
    if (
        str(profile["year"]) not in texts[0]
        or profile["titleToken"].lower() not in texts[0].lower()
    ):
        raise ValueError("Cover does not match reviewed model/year")
    rows = []
    for pg in profile["matrixPages"]:
        rows += matrix_page(doc[pg - 1], pg, profile)
    # The manufacturer numbers disclosures in a continuous single text stream.
    disclosure_text = " ".join(
        compact(texts[p - 1].replace("INFO AND DISCLOSURES", ""))
        for p in profile["disclosurePages"]
    )
    disclosures = {}
    matches = list(re.finditer(r"(?<!\d)(\d{1,3})\.\s+", disclosure_text))
    accepted = []
    for match in matches:
        if int(match.group(1)) == len(accepted) + 1:
            accepted.append(match)
    for i, m in enumerate(accepted):
        disclosures[m.group(1)] = disclosure_text[
            m.end() : (
                accepted[i + 1].start()
                if i + 1 < len(accepted)
                else len(disclosure_text)
            )
        ].strip()
    if len(disclosures) != profile["lastDisclosure"]:
        raise ValueError(
            f"Disclosure numbering changed: expected {profile['lastDisclosure']}, got {len(disclosures)}"
        )
    facts = []
    for fact in profile.get("facts", []) + profile.get("highlights", []):
        page = doc[fact["page"] - 1]
        text = (
            compact(page.get_textbox(fitz.Rect(fact["bbox"])))
            if fact.get("bbox")
            else compact(page.get_text()) + " " + compact(texts[fact["page"] - 1])
        )
        if fact["quote"] not in text:
            raise ValueError(
                f"Reviewed quote for {fact['field']} no longer matches page {fact['page']}"
            )
        if "field" in fact:
            facts.append(fact)
    colors = {
        key: palette(doc[profile["colorPage"] - 1], section)
        for key, section in profile.get("palette", {}).items()
    }
    result = {
        "schemaVersion": 1,
        "adapter": "toyota-sa-brochure-v1",
        "profileId": profile["id"],
        "source": {
            "fileName": Path(pdf_path).name,
            "sha256": digest,
            "pageCount": len(doc),
            "year": profile["year"],
            "model": profile["model"],
        },
        "pageInventory": [
            {
                "page": i + 1,
                "characters": len(t),
                "textSha256": hashlib.sha256(t.encode()).hexdigest(),
            }
            for i, t in enumerate(texts)
        ],
        "rows": rows,
        "disclosures": disclosures,
        "disclosurePageText": {
            str(p): texts[p - 1] for p in profile["disclosurePages"]
        },
        "disclosurePages": profile["disclosurePages"],
        "facts": facts,
        "colors": colors,
        "highlights": profile.get("highlights", []),
    }
    payload = {
        "rows": [{k: v for k, v in row.items() if k != "bbox"} for row in rows],
        "disclosures": disclosures,
        "colors": colors,
        "facts": facts,
        "highlights": profile.get("highlights", []),
        "pageInventory": result["pageInventory"],
    }
    fingerprint = hashlib.sha256(
        json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode()
    ).hexdigest()
    if (
        profile.get("expectedContentSha256")
        and fingerprint != profile["expectedContentSha256"]
    ):
        raise ValueError(
            "Extracted Toyota content differs from the reviewed content fingerprint"
        )
    result["contentSha256"] = fingerprint
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--pdf", required=True)
    parser.add_argument("--profile", required=True)
    parser.add_argument("--out", required=True)
    args = parser.parse_args()
    profile = json.loads(Path(args.profile).read_text())
    result = extract(args.pdf, profile)
    Path(args.out).write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")


if __name__ == "__main__":
    main()
