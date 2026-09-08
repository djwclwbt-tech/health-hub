// Engine tests · run with `npm test`. Pure logic only, no network, no browser.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../lib/engine.mjs';

const { PROG, DEFAULTS } = E;
const day = (offset, from = '2026-09-08') => { const d = new Date(from + 'T12:00:00'); d.setDate(d.getDate() + offset); return E.lds(d); };
const TODAY = '2026-09-08'; // a Tuesday inside Summer Cut v2 (week 10 → past deload week 4)
const slot = (id, day = null) => {
  for (const [dn, d] of Object.entries(PROG.days)) { const ex = d.exercises.find(e => e.id === id); if (ex && (!day || day === dn)) return ex; }
  throw new Error('no slot ' + id);
};
const sets = (weight, reps, n = reps.length) => Array.from({ length: n }, (_, i) => ({ weight, reps: Array.isArray(reps) ? reps[i] : reps, rir: 1, done: true }));
const base = (over = {}) => ({ ...E.bl(), ...over });

// ── identity ────────────────────────────────────────────────────────────────
test('progKey pairs lift and rep range; plain id is never the key', () => {
  assert.equal(E.progKey(slot('flat-bench'), slot('flat-bench')), 'flat-bench__5-8');
  assert.equal(E.progKey(slot('deadlift')), 'deadlift__5-5');
  assert.equal(E.progKey({ id: 'x', progKey: 'given' }), 'given');
  assert.equal(E.repTrack(undefined), 'default');
});

test('warm-up ramps scale with the working weight', () => {
  assert.deepEqual(E.WU(60), []);
  assert.deepEqual(E.WU(135).map(w => w.l), ['50%', '70%']);
  assert.deepEqual(E.WU(255).map(w => [w.w, w.r]), [[130, 10], [180, 5], [215, 3]]);
});

test('weight sanity caps reject logging errors by movement pattern', () => {
  assert.equal(E.saneWeight(slot('cable-fly'), 400), false);
  assert.equal(E.saneWeight(slot('deadlift'), 400), true);
  assert.equal(E.saneWeight(slot('leg-press', 'tuesday'), 650), true);
  assert.equal(E.saneWeight({ id: 'pull-ups', unit: 'BW' }, 5), false);
});

// ── progression math ────────────────────────────────────────────────────────
test('nextWeightFromSets: +inc only when every set hits the top of the range', () => {
  const pe = slot('flat-bench');
  assert.equal(E.nextWeightFromSets(sets(175, [8, 8, 8]), pe), 180);
  assert.equal(E.nextWeightFromSets(sets(175, [8, 8, 7]), pe), 175);
  assert.equal(E.nextWeightFromSets(sets(175, [8, 8]), pe), 175, 'missing a set is not a hit');
  assert.equal(E.nextWeightFromSets([], pe), null);
});

test('resolveWeight walks progression → history by key → history by id in range → legacy → default', () => {
  const bench = slot('flat-bench');
  assert.equal(E.resolveWeight(base(), bench, bench.sw, bench), 175, 'default');
  const d1 = base({ prog: { 'flat-bench__5-8': { currentWeight: 185 } } });
  assert.equal(E.resolveWeight(d1, bench, bench.sw, bench), 185, 'progression row');
  const d2 = base({ wk: { '2026-09-01': { exercises: [{ id: 'flat-bench', progKey: 'flat-bench__5-8', sets: sets(180, [8, 8, 8]) }] } } });
  assert.equal(E.resolveWeight(d2, bench, bench.sw, bench), 185, 'history by key, topped → +5');
  const d3 = base({ wk: { '2026-09-01': { exercises: [{ id: 'flat-bench', sets: sets(180, [6, 6, 6]) }] } } });
  assert.equal(E.resolveWeight(d3, bench, bench.sw, bench), 180, 'history by id within rep range');
  const d4 = base({ prog: { 'flat-bench': { currentWeight: 170, lastReps: [8, 8, 8] } } });
  assert.equal(E.resolveWeight(d4, bench, bench.sw, bench), 170, 'legacy plain-id row with real reps');
  const d5 = base({ prog: { 'leg-press': { currentWeight: 400, lastReps: [8, 8] } } });
  const lp = slot('leg-press', 'tuesday');
  assert.equal(E.resolveWeight(d5, lp, lp.sw, lp), 360, 'ambiguous legacy id ignored');
  const d6 = base({ prog: { 'flat-bench__5-8': { currentWeight: 900 } } });
  assert.equal(E.resolveWeight(d6, bench, bench.sw, bench), 175, 'insane progression value falls through');
});

