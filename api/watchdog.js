// ═══ WATCHDOG · the app watches its own pipes and speaks first ═══
// Cron jobs (vercel.json; UTC):
//   ?job=daily  14:30  feed check (Oura, steps, weigh-ins, food) → watch:latest row + push when it changes;
//                      on Sunday also the weekly review (Opus, from the engine brief) → review:<date> row + push.
//   ?job=nudge  01:30  eating day with no food logged by 8:30 pm Austin → push.
// Manual: Authorization: Bearer UPDATE_TOKEN (or ?secret=). &dry=1 computes everything, writes and sends nothing.
// &force=1 runs the review on any day. Every number comes from lib/engine.mjs.
import * as E from '../lib/engine.mjs';
import { makeClient, loadAll, toRow } from '../lib/supabase.mjs';
import { isCron, hasToken, queryOf, supabaseEnv } from '../lib/http.mjs';
import { configured, sendPush, isExpired, pushEndpointOk } from '../lib/push.mjs';
import { runAnalysis } from '../lib/analysis.mjs';

const todayChicago = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' });
const REPEAT_MS = 3 * 864e5; // an unchanged alert is repeated at most every 3 days

const loadData = async (c) => {
  const d = await loadAll(c);
  E.backfillData(d); E.repairDeloadProgression(d); E.applyBlockV2(d); E.pruneProgression(d);
  return d;
};

// Oura can look merely quiet when its key is dead; ask Oura directly.
const ouraKeyDead = async () => {
  if (!process.env.OURA_PAT) return false;
  const r = await fetch('https://api.ouraring.com/v2/usercollection/personal_info', { headers: { Authorization: `Bearer ${process.env.OURA_PAT}` }, signal: AbortSignal.timeout(10000) }).catch(() => null);
  return r?.status === 401;
};

const pushAll = async (c, msg) => {
  if (!configured()) return { sent: 0, reason: 'VAPID not configured' };
  const subs = await c.select('push_subs', 'device', 'desc', 20).catch(() => []);
  let sent = 0;
  for (const s of subs) {
    if (!s?.subscription || !pushEndpointOk(s.subscription.endpoint)) continue;
    try { await sendPush({ subscription: s.subscription, tag: msg.tag, title: msg.title, body: msg.body, url: msg.url || '/' }); sent++; }
    catch (err) { if (isExpired(err)) await c.deleteRow('push_subs', 'device', s.device).catch(() => {}); else console.error('[watchdog] push failed:', err.statusCode || '', err.message); }
  }
  return { sent, phones: subs.length };
};

export const daily = async (c, d, today, { dry = false, now = Date.now() } = {}) => {
  const alerts = E.feedAlerts(d, today);
  if (await ouraKeyDead()) {
    const i = alerts.findIndex(a => a.id === 'oura');
    const a = { id: 'oura', text: "Oura rejected the app's key, so recovery data stopped. Log in to Oura again to fix it." };
    if (i >= 0) alerts[i] = a; else alerts.unshift(a);
  }
  const prev = d.watch || {};
  const ids = alerts.map(a => a.id).sort().join(',');
  const changed = ids !== (prev.pushedIds || '');
  const due = alerts.length && (changed || now - (prev.pushedAt || 0) > REPEAT_MS);
  const row = { id: 'latest', today, at: new Date(now).toISOString(), alerts, pushedIds: due ? ids : prev.pushedIds || '', pushedAt: due ? now : prev.pushedAt || 0 };
  let push = null;
  if (!dry) {
    await c.upsert('watch', row, 'id');
    if (due) push = await pushAll(c, { tag: 'hh-watch', title: alerts.length === 1 ? 'Health Hub: a data feed needs you' : `Health Hub: ${alerts.length} data feeds need you`, body: alerts.map(a => a.text).join(' '), url: '/?tab=dashboard' });
  }
  return { alerts, pushed: !!due, push };
};

export const review = async (c, d, today, { dry = false, force = false } = {}) => {
  if (!force && !E.isReviewDay(today)) return { skipped: 'not Sunday' };
  if (!force && d.reviews?.[today]) return { skipped: 'already done' };
  const brief = E.coachBrief(d, today);
  if (dry) return { brief: E.briefText(brief) };
  const r = await runAnalysis(brief);
  if (!r.ok) return { error: r.status };
  const res = r.result;
  await c.upsert('reviews', { date: today, at: new Date().toISOString(), gaps: brief.gaps, result: res }, 'date');
  const focus = res.nextWeekFocus || res.recommendations?.[0] || '';
  await c.upsert('program_updates', toRow.programUpdate({ type: 'note' }, { reason: [res.summary, focus && `Focus: ${focus}`].filter(Boolean).join(' '), source: 'coach-auto', applied: true, summary: 'Weekly review' }), null).catch(() => {});
  const push = await pushAll(c, { tag: 'hh-review', title: 'Your weekly review is ready', body: focus || res.summary || 'Open Today to read it.', url: '/?tab=dashboard' });
  return { review: res, push };
};

export const nudge = async (c, d, today, { dry = false } = {}) => {
  const n = E.foodNudge(d, today);
  if (!n) return { skipped: 'food logged or fast day' };
  return dry ? { nudge: n } : { nudge: n, push: await pushAll(c, { tag: 'hh-food', ...n, url: '/?tab=dashboard' }) };
};

export default async function handler(req, res) {
  const q = queryOf(req);
  if (!isCron(req) && !hasToken(req, 'UPDATE_TOKEN', { allowQuery: true, queryKey: 'secret' })) return res.status(401).json({ error: 'Unauthorized' });
  const dry = q.dry === '1';
  const job = q.job || (new Date().getUTCHours() < 6 ? 'nudge' : 'daily');
  try {
    const c = makeClient(supabaseEnv());
    const d = await loadData(c);
    const today = q.date && /^\d{4}-\d{2}-\d{2}$/.test(q.date) ? q.date : todayChicago();
    const out = { job, today, dry };
    if (job === 'nudge') out.nudge = await nudge(c, d, today, { dry });
    else {
      out.daily = await daily(c, d, today, { dry });
      out.review = await review(c, d, today, { dry, force: q.force === '1' });
    }
    return res.status(200).json(out);
  } catch (err) {
    console.error('[watchdog]', err);
    return res.status(500).json({ error: 'Watchdog failed' });
  }
}
