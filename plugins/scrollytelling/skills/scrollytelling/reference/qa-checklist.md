# Visual QA checklist (do this in a real browser before calling it done)

Run `npm run dev`, open the URL, and for **every step** (jump with `?step=<scene>:<index>` or `window.scrolly.goto(scene, index)` — deterministic, works even when the tab is in the background; `window.scrolly.list()` enumerates them):
1. Scroll to it and screenshot. Read the chart as a stranger: is the step's claim visible without the text?
2. Check labels/annotations for collisions and clipping (right margin, top legend, y-axis label).
3. Hover: tooltip appears with the right values.
Then:
4. Scroll from the last step back to the first, then forward again — no leftover paths/labels/annotations, hero numbers reset.
5. Resize to ~390 px wide (or emulate a phone): the chart sits in the top band and the active card rests **below** it — never on top; outgoing cards are invisible while they pass over the chart; titles wrap, annotations wrap or flip instead of overflowing; scrubs still work with the card below the graphic. Test with a fast flick, not just slow scrolling.
6. Console: zero errors.
7. `npm run build` succeeds; `dist/` is small (< 2 MB); only the cut CSVs are shipped (raw downloads live in `data/raw/`, not `public/`).
8. Numbers in the copy match the data (grep the CSV for each headline figure).
9. Authenticity scan: search the rendered text for "step", "scene", "placeholder", "TODO", "option", "draft", "lorem" — none should appear on the page.
10. Try the two other themes (`?theme=paper`, `?theme=bold`) once: nothing should become unreadable (theme-agnostic colours come from CSS variables; only story-specific series colours are fixed).
