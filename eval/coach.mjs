// Coach scorer. Builds the exact prompt each variant sends for every scenario,
// then grades the model's answers with checks that do not need judgment:
// valid JSON, numbers traceable to the input (groundingCheck), copy rules.
// The judgment half (did it pull the right lever?) is a blind rubric grade by a
// second model: eval/out/coach/grade-*.json, merged here.
//   node eval/coach.mjs prep             → eval/out/coach/<scenario>.<variant>.prompt.json
//   node eval/coach.mjs score            → eval/out/coach.json from *.out.txt (+ grade files)
//   node eval/coach.mjs live --model=ID  → calls the Anthropic API (costs money), writes *.out.txt
import fs from 'node:fs';
import path from 'node:path';
import * as E from '../lib/engine.mjs';
import { SCENARIOS, scenario } from './fixtures.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const DIR = path.join(ROOT, 'eval/out/coach');
fs.mkdirSync(DIR, { recursive: true });
const TODAY = '2026-10-26';

// Variant "v1" is the analysis as it shipped before this pass: the payload Analysis.jsx
// built in the component and the prompt api/analyze.js wrapped around it. Kept verbatim
// in spirit so the baseline is honest.
const legacy = (data, days = 7) => {
  const cutStr = E.shiftDate(TODAY, -days);
  const within = o => Object.entries(o || {}).filter(([d]) => d >= cutStr);
  const nut = within(data.nut), rec = within(data.rec).filter(([, r]) => r.recoveryScore), wt = within(data.wt).sort((a, b) => a[0].localeCompare(b[0])), steps = within(data.steps), wk = within(data.wk);
  const av = (a, f) => Math.round(a.reduce((s, x) => s + f(x), 0) / a.length);
  const t = data.settings;
  const L = [];
  L.push(`Program: ${E.PROG.name}, Week ${E.wkn(TODAY)}/${E.PROG.weeks}`);
  L.push(`Analysis window: 7d (${days} days)`);
  L.push(`Goals: cut execution, ~${t.calories} cal/day, ${t.protein}g+ protein, ${t.steps} steps/day, ${t.water}oz water, ${t.sleep}h sleep`);
  L.push(`\nWORKOUTS: ${wk.length} sessions logged, days: ${wk.map(([, w]) => w.day).join(', ') || 'none'}, progressions this period: 0`);
  L.push(nut.length ? `\nNUTRITION (${nut.length} days avg): ${av(nut, ([, n]) => n.totalCal)} cal/day (target ${t.calories}), ${av(nut, ([, n]) => n.totalProtein)}g protein (target ${t.protein}g+), ${av(nut, ([, n]) => n.totalCarbs)}g carbs, ${av(nut, ([, n]) => n.totalFat)}g fat, ${av(nut, ([, n]) => n.totalFiber)}g fiber` : `\nNUTRITION: No data in this period`);
  L.push(rec.length ? `\nRECOVERY (${rec.length} days): avg score ${av(rec, ([, r]) => r.recoveryScore)}%, HRV ${av(rec, ([, r]) => r.hrv)}ms, RHR ${av(rec, ([, r]) => r.rhr)}bpm, sleep ${(rec.reduce((s, [, r]) => s + r.sleepHours, 0) / rec.length).toFixed(1)}h (target ${t.sleep}h)` : `\nRECOVERY: No data in this period`);
  L.push(wt.length >= 2 ? `\nWEIGHT: ${wt[0][1]} → ${wt.at(-1)[1]} lbs (${(wt.at(-1)[1] - wt[0][1]).toFixed(1)} lbs over 7d), ${wt.length} entries` : `\nWEIGHT: No data in this period`);
  L.push(`\nSTEPS: ${steps.length ? `avg ${av(steps, ([, v]) => v).toLocaleString()}/day (target ${t.steps.toLocaleString()})` : 'No data'}`);
  L.push(`WATER: No data`);
  L.push(`HABITS (7-day score): No data — tracked: alcohol-free, cannabis-free, screens off by 10pm, morning sunlight, bed by 10:30, read before bed`);
  L.push(`\nBODY COMPOSITION: No photos in this period.`);
  return L.join('\n');
};
const LEGACY_SYSTEM = `You are a health data analyst for a strength athlete executing a fat-loss cut while preserving muscle and performance. Analyze the provided data and return ONLY a valid JSON object with this exact structure:
{"scores":{"overall":<0-100>,"training":<0-100 or null if no data>,"nutrition":<0-100 or null if no data>,"recovery":<0-100 or null if no data>,"habits":<0-100 or null if no data>},"summary":"<2-3 sentence honest assessment of the period>","wins":["<specific win 1>","<specific win 2>"],"gaps":["<specific gap 1>","<specific gap 2>"],"trends":["<trend observation 1>","<trend observation 2>"],"correlations":["<correlation between metrics>"],"recommendations":["<actionable rec 1>","<actionable rec 2>","<actionable rec 3>"],"nextWeekFocus":"<1-2 sentence priority focus for next 7 days>","bodyComposition":{"bfTrend":"direction or stable","recompSignal":"cut-retention signal with reasoning","muscleQuality":"brief observation","photoReminder":"only if >14 days since last photo, else null"}}
Scoring guide: 100=perfect execution, 70+=solid, 45-70=inconsistent, <45=needs attention. Base scores strictly on data vs targets. Be direct — do not sugarcoat gaps. No markdown, no explanation, JSON only.`;

