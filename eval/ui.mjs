// UI scorer: loads the real app in headless Chromium at iPhone size, offline
// (Supabase and /api blocked), seeded with a data file, and measures each screen
// against the Day line rules in CLAUDE.md. No opinions: every check is a count.
//   node eval/ui.mjs [data.json]     → eval/out/ui.json + screenshots
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = path.join(ROOT, 'eval/out');
const DATA = process.argv[2] || path.join(ROOT, 'eval/out/athlete.json');
if (!process.argv[2]) { const { scenario } = await import('./fixtures.mjs'); fs.mkdirSync(path.dirname(DATA), { recursive: true }); fs.writeFileSync(DATA, JSON.stringify(scenario('on-track'))); }
const CHROME = process.env.CHROME || ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(p => fs.existsSync(p));
fs.mkdirSync(path.join(OUT, 'shots'), { recursive: true });

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.woff2': 'font/woff2', '.png': 'image/png', '.css': 'text/css' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html';
  const f = path.join(ROOT, p.startsWith('/build.json') ? 'public/build.json' : p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${server.address().port}`;

// Screens: every tab, Today at the moments that change its Now row, and the sheets people open daily.
const SCREENS = [
  { id: 'today-morning', q: 'tab=dashboard&clock=07:00&day=monday' },
  { id: 'today-midday', q: 'tab=dashboard&clock=12:30&day=tuesday' },
  { id: 'today-fast', q: 'tab=dashboard&clock=13:00&day=wednesday' },
  { id: 'today-evening', q: 'tab=dashboard&clock=20:30&day=friday' },
  { id: 'train', q: 'tab=training' },
  { id: 'trends', q: 'tab=weight' },
  { id: 'you', q: 'tab=settings' },
  { id: 'train-session', q: 'tab=training', act: async p => { const b = p.getByRole('button', { name: /^Start/ }).first(); if (await b.count()) { await b.click(); await p.waitForTimeout(500); } } },
];

// Runs inside the page. Returns raw counts per rule; the score is computed outside.
const AUDIT = () => {
  const ALLOW_CAPS = /^(JSON|CSV|HRV|RHR|RIR|TDEE|BW|AM|PM|OK|PR|PRS|E1RM|RPE|BMR|NEAT|DB|BB|EZ|RDL|OHP|ID|HH|AI|CST|CDT|USDA|PWA|KG|LB|LBS|MCP|API|SQL|URL|EWMA|OLS|BF|DEXA|SMS|GPS|UTC)$/;
  const vis = el => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity > 0 && !el.closest('[hidden],[aria-hidden="true"]'); };
  const textNodes = [...document.querySelectorAll('body *')].filter(el => [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && vis(el));
  const rgb = s => { const n = (s.match(/[\d.]+/g) || []).map(Number); return /^color\(srgb/.test(s) ? [n[0] * 255, n[1] * 255, n[2] * 255, n[3]] : n; };
  const lum = ([r, g, b]) => { const f = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const bgOf = el => { for (let e = el; e; e = e.parentElement) { const c = rgb(getComputedStyle(e).backgroundColor); if (c.length >= 3 && (c[3] === undefined || c[3] > 0.5)) return c; } return [245, 246, 247]; };
  const out = { texts: textNodes.length, tiny: [], caps: [], spaced: [], lowContrast: [], badText: [], dash: [], semi: [], smallTargets: [], emberFills: 0, overflowX: 0 };
  for (const el of textNodes) {
    const s = getComputedStyle(el); const txt = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join(' ').trim(); const fs = parseFloat(s.fontSize);
    const tag = `${el.tagName.toLowerCase()}: ${txt.slice(0, 48)}`;
    if (fs < 12) out.tiny.push(`${fs}px ${tag}`);
    if (s.textTransform === 'uppercase') out.caps.push(tag);
    else for (const w of txt.split(/[^A-Za-z0-9]+/)) if (w.length >= 3 && /[A-Z]/.test(w) && w === w.toUpperCase() && !/\d/.test(w) && !ALLOW_CAPS.test(w)) { out.caps.push(`${w} in ${tag}`); break; }
    if (parseFloat(s.letterSpacing) > 0.6) out.spaced.push(tag);
    const fg = rgb(s.color); const bg = bgOf(el); const a = fg[3] ?? 1;
    const mixed = fg.slice(0, 3).map((c, i) => c * a + bg[i] * (1 - a));
    const L1 = lum(mixed), L2 = lum(bg.slice(0, 3)); const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    const large = fs >= 24 || (fs >= 18.66 && +s.fontWeight >= 600);
    if (ratio < (large ? 3 : 4.5) && !s.textDecorationLine.includes('line-through')) out.lowContrast.push(`${ratio.toFixed(2)} ${tag}`);
    if (/\b(undefined|NaN|null|Infinity)\b|\[object/.test(txt)) out.badText.push(tag);
    if (txt.includes('—')) out.dash.push(tag);
    if (/[a-z]; [a-z]/i.test(txt)) out.semi.push(tag);
  }
  for (const el of document.querySelectorAll('button, a[href], [role="button"], input, select, textarea')) {
    if (!vis(el)) continue; const r = el.getBoundingClientRect();
    if (r.height < 44 && r.width < 44) out.smallTargets.push(`${Math.round(r.width)}x${Math.round(r.height)} ${el.tagName.toLowerCase()}: ${(el.innerText || el.getAttribute('aria-label') || el.value || '').trim().slice(0, 32)}`);
    else if (r.height < 32) out.smallTargets.push(`${Math.round(r.width)}x${Math.round(r.height)} ${el.tagName.toLowerCase()}: ${(el.innerText || el.getAttribute('aria-label') || '').trim().slice(0, 32)}`);
  }
  const ember = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
  const probe = document.createElement('i'); probe.style.color = ember; document.body.append(probe); const emberRgb = getComputedStyle(probe).color; probe.remove();
  for (const el of document.querySelectorAll('button, [role="button"]')) if (vis(el) && getComputedStyle(el).backgroundColor === emberRgb) out.emberFills++;
  out.overflowX = Math.max(0, document.documentElement.scrollWidth - innerWidth);
  return out;
};

const data = JSON.parse(fs.readFileSync(DATA, 'utf8'));
const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
const results = [];
for (const sc of SCREENS) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
  await ctx.route(/supabase\.co|\/api\//, r => r.abort());
  await ctx.addInitScript(d => { if (!sessionStorage.getItem('__seeded')) { localStorage.clear(); localStorage.setItem('dhub6', d); sessionStorage.setItem('__seeded', '1'); } }, JSON.stringify(data));
  const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', e => errors.push(String(e.message).slice(0, 160)));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|net::ERR|\[SB\]/.test(m.text())) errors.push(m.text().slice(0, 160)); });
  const t0 = Date.now();
  await page.goto(`${BASE}/?${sc.q}`, { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  if (sc.act) await sc.act(page);
  const ms = Date.now() - t0;
  const a = await page.evaluate(AUDIT);
  await page.screenshot({ path: path.join(OUT, 'shots', `${sc.id}.png`), fullPage: true });
  results.push({ id: sc.id, ms, errors, ...a });
  await ctx.close();
}
await browser.close(); server.close();

// Static rules from CLAUDE.md that a screenshot cannot see.
const src = fs.readdirSync(path.join(ROOT, 'src'), { recursive: true }).filter(f => /\.(jsx?|mjs)$/.test(f)).map(f => [f, fs.readFileSync(path.join(ROOT, 'src', f), 'utf8')]);
const hexOutsideRoot = src.flatMap(([f, s]) => [...s.matchAll(/["'`]#[0-9a-fA-F]{3,8}\b/g)].map(m => `${f}: ${m[0]}`));
const idx = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const darkMode = /prefers-color-scheme/.test(idx) ? 1 : 0;