// ── sessions ────────────────────────────────────────────────────────────────
test('buildSession prefills from last session, applies deload and accepted autoreg', () => {
  const tue = PROG.days.tuesday;
  const d = base({ wk: { '2026-09-01': { exercises: [{ id: 'deadlift', progKey: 'deadlift__5-5', sets: sets(235, [5, 5, 4]) }] } } });
  const w = E.buildSession(d, 'tuesday', tue, { date: TODAY, now: 1 });
  assert.equal(w.exercises.length, tue.exercises.length);
  assert.equal(w.isDeload, false);
  assert.deepEqual(w.exercises[0].sets.map(s => s.reps), [5, 5, 4], 'reps prefilled from last time');
  assert.equal(w.exercises[0].sets[0].weight, 235, 'missed a rep → hold weight');
  assert.equal(w.exercises[0].wu.length, 3);
  const auto = base({ autoregLog: { [TODAY]: { type: 'minusOneSet' } } });
  const wa = E.buildSession(auto, 'tuesday', tue, { date: TODAY });
  assert.equal(wa.exercises[0].sets.length, 3, 'anchor keeps its sets');
  assert.equal(wa.exercises[1].sets.length, 1, 'accessory drops one set');
  const deloadDate = day((PROG.deload - 1) * 7, PROG.start);
  const wd = E.buildSession(base(), 'tuesday', tue, { date: deloadDate });
  assert.equal(wd.isDeload, true);
  assert.equal(wd.exercises[0].sets[0].weight, 120, '50% rounded to 5');
});

test('sessionCursor interleaves superset pairs round-robin and finds the next open set', () => {
  const wed = PROG.days.wednesday;
  const exs = wed.exercises.map(e => ({ sets: Array.from({ length: 2 }, () => ({ done: false })) }));
  const restOf = i => wed.exercises[i].rest;
  const c0 = E.sessionCursor(exs, restOf);
  assert.deepEqual(c0.groups, [[0, 1], [2, 3], [4, 5]]);
  assert.deepEqual([c0.curEi, c0.curSi], [0, 0]);
  exs[0].sets[0].done = true;
  assert.deepEqual([E.sessionCursor(exs, restOf).curEi, E.sessionCursor(exs, restOf).curSi], [1, 0], 'A1 then B1');
  exs[1].sets[0].done = true;
  assert.deepEqual([E.sessionCursor(exs, restOf).curEi, E.sessionCursor(exs, restOf).curSi], [0, 1], 'then A2');
  exs.forEach(e => e.sets.forEach(s => { s.done = true; }));
  assert.equal(E.sessionCursor(exs, restOf).curEi, -1, 'all done');
});

