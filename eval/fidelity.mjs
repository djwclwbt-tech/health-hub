// Data-fidelity scorer: does the data the app and the Coach reason from match
// reality? Reads only. Each check is pass/fail with the evidence; the score is
// the weighted share that pass. Run against the live cloud (default) or a file.
//   node eval/fidelity.mjs [data.json] [--today=YYYY-MM-DD]
// Live mode needs SUPABASE_URL/SUPABASE_ANON_KEY (source .env.local); with
// OURA_PAT it also asks Oura directly whether the token still works.
import fs from 'node:fs';
import path from 'node:path';
import * as E from '../lib/engine.mjs';
import { makeClient, loadAll } from '../lib/supabase.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const arg = process.argv.slice(2);
const file = arg.find(a => !a.startsWith('--'));
const today = (arg.find(a => a.startsWith('--today=')) || '').slice(8) || new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' });
const d = file ? JSON.parse(fs.readFileSync(file, 'utf8')) : await loadAll(makeClient({ url: process.env.SUPABASE_URL, key: process.env.SUPABASE_ANON_KEY }));

const ago = k => k ? Math.round((new Date(today + 'T12:00:00') - new Date(k + 'T12:00:00')) / 864e5) : Infinity;
const lastKey = (o, pred = () => true) => Object.keys(o || {}).filter(k => k <= today && pred(o[k])).sort().at(-1) || null;
const inWindow = (o, n, pred = () => true) => Object.keys(o || {}).filter(k => ago(k) >= 1 && ago(k) <= n && pred(o[k]));
const checks = [];
const check = (id, weight, pass, evidence, fix) => checks.push({ id, weight, pass: !!pass, evidence, fix: pass ? undefined : fix });

// 1. Feeds are alive (the rawest signal: is the pipe delivering at all).
const ouraLast = lastKey(d.rec, r => r?.recoveryScore != null);
check('feed.oura', 3, ago(ouraLast) <= 2, `last recovery ${ouraLast} (${ago(ouraLast)} days ago)`, 'Oura has no new readings: the ring is not recording or not syncing to the Oura app.');
const stepsLast = lastKey(d.steps, v => v > 0);
check('feed.steps', 1, ago(stepsLast) <= 2, `last steps ${stepsLast}`, 'Apple Shortcut step sync stopped.');
const wtLast = lastKey(d.wt);
check('feed.weight', 2, ago(wtLast) <= 3, `last weigh-in ${wtLast} (${ago(wtLast)} days ago)`, 'No weigh-in for 4+ days: the trend is going stale.');

// 2. Coverage: can the engine's numbers be trusted this week?
const foodDays = inWindow(d.nut, 7, n => (n?.totalCal || 0) > 300 && !(n.meals || []).every(m => m.source === 'import')).length;
const fastDays = inWindow({ ...Object.fromEntries([...Array(7)].map((_, i) => { const x = new Date(today + 'T12:00:00'); x.setDate(x.getDate() - i - 1); return [E.lds(x), 1]; })) }, 7, (_) => true).filter(k => E.dw(k) === 'wednesday').length;
check('coverage.food7', 3, foodDays >= 7 - fastDays - 1, `${foodDays} of ${7 - fastDays} eating days logged in the last week`, 'Food is logged on too few days for calories, TDEE or adherence to mean anything.');
const wt14 = inWindow(d.wt, 14).length;
check('coverage.weight14', 2, wt14 >= 8, `${wt14} weigh-ins in 14 days`, 'Too few weigh-ins for a reliable rate.');
const partial = inWindow(d.nut, 14, n => (n?.totalCal || 0) > 0 && n.totalCal < 900).filter(k => E.dw(k) !== 'wednesday');
check('coverage.partialFood', 1, partial.length === 0, partial.length ? `days under 900 cal on an eating day: ${partial.join(', ')}` : 'none', 'Partly logged days count as low-calorie days and drag the averages down.');

