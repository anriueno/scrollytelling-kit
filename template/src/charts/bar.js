import * as d3 from "d3";
import { fmt, DUR, size, INK, chrome, CATEGORICAL, showTip, hideTip, num, where } from "../util.js";
/** Horizontal bars. spec: {data?, category, value, format, color, colors:{cat:color}, note?:col}
 *  state: {title, subtitle, values:[{category,value,color?}] | where, sort:"desc"|"asc"|null, highlight:[cats], limit} */
export function createBar(container, spec, datasets, { resolve }) {
  const el = d3.select(container), svg = el.append("svg"); const ch = chrome(el, svg);
  const g = svg.append("g"); const f = fmt(spec.format);
  return {
    render(state, immediate) {
      const { width, height } = size(container); svg.attr("viewBox", `0 0 ${width} ${height}`);
      const t = immediate ? 0 : DUR();
      ch.set(state.title ?? spec.title, state.subtitle ?? spec.subtitle);
      let items = state.values ? state.values.map((d) => ({ ...d, value: resolve(d.value) })) : where(datasets[spec.data], state.where ?? spec.where).map((r) => ({ category: r[spec.category], value: num(r[spec.value]), note: spec.note ? r[spec.note] : null })).filter((d) => d.value != null);
      const sort = state.sort ?? spec.sort ?? "desc"; if (sort === "desc") items.sort((a, b) => b.value - a.value); else if (sort === "asc") items.sort((a, b) => a.value - b.value);
      if (state.limit ?? spec.limit) items = items.slice(0, state.limit ?? spec.limit);
      const hi = state.highlight ? new Set(state.highlight) : null;
      const labelW = Math.min(180, Math.max(60, d3.max(items, (d) => d.category.length) * 7.5));
      const M = { top: 84, right: 110, bottom: 20, left: labelW + 20 };
      const iw = width - M.left - M.right, ih = height - M.top - M.bottom;
      const x = d3.scaleLinear().domain([0, d3.max(items, (d) => d.value)]).nice().range([0, iw]);
      const y = d3.scaleBand().domain(items.map((d) => d.category)).range([M.top + 10, M.top + Math.min(ih, items.length * 46)]).padding(0.3);
      const bars = g.selectAll("g.bar").data(items, (d) => d.category);
      const be = bars.enter().append("g").attr("class", "bar").attr("opacity", 0);
      be.append("rect").attr("rx", 3).attr("x", M.left).attr("width", 0); be.append("text").attr("class", "label strong nm").attr("text-anchor", "end").attr("dominant-baseline", "middle"); be.append("text").attr("class", "label val").attr("dominant-baseline", "middle");
      const bm = be.merge(bars);
      bm.on("mousemove", (ev, d) => showTip(`<b>${d.category}</b><div class="row"><span>${spec.valueLabel || "Value"}</span><b>${f(d.value)}</b></div>${d.note ? `<div>${d.note}</div>` : ""}`, ev)).on("mouseleave", hideTip);
      bm.transition().duration(t).attr("opacity", (d) => (hi && !hi.has(d.category) ? 0.45 : 1));
      bm.select("rect").attr("fill", (d) => d.color || (spec.colors && spec.colors[d.category]) || (hi && hi.has(d.category) ? CATEGORICAL[1] : spec.color || CATEGORICAL[0])).transition().duration(t).attr("y", (d) => y(d.category)).attr("height", y.bandwidth()).attr("x", M.left).delay((d, i) => (immediate ? 0 : i * 60)).attr("width", (d) => x(d.value));
      bm.select("text.nm").attr("x", M.left - 10).text((d) => d.category).transition().duration(t).attr("y", (d) => y(d.category) + y.bandwidth() / 2);
      bm.select("text.val").text((d) => f(d.value) + (d.note ? ` (${d.note})` : "")).transition().duration(t).delay((d, i) => (immediate ? 0 : i * 60)).attr("y", (d) => y(d.category) + y.bandwidth() / 2).attr("x", (d) => M.left + x(d.value) + 8);
      bars.exit().transition().duration(t / 2).attr("opacity", 0).remove();
      ch.legend([]);
    }, resize() {}, progress() {},
  };
}
