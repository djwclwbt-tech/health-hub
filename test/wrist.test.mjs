// Wrist (Garmin gym app) message tests · the plan JSON the watch reads and the log it sends.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../lib/engine.mjs';

const MON = '2026-11-09';   // a Monday inside the current block
const T0 = Date.parse('2026-11-09T13:00:00Z') / 1000;
const base = (over = {}) => ({ ...E.bl(), ...over });
const log = (over = {}) => ({ v: 1, id: 'log1', plan: 'p', date: MON, day: 'monday', t0: T0, t1: T0 + 900, d: [], k: [], ...over });

// One set row per planned set, every set at the planned weight and reps.
const fullLog = (data, id = 'log1') => {
  const { plan } = E.wristPlan(data, { date: MON });
  const d = plan.seq.map(([ei, si], n) => [ei, plan.ex[ei].i, si, plan.ex[ei].w, plan.ex[ei].r[si], T0 + 120 * (n + 1), 120, 150]);
  return log({ id, plan: plan.id, t1: T0 + 120 * (plan.seq.length + 1), d });
};

test('plan: one entry per lift with the session weight, unit, step, reps and goal line', () => {
  const data = base();
  const { plan, session } = E.wristPlan(data, { date: MON });
  assert.equal(plan.v, 1); assert.equal(plan.date, MON); assert.equal(plan.day, 'monday');
  assert.equal(plan.ex.length, session.exercises.length);
  session.exercises.forEach((s, i) => {
    assert.equal(plan.ex[i].i, s.id);
    assert.equal(plan.ex[i].w, Number(s.sets[0].weight) || 0);
    assert.deepEqual(plan.ex[i].r, s.sets.map(x => x.reps));
    assert.ok(plan.ex[i].n.length <= 18);
    assert.equal(plan.ex[i].g, E.wristText(E.liftTarget(data, s.slot).goal, 90));
  });
});

test('plan: seq covers every set once, rest is the slot rest, the last set rests 0', () => {
  const { plan, session } = E.wristPlan(base(), { date: MON });
  const total = session.exercises.reduce((n, e) => n + e.sets.length, 0);
  assert.equal(plan.seq.length, total);
  assert.equal(new Set(plan.seq.map(([ei, si]) => `${ei}.${si}`)).size, total);
  plan.seq.slice(0, -1).forEach(([ei, , rest]) => assert.equal(rest, E.restFor(session.exercises[ei].slot)));
  assert.equal(plan.seq.at(-1)[2], 0);
});

test('plan: a rest:0 chain interleaves sets round-robin (superset)', () => {
  const exs = [{ slot: { rest: 0 }, sets: [{}, {}] }, { slot: { rest: 60 }, sets: [{}, {}] }, { slot: { rest: 90 }, sets: [{}] }];
  assert.deepEqual(E.wristSteps(exs), [[0, 0, 0], [1, 0, 60], [0, 1, 0], [1, 1, 60], [2, 0, 0]]);
});

test('plan: a day with no session is a rest-day plan with no lifts', () => {
  const { plan } = E.wristPlan(base(), { date: '2026-11-08' });   // Sunday
  assert.equal(plan.ex.length, 0); assert.equal(plan.seq.length, 0); assert.equal(plan.name, 'Rest day');
});

test('plan id is stable and changes when the weight changes', () => {
  const data = base();
  const a = E.wristPlan(data, { date: MON }).plan.id;
  assert.equal(E.wristPlan(data, { date: MON }).plan.id, a);
  const first = E.wristPlan(data, { date: MON }).session.exercises[0];
  const moved = base({ prog: { [first.progKey]: { currentWeight: (Number(first.sets[0].weight) || 0) + 50, lastDate: '2026-11-02' } } });
  assert.notEqual(E.wristPlan(moved, { date: MON }).plan.id, a);
});

test('plan: the whole Monday plan is small (Garmin refuses large responses)', () => {
  assert.ok(JSON.stringify(E.wristPlan(base(), { date: MON }).plan).length < 4000);
});

test('text fields are plain ASCII', () => {
  assert.equal(E.wristText('Upper A · Strength 3 × 8\nnew'), 'Upper A - Strength 3 x 8 new');
  assert.equal(E.wristName('Single-Arm Cable Lateral Raise'), 'Single-Arm Cable');
  assert.equal(E.wristUnit('lbs/hand'), 'ea'); assert.equal(E.wristUnit('BW'), 'BW'); assert.equal(E.wristUnit('lbs'), '');
});

test('log: a full session lands as a workout with the watch sets and moves progression', () => {
  const data = base();
  const body = fullLog(data);
  const res = E.applyWristLog(data, body);
  const wk = res.data.wk[MON];
  const done = wk.exercises.flatMap(e => e.sets.filter(s => s.done));
  assert.equal(done.length, body.d.length);
  assert.ok(done.every(s => s.src === 'wrist' && s.lid === 'log1' && s.hr === 120 && s.hrMax === 150));
  assert.ok(res.touched.length > 0);
  res.touched.forEach(k => assert.equal(res.data.prog[k].lastDate, MON));
  assert.equal(wk.dur, Math.round((body.t1 - body.t0) / 60));
});

