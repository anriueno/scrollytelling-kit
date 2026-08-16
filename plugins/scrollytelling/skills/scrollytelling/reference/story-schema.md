# story.json reference

One file drives the whole page. Charts read the CSVs in `public/data/`; every number on the page must come from them.

```jsonc
{
  "title": "…", "kicker": "…", "subtitle": "…", "sourceNote": "…",
  "theme": { "preset": "dark" | "paper" | "bold", "accent": "#f0a640", "density": "reading" | "presentation", "palette": [8 hex], "font": "system" },
  //   font ids (display · body, loaded on demand from Google Fonts; "system" = no download): system, fraunces, playfair, newsreader, libre, dmserif, cormorant, syne, bebas, archivo, plexmono. Preview with ?font=<id>.
  //   preset: dark editorial (default) · paper (light, warm) · bold (black, big sans, hot accent). density "presentation" = bigger, fewer words.
  //   For style previews, open the dev URL with ?theme=paper / ?theme=bold / &density=presentation — no file edits needed.
  "data": { "name": "file.csv", … },                 // datasets by name (files in public/data/)
  "themeSwitcher": true,                             // optional: show a Dark / Paper / Bold toggle + font menu to readers (remembered in localStorage)
  "editor": true,                                    // inline text editor (E / ?edit=1). Always available in `npm run dev` (⌘/Ctrl+S rewrites public/story.json, .bak kept); OFF on published sites unless "editor": true (then ⌘S downloads story.json)
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

### `number` — hero number with count-up; two or three numbers compare as circles
spec: `{ "type": "number", "format", "color" }`
state (one number): `{ "value": ref, "from": 0, "label", "sublabel" }` — just the number, **no circle** (a lone circle scaled against nothing is decoration; `dot: true` + `max` forces one if you must).
state (comparison): `{ "values": [ { "value": ref, "label", "color" }, { … } ], "sublabel" }` — 2–3 circles side by side, area ∝ value, number above each. Use this when the point *is* the ratio (e.g. solar 2,143 vs wind 2,510; home wins 50.7% vs away 26.4%).

### `area` — stacked area, morphs to 100 % share
spec: `{ "type": "area", "data", "x": "year", "series": ["a","b",…] (bottom→top), "labels": {col: "Label"}, "colors": {col: "#hex"}, "format", "xFormat", "xTicks", "legend": false (hide the legend when > 8 series — direct labels carry identity), "defaults": {…} }`
state: `{ "visible": [cols], "highlight": [cols], "normalize": bool, "showLabels": bool, "yDomain": [0, max], "annotations": [ { "x": 2021, "xRule": true, "text", "anchor": "end", "level": 0 }, { "stackTop": "oil", "x": 2000, "text": "Fossil {value}" }, { "series": "solar", "x": 2024, "text": "{value}" } (placed mid-layer at that x) ] }`
Tips: keep `series` order fixed (it is the palette order — validated adjacent pairs); put the story's hero series on top; use `highlight` before `normalize`; `{value}` is filled from the data.

### `line` — lines or small multiples (facets)
spec: `{ "type": "line", "data", "x", "ys": [cols] | ("y" + "series" col for long data), "facet": col, "facets": [values], "yShared": false (independent y per panel), "labels", "colors", "format", "xFormat", "yDomain", "seriesOrder", "defaults" }`
state: `{ "series": [keys], "highlight": [keys], "focus": facetValue, "where", "yDomain", "endLabels": bool, "annotations": [ { "facet", "series": key, "x", "text": "Coal {value}", "anchor", "dx", "dy" } ] }`

### `bar` — horizontal bars
spec: `{ "type": "bar", "data", "category", "value", "note" (col shown after value), "format", "valueLabel", "color", "colors": {cat: hex}, "negativeColor" (default red; negatives draw left of a zero line), "colorNegatives": false, "highlightColor", "sort": "desc|asc|none" (null/omitted = desc), "limit", "where", "defaults" }`
state: `{ "values": [ { "category", "value": ref, "color" } ] (inline, computed), "where", "sort", "limit", "highlight": [cats], "highlightColor" }`

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

### `slope` — "then vs now" per entity (slope chart, or dumbbell rows)
spec: `{ "type": "slope", "data", "id", "from": { "column", "label" }, "to": { "column", "label" }, "format", "color", "accent": {id: hex}, "tooltip": [cols], "where", "yDomain" | "xDomain" }` (wide data: one row per entity, two value columns)
state: `{ "highlight": [ids], "highlightColor", "highlightLabel", "labels": [ids] | "highlight" | "all", "dumbbell": true (horizontal rows instead of two axes), "sort": "to" | "from" | "change" | "none", "limit", "dim": true, "where" }`
Use for: 2000 vs 2024 by country, before/after by category, home vs away by team. Slope for ≤ ~40 entities; `dumbbell` + `limit` for a ranked top-N.

### `waffle` — unit chart: "x of y", "1 in N", or a composition
spec: `{ "type": "waffle", "format", "cells": 100, "color" }`
state (share): `{ "value": ref, "total": ref (omit → value is a percent of 100), "label", "sublabel" }`
state (composition): `{ "parts": [ { "value": ref, "label", "color" }, … ], "total": ref (default = sum of parts), "sublabel" }`
Use for: "82 wins · 23 draws · 29 defeats of 134", "1.8% of retail dollars", any share the reader should *count*.

### `histogram` — distribution of one numeric column over many rows
spec: `{ "type": "histogram", "data", "x", "bins": 20 | [thresholds], "xDomain", "format", "xLabel", "color", "where" }`
state: `{ "where", "bins", "normalize": true (share of rows), "highlightRange": [lo, hi], "highlightColor", "highlightLabel", "showMean", "showMedian", "annotations": [{ "x", "text" }], "compareWhere": {…} (second distribution as an outline), "compareLabel", "legend" }`
Use for: goals per match over 49k games, order sizes, prices, ages — anything with too many rows for a beeswarm. Needs the row-level (or lightly aggregated) CSV, not totals.

## Step patterns that work
- Open with a `number` on the single most surprising value; move to context (`area`/`line`), then the twist (`normalize`, `highlight`, `gapToFit`), then who/where (`line` facets, `beeswarm`, `map`), then a scrub, then a personal/detail scene.
- One idea per step, ≤ 40 words. 6–12 steps per scene; 3–5 scenes.
- Use `tall: true` + `scrub` for time animation; give the tall step a short instruction ("keep scrolling to move through time").
- Reserve one accent colour for the protagonist (`accent`) so the reader can always find it.

## Runtime hooks (QA & deep links)
- `?theme=`, `?font=`, `?density=`, `?accent=` — preview overrides. `?edit=1` — open in edit mode (dev / editor:true).
- `?step=<sceneId>:<index>` — render and scroll to a specific step on load. `window.scrolly.goto(sceneId, index)` / `window.scrolly.list()` — same from the console or an automation tool.

## Mobile behaviour (built in — nothing to configure)
Below 900 px the layout switches to two bands: the graphic is sticky in the top 52 svh, and each step's card rests in the band below it (`position: sticky`) while active; inactive cards are hidden, so text never scrolls over the chart. Sizes use `svh` (stable small-viewport units) so browser chrome showing/hiding doesn't shift triggers. Chart titles wrap; long annotations flip or wrap; small-multiple legends hide when redundant. Keep mobile in mind when writing copy: ≤ 40 words per card, and no more than ~5 lines of heading+text.