// Score: each rule is the share of screens (or texts) that pass it. 100 = every rule clean.
const per = (k, denom = r => r.texts) => 1 - Math.min(1, results.reduce((s, r) => s + r[k].length, 0) / Math.max(1, results.reduce((s, r) => s + denom(r), 0)));
const screensClean = k => results.filter(r => (Array.isArray(r[k]) ? r[k].length : r[k]) === 0).length / results.length;
const rules = {
  noErrors: screensClean('errors'), noOverflow: screensClean('overflowX'), noBadText: screensClean('badText'),
  minFont12: screensClean('tiny'), noCaps: screensClean('caps'), noSpacing: screensClean('spaced'),
  contrastAA: per('lowContrast'), targets44: screensClean('smallTargets'), copyNoDash: screensClean('dash'), copyNoSemicolon: screensClean('semi'),
  oneEmberAction: results.filter(r => r.emberFills <= 1).length / results.length,
  noHexOutsideRoot: hexOutsideRoot.length ? 0 : 1, lightOnly: 1 - darkMode,
  fastPaint: results.filter(r => r.ms < 2500).length / results.length,
};
const score = Math.round(100 * Object.values(rules).reduce((a, b) => a + b, 0) / Object.keys(rules).length);
const report = { at: new Date().toISOString(), data: path.basename(DATA), score, rules, hexOutsideRoot, screens: results };
fs.writeFileSync(path.join(OUT, 'ui.json'), JSON.stringify(report, null, 2));
console.log(`UI ${score}/100`);
for (const [k, v] of Object.entries(rules)) if (v < 1) console.log(`  ${k.padEnd(18)} ${(v * 100).toFixed(0)}%`);
for (const r of results) { const bad = ['errors', 'badText', 'tiny', 'caps', 'spaced', 'lowContrast', 'smallTargets', 'dash', 'semi'].filter(k => r[k].length); if (bad.length || r.overflowX || r.emberFills > 1) console.log(`  ${r.id}: ${bad.map(k => `${k}=${r[k].length}`).join(' ')}${r.overflowX ? ` overflowX=${r.overflowX}` : ''}${r.emberFills > 1 ? ` ember=${r.emberFills}` : ''}`); }
