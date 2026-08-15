#!/usr/bin/env python3
"""Semantic validator for a scrollytelling project. Usage: validate_story.py <project-dir> [--json]
Checks (ERROR = will break or mislead; warn = probably wrong):
  structure/types · duplicate scene & chart ids · data files exist & size · every column reference (x/y/series/ys/size/id/year/
  facet/category/value/note/name/tooltip) · `where` filters (columns, operator shapes) · value refs & expressions (number, bar.values)
  · annotations resolve (series/x rows, ids, stackTop, {value} with no source) · labels/highlight/paths/facets ids exist in data
  · log-axis columns with values <= 0 · map ISO3 codes vs the GeoJSON · scrub on tall steps · theme preset / font / density ids
  · step text present, length; workflow words on the page (authenticity) · footer present."""
import json, sys, os, csv, re
TYPES = {"number", "area", "bar", "line", "beeswarm", "map", "scatter"}
THEMES = {"dark", "paper", "bold"}; DENSITY = {"reading", "presentation"}
FONTS = {"system", "fraunces", "playfair", "newsreader", "libre", "dmserif", "cormorant", "syne", "bebas", "archivo", "plexmono"}
WORKFLOW = re.compile(r"\b(scene [a-z0-9]|step \d|placeholder|todo|lorem|draft|option [abc]|sample text|tbd)\b", re.I)
HEX = re.compile(r"^#[0-9a-fA-F]{6}$")

def num(v):
    try:
        if v in ("", None): return None
        return float(v)
    except: return None

class V:
    def __init__(s): s.errs = []; s.warns = []
    def e(s, m): s.errs.append(m)
    def w(s, m): s.warns.append(m)

def load_data(root, story, v):
    data = {}
    for name, f in (story.get("data") or {}).items():
        p = os.path.join(root, "public", "data", f)
        if not os.path.exists(p): v.e(f"data '{name}': public/data/{f} not found"); continue
        sz = os.path.getsize(p)
        if sz > 3_000_000: v.w(f"data '{name}' is {sz//1_000_000} MB — cut it down; ship only what the charts need")
        with open(p, newline="", encoding="utf-8-sig") as fh:
            rows = list(csv.DictReader(fh))
        data[name] = {"cols": set(rows[0].keys()) if rows else set(), "rows": rows}
        if not rows: v.e(f"data '{name}': file is empty")
    return data

def check_where(v, w, cols, ctx):
    if w is None: return
    if not isinstance(w, dict): v.e(f"{ctx}: where must be an object"); return
    for k, cond in w.items():
        if k not in cols: v.e(f"{ctx}: where references unknown column '{k}'")
        if isinstance(cond, dict):
            bad = set(cond) - {"gt", "gte", "lt", "lte", "ne", "notNull"}
            if bad: v.e(f"{ctx}: where.{k} has unknown operator(s) {sorted(bad)}")

def check_ref(v, ref, data, ctx):
    """value reference: number | {data, where, column|columns, agg} | {op, args}"""
    if ref is None or isinstance(ref, (int, float)): return
    if not isinstance(ref, dict): v.e(f"{ctx}: value must be a number or reference object"); return
    if "op" in ref:
        if ref["op"] not in {"add", "sub", "mul", "div", "sum"}: v.e(f"{ctx}: unknown op '{ref['op']}'")
        for i, a in enumerate(ref.get("args") or []): check_ref(v, a, data, f"{ctx}.args[{i}]")
        if not ref.get("args"): v.e(f"{ctx}: op without args")
        return
    d = ref.get("data")
    if d not in data: v.e(f"{ctx}: data '{d}' not declared"); return
    cols = data[d]["cols"]
    for c in ([ref["column"]] if "column" in ref else ref.get("columns") or []):
        if c not in cols: v.e(f"{ctx}: column '{c}' not in {d}")
    if "column" not in ref and "columns" not in ref: v.e(f"{ctx}: reference needs column or columns")
    check_where(v, ref.get("where"), cols, ctx)
    # does it resolve to at least one row?
    if ref.get("where"):
        rows = data[d]["rows"]; hit = 0
        for r in rows:
            ok = True
            for k, cond in ref["where"].items():
                x = r.get(k)
                if isinstance(cond, list): ok &= (x in [str(c) for c in cond])
                elif isinstance(cond, dict): n = num(x); ok &= (n is not None) and all((n > cond["gt"]) if o == "gt" else (n >= cond["gte"]) if o == "gte" else (n < cond["lt"]) if o == "lt" else (n <= cond["lte"]) if o == "lte" else (x != str(cond["ne"])) if o == "ne" else True for o in cond)
                else: ok &= (str(x) == str(cond))
            if ok: hit += 1; break
        if not hit: v.e(f"{ctx}: where {json.dumps(ref['where'])} matches no rows in {d}")

