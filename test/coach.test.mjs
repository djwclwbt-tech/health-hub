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
