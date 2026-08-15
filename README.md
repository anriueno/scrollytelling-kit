# Scrollytelling Kit

Turn any CSV into a scroll-driven data story (New York Times / Pudding style) — as a **Claude Code skill** plus a reusable **D3 + Scrollama engine** driven by one `story.json`.

```
scrollytelling-kit/
├── SKILL.md                 # the Claude Code skill: profile data → find the story → storyboard → story.json → QA
├── template/                # Vite + D3 + Scrollama engine (reads public/story.json + public/data/*.csv)
│   └── src/charts/          # number · area (share morph) · line (facets) · bar · scatter (fit, gap, scrub, paths) · beeswarm · map
├── reference/               # story-schema.md (all options), storyboard-template.md, qa-checklist.md
├── scripts/                 # profile_data.py · validate_story.py · new_story.sh
└── examples/                # solar-century/story.json · price-of-a-year/story.json
```

## Use it as a Claude Code skill
```bash
ln -s "$(pwd)" ~/.claude/skills/scrollytelling     # then, in Claude Code:
/scrollytelling data/my_data.csv
```
Claude profiles the data, proposes story angles with verified numbers, writes the storyboard with you, fills `story.json`, runs the site and checks every step in the browser.

## Use the engine by hand
```bash
bash scripts/new_story.sh my-story data.csv
cd my-story && npm install
# cut small CSVs into public/data/, write public/story.json (see reference/story-schema.md)
python3 ../scripts/validate_story.py .
npm run dev            # http://localhost:5173
npm run build          # static site in dist/ → Netlify / Vercel / GitHub Pages
```

## Design principles baked in
- Every number on the page comes from the CSVs (annotations use `{value}` templating; hero numbers are data references; fits are computed in the browser).
- Each step's state fully describes the picture, so scrolling backwards is always clean.
- Missing ≠ zero; dark-surface palette validated for colour-vision deficiency; reduced-motion respected; mobile layout.

## Licence
Code: MIT. Example data: Our World in Data (CC BY 4.0) — keep the attribution in the footer of anything you publish.
