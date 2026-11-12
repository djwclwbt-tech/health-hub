// The current block (Cut v3, Coach-designed, approved 2026-11-11) · its shape, its
// progression rule, the hinge comeback cap, and what the Garmin watch gets from it.
// Runs against the shipped PROG (no pinning), so a block edit that breaks a rule fails here.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../lib/engine.mjs';

const { PROG } = E;
const sets = (weight, reps) => reps.map(r => ({ weight, reps: r, rir: 2, done: true }));
const base = (over = {}) => ({ ...E.bl(), ...over });
const slotOf = (day, id) => PROG.days[day].exercises.find(e => e.id === id);

test('Cut v3: dates, easy week 6, checkpoint week 3, weights', () => {
  assert.equal(PROG.name, 'Cut v3');
  assert.match(PROG.version, /^cut-v3\./);
  assert.deepEqual([PROG.start, PROG.end, PROG.weeks, PROG.deload], ['2026-11-16', '2027-01-10', 8, 6]);
  assert.equal(E.wkn('2026-12-21'), 6, 'easy week starts Monday Dec 21');
  assert.equal(E.wkn('2026-12-27'), 6, 'and ends Sunday Dec 27');
  assert.equal(E.wkn('2026-12-28'), 7);
  assert.equal(E.wkn(PROG.checkpoint.date), PROG.checkpoint.week);
  assert.equal(E.wkn(PROG.end), 8, 'the last day is in week 8');
  assert.deepEqual([PROG.startWeight, PROG.targetWeight], [183, 175]);
  assert.equal(PROG.science.length, 7);
});

test('Cut v3: library ids, one day per lift except the shared lateral raise, no calves', () => {
  const where = {};
  for (const [d, s] of Object.entries(PROG.days)) for (const e of s.exercises) {
    assert.ok(E.exLibById[e.id], `${e.id} is in the library`);
    assert.ok(Number.isFinite(e.rest) && e.rr?.length === 2 && e.sets > 0, `${d} ${e.id} has sets, range and rest`);
    assert.match(e.notes, /RIR/, `${d} ${e.id} names its effort target`);
    (where[e.id] = where[e.id] || []).push(d);
  }
  const multi = Object.entries(where).filter(([, ds]) => ds.length > 1);
  assert.deepEqual(multi, [['lateral-raise', ['monday', 'wednesday']]]);
  assert.equal(E.progKey(slotOf('monday', 'lateral-raise')), E.progKey(slotOf('wednesday', 'lateral-raise')), 'Mon and Wed share one progression row');
  assert.ok(!Object.keys(where).some(id => E.exLibById[id].pattern === 'calf'), 'no calf raises');
  assert.deepEqual(Object.keys(where).filter(id => PROG.days.monday.exercises.concat(PROG.days.tuesday.exercises, PROG.days.friday.exercises).some(e => e.id === id && e.anchor)),
    ['machine-chest-press', 'pull-ups', 'leg-press', 'machine-leg-press']);
});

test('Cut v3: every lift adds its step after a topped session; the easy week moves nothing', () => {
  const row = slotOf('monday', 'seated-row');
  assert.equal(E.mayAddWeight(row), true, 'accessories progress in this block');
  const w = { day: 'monday', start: 0, exercises: [{ id: row.id, slot: row, sets: sets(160, [10, 10]) }] };
  assert.equal(E.applyWorkout(base(), w, null, '2026-11-16', 6e5).data.prog['seated-row__6-10'].currentWeight, 165);
  const short = { ...w, exercises: [{ id: row.id, slot: row, sets: sets(160, [10, 9]) }] };
  assert.equal(E.applyWorkout(base(), short, null, '2026-11-16', 6e5).data.prog['seated-row__6-10'].currentWeight, 160, 'one set short → hold');
  const easy = E.buildSession(base({ prog: { 'seated-row__6-10': { currentWeight: 160 } } }), 'monday', PROG.days.monday, { date: '2026-12-22' });
  assert.equal(easy.isDeload, true);
  const er = easy.exercises.find(e => e.id === 'seated-row');
  assert.equal(er.sets[0].weight, 80, 'easy week: half weight');
  const after = E.applyWorkout(base({ prog: { 'seated-row__6-10': { currentWeight: 160 } } }), { ...easy, exercises: [{ ...er, sets: sets(80, [10, 10]) }] }, null, '2026-12-22', 6e5);
  assert.equal(after.data.prog['seated-row__6-10'].currentWeight, 160, 'easy week never moves the working weight');
});

