#!/usr/bin/env python3
"""Extract a reviewed PDF layout into a price-safe, presentation-independent stage.
The PDF stays outside the repository. Unsupported layouts fail, never guess.
"""
import argparse
import collections
import hashlib
import json
import re
from pathlib import Path
import fitz

SYMBOLS = {
    "●": "standard",
    "○": "optional",
    "—": "unavailable",
    "–": "unavailable",
    "-": "unavailable",
}


def clean(s):
    return re.sub(r"\s+", " ", s).strip()


def text(words, rect):
    x0, y0, x1, y1 = rect
    selected = [
        w
        for w in words
        if x0 <= (w[0] + w[2]) / 2 < x1 and y0 <= (w[1] + w[3]) / 2 < y1
    ]
    # Word baselines tolerate font/superscript variation, without losing row alignment.
    lines = []
    for w in sorted(selected, key=lambda w: (w[1], w[0])):
        line = next((l for l in lines if abs(l[0] - w[3]) < 2), None)
        if line is None:
            lines.append([w[3], [w]])
        else:
            line[1].append(w)
    return clean(
        " ".join(
            " ".join(w[4] for w in sorted(l[1], key=lambda w: w[0]))
            for l in sorted(lines)
        )
    )


def group_for(label):
    s = label.lower()
    if "performance" in s:
        return "Performance"
    if "exterior" in s:
        return "Exterior"
    if "interior" in s:
        return "Comfort"
    if "technology" in s:
        return "Technology"
    if "safety" in s or "iq.drive" in s:
        return "Safety"
    return "Technology"


def rectangles(page):
    return [d["rect"] for d in page.get_drawings() if d["type"] == "f"]


def matrix(page, number, model):
    words = page.get_text("words")
    rects = rectangles(page)
    candidates = [
        r
        for r in rects
        if 45 < r.x0 < 100
        and 200 < r.width < 400
        and 6 < r.height < 150
        and 78 < r.y0 < 730
    ]
    if not candidates:
        raise ValueError(f"No equipment grid on page {number}")
    pair = collections.Counter(
        (round(r.x0, 1), round(r.x1, 1)) for r in candidates
    ).most_common(1)[0][0]
    descriptions = sorted(
        [r for r in candidates if (round(r.x0, 1), round(r.x1, 1)) == pair],
        key=lambda r: r.y0,
    )
    categories = [
        r for r in rects if 30 < r.x0 < 45 and 8 < r.width < 20 and r.height > 15
    ]
    right = sorted(
        {
            (round(r.x0, 1), round(r.x1, 1))
            for r in rects
            if abs(r.y0 - descriptions[0].y0) < 0.5
            and r.x0 >= pair[1] - 0.5
            and r.width > 10
            and r.height > 6
        }
    )
    right = [
        (a, b)
        for a, b in right
        if text(words, (a, descriptions[0].y0, b, max(r.y1 for r in descriptions)))
    ]
    if len(right) != len(model["columns"]):
        raise ValueError(
            f'Page {number}: {len(right)} grid columns, expected {len(model["columns"])}'
        )
    rows = []
    for r in descriptions:
        label = text(words, r)
        if not label:
            continue
        category = next(
            (text(words, c) for c in categories if c.y0 <= (r.y0 + r.y1) / 2 <= c.y1),
            "",
        )
        values = []
        for x0, x1 in right:
            # Some IQ.DRIVE cells span all member rows. Retain that explicit suite evidence.
            cells = [
                cell
                for cell in rects
                if abs(cell.x0 - x0) < 0.6
                and abs(cell.x1 - x1) < 0.6
                and cell.y0 <= r.y0 + 0.5
                and cell.y1 >= r.y1 - 0.5
            ]
            cell = (
                min(cells, key=lambda cell: cell.height)
                if cells
                else fitz.Rect(x0, r.y0, x1, r.y1)
            )
            raw = text(words, cell)
            values.append(dict(raw=raw, spanned=cell.height > r.height + 1))
        rows.append(
            dict(
                page=number,
                label=label,
                group=group_for(category),
                section=category,
                cells=values,
                bbox=[round(n, 2) for n in r],
            )
        )
    return rows


