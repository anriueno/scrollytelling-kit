import * as d3 from "d3";
import { fmt, DUR, size, INK, chrome, colorFor, labelFor, drawAnnotations, showTip, hideTip, rowsHtml, num } from "../util.js";
/** Stacked area. spec: {data, x, series:[cols bottom→top], colors, labels, format, xFormat}
 *  state: {title, subtitle, visible:[cols], highlight:[cols], normalize:bool, annotations:[], showLabels:bool} */
export function createArea(container, spec, datasets) {
  const rows = datasets[spec.data].map((r) => { const o = { ...r }; o.__x = +r[spec.x]; spec.series.forEach((k) => (o[k] = num(r[k]) || 0)); o.__total = d3.sum(spec.series, (k) => o[k]); return o; }).sort((a, b) => a.__x - b.__x);
  const el = d3.select(container), svg = el.append("svg"); const ch = chrome(el, svg);
  const gAxes = svg.append("g"), gx = gAxes.append("g").attr("class", "axis x"), gy = gAxes.append("g").attr("class", "axis y"), gGrid = gAxes.append("g").attr("class", "grid");
  const gArea = svg.append("g"), gLab = svg.append("g").attr("class", "direct-labels"), gAnn = svg.append("g").attr("class", "annot"), gHover = svg.append("g");
  const f = fmt(spec.format), fx = spec.xFormat ? d3.format(spec.xFormat) : d3.format("d");
  const pct = d3.format(".0%");
  return {
    render(state, immediate) {
      const { width, height } = size(container); svg.attr("viewBox", `0 0 ${width} ${height}`);
      const t = immediate ? 0 : DUR(); const narrow = width < 640;
      const M = { top: narrow ? 112 : 84, right: narrow ? 90 : 140, bottom: 36, left: narrow ? 44 : 56 };
      const iw = width - M.left - M.right, ih = height - M.top - M.bottom;
      ch.set(state.title ?? spec.title, state.subtitle ?? spec.subtitle);
      const vis = new Set(state.visible || spec.series), hi = state.highlight ? new Set(state.highlight) : null, share = !!state.normalize;
      const x = d3.scaleLinear().domain(d3.extent(rows, (d) => d.__x)).range([M.left, M.left + iw]);
      const y = d3.scaleLinear().domain(share ? [0, 1] : state.yDomain || [0, d3.max(rows, (d) => d.__total)]).range([M.top + ih, M.top]);
      const stack = d3.stack().keys(spec.series).value((d, k) => (vis.has(k) ? d[k] : 0)).offset(share ? d3.stackOffsetExpand : d3.stackOffsetNone)(rows);
      const area = d3.area().x((d) => x(d.data.__x)).y0((d) => y(d[0])).y1((d) => y(d[1])).curve(d3.curveMonotoneX);
      const layers = gArea.selectAll("path.layer").data(stack, (d) => d.key);
      layers.enter().append("path").attr("class", "layer").attr("stroke", INK.bg).attr("stroke-width", 1).attr("d", area).attr("opacity", 0)
        .merge(layers).attr("fill", (d, i) => colorFor(spec, d.key, spec.series.indexOf(d.key)))
        .transition().duration(t).attr("d", area).attr("opacity", (d) => (!vis.has(d.key) ? 0 : hi && !hi.has(d.key) ? 0.4 : 1));
      gx.attr("transform", `translate(0,${M.top + ih})`).transition().duration(t).call(d3.axisBottom(x).tickValues(spec.xTicks || (spec.xFormat === "d" || !spec.xFormat ? x.ticks(Math.max(4, Math.floor(iw / 90))).filter(Number.isInteger) : x.ticks(Math.max(4, Math.floor(iw / 90))))).tickFormat(fx).tickSize(0).tickPadding(10));
      gy.attr("transform", `translate(${M.left},0)`).transition().duration(t).call(d3.axisLeft(y).ticks(6).tickFormat(share ? pct : (v) => (v >= 1000 ? d3.format(",.0f")(v / 1000) + "k" : d3.format(",.0f")(v))).tickSize(0).tickPadding(8));
      gGrid.attr("transform", `translate(${M.left},0)`).transition().duration(t).call(d3.axisLeft(y).ticks(6).tickSize(-iw).tickFormat("")); gGrid.selectAll(".domain").remove();
      // direct labels
      const last = rows[rows.length - 1];
      let lbl = state.showLabels === false ? [] : stack.filter((s) => vis.has(s.key)).map((s) => ({ key: s.key, y: (y(s[s.length - 1][0]) + y(s[s.length - 1][1])) / 2 })).sort((a, b) => a.y - b.y);
      for (let i = 1; i < lbl.length; i++) if (lbl[i].y - lbl[i - 1].y < 14) lbl[i].y = lbl[i - 1].y + 14;
      const dl = gLab.selectAll("text").data(lbl, (d) => d.key);
      dl.enter().append("text").attr("class", "label").attr("x", M.left + iw + 8).attr("opacity", 0).attr("dominant-baseline", "middle").merge(dl)
        .text((d) => `${narrow ? labelFor(spec, d.key).split(" ")[0] : labelFor(spec, d.key)} ${share ? pct(last[d.key] / last.__total) : f(last[d.key])}`).attr("fill", (d) => (hi && hi.has(d.key) ? INK.ink : null))
        .transition().duration(t).attr("x", M.left + iw + 8).attr("y", (d) => d.y).attr("opacity", (d) => (hi && !hi.has(d.key) ? 0.5 : 1));
      dl.exit().transition().duration(t).attr("opacity", 0).remove();
      ch.legend(spec.legend === false ? [] : [...spec.series].reverse().filter((k) => vis.has(k)).map((k) => [labelFor(spec, k), colorFor(spec, k, spec.series.indexOf(k))])); ch.legendLeft(M.left);
      // annotations: y may be given as {series:"coal", top:true} → boundary of the stack; support xRule
      const anns = (state.annotations || []).map((a) => {
        if (a.stackTop) { const idx = spec.series.indexOf(a.stackTop); const ri = rows.findIndex((r) => r.__x === +a.x); const v = stack[idx][ri][1]; const raw = share ? v : v; return { ...a, y: v, dot: a.dot ?? true, text: (a.text || "{value}").replace("{value}", share ? d3.format(".1%")(v) : f(v)) }; }
        if (a.series && a.x != null) { const ri = rows.findIndex((r) => r.__x === +a.x); const row = rows[ri]; const idx = spec.series.indexOf(a.series); const seg = stack[idx][ri]; return { ...a, y: (seg[0] + seg[1]) / 2, dy: a.dy ?? 4, text: (a.text || "{value}").replace("{value}", share ? d3.format(".1%")(row[a.series] / row.__total) : f(row[a.series])) }; }
        return a;
      });
      drawAnnotations(gAnn, anns, x, y, t, { top: M.top, bottom: M.top + ih });
      // hover
      gHover.selectAll("*").remove(); const line = gHover.append("line").attr("class", "crosshair").attr("y1", M.top).attr("y2", M.top + ih).attr("opacity", 0);
      svg.on("mousemove", (ev) => { const [mx] = d3.pointer(ev, svg.node()); if (mx < M.left || mx > M.left + iw) { line.attr("opacity", 0); hideTip(); return; }
        const xv = x.invert(mx); const d = rows.reduce((b, r) => (Math.abs(r.__x - xv) < Math.abs(b.__x - xv) ? r : b), rows[0]); line.attr("x1", x(d.__x)).attr("x2", x(d.__x)).attr("opacity", 1);
        showTip(`<b>${fx(d.__x)}</b> · total ${f(d.__total)}` + rowsHtml([...spec.series].reverse().filter((k) => vis.has(k)).map((k) => [labelFor(spec, k), share ? d3.format(".1%")(d[k] / d.__total) : f(d[k]), colorFor(spec, k, spec.series.indexOf(k))])), ev); })
        .on("mouseleave", () => { line.attr("opacity", 0); hideTip(); });
    }, resize() {}, progress() {},
  };
}