test('applyWorkout: anchors progress on a full top-of-range session, accessories hold, PRs are detected', () => {
  const tue = PROG.days.tuesday;
  const d = base({ prog: { 'leg-press__5-8': { currentWeight: 360, pr: { e1rm: 400, date: '2026-08-01' }, e1rmHistory: [] } } });
  const w = E.buildSession(d, 'tuesday', tue, { date: TODAY, now: 0 });
  w.exercises[0].sets = sets(235, [5, 5, 5]);         // deadlift 3×5 hit → +10
  w.exercises[1].sets = sets(360, [8, 8]);            // leg press topped → holds on the cut, rep PR
  w.exercises[2].sets = sets(130, [8, 7]);            // curl not topped
  w.exercises[3].sets = [{ weight: 290, reps: 0, done: false }]; // calf skipped
  const { data: nd, prs, touched, log } = E.applyWorkout(d, w, tue, TODAY, 60 * 60000);
  assert.equal(nd.prog['deadlift__5-5'].currentWeight, 245);
  assert.equal(nd.prog['deadlift__5-5'].progressed, true);
  assert.equal(nd.prog['leg-press__5-8'].currentWeight, 360, 'non-anchor holds');
  assert.equal(nd.prog['leg-press__5-8'].progressed, false);
  assert.equal(nd.prog['lying-leg-curl__5-8'].currentWeight, 130);
  assert.equal(nd.prog['standing-calf__5-8'], undefined, 'skipped lift leaves no row');
  assert.deepEqual(touched.sort(), ['deadlift__5-5', 'leg-press__5-8', 'lying-leg-curl__5-8']);
  assert.equal(log.dur, 60);
  assert.equal(log.volume, 235 * 15 + 360 * 16 + 130 * 15);
  assert.equal(prs.length, 1, 'leg press beat its stored e1RM');
  assert.equal(prs[0].name, 'Leg Press');
  assert.equal(nd.prog['deadlift__5-5'].pr.e1rm, E.e1rm(235, 5));
  assert.equal(nd.prog['deadlift__5-5'].e1rmHistory.length, 1);
  assert.deepEqual(Object.keys(d.prog), ['leg-press__5-8'], 'input data untouched');
});

test('applyWorkout on deload never moves weight or writes PRs', () => {
  const deloadDate = day((PROG.deload - 1) * 7, PROG.start);
  const d = base({ prog: { 'deadlift__5-5': { currentWeight: 245, e1rmHistory: [], pr: null } } });
  const w = E.buildSession(d, 'tuesday', PROG.days.tuesday, { date: deloadDate, now: 0 });
  w.exercises[0].sets = sets(120, [5, 5, 5]);
  const { data: nd } = E.applyWorkout(d, w, PROG.days.tuesday, deloadDate, 1000);
  assert.equal(nd.prog['deadlift__5-5'].currentWeight, 245);
  assert.equal(nd.prog['deadlift__5-5'].pr, null);
});

test('swapped exercise progresses under its own key and remembers the slot', () => {
  const mon = PROG.days.monday;
  const w = E.buildSession(base(), 'monday', mon, { date: TODAY, now: 0 });
  const opts = E.swapOptions(base(), w, mon.exercises[1], mon.exercises[1]);
  const pick = opts[0];
  w.exercises[1] = { ...w.exercises[1], id: pick.id, progKey: pick.progKey, swappedTo: { id: pick.id, name: pick.name, sw: pick.sw, inc: pick.inc, unit: pick.unit }, sets: sets(pick.sw, [8, 8]) };
  const { data: nd } = E.applyWorkout(base(), w, mon, TODAY, 1000);
  assert.ok(nd.prog[pick.progKey], 'row under the swapped key');
  assert.equal(nd.prog[pick.progKey].exerciseId, pick.id);
  assert.equal(nd.prog['seated-row__5-8'], undefined);
});

// ── substitutions ───────────────────────────────────────────────────────────
test('swapOptions: same or related pattern, excludes the lift itself and anything already in the session, best fit first', () => {
  const mon = PROG.days.monday;
  const w = E.buildSession(base(), 'monday', mon, { date: TODAY });
  const opts = E.swapOptions(base(), w, mon.exercises[0], mon.exercises[0]);
  assert.ok(opts.length >= 3);
  assert.ok(opts.every(o => o.id !== 'flat-bench'));
  assert.ok(opts.every(o => o.pattern === 'chest-press'), 'chest press only relates to chest press');
  assert.ok(opts.every(o => !mon.exercises.some(e => e.id === o.id)), 'nothing already in session');
  assert.ok(opts.every(o => o.sets === 3 && o.rr[1] === 8), 'plan slot carried over');
  assert.equal(opts[0].recommended, true);
  const rowOpts = E.swapOptions(base(), w, mon.exercises[1], mon.exercises[1]);
  assert.ok(rowOpts.some(o => o.pattern === 'vertical-pull'), 'rows relate to pulldowns');
  assert.ok(!rowOpts.some(o => o.id === 'lat-pulldown'), 'but lat pulldown is already in the session');
});

