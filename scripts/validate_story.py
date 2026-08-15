#!/usr/bin/env python3
"""Validate a story.json against its data folder. Usage: validate_story.py <project-dir>  (expects public/story.json and public/data/)"""
import json, sys, os, csv
TYPES = {"number", "area", "bar", "line", "beeswarm", "map", "scatter"}
def main(root):
    sp = os.path.join(root, "public", "story.json"); errs, warns = [], []
    story = json.load(open(sp))
    for k in ("title", "scenes"): 
        if k not in story: errs.append(f"missing top-level '{k}'")
    cols = {}
    for name, f in (story.get("data") or {}).items():
        p = os.path.join(root, "public", "data", f)
        if not os.path.exists(p): errs.append(f"data '{name}': file public/data/{f} not found"); continue
        with open(p, newline="", encoding="utf-8-sig") as fh: cols[name] = set(next(csv.reader(fh)))
        if os.path.getsize(p) > 3_000_000: warns.append(f"data '{name}' is {os.path.getsize(p)//1_000_000} MB — cut it down; ship only what the charts need")
    def need(spec, keys, ctx):
        d = spec.get("data")
        if spec["type"] == "number": return
        if spec["type"] == "bar" and not d: return  # bars may use inline state.values
        if not d or d not in cols: errs.append(f"{ctx}: data '{d}' not declared"); return
        for k in keys:
            v = spec.get(k)
            if v is None: continue
            for c in (v if isinstance(v, list) else [v]):
                if d and c not in cols[d]: errs.append(f"{ctx}: column '{c}' ({k}) not in {d}")
    for i, sc in enumerate(story["scenes"]):
        sid = sc.get("id", f"s{i}"); charts = sc.get("charts") or {}
        if not charts: errs.append(f"scene {sid}: no charts")
        if not sc.get("steps"): errs.append(f"scene {sid}: no steps")
        for name, spec in charts.items():
            ctx = f"scene {sid} chart '{name}'"
            if spec.get("type") not in TYPES: errs.append(f"{ctx}: unknown type {spec.get('type')}"); continue
            need(spec, ["x", "y", "series", "ys", "size", "id", "year", "facet", "category", "value", "name"], ctx)
        for j, st in enumerate(sc.get("steps") or []):
            ctx = f"scene {sid} step {j}"
            show = st.get("show") or next(iter(charts))
            if show not in charts: errs.append(f"{ctx}: show='{show}' is not a chart in this scene")
            if not (st.get("heading") or st.get("text") or st.get("html")): warns.append(f"{ctx}: no text")
            state = st.get("state") or {}
            if state.get("scrub") and not st.get("tall"): warns.append(f"{ctx}: scrub without tall:true — the scrub will only span the card height")
            if len((st.get("heading") or "") + (st.get("text") or "")) > 420: warns.append(f"{ctx}: long step text (>420 chars); keep cards short")
    for e in errs: print("ERROR:", e)
    for w in warns: print("warn: ", w)
    print(f"{'OK' if not errs else 'FAILED'} — {len(story['scenes'])} scenes, {sum(len(s.get('steps') or []) for s in story['scenes'])} steps, {len(errs)} errors, {len(warns)} warnings")
    sys.exit(1 if errs else 0)
if __name__ == "__main__": main(sys.argv[1] if len(sys.argv) > 1 else ".")
