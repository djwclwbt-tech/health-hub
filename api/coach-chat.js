// ═══ COACH CHAT · talk to the Coach inside the app ═══
// POST { messages: [{ role: 'user'|'assistant', content }] } → { reply, proposals }.
// The Coach is the same persona Claude.ai gets (coachInstructions), reading the same live
// numbers (coachContext over loadAll). Proposed changes come back validated; the app applies
// them only when the athlete taps Apply, and logs each one next to Coach changes.
import * as E from '../lib/engine.mjs';
import { makeClient, loadAll } from '../lib/supabase.mjs';
import { preflight, requireToken, sameOrigin, bodyOf, supabaseEnv } from '../lib/http.mjs';
import { callClaude } from '../lib/analysis.mjs';

const todayChicago = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' });
const MAX_TURNS = 20, MAX_CHARS = 4000;

export default async function handler(req, res) {
  if (preflight(req, res, 'POST', 'Content-Type, x-sync-token')) return;
  // Spends Anthropic credit: same gate as the weekly analysis (app page, or SYNC_TOKEN).
  if (!sameOrigin(req) && !requireToken(req, res, 'SYNC_TOKEN', { optional: true, header: 'x-sync-token' })) return;
  if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ error: 'API key not configured' });
  try {
    const { messages } = bodyOf(req);
    const turns = (Array.isArray(messages) ? messages : [])
      .filter(m => (m?.role === 'user' || m?.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
      .slice(-MAX_TURNS).map(m => ({ role: m.role, content: m.content.slice(0, MAX_CHARS) }));
    while (turns.length && turns[0].role !== 'user') turns.shift();
    if (!turns.length || turns.at(-1).role !== 'user') return res.status(400).json({ error: 'Ask the Coach something first.' });

    const d = await loadAll(makeClient(supabaseEnv()));
    E.backfillData(d); E.repairDeloadProgression(d); E.applyBlockV2(d); E.pruneProgression(d);
    const today = todayChicago();
    const system = `${E.coachInstructions()}\n\n${E.COACH_CHAT_FORMAT}\n\nLIVE DATA, ${today}:\n${E.coachContext(d, today)}`;
    const r = await callClaude({ system, messages: turns });
    if (!r.ok) return res.status(502).json({ error: 'The Coach is unavailable right now.' });
    return res.status(200).json({ reply: E.stripProposals(r.text), proposals: E.parseProposals(r.text, { settings: d.settings, program: d.program }), model: r.model });
  } catch (err) {
    console.error('[coach-chat]', err);
    return res.status(500).json({ error: 'The Coach is unavailable right now.' });
  }
}