test('manualSlot gives a library lift a sane 3×8-12 slot', () => {
  const s = E.manualSlot(E.exLibById['db-shoulder-press']);
  assert.deepEqual([s.sets, s.rr, s.rest, s.unit], [3, [8, 12], 90, 'lbs/hand']);
});

// ── history repair ──────────────────────────────────────────────────────────
test('backfillData replays logs by identity once, and pruneProgression drops orphans', () => {
  const d = base({ wk: { '2026-07-13': { exercises: [{ id: 'flat-bench', progKey: 'flat-bench__5-8', sets: sets(175, [8, 8, 8]) }] } } });
  E.backfillData(d);
  assert.equal(d.prog['flat-bench__5-8'].currentWeight, 180);
  assert.equal(d.prog['flat-bench__5-8'].pr.e1rm, E.e1rm(175, 8));
  assert.equal(d.backfillVersion, E.BACKFILL_VERSION);
  d.prog['flat-bench__5-8'].currentWeight = 999; E.backfillData(d);
  assert.equal(d.prog['flat-bench__5-8'].currentWeight, 999, 'one-shot: does not rerun');
  d.prog['ghost-lift__8-12'] = { currentWeight: 50, lastDate: '2026-01-01', lastReps: [10] };
  d.prog['deadlift'] = { currentWeight: 225, lastReps: [5] };
  const removed = E.pruneProgression(d);
  assert.equal(removed, 1);
  assert.ok(!d.prog['ghost-lift__8-12']);
  assert.ok(d.prog['deadlift'], 'legacy row of a current lift with reps survives');
});

// ── targets & day types ─────────────────────────────────────────────────────
test('day targets: training, Wednesday fast, weekend split, travel, social weekend', () => {
  const s = { ...DEFAULTS };
  assert.equal(E.getDayCalTarget('2026-09-08', s, {}, null), 2000);       // Tue
  assert.equal(E.getDayCalTarget('2026-09-09', s, {}, null), 900);        // Wed
  assert.equal(E.getDayCalTarget('2026-09-12', s, {}, null), 1900);       // Sat
  assert.equal(E.getDayCalTarget('2026-09-13', s, {}, null), 1700);       // Sun
  assert.equal(E.getDayCalTarget('2026-09-13', s, { '2026-09-13': true }, null), 2000, 'travel day');
  const sw = { active: true, weekOf: '2026-09-07' };
  assert.equal(E.getDayCalTarget('2026-09-12', s, {}, sw), null, 'social weekend has no ceiling');
  assert.equal(E.getDayCalTarget('2026-09-08', s, {}, sw), 1700, 'weekdays tightened');
  assert.equal(E.getDayProTarget('2026-09-09', s, {}, null), 150);
  assert.equal(E.getDayProTarget('2026-09-12', s, {}, null), 180);
  assert.equal(E.getDayType('2026-09-12', {}), 'weekend');
});

test('resolveMode follows the clock and the day state', () => {
  const d = base({ program: PROG.days });
  assert.equal(E.resolveMode(d, TODAY, null, 7, 'tuesday'), 'morning');
  assert.equal(E.resolveMode({ ...d, wt: { [TODAY]: 190 } }, TODAY, null, 7, 'tuesday'), 'session');
  assert.equal(E.resolveMode({ ...d, wt: { [TODAY]: 190 } }, TODAY, null, 7, 'saturday'), 'neutral');
  assert.equal(E.resolveMode({ ...d, wt: { [TODAY]: 190 }, wk: { [TODAY]: {} } }, TODAY, null, 10, 'tuesday'), 'neutral');
  assert.equal(E.resolveMode(d, TODAY, null, 20, 'tuesday'), 'closeout');
  assert.equal(E.resolveMode(d, TODAY, { day: 'tuesday' }, 22, 'tuesday'), 'session', 'active workout wins');
});

