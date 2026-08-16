import * as d3 from "d3";
import { fmt, DUR, size, INK, chrome, CATEGORICAL, showTip, hideTip, rowsHtml, num, where, pushApart } from "../util.js";
/** Slope / dumbbell — "then vs now" per entity (wide data: one row per entity, two value columns).
 *  spec: {data, id, from:{column,label}, to:{column,label}, format, color, accent:{id:hex}, tooltip:[cols], where, minRows?}
 *  state: {title, subtitle, where, highlight:[ids], highlightColor, labels:[ids]|"highlight"|"all", dumbbell:bool, sort:"to"|"from"|"change"|"none", limit, dim:bool} */
export function createSlope(container, spec, datasets) {
  const el = d3.select(container), svg = el.append("svg"); const ch = chrome(el, svg);
  const gAxes = svg.append("g"), gLines = svg.append("g"), gLab = svg.append("g").attr("class", "direct-labels");
  const f = fmt(spec.format); const accent = spec.accent || {};
  return {
    render(state, immediate) {
      const { width, height } = size(container); svg.attr("viewBox", `0 0 ${width} ${height}`); const t = immediate ? 0 : DUR();
      ch.set(state.title ?? spec.title, state.subtitle ?? spec.subtitle);
      let rows = where(datasets[spec.data], state.where ?? spec.where).map((r) => ({ id: r[spec.id], a: num(r[spec.from.column]), b: num(r[spec.to.column]), raw: r })).filter((d) => d.a != null && d.b != null);
      const sort = state.sort || spec.sort || (state.dumbbell ? "to" : "none");
      if (sort === "to") rows.sort((p, q) => q.b - p.b); else if (sort === "from") rows.sort((p, q) => q.a - p.a); else if (sort === "change") rows.sort((p, q) => (q.b - q.a) - (p.b - p.a));
      if (state.limit ?? spec.limit) rows = rows.slice(0, state.limit ?? spec.limit);
      const hi = state.highlight ? new Set(state.highlight) : null; const hiColor = state.highlightColor || CATEGORICAL[2];
      const colorOf = (d) => accent[d.id] || (hi && hi.has(d.id) ? hiColor : spec.color || CATEGORICAL[0]);
      const opOf = (d) => (accent[d.id] || (hi && hi.has(d.id)) ? 1 : hi || state.dim ? 0.18 : 0.75);
      const labelSet = state.labels === "all" ? new Set(rows.map((d) => d.id)) : state.labels === "highlight" ? new Set([...(hi || []), ...Object.keys(accent)]) : new Set(state.labels || Object.keys(accent));
      const M = { top: 84, right: 150, bottom: 40, left: 150 }; const iw = width - M.left - M.right, ih = height - M.top - M.bottom;
      const ext = d3.extent(rows.flatMap((d) => [d.a, d.b]));
      const dumbbell = !!state.dumbbell;
      gAxes.selectAll("*").remove();
      if (!dumbbell) {
        const y = d3.scaleLinear().domain(spec.yDomain || ext).nice().range([M.top + ih, M.top]);
        const xa = M.left, xb = M.left + iw;
        gAxes.append("g").attr("class", "axis y").attr("transform", `translate(${xa},0)`).call(d3.axisLeft(y).ticks(5).tickFormat(f).tickSize(0).tickPadding(8));
        gAxes.append("g").attr("class", "axis y").attr("transform", `translate(${xb},0)`).call(d3.axisRight(y).ticks(5).tickFormat(f).tickSize(0).tickPadding(8));
        [[xa, spec.from.label], [xb, spec.to.label]].forEach(([x, l]) => gAxes.append("text").attr("class", "label strong").attr("x", x).attr("y", M.top - 14).attr("text-anchor", "middle").text(l));
        const sel = gLines.selectAll("g.s").data(rows, (d) => d.id); const en = sel.enter().append("g").attr("class", "s").attr("opacity", 0);
        en.append("line").attr("stroke-width", 2); en.append("circle").attr("class", "a").attr("r", 4); en.append("circle").attr("class", "b").attr("r", 4);
        const m = en.merge(sel);
        m.on("mousemove", (ev, d) => showTip(`<b>${d.id}</b>` + rowsHtml([[spec.from.label, f(d.a)], [spec.to.label, f(d.b)], ["Change", (d.b - d.a >= 0 ? "+" : "") + f(d.b - d.a)], ...(spec.tooltip || []).map((c) => [c, d.raw[c]])]), ev)).on("mouseleave", hideTip);
        m.transition().duration(t).attr("opacity", opOf);
        m.select("line").attr("stroke", colorOf).attr("stroke-width", (d) => (accent[d.id] || (hi && hi.has(d.id)) ? 3 : 1.5)).transition().duration(t).attr("x1", xa).attr("x2", xb).attr("y1", (d) => y(d.a)).attr("y2", (d) => y(d.b));
        m.select("circle.a").attr("fill", colorOf).transition().duration(t).attr("cx", xa).attr("cy", (d) => y(d.a));
        m.select("circle.b").attr("fill", colorOf).transition().duration(t).attr("cx", xb).attr("cy", (d) => y(d.b));
        sel.exit().transition().duration(t / 2).attr("opacity", 0).remove();
        // labels at both ends, pushed apart
        const L = rows.filter((d) => labelSet.has(d.id));
        const left = pushApart(L.map((d) => ({ ...d, lx: xa - 10, ly: y(d.a) + 4, side: "a", txt: `${d.id} ${f(d.a)}` })), 14, 1e9), right = pushApart(L.map((d) => ({ ...d, lx: xb + 10, ly: y(d.b) + 4, side: "b", txt: `${f(d.b)} ${d.id}` })), 14, 1e9);
        const lab = gLab.selectAll("text").data([...left, ...right], (d) => d.id + d.side);
        lab.enter().append("text").attr("class", "label strong").attr("opacity", 0).merge(lab).attr("text-anchor", (d) => (d.side === "a" ? "end" : "start")).text((d) => d.txt).attr("fill", (d) => (accent[d.id] || (hi && hi.has(d.id)) ? colorOf(d) : null)).transition().duration(t).attr("x", (d) => d.lx).attr("y", (d) => d.ly).attr("opacity", 1);
        lab.exit().remove();
      } else {
        const x = d3.scaleLinear().domain(spec.xDomain || ext).nice().range([M.left, M.left + iw]);
        const y = d3.scaleBand().domain(rows.map((d) => d.id)).range([M.top + 10, M.top + Math.min(ih, rows.length * 34)]).padding(0.4);
        gAxes.append("g").attr("class", "axis x").attr("transform", `translate(0,${y.range()[1] + 8})`).call(d3.axisBottom(x).ticks(6).tickFormat(f).tickSize(0).tickPadding(8));
        const sel = gLines.selectAll("g.s").data(rows, (d) => d.id); const en = sel.enter().append("g").attr("class", "s").attr("opacity", 0);
        en.append("line").attr("stroke-width", 3); en.append("circle").attr("class", "a").attr("r", 5); en.append("circle").attr("class", "b").attr("r", 6); en.append("text").attr("class", "label strong nm").attr("text-anchor", "end").attr("dominant-baseline", "middle");
        const m = en.merge(sel);
        m.on("mousemove", (ev, d) => showTip(`<b>${d.id}</b>` + rowsHtml([[spec.from.label, f(d.a)], [spec.to.label, f(d.b)], ["Change", (d.b - d.a >= 0 ? "+" : "") + f(d.b - d.a)]]), ev)).on("mouseleave", hideTip);
        m.transition().duration(t).attr("opacity", opOf);
        m.select("line").attr("stroke", (d) => colorOf(d)).attr("stroke-opacity", 0.6).transition().duration(t).attr("x1", (d) => x(d.a)).attr("x2", (d) => x(d.b)).attr("y1", (d) => y(d.id) + y.bandwidth() / 2).attr("y2", (d) => y(d.id) + y.bandwidth() / 2);
        m.select("circle.a").attr("fill", INK.bg).attr("stroke", colorOf).attr("stroke-width", 2).transition().duration(t).attr("cx", (d) => x(d.a)).attr("cy", (d) => y(d.id) + y.bandwidth() / 2);
        m.select("circle.b").attr("fill", colorOf).transition().duration(t).attr("cx", (d) => x(d.b)).attr("cy", (d) => y(d.id) + y.bandwidth() / 2);
        m.select("text.nm").attr("x", M.left - 12).text((d) => d.id).transition().duration(t).attr("y", (d) => y(d.id) + y.bandwidth() / 2);
        sel.exit().transition().duration(t / 2).attr("opacity", 0).remove();
        gLab.selectAll("*").remove();
      }
      ch.legend([[spec.from.label + " → " + spec.to.label, spec.color || CATEGORICAL[0]], ...(hi && state.highlightLabel ? [[state.highlightLabel, hiColor]] : []), ...Object.entries(accent)]); ch.legendLeft(M.left);
    }, resize() {}, progress() {},
  };
}
