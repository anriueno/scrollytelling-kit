# Scrollytelling Kit

**Turn any CSV into a scroll-driven data story** — the New York Times / Pudding style: sticky animated charts, narrative that scrolls past, charts that morph as you read.

A Claude Code **plugin/skill** that does the storytelling work with you (profile the data → verified facts → story angles → storyboard → page), on top of a reusable **D3 + Scrollama engine** driven by one `story.json`. No chart code.

## Install (Claude Code)

```
/plugin marketplace add anriueno/scrollytelling-kit
/plugin install scrollytelling@scrollytelling-kit
```

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
1. **Profile** — column types, shape (long / wide / transactions), suggested charts (`scripts/profile_data.py`).
2. **Find the story** — computes candidate facts (never invents numbers), proposes 2–3 angles with a twist, you pick.
3. **Storyboard** — verified facts, scenes, chart per scene, caveats, acceptance checklist.
4. **Build** — scaffolds a Vite project from `template/`, cuts small tidy CSVs, writes `public/story.json`, validates it (`scripts/validate_story.py`).
5. **QA** — runs the page and checks every step in a browser (collisions, scroll-back, mobile, console), then `npm run build` → deploy to Netlify/Vercel/GitHub Pages.

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

## Repo layout
```
.claude-plugin/marketplace.json            # marketplace (this repo)
plugins/scrollytelling/
  .claude-plugin/plugin.json               # plugin manifest
  skills/scrollytelling/
    SKILL.md                               # the skill (process + rules)
    template/                              # Vite + D3 + Scrollama engine
    reference/                             # story-schema.md · storyboard-template.md · qa-checklist.md
    scripts/                               # profile_data.py · validate_story.py · new_story.sh
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