test('auto-regulation proposals scale with recovery', () => {
  assert.equal(E.getAutoregProposal({ recoveryScore: 75 }), null);
  assert.deepEqual(E.getAutoregProposal({ recoveryScore: 55 }).proposals.map(p => p.id), ['minusOneSet']);
  assert.deepEqual(E.getAutoregProposal({ recoveryScore: 35 }).proposals.map(p => p.id), ['minusOneSet', 'mobilitySwap']);
  assert.equal(E.getAutoregulation(72).level, 'green');
  assert.equal(E.getAutoregulation(50).level, 'red');
});

// ── analytics ───────────────────────────────────────────────────────────────
test('getTrend: EWMA-smoothed OLS over 14 days, lbs per week', () => {
  const wt = {}; for (let i = 13; i >= 0; i--) wt[day(-i)] = 192 - (13 - i) * (1 / 7); // exactly −1 lb/wk, no noise
  const t = E.getTrend(wt, TODAY);
  assert.equal(t.direction, 'down');
  assert.ok(t.rate <= -0.8 && t.rate >= -1.2, `rate ${t.rate}`);
  assert.equal(t.n, 14);
  assert.equal(t.weighIns7, 7);
  assert.equal(E.getTrend({ [TODAY]: 190 }, TODAY), null, 'needs two points');
  const old = {}; old[day(-30)] = 200; old[day(-20)] = 199;
  assert.equal(E.getTrend(old, TODAY), null, 'ignores anything outside the 14-day window');
});

test('calcAdaptiveTDEE recovers intake plus deficit from a clean history', () => {
  const wt = {}, nut = {};
  for (let i = 27; i >= 0; i--) {
    const k = day(-i);
    wt[k] = +(195 - (27 - i) * (1 / 7)).toFixed(2);                 // −1 lb/wk
    nut[k] = { meals: [{ mealType: 'Dinner', cal: 700 }], totalCal: 2000, totalProtein: 200 };
  }
  const t = E.calcAdaptiveTDEE(wt, nut, DEFAULTS, {}, {}, null);
  assert.notEqual(t.phase, 'collecting');
  assert.ok(t.tdee > 2350 && t.tdee < 2650, `tdee ${t.tdee}`);
  assert.ok(t.confidence > 50);
  assert.equal(E.calcAdaptiveTDEE({}, {}, DEFAULTS, {}, {}, null).phase, 'collecting');
});

test('weekly summary, recommendation and closeout agree on the same data', () => {
  const d = base({ program: PROG.days, settings: { ...DEFAULTS } });
  for (let i = 13; i >= 0; i--) {
    const k = day(-i); d.wt[k] = 190 - (13 - i) * 0.1;
    d.nut[k] = { meals: [{ cal: 1900, protein: 200 }], totalCal: 1900, totalProtein: 200 };
    d.rec[k] = { recoveryScore: 70 };
    if (PROG.days[E.dw(k)]) d.wk[k] = { day: E.dw(k), exercises: [], volume: 1000 };
    if (i % 2 === 0) d.cardio[k] = { done: true, duration: 20 };
    d.steps[k] = 16000;
  }
  const s = E.getWeeklyCutSummary(d, TODAY);
  assert.equal(s.loggedDays, 7);
  assert.equal(s.proteinHits, 7);
  assert.equal(s.trainingDone, s.plannedTraining);
  const rec = E.getWeeklyCutRecommendation(d, TODAY, s);
  assert.ok(['stay', 'adjust', 'too-fast'].includes(rec.key), rec.key);
  assert.equal(rec.signals.length, 5);
  const c = E.getTonightCloseout(d, TODAY);
  assert.equal(c.foodOk, true);
  assert.equal(c.stepsOk, true);
  const poor = base({ program: PROG.days, settings: { ...DEFAULTS } });
  assert.equal(E.getWeeklyCutRecommendation(poor, TODAY).key, 'adherence', 'no data → tighten logging first');
});

