#!/usr/bin/env python3
"""Profile a CSV for scrollytelling: column types, roles, ranges, cardinality, and chart suggestions.
Streams the whole file (row count, min/max/missing/cardinality up to a cap) but keeps only the first
SAMPLE_ROWS rows in memory for examples/role inference, so multi-GB files are fine.
Usage: profile_data.py file.csv [--json] [--sample N]"""
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

SAMPLE_ROWS = 100_000
DISTINCT_CAP = 200_000

def profile(path, sample_rows=SAMPLE_ROWS):
    """Single streaming pass. Per column: count, missing, numeric-ness, min/max/sum, distinct (capped),
    plus a bounded sample of raw values for role inference and examples."""
    stats = {}; cols = None; total = 0
    with open(path, newline="", encoding="utf-8-sig") as fh:
        reader = csv.DictReader(fh)
        cols = reader.fieldnames or []
        for c in cols: stats[c] = {"n": 0, "nonblank": 0, "numeric": True, "min": None, "max": None, "sum": 0.0, "distinct": set(), "capped": False, "sample": []}
        for r in reader:
            total += 1
            for c in cols:
                st = stats[c]; v = r.get(c, ""); st["n"] += 1
                if v in ("", None): continue
                st["nonblank"] += 1
                if total <= sample_rows: st["sample"].append(v)
                if not st["capped"]:
                    st["distinct"].add(v)
                    if len(st["distinct"]) > DISTINCT_CAP: st["capped"] = True
                if st["numeric"]:
                    n = num(v)
                    if n is None: st["numeric"] = False
                    else:
                        st["sum"] += n; st["min"] = n if st["min"] is None or n < st["min"] else st["min"]; st["max"] = n if st["max"] is None or n > st["max"] else st["max"]
    if total == 0: return {"error": "empty file"}
    out = {"file": path, "rows": total, "sampled_rows": min(total, sample_rows), "columns": []}
    for c in cols:
        st = stats[c]; nonblank = st["sample"]; distinct = len(st["distinct"]) if not st["capped"] else f">{DISTINCT_CAP}"
        numeric = st["nonblank"] > 0 and st["numeric"]
        info = {"name": c, "missing_pct": round(100 * (1 - st["nonblank"] / max(1, st["n"])), 1), "distinct": distinct}
        if numeric:
            ns = [num(v) for v in nonblank if num(v) is not None]
            info.update({"type": "numeric", "min": st["min"], "max": st["max"], "mean": round(st["sum"] / st["nonblank"], 3)})
            dn = distinct if isinstance(distinct, int) else 10**9
            ints = all(float(n).is_integer() for n in ns)
            if IDLIKE.search(c): info["role"] = "identifier"
            elif ints and 1500 <= st["min"] <= 2100 and 1500 <= st["max"] <= 2100 and dn > 3: info["role"] = "year"
            elif dn <= 12 and ints: info["role"] = "ordinal/category"
            else: info["role"] = "measure"
        else:
            info["type"] = "text"
            sample = nonblank[:200]; dn = distinct if isinstance(distinct, int) else 10**9
            if sample and all(ISO3.match(str(v)) for v in sample) and dn > 20: info["role"] = "iso3"
            elif sample and sum(1 for v in sample if DATE.match(str(v))) >= 0.9 * len(sample): info["role"] = "date"; info["examples"] = sample[:3]
            elif IDLIKE.search(c) or (isinstance(distinct, int) and distinct == st["nonblank"]): info["role"] = "identifier"
            elif dn <= 30: info["role"] = "category"; info["values"] = [v for v, _ in Counter(nonblank).most_common(12)]
            else: info["role"] = "entity (many)"; info["examples"] = [v for v, _ in Counter(nonblank).most_common(6)]
        out["columns"].append(info)
    roles = {c["role"]: c["name"] for c in out["columns"] if "role" in c}
    years = [c["name"] for c in out["columns"] if c.get("role") == "year"]
    measures = [c["name"] for c in out["columns"] if c.get("role") == "measure"]
    dates = [c["name"] for c in out["columns"] if c.get("role") == "date"]
    cats = [c["name"] for c in out["columns"] if c.get("role") in ("category", "ordinal/category")]
    entities = cats + [c["name"] for c in out["columns"] if c.get("role") == "entity (many)"]
    iso = [c["name"] for c in out["columns"] if c.get("role") == "iso3"]
    ids = [c["name"] for c in out["columns"] if c.get("role") == "identifier"]
    shape = "transactions/events (one row per record; aggregate before charting)" if dates and not years else "long (entity × year)" if years and (entities or iso) else "wide (one row per period)" if years else "cross-section (one row per entity)" if (entities or iso or ids) else "unknown"
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
    n = int(sys.argv[sys.argv.index("--sample") + 1]) if "--sample" in sys.argv else SAMPLE_ROWS
    p = profile(sys.argv[1], n)
    if "--json" in sys.argv: print(json.dumps(p, indent=2)); sys.exit(0)
    print(f"{p['file']}: {p['rows']:,} rows (sampled {p['sampled_rows']:,} for examples) · shape: {p['shape']}")
    for c in p["columns"]:
        extra = f" [{c['min']}–{c['max']}]" if c.get("type") == "numeric" else (f" e.g. {c.get('values') or c.get('examples')}" if c.get("values") or c.get("examples") else "")
        print(f"  {c['name']:32s} {c.get('type','?'):8s} {c.get('role','?'):18s} distinct={c['distinct']:<6} missing={c['missing_pct']}%{extra}")
    print("Chart suggestions:")
    for s in p["suggestions"]: print(f"  - {s['chart']}: {s['why']}")