test('comeback cap: summer barbell RDLs never set the first DB RDL weight', () => {
  const rdl = slotOf('tuesday', 'rdl');
  // Summer Cut v2: barbell RDL 2×8-10, logged under its old key.
  const summer = base({ wk: { '2026-08-25': { day: 'tuesday', exercises: [{ id: 'rdl', progKey: 'rdl__8-10', sets: sets(155, [10, 10]) }] } } });
  assert.equal(E.resolveWeight(summer, { ...rdl, progKey: E.progKey(rdl) }, rdl.sw, rdl), 30);
  E.repairDeloadProgression(summer); // the phone's boot repair builds a row from that history
  assert.ok(summer.prog['rdl__6-10'].currentWeight > 30, 'the repaired row still says summer weight');
  const lt = E.liftTarget(summer, rdl);
  assert.equal(lt.weight, 30, 'the cap wins over the repaired row');
  assert.equal(lt.last, null, 'summer sets are not "last time"');
  assert.match(lt.goal, /^First time at this weight: 6 reps/);
  assert.equal(E.buildExerciseEntry(summer, rdl).sets[0].weight, 30, 'the session prefills the same weight');
  // Once logged in this block, normal double progression takes over.
  const d = base({ wk: { ...summer.wk, '2026-11-17': { day: 'tuesday', exercises: [{ id: 'rdl', progKey: 'rdl__6-10', sets: sets(35, [10, 10]) }] } } });
  assert.equal(E.comebackActive(d, rdl), false);
  assert.equal(E.liftTarget(d, rdl).weight, 40, 'topped at 35 → +5');
  assert.equal(E.resolveWeight(base(), { ...rdl, progKey: E.progKey(rdl) }, rdl.sw, rdl), 30, 'no history → sw');
});

test('stalls: sessions from before the block do not count against it', () => {
  const wk = { '2026-08-25': { exercises: [{ id: 'rdl', sets: sets(155, [10, 10]) }] },
    '2026-11-17': { exercises: [{ id: 'rdl', sets: sets(30, [10, 10]) }] }, '2026-11-24': { exercises: [{ id: 'rdl', sets: sets(30, [10, 10]) }] } };
  assert.deepEqual(E.getStalls({ 'rdl__6-10': { lastDate: '2026-11-24', exerciseId: 'rdl' } }, wk, PROG.days), []);
});

test('watch: Wednesday plan chains the three supersets round-robin with rest 0 inside each pair', () => {
  const { plan } = E.wristPlan(base(), { date: '2026-11-18' });
  assert.equal(plan.name, 'Arms + Delts');
  assert.deepEqual(plan.ex.map(e => e.i), ['lateral-raise', 'reverse-fly', 'cable-curl', 'tricep-pushdown', 'incline-db-curl', 'oh-tricep-ext']);
  assert.deepEqual(plan.seq, [
    [0, 0, 0], [1, 0, 60], [0, 1, 0], [1, 1, 60], [0, 2, 0], [1, 2, 60],
    [2, 0, 0], [3, 0, 60], [2, 1, 0], [3, 1, 60], [2, 2, 0], [3, 2, 60],
    [4, 0, 0], [5, 0, 60], [4, 1, 0], [5, 1, 0],
  ]);
  for (const day of ['2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20']) {
    const p = E.wristPlan(base(), { date: day }).plan;
    assert.ok(JSON.stringify(p).length < 4000, `${day} plan is small`);
    assert.ok(p.ex.every(e => e.r.every(r => r >= 1)), 'reps never 0');
    assert.ok(/^[\x20-\x7e]*$/.test(JSON.stringify(p)), 'plain ASCII');
  }
  const mon = E.wristPlan(base(), { date: '2026-11-16' }).plan;
  assert.equal(mon.ex.find(e => e.i === 'pull-ups').u, 'BW');
  assert.equal(E.wristPlan(base(), { date: '2026-11-17' }).plan.ex.find(e => e.i === 'rdl').u, 'ea', 'DB RDL shows per hand');
});

test('watch names: a cut never leaves a bracket open', () => {
  assert.equal(E.wristName('Leg Press (45° plate)'), 'Leg Press');
  assert.equal(E.wristName('Reverse Fly (Pec Deck)'), 'Reverse Fly');
  assert.equal(E.wristName('Romanian Deadlift (DB)'), 'Romanian Deadlift');
  assert.equal(E.wristName('Pull-ups'), 'Pull-ups');
});
