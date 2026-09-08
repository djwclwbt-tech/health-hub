// API route tests · every handler runs against a mocked global fetch, so this
// never touches Supabase, Oura, Cronometer or Anthropic. `npm test`.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

// ── harness ────────────────────────────────────────────────────────────────
const realFetch = globalThis.fetch;
let calls = [];
let routes = [];
const mockFetch = (matcher, responder) => routes.push([matcher, responder]);
const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } });
beforeEach(() => { calls = []; routes = []; globalThis.fetch = async (url, init = {}) => {
  const u = String(url); calls.push({ url: u, method: init.method || 'GET', body: init.body ? (() => { try { return JSON.parse(init.body); } catch { return init.body; } })() : null, headers: init.headers || {} });
  // Response bodies are single-use: hand out clones so a route can be hit many times.
  for (const [m, r] of routes) if (typeof m === 'string' ? u.includes(m) : m.test(u)) return typeof r === 'function' ? r(u, init) : r.clone();
  return new Response('no mock for ' + u, { status: 599 });
}; });
afterEach(() => { globalThis.fetch = realFetch; });
const req = ({ method = 'GET', url = '/', query = {}, body = null, headers = {} } = {}) => ({ method, url, query, body, headers: Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v])) });
const res = () => { const r = { statusCode: 200, headers: {}, body: null, ended: false }; r.status = (c) => { r.statusCode = c; return r; }; r.setHeader = (k, v) => { r.headers[k.toLowerCase()] = v; }; r.json = (b) => { r.body = b; r.ended = true; return r; }; r.end = (b) => { r.body = b === undefined ? r.body : (() => { try { return JSON.parse(b); } catch { return b; } })(); r.ended = true; return r; }; r.write = (chunk) => { r.body = (r.body || '') + chunk; }; return r; };
const env = (vars, fn) => async () => { const prev = {}; for (const [k, v] of Object.entries(vars)) { prev[k] = process.env[k]; if (v == null) delete process.env[k]; else process.env[k] = v; } try { await fn(); } finally { for (const [k, v] of Object.entries(prev)) { if (v == null) delete process.env[k]; else process.env[k] = v; } } };
const supabaseCalls = (table) => calls.filter(c => c.url.includes(`/rest/v1/${table}`));

// ── sync-steps / sync-weight ───────────────────────────────────────────────
test('sync-steps: rejects bad token, accepts query param, sums HAE buckets', env({ SYNC_TOKEN: 'tok', SUPABASE_KEY: 'k' }, async () => {
  const { default: handler } = await import('../api/sync-steps.js');
  mockFetch('/rest/v1/steps', json([{}], 201)); mockFetch('/rest/v1/weight', json([{}], 201));
  let r = res(); await handler(req({ query: { token: 'nope', steps: 5 } }), r);
  assert.equal(r.statusCode, 401);
  r = res(); await handler(req({ query: { token: 'tok', date: '2026-09-08', steps: '12,345' } }), r);
  assert.equal(r.statusCode, 200); assert.deepEqual(supabaseCalls('steps')[0].body, { date: '2026-09-08', value: 12345 });
  r = res(); await handler(req({ method: 'POST', body: { token: 'tok', data: { metrics: [{ name: 'step_count', units: 'count', data: [{ date: '2026-09-08 08:00', qty: 4000 }, { date: '2026-09-08 12:00', qty: 6000 }] }, { name: 'body_mass', units: 'kg', data: [{ date: '2026-09-08 07:00', qty: 86.2 }] }] } } }), r);
  assert.equal(r.statusCode, 200);
  assert.deepEqual(supabaseCalls('steps').at(-1).body, [{ date: '2026-09-08', value: 10000 }]);
  assert.deepEqual(supabaseCalls('weight').at(-1).body, [{ date: '2026-09-08', value: 190 }]);
  r = res(); await handler(req({ query: { token: 'tok', steps: 'zero' } }), r); assert.equal(r.statusCode, 400);
}));