def configurations(page, number, model):
    words = page.get_text("words")
    title = next(w for w in words if w[4] == "Descriptions")
    destination = next(w for w in words if w[4] == "Destination")
    lo = title[3] + 1
    hi = destination[1] - 1
    codes = [
        w
        for w in words
        if 410 < w[0] < 465 and lo < w[1] < hi and re.fullmatch("[A-Z0-9]{6}", w[4])
    ]
    if not codes:
        raise ValueError(f"No sales codes on page {number}")
    labels = []
    for block in page.get_text("dict")["blocks"]:
        for line in block.get("lines", []):
            b = line["bbox"]
            s = clean("".join(span["text"] for span in line["spans"]))
            if (
                38 < b[0] < 65
                and b[2] < 165
                and lo < b[1] < hi
                and s
                and s != "TRIM NAME"
            ):
                labels.append(((b[1] + b[3]) / 2, re.sub(r"\s*NEW!.*$", "", s)))
    actual = {s for _, s in labels}
    if actual != set(model["trims"]):
        raise ValueError(
            f'Page {number}: trim labels {actual} do not match reviewed profile {model["trims"]}'
        )
    rows = []
    for code in codes:
        y = (code[1] + code[3]) / 2
        trim = min(labels, key=lambda label: abs(label[0] - y))[1]
        power = text(words, (155, y - 7, 225, y + 7))
        drive = text(words, (225, y - 9, 289, y + 9))
        transmission = text(words, (280, y - 6, 414, y + 6))
        if model["id"] == "id4":
            drive = text(words, (340, y - 7, 411, y + 7))
            power = text(words, (245, y - 7, 330, y + 7))
            transmission = "Single-speed automatic transmission"
        if "4MOTION" in drive or "All-Wheel" in drive:
            drive = "4MOTION AWD" if model["id"] != "id4" else "AWD"
        elif "Rear-Wheel" in drive:
            drive = "RWD"
        elif "FWD" in drive:
            drive = "FWD"
        else:
            # GLI merges drivetrain and engine cells vertically over the manual/DSG rows.
            drive = text(words, (225, lo, 280, hi))
            drive = "FWD" if clean(drive) == "FWD" else drive
        prices = [
            w
            for w in words
            if w[0] > 520
            and lo < w[1] < hi
            and (w[4] == "TBA" or re.fullmatch(r"\$[\d,]+", w[4]))
        ]
        price = min(prices, key=lambda w: abs((w[1] + w[3]) / 2 - y))
        if abs((price[1] + price[3]) / 2 - y) > 12:
            raise ValueError(f"Unaligned retail price for {code[4]}")
        msrp = None if price[4] == "TBA" else int(price[4][1:].replace(",", ""))
        dest = [
            w
            for w in words
            if w[0] > 520
            and abs(w[1] - destination[1]) < 7
            and (w[4] == "TBA" or w[4].startswith("$"))
        ]
        if len(dest) != 1:
            raise ValueError("Ambiguous destination charge")
        rows.append(
            dict(
                trim=trim,
                salesCode=code[4],
                configuration=drive,
                transmission=transmission,
                powertrain=power,
                msrp=msrp,
                destination=(
                    None
                    if dest[0][4] == "TBA"
                    else int(dest[0][4][1:].replace(",", ""))
                ),
                page=number,
            )
        )
    return rows


