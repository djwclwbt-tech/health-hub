// Shared mockup helpers: illustrative data (not real) + an SVG weight chart.
const DATA = (() => {
  const scale = [186.0,185.2,185.6,184.6,184.9,184.1,183.6,184.0,183.2,183.5,182.8,183.0,182.4,182.6];
  const trend = []; let t = scale[0];
  scale.forEach(v => { t = t + 0.25 * (v - t); trend.push(+t.toFixed(2)); });
  return { scale, trend };
})();
function weightChart(el, o) {
  const W = o.w, H = o.h, pad = { l: o.padL ?? 0, r: o.padR ?? 34, t: 12, b: 20 };
  const lo = o.lo ?? 174, hi = o.hi ?? 187;
  const n = DATA.scale.length + (o.ahead || 0);
  const x = i => pad.l + (W - pad.l - pad.r) * i / (n - 1);
  const y = v => pad.t + (H - pad.t - pad.b) * (hi - v) / (hi - lo);
  const line = DATA.trend.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('');
  const last = DATA.trend.length - 1;
  let s = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="display:block;overflow:visible">`;
  (o.grid || []).forEach(g => { s += `<line x1="${pad.l}" x2="${W - pad.r}" y1="${y(g)}" y2="${y(g)}" stroke="${o.gridC}" stroke-width="1"/><text x="${W - pad.r + 6}" y="${y(g) + 4}" font-size="11" fill="${o.labelC}" font-family="${o.numFont}">${g}</text>`; });
  if (o.goal) s += `<line x1="${pad.l}" x2="${W - pad.r}" y1="${y(o.goal)}" y2="${y(o.goal)}" stroke="${o.goalC}" stroke-width="1" stroke-dasharray="3 4"/><text x="${W - pad.r + 6}" y="${y(o.goal) + 4}" font-size="11" fill="${o.goalC}" font-family="${o.numFont}">${o.goal}</text>`;
  if (o.ahead) { const px = x(n - 1), py = y(DATA.trend[last] - 0.2 * o.ahead); s += `<path d="M${x(last)},${y(DATA.trend[last])}L${px},${py}" stroke="${o.lineC}" stroke-width="1.5" stroke-dasharray="2 4" fill="none" opacity=".55"/>`; }
  if (o.dots !== false) DATA.scale.forEach((v, i) => { s += `<circle cx="${x(i)}" cy="${y(v)}" r="${o.dotR || 2.4}" fill="${o.dotC}"/>`; });
  s += `<path d="${line}" stroke="${o.lineC}" stroke-width="${o.lineW || 2}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  if (o.cross != null) { const i = o.cross; s += `<line x1="${x(i)}" x2="${x(i)}" y1="${pad.t - 4}" y2="${H - pad.b}" stroke="${o.crossC}" stroke-width="1"/><circle cx="${x(i)}" cy="${y(DATA.trend[i])}" r="4.5" fill="${o.bg}" stroke="${o.lineC}" stroke-width="2"/>`; }
  else s += `<circle cx="${x(last)}" cy="${y(DATA.trend[last])}" r="4" fill="${o.bg}" stroke="${o.lineC}" stroke-width="2"/>`;
  (o.xlabels || []).forEach(([i, t]) => { s += `<text x="${x(i)}" y="${H - 4}" font-size="11" fill="${o.labelC}" font-family="${o.numFont}" text-anchor="${i === 0 ? 'start' : i >= n - 1 ? 'end' : 'middle'}">${t}</text>`; });
  s += `</svg>`; el.innerHTML = s;
}
