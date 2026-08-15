import * as d3 from "d3";
import { fmt, DUR, size, INK, chrome, CATEGORICAL, showTip, hideTip, rowsHtml, num, where } from "../util.js";
/** Beeswarm. spec: {data, x, size?, id, format, xFormat, where, tooltip:[cols], accent:{id:color}}
 *  state: {title, subtitle, labels:[ids], colorBy: col (sequential), colorDomain, colorLabel, where} */
export function createBeeswarm(container, spec, datasets) {
  const el = d3.select(container), svg = el.append("svg"); const ch = chrome(el, svg);
  const gAxis = svg.append("g").attr("class", "axis x"), gDots = svg.append("g"), gLab = svg.append("g"), gLeg = svg.append("g");
  const f = fmt(spec.format), fx = spec.xFormat ? fmt(spec.xFormat) : f;
  let laidKey = "", data = [];
  return {
    render(state, immediate) {
      const { width, height } = size(container); svg.attr("viewBox", `0 0 ${width} ${height}`);
      const t = immediate ? 0 : DUR();
      ch.set(state.title ?? spec.title, state.subtitle ?? spec.subtitle);
      const rows = where(datasets[spec.data], state.where ?? spec.where).filter((r) => num(r[spec.x]) != null);
      const M = { l: 30, r: 30, t: 80, b: 40 };
      const x = d3.scaleLinear().domain(spec.xDomain || [0, d3.max(rows, (r) => num(r[spec.x]))]).nice().range([M.l, width - M.r]);
      const r = d3.scaleSqrt().domain([0, spec.size ? d3.max(rows, (d) => num(d[spec.size]) || 0) : 1]).range([3, Math.min(44, width / 15)]);
      const cy = M.t + (height - M.t - M.b) * 0.58;
      const key = `${width}|${rows.length}`;
      if (key !== laidKey) {
        data = rows.map((d) => ({ ...d, id: d[spec.id], xv: num(d[spec.x]), sv: spec.size ? num(d[spec.size]) || 0 : 1 }));
        data.forEach((d) => { d.x = x(d.xv); d.y = cy; d.r = spec.size ? r(d.sv) : 7; });
        const sim = d3.forceSimulation(data).force("x", d3.forceX((d) => x(d.xv)).strength(1)).force("y", d3.forceY(cy).strength(0.08)).force("collide", d3.forceCollide((d) => d.r + 1.5).iterations(3)).stop();
        for (let i = 0; i < 220; i++) sim.tick(); laidKey = key;
      }
      const cb = state.colorBy; const cvals = cb ? data.map((d) => num(d[cb])).filter((v) => v != null) : [];
      const cscale = cb ? d3.scaleSequential(d3.interpolateLab(INK.seqLow, INK.seqHigh)).domain(state.colorDomain || [d3.min(cvals), d3.max(cvals)]).clamp(true) : null;
      const accent = spec.accent || {};
      const dots = gDots.selectAll("circle").data(data, (d) => d.id);
      dots.enter().append("circle").attr("cx", (d) => d.x).attr("cy", (d) => d.y).attr("r", 0).attr("stroke", INK.bg).attr("stroke-width", 0.8).merge(dots)
        .on("mousemove", (ev, d) => showTip(`<b>${d.id}</b>` + rowsHtml([[spec.xLabel || spec.x, fx(d.xv)], ...(spec.tooltip || []).map((c) => [c, d[c]])]), ev)).on("mouseleave", hideTip)
        .transition().duration(t).delay((d, i) => (immediate || state.__index !== 0 ? 0 : i * 6)).attr("cx", (d) => d.x).attr("cy", (d) => d.y).attr("r", (d) => d.r)
        .attr("fill", (d) => accent[d.id] || (cb ? (num(d[cb]) == null ? INK.dim : cscale(num(d[cb]))) : spec.color || CATEGORICAL[0])).attr("opacity", cb ? 1 : 0.85);
      dots.exit().remove();
      const swarmTop = d3.min(data, (d) => d.y - d.r), swarmBottom = d3.max(data, (d) => d.y + d.r);
      const ld = data.filter((d) => (state.labels || []).includes(d.id)).sort((a, b) => a.x - b.x); const tiers = [];
      ld.forEach((d) => { d.ltext = cb && num(d[cb]) != null ? `${d.id} · ${fmt(spec.colorFormat)(num(d[cb]))}` : `${d.id} ${fx(d.xv)}`; const w = d.ltext.length * 6.6; const lx = Math.max(M.l + w / 2, Math.min(width - M.r - w / 2, d.x)); let ti = tiers.findIndex((right) => right + 10 < lx - w / 2); if (ti < 0) { ti = tiers.length; tiers.push(-Infinity); } tiers[ti] = lx + w / 2; d.lx = lx; d.ly = swarmTop - 22 - ti * 17; });
      const lab = gLab.selectAll("g.lab").data(ld, (d) => d.id); const le = lab.enter().append("g").attr("class", "lab").attr("opacity", 0);
      le.append("line").attr("stroke", INK.muted); le.append("text").attr("class", "label strong").attr("text-anchor", "middle");
      const lm = le.merge(lab); lm.select("line").attr("x1", (d) => d.lx).attr("y1", (d) => d.ly + 4).attr("x2", (d) => d.x).attr("y2", (d) => d.y - d.r - 2); lm.select("text").attr("x", (d) => d.lx).attr("y", (d) => d.ly).text((d) => d.ltext).attr("fill", (d) => accent[d.id] || null);
      lm.transition().duration(t).delay(t * 0.4).attr("opacity", 1); lab.exit().transition().duration(t / 2).attr("opacity", 0).remove();
      gAxis.attr("transform", `translate(0,${Math.min(height - M.b, swarmBottom + 28)})`).call(d3.axisBottom(x).ticks(6).tickFormat(fx).tickSize(0).tickPadding(8));
      // colour legend
      gLeg.selectAll("*").remove();
      if (cb) { const grad = gLeg.append("defs").append("linearGradient").attr("id", "bgrad"); d3.range(0, 1.01, 0.1).forEach((k) => grad.append("stop").attr("offset", k).attr("stop-color", cscale(cscale.domain()[0] + k * (cscale.domain()[1] - cscale.domain()[0]))));
        gLeg.append("rect").attr("width", 200).attr("height", 8).attr("rx", 2).attr("fill", "url(#bgrad)"); gLeg.append("text").attr("class", "label").attr("y", 22).text(fmt(spec.colorFormat)(cscale.domain()[0])); gLeg.append("text").attr("class", "label").attr("x", 200).attr("y", 22).attr("text-anchor", "end").text(`${fmt(spec.colorFormat)(cscale.domain()[1])}${state.colorLabel ? " " + state.colorLabel : ""}`);
        gLeg.attr("transform", `translate(${width - M.r - 200},${M.t - 14})`); }
      ch.legend(cb ? [] : Object.entries(accent).map(([k, c]) => [k, c]).concat(spec.legend ? [[spec.legend, spec.color || CATEGORICAL[0]]] : [])); ch.legendLeft(M.l);
    }, resize() {}, progress() {},
  };
}
