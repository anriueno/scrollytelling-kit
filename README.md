# Scrollytelling Kit

**Turn any CSV into a scroll-driven data story** — the New York Times / Pudding style: sticky animated charts, narrative that scrolls past, charts that morph as you read.

**Live demos built with it:** [The Solar Century](https://solar-century.vercel.app) (energy) · [The Price of a Year](https://price-of-a-year.vercel.app) (health spending vs. life expectancy) · [The Death of the Department Store](https://retail-shift.vercel.app) (US retail).

A Claude Code **plugin/skill** that does the storytelling work with you (profile the data → verified facts → story angles → storyboard → page), on top of a reusable **D3 + Scrollama engine** driven by one `story.json`. No chart code.

## Install (Claude Code)

```
/plugin marketplace add anriueno/scrollytelling-kit
/plugin install scrollytelling@scrollytelling-kit
```

To update later: `/plugin marketplace update` then reinstall (`/plugin uninstall scrollytelling@scrollytelling-kit` · `/plugin install scrollytelling@scrollytelling-kit`). Existing stories keep their engine copy; upgrade one with `rsync -a <kit>/plugins/scrollytelling/skills/scrollytelling/template/src/ <story>/src/`.

Then, in any project:

```
/scrollytelling data/my_data.csv
```
(or just say "turn this CSV into a data story" — the skill auto-triggers.)

Manual install without the plugin system:
```bash
git clone https://github.com/anriueno/scrollytelling-kit
ln -s "$(pwd)/scrollytelling-kit/plugins/scrollytelling/skills/scrollytelling" ~/.claude/skills/scrollytelling
```

## What happens when you run it
1. **Intake** — one message of questions: data, "do you know the story?", reading vs presenting, length, tone.
2. **Profile** — one streaming pass over the file (multi-GB OK): column types, shape (long / wide / transactions), suggested charts (`scripts/profile_data.py`).
3. **Find the story** — computes candidate facts (never invents numbers), proposes 2–3 angles with a twist, you pick.
4. **Storyboard** — verified facts, scenes, chart per scene, caveats, acceptance checklist.
5. **Style discovery — show, don't tell** — the first scene rendered three ways (`?theme=dark`, `?theme=paper`, `?theme=bold`); you pick by looking, not by describing colours.
6. **Build** — scaffolds a Vite project from `template/`, cuts small tidy CSVs, writes `public/story.json`, runs the semantic validator (`scripts/validate_story.py`: every column, filter, annotation and value reference is resolved against the data; ids, facets, series, log axes, ISO3 codes, theme/font ids, placeholder words).
7. **QA** — runs the page and checks every step in a browser (collisions, scroll-back, mobile, console), then `npm run build`.
8. **Share** — `scripts/deploy.sh` (Vercel, free) and `scripts/export_steps.mjs` (PNG per step + PDF handout).

**Themes:** `dark` editorial (default) · `paper` (light, warm) · `bold` (black, big sans, hot accent) — set in `story.json` (`theme.preset`, `theme.accent`) or previewed with `?theme=`. **Density:** `reading` (default) or `presentation` (bigger type, fewer words) for scrolling live while you talk. **Reader toggle:** `"themeSwitcher": true` adds a Dark / Paper / Bold control and a font menu (10 curated Google-Fonts pairings, loaded on demand; `theme.font` / `?font=`) to the page, remembered per reader. **Inline editing:** press **E** on any story, click text, **⌘/Ctrl+S** — in `npm run dev` it writes straight back to `public/story.json`; on a published site it downloads the updated file.

## The engine (`template/`)
Seven chart primitives, all declarative and step-state driven:

| type | highlights |
|---|---|
| `number` | hero count-up from a data reference or expression |
| `area` | stacked area, per-step `visible`/`highlight`, **normalize → 100 % share morph**, `{value}` annotations |
| `line` | lines or **small multiples** (`facet`), focus, annotations |
| `bar` | horizontal bars, negatives with zero line, inline computed values |
| `scatter` | size, log axes, **fit line**, gap-to-curve, highlight-by-filter, **scroll year-scrub**, **connected-scatter paths**, zoom |
| `beeswarm` | distribution with tiered labels, colour-by |
| `map` | world choropleth (ISO3), scroll year-scrub, hatched missing |

Full options: `plugins/scrollytelling/skills/scrollytelling/reference/story-schema.md`. Examples: `…/examples/` (energy transition, health spending vs. life expectancy, retail sales & discounts).

## Other coding agents
The skill is plain markdown + scripts, so Codex, Gemini CLI, OpenCode etc. can use it too: point the agent at `plugins/scrollytelling/skills/scrollytelling/SKILL.md` and let it read only the reference files it needs.

## Repo layout
```
.claude-plugin/marketplace.json            # marketplace (this repo)
plugins/scrollytelling/
  .claude-plugin/plugin.json               # plugin manifest
  skills/scrollytelling/
    SKILL.md                               # the skill (process + rules)
    template/                              # Vite + D3 + Scrollama engine
    reference/                             # story-schema.md · storyboard-template.md · qa-checklist.md
    scripts/                               # profile_data.py · validate_story.py · new_story.sh · deploy.sh · export_steps.mjs
    examples/                              # solar-century · price-of-a-year · superstore
```

## Design principles baked in
- Every number on the page comes from the CSVs; annotations use `{value}` templating; fits are computed in the browser.
- Each step's state fully describes the picture, so scrolling backwards is always clean.
- Missing ≠ zero; dark-surface palette validated for colour-vision deficiency; reduced-motion respected; mobile layout.

## Prior art
[ScrollyTeller](https://github.com/ihmeuw/ScrollyTeller) (IHME) builds narration from CSV but leaves charts to you; [Closeread](https://closeread.dev) does scrollytelling in Quarto; [Scrollama](https://github.com/russellsamora/scrollama) is the trigger library used here. This kit adds declarative charts and the AI-guided storyboarding step.

## Licence
Code: MIT. Example data: Our World in Data (CC BY 4.0) and the public Superstore sample — keep the attribution in the footer of anything you publish.
