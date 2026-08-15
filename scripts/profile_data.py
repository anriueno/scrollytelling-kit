#!/usr/bin/env python3
"""Profile a CSV for scrollytelling: column types, roles, ranges, cardinality, and chart suggestions.
Usage: profile_data.py file.csv [--json]"""
import csv, sys, json, re, statistics
from collections import Counter

ISO3 = re.compile(r"^[A-Z]{3}$")
DATE = re.compile(r"^(\d{4}-\d{1,2}(-\d{1,2})?|\d{1,2}/\d{1,2}/\d{2,4}|\d{1,2}-[A-Za-z]{3}-\d{2,4}|[A-Za-z]{3,9} \d{4})")
IDLIKE = re.compile(r"(^|[ _-])(id|code|zip|postal|key|uuid|guid|number|no)([ _-]|$)", re.I)
def num(v):
    try:
        if v is None or v == "": return None
        return float(str(v).replace(",", ""))
    except: return None

def profile(path):
    with open(path, newline="", encoding="utf-8-sig") as fh:
        rows = list(csv.DictReader(fh))
    if not rows: return {"error": "empty file"}
    cols = list(rows[0].keys())
    out = {"file": path, "rows": len(rows), "columns": []}
    for c in cols:
        vals = [r.get(c, "") for r in rows]
        nonblank = [v for v in vals if v not in ("", None)]
        nums = [num(v) for v in nonblank]
        numeric = len(nonblank) > 0 and all(n is not None for n in nums)
        distinct = len(set(nonblank))
        info = {"name": c, "missing_pct": round(100 * (1 - len(nonblank) / len(vals)), 1), "distinct": distinct}
        if numeric:
            ns = [n for n in nums if n is not None]
            info.update({"type": "numeric", "min": min(ns), "max": max(ns), "mean": round(statistics.fmean(ns), 3)})
            ints = all(float(n).is_integer() for n in ns)
            if IDLIKE.search(c): info["role"] = "identifier"
            elif ints and 1500 <= min(ns) <= 2100 and 1500 <= max(ns) <= 2100 and distinct > 3: info["role"] = "year"
            elif distinct <= 12 and ints: info["role"] = "ordinal/category"
            else: info["role"] = "measure"
        else:
            info["type"] = "text"
            sample = nonblank[:200]
            if all(ISO3.match(str(v)) for v in sample) and distinct > 20: info["role"] = "iso3"
            elif sum(1 for v in sample if DATE.match(str(v))) >= 0.9 * len(sample): info["role"] = "date"; info["examples"] = sample[:3]
            elif IDLIKE.search(c) or distinct == len(nonblank): info["role"] = "identifier"
            elif distinct <= 30: info["role"] = "category"; info["values"] = [v for v, _ in Counter(nonblank).most_common(12)]
            else: info["role"] = "entity (many)"; info["examples"] = [v for v, _ in Counter(nonblank).most_common(6)]
        out["columns"].append(info)
    roles = {c["role"]: c["name"] for c in out["columns"] if "role" in c}
    years = [c["name"] for c in out["columns"] if c.get("role") == "year"]
    measures = [c["name"] for c in out["columns"] if c.get("role") == "measure"]
    dates = [c["name"] for c in out["columns"] if c.get("role") == "date"]
    cats = [c["name"] for c in out["columns"] if c.get("role") in ("category", "ordinal/category")]
    entities = cats + [c["name"] for c in out["columns"] if c.get("role") == "entity (many)"]
    iso = [c["name"] for c in out["columns"] if c.get("role") == "iso3"]
    shape = "transactions/events (one row per record; aggregate before charting)" if dates and not years else "long (entity × year)" if years and entities else "wide (one row per period)" if years else "cross-section (one row per entity)" if entities else "unknown"
    out["shape"] = shape
    sug = []
    if dates and measures: sug.append({"chart": "line/area (after aggregating)", "why": f"group by month/year of {dates[0]}" + (f" × {cats[0]}" if cats else "") + f", sum {measures[0]} → time series or stacked area"})
    if dates and cats and measures: sug.append({"chart": "bar / beeswarm (after aggregating)", "why": f"sum {measures[0]} by {cats[0]}; or per-{entities[-1]} totals as a beeswarm"})
    if years and measures: sug.append({"chart": "line", "why": f"time series of {measures[:3]} over {years[0]}" + (f", faceted by {entities[0]}" if entities else "")})
    if years and len(measures) >= 3 and not entities: sug.append({"chart": "area", "why": f"stacked composition of {measures[:6]} over {years[0]}; add a normalize step for share view"})
    if entities and len(measures) >= 2: sug.append({"chart": "scatter", "why": f"{measures[0]} vs {measures[1]} per {entities[0]}" + (f", size = {measures[2]}" if len(measures) > 2 else "") + (f"; year scrub over {years[0]}" if years else "")})
    if entities and measures: sug.append({"chart": "beeswarm", "why": f"distribution of {measures[0]} across {entities[0]}"}); sug.append({"chart": "bar", "why": f"top-N {entities[0]} by {measures[0]}"})
    if iso and measures: sug.append({"chart": "map", "why": f"choropleth of {measures[0]} by {iso[0]}" + (f", scrub over {years[0]}" if years else "")})
    if measures: sug.append({"chart": "number", "why": f"hero number for a single striking value of {measures[0]}"})
    out["suggestions"] = sug
    return out

if __name__ == "__main__":
    if len(sys.argv) < 2: print(__doc__); sys.exit(1)
    p = profile(sys.argv[1])
    if "--json" in sys.argv: print(json.dumps(p, indent=2)); sys.exit(0)
    print(f"{p['file']}: {p['rows']} rows · shape: {p['shape']}")
    for c in p["columns"]:
        extra = f" [{c['min']}–{c['max']}]" if c.get("type") == "numeric" else (f" e.g. {c.get('values') or c.get('examples')}" if c.get("values") or c.get("examples") else "")
        print(f"  {c['name']:32s} {c.get('type','?'):8s} {c.get('role','?'):18s} distinct={c['distinct']:<6} missing={c['missing_pct']}%{extra}")
    print("Chart suggestions:")
    for s in p["suggestions"]: print(f"  - {s['chart']}: {s['why']}")
