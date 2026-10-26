// The watchdog: engine rules (lib/engine/watch.mjs) and the cron route (api/watchdog.js)
// with every network call mocked.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../lib/engine.mjs';
import { scenario } from '../eval/fixtures.mjs';

const TODAY = '2026-10-26'; // Monday

test('feedAlerts: a healthy athlete has none; a dead feed and missing food are named', () => {
  assert.deepEqual(E.feedAlerts(scenario('on-track', TODAY), TODAY).filter(a => a.id !== 'weight'), []);
  const ids = E.feedAlerts(scenario('stalled-sparse', TODAY), TODAY).map(a => a.id);
  assert.ok(ids.includes('oura'), 'recovery feed missing'); assert.ok(ids.includes('food'), 'food missing on most eating days');
  const d = scenario('on-track', TODAY); for (const k of Object.keys(d.wt)) if (k > '2026-10-21') delete d.wt[k];
  assert.ok(E.feedAlerts(d, TODAY).some(a => a.id === 'weight' && /5 days/.test(a.text)), 'no weigh-in for 5 days');
});

test('foodNudge: only on an eating day with nothing logged', () => {
  const d = scenario('on-track', TODAY);
  assert.ok(E.foodNudge(d, TODAY), 'Monday, nothing logged yet');
  d.nut[TODAY] = E.sumMeals([{ description: 'x', cal: 500, protein: 40 }]);
  assert.equal(E.foodNudge(d, TODAY), null);
  assert.equal(E.foodNudge(scenario('on-track', '2026-10-28'), '2026-10-28'), null, 'Wednesday is the fast day');
});

// ── route ──
const realFetch = globalThis.fetch; let calls = [];
beforeEach(() => { calls = []; globalThis.fetch = async (url, init = {}) => {
  const u = String(url); const body = init.body ? JSON.parse(init.body) : null; calls.push({ url: u, method: init.method || 'GET', body });
  if (u.includes('api.anthropic.com')) return new Response(JSON.stringify({ model: 'claude-opus-5-5', content: [{ type: 'thinking', thinking: '' }, { type: 'text', text: '{"summary":"Log food daily.","dataGaps":["Food"],"recommendations":["Log food"],"nextWeekFocus":"Log every meal."}' }] }), { status: 200 });
  if (u.includes('ouraring.com')) return new Response('{}', { status: 401 });
  if (u.includes('/rest/v1/')) return new Response(init.method === 'POST' ? '' : '[]', { status: init.method === 'POST' ? 201 : 200 });
  return new Response('no mock', { status: 599 });
}; });
afterEach(() => { globalThis.fetch = realFetch; });
const res = () => { const r = { statusCode: 200, body: null }; r.status = c => { r.statusCode = c; return r; }; r.json = b => { r.body = b; return r; }; return r; };
const run = async (query, headers = {}) => { const { default: h } = await import('../api/watchdog.js'); const r = res(); await h({ url: '/api/watchdog?' + new URLSearchParams(query), query, headers }, r); return r; };
const withEnv = (vars, fn) => async () => { const prev = {}; for (const [k, v] of Object.entries(vars)) { prev[k] = process.env[k]; if (v == null) delete process.env[k]; else process.env[k] = v; } try { await fn(); } finally { for (const [k, v] of Object.entries(prev)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; } } };
const writes = () => calls.filter(c => c.method === 'POST' && c.url.includes('/rest/v1/'));

test('watchdog: refuses strangers; dry run computes and writes nothing', withEnv({ UPDATE_TOKEN: 'up', CRON_SECRET: 'cron', OURA_PAT: 'dead', VAPID_PUBLIC_KEY: null, VAPID_PRIVATE_KEY: null }, async () => {
  assert.equal((await run({ job: 'daily' })).statusCode, 401);
  const r = await run({ job: 'daily', dry: '1', date: TODAY }, { authorization: 'Bearer up' });
  assert.equal(r.statusCode, 200);
  assert.match(r.body.daily.alerts.find(a => a.id === 'oura').text, /rejected the app's key/, 'a 401 from Oura is named as a dead key');
  assert.equal(writes().length, 0); assert.equal(calls.filter(c => c.url.includes('anthropic')).length, 0, 'dry run spends nothing');
}));

test('watchdog: cron daily stores the check; Sunday review is written, noted and grounded', withEnv({ UPDATE_TOKEN: 'up', CRON_SECRET: 'cron', OURA_PAT: null, ANTHROPIC_API_KEY: 'k', VAPID_PUBLIC_KEY: null, VAPID_PRIVATE_KEY: null }, async () => {
  let r = await run({ job: 'daily', date: TODAY }, { authorization: 'Bearer cron' });
  assert.equal(r.statusCode, 200); assert.equal(r.body.review.skipped, 'not Sunday');
  const watch = writes().find(c => c.body?.id === 'watch:latest');
  assert.ok(watch && watch.body.data.alerts.length >= 1, 'watch:latest row written');
  r = await run({ job: 'daily', date: '2026-11-01' }, { authorization: 'Bearer cron' });
  assert.equal(r.body.review.review.summary, 'Log food daily.');
  assert.ok(writes().some(c => c.body?.id === 'review:2026-11-01'), 'review row');
  assert.ok(writes().some(c => c.url.includes('program_updates') && c.body?.summary === 'Weekly review'), 'note in the decision trail');
  r = await run({ job: 'nudge', date: TODAY }, { authorization: 'Bearer cron' });
  assert.equal(r.body.nudge.nudge.title, 'No food logged today');
}));