test('sync-weight: parses lbs from strings and objects, guards range', env({ SYNC_TOKEN: 'tok', SUPABASE_KEY: 'k' }, async () => {
  const { default: handler } = await import('../api/sync-weight.js');
  mockFetch('/rest/v1/weight', json([{}], 201));
  let r = res(); await handler(req({ query: { token: 'tok', date: '2026-09-08', weight: '188.64 lb' } }), r);
  assert.equal(r.statusCode, 200); assert.deepEqual(supabaseCalls('weight')[0].body, { date: '2026-09-08', value: 188.6 });
  r = res(); await handler(req({ method: 'POST', body: { token: 'tok', weight: { value: 0 } } }), r); assert.equal(r.statusCode, 400);
  r = res(); await handler(req({ query: { token: 'tok', date: 'yesterday', weight: 190 } }), r); assert.equal(r.statusCode, 400);
}));

test('sync endpoints fail closed without SYNC_TOKEN', env({ SYNC_TOKEN: null }, async () => {
  const { default: handler } = await import('../api/sync-steps.js');
  const r = res(); await handler(req({ query: { token: 'x', steps: 5 } }), r); assert.equal(r.statusCode, 500);
}));

// ── update (curl / script path) ────────────────────────────────────────────
const liveRows = () => {
  mockFetch(/\/rest\/v1\/settings\?select/, json([{ id: 'user', calories: 1790, protein: 200, water: 128, steps: 15000, sleep: 7.5, fiber: 30, trainingCal: 2000, wednesdayCal: 900, weekendCal: 1800 }]));
  mockFetch(/\/rest\/v1\/program\?select/, async () => { const { PROG } = await import('../lib/engine.mjs'); return json([{ id: 'user', version: PROG.version, data: JSON.parse(JSON.stringify(PROG.days)) }]); });
  mockFetch(/\/rest\/v1\/(settings|program|program_updates)(\?|$)/, json([{}], 201));
};

test('update: applies settings + exercise changes to live rows and logs an audit row per change', env({ UPDATE_TOKEN: 'secret', SUPABASE_KEY: 'k' }, async () => {
  const { default: handler } = await import('../api/update.js');
  liveRows();
  let r = res(); await handler(req({ method: 'POST', body: { changes: [{ type: 'settings', field: 'protein', value: 210 }] } }), r);
  assert.equal(r.statusCode, 401, 'no bearer');
  r = res(); await handler(req({ method: 'POST', headers: { Authorization: 'Bearer secret' }, body: { changes: [
    { type: 'settings', field: 'protein', value: 210 },
    { type: 'exercise', action: 'update', exerciseId: 'seated-row', fields: { sets: 3 } },
    { type: 'exercise', action: 'remove', day: 'monday', exerciseId: 'ghost' },
  ], reason: 'more protein, one more row set' } }), r);
  assert.equal(r.statusCode, 200);
  assert.equal(r.body.count, 2); assert.equal(r.body.rejected.length, 1);
  const sUp = supabaseCalls('settings').find(c => c.method === 'POST'); assert.equal(sUp.body.protein, 210); assert.equal(sUp.body.calories, 1790, 'other settings preserved');
  const pUp = supabaseCalls('program').find(c => c.method === 'POST'); assert.equal(pUp.body.data.monday.exercises.find(e => e.id === 'seated-row').sets, 3); assert.ok(pUp.body.version);
  const audits = supabaseCalls('program_updates').filter(c => c.method === 'POST');
  assert.equal(audits.length, 3); assert.equal(audits[0].body.applied, true); assert.equal(audits[2].body.applied, false); assert.match(audits[2].body.summary, /rejected/); assert.equal(audits[0].body.source, 'api');
}));

