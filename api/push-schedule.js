import webpush from 'web-push';
import { waitUntil } from '@vercel/functions';
import { createHash } from 'node:crypto';
import { preflight, requireToken, bodyOf, supabaseEnv } from '../lib/http.mjs';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const MAX_DELAY_MS = 30 * 60 * 1000;
const HOP_MS = 45 * 1000;

const configured = () => Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);

const configureWebPush = () => {
  if (!configured()) return false;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:dylanwurzel@yahoo.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  );
  return true;
};

const sendPush = async ({ subscription, title, body, tag, url }) => {
  configureWebPush();
  const payload = JSON.stringify({
    title: title || 'Rest complete',
    body: body || 'Next set is ready.',
    tag: tag || `health-hub-${Date.now()}`,
    url: url || '/',
    requireInteraction: true,
    renotify: true,
    vibrate: [300, 120, 300, 120, 300, 120, 500],
  });
  return webpush.sendNotification(subscription, payload);
};

// ── Latest-wins ledger (push_jobs: one row per phone) ──
// Each phone keeps one current rest alert. Scheduling a new one replaces it;
// skipping a rest clears it. Just before sending, the server checks that its job
// is still the current one, so a skipped or re-timed rest never buzzes later.
// If the table is missing or Supabase is down, alerts send as before (fail open).
const deviceOf = (sub) => createHash('sha256').update(String(sub?.endpoint || '')).digest('hex').slice(0, 32);
const ledger = async (method, query = '', body) => {
  const { url, key } = supabaseEnv();
  return fetch(`${url}/rest/v1/push_jobs${query}`, { method, signal: AbortSignal.timeout(5000),
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: body ? JSON.stringify(body) : undefined });
};
const registerJob = async (job) => { try { await ledger('POST', '?on_conflict=device', { device: deviceOf(job.subscription), tag: job.tag, due_at: Math.round(job.dueAt) }); } catch {} };
// Clears only the named job, so a cancel that lands after the next rest's schedule cannot wipe it.
const cancelJob = async (sub, tag) => { try { const r = await ledger('PATCH', `?device=eq.${deviceOf(sub)}&tag=eq.${encodeURIComponent(tag)}`, { tag: null }); return r.ok; } catch { return false; } };
export const stillCurrent = async (job) => {
  if (!job.tag) return true;
  try {
    const r = await ledger('GET', `?device=eq.${deviceOf(job.subscription)}&select=tag`);
    if (!r.ok) return true;
    const rows = await r.json();
    return !Array.isArray(rows) || !rows.length || rows[0].tag === job.tag;
  } catch { return true; }
};

// 404/410 from the push service = the browser dropped this subscription.
const isExpired = (err) => err?.statusCode === 404 || err?.statusCode === 410;

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
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers.host;
  await fetch(`${proto}://${host}/api/push-schedule`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(process.env.NOTIFY_TOKEN ? { 'x-notify-token': process.env.NOTIFY_TOKEN } : {}),
    },
    body: JSON.stringify({ ...job, hop: true }),
  });
};

export default async function handler(req, res) {
  if (preflight(req, res, 'GET, POST', 'Content-Type, x-notify-token')) return;

  if (req.method === 'GET') {
    return res.status(200).json({
      ok: configured(),
      publicKey: process.env.VAPID_PUBLIC_KEY || null,
    });
  }

  if (!requireToken(req, res, 'NOTIFY_TOKEN', { header: 'x-notify-token', unsetStatus: 503 })) return;
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