export const VARIANTS = {
  v1: d => ({ system: LEGACY_SYSTEM, user: legacy(d) }),
  // v2 and later are the live engine (ANALYSIS_SYSTEM + coachBrief) at the round they were recorded.
  // Round 1 recorded v2; round 2 added the priority order and food-amount rules and recorded v3.
  v2: d => ({ system: E.ANALYSIS_SYSTEM, user: E.briefText(E.coachBrief(d, TODAY)) }),
  v3: d => ({ system: E.ANALYSIS_SYSTEM, user: E.briefText(E.coachBrief(d, TODAY)) }),
  // Round 3: the priority rule names the cause (recovery crash vs deficit) and bans sub-100 cal tweaks.
  v4: d => ({ system: E.ANALYSIS_SYSTEM, user: E.briefText(E.coachBrief(d, TODAY)) }),
};

const cmd = process.argv[2] || 'score';
const onlyVariants = (process.argv.find(a => a.startsWith('--variants=')) || '').slice(11).split(',').filter(Boolean);
const variants = onlyVariants.length ? onlyVariants : Object.keys(VARIANTS);

if (cmd === 'prep') {
  for (const s of Object.keys(SCENARIOS)) for (const v of variants) {
    const d = scenario(s, TODAY); const p = VARIANTS[v](d);
    // The model under test sees only system + user. The rubric lives in a separate file it never reads.
    fs.writeFileSync(path.join(DIR, `${s}.${v}.prompt.json`), JSON.stringify(p, null, 2));
    fs.writeFileSync(path.join(DIR, `${s}.${v}.meta.json`), JSON.stringify({ scenario: s, variant: v, brief: E.coachBrief(d, TODAY), expect: SCENARIOS[s].expect, story: SCENARIOS[s].story }, null, 2));
  }
  console.log(`prompts written to ${path.relative(ROOT, DIR)}`);
}

if (cmd === 'live') {
  const model = (process.argv.find(a => a.startsWith('--model=')) || '').slice(8) || 'claude-opus-5-5';
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not set');
  for (const f of fs.readdirSync(DIR).filter(f => f.endsWith('.prompt.json'))) {
    const p = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')); if (!variants.includes(f.split('.')[1])) continue;
    const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' }, body: JSON.stringify({ model, max_tokens: 1500, system: p.system, messages: [{ role: 'user', content: p.user }] }) });
    const j = await r.json(); fs.writeFileSync(path.join(DIR, f.replace('.prompt.json', '.out.txt')), j.content?.[0]?.text || JSON.stringify(j));
    console.log(f, r.status);
  }
}

if (cmd === 'score') {
  const grades = {};
  for (const f of fs.readdirSync(DIR).filter(f => /^grade-.*\.json$/.test(f))) for (const g of JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'))) grades[`${g.scenario}.${g.variant}`] = g;
  const rows = [];
  for (const f of fs.readdirSync(DIR).filter(f => f.endsWith('.out.txt'))) {
    const [s, v] = f.split('.'); if (!variants.includes(v)) continue;
    const raw = fs.readFileSync(path.join(DIR, f), 'utf8');
    const p = { ...JSON.parse(fs.readFileSync(path.join(DIR, `${s}.${v}.prompt.json`), 'utf8')), ...JSON.parse(fs.readFileSync(path.join(DIR, `${s}.${v}.meta.json`), 'utf8')) };
    let json = null; try { json = JSON.parse(raw.replace(/```json|```/g, '').trim()); } catch {}
    const prose = json ? [json.summary, ...(json.dataGaps || []), ...(json.wins || []), ...(json.gaps || []), ...(json.trends || []), ...(json.correlations || []), ...(json.recommendations || []), json.nextWeekFocus].filter(Boolean).join(' ') : raw;
    // Grounding is checked against what that variant was actually given.
    const ungrounded = E.groundingCheck(prose, p.variant === 'v1' ? p.user : p.brief);
    const g = grades[`${s}.${v}`];
    rows.push({ scenario: s, variant: v, validJson: !!json, ungrounded, dashes: (prose.match(/—/g) || []).length, semicolons: (prose.match(/;/g) || []).length, words: prose.split(/\s+/).length, rubric: g?.score ?? null, verdict: g?.notes ?? null });
  }
  const byV = {};
  for (const r of rows) { const b = byV[r.variant] ||= { n: 0, rubric: [], ungrounded: 0, validJson: 0, copy: 0 }; b.n++; if (r.rubric != null) b.rubric.push(r.rubric); b.ungrounded += r.ungrounded.length; b.validJson += r.validJson; b.copy += r.dashes + r.semicolons; }
  const summary = Object.fromEntries(Object.entries(byV).map(([v, b]) => [v, { runs: b.n, rubricAvg: b.rubric.length ? +(b.rubric.reduce((a, c) => a + c, 0) / b.rubric.length).toFixed(2) : null, ungroundedNumbers: b.ungrounded, validJson: `${b.validJson}/${b.n}`, copyViolations: b.copy,
    score: b.rubric.length ? Math.round(10 * (b.rubric.reduce((a, c) => a + c, 0) / b.rubric.length) * (b.validJson / b.n) - Math.min(20, b.ungrounded * 2)) : null }]));
  fs.writeFileSync(path.join(ROOT, 'eval/out/coach.json'), JSON.stringify({ at: new Date().toISOString(), summary, rows }, null, 2));
  console.log('Coach'); for (const [v, s] of Object.entries(summary)) console.log(`  ${v}: score ${s.score ?? '-'}  rubric ${s.rubricAvg ?? '-'}/10  ungrounded ${s.ungroundedNumbers}  json ${s.validJson}  copy ${s.copyViolations}`);
  for (const r of rows) console.log(`    ${r.scenario.padEnd(15)} ${r.variant} rubric ${r.rubric ?? '-'} ungrounded [${r.ungrounded.join(', ')}]`);
}
