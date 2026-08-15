---
name: scrollytelling
description: Turn a user's dataset (CSV) into a scroll-driven data story — a New York Times / Pudding-style scrollytelling page built with D3 + Scrollama from a single story.json. Use when the user says "scrollytelling", "scrolly", "data story", "turn this CSV into a story", "storytelling visualization", or wants a narrative, scroll-animated presentation of data. Handles: profiling the data, proposing story angles, writing the storyboard with the user, filling story.json (no custom chart code needed), running and visually QA-ing the page, and preparing it for deploy.
---

# Scrollytelling from your data

You are helping the user turn a dataset into a scroll-driven data story. The hard part is **the story**, not the code — the engine in `template/` renders everything from `public/story.json`; you never need to write D3 unless a chart type is genuinely missing.

Kit layout (this skill's directory):
- `template/` — Vite + D3 + Scrollama engine. Chart types: `number, area, line, bar, scatter, beeswarm, map`. Reads `public/story.json` + `public/data/*.csv`.
- `reference/story-schema.md` — **read this before writing story.json** (all spec/state options).
- `reference/storyboard-template.md`, `reference/qa-checklist.md`
- `scripts/profile_data.py <csv>` — column types, roles, chart suggestions. `scripts/validate_story.py <project>` — checks story.json against the data. `scripts/new_story.sh <dir> [csv…]` — scaffold.
- `examples/` — finished story.json files (solar-century: number → area/share morph → bars → line facets → beeswarm → map scrub; price-of-a-year: scatter with fit, gap, year scrub, connected paths; superstore: business transactions → aggregated CSVs, bars with negatives, discount-vs-margin scatter).

## Process (follow in order — do not skip to building)

### 1. Get the data and profile it
- Ask for the file(s) if not given (CSV; Excel → ask them to export CSV, or convert with python). Put originals in `<project>/data/raw/`.
- Run `python3 scripts/profile_data.py <file>` and read the output. Note shape (long/wide/cross-section), year/entity/ISO3 columns, measures, missing %.
- If the data is public/well-known, do **not** invent context numbers — everything on the page must come from the file(s). If the user wants extra context data, fetch it as another CSV.

### 2. Find the story (this is the valuable step)
- Compute candidate facts with a short python script (extremes, growth ×, shares, before/after, rank changes, outliers vs. a fit). **Never quote a number you have not computed.**
- Propose **2–3 story angles**, each in one sentence with its twist ("X grew 10× — but Y's share barely moved because Z doubled"). Recommend one. Good stories have a hook (one striking number), a turn (a second chart that complicates it), and a "so what"/personal ending.
- Ask the user to pick or adjust. Then write `STORYBOARD.md` from `reference/storyboard-template.md`: verified facts, scenes (insight → chart type + columns → steps), caveats (units, exclusions, anomalies you found), acceptance checklist. Keep it short; this is what the user reviews.

### 3. Scaffold and cut the data
- `bash scripts/new_story.sh <project-dir> <raw csvs>` (or copy `template/` manually). `cd <project-dir> && npm install`.
- Cut **small, tidy CSVs** into `public/data/` with python: one file per chart need (e.g. `world_by_year.csv`, `snapshot_2022.csv`, `entities_panel.csv`). Long form for panels (`entity, code, year, value…`), wide for stacked areas (`year, seriesA, seriesB…`). Blank = missing (never 0). Keep each file well under 1 MB. Maps need an ISO3 column.

### 4. Write `public/story.json`
- Read `reference/story-schema.md`. Start from the closest example in `examples/`.
- Structure: hero (title/kicker/subtitle/sourceNote) → 3–5 scenes → footer (method, sources, licence, caveats). Each scene: 1–3 charts (`show` switches between them), 3–12 steps, one idea per step, ≤ 40 words, `<strong>` on the key number.
- Every step's `state` must fully specify the picture (states don't carry over). Use `annotations` with `{value}` templating instead of typing numbers. Use `tall: true` for scrub steps.
- Palette: the engine's defaults are validated for a dark surface; give the protagonist a fixed `accent` colour; keep series order stable.
- Run `python3 scripts/validate_story.py <project-dir>` and fix all errors.

### 5. Look at it, step by step
- `npm run dev`, open the URL in a browser you can control (Claude in Chrome / chrome-devtools MCP if available; otherwise ask the user to open it and describe/screenshot). Follow `reference/qa-checklist.md`: every step, scroll-back test, mobile width, console clean, `npm run build`.
- Fix collisions with `listLabels`, `dx/dy`, `zoom`, fewer labels, shorter text. Fix narrative problems by editing copy — never by fudging data.

### 6. Hand over
- Summarise the story in a few lines, list caveats, and give run/deploy instructions (push to GitHub → Netlify/Vercel, `netlify.toml` included). Offer to add LICENSE (code MIT; data keeps its own licence with attribution in the footer).

## Rules
- Numbers: computed, cited, traceable to `public/data/`. If a value looks implausible (e.g. life expectancy 18), investigate; exclude with a footer note rather than plot nonsense.
- Missing ≠ zero. Current vs. constant units: say which. Log axes: say so in the copy.
- Don't over-scene: 15–25 steps total is a full story. Cut the weakest scene before adding a chart type.
- If a chart the story needs doesn't exist in the engine, first try to express it with an existing type (facets, highlight sets, inline bar values); only then add a chart module in `template/src/charts/` following the `render(state, immediate)` / `progress(p)` contract, and document it in `reference/story-schema.md`.
