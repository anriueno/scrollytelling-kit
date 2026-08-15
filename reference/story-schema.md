# story.json reference

One file drives the whole page. Charts read the CSVs in `public/data/`; every number on the page must come from them.

```jsonc
{
  "title": "…", "kicker": "…", "subtitle": "…", "sourceNote": "…",
  "theme": { "accent": "#f0a640" },                 // hero dot, <strong> colour, links
  "data": { "name": "file.csv", … },                 // datasets by name (files in public/data/)
  "geo": "world.geojson",                            // optional; default world.geojson (ISO3 ids)
  "scenes": [ { "id": "a", "charts": { "<name>": <chartSpec>, … }, "steps": [ <step>, … ] } ],
  "footerTitle": "Method & sources", "footerHtml": "<p>…</p>"
}
```

**Scene** = one sticky graphic (may hold several charts, cross-faded) + a column of steps.
**Step** = `{ "show": "<chartName>", "heading": "…", "text": "… <strong>…</strong> …", "tall": false, "state": { … } }`.
`state` is deep-merged over the chart's `defaults`. Each step's state must fully describe what should be visible (states are not carried forward), so scrolling back always reproduces the same picture. Text may contain inline HTML (`<strong>`, `<em>`).

Common `state` keys for every chart: `title`, `subtitle`.
`where` filter syntax (anywhere it appears): `{ "col": value | [values] | { "gt", "gte", "lt", "lte", "ne", "notNull": true } }` — conditions are AND-ed.
Value references (for `number` and `bar.values`): a literal number, `{ "data", "where", "column" | "columns", "agg": "first|sum|max|min|mean" }`, or `{ "op": "add|sub|mul|div|sum", "args": [refs] }`.
Formats: a d3-format string (`",.0f"`, `".1%"`) or `{ "format": ",.0f", "prefix": "$", "suffix": " TWh" }`.

## Chart types

### `number` — hero number with count-up (and optional proportional dot)
spec: `{ "type": "number", "format", "color" }`
state: `{ "value": ref, "max": ref (dot area scale), "from": 0, "label", "sublabel", "dot": true }`

### `area` — stacked area, morphs to 100 % share
spec: `{ "type": "area", "data", "x": "year", "series": ["a","b",…] (bottom→top), "labels": {col: "Label"}, "colors": {col: "#hex"}, "format", "xFormat", "defaults": {…} }`
state: `{ "visible": [cols], "highlight": [cols], "normalize": bool, "showLabels": bool, "yDomain": [0, max], "annotations": [ { "x": 2021, "xRule": true, "text", "anchor": "end", "level": 0 }, { "stackTop": "oil", "x": 2000, "text": "Fossil {value}" }, { "series": "solar", "x": 2024, "text": "{value}" } ] }`
Tips: keep `series` order fixed (it is the palette order — validated adjacent pairs); put the story's hero series on top; use `highlight` before `normalize`; `{value}` is filled from the data.

### `line` — lines or small multiples (facets)
spec: `{ "type": "line", "data", "x", "ys": [cols] | ("y" + "series" col for long data), "facet": col, "facets": [values], "labels", "colors", "format", "xFormat", "yDomain", "seriesOrder", "defaults" }`
state: `{ "series": [keys], "highlight": [keys], "focus": facetValue, "where", "yDomain", "endLabels": bool, "annotations": [ { "facet", "series": key, "x", "text": "Coal {value}", "anchor", "dx", "dy" } ] }`

### `bar` — horizontal bars
spec: `{ "type": "bar", "data", "category", "value", "note" (col shown after value), "format", "valueLabel", "color", "colors": {cat: hex}, "sort": "desc|asc|null", "limit", "where", "defaults" }`
state: `{ "values": [ { "category", "value": ref, "color" } ] (inline, computed), "where", "sort", "limit", "highlight": [cats] }`

### `scatter` — x/y with size, fit line, highlight sets, year scrub, connected-scatter paths
spec: `{ "type": "scatter", "data", "x", "y", "size", "id", "year" (col), "xLog": bool, "xDomain", "yDomain", "xTicks": [values], "format": { "x": …, "y": … }, "xLabel", "yLabel", "accent": { "United States": "#d95926" } (ids that always keep their colour), "color", "legend": "Other countries", "tooltip": [cols], "where", "defaults" }`
state: `{ "where", "year": 2022, "defaultYear", "scrub": [2000, 2023] (progress-driven; step must be tall), "highlight": [ids] | { "where": {…} }, "highlightColor", "highlightLabel", "dim": bool, "hideOthers": bool, "fit": "log" | "linear", "fitLabel": "Each doubling ≈ +{perDoubling} yrs", "fitLabelAt": x, "labels": [ids] | "highlight", "labelValues": bool, "listLabels": bool (stack labels top-left with leader lines — use when highlighted points cluster), "annotations": [ { "id": "Japan", "text" }, { "gapToFit": "United States", "text": "{gap} years vs. curve" }, { "fitAt": 12586, "text": "curve predicts {y}" }, { "x", "y", "text" } ], "paths": [ids] (connected scatter across `year`), "focusPath": id, "pathsLabel", "zoom": { "xDomain", "yDomain" } }`
Notes: with `xLog`, a log fit is a straight line — say so in the copy. `paths` hides dots; use `zoom` to enlarge the region the paths occupy.

### `beeswarm` — one-dimensional distribution
spec: `{ "type": "beeswarm", "data", "x", "size", "id", "where", "xDomain", "xFormat", "xLabel", "color", "legend", "accent": {id: hex}, "tooltip": [cols], "colorFormat", "defaults" }`
state: `{ "labels": [ids], "colorBy": col (sequential ramp), "colorDomain": [lo, hi], "colorLabel": "unit", "where" }`

### `map` — world choropleth (ISO3)
spec: `{ "type": "map", "data", "id": iso3 col, "name": col, "value": col, "year": col (optional), "domain": [lo, hi], "colors": ["#dark", "#bright"], "format", "unit", "valueLabel", "tooltip": [cols], "defaults" }`
state: `{ "year": 2024, "scrub": [2000, 2024] (tall step), "value": col }`
Missing values are hatched, never zero.

## Step patterns that work
- Open with a `number` on the single most surprising value; move to context (`area`/`line`), then the twist (`normalize`, `highlight`, `gapToFit`), then who/where (`line` facets, `beeswarm`, `map`), then a scrub, then a personal/detail scene.
- One idea per step, ≤ 40 words. 6–12 steps per scene; 3–5 scenes.
- Use `tall: true` + `scrub` for time animation; give the tall step a short instruction ("keep scrolling to move through time").
- Reserve one accent colour for the protagonist (`accent`) so the reader can always find it.
