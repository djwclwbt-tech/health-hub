import { waitUntil } from '@vercel/functions';
import { configured, configureWebPush, sendPush, pushEndpointOk, isExpired, deviceOf } from '../lib/push.mjs';
import { preflight, requireToken, sameOrigin, bodyOf, supabaseEnv } from '../lib/http.mjs';
import { makeClient } from '../lib/supabase.mjs';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const MAX_DELAY_MS = 30 * 60 * 1000;
const HOP_MS = 45 * 1000;

// ── Latest-wins ledger (push_jobs: one row per phone) ──
// Each phone keeps one current rest alert. Scheduling a new one replaces it;
// skipping a rest clears it. Just before sending, the server checks that its job
// is still the current one, so a skipped or re-timed rest never buzzes later.
// If the table is missing or Supabase is down, alerts send as before (fail open).
const saveSubscription = async (subscription) => { try { await ledgerClient().upsert('push_subs', { device: deviceOf(subscription), subscription, at: new Date().toISOString() }, 'device'); } catch {} };
// The ledger lives as `program` rows (id `push:<device>`, see VIRTUAL in lib/supabase.mjs).
const ledgerClient = () => { const { url, key } = supabaseEnv(); return makeClient({ url, key }); };
const registerJob = async (job) => { try { await ledgerClient().upsert('push_jobs', { device: deviceOf(job.subscription), tag: job.tag, due_at: Math.round(job.dueAt) }, 'device'); } catch {} };
// Clears only the named job, so a cancel that lands after the next rest's schedule cannot wipe it.
const cancelJob = async (sub, tag) => {
  try {
    const device = deviceOf(sub);
    const c = ledgerClient();
    return await c.patch('program', `id=eq.${encodeURIComponent('push:' + device)}&data->>tag=eq.${encodeURIComponent(tag)}`, { data: { device, tag: null, due_at: null } });
  } catch { return false; }
};
export const stillCurrent = async (job) => {
  if (!job.tag) return true;
  try {
    const rows = await ledgerClient().select('push_jobs', 'device', 'desc', 1, `device=eq.${deviceOf(job.subscription)}`);
    return !rows.length || rows[0].tag === job.tag;
  } catch { return true; }
};

export const scheduleOrSend = async (req, job) => {
  const dueAt = Number(job.dueAt || Date.now());
  const delay = Math.max(0, dueAt - Date.now());
  if (delay <= HOP_MS) {
    await sleep(delay);
    if (!(await stillCurrent(job))) return;
    try { await sendPush(job); } catch (err) {
      if (isExpired(err)) console.warn(`[push-schedule] subscription expired (${err.statusCode}); dropped job ${job.tag || ''}`);
      else console.error('[push-schedule] send failed:', err.statusCode || '', err.message);
    }
    return;
  }

  await sleep(HOP_MS);
  if (!(await stillCurrent(job))) return;
  // The hop carries NOTIFY_TOKEN, so its address comes from Vercel's env, never from request headers.
  const host = (process.env.VERCEL_ENV === 'production' && process.env.VERCEL_PROJECT_PRODUCTION_URL) || process.env.VERCEL_URL || req.headers.host;
  await fetch(`https://${host}/api/push-schedule`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(process.env.NOTIFY_TOKEN ? { 'x-notify-token': process.env.NOTIFY_TOKEN } : {}),
    },
    body: JSON.stringify({ ...job, hop: true }),
  });
};

export { pushEndpointOk };

export default async function handler(req, res) {
  if (preflight(req, res, 'GET, POST', 'Content-Type, x-notify-token')) return;

  if (req.method === 'GET') {
    return res.status(200).json({
      ok: configured(),
      publicKey: process.env.VAPID_PUBLIC_KEY || null,
    });
  }

  // The app's own page may book its alert without the token (a phone that never
  // had NOTIFY_TOKEN typed in got 401 on every rest and fell back to a timer iOS
  // freezes). Scripts and the server's own hops still use the token.
  if (!sameOrigin(req) && !requireToken(req, res, 'NOTIFY_TOKEN', { header: 'x-notify-token', unsetStatus: 503 })) return;
  if (!configureWebPush()) return res.status(500).json({ error: 'VAPID keys not configured' });

  try {
    const job = bodyOf(req);
    if (job.cancel) {
      if (!job.subscription?.endpoint || !job.tag) return res.status(400).json({ error: 'subscription.endpoint and tag required' });
      return res.status(200).json({ ok: true, cancelled: await cancelJob(job.subscription, job.tag) });
    }
    if (!job.subscription?.endpoint || !job.subscription?.keys?.p256dh || !job.subscription?.keys?.auth) {
      return res.status(400).json({ error: 'Valid push subscription required' });
    }
    const endpoint = pushEndpointOk(job.subscription.endpoint);
    if (!endpoint) return res.status(400).json({ error: 'Unknown push service' });
    job.subscription = { ...job.subscription, endpoint };
    // Remember this phone so the watchdog (feed alerts, food nudge, weekly review) can reach it.
    // A subscription is useless without the VAPID private key, which never leaves the server.
    if (!job.hop) await saveSubscription(job.subscription);
    if (job.register) return res.status(200).json({ ok: true, registered: true });
    const dueAt = Number(job.dueAt || Date.now());
    if (!Number.isFinite(dueAt)) return res.status(400).json({ error: 'Valid dueAt required' });
    if (dueAt - Date.now() > MAX_DELAY_MS) return res.status(400).json({ error: 'Delay too long' });

    // Due now: send inline so an expired subscription comes back as a clear 410.
    if (dueAt <= Date.now()) {
      try { await sendPush(job); return res.status(200).json({ ok: true, sent: true }); } catch (err) {
        if (isExpired(err)) return res.status(410).json({ error: 'Push subscription expired', expired: true });
        throw err;
      }
    }

    // A hop is the server re-posting its own job: never re-register it, or a cancel
    // that landed meanwhile would be undone.
    if (!job.hop && job.tag) await registerJob({ ...job, dueAt });
    // Later: hop in the background. Expiry at send time is logged (the 202 is already out).
    waitUntil(scheduleOrSend(req, { ...job, dueAt }));
    return res.status(202).json({ ok: true, scheduled: true, dueAt });
  } catch (err) {
    console.error('[push-schedule]', err.statusCode || '', err.message);
    return res.status(502).json({ error: 'Push send failed' });
  }
}
