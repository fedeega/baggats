// Grafici SVG leggeri. Ogni punto/barra ha data-tip: il tooltip lo gestisce app.js.
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const MESI = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
export const fmtDay = (d) => `${d.getDate()} ${MESI[d.getMonth()]}`;
export const fmtNum = (v, dec = 1) => (Math.round(v * 10 ** dec) / 10 ** dec).toLocaleString('it-IT');

function niceScale(min, max, ticks = 4) {
  if (min === max) { min -= 1; max += 1; }
  const span = max - min;
  const step0 = span / ticks;
  const mag = 10 ** Math.floor(Math.log10(step0));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= step0) || 10 * mag;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const out = [];
  for (let v = lo; v <= hi + 1e-9; v += step) out.push(+v.toFixed(6));
  return { lo, hi, ticks: out };
}

const empty = (msg) => `<div class="chart-empty">${esc(msg)}</div>`;

export function lineChart({ series, height = 190, unit = '', refs = [], emptyMsg = 'Ancora nessun dato', yMin = null, zeroBased = false }) {
  const all = series.flatMap((s) => s.points);
  if (!all.length) return empty(emptyMsg);
  const Wd = 340, Ht = height, pl = 40, pr = 14, pt = 14, pb = 26;
  let xs = all.map((p) => +p.x); let x0 = Math.min(...xs), x1 = Math.max(...xs);
  if (x0 === x1) { x0 -= 86400000 * 3; x1 += 86400000 * 3; }
  const ys = all.map((p) => p.y).concat(refs.map((r) => r.y));
  let lo = Math.min(...ys), hi = Math.max(...ys);
  if (zeroBased) lo = 0;
  if (yMin != null) lo = Math.min(lo, yMin);
  const pad = (hi - lo) * 0.12 || 1; const sc = niceScale(zeroBased ? lo : lo - pad, hi + pad);
  const X = (x) => pl + ((+x - x0) / (x1 - x0)) * (Wd - pl - pr);
  const Y = (y) => pt + (1 - (y - sc.lo) / (sc.hi - sc.lo)) * (Ht - pt - pb);
  let g = '';
  for (const t of sc.ticks) g += `<line class="grid" x1="${pl}" x2="${Wd - pr}" y1="${Y(t)}" y2="${Y(t)}"/><text class="ax" x="${pl - 6}" y="${Y(t) + 4}" text-anchor="end">${fmtNum(t)}</text>`;
  const nT = 4; for (let i = 0; i < nT; i++) { const x = x0 + ((x1 - x0) * i) / (nT - 1); g += `<text class="ax" x="${X(x)}" y="${Ht - 6}" text-anchor="${i === 0 ? 'start' : i === nT - 1 ? 'end' : 'middle'}">${fmtDay(new Date(x))}</text>`; }
  for (const r of refs) g += `<line class="ref" x1="${pl}" x2="${Wd - pr}" y1="${Y(r.y)}" y2="${Y(r.y)}"/><text class="ax ref-t" x="${Wd - pr}" y="${Y(r.y) - 5}" text-anchor="end">${esc(r.label)}</text>`;
  let marks = '', hits = '';
  series.forEach((s, si) => {
    const pts = [...s.points].sort((a, b) => a.x - b.x);
    if (s.line !== false && pts.length > 1) marks += `<polyline class="ln" style="stroke:${s.color}" points="${pts.map((p) => `${X(p.x)},${Y(p.y)}`).join(' ')}"/>`;
    if (s.dots !== false) for (const p of pts) marks += `<circle class="dot${s.hollow ? ' hollow' : ''}" style="${s.hollow ? 'stroke' : 'fill'}:${s.color}" cx="${X(p.x)}" cy="${Y(p.y)}" r="${s.r || 4.5}"/>`;
    for (const p of pts) if (p.tip) hits += `<circle class="hit" cx="${X(p.x)}" cy="${Y(p.y)}" r="16" data-tip="${esc(p.tip)}"/>`;
    if (series.length === 1 && pts.length) { const l = pts[pts.length - 1]; marks += `<text class="dlab" x="${X(l.x)}" y="${Y(l.y) - 10}" text-anchor="end">${fmtNum(l.y)}${unit}</text>`; }
  });
  const legend = series.length > 1 ? `<div class="legend">${series.map((s) => `<span><i style="background:${s.color}"></i>${esc(s.name)}</span>`).join('')}</div>` : '';
  return `${legend}<svg class="chart" viewBox="0 0 ${Wd} ${Ht}" role="img">${g}${marks}${hits}</svg>`;
}

