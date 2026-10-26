// The coaching brief and its guards (lib/engine/coach.mjs). Scenarios come from
// eval/fixtures.mjs (synthetic athletes), so the eval and the tests share inputs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../lib/engine.mjs';
import { scenario } from '../eval/fixtures.mjs';

const TODAY = '2026-10-26'; // a Monday in week 4 of PF Austin Cut

test('brief: full logging, live feed → no gaps, TDEE trusted', () => {
  const b = E.coachBrief(scenario('on-track', TODAY), TODAY);
  assert.deepEqual(b.gaps, []);
  assert.equal(b.food.eatingDays, 6, 'Wednesday is the fast day, not an eating day');
  assert.equal(b.food.coverage, 'good');
  assert.equal(b.recovery.feed, 'live');
  assert.ok(b.tdee.estimate > 0);
});

test('brief: sparse food and a dead recovery feed are named, not averaged over', () => {
  const b = E.coachBrief(scenario('stalled-sparse', TODAY), TODAY);
  assert.equal(b.food.coverage, 'too thin to judge');
  assert.equal(b.recovery.feed, 'missing');
  assert.equal(b.recovery.avg, null, 'never report a recovery average without a live feed');
  assert.equal(b.tdee.estimate, null, 'TDEE is withheld when most days are imputed');
  assert.ok(b.gaps.some(g => /Food logged on/.test(g)));
  assert.match(E.briefText(b), /Do not interpret recovery/);
});

test('brief: a stale feed is stale even if old readings exist', () => {
  const d = scenario('on-track', TODAY);
  for (const k of Object.keys(d.rec)) if (k > '2026-10-20') delete d.rec[k];
  const b = E.coachBrief(d, TODAY);
  assert.equal(b.recovery.feed, 'stale');
  assert.equal(b.recovery.avg, null);
});

test('recommendation: a measured recovery crash outranks a logging gap', () => {
  const d = scenario('overreaching', TODAY);
  const s = E.getWeeklyCutSummary(d, TODAY);
  assert.ok(s.recoveryAvg < 55 && s.recoveryDays >= 3);
  assert.equal(E.getWeeklyCutRecommendation(d, TODAY, s).key, 'recover');
});

test('groundingCheck: flags invented numbers, passes cited ones and thousands separators', () => {
  const b = E.coachBrief(scenario('too-fast', TODAY), TODAY);
  assert.deepEqual(E.groundingCheck(`Trend ${b.weight.rate} lb/wk, ${b.weight.toGoal} lb to goal, steps ${b.steps.avg.toLocaleString()}.`, b), []);
  assert.deepEqual(E.groundingCheck('Eat 2,437 calories and bench 315.', b), [2437, 315]);
  assert.deepEqual(E.groundingCheck('He averaged 14,149 steps', 'STEPS: avg 14,149/day'), []);
});

test('liftTarget: anchors move up, accessories hold, body weight says so', () => {
  const d = scenario('on-track', TODAY);
  const mon = d.program.monday.exercises;
  const anchor = mon.find(e => e.anchor && e.inc > 0), acc = mon.find(e => !e.anchor && e.sw > 0);
  assert.match(E.liftTarget(d, anchor).goal, /weight goes up/);
  assert.doesNotMatch(E.liftTarget(d, acc).goal, /goes up/, 'cut hold: accessories never promise more weight');
  const lt = E.liftTarget(d, anchor);
  assert.equal(lt.weight, E.buildExerciseEntry(d, anchor).sets[0].weight, 'the weight shown is the weight the session prefills');
  assert.equal(lt.unit, 'lb');
});

test('paceVerdict: green only when the goal lands by the block end', () => {
  const mk = (rate, cur) => ({ reliable: true, rate, n: 10, current: cur, points: [{ v: cur }] });
  assert.equal(E.paceVerdict(mk(-1.2, 178), TODAY).kind, 'goal');
  assert.equal(E.paceVerdict(mk(-0.9, 185), TODAY).kind, 'late', 'safe rate, but 10 lb at 0.9/wk ends in January');
  assert.equal(E.paceVerdict(mk(-2.4, 185), TODAY).kind, 'fast');
  assert.equal(E.paceVerdict(mk(0.4, 185), TODAY).kind, 'gaining');
  assert.equal(E.paceVerdict({ reliable: false, n: 3 }, TODAY).kind, 'unreliable');
});

test('history replay follows the cut hold: accessories never gain weight from backfill', () => {
  const d = E.migrate(scenario('on-track', TODAY));
  const acc = d.program.monday.exercises.find(e => !e.anchor && e.sw > 0 && e.inc > 0);
  E.backfillData(d); E.repairDeloadProgression(d);
  assert.equal(E.liftTarget(d, acc).weight, acc.sw, 'topped sets at the same weight → same weight next time');
});
