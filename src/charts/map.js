import * as d3 from "d3";
import { fmt, size, INK, chrome, showTip, hideTip, rowsHtml, num } from "../util.js";
/** World choropleth. spec: {data, id (ISO3 col), value, year (col, optional), format, domain:[lo,hi], colors:[lo,hi], name (col), tooltip:[cols]}
 *  state: {title, subtitle, year, scrub:[y0,y1] (progress-driven), value} */
export function createMap(container, spec, datasets, { geo }) {
  const rows = datasets[spec.data];
  const lookup = new Map(); rows.forEach((r) => { const k = spec.year ? `${r[spec.id]}|${r[spec.year]}` : r[spec.id]; lookup.set(k, r); });
  const names = new Map(rows.map((r) => [r[spec.id], spec.name ? r[spec.name] : r[spec.id]]));
  const features = geo.features.filter((f) => f.id !== "ATA");
  const el = d3.select(container), svg = el.append("svg"); const ch = chrome(el, svg);
  const defs = svg.append("defs");
  const pat = defs.append("pattern").attr("id", "hatch").attr("width", 6).attr("height", 6).attr("patternUnits", "userSpaceOnUse").attr("patternTransform", "rotate(45)");
  pat.append("rect").attr("width", 6).attr("height", 6).attr("fill", INK.grid); pat.append("line").attr("x1", 0).attr("y1", 0).attr("x2", 0).attr("y2", 6).attr("stroke", INK.dim).attr("stroke-width", 2);
  const gMap = svg.append("g"), yearText = svg.append("text").attr("class", "year-big").attr("text-anchor", "end").attr("font-size", 64), gLeg = svg.append("g");
  const f = fmt(spec.format);
  const scale = d3.scaleSequential(d3.interpolateLab(...(spec.colors || [INK.seqLow, INK.seqHigh]))).domain(spec.domain || d3.extent(rows, (r) => num(r[spec.value]))).clamp(true);
  const grad = defs.append("linearGradient").attr("id", "mgrad"); d3.range(0, 1.01, 0.1).forEach((k) => grad.append("stop").attr("offset", k).attr("stop-color", scale(scale.domain()[0] + k * (scale.domain()[1] - scale.domain()[0]))));
  gLeg.append("rect").attr("width", 260).attr("height", 8).attr("rx", 2).attr("fill", "url(#mgrad)"); gLeg.append("text").attr("class", "label").attr("y", 22).text(f(scale.domain()[0])); gLeg.append("text").attr("class", "label").attr("x", 260).attr("y", 22).attr("text-anchor", "end").text(`${f(scale.domain()[1])}${spec.domain ? "+" : ""}${spec.unit ? " " + spec.unit : ""}`);
  const hl = gLeg.append("g").attr("transform", "translate(0,32)"); hl.append("rect").attr("width", 14).attr("height", 10).attr("fill", "url(#hatch)"); hl.append("text").attr("class", "label").attr("x", 20).attr("y", 9).text("no data");
  let year = null, valueCol = spec.value, cur = {};
  const val = (iso) => lookup.get(spec.year ? `${iso}|${year}` : iso);
  const fill = (ft) => { const r = val(ft.id); const v = r ? num(r[valueCol]) : null; return v == null ? "url(#hatch)" : scale(v); };
  function draw() {
    const { width, height } = size(container); svg.attr("viewBox", `0 0 ${width} ${height}`);
    const proj = d3.geoNaturalEarth1().fitExtent([[10, 56], [width - 10, height - 10]], { type: "FeatureCollection", features }); const path = d3.geoPath(proj);
    const p = gMap.selectAll("path").data(features, (ft) => ft.id);
    p.enter().append("path").attr("stroke", INK.bg).attr("stroke-width", 0.6)
      .on("mousemove", (ev, ft) => { const r = val(ft.id); showTip(`<b>${names.get(ft.id) || ft.properties.name}</b>${year != null ? " · " + year : ""}` + (r ? rowsHtml([[spec.valueLabel || valueCol, f(num(r[valueCol]))], ...(spec.tooltip || []).map((c) => [c, r[c]])]) : "<div>No data</div>"), ev); }).on("mouseleave", hideTip)
      .merge(p).attr("d", path).attr("fill", fill);
    yearText.attr("x", width - 20).attr("y", height - 24).text(year ?? "").attr("opacity", year != null ? 0.85 : 0);
    gLeg.attr("transform", `translate(20,${height - 52})`);
  }
  return {
    render(state) { cur = state; ch.set(state.title ?? spec.title, state.subtitle ?? spec.subtitle); valueCol = state.value || spec.value; year = state.year ?? (state.scrub ? state.scrub[0] : year); draw(); },
    progress(p) { if (cur.scrub) { const y0 = cur.scrub[0], y1 = cur.scrub[1]; const yr = Math.round(y0 + p * (y1 - y0)); if (yr !== year) { year = yr; gMap.selectAll("path").attr("fill", fill); yearText.text(year); } } },
    resize: draw,
  };
}
