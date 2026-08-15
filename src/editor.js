/** Inline text editor. Press E (or ?edit=1) → hero, step and footer text become editable; ⌘/Ctrl+S saves.
 *  In `npm run dev` the page POSTs to /__save-story and story.json is rewritten (a .bak is kept). On a static/published
 *  site it downloads story.json instead. Charts/annotations are not editable here — edit story.json for those. */
export function initEditor(story, opts = {}) {
  let on = false;
  const targets = () => [
    ["#hero h1", (v) => (story.title = v)], ["#hero .kicker", (v) => (story.kicker = v)], ["#hero .subtitle", (v) => (story.subtitle = v)], ["#hero .source-note", (v) => (story.sourceNote = v)],
    ...story.scenes.flatMap((sc, si) => sc.steps.flatMap((st, i) => {
      const base = `#scrolly-${sc.id || `s${si}`} .step[data-step="${i}"]`;
      return [[`${base} h2`, (v) => (st.heading = v)], [`${base} p`, (v, html) => (st.text = html)]];
    })),
    [".footer > p:not(.fine)", (v, html) => (story.footerHtml = `<p>${html}</p>`)],
  ];
  const bar = document.createElement("div"); bar.className = "edit-bar"; bar.hidden = true;
  bar.innerHTML = `<span>Editing — click any text, then <b>⌘/Ctrl+S</b> to save</span><button type="button" data-a="save">Save</button><button type="button" data-a="off">Done</button>`;
  document.body.appendChild(bar);
  const toggle = document.createElement("button"); toggle.className = "edit-toggle"; toggle.type = "button"; toggle.title = "Edit text (E)"; toggle.textContent = "✎"; document.body.appendChild(toggle);
  function set(state) {
    on = state; document.documentElement.toggleAttribute("data-editing", on); bar.hidden = !on;
    targets().forEach(([sel]) => document.querySelectorAll(sel).forEach((el) => { el.contentEditable = on ? "true" : "false"; }));
  }
  function collect() { targets().forEach(([sel, set]) => { const el = document.querySelector(sel); if (el) set(el.textContent.trim(), el.innerHTML.trim()); }); return story; }
  async function save() {
    const data = collect();
    try {
      const r = await fetch("/__save-story", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (r.ok) { flash("Saved to public/story.json"); return; }
    } catch {}
    const blob = new Blob([JSON.stringify(data, null, 1)], { type: "application/json" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "story.json"; a.click();
    flash("Downloaded story.json — replace public/story.json with it");
  }
  function flash(msg) { const el = bar.querySelector("span"); const old = el.textContent; el.textContent = msg; setTimeout(() => (el.textContent = old), 2500); }
  bar.addEventListener("click", (e) => { const a = e.target.dataset.a; if (a === "save") save(); if (a === "off") set(false); });
  toggle.addEventListener("click", () => set(!on));
  document.addEventListener("keydown", (e) => {
    const t = e.target; const typing = t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s" && on) { e.preventDefault(); save(); }
    else if (!typing && e.key.toLowerCase() === "e") set(!on);
    else if (e.key === "Escape" && on) set(false);
  });
  if (opts.start) set(true);
  return { set, save };
}