def coded_options(page, number, model):
    words = page.get_text("words")
    rects = rectangles(page)
    codes = [
        w
        for w in words
        if 35 < w[0] < 62
        and 80 < w[1] < 730
        and re.fullmatch(r"[A-Z0-9]{3,4}", w[4])
        and w[4] not in ["SEL", "FWD", "AWD", "GLI", "TBA", "NEW"]
    ]
    # Retail headers establish a priced option table, not the color availability grid.
    headers = [w for w in words if w[4] == "Retail" and w[1] < 730]
    separators = sorted({r.y0 for r in rects if r.width > 450 and r.height < 1})
    result = []
    for code in codes:
        y = (code[1] + code[3]) / 2
        hs = [w for w in headers if w[1] < y]
        if not hs:
            continue
        header = max(hs, key=lambda w: w[1])
        hy = header[1]
        if any("Colors" in w[4] and hy < w[1] < y for w in words):
            continue
        inv = [w for w in words if w[4] == "Invoice" and abs(w[1] - hy) < 3]
        if not inv:
            continue
        invx = inv[0][0]
        retx = header[0]
        if invx < 300:
            continue
        next_headers = [h[1] for h in headers if h[1] > hy + 2]
        section_end = min(next_headers) if next_headers else 735
        prices = [
            w
            for w in words
            if retx - 4 <= (w[0] + w[2]) / 2 <= retx + 31
            and hy + 15 < w[1] < section_end
            and re.fullmatch(r"\$[\d,]+|TBA", w[4])
        ]
        if not prices:
            continue
        price = min(prices, key=lambda w: abs((w[1] + w[3]) / 2 - y))
        cy = (price[1] + price[3]) / 2
        if abs(cy - y) > 12:
            continue
        ys = sorted(set((w[1] + w[3]) / 2 for w in prices))
        pos = ys.index(cy)
        top = (ys[pos - 1] + cy) / 2 if pos else hy + 19
        bottom = (
            (cy + ys[pos + 1]) / 2
            if pos < len(ys) - 1
            else min([z for z in separators if cy < z < section_end] or [cy + 20])
        )
        name = text(words, (62, top, 138, bottom))
        desc = text(words, (138, top, invx - 3, bottom))
        retail = text(words, (retx - 4, top, retx + 31, bottom))
        amount = re.findall(r"\$[\d,]+|TBA", retail)
        if not name or len(amount) != 1:
            continue
        availabilityStart = retx + 31
        groups = model["optionColumns"]
        width = (576 - availabilityStart) / len(groups)
        availability = [
            text(
                words,
                (
                    availabilityStart + i * width,
                    top,
                    availabilityStart + (i + 1) * width,
                    bottom,
                ),
            )
            for i in range(len(groups))
        ]
        # Classify by the nearest preceding section heading, not by package-sounding names.
        sections = []
        for b in page.get_text("dict")["blocks"]:
            for l in b.get("lines", []):
                s = clean("".join(sp["text"] for sp in l["spans"]))
                if l["bbox"][1] < hy and any(
                    t in s
                    for t in [
                        "Factory",
                        "Optional Services",
                        "Market Delivery",
                        "Paint Color",
                        "Credits for Removed",
                    ]
                ):
                    sections.append((l["bbox"][1], s))
        section = max(sections)[1] if sections else "Priced options"
        result.append(
            dict(
                code=code[4],
                name=name,
                description=desc,
                retail=(
                    None if amount[0] == "TBA" else int(amount[0][1:].replace(",", ""))
                ),
                availability=availability,
                optionColumns=groups,
                section=section,
                page=number,
            )
        )
    return result


def audit_financial_columns(doc, stage):
    """Check the public-safe stage against private cost-column currency values.

    Amounts that are also published retail values are not considered private-only.
    The audit emits counts, never the private values themselves.
    """
    invoice_values, retail_values = set(), set()
    for page in doc:
        words = page.get_text("words")
        headers = [
            w for w in words if w[4].lower() in ["invoice", "retail"] and w[1] < 730
        ]
        for word in words:
            if not re.fullmatch(r"\$[\d,]+", word[4]):
                continue
            preceding = [h for h in headers if h[1] < word[1]]
            if not preceding:
                continue
            latest = max(h[1] for h in preceding)
            # Main headers are two lines high (DEALER/INVOICE versus RETAIL/PRICE).
            band = [h for h in preceding if abs(h[1] - latest) < 16]
            nearest = min(
                band, key=lambda h: abs((h[0] + h[2]) / 2 - (word[0] + word[2]) / 2)
            )
            target = (
                invoice_values if nearest[4].lower() == "invoice" else retail_values
            )
            target.add(word[4])
    private_only = invoice_values - retail_values
    public_amounts = set(re.findall(r"\$[\d,]+", json.dumps(stage)))

    def visit(value):
        if isinstance(value, dict):
            for key, item in value.items():
                if key in ["msrp", "retail", "destination"] and isinstance(
                    item, (int, float)
                ):
                    public_amounts.add(f"${item:,}")
                visit(item)
        elif isinstance(value, list):
            for item in value:
                visit(item)

    visit(stage)
    if private_only & public_amounts:
        raise ValueError(
            "Private cost-column currency found in proposed stage; no output written"
        )
    return {
        "passed": True,
        "costColumnAmountsExcluded": len(private_only),
        "privateValuesEmitted": False,
    }