def col_values(data, d, col): return {r.get(col) for r in data[d]["rows"]}

def main(root, as_json=False):
    v = V(); sp = os.path.join(root, "public", "story.json")
    if not os.path.exists(sp): print("ERROR: public/story.json not found"); sys.exit(1)
    try: story = json.load(open(sp))
    except Exception as ex: print(f"ERROR: story.json is not valid JSON: {ex}"); sys.exit(1)
    for k in ("title", "scenes"):
        if k not in story: v.e(f"missing top-level '{k}'")
    if not story.get("footerHtml"): v.w("no footerHtml — every story should cite sources, units and caveats")
    th = story.get("theme") or {}
    if th.get("preset") and th["preset"] not in THEMES: v.e(f"theme.preset '{th['preset']}' unknown (dark|paper|bold)")
    if th.get("density") and th["density"] not in DENSITY: v.e(f"theme.density '{th['density']}' unknown (reading|presentation)")
    if th.get("font") and th["font"] not in FONTS: v.e(f"theme.font '{th['font']}' unknown ({', '.join(sorted(FONTS))})")
    if th.get("accent") and not HEX.match(str(th["accent"])): v.e("theme.accent must be a 6-digit hex like #f0a640")
    if th.get("palette") and (not isinstance(th["palette"], list) or not all(HEX.match(str(c)) for c in th["palette"])): v.e("theme.palette must be a list of hex colours")
    data = load_data(root, story, v)
    geo_ids = None
    geo_path = os.path.join(root, "public", "data", story.get("geo", "world.geojson"))
    scene_ids = set(); n_steps = 0
    for i, sc in enumerate(story.get("scenes") or []):
        sid = sc.get("id", f"s{i}"); ctxs = f"scene '{sid}'"
        if sid in scene_ids: v.e(f"duplicate scene id '{sid}'")
        scene_ids.add(sid)
        charts = sc.get("charts") or {}
        if not isinstance(charts, dict) or not charts: v.e(f"{ctxs}: charts must be a non-empty object"); continue
        steps = sc.get("steps") or []
        if not steps: v.e(f"{ctxs}: no steps")
        # ---- charts ----
        for name, spec in charts.items():
            ctx = f"{ctxs} chart '{name}'"; t = spec.get("type")
            if t not in TYPES: v.e(f"{ctx}: unknown type '{t}'"); continue
            d = spec.get("data"); cols = data.get(d, {}).get("cols", set()) if d else set()
            if t != "number" and not (t == "bar" and not d):
                if d not in data: v.e(f"{ctx}: data '{d}' not declared"); continue
            for key in ("x", "y", "size", "id", "year", "facet", "category", "value", "note", "name"):
                c = spec.get(key)
                if c is not None and d and c not in cols: v.e(f"{ctx}: {key}='{c}' not a column of {d}")
            for key in ("series", "ys", "tooltip"):
                val = spec.get(key)
                if isinstance(val, list) and d:
                    for c in val:
                        if c not in cols: v.e(f"{ctx}: {key} column '{c}' not in {d}")
                elif isinstance(val, str) and key == "series" and d and val not in cols: v.e(f"{ctx}: series column '{val}' not in {d}")
            check_where(v, spec.get("where"), cols, ctx)
            if t == "line" and not (spec.get("ys") or (spec.get("y") and spec.get("series"))): v.e(f"{ctx}: line needs ys:[...] or y + series")
            if t == "area" and not spec.get("series"): v.e(f"{ctx}: area needs series:[...]")
            if t == "scatter" and (not spec.get("x") or not spec.get("y") or not spec.get("id")): v.e(f"{ctx}: scatter needs x, y, id")
            if t == "beeswarm" and (not spec.get("x") or not spec.get("id")): v.e(f"{ctx}: beeswarm needs x, id")
            if t == "map" and (not spec.get("id") or not spec.get("value")): v.e(f"{ctx}: map needs id (ISO3) and value")
            if t == "bar" and d and (not spec.get("category") or not spec.get("value")): v.e(f"{ctx}: bar with data needs category and value")
            if spec.get("facets") and d and spec.get("facet"):
                have = col_values(data, d, spec["facet"])
                for f in spec["facets"]:
                    if f not in have: v.e(f"{ctx}: facet value '{f}' not found in {d}.{spec['facet']}")
            if spec.get("xLog") and d and spec.get("x"):
                bad = sum(1 for r in data[d]["rows"] if (n := num(r.get(spec["x"]))) is not None and n <= 0)
                if bad: v.e(f"{ctx}: xLog with {bad} rows where {spec['x']} <= 0 (log scale) — filter them with where")
            if t == "map" and d:
                if geo_ids is None:
                    if os.path.exists(geo_path):
                        try: geo_ids = {f.get("id") for f in json.load(open(geo_path))["features"]}
                        except Exception as ex: v.e(f"geo file unreadable: {ex}"); geo_ids = set()
                    else: v.e(f"map: geo file public/data/{os.path.basename(geo_path)} not found"); geo_ids = set()
                ids = {r.get(spec["id"]) for r in data[d]["rows"]}
                nomatch = [x for x in ids if x and x not in geo_ids and not str(x).startswith("OWID")]
                if len(nomatch) > 0.3 * max(1, len(ids)): v.e(f"{ctx}: {len(nomatch)}/{len(ids)} ids in {d}.{spec['id']} don't match GeoJSON ISO3 codes (e.g. {nomatch[:5]})")
                elif nomatch: v.w(f"{ctx}: {len(nomatch)} ids not on the map (e.g. {nomatch[:5]}) — fine if they are aggregates")
            colors = spec.get("colors")
            if t == "map":   # map.colors is a 2-item ramp [low, high]
                if colors is not None and (not isinstance(colors, list) or len(colors) != 2 or not all(HEX.match(str(c)) for c in colors)): v.e(f"{ctx}: map colors must be [lowHex, highHex]")
            elif isinstance(colors, dict):
                for cname, c in colors.items():
                    if not HEX.match(str(c)): v.e(f"{ctx}: colors.{cname} '{c}' is not a hex colour")
            elif colors is not None: v.e(f"{ctx}: colors must be an object {{seriesOrCategory: hex}}")
            dflt = spec.get("defaults") or {}
            check_state(v, t, spec, dflt, data, f"{ctx} defaults")
        # ---- steps ----
        for j, st in enumerate(steps):
            n_steps += 1; ctx = f"{ctxs} step {j}"
            show = st.get("show") or next(iter(charts))
            if show not in charts: v.e(f"{ctx}: show='{show}' is not a chart in this scene"); continue
            spec = charts[show]; state = st.get("state") or {}
            if not (st.get("heading") or st.get("text") or st.get("html")): v.w(f"{ctx}: no text")
            txt = f"{st.get('heading','')} {st.get('text','')}"
            if len(txt) > 420: v.w(f"{ctx}: long step text ({len(txt)} chars); keep cards short")
            m = WORKFLOW.search(re.sub(r"<[^>]+>", " ", txt))
            if m: v.w(f"{ctx}: workflow/placeholder word on the page: '{m.group(0)}'")
            if state.get("scrub") and not st.get("tall"): v.w(f"{ctx}: scrub without tall:true — the scrub will only span the card height")
            if st.get("tall") and not state.get("scrub"): v.w(f"{ctx}: tall step without a scrub — usually unintended")
            merged = {**(spec.get("defaults") or {}), **state}
            check_state(v, spec.get("type"), spec, merged, data, ctx, is_step=True)
    if n_steps and n_steps < 6: v.w(f"only {n_steps} steps — a story usually needs 8+")
    if n_steps > 30: v.w(f"{n_steps} steps — consider cutting; 15–25 is a full story")
    hero_txt = f"{story.get('title','')} {story.get('kicker','')} {story.get('subtitle','')}"
    if WORKFLOW.search(hero_txt) or re.search(r"\b(untitled|data story|my story|dashboard)\b", str(story.get("title","")), re.I): v.w("title looks like a placeholder — write a real headline")
    if as_json: print(json.dumps({"errors": v.errs, "warnings": v.warns})); sys.exit(1 if v.errs else 0)
    for e in v.errs: print("ERROR:", e)
    for w in v.warns: print("warn: ", w)
    print(f"{'OK' if not v.errs else 'FAILED'} — {len(story.get('scenes') or [])} scenes, {n_steps} steps, {len(v.errs)} errors, {len(v.warns)} warnings")
    sys.exit(1 if v.errs else 0)

