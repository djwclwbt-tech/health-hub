// The Coach: one persona (coachInstructions) everywhere, and the in-app chat route
// (api/coach-chat.js) with Supabase and Anthropic mocked.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../lib/engine.mjs';

test('coachInstructions carries the block, its science, every day and the rules', () => {
  const t = E.coachInstructions();
  assert.match(t, new RegExp(E.PROG.name)); assert.match(t, /Each day has one job/);
  for (const s of Object.values(E.PROG.days)) assert.ok(t.includes(s.name), s.name);
  assert.match(t, /Never change one by a general formula/);
});

test('parseProposals: valid changes pass a dry run, bad ones are refused, text is cleaned', () => {
  const ctx = { settings: { ...E.DEFAULTS }, program: JSON.parse(JSON.stringify(E.PROG.days)) };
  const txt = 'Do this. <change>{"type":"settings","field":"trainingCal","value":2100}</change><change>{"type":"settings","field":"bogus","value":1}</change><change>not json</change>';
  const p = E.parseProposals(txt, ctx);
  assert.equal(p.length, 2); assert.equal(p[0].ok, true); assert.match(p[0].summary, /2100/); assert.equal(p[1].ok, false);
  assert.equal(E.stripProposals(txt), 'Do this.');
});

const realFetch = globalThis.fetch; let calls = [];
beforeEach(() => { calls = []; globalThis.fetch = async (url, init = {}) => {
  const u = String(url); const body = init.body ? JSON.parse(init.body) : null; calls.push({ url: u, body });
  if (u.includes('api.anthropic.com')) return new Response(JSON.stringify({ model: 'claude-opus-5-5', content: [{ type: 'thinking', thinking: '' }, { type: 'text', text: 'Hold the row at 120 s. <change>{"type":"settings","field":"protein","value":210}</change>' }] }), { status: 200 });
  if (u.includes('/rest/v1/')) return new Response('[]', { status: 200 });
  return new Response('no mock', { status: 599 });
}; });
afterEach(() => { globalThis.fetch = realFetch; });
const res = () => { const r = { statusCode: 200, body: null, headers: {} }; r.status = c => { r.statusCode = c; return r; }; r.json = b => { r.body = b; return r; }; r.setHeader = () => {}; r.end = () => r; return r; };

test('coach-chat: persona + live context go to Opus; reply and validated proposals come back', async () => {
  process.env.ANTHROPIC_API_KEY = 'k'; delete process.env.SYNC_TOKEN;
  const { default: h } = await import('../api/coach-chat.js');
  let r = res(); await h({ method: 'POST', headers: {}, body: { messages: [] } }, r); assert.equal(r.statusCode, 400);
  r = res(); await h({ method: 'POST', headers: {}, body: { messages: [{ role: 'user', content: 'Why is rest different?' }] } }, r);
  assert.equal(r.statusCode, 200); assert.equal(r.body.reply, 'Hold the row at 120 s.');
  assert.equal(r.body.proposals[0].ok, true);
  const sent = calls.find(c => c.url.includes('anthropic')).body;
  assert.equal(sent.model, 'claude-opus-5-5'); assert.match(sent.system, /Each day has one job/); assert.match(sent.system, /PROGRAM \(exercise id/);
  assert.equal(sent.messages.at(-1).content, 'Why is rest different?');
});
