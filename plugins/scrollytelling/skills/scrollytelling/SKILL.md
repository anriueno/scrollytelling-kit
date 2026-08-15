---
name: scrollytelling
description: >-
  Turn CSV or tabular data into a scroll-driven interactive data story (New York Times /
  Pudding / Flourish style) built with D3 and Scrollama from a single story.json — no chart
  code. Use when the user asks for scrollytelling, a scrolly or scroll story, a data story,
  a data journalism piece, an explainer, an interactive article, a storytelling or narrative
  visualization, a narrative dashboard, charts that change as you scroll, or asks to turn a
  CSV, spreadsheet or dataset into a story. Profiles the data, computes verified facts,
  proposes story angles, writes the storyboard with the user, generates story.json (number,
  area with share morph, line and small multiples, bar, scatter with fit, paths and year
  scrub, beeswarm, world map), visually QA's the page in a browser, and prepares deploy and
  export. Invoke with an optional path to the data file.
license: MIT
metadata:
  version: "0.3.3"
  author: anriueno
---

# Scrollytelling from your data

You are helping the user turn a dataset into a scroll-driven data story. The hard part is **the story**, not the code — the engine in `template/` renders everything from `public/story.json`; you never need to write D3 unless a chart type is genuinely missing.

Kit layout (this skill's directory):
- `template/` — Vite + D3 + Scrollama engine. Chart types: `number, area, line, bar, scatter, beeswarm, map`. Reads `public/story.json` + `public/data/*.csv`. Three visual themes (`dark`, `paper`, `bold`) and two density modes.
- `reference/story-schema.md` — **read this before writing story.json** (all spec/state options).
- `reference/storyboard-template.md`, `reference/qa-checklist.md`
- `scripts/profile_data.py <csv>` — streaming profile (any file size): column types, roles, chart suggestions · `scripts/validate_story.py <project>` — semantic validator: every column/filter/annotation/value reference resolved against the data, ids/facets/series exist, log-axis and ISO3 checks, theme/font ids, placeholder words; **run it after every story.json edit and fix all ERRORs** · `scripts/new_story.sh <dir> [csv…]` — scaffold · `scripts/deploy.sh <dir>` — Vercel · `scripts/export_steps.mjs <url> <out>` — PNG per step + PDF handout.
- `examples/` — finished story.json files. **Read only the one closest to your data shape** (never all of them): `solar-century` (wide time series → area/share morph, bars, line facets, beeswarm, world map), `price-of-a-year` (entity × year panel → scatter with fit, gap, year scrub, connected paths), `retail-shift` (monthly macro series → two-line crossover, area with many series, negative bars, small multiples), `superstore` (raw transactions → aggregated CSVs).

## Process (follow in order — do not skip to building)

### 1. Intake — ask everything at once, then STOP and wait
**Do not profile, scaffold or build until the user has answered.** Even if a CSV is already in the folder, and even if the request seems clear, ask these together in one message (use the structured-question UI if the environment has one; otherwise numbered options) and wait for the reply. The only exception is the user explicitly saying "just build it, don't ask":
1. **Data** — which file(s)? (CSV; Excel → export or convert with python.) If none yet: offer to find a public dataset for the topic.
2. **Story status** — "I know the story I want to tell" / "Find the story for me" / "Somewhere in between".
3. **Audience & use** — Reading (article/report shared by link) / Presenting (you'll scroll it live while talking) / Both. → density: reading = default; presenting = `"density": "presentation"` (bigger type, fewer words, fewer steps).
4. **Length** — Short (8–12 steps, 2–3 scenes) / Full (15–25 steps, 3–5 scenes).
5. **Tone** — a word or two ("serious", "playful", "editorial", "punchy") or "you choose". Do not ask about colours or fonts — you will show them (step 5).
Put originals in `<project>/data/raw/`.

### 2. Profile the data
Run `python3 scripts/profile_data.py <file>` and read it: shape (long / wide / cross-section / transactions), year/date/entity/ISO3 columns, measures, missing %. Transactions must be aggregated first (group by period × category) — do that with a short python script into tidy CSVs.
Do **not** invent context numbers. Everything on the page must come from the file(s); if the story needs context (a comparison, a denominator), fetch it as another CSV and cite it.

### 3. Find the story (this is the valuable step)
- Compute candidate facts with a short python script (extremes, growth ×, shares, before/after, rank changes, crossovers, outliers vs. a fit). **Never quote a number you have not computed.**
- Propose **2–3 story angles**, each in one sentence with its twist ("X grew 10× — but Y's share barely moved because Z doubled"). Recommend one. Good stories have a hook (one striking number), a turn (a second chart that complicates it), and a "so what"/personal ending. If the user already knows the story, verify their claims against the data and say plainly where the data disagrees.
- The user picks. Then write `STORYBOARD.md` from `reference/storyboard-template.md`: verified facts, scenes (insight → chart type + columns → steps), caveats (units, exclusions, anomalies you found), acceptance checklist. Keep it short; this is what the user reviews.

### 4. Scaffold and cut the data
- `bash scripts/new_story.sh <project-dir> <raw csvs>` · `cd <project-dir> && npm install`.
- Cut **small, tidy CSVs** into `public/data/` with python: one file per chart need. Long form for panels (`entity, code, year, value…`), wide for stacked areas (`year, seriesA, seriesB…`). Blank = missing (never 0). Each file well under 1 MB. Maps need an ISO3 column.

### 5. Style discovery — show, don't tell (mandatory unless the user named a look)
**Do not write the full story.json before this step.** Write a first `public/story.json` (hero + first scene is enough), start `npm run dev`, then open the same URL three ways and screenshot each: `?theme=dark`, `?theme=paper`, `?theme=bold` (add `&density=presentation` if they are presenting; add `&font=<id>` to vary type — pick pairings that fit the tone, e.g. `newsreader` for editorial, `bebas` or `archivo` for bold, `plexmono` for technical). Show the user the three screenshots (or the three URLs) and ask which direction they prefer — or "mix" (e.g. paper + a different accent or font). Set `theme.preset` / `theme.accent` / `theme.font` accordingly. Do not ask the user to describe colours or fonts in words first; people react to renders. If the user named a look up front, honour it and skip this.

### 6. Write `public/story.json`
- Read `reference/story-schema.md`. Start from the closest example only.
- Structure: hero (title/kicker/subtitle/sourceNote) → 2–5 scenes → footer (method, sources, licence, caveats). Each scene: 1–3 charts (`show` switches between them), 3–12 steps, one idea per step, ≤ 40 words (≤ 25 in presentation density), `<strong>` on the key number.
- Every step's `state` must fully specify the picture (states don't carry over). Use `annotations` with `{value}` templating instead of typing numbers. Use `tall: true` for scrub steps.
- Reserve one accent colour for the protagonist series; keep series order stable; let the theme handle everything else.
- Run `python3 scripts/validate_story.py <project-dir>` and fix all errors.

### 7. Look at it, step by step
`npm run dev`, open the URL in a browser you can control (Claude in Chrome / chrome-devtools MCP if available; otherwise ask the user to open it and describe/screenshot). **Jump to steps deterministically** instead of relying on scroll triggers (they don't fire in a background tab): open `http://localhost:5173/?step=a:3` (scene id : step index) or run `window.scrolly.goto("a", 3)` in the page, wait ~1.5 s for transitions, screenshot; `window.scrolly.list()` shows all scenes/steps. Follow `reference/qa-checklist.md`: every step, scroll-back test (real scrolling, tab in the foreground), ~400 px width, console clean, `npm run build`. If browser control isn't available, run `node scripts/export_steps.mjs http://localhost:5173 qa` and read the PNGs. Fix collisions with `listLabels`, `dx/dy`, `zoom`, `legend:false`, `yShared:false`, fewer labels, shorter text. Fix narrative problems by editing copy — never by fudging data.

### 8. Deliver, then offer share/export
Summarise the story in a few lines, list caveats, give run instructions — including that they can **edit any text directly in the page** (press E, click, ⌘/Ctrl+S saves to `story.json` while `npm run dev` is running) and, if `themeSwitcher` is on, switch theme/font from the corner control. Then ask once: deploy to a live URL (`bash scripts/deploy.sh <dir>` → Vercel, free; needs `vercel login`), export a PDF/PNG handout of every step (`node scripts/export_steps.mjs <url> <out>`, needs Playwright), both, or neither. Offer to add a LICENSE (code MIT; data keeps its own licence with attribution in the footer). If the user declines, stop.

## Rules
- Numbers: computed, cited, traceable to `public/data/`. If a value looks implausible (e.g. life expectancy 18), investigate; exclude with a footer note rather than plot nonsense.
- Missing ≠ zero. Current vs. constant units: say which. Log axes: say so in the copy.
- **Authenticity:** the page must read as a finished piece. Never render workflow words on it — no "Scene A", "step 3", "placeholder", "TODO", "option", "draft", "sample", "lorem". Titles are real headlines, not "Data Story" / "My Dashboard". Copy sounds like a human wrote it for the reader, not a note to the model.
- **Anti-slop:** don't default to the same look every time — choose the theme for the subject and audience; vary accents; no generic titles; no filler steps ("here is a chart of X"). Every step earns its place with a claim the chart makes visible.
- Don't over-scene: 15–25 steps total is a full story; 8–12 is a good short one. Cut the weakest scene before adding a chart type.
- Progressive disclosure: read `story-schema.md` and *one* example; don't bulk-read examples or the engine source. If a chart the story needs doesn't exist, first express it with an existing type (facets, highlight sets, inline bar values); only then add a chart module in `template/src/charts/` following the `render(state, immediate)` / `progress(p)` contract, and document it in `reference/story-schema.md`.
