// One session logged on the watch and on the phone: the copies fold into one entry
// per lift (phone weights and reps, watch times and heart rate), in either order.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../lib/engine.mjs';
import { sample, DATE } from '../scripts/wrist-double-sample.mjs';

const THU = DATE;
const T0 = Date.parse('2026-11-12T17:00:00Z') / 1000;
const OPT = { today: THU };
const thu = E.PROG.days.thursday;

// The watch's log: every planned set at the plan's weight and reps.
const watchLog = (data, id = 'wlog1') => {
  const { plan } = E.wristPlan(data, { date: THU, day: 'thursday' });
  const d = plan.seq.map(([ei, si], n) => [ei, plan.ex[ei].i, si, plan.ex[ei].w, plan.ex[ei].r[si], T0 + 150 * (n + 1), 120 + n, 150]);
  return { v: 1, id, plan: plan.id, date: THU, day: 'thursday', t0: T0, t1: T0 + 150 * (d.length + 1), d, k: [] };
};
// The phone's session: weight +10 on every lift, pec deck swapped to DB Fly, sets typed late.
const phoneWorkout = (data, { swap = true, drop = null } = {}) => {
  const w = E.buildSession(data, 'thursday', thu, { date: THU, now: (T0 + 60) * 1000 });
  const fly = E.exLibById['db-fly'];
  w.exercises.forEach((ex, i) => {
    if (swap && ex.id === 'pec-deck') {
      const old = thu.exercises[i];
      ex.swappedFrom = { id: old.id, name: old.name, progKey: E.progKey(old, old) };
      ex.id = fly.id; ex.progKey = E.progKey(fly, old);
      ex.swappedTo = { id: fly.id, name: fly.name, unit: fly.unit, sw: fly.sw, inc: fly.inc, progKey: ex.progKey, pattern: fly.pattern };
    }
    const w0 = ex.id === 'db-fly' ? 20 : (Number(ex.sets[0].weight) || 0) + 10;
    ex.sets = ex.sets.map((s, si) => ({ ...s, weight: w0, reps: 10, done: true, prefilled: false, at: (T0 + 3600) * 1000 + si * 3000 }));
    if (drop === ex.id) ex.sets = ex.sets.slice(0, 1);
  });
  return w;
};
const base = () => ({ ...E.bl(), wk: {} });
const lifts = log => log.exercises.map(e => e.progKey);

const checkFolded = (log, watch) => {
  assert.equal(log.day, 'thursday', 'one session, not "multi"');
  assert.equal(log.sessions, undefined);
  assert.equal(new Set(lifts(log)).size, log.exercises.length, 'one entry per lift');
  assert.equal(log.exercises.length, thu.exercises.length);
  assert.ok(!log.exercises.some(e => e.id === 'pec-deck'), 'the phone swap wins');
  const fly = log.exercises.find(e => e.id === 'db-fly');
  assert.ok(fly.sets.every(s => s.weight === 20));
  log.exercises.forEach(e => e.sets.filter(s => s.done).forEach(s => {
    assert.equal(s.lid, watch.id); assert.equal(s.src, 'app+wrist');
    assert.ok(s.hr >= 120 && s.hrMax === 150, 'watch heart rate kept');
    assert.ok(s.at < (T0 + 3600) * 1000, 'watch time kept, not the late phone time');
  }));
  assert.equal(log.volume, E.calcVolume(log.exercises));
};

test('fold: watch first, then the phone finishes with the watch row pulled', () => {
  const data = base();
  const watch = watchLog(data);
  const afterWatch = E.applyWristLog(data, watch, OPT).data;
  const w = phoneWorkout(data);
  const res = E.applyWorkout(afterWatch, w, thu, THU, (T0 + 3700) * 1000);
  checkFolded(res.data.wk[THU], watch);
  // Progression reads the phone weights.
  const inc = w.exercises.find(e => e.id === 'db-incline-press');
  assert.equal(res.data.prog[inc.progKey].lastReps.length, 3);
  assert.equal(res.data.prog[inc.progKey].currentWeight, inc.sets[0].weight);
  // One e1RM point today, from the phone sets.
  const h = res.data.prog[inc.progKey].e1rmHistory.filter(p => p.date === THU);
  assert.deepEqual(h, [{ date: THU, e1rm: E.e1rm(inc.sets[0].weight, 10) }]);
  assert.equal(res.prs.length, 0, 'no fake PR from the fold');
});

test('fold: phone first, then the watch log arrives at the server', () => {
  const data = base();
  const w = phoneWorkout(data);
  const afterPhone = E.applyWorkout(data, w, thu, THU, (T0 + 3700) * 1000).data;
  const watch = watchLog(data);
  const res = E.applyWristLog(afterPhone, watch, OPT);
  checkFolded(res.data.wk[THU], watch);
  // The watch's prefilled weights never reach progression.
  w.exercises.forEach(e => { if (res.data.prog[e.progKey]) assert.equal(res.data.prog[e.progKey].currentWeight, afterPhone.prog[e.progKey].currentWeight); });
  // A resent watch log is still recognised.
  assert.equal(E.applyWristLog(res.data, watch, OPT).duplicate, true);
});