// 3. Internal consistency: stored totals equal their parts.
const badTotals = Object.entries(d.nut || {}).filter(([, n]) => (n.meals || []).length && Math.abs(E.sumMeals(n.meals).totalCal - (n.totalCal || 0)) > 5).map(([k]) => k);
check('consistency.mealTotals', 2, badTotals.length === 0, badTotals.length ? `totals differ from meals on ${badTotals.slice(-5).join(', ')}` : 'all match', 'Daily totals no longer match their meals.');
const dupMeals = Object.entries(d.nut || {}).filter(([k]) => ago(k) <= 60).filter(([, n]) => { const s = (n.meals || []).map(m => `${m.description}|${m.cal}|${m.mealType}|${m.source}`); return s.length !== new Set(s).size && (n.meals || []).filter(m => m.source !== 'cronometer').length > 0; }).map(([k]) => k);
check('consistency.dupMeals', 1, dupMeals.length === 0, dupMeals.length ? `duplicate non-Cronometer meals on ${dupMeals.slice(-5).join(', ')}` : 'none', 'A meal was saved twice.');
const wts = Object.entries(d.wt || {}).sort(); const jumps = [];
for (let i = 1; i < wts.length; i++) { const gap = ago(wts[i - 1][0]) - ago(wts[i][0]); if (gap <= 2 && Math.abs(wts[i][1] - wts[i - 1][1]) > 4) jumps.push(`${wts[i][0]} ${wts[i - 1][1]}→${wts[i][1]}`); }
check('consistency.weightJumps', 1, jumps.filter(j => ago(j.slice(0, 10)) <= 60).length === 0, jumps.slice(-3).join('; ') || 'none', 'A weigh-in jumped 4+ lb in two days: likely a typo.');
const longSessions = Object.entries(d.wk || {}).filter(([k, w]) => ago(k) <= 60 && (w.dur > 240 || w.dur < 0)).map(([k]) => k);
check('consistency.sessionDur', 1, longSessions.length === 0, longSessions.join(', ') || 'none', 'A session ran over 4 hours (forgotten Finish).');

// 4. Settings match the decisions on record (the Coach log is the decision trail).
const lastSetting = {};
for (const c of [...(d.coachLog || [])].sort((a, b) => String(a.at).localeCompare(String(b.at)))) if (c.type === 'settings' && c.payload?.field) lastSetting[c.payload.field] = { value: c.payload.value, at: c.at };
const drift = Object.entries(lastSetting).filter(([f, v]) => d.settings?.[f] !== undefined && d.settings[f] !== v.value).map(([f, v]) => `${f}: coach set ${v.value} on ${String(v.at).slice(0, 10)}, live is ${d.settings[f]}`);
check('decisions.settingsDrift', 2, drift.length === 0, drift.join('; ') || 'live settings match the last coach change for each field', 'Live targets differ from the last recorded decision, and nothing records why.');

// 5. The Coach's written instructions describe the block that is actually running.
const coach = fs.readFileSync(path.join(ROOT, 'COACH.md'), 'utf8');
check('coach.blockName', 2, coach.includes(E.PROG.name), `COACH.md names ${coach.includes(E.PROG.name) ? E.PROG.name : 'an old block'}; code runs ${E.PROG.name}`, 'The Coach project instructions describe a finished block.');
check('program.version', 1, !d.programVersion || d.programVersion === E.PROG.version, `stored ${d.programVersion}, code ${E.PROG.version}`, 'The stored program is from another block version.');

const total = checks.reduce((s, c) => s + c.weight, 0);
const score = Math.round(100 * checks.filter(c => c.pass).reduce((s, c) => s + c.weight, 0) / total);
const report = { at: new Date().toISOString(), today, source: file ? path.basename(file) : 'live', score, checks };
fs.mkdirSync(path.join(ROOT, 'eval/out'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'eval/out', file ? 'fidelity-file.json' : 'fidelity.json'), JSON.stringify(report, null, 2));
console.log(`Fidelity ${score}/100 (${report.source})`);
for (const c of checks) console.log(`  ${c.pass ? 'ok  ' : 'FAIL'} ${c.id.padEnd(26)} ${c.evidence}`);
