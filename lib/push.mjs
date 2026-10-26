// ═══ PUSH · web push to the phone ═══ Shared by api/push-schedule.js (rest timers)
// and api/watchdog.js (feed alerts, food nudge, weekly review).
import webpush from 'web-push';
import { createHash } from 'node:crypto';

export const configured = () => Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);

export const configureWebPush = () => {
  if (!configured()) return false;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:dylanwurzel@yahoo.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  );
  return true;
};

// Urgency decides whether Apple wakes a locked phone now or batches it for later:
// a rest alert is 'high' and useless after two minutes; watchdog alerts can wait.
export const sendPush = async ({ subscription, title, body, tag, url, urgency = 'high', ttl = 120 }) => {
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
  return webpush.sendNotification(subscription, payload, { urgency, TTL: ttl });
};


// Only real browser push services. Without this a caller could aim the server's
// signed POST at any URL (the Origin gate is spoofable by scripts).
export const PUSH_HOSTS = [/^fcm\.googleapis\.com$/, /^android\.googleapis\.com$/, /(^|\.)push\.apple\.com$/,
  /^updates\.push\.services\.mozilla\.com$/, /(^|\.)notify\.windows\.com$/];
// Returns the normalized endpoint (sent on instead of the raw string, so web-push's
// parser cannot read a different host than this check did), or null.
export const pushEndpointOk = (endpoint) => {
  try {
    const u = new URL(endpoint);
    if (u.protocol !== 'https:' || u.username || u.password || u.port || !/^[a-z0-9.-]+$/.test(u.hostname)) return null;
    return PUSH_HOSTS.some((re) => re.test(u.hostname)) ? u.origin + u.pathname + u.search : null;
  } catch { return null; }
};

// 404/410 from the push service = the browser dropped this subscription.
export const isExpired = (err) => err?.statusCode === 404 || err?.statusCode === 410;


// One stable id per phone: a hash of its (normalized) push endpoint.
export const deviceOf = (sub) => createHash('sha256').update(String(pushEndpointOk(sub?.endpoint) || sub?.endpoint || '')).digest('hex').slice(0, 32);
