import * as d3 from "d3";

// Validated categorical orders (adjacent-pair CVD safe) — dark and light surfaces. Users can override per series in story.json.
const PALETTES = { dark: ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#008300", "#9085e9", "#e66767"], light: ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#4a3aa7", "#e34948"] };
export const CATEGORICAL = [...PALETTES.dark];
export const INK = { ink: "#f4f1ea", ink2: "#b9b5aa", muted: "#7d7a72", grid: "#232833", bg: "#0f1218", curve: "#f4f1ea", dim: "#4b5563", seqLow: "#4a3f2c", seqHigh: "#ffb03b" };
export const THEMES = ["dark", "paper", "bold"];
/** Apply a theme preset (+ optional overrides) and refresh INK/CATEGORICAL from the computed CSS variables. Call before creating charts. */
export function applyTheme(theme = {}) {
  const preset = THEMES.includes(theme.preset) ? theme.preset : "dark";
  const root = document.documentElement;
  root.setAttribute("data-theme", preset);
  if (theme.density === "presentation") root.setAttribute("data-density", "presentation");
  if (theme.accent) root.style.setProperty("--accent", theme.accent);
  const cs = getComputedStyle(root); const v = (n) => cs.getPropertyValue(n).trim();
  Object.assign(INK, { ink: v("--ink"), ink2: v("--ink-2"), muted: v("--muted"), grid: v("--grid"), bg: v("--bg"), curve: v("--ink"), dim: v("--dim"), seqLow: v("--seq-low"), seqHigh: v("--seq-high") });
  const pal = theme.palette && Array.isArray(theme.palette) ? theme.palette : PALETTES[preset === "paper" ? "light" : "dark"];
  CATEGORICAL.splice(0, CATEGORICAL.length, ...pal);
  return preset;
}

export const reducedMotion = () => window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
export const DUR = () => (reducedMotion() ? 0 : 800);

export function fmt(spec) {
  // spec: d3-format string, optionally with prefix/suffix: {format:",.0f", prefix:"$", suffix:" TWh"}
  if (!spec) return (v) => (v == null || isNaN(v) ? "–" : d3.format(",.1f")(v).replace(/\.0$/, ""));
  if (typeof spec === "string") spec = { format: spec };
  const f = d3.format(spec.format || ",.1f");
  return (v) => (v == null || isNaN(v) ? "–" : (spec.prefix || "") + f(v) + (spec.suffix || ""));
}

// where: {col: value | [values] | {gt,gte,lt,lte,ne}} — all conditions AND-ed
export function where(rows, cond) {
  if (!cond) return rows;
  return rows.filter((r) => Object.entries(cond).every(([k, v]) => {
    const x = r[k];
    if (Array.isArray(v)) return v.includes(x) || v.includes(+x);
    if (v && typeof v === "object") {
      const n = +x;
      if (v.gt != null && !(n > v.gt)) return false; if (v.gte != null && !(n >= v.gte)) return false;
      if (v.lt != null && !(n < v.lt)) return false; if (v.lte != null && !(n <= v.lte)) return false;
      if (v.ne != null && (x == v.ne)) return false; if (v.notNull && (x === "" || x == null)) return false;
      return true;
    }
    return x == v;
  }));
}

export function num(v) { const n = +v; return v === "" || v == null || isNaN(n) ? null : n; }

export function deepMerge(a, b) {
  if (b == null) return a; if (a == null || typeof a !== "object" || Array.isArray(a) || typeof b !== "object" || Array.isArray(b)) return b;
  const o = { ...a }; for (const k of Object.keys(b)) o[k] = deepMerge(a[k], b[k]); return o;
}

export function size(el) { const r = el.getBoundingClientRect(); return { width: Math.max(280, r.width), height: Math.max(240, r.height) }; }

const tip = () => document.getElementById("tooltip");
export function showTip(html, event) { const t = tip(); t.innerHTML = html; t.classList.add("show"); moveTip(event); }
export function moveTip(event) {
  const t = tip(); const pad = 14; let x = event.clientX + pad, y = event.clientY + pad; const r = t.getBoundingClientRect();
  if (x + r.width > window.innerWidth - 8) x = event.clientX - r.width - pad; if (y + r.height > window.innerHeight - 8) y = event.clientY - r.height - pad;
  t.style.left = x + "px"; t.style.top = y + "px";
}
export function hideTip() { tip().classList.remove("show"); }
export const rowsHtml = (pairs) => pairs.map(([k, v, c]) => `<div class="row"><span>${c ? `<i class="sw" style="background:${c}"></i>` : ""}${k}</span><b>${v}</b></div>`).join("");

// shared chrome: title/subtitle + legend div
export function chrome(el, svg) {
  const title = svg.append("text").attr("class", "chart-title").attr("y", 20);
  const sub = svg.append("text").attr("class", "chart-sub").attr("y", 40);
  const legend = el.append("div").attr("class", "legend").style("top", "48px");
  return {
    set(t, s) { title.text(t || ""); sub.text(s || ""); },
    legend(items) { // [[label, color]]
      const li = legend.selectAll("span").data(items || [], (d) => d[0]);
      li.enter().append("span").merge(li).style("--c", (d) => d[1]).text((d) => d[0]); li.exit().remove();
    },
    legendLeft(px) { legend.style("left", px + "px"); },
  };
}

// annotations: [{x, y, text, anchor, dx, dy, line:true|{x2,y2}, xRule:true}] in data coords → drawn with scales
export function drawAnnotations(g, anns, xs, ys, t, plot) {
  const data = (anns || []).map((a, i) => ({ ...a, id: a.id || `${a.text}-${i}` }));
  const sel = g.selectAll("g.a").data(data, (d) => d.id);
  const e = sel.enter().append("g").attr("class", "a").attr("opacity", 0);
  e.append("line"); e.append("circle").attr("r", 4).attr("fill", INK.ink); e.append("text");
  const m = e.merge(sel);
  const px = (d) => (d.px != null ? d.px : xs(d.x)), py = (d) => (d.py != null ? d.py : d.y != null ? ys(d.y) : plot.top + 14);
  m.select("line").attr("x1", px).attr("x2", (d) => (d.line && d.line.x2 != null ? xs(d.line.x2) : px(d))).attr("y1", (d) => (d.xRule ? plot.top : py(d))).attr("y2", (d) => (d.xRule ? plot.bottom : d.line && d.line.y2 != null ? ys(d.line.y2) : py(d))).attr("opacity", (d) => (d.xRule || d.line ? 1 : 0));
  m.select("circle").attr("cx", px).attr("cy", py).attr("opacity", (d) => (d.dot ? 1 : 0));
  m.select("text").attr("x", (d) => px(d) + (d.dx ?? (d.anchor === "end" ? -6 : 6))).attr("y", (d) => (d.xRule ? plot.bottom - 16 - (d.level || 0) * 18 : py(d) + (d.dy ?? -8))).attr("text-anchor", (d) => d.anchor || "start").text((d) => d.text);
  m.transition().duration(t).delay(t * 0.6).attr("opacity", 1);
  sel.exit().transition().duration(t / 3).attr("opacity", 0).remove();
}

// greedy push-apart for right-side labels: items {lx, ly}
export function pushApart(items, minGap = 14, xTol = 150) {
  items.sort((p, q) => p.ly - q.ly);
  for (let i = 0; i < items.length; i++) for (let j = 0; j < i; j++) { const p = items[j], q = items[i]; if (Math.abs(p.lx - q.lx) < xTol && Math.abs(p.ly - q.ly) < minGap) q.ly = p.ly + minGap; }
  return items;
}
export const colorFor = (spec, key, i) => (spec.colors && spec.colors[key]) || CATEGORICAL[i % CATEGORICAL.length];
export const labelFor = (spec, key) => (spec.labels && spec.labels[key]) || key;