test('log: the same log sent twice is applied once', () => {
  const data = base();
  const first = E.applyWristLog(data, fullLog(data));
  const again = E.applyWristLog(first.data, fullLog(data));
  assert.equal(again.duplicate, true);
  assert.equal(E.wristLogApplied(first.data, 'log1'), true);
  assert.equal(E.wristLogApplied(first.data, 'other'), false);
});

test('log: an anchor that hits the top of its range on every set goes up by its step', () => {
  const data = base();
  const { session } = E.wristPlan(data, { date: MON });
  const i = session.exercises.findIndex(e => e.slot.anchor && e.slot.inc > 0);
  assert.ok(i >= 0, 'Monday has an anchor');
  const a = session.exercises[i], top = a.slot.rr[1], w = Number(a.sets[0].weight);
  const res = E.applyWristLog(data, log({ id: 'anch1', d: a.sets.map((_, si) => [i, a.id, si, w, top, T0 + 60 * (si + 1)]) }));
  assert.equal(res.data.prog[a.progKey].currentWeight, w + a.slot.inc);
});

test('log: a partial anchor session holds the weight', () => {
  const data = base();
  const { session } = E.wristPlan(data, { date: MON });
  const i = session.exercises.findIndex(e => e.slot.anchor && e.slot.inc > 0);
  const a = session.exercises[i], top = a.slot.rr[1], w = Number(a.sets[0].weight);
  const res = E.applyWristLog(data, log({ id: 'anch2', d: [[i, a.id, 0, w, top, T0 + 60]], k: [[i, 1]] }));
  assert.equal(res.data.prog[a.progKey].currentWeight, w);
});

test('log: sets follow the lift id, not the index, and unknown ids are dropped', () => {
  const data = base();
  const second = E.wristPlan(data, { date: MON }).session.exercises[1];
  const res = E.applyWristLog(data, log({ id: 'idx1', d: [[0, second.id, 0, 100, 8, T0 + 60], [3, 'no-such-lift', 0, 50, 8, T0 + 120]] }));
  assert.equal(res.data.wk[MON].exercises.find(e => e.id === second.id).sets[0].weight, 100);
  assert.deepEqual(res.dropped, ['no-such-lift']);
});

test('log: a library lift that is not in the plan is added as its own entry', () => {
  const data = base();
  const planned = new Set(E.wristPlan(data, { date: MON }).session.exercises.map(e => e.id));
  const extra = E.EXERCISE_LIBRARY.find(e => !planned.has(e.id) && e.unit === 'lbs');
  const res = E.applyWristLog(data, log({ id: 'lib1', d: [[9, extra.id, 0, 40, 10, T0 + 60]] }));
  assert.ok(res.data.wk[MON].exercises.some(e => e.id === extra.id && e.sets[0].reps === 10));
});

test('log: body weight sets keep weight 0 and still count', () => {
  const data = base();
  const lib = E.EXERCISE_LIBRARY.find(e => e.unit === 'BW');
  const res = E.applyWristLog(data, log({ id: 'bw01', d: [[0, lib.id, 0, 0, 12, T0 + 60]] }));
  const s = res.data.wk[MON].exercises.find(e => e.id === lib.id).sets[0];
  assert.equal(s.weight, 0); assert.ok(E.saneSet(s));
});

test('log: an empty log changes nothing, a malformed one is refused whole', () => {
  assert.equal(E.applyWristLog(base(), log({ id: 'emp1' })).empty, true);
  assert.throws(() => E.parseWristLog(log({ v: 2 })), /version/);
  assert.throws(() => E.parseWristLog(log({ d: [[0, 'a', 0, 'abc', 8, T0]] })), /bad set/);
  assert.throws(() => E.parseWristLog(log({ d: [[0, 'a', 0, 100, 0, T0]] })), /bad set/);
  assert.throws(() => E.parseWristLog(log({ date: '11-09' })), /date/);
  assert.throws(() => E.parseWristLog(log({ t1: T0 + 9 * 3600 })), /times/);
  assert.throws(() => E.parseWristLog(log({ id: 'a b' })), /log id/);
  assert.throws(() => E.parseWristLog(null), /version/);
});

test('log: a second session the same day is kept beside the first, not over it', () => {
  const data = base({ wk: { [MON]: { day: 'monday', exercises: [{ id: 'leg-press', sets: [{ weight: 200, reps: 10, done: true }] }], dur: 30 } } });
  const res = E.applyWristLog(data, fullLog(data));
  assert.equal(res.data.wk[MON].day, 'multi');
  assert.ok(res.data.wk[MON].exercises.some(e => e.id === 'leg-press'));
});
