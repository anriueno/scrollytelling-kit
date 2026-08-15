import * as d3 from "d3";
import { fmt, DUR, size, INK, CATEGORICAL } from "../util.js";
/** Hero number. spec: {format, prefix, suffix, color}. state: {value, label, sublabel, from, dot:true|false} */
export function createNumber(container, spec, datasets, { resolve }) {
  const svg = d3.select(container).append("svg");
  const g = svg.append("g");
  const circle = g.append("circle").attr("r", 0).attr("fill", spec.color || CATEGORICAL[3]);
  const num = g.append("text").attr("class", "hero-num").attr("text-anchor", "middle");
  const lab = g.append("text").attr("class", "label").attr("text-anchor", "middle");
  const sub = g.append("text").attr("class", "chart-sub").attr("text-anchor", "middle");
  const f = fmt(spec.format);
  let last = 0;
  return {
    render(state, immediate) {
      const { width, height } = size(container); svg.attr("viewBox", `0 0 ${width} ${height}`);
      const t = immediate ? 0 : Math.max(DUR(), 1200);
      const v = resolve(state.value);
      const cx = width / 2, cy = height * 0.42;
      const dotOn = state.dot !== false;
      const R = Math.min(width, height) * 0.16;
      const maxV = resolve(state.max) ?? v;
      const r = dotOn ? Math.max(4, Math.sqrt(Math.max(0, v) / Math.max(1e-9, maxV)) * R) : 0;
      num.attr("x", cx).attr("y", dotOn ? cy - R - 40 : cy).attr("font-size", Math.min(72, width / 9))
        .transition().duration(t).tween("text", function () { const i = d3.interpolateNumber(state.from != null ? state.from : last, v); return (k) => (this.textContent = f(i(k))); }).on("end", () => (last = v));
      lab.attr("x", cx).attr("y", dotOn ? cy - R - 16 : cy + 26).text(state.label || "");
      sub.attr("x", cx).attr("y", dotOn ? cy + R + 28 : cy + 48).text(state.sublabel || "");
      circle.attr("cx", cx).attr("cy", cy).transition().duration(t).attr("r", r);
    },
    resize() {}, progress() {},
  };
}
