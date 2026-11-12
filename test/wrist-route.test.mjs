// /api/wrist route tests · Supabase is a mocked global fetch, nothing leaves the machine.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../lib/engine.mjs';
import { wristToken } from '../lib/wrist-route.mjs';

const realFetch = globalThis.fetch;
let calls = [], failTable = null, failWrite = null, workoutRows = [];
beforeEach(() => {
  calls = []; failTable = null; failWrite = null; workoutRows = [];
  globalThis.fetch = async (url, init = {}) => {
    const u = decodeURIComponent(String(url));
    const body = init.body ? JSON.parse(init.body) : null;
    calls.push({ url: u, method: init.method || 'GET', body });
    if (failTable && u.includes(`/rest/v1/${failTable}`)) return new Response('boom secret detail', { status: 500 });
    if (failWrite && init.method === 'POST' && u.includes(`/rest/v1/${failWrite}`)) return new Response('boom secret detail', { status: 500 });
    if (init.method === 'POST') { if (u.includes('/rest/v1/workouts')) workoutRows.push(body); return new Response('[]', { status: 201 }); }
    if (u.includes('/rest/v1/workouts')) return Response.json(workoutRows);
    return Response.json([]);
  };
});
afterEach(() => { globalThis.fetch = realFetch; });
const TOK = wristToken('tok');
const req = ({ method = 'GET', query = {}, body = null, token = TOK } = {}) => ({ method, url: '/api/sync-steps', query: { route: 'wrist', ...query }, body, headers: token ? { authorization: `Bearer ${token}` } : {} });
const res = () => { const r = { statusCode: 200, headers: {}, body: null }; r.status = c => { r.statusCode = c; return r; }; r.setHeader = (k, v) => { r.headers[k.toLowerCase()] = v; }; r.json = b => { r.body = b; return r; }; r.end = b => { r.body = b; return r; }; return r; };
const withEnv = fn => async () => { const p = process.env.SYNC_TOKEN; process.env.SYNC_TOKEN = 'tok'; process.env.SUPABASE_KEY = 'k'; try { await fn(); } finally { if (p == null) delete process.env.SYNC_TOKEN; else process.env.SYNC_TOKEN = p; } };
const T0 = Math.floor(Date.now() / 1000) - 3600;
const logFor = (id) => {
  const { plan } = E.wristPlan(E.bl(), { date: '2026-11-09' });
  return { v: 1, id, plan: plan.id, date: E.chicagoDate(T0), day: 'monday', t0: T0, t1: T0 + 900, d: [[0, plan.ex[0].i, 0, plan.ex[0].w, plan.ex[0].r[0], T0 + 60, 110, 140]], k: [] };
};

test('wrist: only the derived wrist token gets in, not SYNC_TOKEN itself', withEnv(async () => {
  const { default: handler } = await import('../api/sync-steps.js');
  for (const token of [null, 'tok', 'nope']) {
    const r = res(); await handler(req({ token, query: { date: '2026-11-09' } }), r); assert.equal(r.statusCode, 401, String(token));
  }
  assert.notEqual(TOK, 'tok'); assert.equal(TOK.length, 32);
}));

test('wrist GET: returns the plan JSON, uncached', withEnv(async () => {
  const { default: handler } = await import('../api/sync-steps.js');
  const r = res(); await handler(req({ query: { date: '2026-11-09' } }), r);
  assert.equal(r.statusCode, 200);
  assert.equal(r.headers['cache-control'], 'no-store');
  assert.deepEqual(r.body, E.wristPlan(E.bl(), { date: '2026-11-09' }).plan);
}));

test('wrist GET: refuses to build a plan when progression did not load', withEnv(async () => {
  const { default: handler } = await import('../api/sync-steps.js');
  failTable = 'progression';
  const r = res(); await handler(req({ query: { date: '2026-11-09' } }), r);
  assert.equal(r.statusCode, 503);
}));

test('wrist POST: writes progression then the workout, and a resend is not applied again', withEnv(async () => {
  const { default: handler } = await import('../api/sync-steps.js');
  let r = res(); await handler(req({ method: 'POST', body: logFor('abcd1234') }), r);
  assert.equal(r.statusCode, 200); assert.equal(r.body.sets, 1);
  const writes = calls.filter(c => c.method === 'POST').map(c => c.url.match(/rest\/v1\/(\w+)/)[1]);
  assert.deepEqual(writes, ['progression', 'workouts']);
  assert.equal(workoutRows[0].date, E.chicagoDate(T0));
  assert.ok(workoutRows[0].exercises.some(e => e.sets.some(s => s.lid === 'abcd1234')));
  r = res(); await handler(req({ method: 'POST', body: logFor('abcd1234') }), r);
  assert.equal(r.body.duplicate, true);
  assert.equal(workoutRows.length, 1);
}));

test('wrist POST: a malformed log is 400, a failed write is 500 with no detail', withEnv(async () => {
  const { default: handler } = await import('../api/sync-steps.js');
  let r = res(); await handler(req({ method: 'POST', body: { v: 1, id: 'x' } }), r); assert.equal(r.statusCode, 400);
  failWrite = 'workouts';
  r = res(); await handler(req({ method: 'POST', body: logFor('zzzz9999') }), r);
  assert.equal(r.statusCode, 500); assert.doesNotMatch(JSON.stringify(r.body), /boom|secret/);
}));
