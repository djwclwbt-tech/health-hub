// Health Hub service worker · offline shell + notifications.
// Strategy:
//   /, /index.html, /app.js  → network-first with a short timeout, cache fallback
//                              (fresh deploys show up on the next launch; dead
//                              spots still open instantly from the last copy).
//   /vendor, /fonts, icons   → cache-first (stable files, revalidated in background).
//   everything else          → network only (Supabase, /api).
const CACHE = 'health-hub-shell-v3';
const SHELL = ['/', '/index.html', '/app.js', '/manifest.json', '/icon-192.png', '/icon-512.png',
  '/vendor/react.production.min.js', '/vendor/react-dom.production.min.js',
  '/fonts/Barlow-400.woff2', '/fonts/Barlow-500.woff2', '/fonts/Barlow-600.woff2', '/fonts/Barlow-700.woff2', '/fonts/Barlow-800.woff2', '/fonts/Barlow-600i.woff2',
  '/fonts/BarlowCondensed-500.woff2', '/fonts/BarlowCondensed-600.woff2', '/fonts/BarlowCondensed-700.woff2', '/fonts/BarlowCondensed-800.woff2'];
const NETWORK_FIRST = new Set(['/', '/index.html', '/app.js']);
const NET_TIMEOUT_MS = 2500;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => Promise.allSettled(SHELL.map((u) => cache.add(u)))));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => clients.claim()));
});

const withTimeout = (p, ms) => new Promise((resolve, reject) => {
  const t = setTimeout(() => reject(new Error('timeout')), ms);
  p.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  const path = url.pathname;

  if (req.mode === 'navigate' || NETWORK_FIRST.has(path)) {
    const key = req.mode === 'navigate' ? '/index.html' : path;
    event.respondWith(
      withTimeout(fetch(req), NET_TIMEOUT_MS)
        .then((res) => { if (res.ok) { const clone = res.clone(); caches.open(CACHE).then((c) => c.put(key, clone)); } return res; })
        .catch(() => caches.match(key).then((hit) => hit || caches.match('/index.html')))
    );
    return;
  }

  if (path.startsWith('/vendor/') || path.startsWith('/fonts/') || path.startsWith('/icon-') || path === '/manifest.json') {
    event.respondWith(
      caches.match(req).then((hit) => {
        const refresh = fetch(req).then((res) => { if (res.ok) caches.open(CACHE).then((c) => c.put(req, res.clone())); return res; }).catch(() => hit);
        return hit || refresh;
      })
    );
  }
});

// ── Notifications ──────────────────────────────────────────────────────────
// Short timers (rest/stretch) are also scheduled here because mobile browsers
// throttle page timers; server Web Push covers the closed-app case.
const scheduled = new Map();
const showAppNotification = (payload = {}) => self.registration.showNotification(payload.title || 'Health Hub', {
  body: payload.body || '',
  icon: '/icon-192.png',
  badge: '/icon-192.png',
  tag: payload.tag || 'health-hub',
  data: { url: payload.url || '/', tab: payload.tab || 'training' },
  vibrate: payload.vibrate || [200, 100, 200, 100, 200],
  renotify: payload.renotify !== false,
  requireInteraction: payload.requireInteraction === true,
  silent: payload.silent === true,
});

self.addEventListener('message', (event) => {
  const msg = event.data || {};
  if (msg.type === 'SKIP_WAITING') { self.skipWaiting(); return; }
  if (msg.type === 'SHOW_NOTIFICATION') { event.waitUntil(showAppNotification(msg.payload || {})); return; }
  if (msg.type === 'SCHEDULE_NOTIFICATION') {
    const payload = msg.payload || {};
    const tag = payload.tag || `health-hub-${Date.now()}`;
    const delay = Math.max(0, Number(msg.fireAt || payload.fireAt || 0) - Date.now());
    if (scheduled.has(tag)) clearTimeout(scheduled.get(tag));
    scheduled.set(tag, setTimeout(() => { scheduled.delete(tag); showAppNotification({ ...payload, tag }).catch(() => {}); }, delay));
    return;
  }
  if (msg.type === 'CANCEL_NOTIFICATION' && msg.tag && scheduled.has(msg.tag)) { clearTimeout(scheduled.get(msg.tag)); scheduled.delete(msg.tag); }
});

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { title: 'Health Hub', body: event.data?.text?.() || '' }; }
  event.waitUntil(showAppNotification(data));
});

// Tapping a notification focuses the open app and jumps to the right tab,
// or opens a fresh window on that tab.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const tab = event.notification.data?.tab || 'training';
  const url = event.notification.data?.url || `/?tab=${tab}`;
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
    const win = wins.find((c) => c.url.startsWith(self.location.origin));
    if (win) { win.postMessage({ type: 'NAVIGATE', tab }); return 'focus' in win ? win.focus() : undefined; }
    return clients.openWindow(url);
  }));
});