def check_state(v, t, spec, state, data, ctx, is_step=False):
    d = spec.get("data"); cols = data.get(d, {}).get("cols", set()) if d else set(); rows = data.get(d, {}).get("rows", []) if d else []
    check_where(v, state.get("where"), cols, ctx)
    if t == "number":
        if is_step and state.get("value") is None: v.e(f"{ctx}: number needs state.value")
        for k in ("value", "max", "from"):
            if k in state and not isinstance(state[k], (int, float)): check_ref(v, state[k], data, f"{ctx}.{k}")
    if t == "bar":
        for i, item in enumerate(state.get("values") or []):
            if not isinstance(item, dict) or "category" not in item: v.e(f"{ctx}: values[{i}] needs category")
            else: check_ref(v, item.get("value"), data, f"{ctx}.values[{i}].value")
        if is_step and not d and not state.get("values"): v.e(f"{ctx}: bar has no data and no inline values")
        for c in state.get("highlight") or []:
            if d and spec.get("category") and c not in col_values(data, d, spec["category"]): v.w(f"{ctx}: highlight '{c}' not a category value")
    if t == "area":
        for k in ("visible", "highlight"):
            for c in state.get(k) or []:
                if c not in (spec.get("series") or []): v.e(f"{ctx}: {k} '{c}' is not one of the area series")
    if t == "line":
        keys = spec.get("ys") or (col_values(data, d, spec["series"]) if d and spec.get("series") else set())
        for k in ("series", "highlight"):
            for c in state.get(k) or []:
                if keys and c not in keys: v.e(f"{ctx}: {k} '{c}' is not a line series")
        if state.get("focus") and spec.get("facet") and d and state["focus"] not in col_values(data, d, spec["facet"]): v.e(f"{ctx}: focus '{state['focus']}' is not a facet value")
    if t in ("scatter", "beeswarm"):
        ids = col_values(data, d, spec["id"]) if d and spec.get("id") else set()
        lab = state.get("labels")
        if isinstance(lab, list):
            for c in lab:
                if ids and c not in ids: v.w(f"{ctx}: label id '{c}' not in {d}.{spec.get('id')}")
        for c in state.get("paths") or []:
            if ids and c not in ids: v.e(f"{ctx}: paths id '{c}' not in {d}.{spec.get('id')}")
        if state.get("paths") and not spec.get("year"): v.e(f"{ctx}: paths need a year column in the chart spec")
        hl = state.get("highlight")
        if isinstance(hl, list):
            for c in hl:
                if ids and c not in ids: v.w(f"{ctx}: highlight id '{c}' not in {d}.{spec.get('id')}")
        elif isinstance(hl, dict): check_where(v, hl.get("where"), cols, f"{ctx}.highlight")
        if state.get("scrub") and not spec.get("year"): v.e(f"{ctx}: scrub needs a year column in the chart spec")
        if state.get("fit") and state["fit"] not in ("log", "linear"): v.e(f"{ctx}: fit must be log|linear")
        if state.get("colorBy") and d and state["colorBy"] not in cols: v.e(f"{ctx}: colorBy '{state['colorBy']}' not in {d}")
    if t == "map":
        if state.get("year") is not None and spec.get("year") and d and str(state["year"]) not in col_values(data, d, spec["year"]): v.e(f"{ctx}: year {state['year']} not present in {d}.{spec['year']}")
        if state.get("scrub") and not spec.get("year"): v.e(f"{ctx}: scrub needs a year column")
    # annotations
    xvals = None
    for i, a in enumerate(state.get("annotations") or []):
        actx = f"{ctx}.annotations[{i}]"
        if not isinstance(a, dict): v.e(f"{actx}: must be an object"); continue
        text = a.get("text", "")
        if a.get("series") is not None:
            if t == "area" and a["series"] not in (spec.get("series") or []): v.e(f"{actx}: series '{a['series']}' not in area series")
            if t == "line":
                keys = spec.get("ys") or (col_values(data, d, spec["series"]) if d and spec.get("series") else set())
                if keys and a["series"] not in keys: v.e(f"{actx}: series '{a['series']}' is not a line series")
        if a.get("stackTop") is not None and t == "area" and a["stackTop"] not in (spec.get("series") or []): v.e(f"{actx}: stackTop '{a['stackTop']}' not in area series")
        if (a.get("series") is not None or a.get("stackTop") is not None) and a.get("x") is not None and d and spec.get("x"):
            if xvals is None: xvals = {num(r.get(spec["x"])) for r in rows}
            if num(a["x"]) not in xvals: v.e(f"{actx}: x={a['x']} is not a value of {d}.{spec['x']} (annotation will not resolve)")
        for key in ("id", "gapToFit"):
            if a.get(key) is not None and t == "scatter" and d and spec.get("id") and a[key] not in col_values(data, d, spec["id"]): v.e(f"{actx}: {key} '{a[key]}' not in {d}.{spec['id']}")
        if "{value}" in text and not (a.get("series") or a.get("stackTop") or a.get("id")): v.e(f"{actx}: '{{value}}' in text but no series/stackTop/id to resolve it")
        if a.get("gapToFit") or a.get("fitAt") is not None:
            if not state.get("fit"): v.e(f"{actx}: gapToFit/fitAt need state.fit")
        if not text and not a.get("gapToFit") and a.get("fitAt") is None: v.w(f"{actx}: annotation without text")
        if WORKFLOW.search(text or ""): v.w(f"{actx}: workflow/placeholder word in annotation: '{text}'")

if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    main(args[0] if args else ".", "--json" in sys.argv)
