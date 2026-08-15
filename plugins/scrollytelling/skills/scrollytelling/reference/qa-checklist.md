# Visual QA checklist (do this in a real browser before calling it done)

Run `npm run dev`, open the URL, and for **every step**:
1. Scroll to it and screenshot. Read the chart as a stranger: is the step's claim visible without the text?
2. Check labels/annotations for collisions and clipping (right margin, top legend, y-axis label).
3. Hover: tooltip appears with the right values.
Then:
4. Scroll from the last step back to the first, then forward again — no leftover paths/labels/annotations, hero numbers reset.
5. Resize to ~400 px wide: nothing overflows horizontally; text remains readable; scrubs still work.
6. Console: zero errors.
7. `npm run build` succeeds; `dist/` is small (< 2 MB); only the cut CSVs are shipped (raw downloads live in `data/raw/`, not `public/`).
8. Numbers in the copy match the data (grep the CSV for each headline figure).
9. Authenticity scan: search the rendered text for "step", "scene", "placeholder", "TODO", "option", "draft", "lorem" — none should appear on the page.
10. Try the two other themes (`?theme=paper`, `?theme=bold`) once: nothing should become unreadable (theme-agnostic colours come from CSS variables; only story-specific series colours are fixed).
