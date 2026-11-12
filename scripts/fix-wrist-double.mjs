// One-shot data fix: 2026-11-12 was logged on the watch and on the phone, so the day
// is "multi" with every lift twice (watch copy at the prefilled weights). This folds
// the copies with the engine (foldDoubleDay → foldDayLog), fixes the 22.2 lb typo on
// the second DB lateral raise set, and repairs the progression rows the watch touched.
//
//   node scripts/fix-wrist-double.mjs --sample          dry run on a synthetic copy (no network)
//   node scripts/fix-wrist-double.mjs                   dry run on live data (reads only)
//   node scripts/fix-wrist-double.mjs --apply           writes the workout row and progression rows
// Live runs need SUPABASE_URL / SUPABASE_KEY in the environment (source .env.local first).
import { foldDoubleDay } from '../lib/engine.mjs';
import { makeClient, loadAll, toRow } from '../lib/supabase.mjs';
import { sample, DATE as SAMPLE_DATE } from './wrist-double-sample.mjs';

const args = new Set(process.argv.slice(2));
const DATE = '2026-11-12';
const FIXES = [{ id: 'db-lateral-raise', from: 22.2, to: 22.5 }];

// One line per set: "60x10 · app+wrist · 17:02:30 · hr 118/140 · lid w1112".
const setLine = s => [`${s.weight}x${s.reps}`, s.src || 'app', s.at ? new Date(s.at).toISOString().slice(11, 19) : null, s.hr ? `hr ${s.hr}/${s.hrMax ?? '-'}` : null, s.lid ? `lid ${s.lid}` : null, s.wrist ? `watch had ${s.wrist.weight}x${s.wrist.reps}` : null].filter(Boolean).join(' · ');
const brief = w => w && ({ day: w.day, dur: w.dur, volume: w.volume, exercises: (w.exercises || []).map(e => ({ lift: e.progKey || e.id, ...(e.swappedFrom ? { swappedFrom: e.swappedFrom.id } : {}), sets: (e.sets || []).filter(s => s.done).map(setLine) })) });
const briefProg = r => r && ({ currentWeight: r.currentWeight, lastDate: r.lastDate, lastReps: r.lastReps, e1rmToday: (r.e1rmHistory || []).filter(p => p.date === DATE).map(p => p.e1rm), pr: r.pr && `${r.pr.weight}x${r.pr.reps} e1RM ${r.pr.e1rm} on ${r.pr.date}` });

let data, client = null;
if (args.has('--sample')) {
  if (args.has('--apply')) { console.error('--apply cannot be used with --sample'); process.exit(1); }
  data = sample().data;
  if (SAMPLE_DATE !== DATE) throw new Error('sample date mismatch');
} else {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY && !process.env.SUPABASE_ANON_KEY) { console.error('Set SUPABASE_URL and SUPABASE_KEY (source .env.local), or use --sample.'); process.exit(1); }
  client = makeClient({ url: process.env.SUPABASE_URL, key: process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY });
  data = await loadAll(client);
  if (['wk', 'prog'].some(k => data.__failed?.includes(k))) { console.error('Workouts or progression did not load. Nothing done.'); process.exit(1); }
}

const res = foldDoubleDay(data, DATE, { fixes: FIXES });
console.log(JSON.stringify({
  date: DATE, source: args.has('--sample') ? 'sample' : 'live',
  before: { workout: brief(data.wk?.[DATE]), progression: Object.fromEntries(Object.keys(res.prog).map(k => [k, briefProg(data.prog?.[k])])) },
  after: { workout: brief(res.row), progression: Object.fromEntries(Object.entries(res.prog).map(([k, r]) => [k, briefProg(r)])) },
  notes: res.notes,
}, null, 2));

if (!args.has('--apply')) { console.log('\nDry run. Nothing written.'); process.exit(0); }
if (!res.row) { console.error('Nothing to write.'); process.exit(1); }
const keys = Object.keys(res.prog);
// Progression first, the workout last (same order as /api/wrist). upsert throws on any error.
if (keys.length) await client.upsert('progression', keys.map(k => toRow.progression(k, res.prog[k])), 'exercise_id');
await client.upsert('workouts', toRow.workout(DATE, res.row));
console.log(`\nWrote the ${DATE} workout row and ${keys.length} progression rows.`);
