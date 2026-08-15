import * as d3 from "d3";
import { fmt, DUR, size, INK, chrome, CATEGORICAL, drawAnnotations, showTip, hideTip, rowsHtml, num, where, pushApart } from "../util.js";
/** Scatter. spec: {data, x, y, size?, id, year? (col), xLog, xDomain, yDomain, format:{x,y}, accent:{id:color}, color, tooltip:[cols]}
 *  state: {title, subtitle, where, year, scrub:[y0,y1], highlight:[ids] | {where}, highlightColor, dim:true, fit:"log"|"linear", fitLabel, labels:[ids] | "highlight", listLabels:true, annotations, paths:[ids], focusPath:id, zoom:{xDomain,yDomain}, hideOthers} */
export function createScatter(container, spec, datasets) {
  const all = datasets[spec.data].map((r) => ({ ...r, id: r[spec.id], xv: num(r[spec.x]), yv: num(r[spec.y]), sv: spec.size ? num(r[spec.size]) || 0 : 1, yr: spec.year ? +r[spec.year] : null })).filter((d) => d.xv != null && d.yv != null && (!spec.xLog || d.xv > 0));
  const el = d3.select(container), svg = el.append("svg"); const ch = chrome(el, svg);
  const gAxes = svg.append("g"), gx = gAxes.append("g").attr("class", "axis x"), gy = gAxes.append("g").attr("class", "axis y"), gGrid = gAxes.append("g").attr("class", "grid");
  const xLab = gAxes.append("text").attr("class", "chart-sub").attr("text-anchor", "end"), yLab = gAxes.append("text").attr("class", "chart-sub");
  const gCurve = svg.append("g"), gDots = svg.append("g"), gPaths = svg.append("g"), gLab = svg.append("g").attr("class", "direct-labels"), gAnn = svg.append("g").attr("class", "annot"), yearText = svg.append("text").attr("class", "year-big").attr("text-anchor", "end").attr("font-size", 72).attr("opacity", 0);
  const fX = fmt(spec.format && spec.format.x), fY = fmt(spec.format && spec.format.y);
  const accent = spec.accent || {};
  let cur = {}, year = null;
  function fitFor(pts, kind) { const xs = pts.map((d) => (kind === "log" ? Math.log(d.xv) : d.xv)), ys = pts.map((d) => d.yv); const mx = d3.mean(xs), my = d3.mean(ys); const b = d3.sum(xs.map((x, i) => (x - mx) * (ys[i] - my))) / d3.sum(xs.map((x) => (x - mx) ** 2)); const a = my - b * mx; return { a, b, f: (x) => a + b * (kind === "log" ? Math.log(x) : x) }; }
  function render(state, immediate) {
    cur = state; const { width, height } = size(container); svg.attr("viewBox", `0 0 ${width} ${height}`);
    const t = immediate ? 0 : DUR(); const narrow = width < 640;
    ch.set(state.title ?? spec.title, state.subtitle ?? spec.subtitle);
    const M = { top: 92, right: narrow ? 70 : 140, bottom: 44, left: narrow ? 40 : 52 }; const iw = width - M.left - M.right, ih = height - M.top - M.bottom;
    const scrub = !!state.scrub; if (state.year != null) year = state.year; else if (scrub && year == null) year = state.scrub[0]; if (!scrub && state.year == null) year = spec.year ? (state.defaultYear ?? d3.max(all, (d) => d.yr)) : null;
    let pts = where(all, state.where ?? spec.where); if (spec.year && year != null) pts = pts.filter((d) => d.yr === year);
    const zoom = state.zoom || {};
    const xd = zoom.xDomain || spec.xDomain || d3.extent(all, (d) => d.xv), yd = zoom.yDomain || spec.yDomain || d3.extent(all, (d) => d.yv);
    const x = (spec.xLog ? d3.scaleLog() : d3.scaleLinear()).domain(xd).range([M.left, M.left + iw]); const y = d3.scaleLinear().domain(yd).range([M.top + ih, M.top]);
    const r = d3.scaleSqrt().domain([0, spec.size ? d3.max(all, (d) => d.sv) : 1]).range(spec.size ? [2.5, narrow ? 18 : 28] : [5, 5]);
    gx.attr("transform", `translate(0,${M.top + ih})`).transition().duration(t).call((spec.xTicks ? d3.axisBottom(x).tickValues(spec.xTicks.filter((v) => v >= xd[0] && v <= xd[1])) : d3.axisBottom(x).ticks(6)).tickFormat(fX).tickSize(0).tickPadding(10));
    gy.attr("transform", `translate(${M.left},0)`).transition().duration(t).call(d3.axisLeft(y).ticks(6).tickFormat(fY).tickSize(0).tickPadding(8));
    gGrid.attr("transform", `translate(${M.left},0)`).transition().duration(t).call(d3.axisLeft(y).ticks(6).tickSize(-iw).tickFormat("")); gGrid.selectAll(".domain").remove();
    xLab.attr("x", M.left + iw).attr("y", M.top + ih + 40).text(spec.xLabel || spec.x); yLab.attr("x", M.left - 36).attr("y", M.top - 14).text(spec.yLabel || spec.y);
    // highlight set
    let hiSet = null; if (Array.isArray(state.highlight)) hiSet = new Set(state.highlight); else if (state.highlight && state.highlight.where) hiSet = new Set(where(pts, state.highlight.where).map((d) => d.id));
    const hiColor = state.highlightColor || CATEGORICAL[2];
    const pathMode = !!(state.paths && state.paths.length);
    const fillOf = (d) => accent[d.id] || (hiSet && hiSet.has(d.id) ? hiColor : spec.color || CATEGORICAL[0]);
    const opOf = (d) => (pathMode || state.hideOthers && !accent[d.id] && !(hiSet && hiSet.has(d.id)) ? 0 : accent[d.id] ? 1 : (state.dim || hiSet) && !(hiSet && hiSet.has(d.id)) ? 0.15 : 0.75);
    const dots = gDots.selectAll("circle").data(pts, (d) => d.id);
    dots.enter().append("circle").attr("cx", (d) => x(d.xv)).attr("cy", (d) => y(d.yv)).attr("r", 0).attr("opacity", 0).attr("stroke", INK.bg).attr("stroke-width", 0.8).merge(dots)
      .on("mousemove", (ev, d) => showTip(`<b>${d.id}</b>${year != null ? " · " + year : ""}` + rowsHtml([[spec.xLabel || spec.x, fX(d.xv)], [spec.yLabel || spec.y, fY(d.yv)], ...(spec.tooltip || []).map((c) => [c, d[c]])]), ev)).on("mouseleave", hideTip)
      .transition().duration(scrub && !immediate ? 250 : t).attr("cx", (d) => x(d.xv)).attr("cy", (d) => y(d.yv)).attr("r", (d) => r(d.sv)).attr("fill", fillOf).attr("opacity", opOf);
    dots.exit().transition().duration(t / 2).attr("opacity", 0).attr("r", 0).remove();
    gDots.selectAll("circle").filter((d) => !!accent[d.id]).raise();
    // fit
    const fitOn = !!state.fit && !pathMode; let fit = null;
    if (fitOn) { fit = fitFor(pts, state.fit); const xs = state.fit === "log" ? d3.range(Math.log(xd[0] * 1.15), Math.log(xd[1] * 0.9), 0.05).map(Math.exp) : d3.range(xd[0], xd[1], (xd[1] - xd[0]) / 100); const line = d3.line().x((v) => x(v)).y((v) => y(fit.f(v)));
      const c = gCurve.selectAll("path.curve").data([xs]); c.enter().append("path").attr("class", "curve").attr("fill", "none").attr("stroke", INK.curve).attr("stroke-width", 2).attr("opacity", 0.9).attr("d", line).attr("stroke-dasharray", function () { const L = this.getTotalLength(); return `${L} ${L}`; }).attr("stroke-dashoffset", function () { return this.getTotalLength(); }).transition().duration(immediate ? 0 : 1600).attr("stroke-dashoffset", 0).on("end", function () { d3.select(this).attr("stroke-dasharray", null); }); c.attr("stroke-dasharray", null).attr("d", line); }
    else gCurve.selectAll("path.curve").transition().duration(t / 2).attr("opacity", 0).remove();
    // labels
    let ids = state.labels === "highlight" ? [...(hiSet || [])] : state.labels || []; if (state.labels === "highlight") ids = ids.concat(Object.keys(accent));
    let labelled = pts.filter((d) => ids.includes(d.id)).map((d) => ({ ...d, txt: `${d.id}${state.labelValues === false ? "" : ` ${fX(d.xv)} · ${fY(d.yv)}`}` }));
    if (state.listLabels) { const sorted = labelled.filter((d) => !accent[d.id]).sort((p, q) => q.yv - p.yv).slice(0, narrow ? 5 : 12); sorted.forEach((d, i) => { d.lx = M.left + 14; d.ly = M.top + 12 + i * 17; d.leader = true; }); const acc = labelled.filter((d) => accent[d.id]).map((d) => ({ ...d, lx: x(d.xv) + r(d.sv) + 5, ly: y(d.yv) + 4 })); labelled = [...acc, ...sorted]; }
    else labelled = pushApart(labelled.map((d) => ({ ...d, lx: x(d.xv) + r(d.sv) + 5, ly: y(d.yv) + 4 })));
    const lb = gLab.selectAll("g.lab").data(pathMode ? [] : labelled, (d) => d.id); const lbe = lb.enter().append("g").attr("class", "lab").attr("opacity", 0); lbe.append("line").attr("stroke", INK.muted); lbe.append("text").attr("class", "label strong");
    const lbm = lbe.merge(lb); lbm.select("text").text((d) => d.txt).attr("fill", (d) => accent[d.id] || null).transition().duration(t).attr("x", (d) => d.lx).attr("y", (d) => d.ly);
    lbm.select("line").transition().duration(t).attr("x1", (d) => (d.leader ? d.lx + d.txt.length * 6.4 + 4 : x(d.xv))).attr("y1", (d) => (d.leader ? d.ly - 4 : y(d.yv))).attr("x2", (d) => x(d.xv) - (d.leader ? r(d.sv) : 0)).attr("y2", (d) => y(d.yv)).attr("opacity", (d) => (d.leader ? 0.7 : 0));
    lbm.transition().duration(t).attr("opacity", 1); lb.exit().transition().duration(t / 3).attr("opacity", 0).remove();
    // annotations (support {id, gapToFit:true} → drop line from point to fit; {fitAt: x} → text on curve)
    const anns = (state.annotations || []).map((a) => { if (a.gapToFit && fit) { const d = pts.find((p) => p.id === a.gapToFit); return d ? { ...a, x: d.xv, y: (d.yv + fit.f(d.xv)) / 2, line: { x2: d.xv, y2: fit.f(d.xv) }, px: x(d.xv), text: (a.text || "{gap} vs. curve").replace("{gap}", d3.format("+.1f")(d.yv - fit.f(d.xv))), anchor: a.anchor || "end", dx: a.dx ?? -12, dy: 4 } : null; }
      if (a.fitAt != null && fit) return { ...a, x: a.fitAt, y: fit.f(a.fitAt), text: (a.text || "").replace("{y}", fY(fit.f(a.fitAt))).replace("{perDoubling}", d3.format(".1f")(fit.b * Math.LN2)) }; if (a.id) { const d = pts.find((p) => p.id === a.id); return d ? { ...a, x: d.xv, y: d.yv, dot: true } : null; } return a; }).filter(Boolean);
    if (fit && state.fitLabel) anns.push({ id: "__fit", x: state.fitLabelAt || pts[Math.floor(pts.length / 2)].xv, y: fit.f(state.fitLabelAt || pts[Math.floor(pts.length / 2)].xv), text: state.fitLabel.replace("{perDoubling}", d3.format(".1f")(fit.b * Math.LN2)).replace("{slope}", d3.format(".2f")(fit.b)), dy: -14 });
    // draw the gap line in accent colour: use custom line stroke via class
    drawAnnotations(gAnn, anns, x, y, t, { top: M.top, bottom: M.top + ih });
    yearText.attr("x", M.left + iw - 8).attr("y", M.top + ih - 16).text(year ?? "").transition().duration(t).attr("opacity", scrub ? 0.85 : 0);
    // paths (connected scatter across years)
    const pathData = pathMode ? state.paths.map((id) => ({ key: id, rows: all.filter((d) => d.id === id).sort((a, b) => a.yr - b.yr) })).filter((p) => p.rows.length > 1) : [];
    const pl = d3.line().x((d) => x(d.xv)).y((d) => y(d.yv));
    const pp = gPaths.selectAll("g.peer").data(pathData, (d) => d.key); const pe = pp.enter().append("g").attr("class", "peer").attr("opacity", 0);
    pe.append("path").attr("fill", "none").attr("stroke-linecap", "round").attr("stroke-linejoin", "round"); pe.append("circle").attr("class", "start").attr("r", 3).attr("fill", INK.bg).attr("stroke-width", 2); pe.append("circle").attr("class", "end").attr("r", 5); pe.append("text").attr("class", "label strong");
    const pm = pe.merge(pp); const focus = state.focusPath; const pcol = (d) => accent[d.key] || (focus === d.key ? hiColor : INK.dim);
    const endYs = new Map(pathData.map((d) => [d.key, y(d.rows[d.rows.length - 1].yv) + 4])); const ord = [...endYs.entries()].sort((p, q) => p[1] - q[1]); for (let i = 1; i < ord.length; i++) if (ord[i][1] - ord[i - 1][1] < 15) ord[i][1] = ord[i - 1][1] + 15; ord.forEach(([k, v]) => endYs.set(k, v));
    pm.select("path").attr("d", (d) => pl(d.rows)).attr("stroke", pcol).attr("stroke-width", (d) => (accent[d.key] || focus === d.key ? 3 : 2)).attr("stroke-opacity", (d) => (focus && focus !== d.key && !accent[d.key] ? 0.35 : 1));
    pm.select("circle.start").attr("cx", (d) => x(d.rows[0].xv)).attr("cy", (d) => y(d.rows[0].yv)).attr("stroke", pcol); pm.select("circle.end").attr("cx", (d) => x(d.rows[d.rows.length - 1].xv)).attr("cy", (d) => y(d.rows[d.rows.length - 1].yv)).attr("fill", pcol);
    pm.select("text").attr("x", (d) => x(d.rows[d.rows.length - 1].xv) + 8).attr("y", (d) => endYs.get(d.key)).text((d) => d.key).attr("fill", (d) => accent[d.key] || null);
    pm.on("mousemove", (ev, d) => { const a = d.rows[0], b = d.rows[d.rows.length - 1]; showTip(`<b>${d.key}</b>` + rowsHtml([[a.yr, `${fX(a.xv)} · ${fY(a.yv)}`], [b.yr, `${fX(b.xv)} · ${fY(b.yv)}`]]), ev); }).on("mouseleave", hideTip);
    pm.transition().duration(t).delay((d, i) => (immediate ? 0 : i * 80)).attr("opacity", 1); pp.exit().transition().duration(t / 2).attr("opacity", 0).remove();
    const legend = []; Object.entries(accent).forEach(([k, c]) => legend.push([k, c])); if (hiSet && state.highlightLabel) legend.push([state.highlightLabel, hiColor]); if (!pathMode) legend.push([spec.legend || "Others", spec.color || CATEGORICAL[0]]); else { if (focus && !accent[focus]) legend.push([focus, hiColor]); legend.push([state.pathsLabel || "Others", INK.dim]); }
    ch.legend(state.__index === 0 && !state.legend ? legend : legend); ch.legendLeft(M.left);
  }
  return { render, resize() { render(cur, true); }, progress(p) { if (cur.scrub) { const yr = Math.round(cur.scrub[0] + p * (cur.scrub[1] - cur.scrub[0])); if (yr !== year) { year = yr; render({ ...cur, year: yr }, false); year = yr; } } } };
}