test('insights and retention score tolerate sparse data', () => {
  assert.deepEqual(E.getInsights(base()), []);
  assert.equal(E.getCutRetentionScore(base()), null);
  const d = base(); for (let i = 0; i < 10; i++) d.wt[day(-i)] = 190 - i * 0.1;
  const r = E.getCutRetentionScore(d);
  assert.ok(r.score > 0 && r.score <= 100);
});

// ── plates & program updates ────────────────────────────────────────────────
test('plateMath loads a bar per side', () => {
  assert.deepEqual(E.plateMath(255).perSide, [45, 45, 10, 5]);
  assert.deepEqual(E.plateMath(45).perSide, []);
  assert.equal(E.plateMath(40), null);
  assert.equal(E.plateMath(137).leftover, 1);
});

test('applyChanges applies settings and exercise edits, rejects nonsense, never mutates input', () => {
  const program = JSON.parse(JSON.stringify(PROG.days));
  const r = E.applyChanges([
    { type: 'settings', field: 'protein', value: 210 },
    { type: 'settings', field: 'bogus', value: 1 },
    { type: 'exercise', action: 'update', exerciseId: 'seated-row', fields: { sets: 3, notes: 'coach: +1 set' } },
    { type: 'exercise', action: 'swap', oldExerciseId: 'cable-fly', newExercise: { id: 'pec-deck', name: 'Pec Deck', sets: 2, rr: [12, 15], rest: 60, sw: 60, inc: 5, unit: 'lbs' } },
    { type: 'exercise', action: 'add', day: 'thursday', exercise: { id: 'face-pull', name: 'Face Pull', sets: 2, rr: [12, 15], rest: 60, sw: 40, inc: 5, unit: 'lbs' } },
    { type: 'exercise', action: 'add', day: 'thursday', exercise: { id: 'face-pull', name: 'Face Pull', sets: 2, rr: [12, 15], sw: 40, unit: 'lbs' } },
    { type: 'exercise', action: 'remove', day: 'friday', exerciseId: 'seated-calf' },
    { type: 'exercise', action: 'remove', day: 'friday', exerciseId: 'nope' },
  ], { settings: { ...DEFAULTS }, program });
  assert.equal(r.settings.protein, 210);
  assert.equal(r.applied.length, 5);
  assert.equal(r.rejected.length, 3);
  assert.equal(r.program.monday.exercises.find(e => e.id === 'seated-row').sets, 3);
  assert.equal(r.program.monday.exercises.some(e => e.id === 'cable-fly'), false);
  assert.equal(r.program.monday.exercises.some(e => e.id === 'pec-deck'), true);
  assert.equal(r.program.thursday.exercises.filter(e => e.id === 'face-pull').length, 1);
  assert.equal(r.program.friday.exercises.some(e => e.id === 'seated-calf'), false);
  assert.equal(program.monday.exercises.some(e => e.id === 'cable-fly'), true, 'input program untouched');
  assert.equal(DEFAULTS.protein, 200, 'input settings untouched');
});

test('exerciseReport summarizes a lift for coaching', () => {
  const d = base({ wk: { '2026-09-01': { exercises: [{ id: 'flat-bench', progKey: 'flat-bench__5-8', sets: sets(175, [8, 8, 8]) }] }, '2026-08-25': { exercises: [{ id: 'flat-bench', progKey: 'flat-bench__5-8', sets: sets(170, [8, 8, 7]) }] } } });
  E.backfillData(d);
  const r = E.exerciseReport(d, slot('flat-bench'), 'flat-bench__5-8');
  assert.equal(r.sessions.length, 2);
  assert.equal(r.sessions[0].date, '2026-09-01');
  assert.equal(r.workingWeight, 180);
  assert.equal(r.pr.e1rm, E.e1rm(175, 8));
});