def extract(pdf, profile):
    blob = Path(pdf).read_bytes()
    if hashlib.sha256(blob).hexdigest() != profile["sha256"]:
        raise ValueError(
            "PDF hash differs from reviewed profile; create/review a new profile for changed documents"
        )
    doc = fitz.open(stream=blob, filetype="pdf")
    if len(doc) != profile["pageCount"]:
        raise ValueError("Unexpected page count")
    covered = [1] + [
        n for m in profile["models"] for n in range(m["firstPage"], m["lastPage"] + 1)
    ]
    if sorted(covered) != list(range(1, len(doc) + 1)):
        raise ValueError(
            "Profile does not account for every document page exactly once"
        )
    result = dict(
        schemaVersion=1,
        source=profile,
        models=[],
        pages=[],
        revisionHistory=re.sub(
            r"\*+\s*w/\s*INVOICE PRICING\s*\*+",
            "",
            text(doc[0].get_text("words"), (35, 80, 576, 275)),
        ).strip(),
    )
    for number, page in enumerate(doc, 1):
        # Public-safe page coverage inventory; never emit full page text or financial columns.
        result["pages"].append(
            dict(
                page=number,
                processed=True,
                kind="revision-history" if number == 1 else "model-section",
            )
        )
    for model in profile["models"]:
        data = dict(
            id=model["id"],
            name=model["name"],
            configurations=configurations(
                doc[model["pricingPage"] - 1], model["pricingPage"], model
            ),
            rows=[],
            options=[],
            colors=[],
        )
        for n in model["matrixPages"]:
            rows = matrix(doc[n - 1], n, model)
            if len(rows) != profile["expectedMatrixRows"][str(n)]:
                raise ValueError(
                    f"Page {n}: equipment row count changed; review extraction alignment"
                )
            data["rows"] += rows
        for n in range(model["firstPage"], model["lastPage"] + 1):
            data["options"] += coded_options(doc[n - 1], n, model)
            # Color matrices have no financial columns; preserve exact color/trim/interior restrictions as reference rows.
            pg = doc[n - 1]
            ws = pg.get_text("words")
            rs = rectangles(pg)
            for r in rs:
                if 35 < r.x0 < 38 and 20 < r.width < 32 and 6 < r.height < 32:
                    code = text(ws, r)
                    if re.fullmatch("[A-Z0-9]{4}", code):
                        data["colors"].append(
                            dict(
                                code=code,
                                description=text(ws, (r.x1, r.y0, 576, r.y1)),
                                page=n,
                            )
                        )
        result["models"].append(data)
    result["financialAudit"] = audit_financial_columns(doc, result)
    return result


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--pdf", required=True)
    ap.add_argument("--profile", required=True)
    ap.add_argument("--out", required=True)
    args = ap.parse_args()
    profile = json.loads(Path(args.profile).read_text())
    if profile["adapter"] != "vw-order-guide-grid-v1":
        raise ValueError(
            "Unsupported adapter; review a manufacturer layout profile first"
        )
    result = extract(args.pdf, profile)
    Path(args.out).parent.mkdir(parents=True, exist_ok=True)
    Path(args.out).write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    print(
        f"Processed {len(result['pages'])} pages; extracted {len(result['models'])} model sections. Only retail prices emitted."
    )
