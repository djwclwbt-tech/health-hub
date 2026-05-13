import webpush from 'web-push';
import { waitUntil } from '@vercel/functions';

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

const scheduleOrSend = async (req, job) => {
  const dueAt = Number(job.dueAt || Date.now());
  const delay = Math.max(0, dueAt - Date.now());
  if (delay <= HOP_MS) {
    await sleep(delay);
    await sendPush(job);
    return;
  }

  await sleep(HOP_MS);
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers.host;
  await fetch(`${proto}://${host}/api/push-schedule`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(job),
  });
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    return res.status(200).json({
      ok: configured(),
      publicKey: process.env.VAPID_PUBLIC_KEY || null,
    });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!configureWebPush()) return res.status(500).json({ error: 'VAPID keys not configured' });

  try {
    const job = req.body || {};
    if (!job.subscription?.endpoint || !job.subscription?.keys?.p256dh || !job.subscription?.keys?.auth) {
      return res.status(400).json({ error: 'Valid push subscription required' });
    }
    const dueAt = Number(job.dueAt || Date.now());
    if (!Number.isFinite(dueAt)) return res.status(400).json({ error: 'Valid dueAt required' });
    if (dueAt - Date.now() > MAX_DELAY_MS) return res.status(400).json({ error: 'Delay too long' });

    waitUntil(scheduleOrSend(req, { ...job, dueAt }));
    return res.status(202).json({ ok: true, scheduled: true, dueAt });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