test('fold: the old phone save path (keepWristSets) folds instead of appending', () => {
  const data = base();
  const watch = watchLog(data);
  const cloud = E.applyWristLog(data, watch, OPT).data.wk[THU];
  const local = E.applyWorkout(data, phoneWorkout(data), thu, THU, (T0 + 3700) * 1000).data.wk[THU];
  const out = E.keepWristSets(local, { day: cloud.day, exercises: cloud.exercises });
  checkFolded(out, watch);
  assert.equal(E.keepWristSets(out, { day: cloud.day, exercises: cloud.exercises }), out, 'second save adds nothing');
  // The old array signature still works.
  assert.equal(E.keepWristSets(local, cloud.exercises).day, 'thursday');
});

test('fold: set counts differ, the phone count wins and watch data fills what fits', () => {
  const data = base();
  const watch = watchLog(data);
  const afterWatch = E.applyWristLog(data, watch, OPT).data;
  const res = E.applyWorkout(afterWatch, phoneWorkout(data, { drop: 'lat-pulldown' }), thu, THU, (T0 + 3700) * 1000);
  const pd = res.data.wk[THU].exercises.find(e => e.id === 'lat-pulldown');
  assert.equal(pd.sets.filter(s => s.done).length, 1);
  assert.equal(pd.sets[0].lid, 'wlog1'); assert.ok(pd.sets[0].hr);
});

test('fold: a lift only the watch logged stays, the day is still one session', () => {
  const data = base();
  const watch = watchLog(data);
  const afterWatch = E.applyWristLog(data, watch, OPT).data;
  const w = phoneWorkout(data);
  w.exercises = w.exercises.filter(e => e.id !== 'overhand-cable-row');
  const log = E.applyWorkout(afterWatch, w, thu, THU, (T0 + 3700) * 1000).data.wk[THU];
  assert.equal(log.day, 'thursday');
  const row = log.exercises.filter(e => e.id === 'overhand-cable-row');
  assert.equal(row.length, 1); assert.ok(row[0].sets.every(s => s.src === 'wrist'));
});

test('fold: two different sessions on one date stay apart ("multi")', () => {
  const mon = E.PROG.days.monday;
  const data = base();
  const afterWatch = E.applyWristLog(data, watchLog(data), OPT).data;
  const w = E.buildSession(data, 'monday', mon, { date: THU, now: 0 });
  w.exercises.forEach(e => { e.sets = e.sets.map(s => ({ ...s, weight: Number(s.weight) || 0, done: true })); });
  const log = E.applyWorkout(afterWatch, w, mon, THU, 3600000).data.wk[THU];
  assert.equal(log.day, 'multi'); assert.equal(log.sessions.length, 2);
});

test('fold: foldLiftCopies is idempotent and leaves plain logs alone', () => {
  const plain = [{ id: 'a', progKey: 'a__8-12', sets: [{ weight: 10, reps: 8, done: true }] }];
  assert.equal(E.foldLiftCopies(plain).folded.length, 0);
  const { data } = sample();
  const once = E.foldLiftCopies(data.wk[THU].exercises).exercises;
  assert.equal(E.foldLiftCopies(once).folded.length, 0);
});

test('data fix: 2026-11-12 sample folds, fixes 22.2, repairs the swapped-away pec deck row', () => {
  const { data } = sample();
  const before = data.wk[THU];
  assert.equal(before.day, 'multi'); assert.equal(before.exercises.length, 10);
  const res = E.foldDoubleDay(data, THU, { fixes: [{ id: 'db-lateral-raise', from: 22.2, to: 22.5 }] });
  assert.equal(res.row.day, 'thursday'); assert.equal(res.row.exercises.length, 5);
  const byId = Object.fromEntries(res.row.exercises.map(e => [e.id, e.sets.filter(s => s.done).map(s => s.weight)]));
  assert.deepEqual(byId['db-incline-press'], [60, 60, 60]);
  assert.deepEqual(byId['lat-pulldown'], [115, 115, 115]);
  assert.deepEqual(byId['db-fly'], [20, 20]);
  assert.deepEqual(byId['db-lateral-raise'], [22.5, 22.5]);
  assert.equal(byId['pec-deck'], undefined);
  assert.ok(res.row.volume < before.volume);
  // Reports and history read the one entry.
  const rep = E.exerciseReport({ ...data, wk: { [THU]: res.row } }, E.exLibById['lat-pulldown'], 'lat-pulldown__8-12');
  assert.deepEqual(rep.sessions[0].sets.map(s => s.weight), [115, 115, 115]);
  const pd = res.prog['pec-deck__10-15'];
  assert.ok(pd, 'pec deck row repaired');
  assert.equal(pd.currentWeight, 95);
  assert.equal(pd.e1rmHistory.filter(p => p.date === THU).length, 0);
  // Running it again finds nothing to fold.
  const again = E.foldDoubleDay({ ...data, wk: { [THU]: res.row }, prog: { ...data.prog, ...res.prog } }, THU, { fixes: [{ id: 'db-lateral-raise', from: 22.2, to: 22.5 }] });
  assert.equal(Object.keys(again.prog).length, 0);
  assert.equal(JSON.stringify(again.row.exercises), JSON.stringify(res.row.exercises));
});