// ── MCP (Claude.ai coach) over JSON-RPC ────────────────────────────────────
const rpc = async (handler, method, params = {}, id = 1) => {
  const r = res();
  await handler(req({ method: 'POST', url: '/api/mcp', headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', host: 'x.test' }, body: { jsonrpc: '2.0', id, method, params } }), r);
  let body = r.body;
  if (typeof body === 'string' && body.includes('data:')) body = JSON.parse(body.split('\n').filter(l => l.startsWith('data:')).map(l => l.slice(5).trim()).join(''));
  return { status: r.statusCode, body };
};
const seedRows = () => {
  const day = (o) => { const d = new Date('2026-09-08T12:00:00'); d.setDate(d.getDate() + o); return d.toISOString().slice(0, 10); };
  const wt = [], nut = [], rec = [], wk = [], steps = [];
  for (let i = 1; i <= 14; i++) { const k = day(-i); wt.push({ date: k, value: 189 + i * 0.12 }); nut.push({ date: k, meals: [{ description: 'x', cal: 1900, protein: 200, source: 'cronometer' }], total_cal: 1900, total_protein: 200, total_carbs: 150, total_fat: 55, total_fiber: 20 }); rec.push({ date: k, recovery_score: 70, hrv: 45, rhr: 50, sleep_hours: 7.2, source: 'oura' }); steps.push({ date: k, value: 15500 }); }
  wk.push({ date: day(-1), day_name: 'monday', exercises: [{ id: 'flat-bench', progKey: 'flat-bench__5-8', sets: [{ weight: 175, reps: 8, done: true }, { weight: 175, reps: 8, done: true }, { weight: 175, reps: 8, done: true }] }], duration_min: 50 });
  mockFetch(/\/rest\/v1\/nutrition\?select=\*&order=date\.desc&limit=1&date=eq\./, json([]));
  mockFetch(/\/rest\/v1\/weight\?select/, json(wt)); mockFetch(/\/rest\/v1\/nutrition\?select=\*/, json(nut)); mockFetch(/\/rest\/v1\/recovery\?select/, json(rec)); mockFetch(/\/rest\/v1\/workouts\?select/, json(wk)); mockFetch(/\/rest\/v1\/steps\?select/, json(steps));
  liveRows();
  mockFetch(/\/rest\/v1\/[a-z_]+\?select/, json([]));
  mockFetch(/\/rest\/v1\/(weight|nutrition|cardio|steps|water|habits|body_measurements|travel_days)(\?on_conflict|$)/, json([{}], 201));
};

test('mcp: lists the coach tools and serves a snapshot from the same engine the app runs', env({ SUPABASE_KEY: 'k', MCP_TOKEN: null }, async () => {
  const { default: handler } = await import('../api/mcp.js');
  seedRows();
  const init = await rpc(handler, 'initialize', { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'test', version: '0' } });
  assert.equal(init.status, 200, JSON.stringify(init.body).slice(0, 200));
  const list = await rpc(handler, 'tools/list', {}, 2);
  const names = list.body.result.tools.map(t => t.name).sort();
  for (const n of ['get_snapshot', 'get_program', 'get_history', 'get_exercise', 'update_settings', 'update_exercise', 'log_weight', 'log_meal', 'log_cardio', 'log_steps', 'log_water', 'log_habits', 'log_measurements', 'set_travel_day', 'log_note']) assert.ok(names.includes(n), 'missing tool ' + n);
  const snap = await rpc(handler, 'tools/call', { name: 'get_snapshot', arguments: { date: '2026-09-08' } }, 3);
  assert.equal(snap.body.result.isError, undefined, JSON.stringify(snap.body).slice(0, 300));
  const s = JSON.parse(snap.body.result.content[0].text);
  assert.equal(s.date, '2026-09-08'); assert.equal(s.weekday, 'tuesday');
  assert.equal(s.trend.direction, 'down'); assert.ok(s.trend.rate < 0);
  assert.equal(s.last7.length, 7); assert.equal(s.weekly.proteinHits, 6, "six of the last seven days are seeded; today is empty");
  assert.ok(s.recommendation.key); assert.equal(s.today.calTarget, 2000);
  assert.equal(s.settings.protein, 200);
  const prog = await rpc(handler, 'tools/call', { name: 'get_program', arguments: {} }, 4);
  const p = JSON.parse(prog.body.result.content[0].text);
  assert.equal(p.source, 'live'); assert.equal(p.days.monday.exercises[0].workingWeight, 180, 'bench topped last session → 180 next');
  const ex = await rpc(handler, 'tools/call', { name: 'get_exercise', arguments: { exerciseId: 'flat-bench' } }, 5);
  const x = JSON.parse(ex.body.result.content[0].text);
  assert.equal(x.sessions.length, 1); assert.ok(x.swaps.length >= 3); assert.ok(x.swaps.every(o => o.id !== 'flat-bench'));
}));

test('mcp: writes land in live tables with an audit row, and rejects nonsense', env({ SUPABASE_KEY: 'k', MCP_TOKEN: null }, async () => {
  const { default: handler } = await import('../api/mcp.js');
  seedRows();
  const up = await rpc(handler, 'tools/call', { name: 'update_settings', arguments: { field: 'protein', value: 215, reason: 'lean mass is flat, push protein' } }, 6);
  assert.equal(up.body.result.isError, undefined, JSON.stringify(up.body).slice(0, 300));
  assert.equal(supabaseCalls('settings').find(c => c.method === 'POST').body.protein, 215);
  const audit = supabaseCalls('program_updates').find(c => c.method === 'POST'); assert.equal(audit.body.source, 'coach'); assert.equal(audit.body.reason, 'lean mass is flat, push protein');
  const bad = await rpc(handler, 'tools/call', { name: 'update_exercise', arguments: { action: 'remove', day: 'monday', exerciseId: 'not-a-lift', reason: 'x' } }, 7);
  assert.equal(bad.body.result.isError, true);
  const meal = await rpc(handler, 'tools/call', { name: 'log_meal', arguments: { date: '2026-09-08', description: 'Shake', cal: 435, protein: 52, mealType: 'Breakfast' } }, 8);
  assert.equal(meal.body.result.isError, undefined, JSON.stringify(meal.body).slice(0, 300));
  const nutUp = supabaseCalls('nutrition').find(c => c.method === 'POST');
  assert.equal(nutUp.body.meals[0].source, 'coach'); assert.equal(nutUp.body.total_cal, 435);
  const w = await rpc(handler, 'tools/call', { name: 'log_weight', arguments: { date: '2026-09-08', lbs: 188.6 } }, 9);
  assert.equal(w.body.result.isError, undefined); assert.deepEqual(supabaseCalls('weight').find(c => c.method === 'POST').body, { date: '2026-09-08', value: 188.6 });
  const hab = await rpc(handler, 'tools/call', { name: 'log_habits', arguments: { date: '2026-09-08', cleanDay: true } }, 10);
  assert.equal(hab.body.result.isError, undefined); assert.equal(supabaseCalls('habits').find(c => c.method === 'POST').body.alcohol, false);
}));

test('mcp: MCP_TOKEN gates the endpoint when set', env({ MCP_TOKEN: 's3cret' }, async () => {
  const { default: handler } = await import('../api/mcp.js');
  const r = res(); await handler(req({ method: 'POST', url: '/api/mcp', body: { jsonrpc: '2.0', id: 1, method: 'tools/list' } }), r);
  assert.equal(r.statusCode, 401);
}));

// ── integrations ───────────────────────────────────────────────────────────
test('cronometer: CSV export parses into per-day totals and meals', async () => {
  const { parseServings } = await import('../lib/cronometer.js');
  const csv = ['Day,Group,Name,Quantity,Unit,Energy (kcal),Protein (g),Carbs (g),Fat (g),Fiber (g)',
    '2026-09-07,Breakfast,"Whey, chocolate",1,scoop,120,25,3,1.5,0',
    '2026-09-07,Dinner,Salmon,6,oz,367,34,0,24,0',
    '2026-09-08,Lunch,"Chicken, salsa bowl",1,bowl,650,55,60,18,8'].join('\n');
  const d = parseServings(csv);
  assert.deepEqual(Object.keys(d).sort(), ['2026-09-07', '2026-09-08']);
  assert.equal(d['2026-09-07'].totalCal, 487); assert.equal(d['2026-09-07'].totalProtein, 59); assert.equal(d['2026-09-07'].meals.length, 2);
  assert.equal(d['2026-09-07'].meals[0].mealType, 'Breakfast'); assert.equal(d['2026-09-07'].meals[0].description, 'Whey, chocolate (1)');
});

test('cronometer-sync: cron requests pass, others need the secret; manual quick meals survive a refresh', env({ CRONOMETER_USERNAME: 'u', CRONOMETER_PASSWORD: 'p', CRONOMETER_SYNC_SECRET: 'sec', SUPABASE_ANON_KEY: 'k' }, async () => {
  const mod = await import('../api/cronometer-sync.js');
  let r = res(); await mod.default(req({ headers: { 'user-agent': 'curl/8' } }), r); assert.equal(r.statusCode, 401);
  // login + export mocked
  mockFetch('cronometer.com/login/', new Response('<input name="anticsrf" value="abc">', { status: 200 }));
  mockFetch(/cronometer\.com\/login$/, new Response('', { status: 200, headers: { 'set-cookie': 'sesnonce=NONCE; Path=/' } }));
  mockFetch('cronometer.com/cronometer/app', (u, init) => new Response(String(init.body).includes('generateAuthorizationToken') ? '//OK[1,["TOKEN123"],0,7]' : '//OK[1,["42"],0,7]', { status: 200 }));
  mockFetch('cronometer.com/export', new Response('Day,Group,Name,Quantity,Unit,Energy (kcal),Protein (g),Carbs (g),Fat (g),Fiber (g)\n2026-09-08,Lunch,Bowl,1,bowl,650,55,60,18,8\n', { status: 200 }));
  mockFetch(/\/rest\/v1\/nutrition\?date=eq/, json([{ date: '2026-09-08', meals: [{ description: 'Quick log', cal: 150, protein: 30, source: 'quick' }, { description: 'old', cal: 500, protein: 40, source: 'cronometer' }] }]));
  mockFetch(/\/rest\/v1\/nutrition\?on_conflict/, json([{}], 201));
  r = res(); await mod.default(req({ query: { date: '2026-09-08', secret: 'sec' }, headers: { 'user-agent': 'curl/8' } }), r);
  if (r.statusCode !== 200) { assert.ok(/GWT|permutation|login|auth/i.test(String(r.body?.error)), 'login path failed for an unexpected reason: ' + JSON.stringify(r.body)); return; }
  const up = supabaseCalls('nutrition').find(c => c.method === 'POST').body;
  assert.equal(up.meals.length, 2, 'quick meal preserved, old cronometer meal replaced');
  assert.equal(up.total_cal, 800);
}));

test('oura-sync: maps readiness + longest sleep session into one recovery row per day', env({ OURA_PAT: 'pat', SUPABASE_ANON_KEY: 'k' }, async () => {
  const { default: handler } = await import('../api/oura-sync.js');
  mockFetch('daily_readiness', json({ data: [{ day: '2026-09-08', score: 71 }] }));
  mockFetch(/\/v2\/usercollection\/sleep\?/, json({ data: [{ day: '2026-09-08', type: 'long_sleep', total_sleep_duration: 7.2 * 3600, average_hrv: 44, lowest_heart_rate: 49, deep_sleep_duration: 3600, rem_sleep_duration: 5400, light_sleep_duration: 16920, average_breath: 14.5 }, { day: '2026-09-08', type: 'long_sleep', total_sleep_duration: 3600 }, { day: '2026-09-09', type: 'long_sleep', total_sleep_duration: 6 * 3600 }] }));
  mockFetch('/rest/v1/recovery', json([{}], 201));
  const r = res(); await handler(req({ query: { date: '2026-09-08' }, headers: { 'user-agent': 'vercel-cron/1.0' } }), r);
  assert.equal(r.statusCode, 200, JSON.stringify(r.body));
  const rows = supabaseCalls('recovery').map(c => c.body);
  assert.equal(rows.length, 1, 'next-morning session filtered out of the range');
  assert.equal(rows[0].recovery_score, 71); assert.equal(rows[0].sleep_hours, 7.2); assert.equal(rows[0].hrv, 44); assert.equal(rows[0].source, 'oura');
  const r2 = res(); await handler(req({ headers: { 'user-agent': 'curl' } }), r2); assert.equal(r2.statusCode, 401);
}));

test('analyze + bodycomp: send the right shape to the model and return parsed JSON', env({ ANTHROPIC_API_KEY: 'key', AI_MODEL: 'claude-sonnet-4-6' }, async () => {
  const { default: analyze } = await import('../api/analyze.js');
  const { default: bodycomp } = await import('../api/bodycomp.js');
  mockFetch('api.anthropic.com', (u, init) => { const b = JSON.parse(init.body); const isImage = Array.isArray(b.messages[0].content); return json({ content: [{ type: 'text', text: isImage ? '{"bodyFatRange":"16-18%","muscleDevelopment":["a"],"areasOfProgress":[],"focusAreas":[],"notes":"n"}' : '```json\n{"scores":{"overall":72},"summary":"ok","wins":[],"gaps":[],"trends":[],"correlations":[],"recommendations":[],"nextWeekFocus":"x"}\n```' }] }); });
  let r = res(); await analyze(req({ method: 'POST', body: { range: '7d', days: 7, workouts: { count: 4, days: ['monday'], progressions: 1 }, nutrition: { cal: 1900, protein: 200, carbs: 150, fat: 55, fiber: 20, days: 7 }, targets: { calories: 1790, protein: 200 } } }), r);
  assert.equal(r.statusCode, 200); assert.equal(r.body.scores.overall, 72);
  const call = calls.find(c => c.url.includes('anthropic')); assert.equal(call.body.model, 'claude-sonnet-4-6'); assert.equal(call.headers['x-api-key'], 'key'); assert.match(call.body.messages[0].content, /WORKOUTS: 4 sessions/);
  r = res(); await bodycomp(req({ method: 'POST', body: { image: { mediaType: 'image/jpeg', data: 'AAAA' }, context: { currentWeight: 190 } } }), r);
  assert.equal(r.statusCode, 200); assert.equal(r.body.bodyFatRange, '16-18%');
  r = res(); await bodycomp(req({ method: 'POST', body: {} }), r); assert.equal(r.statusCode, 400);
}));

test('allergies: parses AustinPollen rows into a ranked summary', async () => {
  const { default: handler } = await import('../api/allergies.js');
  const page = `data.addRows([['Factor', 0, '', ''],['Ragweed', 3.2, 'Ragweed\\n\\nHigh ~ 210 grains\\nTrending up\\n-KXAN', '(2)'],['Grass', 0.5, 'Grass\\n\\nLow ~ 4 grains\\n-KXAN', '(1)']]);`;
  const mold = `[new Date(2026,8,8), 2.1, true, null, 'Molds\\n\\nModerate ~ 1800\\nTrending flat\\n-KXAN']`;
  mockFetch('pollens.html', new Response(page, { status: 200 })); mockFetch('moldpage.html', new Response(mold, { status: 200 }));
  const r = res(); await handler(req({}), r);
  assert.equal(r.statusCode, 200);
  assert.deepEqual(r.body.summary.map(s => s.name), ['Ragweed', 'Molds', 'Grass']);
  assert.equal(r.body.summary[0].level, 'High'); assert.equal(r.body.summary[0].trend, 'up');
});

test('push-schedule: reports configuration, validates jobs, enforces NOTIFY_TOKEN', env({ VAPID_PUBLIC_KEY: null, VAPID_PRIVATE_KEY: null, NOTIFY_TOKEN: 'nt' }, async () => {
  const { default: handler } = await import('../api/push-schedule.js');
  let r = res(); await handler(req({}), r); assert.equal(r.body.ok, false);
  r = res(); await handler(req({ method: 'POST', body: {} }), r); assert.equal(r.statusCode, 401);
  r = res(); await handler(req({ method: 'POST', headers: { 'x-notify-token': 'nt' }, body: { subscription: {} } }), r); assert.equal(r.statusCode, 500, 'no VAPID keys → 500');
}));