export function barChart({ bars, series, height = 180, unit = '', emptyMsg = 'Ancora nessun dato', ticks = null }) {
  if (!bars.length || bars.every((b) => b.values.every((v) => !v))) return empty(emptyMsg);
  const Wd = 340, Ht = height, pl = 40, pr = 10, pt = 14, pb = 26;
  const tot = bars.map((b) => b.values.reduce((a, v) => a + (v || 0), 0));
  const hiV = Math.max(...tot, ...bars.map((b) => b.mark || 0));
  const sc = ticks ? { lo: 0, hi: Math.max(...ticks), ticks } : niceScale(0, hiV);
  const Y = (y) => pt + (1 - y / sc.hi) * (Ht - pt - pb);
  const n = bars.length; const slot = (Wd - pl - pr) / n; const bw = Math.min(26, slot * 0.62);
  let g = '';
  for (const t of sc.ticks) g += `<line class="grid" x1="${pl}" x2="${Wd - pr}" y1="${Y(t)}" y2="${Y(t)}"/><text class="ax" x="${pl - 6}" y="${Y(t) + 4}" text-anchor="end">${fmtNum(t, 0)}</text>`;
  let m = '', hits = '';
  const every = Math.ceil(n / 7);
  bars.forEach((b, i) => {
    const cx = pl + slot * i + slot / 2; let acc = 0;
    b.values.forEach((v, si) => {
      if (!v) return;
      const y1 = Y(acc), y2 = Y(acc + v); acc += v;
      const h = Math.max(0, y1 - y2 - (acc > v ? 2 : 0));
      const top = si === b.values.length - 1 || b.values.slice(si + 1).every((x) => !x);
      m += `<rect class="bar" style="fill:${b.colors?.[si] || series[si].color}" x="${cx - bw / 2}" y="${y2}" width="${bw}" height="${h}" rx="${top ? 4 : 0}"/>`;
    });
    if (b.mark) m += `<line class="mark" x1="${cx - bw / 2 - 4}" x2="${cx + bw / 2 + 4}" y1="${Y(b.mark)}" y2="${Y(b.mark)}"/>`;
    if (b.flag) m += `<text class="flag" x="${cx}" y="${Y(acc) - 6}" text-anchor="middle">${b.flag}</text>`;
    if (i % every === 0) g += `<text class="ax" x="${cx}" y="${Ht - 6}" text-anchor="middle">${esc(b.label)}</text>`;
    hits += `<rect class="hit" x="${cx - slot / 2}" y="${pt}" width="${slot}" height="${Ht - pt - pb}" data-tip="${esc(b.tip)}"/>`;
  });
  const legend = series.length > 1 ? `<div class="legend">${series.map((s) => `<span><i style="background:${s.color}"></i>${esc(s.name)}</span>`).join('')}${bars.some((b) => b.mark) ? '<span><i class="lg-mark"></i>Previsto</span>' : ''}</div>`
    : bars.some((b) => b.mark) ? '<div class="legend"><span><i class="lg-mark"></i>Previsto</span></div>' : '';
  return `${legend}<svg class="chart" viewBox="0 0 ${Wd} ${Ht}" role="img">${g}${m}${hits}</svg>`;
}
