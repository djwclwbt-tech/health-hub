// A synthetic copy of the 2026-11-12 double log, built from the real code paths:
// the watch logged Thursday's Upper B at the prefilled weights (applyWristLog), the
// phone logged the same session with the real weights and a pec-deck → DB Fly swap
// (buildSession + applyWorkout), and the old phone save appended the watch's lifts
// (day "multi"). Reps and the cable-row weight are made up; the weights match the
// report. Used by the data-fix dry run (--sample) and the merge tests.
import * as E from '../lib/engine.mjs';

export const DATE = '2026-11-12';
const T0 = Date.parse('2026-11-12T17:00:00Z') / 1000;   // 11:00 Chicago
const WAS = { 'db-incline-press': 55, 'lat-pulldown': 85, 'pec-deck': 95, 'overhand-cable-row': 140, 'db-lateral-raise': 25 };
// What he lifted (the phone copy). The second lateral set was typed as 22.2.
const REAL = {
  'db-incline-press': [[60, 10], [60, 9], [60, 8]],
  'lat-pulldown': [[115, 10], [115, 9], [115, 8]],
  'db-fly': [[20, 15], [20, 13]],
  'overhand-cable-row': [[140, 12], [140, 11]],
  'db-lateral-raise': [[22.5, 16], [22.2, 15]],
};

export const sample = () => {
  const thu = E.PROG.days.thursday;
  const prog = {};
  thu.exercises.forEach(s => { prog[E.progKey(s, s)] = { currentWeight: WAS[s.id], lastReps: Array(s.sets).fill(s.rr[0]), lastDate: '2026-11-05', e1rmHistory: [{ date: '2026-11-05', e1rm: E.e1rm(WAS[s.id], s.rr[0]) }], pr: { name: s.name, weight: WAS[s.id], reps: s.rr[0], e1rm: E.e1rm(WAS[s.id], s.rr[0]), date: '2026-11-05' } }; });
  const data0 = { ...E.bl(), program: { ...E.bl().program, thursday: thu }, prog, wk: {} };

  // 1. The watch: every set at the plan's weight and reps, one press each.
  const { plan } = E.wristPlan(data0, { date: DATE, day: 'thursday' });
  const d = plan.seq.map(([ei, si], n) => [ei, plan.ex[ei].i, si, plan.ex[ei].w, plan.ex[ei].r[si], T0 + 150 * (n + 1), 118 + n, 140 + n]);
  const watch = E.applyWristLog(data0, { v: 1, id: 'w1112', plan: plan.id, date: DATE, day: 'thursday', t0: T0, t1: T0 + 150 * (d.length + 1), d, k: [] }, { today: DATE });

  // 2. The phone, from its own copy (it had not pulled the watch row): real weights,
  // pec deck swapped to DB Fly, sets typed in after the fact (timestamps bunched).
  const w = E.buildSession(data0, 'thursday', thu, { date: DATE, now: (T0 + 60) * 1000 });
  const fly = E.exLibById['db-fly'];
  w.exercises.forEach((ex, i) => {
    if (ex.id === 'pec-deck') {
      const old = thu.exercises[i];
      ex.swappedFrom = { id: old.id, name: old.name, progKey: E.progKey(old, old) };
      ex.id = fly.id; ex.progKey = E.progKey(fly, old);
      ex.swappedTo = { id: fly.id, name: fly.name, unit: fly.unit, sw: fly.sw, cue: fly.cue, inc: fly.inc, progKey: ex.progKey, pattern: fly.pattern, region: fly.region };
    }
    ex.sets = REAL[ex.id].map(([weight, reps], si) => ({ weight, reps, rir: '', done: true, at: (T0 + 3600) * 1000 + si * 4000 }));
  });
  const phone = E.applyWorkout(data0, w, thu, DATE, (T0 + 3700) * 1000);

  // 3. The old phone save: the watch's lifts appended, day "multi".
  const appLog = phone.data.wk[DATE];
  const row = { day: 'multi', exercises: [...appLog.exercises, ...watch.data.wk[DATE].exercises], dur: appLog.dur };
  row.volume = E.calcVolume(row.exercises);
  // Progression as it stands: the phone's rows won for its lifts; the watch's
  // pec-deck row (a lift he did not do) is left over.
  const progNow = { ...watch.data.prog, ...Object.fromEntries(phone.touched.map(k => [k, phone.data.prog[k]])) };
  return { data: { ...data0, wk: { [DATE]: row }, prog: progNow }, before: data0 };
};
